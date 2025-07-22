/**
 * DatabaseLoader handles loading and managing word data from JSON files
 */
import { Word } from '../models/Word.js';

export class DatabaseLoader {
    constructor() {
        this.wordsCache = new Map();
        this.loadingPromises = new Map();
        this.isLoaded = false;
    }

    /**
     * Load word database from JSON file
     * @param {string} filename - JSON file to load (default: 'words-base.json')
     * @returns {Promise<Word[]>} Array of Word instances
     */
    async loadWords(filename = 'words-base.json') {
        const cacheKey = filename;
        
        // Return cached data if available
        if (this.wordsCache.has(cacheKey)) {
            return this.wordsCache.get(cacheKey);
        }
        
        // Return existing loading promise if in progress
        if (this.loadingPromises.has(cacheKey)) {
            return this.loadingPromises.get(cacheKey);
        }
        
        // Create new loading promise
        const loadingPromise = this._loadWordsFromFile(filename);
        this.loadingPromises.set(cacheKey, loadingPromise);
        
        try {
            const words = await loadingPromise;
            this.wordsCache.set(cacheKey, words);
            this.loadingPromises.delete(cacheKey);
            this.isLoaded = true;
            return words;
        } catch (error) {
            this.loadingPromises.delete(cacheKey);
            throw error;
        }
    }

    /**
     * Internal method to load words from file
     * @param {string} filename - JSON file to load
     * @returns {Promise<Word[]>} Array of Word instances
     * @private
     */
    async _loadWordsFromFile(filename) {
        try {
            const response = await fetch(`data/${filename}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load ${filename}: ${response.status} ${response.statusText}`);
            }
            
            const wordsData = await response.json();
            
            if (!Array.isArray(wordsData)) {
                throw new Error(`Invalid data format in ${filename}: expected array`);
            }
            
            // Convert to Word instances and validate
            const words = wordsData.map((wordData, index) => {
                try {
                    const word = new Word(wordData);
                    const validation = word.validate();
                    
                    if (!validation.isValid) {
                        console.warn(`Word at index ${index} has validation errors:`, validation.errors);
                        return null;
                    }
                    
                    return word;
                } catch (error) {
                    console.error(`Failed to create Word at index ${index}:`, error);
                    return null;
                }
            }).filter(word => word !== null);
            
            console.log(`Loaded ${words.length} words from ${filename}`);
            return words;
            
        } catch (error) {
            console.error(`Error loading words from ${filename}:`, error);
            throw new Error(`Failed to load word database: ${error.message}`);
        }
    }

    /**
     * Get words filtered by learning path
     * @param {string} sourceLang - Source language code
     * @param {string} targetLang - Target language code
     * @returns {Promise<Word[]>} Filtered words
     */
    async getWordsForLearningPath(sourceLang, targetLang) {
        const allWords = await this.loadWords();
        
        return allWords.filter(word => {
            // Word must have translations for both source and target languages
            return word.hasTranslation(sourceLang) && word.hasTranslation(targetLang);
        });
    }

    /**
     * Get word by ID
     * @param {string} wordId - Word ID to find
     * @returns {Promise<Word|null>} Word instance or null if not found
     */
    async getWordById(wordId) {
        const allWords = await this.loadWords();
        return allWords.find(word => word.id === wordId) || null;
    }

    /**
     * Get words by frequency range
     * @param {number} minRank - Minimum frequency rank (inclusive)
     * @param {number} maxRank - Maximum frequency rank (inclusive)
     * @returns {Promise<Word[]>} Words within frequency range
     */
    async getWordsByFrequency(minRank = 1, maxRank = 100) {
        const allWords = await this.loadWords();
        
        return allWords.filter(word => 
            word.frequencyRank >= minRank && word.frequencyRank <= maxRank
        ).sort((a, b) => a.frequencyRank - b.frequencyRank);
    }

    /**
     * Get most common words
     * @param {number} count - Number of words to return
     * @param {string} sourceLang - Source language (optional filter)
     * @param {string} targetLang - Target language (optional filter)
     * @returns {Promise<Word[]>} Most common words
     */
    async getMostCommonWords(count = 50, sourceLang = null, targetLang = null) {
        let words = await this.loadWords();
        
        // Filter by language pair if specified
        if (sourceLang && targetLang) {
            words = words.filter(word => 
                word.hasTranslation(sourceLang) && word.hasTranslation(targetLang)
            );
        }
        
        return words
            .sort((a, b) => a.frequencyRank - b.frequencyRank)
            .slice(0, count);
    }

    /**
     * Get random words
     * @param {number} count - Number of words to return
     * @param {string} sourceLang - Source language (optional filter)
     * @param {string} targetLang - Target language (optional filter)
     * @returns {Promise<Word[]>} Random words
     */
    async getRandomWords(count = 10, sourceLang = null, targetLang = null) {
        let words = await this.loadWords();
        
        // Filter by language pair if specified
        if (sourceLang && targetLang) {
            words = words.filter(word => 
                word.hasTranslation(sourceLang) && word.hasTranslation(targetLang)
            );
        }
        
        // Shuffle array
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    /**
     * Search words by text
     * @param {string} searchTerm - Term to search for
     * @param {string} language - Language to search in (optional)
     * @returns {Promise<Word[]>} Matching words
     */
    async searchWords(searchTerm, language = null) {
        const allWords = await this.loadWords();
        const searchLower = searchTerm.toLowerCase();
        
        return allWords.filter(word => {
            if (language) {
                // Search in specific language
                if (word.language === language && word.word.toLowerCase().includes(searchLower)) {
                    return true;
                }
                const translation = word.getTranslation(language);
                return translation.toLowerCase().includes(searchLower);
            } else {
                // Search in all languages
                if (word.word.toLowerCase().includes(searchLower)) {
                    return true;
                }
                return Object.values(word.translations).some(translation => 
                    translation.toLowerCase().includes(searchLower)
                );
            }
        });
    }

    /**
     * Get database statistics
     * @returns {Promise<Object>} Database statistics
     */
    async getStatistics() {
        const allWords = await this.loadWords();
        
        const stats = {
            totalWords: allWords.length,
            languageDistribution: {},
            frequencyRange: { min: Infinity, max: -Infinity },
            translationCoverage: { en: 0, hu: 0, bg: 0 },
            exampleCoverage: { en: 0, hu: 0, bg: 0 }
        };
        
        allWords.forEach(word => {
            // Language distribution
            if (!stats.languageDistribution[word.language]) {
                stats.languageDistribution[word.language] = 0;
            }
            stats.languageDistribution[word.language]++;
            
            // Frequency range
            if (word.frequencyRank < stats.frequencyRange.min) {
                stats.frequencyRange.min = word.frequencyRank;
            }
            if (word.frequencyRank > stats.frequencyRange.max) {
                stats.frequencyRange.max = word.frequencyRank;
            }
            
            // Translation and example coverage
            ['en', 'hu', 'bg'].forEach(lang => {
                if (word.hasTranslation(lang)) {
                    stats.translationCoverage[lang]++;
                }
                if (word.hasExamples(lang)) {
                    stats.exampleCoverage[lang]++;
                }
            });
        });
        
        // Calculate percentages
        Object.keys(stats.translationCoverage).forEach(lang => {
            stats.translationCoverage[lang] = Math.round(
                (stats.translationCoverage[lang] / stats.totalWords) * 100
            );
        });
        
        Object.keys(stats.exampleCoverage).forEach(lang => {
            stats.exampleCoverage[lang] = Math.round(
                (stats.exampleCoverage[lang] / stats.totalWords) * 100
            );
        });
        
        return stats;
    }

    /**
     * Preload all data for offline use
     * @returns {Promise<boolean>} True if preload successful
     */
    async preloadData() {
        try {
            await this.loadWords();
            console.log('Data preloaded successfully');
            return true;
        } catch (error) {
            console.error('Failed to preload data:', error);
            return false;
        }
    }

    /**
     * Clear cache and force reload on next request
     */
    clearCache() {
        this.wordsCache.clear();
        this.loadingPromises.clear();
        this.isLoaded = false;
    }

    /**
     * Check if data is loaded
     * @returns {boolean} True if data is loaded
     */
    isDataLoaded() {
        return this.isLoaded;
    }

    /**
     * Get cache size information
     * @returns {Object} Cache information
     */
    getCacheInfo() {
        return {
            cacheSize: this.wordsCache.size,
            loadingPromises: this.loadingPromises.size,
            isLoaded: this.isLoaded
        };
    }
}