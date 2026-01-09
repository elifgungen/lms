/**
 * SEB Browser Key Module
 * Generates and validates SEB browser keys for API authentication
 */

const crypto = require('crypto');

class BrowserKeyManager {
    constructor(configKey = null) {
        this.configKey = configKey;
    }

    /**
     * Set the configuration key from .seb file
     */
    setConfigKey(key) {
        this.configKey = key;
    }

    /**
     * Generate browser key hash for a URL
     * SEB browser key = SHA-256(URL + configKey)
     */
    generateKey(url) {
        if (!this.configKey) {
            console.warn('No config key set, using empty key');
            return null;
        }

        const data = url + this.configKey;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Generate request header value
     * This is added to each API request for SEB validation
     */
    generateRequestHeader(url) {
        const key = this.generateKey(url);
        return key ? key.substring(0, 32) : null;
    }

    /**
     * Validate a browser key against expected value
     */
    validateKey(receivedKey, url, expectedKey) {
        const generatedKey = this.generateKey(url);
        return generatedKey && receivedKey === generatedKey.substring(0, 32);
    }

    /**
     * Parse browser key from SEB config
     */
    static parseFromConfig(configData) {
        // .seb configs typically have a browserExamKey field
        if (configData.browserExamKey) {
            return configData.browserExamKey;
        }

        // Or generate from hashedQuitPassword and salt
        if (configData.hashedQuitPassword && configData.sebConfigPurpose) {
            const combined = configData.hashedQuitPassword + configData.sebConfigPurpose;
            return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 32);
        }

        return null;
    }
}

module.exports = BrowserKeyManager;
