/**
 * LMS Desktop - Main Electron Process
 * Safe Exam Browser (SEB) compatible desktop application
 */

const { app, BrowserWindow, globalShortcut, ipcMain, Menu, session, Tray, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize store for token persistence
const store = new Store({
    name: 'lms-desktop-config',
    encryptionKey: 'lms-secure-storage-key'
});

// Configuration
const config = {
    webUrl: process.env.LMS_WEB_URL || 'http://localhost:3000',
    apiUrl: process.env.LMS_API_URL || 'http://localhost:4000',
    isDev: process.env.NODE_ENV === 'development',
    sebMode: false,
    quitPassword: null,
    browserKey: null,
    lockedExamId: null  // When set, only allow /seb-exam/:id paths
};

let mainWindow = null;
let tray = null;

/**
 * Create the main application window
 */
function createWindow() {
    // Determine if we're in strict SEB locked mode (from .seb file)
    const isSebLocked = config.sebMode && config.lockedExamId;

    console.log('Creating window, isSebLocked:', isSebLocked, 'lockedExamId:', config.lockedExamId);

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true
        },
        // SEB locked mode settings - apply BEFORE window is shown
        frame: !isSebLocked,
        autoHideMenuBar: true,
        fullscreen: isSebLocked,
        kiosk: isSebLocked && !config.isDev, // Kiosk only in production
        alwaysOnTop: isSebLocked,
        closable: !isSebLocked || config.isDev, // Allow close in dev
        minimizable: !isSebLocked,
        maximizable: !isSebLocked,
        resizable: !isSebLocked,
        // Icon
        icon: path.join(__dirname, 'assets', 'icon.png')
    });

    // Configure permissions - allow camera and microphone for proctoring
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = ['media', 'mediaKeySystem', 'geolocation'];

        // In SEB mode, automatically grant camera/microphone for proctoring
        if (permission === 'media') {
            console.log('Granting media permission for proctoring');
            callback(true);
            return;
        }

        // Allow other safe permissions
        if (allowedPermissions.includes(permission)) {
            callback(true);
            return;
        }

        // Deny other permissions
        console.log('Denied permission:', permission);
        callback(false);
    });

    // Also handle permission check (for getUserMedia)
    session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
        const allowedPermissions = ['media', 'mediaKeySystem'];

        if (allowedPermissions.includes(permission)) {
            return true;
        }

        return false;
    });

    // Hide menu bar
    Menu.setApplicationMenu(null);

    // If started with a .seb file, load that exam URL in locked mode
    // Otherwise load the web application normally (like a browser)
    if (config.lockedExamId) {
        // SEB mode: Load directly to locked exam page
        mainWindow.loadURL(`${config.webUrl}/seb-exam/${config.lockedExamId}`);
    } else {
        // Normal mode: Load web app like a browser - full functionality
        mainWindow.loadURL(config.webUrl);
    }

    // Inject SEB headers into ALL requests when in SEB mode
    // This makes our Electron app appear as a valid SEB browser to the API
    session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: ['<all_urls>'] },
        (details, callback) => {
            // In SEB locked mode, set User-Agent to include SEB identifier
            if (config.sebMode && config.lockedExamId) {
                // Append SEB identifier to User-Agent so API recognizes us as SEB
                const originalUA = details.requestHeaders['User-Agent'] || '';
                if (!originalUA.toLowerCase().includes('seb')) {
                    details.requestHeaders['User-Agent'] = `${originalUA} SEB/3.0`;
                }
            }

            // Add SEB browser key if available
            if (config.browserKey) {
                details.requestHeaders['X-SEB-Browser-Key'] = config.browserKey;
                details.requestHeaders['X-SafeExamBrowser-RequestHash'] = config.browserKey;
            }

            details.requestHeaders['X-LMS-Desktop'] = 'true';
            callback({ requestHeaders: details.requestHeaders });
        }
    );

    // Block navigation to external URLs in SEB mode
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (config.sebMode && !isAllowedUrl(url)) {
            console.log('Blocked navigation to:', url);
            event.preventDefault();
        }
    });

    // Block new windows
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (config.sebMode) {
            console.log('Blocked popup:', url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // Open DevTools in development
    if (config.isDev) {
        mainWindow.webContents.openDevTools();
    }

    // Handle window close attempt
    mainWindow.on('close', (event) => {
        if (config.sebMode && config.quitPassword) {
            event.preventDefault();
            mainWindow.webContents.send('request-quit-password');
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

/**
     * Check if URL is allowed in SEB mode
     * In SEB mode with lockedExamId, ONLY allow /seb-exam/:id paths
     */
function isAllowedUrl(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        // Must be from our allowed hosts
        const allowedHosts = [
            'localhost',
            '127.0.0.1',
            new URL(config.webUrl).hostname,
            new URL(config.apiUrl).hostname
        ];

        if (!allowedHosts.includes(hostname)) {
            return false;
        }

        // In SEB mode with locked exam, only allow seb-exam paths
        if (config.sebMode && config.lockedExamId) {
            const path = urlObj.pathname;
            // Allow: /seb-exam/:id, /api/* (for API calls)
            const allowedPaths = [
                `/seb-exam/${config.lockedExamId}`,
                '/api'  // API calls
            ];

            return allowedPaths.some(allowed => path.startsWith(allowed));
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Enable SEB mode restrictions
 * In development mode, restrictions are lighter to prevent lockout
 */
function enableSebMode(options = {}) {
    config.sebMode = true;
    config.quitPassword = options.quitPassword || null;
    config.browserKey = options.browserKey || null;

    if (mainWindow) {
        // SAFETY: In development, don't fully lock down
        const isDev = config.isDev || process.env.NODE_ENV === 'development';

        if (isDev) {
            console.log('SEB mode (DEVELOPMENT) - partial restrictions');
            // Development: fullscreen but NOT kiosk, window is closable
            mainWindow.setFullScreen(true);
            mainWindow.setAlwaysOnTop(true);
            // Keep window closable in dev!
            mainWindow.setClosable(true);
            mainWindow.setMinimizable(true);
        } else {
            console.log('SEB mode (PRODUCTION) - full restrictions');
            // Production: full kiosk mode
            mainWindow.setFullScreen(true);
            mainWindow.setKiosk(true);
            mainWindow.setAlwaysOnTop(true);
            mainWindow.setClosable(false);
            mainWindow.setMinimizable(false);
            mainWindow.setMaximizable(false);
            mainWindow.setResizable(false);
        }

        // Register shortcuts - but always allow emergency quit
        registerSebShortcuts();
    }

    console.log('SEB mode enabled, isDev:', config.isDev);
}

/**
 * Register global shortcuts to block system actions
 * ALWAYS keeps Cmd+Shift+Escape as emergency quit
 */
function registerSebShortcuts() {
    // EMERGENCY QUIT - always works!
    try {
        globalShortcut.register('CommandOrControl+Shift+Escape', () => {
            console.log('EMERGENCY QUIT triggered!');
            disableSebMode();
            app.quit();
        });
        console.log('Emergency quit registered: Cmd+Shift+Escape');
    } catch (e) {
        console.error('Failed to register emergency quit:', e);
    }

    // Only block shortcuts in production
    if (!config.isDev) {
        const blockedShortcuts = [
            'Alt+Tab',
            'Alt+F4',
            'CommandOrControl+Q',
            'CommandOrControl+W',
            'Super+Tab',
            'Super+D',
            'F11',
            'CommandOrControl+Shift+I',
            'CommandOrControl+Shift+J',
            'F12',
            'PrintScreen'
        ];

        blockedShortcuts.forEach(shortcut => {
            try {
                globalShortcut.register(shortcut, () => {
                    console.log('Blocked shortcut:', shortcut);
                });
            } catch (e) {
                // Some shortcuts may not be registrable
            }
        });
    }
}

/**
 * Disable SEB mode
 */
function disableSebMode() {
    config.sebMode = false;
    config.quitPassword = null;

    if (mainWindow) {
        mainWindow.setFullScreen(false);
        mainWindow.setKiosk(false);
        mainWindow.setAlwaysOnTop(false);
        mainWindow.setClosable(true);
        mainWindow.setMinimizable(true);
        mainWindow.setMaximizable(true);
        mainWindow.setResizable(true);
    }

    globalShortcut.unregisterAll();
    console.log('SEB mode disabled');
}

/**
 * Create system tray icon with context menu
 */
function createTray() {
    // Skip tray in SEB mode
    if (config.sebMode && config.lockedExamId) return;

    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    let trayIcon;

    try {
        trayIcon = nativeImage.createFromPath(iconPath);
        // Resize for tray (16x16 on most platforms)
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
    } catch (e) {
        console.log('Could not load tray icon, using default');
        // Create a simple colored icon as fallback
        trayIcon = nativeImage.createEmpty();
    }

    tray = new Tray(trayIcon);
    tray.setToolTip('LMS Desktop');

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'LMS Desktop',
            enabled: false
        },
        { type: 'separator' },
        {
            label: 'Uygulamayı Aç',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                } else {
                    createWindow();
                }
            }
        },
        {
            label: 'Yeniden Başlat',
            click: () => {
                if (mainWindow) {
                    mainWindow.reload();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Geliştirici Araçları',
            visible: config.isDev,
            click: () => {
                if (mainWindow) {
                    mainWindow.webContents.toggleDevTools();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Derslerim',
            click: () => {
                if (mainWindow) {
                    mainWindow.loadURL(`${config.webUrl}/app/courses`);
                    mainWindow.show();
                }
            }
        },
        {
            label: 'Sınavlarım',
            click: () => {
                if (mainWindow) {
                    mainWindow.loadURL(`${config.webUrl}/app/exams`);
                    mainWindow.show();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Çıkış',
            click: () => {
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);

    // Single click to show window
    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.focus();
            } else {
                mainWindow.show();
            }
        }
    });

    console.log('System tray created');
}

// IPC Handlers

// Get current config
ipcMain.handle('get-config', () => ({
    sebMode: config.sebMode,
    isDev: config.isDev,
    webUrl: config.webUrl,
    apiUrl: config.apiUrl
}));

// Get/set stored token
ipcMain.handle('get-token', () => store.get('accessToken'));
ipcMain.handle('set-token', (_, token) => {
    store.set('accessToken', token);
    return true;
});
ipcMain.handle('clear-token', () => {
    store.delete('accessToken');
    return true;
});

// SEB state handlers - allows web app to check if in locked mode
ipcMain.handle('get-seb-exam-id', () => config.lockedExamId);
ipcMain.handle('is-seb-locked', () => config.sebMode && !!config.lockedExamId);

// Enable SEB mode
ipcMain.handle('enable-seb-mode', (_, options) => {
    enableSebMode(options);
    return true;
});

// Request quit with password
ipcMain.handle('quit-with-password', (_, password) => {
    if (!config.sebMode || !config.quitPassword) {
        app.quit();
        return true;
    }

    if (password === config.quitPassword) {
        disableSebMode();
        app.quit();
        return true;
    }

    return false;
});

// Force quit (dev only)
ipcMain.handle('force-quit', () => {
    if (config.isDev) {
        disableSebMode();
        app.quit();
        return true;
    }
    return false;
});

// App lifecycle
app.whenReady().then(async () => {
    // Check if started with .seb file via command line
    const args = process.argv.slice(1);
    console.log('Command line args:', args);

    for (const arg of args) {
        if (arg.endsWith('.seb') && !arg.startsWith('-')) {
            console.log('Found .seb file in args:', arg);
            await handleSebFile(arg);
            break;
        }
    }

    createWindow();
    createTray();

    // Restore token if exists and inject into web app
    // IMPORTANT: Do NOT inject tokens in SEB locked mode - student must login fresh
    const storedToken = store.get('accessToken');
    const isSebLocked = config.sebMode && config.lockedExamId;

    if (storedToken && mainWindow && !isSebLocked) {
        mainWindow.webContents.on('did-finish-load', () => {
            // Only inject token if loading a web URL, not file:// URLs
            const currentUrl = mainWindow.webContents.getURL();
            if (currentUrl.startsWith('http')) {
                mainWindow.webContents.executeJavaScript(`
                    if (!localStorage.getItem('accessToken')) {
                        localStorage.setItem('accessToken', '${storedToken}');
                        console.log('Token restored from desktop app');
                    }
                `).catch(err => {
                    // Ignore errors - may happen on file:// URLs
                    console.log('Token injection skipped:', err.message);
                });
            }
        });
    } else if (isSebLocked) {
        console.log('Token injection disabled in SEB locked mode');
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    globalShortcut.unregisterAll();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle .seb file opening
app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (filePath.endsWith('.seb')) {
        handleSebFile(filePath);
    }
});

// Parse .seb config and enable SEB mode
async function handleSebFile(filePath) {
    console.log('=== Handling SEB file ===');
    console.log('File path:', filePath);

    try {
        const fs = require('fs');
        const content = fs.readFileSync(filePath, 'utf8');
        console.log('File content length:', content.length);

        // .seb files are XML plist format
        let startURL = null;

        // Try JSON first (for testing)
        try {
            const jsonConfig = JSON.parse(content);
            startURL = jsonConfig.startURL;
            console.log('Parsed as JSON, startURL:', startURL);
        } catch {
            // Parse plist format: <key>startURL</key><string>...</string>
            const urlMatch = content.match(/<key>startURL<\/key>\s*<string>([^<]+)<\/string>/i);
            if (urlMatch) {
                startURL = urlMatch[1];
                console.log('Parsed from plist, startURL:', startURL);
            } else {
                // Fallback: try any URL in a string tag
                const fallbackMatch = content.match(/<string>(https?:\/\/[^<]+)<\/string>/);
                if (fallbackMatch) {
                    startURL = fallbackMatch[1];
                    console.log('Fallback URL extraction:', startURL);
                }
            }
        }

        if (startURL) {
            // Extract examId from URL (format: /seb-exam/:id)
            const examIdMatch = startURL.match(/\/seb-exam\/([^\/\?]+)/);
            const examId = examIdMatch ? examIdMatch[1] : null;

            console.log('Extracted Exam ID:', examId);

            // CRITICAL: Set config values BEFORE window is created
            // This ensures createWindow() uses locked settings
            config.sebMode = true;
            config.lockedExamId = examId;

            console.log('SEB config set: sebMode=true, lockedExamId=', config.lockedExamId);

            // If window already exists (e.g., open-file event after app is running)
            // Apply SEB restrictions and reload
            if (mainWindow) {
                console.log('Window exists, applying SEB restrictions and loading exam URL');
                enableSebMode({
                    quitPassword: null,
                    browserKey: null
                });
                mainWindow.loadURL(startURL);
            } else {
                console.log('Window not yet created, createWindow will use SEB settings');
            }
        } else {
            console.error('No startURL found in SEB config');
        }
    } catch (error) {
        console.error('Failed to parse .seb file:', error);
    }
}

console.log('LMS Desktop starting...');
console.log('Web URL:', config.webUrl);
console.log('API URL:', config.apiUrl);
console.log('Dev mode:', config.isDev);
