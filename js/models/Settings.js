/**
 * Settings model for user preferences and configuration
 */
export class Settings {
    /**
     * Create a new Settings instance
     * @param {Object} data - Settings data object
     * @param {string} data.learningPath - Current learning path (e.g., 'en-hu')
     * @param {boolean} data.couplesMode - Whether couples mode is enabled
     * @param {number} data.dailyCardCount - Number of cards per day
     * @param {string} data.interfaceLanguage - UI language
     * @param {boolean} data.audioEnabled - Whether audio is enabled
     * @param {Object} data.notifications - Notification settings
     * @param {Object} data.display - Display preferences
     */
    constructor(data = {}) {
        // Core learning settings
        this.learningPath = data.learningPath || '';
        this.couplesMode = data.couplesMode || false;
        this.dailyCardCount = data.dailyCardCount || 50;
        this.interfaceLanguage = data.interfaceLanguage || 'en';
        
        // Feature flags
        this.audioEnabled = data.audioEnabled || false;
        this.animationsEnabled = data.animationsEnabled !== false; // Default true
        this.darkModeEnabled = data.darkModeEnabled || false;
        
        // Notification settings
        this.notifications = {
            dailyReminder: true,
            reviewReminder: true,
            streakReminder: false,
            ...data.notifications
        };
        
        // Display preferences
        this.display = {
            showExamples: true,
            showProgress: true,
            autoAdvance: false,
            cardAnimationSpeed: 'normal', // slow, normal, fast
            showPhonetics: false,
            showTransliterations: true, // Default to transliteration on
            multipleChoice: false,
            phraseConstruction: false,
            phraseMode: 'fillBlank', // 'fillBlank' or 'wordOrder'
            ...data.display
        };
        
        // Study preferences
        this.study = {
            showHints: true,
            allowSkip: false,
            shuffleCards: true,
            reviewIncorrectFirst: true,
            ...data.study
        };
        
        // Statistics and privacy
        this.privacy = {
            collectAnalytics: false,
            shareProgress: false,
            ...data.privacy
        };
        
        // Metadata
        this.version = data.version || '1.0.0';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Get source and target languages from learning path
     * @returns {Object} Object with sourceLang and targetLang
     */
    getLanguages() {
        if (!this.learningPath || !this.learningPath.includes('-')) {
            return { sourceLang: '', targetLang: '' };
        }
        
        const [sourceLang, targetLang] = this.learningPath.split('-');
        return { sourceLang, targetLang };
    }

    /**
     * Get available learning paths
     * @returns {Object[]} Array of learning path options
     */
    static getAvailableLearningPaths() {
        return [
            { value: 'en-hu', label: 'English → Hungarian', sourceLang: 'en', targetLang: 'hu' },
            { value: 'en-bg', label: 'English → Bulgarian', sourceLang: 'en', targetLang: 'bg' },
            { value: 'hu-en', label: 'Hungarian → English', sourceLang: 'hu', targetLang: 'en' },
            { value: 'hu-bg', label: 'Hungarian → Bulgarian', sourceLang: 'hu', targetLang: 'bg' },
            { value: 'bg-en', label: 'Bulgarian → English', sourceLang: 'bg', targetLang: 'en' },
            { value: 'bg-hu', label: 'Bulgarian → Hungarian', sourceLang: 'bg', targetLang: 'hu' }
        ];
    }

    /**
     * Set learning path and validate it
     * @param {string} path - Learning path (e.g., 'en-hu')
     * @returns {boolean} True if valid and set successfully
     */
    setLearningPath(path) {
        const availablePaths = Settings.getAvailableLearningPaths().map(p => p.value);
        if (availablePaths.includes(path)) {
            this.learningPath = path;
            this.updatedAt = new Date().toISOString();
            return true;
        }
        return false;
    }

    /**
     * Set daily card count with validation
     * @param {number} count - Number of cards per day
     * @returns {boolean} True if valid and set successfully
     */
    setDailyCardCount(count) {
        if (typeof count === 'number' && count >= 5 && count <= 200) {
            this.dailyCardCount = count;
            this.updatedAt = new Date().toISOString();
            return true;
        }
        return false;
    }

    /**
     * Toggle couples mode
     * @returns {boolean} New couples mode state
     */
    toggleCouplesMode() {
        this.couplesMode = !this.couplesMode;
        this.updatedAt = new Date().toISOString();
        return this.couplesMode;
    }

    /**
     * Enable or disable couples mode
     * @param {boolean} enabled - Whether couples mode should be enabled
     */
    setCouplesMode(enabled) {
        this.couplesMode = !!enabled;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Enable or disable phonetics display
     * @param {boolean} enabled - Whether phonetics should be shown
     */
    setShowPhonetics(enabled) {
        this.display.showPhonetics = !!enabled;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Enable or disable transliterations display
     * @param {boolean} enabled - Whether transliterations should be shown
     */
    setShowTransliterations(enabled) {
        this.display.showTransliterations = !!enabled;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Enable or disable multiple choice mode
     * @param {boolean} enabled - Whether multiple choice should be shown
     */
    setMultipleChoice(enabled) {
        this.display.multipleChoice = !!enabled;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Enable or disable phrase construction mode
     * @param {boolean} enabled - Whether phrase construction should be shown
     */
    setPhraseConstruction(enabled) {
        this.display.phraseConstruction = !!enabled;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Set phrase construction mode
     * @param {string} mode - The phrase mode ('fillBlank' or 'wordOrder')
     */
    setPhraseMode(mode) {
        if (['fillBlank', 'wordOrder'].includes(mode)) {
            this.display.phraseMode = mode;
            this.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Update notification settings
     * @param {Object} notificationSettings - Notification preferences
     */
    updateNotifications(notificationSettings) {
        this.notifications = {
            ...this.notifications,
            ...notificationSettings
        };
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Update display settings
     * @param {Object} displaySettings - Display preferences
     */
    updateDisplay(displaySettings) {
        this.display = {
            ...this.display,
            ...displaySettings
        };
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Update study preferences
     * @param {Object} studySettings - Study preferences
     */
    updateStudy(studySettings) {
        this.study = {
            ...this.study,
            ...studySettings
        };
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Get language display name
     * @param {string} code - Language code
     * @returns {string} Display name
     */
    static getLanguageDisplayName(code) {
        const languages = {
            en: 'English',
            hu: 'Hungarian',
            bg: 'Bulgarian'
        };
        return languages[code] || code;
    }

    /**
     * Get learning path display label
     * @returns {string} Human-readable learning path
     */
    getLearningPathLabel() {
        const availablePaths = Settings.getAvailableLearningPaths();
        const path = availablePaths.find(p => p.value === this.learningPath);
        return path ? path.label : this.learningPath;
    }

    /**
     * Check if couples mode is applicable for current learning path
     * @returns {boolean} True if couples mode can be used
     */
    canUseCouplesMode() {
        const { sourceLang } = this.getLanguages();
        // Couples mode makes sense when source is English (show hu+bg)
        // or when source is Bulgarian (show en+hu)
        return sourceLang === 'en' || sourceLang === 'bg';
    }

    /**
     * Reset all settings to defaults
     */
    resetToDefaults() {
        const defaultSettings = new Settings();
        Object.assign(this, defaultSettings);
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Validate settings data
     * @returns {Object} Validation result with isValid and errors
     */
    validate() {
        const errors = [];
        
        // Validate learning path
        if (this.learningPath) {
            const availablePaths = Settings.getAvailableLearningPaths().map(p => p.value);
            if (!availablePaths.includes(this.learningPath)) {
                errors.push('Invalid learning path');
            }
        }
        
        // Validate daily card count
        if (typeof this.dailyCardCount !== 'number' || 
            this.dailyCardCount < 5 || 
            this.dailyCardCount > 200) {
            errors.push('Daily card count must be between 5 and 200');
        }
        
        // Validate interface language
        if (!['en', 'hu', 'bg'].includes(this.interfaceLanguage)) {
            errors.push('Invalid interface language');
        }
        
        // Validate couples mode with learning path
        if (this.couplesMode && !this.canUseCouplesMode()) {
            errors.push('Couples mode is not available for this learning path');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Export settings for backup
     * @returns {Object} Settings data for export
     */
    exportSettings() {
        return this.toJSON();
    }

    /**
     * Import settings from backup
     * @param {Object} importedSettings - Settings data to import
     * @returns {boolean} True if import was successful
     */
    importSettings(importedSettings) {
        try {
            const newSettings = new Settings(importedSettings);
            const validation = newSettings.validate();
            
            if (validation.isValid) {
                Object.assign(this, newSettings);
                this.updatedAt = new Date().toISOString();
                return true;
            }
        } catch (error) {
            console.error('Failed to import settings:', error);
        }
        return false;
    }

    /**
     * Convert settings to JSON-serializable object
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            learningPath: this.learningPath,
            couplesMode: this.couplesMode,
            dailyCardCount: this.dailyCardCount,
            interfaceLanguage: this.interfaceLanguage,
            audioEnabled: this.audioEnabled,
            animationsEnabled: this.animationsEnabled,
            darkModeEnabled: this.darkModeEnabled,
            notifications: { ...this.notifications },
            display: { ...this.display },
            study: { ...this.study },
            privacy: { ...this.privacy },
            version: this.version,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Create Settings instance from JSON object
     * @param {Object} json - JSON object
     * @returns {Settings} Settings instance
     */
    static fromJSON(json) {
        return new Settings(json);
    }
}