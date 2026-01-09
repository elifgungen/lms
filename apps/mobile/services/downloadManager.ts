import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DOWNLOAD_DIR = FileSystem.documentDirectory + 'downloads/';
const STORAGE_KEY = 'offline_downloads';

export interface DownloadedItem {
    id: string; // usually the content URL or specific ID
    localUri: string;
    originalUrl: string;
    fileName: string;
    type: 'video' | 'pdf' | 'other';
    size?: number;
    downloadedAt: string;
}

// Ensure directory exists
async function ensureDirExists() {
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
    }
}

class DownloadManager {
    private downloads: Record<string, DownloadedItem> = {};
    private loaded = false;
    private loadPromise: Promise<void> | null = null;

    constructor() {
        this.loadDownloadsMap();
    }

    private async loadDownloadsMap() {
        if (this.loaded && !this.loadPromise) return;
        if (!this.loadPromise) {
            this.loadPromise = (async () => {
                try {
                    const json = await AsyncStorage.getItem(STORAGE_KEY);
                    if (json) {
                        this.downloads = JSON.parse(json);
                    }
                    this.loaded = true;
                } catch (e) {
                    console.error('Failed to load downloads map', e);
                } finally {
                    this.loadPromise = null;
                }
            })();
        }
        await this.loadPromise;
    }

    private async ensureLoaded() {
        if (this.loaded) return;
        try {
            await this.loadDownloadsMap();
        } catch (_) { /* no-op */ }
    }

    private async saveDownloadsMap() {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.downloads));
        } catch (e) {
            console.error('Failed to save downloads map', e);
        }
    }

    async downloadFile(
        url: string,
        fileName: string,
        type: 'video' | 'pdf' | 'other',
        onProgress?: (progress: number) => void
    ): Promise<DownloadedItem | null> {
        await this.ensureLoaded();
        await ensureDirExists();

        // Generate a unique ID (hash or just url)
        const id = url;

        // Check if already downloaded
        if (this.downloads[id]) {
            const info = await FileSystem.getInfoAsync(this.downloads[id].localUri);
            if (info.exists) {
                return this.downloads[id];
            } else {
                // File deleted manually? Remove from map
                delete this.downloads[id];
            }
        }

        const fileUri = DOWNLOAD_DIR + fileName;

        const downloadResumable = FileSystem.createDownloadResumable(
            url,
            fileUri,
            {},
            (downloadProgress) => {
                const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                if (onProgress) onProgress(progress);
            }
        );

        try {
            const result = await downloadResumable.downloadAsync();
            if (result && result.uri) {
                const item: DownloadedItem = {
                    id,
                    localUri: result.uri,
                    originalUrl: url,
                    fileName,
                    type,
                    downloadedAt: new Date().toISOString(),
                };

                this.downloads[id] = item;
                await this.saveDownloadsMap();
                return item;
            }
        } catch (e) {
            console.error(e);
        }
        return null;
    }

    async getOfflineFile(url: string): Promise<string | null> {
        await this.ensureLoaded();

        const item = this.downloads[url];
        if (item) {
            const info = await FileSystem.getInfoAsync(item.localUri);
            if (info.exists) { return item.localUri; }
            // Clean up if file is missing
            delete this.downloads[url];
            await this.saveDownloadsMap();
        }
        return null;
    }

    async removeFile(url: string) {
        const item = this.downloads[url];
        if (item) {
            await FileSystem.deleteAsync(item.localUri, { idempotent: true });
            delete this.downloads[url];
            await this.saveDownloadsMap();
        }
    }

    async getAllDownloads(): Promise<DownloadedItem[]> {
        await this.ensureLoaded();
        return Object.values(this.downloads);
    }
}

export const downloadManager = new DownloadManager();
