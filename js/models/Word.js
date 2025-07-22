/**
 * Word model representing a vocabulary word with translations and examples
 */
export class Word {
    /**
     * Create a new Word instance
     * @param {Object} data - Word data object
     * @param {string} data.id - Unique identifier for the word
     * @param {string} data.word - The word in its original language
     * @param {string} data.language - ISO language code (en, hu, bg)
     * @param {Object} data.translations - Translations object {en: string, hu: string, bg: string}
     * @param {Object} data.examples - Examples object {en: string[], hu: string[], bg: string[]}
     * @param {number} data.frequencyRank - Frequency ranking (lower = more common)
     */
    constructor(data) {
        this.id = data.id || this.generateId();
        this.word = data.word || '';
        this.language = data.language || 'en';
        this.translations = {
            en: '',
            hu: '',
            bg: '',
            ...data.translations
        };
        this.examples = {
            en: [],
            hu: [],
            bg: [],
            ...data.examples
        };
        this.phonetics = {
            en: '',
            hu: '',
            bg: '',
            ...data.phonetics
        };
        this.transliteration = {
            bg: '',
            ...data.transliteration
        };
        this.frequencyRank = data.frequencyRank || 0;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Generate a unique ID for the word
     * @returns {string} Unique identifier
     */
    generateId() {
        return `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get translation for a specific language
     * @param {string} language - Target language code
     * @returns {string} Translation or empty string if not found
     */
    getTranslation(language) {
        return this.translations[language] || '';
    }

    /**
     * Get examples for a specific language
     * @param {string} language - Target language code
     * @returns {string[]} Array of example sentences
     */
    getExamples(language) {
        return this.examples[language] || [];
    }

    /**
     * Get phonetic transcription for a specific language
     * @param {string} language - Target language code
     * @returns {string} Phonetic transcription or empty string if not found
     */
    getPhonetics(language) {
        return this.phonetics[language] || '';
    }

    /**
     * Get transliteration for a specific language
     * @param {string} language - Target language code
     * @returns {string} Transliteration or empty string if not found
     */
    getTransliteration(language) {
        return this.transliteration[language] || '';
    }

    /**
     * Get a random example for a specific language
     * @param {string} language - Target language code
     * @returns {string} Random example sentence or empty string
     */
    getRandomExample(language) {
        const examples = this.getExamples(language);
        if (examples.length === 0) return '';
        return examples[Math.floor(Math.random() * examples.length)];
    }

    /**
     * Add a translation for a language
     * @param {string} language - Target language code
     * @param {string} translation - Translation text
     */
    setTranslation(language, translation) {
        this.translations[language] = translation;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Add an example for a language
     * @param {string} language - Target language code
     * @param {string} example - Example sentence
     */
    addExample(language, example) {
        if (!this.examples[language]) {
            this.examples[language] = [];
        }
        if (!this.examples[language].includes(example)) {
            this.examples[language].push(example);
            this.updatedAt = new Date().toISOString();
        }
    }

    /**
     * Set phonetic transcription for a language
     * @param {string} language - Target language code
     * @param {string} phonetics - Phonetic transcription
     */
    setPhonetics(language, phonetics) {
        this.phonetics[language] = phonetics;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Set transliteration for a language
     * @param {string} language - Target language code
     * @param {string} transliteration - Transliteration text
     */
    setTransliteration(language, transliteration) {
        this.transliteration[language] = transliteration;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Check if word has translation for a specific language
     * @param {string} language - Target language code
     * @returns {boolean} True if translation exists
     */
    hasTranslation(language) {
        return !!(this.translations[language] && this.translations[language].trim());
    }

    /**
     * Check if word has examples for a specific language
     * @param {string} language - Target language code
     * @returns {boolean} True if examples exist
     */
    hasExamples(language) {
        return this.examples[language] && this.examples[language].length > 0;
    }

    /**
     * Get word data for a specific learning path (source -> target)
     * @param {string} sourceLang - Source language code
     * @param {string} targetLang - Target language code
     * @returns {Object} Learning path data
     */
    getLearningData(sourceLang, targetLang) {
        return {
            id: this.id,
            sourceWord: this.language === sourceLang ? this.word : this.getTranslation(sourceLang),
            targetWord: this.getTranslation(targetLang),
            example: this.getRandomExample(sourceLang),
            targetExample: this.getRandomExample(targetLang),
            hasTranslation: this.hasTranslation(targetLang),
            hasExample: this.hasExamples(sourceLang)
        };
    }

    /**
     * Validate word data
     * @returns {Object} Validation result with isValid and errors
     */
    validate() {
        const errors = [];
        
        if (!this.word || this.word.trim() === '') {
            errors.push('Word text is required');
        }
        
        if (!this.language || !['en', 'hu', 'bg'].includes(this.language)) {
            errors.push('Valid language code is required (en, hu, bg)');
        }
        
        if (typeof this.frequencyRank !== 'number' || this.frequencyRank < 0) {
            errors.push('Frequency rank must be a non-negative number');
        }
        
        // Check if at least one translation exists
        const hasAnyTranslation = Object.values(this.translations).some(
            translation => translation && translation.trim()
        );
        if (!hasAnyTranslation) {
            errors.push('At least one translation is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Convert word to JSON-serializable object
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            word: this.word,
            language: this.language,
            translations: { ...this.translations },
            examples: { ...this.examples },
            phonetics: { ...this.phonetics },
            transliteration: { ...this.transliteration },
            frequencyRank: this.frequencyRank,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Create Word instance from JSON object
     * @param {Object} json - JSON object
     * @returns {Word} Word instance
     */
    static fromJSON(json) {
        return new Word(json);
    }

    /**
     * Create multiple Word instances from JSON array
     * @param {Object[]} jsonArray - Array of JSON objects
     * @returns {Word[]} Array of Word instances
     */
    static fromJSONArray(jsonArray) {
        return jsonArray.map(json => Word.fromJSON(json));
    }
}