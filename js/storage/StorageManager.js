/**
 * StorageManager handles all data persistence using localStorage with fallbacks
 */
export class StorageManager {
    /**
     * Create a new StorageManager instance
     * @param {string} appPrefix - Prefix for all storage keys
     */
    constructor(appPrefix = 'language_learning') {
        this.prefix = appPrefix;
        this.version = '1.0.0';
        this.isAvailable = this.checkStorageAvailability();
        this.memoryFallback = new Map(); // Fallback for when localStorage isn't available
        
        if (this.isAvailable) {
            this.initializeStorage();
        }
    }

    /**
     * Check if localStorage is available
     * @returns {boolean} True if localStorage is supported and functional
     */
    checkStorageAvailability() {
        try {
            const testKey = `${this.prefix}_test`;
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.warn('localStorage not available, using memory fallback:', error);
            return false;
        }
    }

    /**
     * Initialize storage with version and migration if needed
     */
    initializeStorage() {
        try {
            const storedVersion = this.getItem('app_version');
            if (storedVersion !== this.version) {
                this.migrate(storedVersion, this.version);
                this.setItem('app_version', this.version);
            }
        } catch (error) {
            console.error('Failed to initialize storage:', error);
        }
    }

    /**
     * Generate storage key with prefix
     * @param {string} key - Base key
     * @returns {string} Prefixed key
     */
    getKey(key) {
        return `${this.prefix}_${key}`;
    }

    /**
     * Store item in localStorage or memory fallback
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @returns {boolean} True if stored successfully
     */
    setItem(key, value) {
        try {
            const serializedValue = JSON.stringify(value);
            const storageKey = this.getKey(key);
            
            if (this.isAvailable) {
                localStorage.setItem(storageKey, serializedValue);
            } else {
                this.memoryFallback.set(storageKey, serializedValue);
            }
            
            return true;
        } catch (error) {
            console.error(`Failed to store item ${key}:`, error);
            return false;
        }
    }

    /**
     * Retrieve item from localStorage or memory fallback
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} Retrieved value or default
     */
    getItem(key, defaultValue = null) {
        try {
            const storageKey = this.getKey(key);
            let serializedValue;
            
            if (this.isAvailable) {
                serializedValue = localStorage.getItem(storageKey);
            } else {
                serializedValue = this.memoryFallback.get(storageKey);
            }
            
            if (serializedValue === null || serializedValue === undefined) {
                return defaultValue;
            }
            
            return JSON.parse(serializedValue);
        } catch (error) {
            console.error(`Failed to retrieve item ${key}:`, error);
            return defaultValue;
        }
    }

    /**
     * Remove item from storage
     * @param {string} key - Storage key
     * @returns {boolean} True if removed successfully
     */
    removeItem(key) {
        try {
            const storageKey = this.getKey(key);
            
            if (this.isAvailable) {
                localStorage.removeItem(storageKey);
            } else {
                this.memoryFallback.delete(storageKey);
            }
            
            return true;
        } catch (error) {
            console.error(`Failed to remove item ${key}:`, error);
            return false;
        }
    }

    /**
     * Check if item exists in storage
     * @param {string} key - Storage key
     * @returns {boolean} True if key exists
     */
    hasItem(key) {
        const storageKey = this.getKey(key);
        
        if (this.isAvailable) {
            return localStorage.getItem(storageKey) !== null;
        } else {
            return this.memoryFallback.has(storageKey);
        }
    }

    /**
     * Get all keys with the app prefix
     * @returns {string[]} Array of keys (without prefix)
     */
    getAllKeys() {
        const keys = [];
        
        if (this.isAvailable) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(`${this.prefix}_`)) {
                    keys.push(key.substring(this.prefix.length + 1));
                }
            }
        } else {
            for (const key of this.memoryFallback.keys()) {
                if (key.startsWith(`${this.prefix}_`)) {
                    keys.push(key.substring(this.prefix.length + 1));
                }
            }
        }
        
        return keys;
    }

    /**
     * Clear all app data from storage
     * @returns {boolean} True if cleared successfully
     */
    clear() {
        try {
            if (this.isAvailable) {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(`${this.prefix}_`)) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
            } else {
                const keysToRemove = [];
                for (const key of this.memoryFallback.keys()) {
                    if (key.startsWith(`${this.prefix}_`)) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => this.memoryFallback.delete(key));
            }
            
            return true;
        } catch (error) {
            console.error('Failed to clear storage:', error);
            return false;
        }
    }

    /**
     * Get storage usage information
     * @returns {Object} Storage usage stats
     */
    getStorageInfo() {
        let totalSize = 0;
        let itemCount = 0;
        const keys = this.getAllKeys();
        
        keys.forEach(key => {
            const value = this.getItem(key);
            if (value !== null) {
                totalSize += JSON.stringify(value).length;
                itemCount++;
            }
        });
        
        return {
            itemCount,
            totalSize,
            totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
            isUsingLocalStorage: this.isAvailable,
            keys: keys.sort()
        };
    }

    /**
     * Export all app data
     * @returns {Object} All stored data
     */
    exportData() {
        const data = {};
        const keys = this.getAllKeys();
        
        keys.forEach(key => {
            const value = this.getItem(key);
            if (value !== null) {
                data[key] = value;
            }
        });
        
        return {
            version: this.version,
            exportDate: new Date().toISOString(),
            data
        };
    }

    /**
     * Import data from backup
     * @param {Object} importData - Data to import
     * @param {boolean} merge - Whether to merge with existing data or replace
     * @returns {boolean} True if import was successful
     */
    importData(importData, merge = false) {
        try {
            if (!importData || !importData.data) {
                throw new Error('Invalid import data format');
            }
            
            // Clear existing data if not merging
            if (!merge) {
                this.clear();
            }
            
            // Import each item
            Object.entries(importData.data).forEach(([key, value]) => {
                this.setItem(key, value);
            });
            
            // Update version
            this.setItem('app_version', this.version);
            
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    /**
     * Migrate data between versions
     * @param {string} fromVersion - Source version
     * @param {string} toVersion - Target version
     */
    migrate(fromVersion, toVersion) {
        console.log(`Migrating data from ${fromVersion || 'unknown'} to ${toVersion}`);
        
        // Add migration logic here for future version changes
        // For now, no migrations are needed
        
        if (!fromVersion) {
            console.log('First-time initialization');
        }
    }

    /**
     * Backup data with timestamp
     * @returns {string} JSON string of backup data
     */
    createBackup() {
        const backupData = this.exportData();
        backupData.backupId = `backup_${Date.now()}`;
        return JSON.stringify(backupData, null, 2);
    }

    /**
     * Restore from backup string
     * @param {string} backupString - JSON string of backup data
     * @param {boolean} merge - Whether to merge or replace
     * @returns {boolean} True if restore was successful
     */
    restoreFromBackup(backupString, merge = false) {
        try {
            const backupData = JSON.parse(backupString);
            return this.importData(backupData, merge);
        } catch (error) {
            console.error('Failed to restore from backup:', error);
            return false;
        }
    }

    /**
     * Validate data integrity
     * @returns {Object} Validation result
     */
    validateData() {
        const issues = [];
        const keys = this.getAllKeys();
        
        keys.forEach(key => {
            try {
                const value = this.getItem(key);
                if (value === null) {
                    issues.push(`Key ${key} has null value`);
                }
            } catch (error) {
                issues.push(`Key ${key} has invalid JSON: ${error.message}`);
            }
        });
        
        return {
            isValid: issues.length === 0,
            issues,
            totalKeys: keys.length
        };
    }

    /**
     * Set up automatic backup (if needed in the future)
     * @param {number} intervalHours - Backup interval in hours
     */
    setupAutoBackup(intervalHours = 24) {
        // Future enhancement: automatic backup to external storage
        console.log(`Auto-backup would run every ${intervalHours} hours`);
    }

    /**
     * Clean up expired or unused data
     * @param {number} maxAgeMs - Maximum age in milliseconds
     * @returns {number} Number of items cleaned up
     */
    cleanup(maxAgeMs = 30 * 24 * 60 * 60 * 1000) { // 30 days default
        let cleanedCount = 0;
        const now = Date.now();
        const keys = this.getAllKeys();
        
        keys.forEach(key => {
            try {
                const value = this.getItem(key);
                if (value && value.updatedAt) {
                    const itemAge = now - new Date(value.updatedAt).getTime();
                    if (itemAge > maxAgeMs) {
                        this.removeItem(key);
                        cleanedCount++;
                    }
                }
            } catch (error) {
                console.error(`Error cleaning up key ${key}:`, error);
            }
        });
        
        return cleanedCount;
    }
}