/**
 * Electron API utilities
 * Provides type-safe access to Electron APIs when running in desktop app
 */

export interface ElectronAPI {
    isElectron: boolean;
    getConfig: () => Promise<{
        sebMode: boolean;
        isDev: boolean;
        webUrl: string;
        apiUrl: string;
    }>;
    getToken: () => Promise<string | null>;
    setToken: (token: string) => Promise<boolean>;
    clearToken: () => Promise<boolean>;
    enableSebMode: (options: { quitPassword?: string; browserKey?: string }) => Promise<boolean>;
    getSebExamId: () => Promise<string | null>;
    isSebLocked: () => Promise<boolean>;
    quitWithPassword: (password: string) => Promise<boolean>;
    forceQuit: () => Promise<boolean>;
    onRequestQuitPassword: (callback: () => void) => void;
    getPlatform: () => string;
    getVersion: () => string;
}

/**
 * Check if running in Electron
 */
export function isElectron(): boolean {
    return typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron;
}

/**
 * Get Electron API (null if not in Electron)
 */
export function getElectronAPI(): ElectronAPI | null {
    if (!isElectron()) return null;
    return (window as any).electronAPI as ElectronAPI;
}

/**
 * Sync token with Electron store
 */
export async function syncTokenWithDesktop(token: string): Promise<void> {
    const api = getElectronAPI();
    if (api) {
        await api.setToken(token);
    }
}

/**
 * Clear token from Electron store
 */
export async function clearDesktopToken(): Promise<void> {
    const api = getElectronAPI();
    if (api) {
        await api.clearToken();
    }
}

/**
 * Enable SEB mode in desktop app
 */
export async function enableSebMode(options: {
    quitPassword?: string;
    browserKey?: string;
}): Promise<boolean> {
    const api = getElectronAPI();
    if (api) {
        return api.enableSebMode(options);
    }
    return false;
}

/**
 * Request quit with password
 */
export async function quitDesktopApp(password?: string): Promise<boolean> {
    const api = getElectronAPI();
    if (api) {
        if (password) {
            return api.quitWithPassword(password);
        }
        // Force quit in dev mode
        return api.forceQuit();
    }
    return false;
}

/**
 * Get platform info
 */
export function getDesktopPlatform(): string | null {
    const api = getElectronAPI();
    return api?.getPlatform() || null;
}

/**
 * Check if running in SEB locked mode (from .seb file)
 */
export async function isSebLocked(): Promise<boolean> {
    const api = getElectronAPI();
    if (api) {
        return api.isSebLocked();
    }
    return false;
}

/**
 * Get the locked exam ID (if in SEB mode)
 */
export async function getSebExamId(): Promise<string | null> {
    const api = getElectronAPI();
    if (api) {
        return api.getSebExamId();
    }
    return null;
}
