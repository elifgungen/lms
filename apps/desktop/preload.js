/**
 * LMS Desktop - Preload Script
 * Secure bridge between renderer and main process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Configuration
    getConfig: () => ipcRenderer.invoke('get-config'),

    // Token management
    getToken: () => ipcRenderer.invoke('get-token'),
    setToken: (token) => ipcRenderer.invoke('set-token', token),
    clearToken: () => ipcRenderer.invoke('clear-token'),

    // SEB mode
    enableSebMode: (options) => ipcRenderer.invoke('enable-seb-mode', options),
    getSebExamId: () => ipcRenderer.invoke('get-seb-exam-id'),
    isSebLocked: () => ipcRenderer.invoke('is-seb-locked'),

    // Quit handling
    quitWithPassword: (password) => ipcRenderer.invoke('quit-with-password', password),
    forceQuit: () => ipcRenderer.invoke('force-quit'),

    // Events from main process
    onRequestQuitPassword: (callback) => {
        ipcRenderer.on('request-quit-password', () => callback());
    },

    // Platform info
    getPlatform: () => process.platform,
    getVersion: () => process.versions.electron,

    // Check if running in Electron
    isElectron: true
});

// Also set a flag on window for easy detection
window.addEventListener('DOMContentLoaded', () => {
    console.log('LMS Desktop Preload: Electron APIs exposed');
});
