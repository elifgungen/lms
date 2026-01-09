/**
 * SEB Restrictions Module
 * Clipboard, screenshot, and copy protection
 */

const { clipboard, globalShortcut, nativeImage } = require('electron');

class RestrictionsManager {
    constructor() {
        this.clipboardInterval = null;
        this.isActive = false;
    }

    /**
     * Enable all restrictions
     */
    enable() {
        if (this.isActive) return;
        this.isActive = true;

        // Clear clipboard immediately
        this.clearClipboard();

        // Periodically clear clipboard
        this.clipboardInterval = setInterval(() => {
            this.clearClipboard();
        }, 1000);

        // Register screenshot blocking shortcuts
        this.blockScreenshots();

        console.log('Restrictions enabled');
        return true;
    }

    /**
     * Disable all restrictions
     */
    disable() {
        if (!this.isActive) return;
        this.isActive = false;

        if (this.clipboardInterval) {
            clearInterval(this.clipboardInterval);
            this.clipboardInterval = null;
        }

        // Unregister screenshot shortcuts
        this.unblockScreenshots();

        console.log('Restrictions disabled');
        return true;
    }

    /**
     * Clear the clipboard
     */
    clearClipboard() {
        try {
            clipboard.clear();
        } catch (e) {
            // Ignore errors
        }
    }

    /**
     * Block screenshot shortcuts
     */
    blockScreenshots() {
        const screenshotShortcuts = [
            'PrintScreen',
            'Alt+PrintScreen',
            'Command+Shift+3',
            'Command+Shift+4',
            'Command+Shift+5',
            'Win+PrintScreen',
            'Win+Shift+S'
        ];

        screenshotShortcuts.forEach(shortcut => {
            try {
                globalShortcut.register(shortcut, () => {
                    console.log('Screenshot blocked');
                    // Clear clipboard in case anything was captured
                    this.clearClipboard();
                });
            } catch (e) {
                // Some shortcuts may not be available
            }
        });
    }

    /**
     * Unblock screenshot shortcuts
     */
    unblockScreenshots() {
        const screenshotShortcuts = [
            'PrintScreen',
            'Alt+PrintScreen',
            'Command+Shift+3',
            'Command+Shift+4',
            'Command+Shift+5',
            'Win+PrintScreen',
            'Win+Shift+S'
        ];

        screenshotShortcuts.forEach(shortcut => {
            try {
                globalShortcut.unregister(shortcut);
            } catch (e) {
                // Ignore
            }
        });
    }

    /**
     * Get restriction status
     */
    getStatus() {
        return {
            isActive: this.isActive,
            clipboardBlocked: this.clipboardInterval !== null
        };
    }
}

module.exports = RestrictionsManager;
