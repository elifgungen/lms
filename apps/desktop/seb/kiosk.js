/**
 * SEB Kiosk Mode Module
 * Handles full-screen lockdown and restriction management
 */

const { globalShortcut, screen } = require('electron');

class KioskManager {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.isActive = false;
        this.blockedShortcuts = [];
    }

    /**
     * Enable kiosk mode with all restrictions
     */
    enable() {
        if (this.isActive) return;
        this.isActive = true;

        // Get primary display for full screen
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;

        // Set window to full screen kiosk mode
        this.mainWindow.setFullScreen(true);
        this.mainWindow.setKiosk(true);
        this.mainWindow.setAlwaysOnTop(true, 'screen-saver');

        // Disable window controls
        this.mainWindow.setClosable(false);
        this.mainWindow.setMinimizable(false);
        this.mainWindow.setMaximizable(false);
        this.mainWindow.setResizable(false);
        this.mainWindow.setMovable(false);

        // Block escape shortcuts
        this.registerBlockedShortcuts();

        console.log('Kiosk mode enabled');
        return true;
    }

    /**
     * Disable kiosk mode
     */
    disable() {
        if (!this.isActive) return;
        this.isActive = false;

        // Restore window to normal
        this.mainWindow.setKiosk(false);
        this.mainWindow.setFullScreen(false);
        this.mainWindow.setAlwaysOnTop(false);

        // Re-enable window controls
        this.mainWindow.setClosable(true);
        this.mainWindow.setMinimizable(true);
        this.mainWindow.setMaximizable(true);
        this.mainWindow.setResizable(true);
        this.mainWindow.setMovable(true);

        // Unregister shortcuts
        this.unregisterBlockedShortcuts();

        console.log('Kiosk mode disabled');
        return true;
    }

    /**
     * Register global shortcuts to block
     */
    registerBlockedShortcuts() {
        const shortcuts = [
            // Windows/Linux
            'Alt+Tab',
            'Alt+F4',
            'Alt+Escape',
            'Super+Tab',
            'Super+D',
            'Super',
            'Ctrl+Alt+Delete',
            'Ctrl+Shift+Escape',

            // macOS
            'Command+Tab',
            'Command+Q',
            'Command+W',
            'Command+M',
            'Command+H',
            'Command+Alt+Escape',
            'Command+Space',
            'Control+Up',
            'Control+Down',
            'Control+Left',
            'Control+Right',

            // Developer tools
            'F12',
            'Ctrl+Shift+I',
            'Command+Option+I',
            'Ctrl+Shift+J',
            'Command+Option+J',
            'Ctrl+Shift+C',
            'Command+Option+C',

            // Print/screenshot
            'PrintScreen',
            'Command+Shift+3',
            'Command+Shift+4',
            'Command+Shift+5',

            // General
            'F11',
            'Escape'
        ];

        shortcuts.forEach(shortcut => {
            try {
                const registered = globalShortcut.register(shortcut, () => {
                    console.log(`Blocked: ${shortcut}`);
                });
                if (registered) {
                    this.blockedShortcuts.push(shortcut);
                }
            } catch (e) {
                // Some shortcuts cannot be registered on certain platforms
            }
        });

        console.log(`Registered ${this.blockedShortcuts.length} blocked shortcuts`);
    }

    /**
     * Unregister all blocked shortcuts
     */
    unregisterBlockedShortcuts() {
        this.blockedShortcuts.forEach(shortcut => {
            try {
                globalShortcut.unregister(shortcut);
            } catch (e) {
                // Ignore
            }
        });
        this.blockedShortcuts = [];
    }

    /**
     * Check if kiosk mode is active
     */
    isKioskActive() {
        return this.isActive;
    }
}

module.exports = KioskManager;
