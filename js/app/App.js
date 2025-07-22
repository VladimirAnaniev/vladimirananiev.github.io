/**
 * Main Application Controller - Coordinates all subsystems
 */
import { Settings } from '../models/Settings.js';
import { StorageManager } from '../storage/StorageManager.js';
import { DatabaseLoader } from '../data/DatabaseLoader.js';
import { ScheduleManager } from '../scheduling/ScheduleManager.js';
import { ProgressTracker } from '../tracking/ProgressTracker.js';

export class App {
    constructor() {
        // Initialize core systems
        this.storage = new StorageManager('language_learning');
        this.database = new DatabaseLoader();
        this.scheduleManager = new ScheduleManager(this.storage, this.database);
        this.progressTracker = new ProgressTracker(this.storage);
        
        // App state
        this.settings = null;
        this.currentSession = null;
        this.currentCard = null;
        this.isInitialized = false;
        
        // UI state
        this.currentScreen = 'welcome'; // welcome, session, complete, settings
        this.cardRevealed = false;
        this.sessionStartTime = null;
        
        // Bind methods
        this.handleCardResponse = this.handleCardResponse.bind(this);
        this.showAnswer = this.showAnswer.bind(this);
        this.toggleCard = this.toggleCard.bind(this);
        this.speakText = this.speakText.bind(this);
        this.loadNextCard = this.loadNextCard.bind(this);
        this.startNewSession = this.startNewSession.bind(this);
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            this.showLoadingScreen();
            
            // Load settings
            await this.loadSettings();
            
            // Preload database
            await this.database.preloadData();
            
            // Setup UI event listeners
            this.setupEventListeners();
            
            // Initialize speech synthesis
            this.initializeSpeechSynthesis();
            
            // Show appropriate screen
            if (this.settings.learningPath) {
                this.showWelcomeScreen();
            } else {
                this.showWelcomeScreen();
            }
            
            this.isInitialized = true;
            this.hideLoadingScreen();
            
            console.log('App initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize app. Please refresh the page.');
        }
    }

    /**
     * Load user settings
     */
    async loadSettings() {
        const settingsData = this.storage.getItem('user_settings', {});
        this.settings = Settings.fromJSON(settingsData);
        
        // Apply settings to UI
        this.applySettingsToUI();
    }

    /**
     * Save user settings
     */
    async saveSettings() {
        this.storage.setItem('user_settings', this.settings.toJSON());
        this.applySettingsToUI();
    }

    /**
     * Apply settings to UI elements
     */
    applySettingsToUI() {
        // Update language selector
        const languageSelector = document.getElementById('language-selector');
        if (languageSelector && this.settings.learningPath) {
            languageSelector.value = this.settings.learningPath;
        }
        
        const settingsLanguageSelector = document.getElementById('settings-language-selector');
        if (settingsLanguageSelector && this.settings.learningPath) {
            settingsLanguageSelector.value = this.settings.learningPath;
        }
        
        // Update couples mode
        const couplesModeToggle = document.getElementById('couples-mode-toggle');
        if (couplesModeToggle) {
            couplesModeToggle.checked = this.settings.couplesMode;
        }
        
        // Update daily cards count
        const dailyCardsInput = document.getElementById('daily-cards-input');
        if (dailyCardsInput) {
            dailyCardsInput.value = this.settings.dailyCardCount;
        }
        
        // Show/hide couples mode indicator
        this.updateCouplesModeDisplay();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Language selector
        const languageSelector = document.getElementById('language-selector');
        if (languageSelector) {
            languageSelector.addEventListener('change', (e) => {
                const startBtn = document.getElementById('start-learning-btn');
                if (startBtn) {
                    startBtn.disabled = !e.target.value;
                }
            });
        }
        
        // Start learning button
        const startBtn = document.getElementById('start-learning-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                const selectedPath = languageSelector?.value;
                if (selectedPath) {
                    this.settings.setLearningPath(selectedPath);
                    this.saveSettings();
                    this.startNewSession();
                }
            });
        }
        
        // Flashcard interactions
        const flashcard = document.getElementById('flashcard');
        if (flashcard) {
            flashcard.addEventListener('click', this.toggleCard.bind(this));
        }
        
        // Speech buttons
        const speakSourceBtn = document.getElementById('speak-source-btn');
        if (speakSourceBtn) {
            speakSourceBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card flip when clicking speaker
                if (this.currentCard) {
                    const [sourceLang] = this.settings.learningPath.split('-');
                    this.speakText(this.currentCard.learningData.sourceWord, sourceLang);
                }
            });
        }
        
        const speakTargetBtn = document.getElementById('speak-target-btn');
        if (speakTargetBtn) {
            speakTargetBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card flip when clicking speaker
                if (this.currentCard) {
                    const [, targetLang] = this.settings.learningPath.split('-');
                    this.speakText(this.currentCard.learningData.targetWord, targetLang);
                }
            });
        }
        
        // Couples mode speech buttons
        const speakHuBtn = document.getElementById('speak-hu-btn');
        if (speakHuBtn) {
            speakHuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.currentCard) {
                    this.speakText(this.currentCard.word.getTranslation('hu'), 'hu');
                }
            });
        }
        
        const speakBgBtn = document.getElementById('speak-bg-btn');
        if (speakBgBtn) {
            speakBgBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.currentCard) {
                    this.speakText(this.currentCard.word.getTranslation('bg'), 'bg');
                }
            });
        }
        
        const knowBtn = document.getElementById('know-btn');
        if (knowBtn) {
            knowBtn.addEventListener('click', () => this.handleCardResponse(true));
        }
        
        const dontKnowBtn = document.getElementById('dont-know-btn');
        if (dontKnowBtn) {
            dontKnowBtn.addEventListener('click', () => this.handleCardResponse(false));
        }
        
        // New session button
        const newSessionBtn = document.getElementById('new-session-btn');
        if (newSessionBtn) {
            newSessionBtn.addEventListener('click', this.startNewSession);
        }
        
        // Settings
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', this.showSettings.bind(this));
        }
        
        const closeSettingsBtn = document.getElementById('close-settings-btn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', this.hideSettings.bind(this));
        }
        
        const settingsOverlay = document.getElementById('settings-overlay');
        if (settingsOverlay) {
            settingsOverlay.addEventListener('click', this.hideSettings.bind(this));
        }
        
        // Settings form elements
        this.setupSettingsEventListeners();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
    }

    /**
     * Setup settings-specific event listeners
     */
    setupSettingsEventListeners() {
        const settingsLanguageSelector = document.getElementById('settings-language-selector');
        if (settingsLanguageSelector) {
            settingsLanguageSelector.addEventListener('change', (e) => {
                this.settings.setLearningPath(e.target.value);
                this.saveSettings();
            });
        }
        
        const couplesModeToggle = document.getElementById('couples-mode-toggle');
        if (couplesModeToggle) {
            couplesModeToggle.addEventListener('change', (e) => {
                this.settings.setCouplesMode(e.target.checked);
                this.saveSettings();
            });
        }
        
        const dailyCardsInput = document.getElementById('daily-cards-input');
        if (dailyCardsInput) {
            dailyCardsInput.addEventListener('change', (e) => {
                const count = parseInt(e.target.value);
                if (this.settings.setDailyCardCount(count)) {
                    this.saveSettings();
                }
            });
        }
        
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', this.exportData.bind(this));
        }
        
        const importBtn = document.getElementById('import-data-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                document.getElementById('import-file-input')?.click();
            });
        }
        
        const importFileInput = document.getElementById('import-file-input');
        if (importFileInput) {
            importFileInput.addEventListener('change', this.importData.bind(this));
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(event) {
        if (this.currentScreen !== 'session') return;
        
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.toggleCard();
                break;
            case 'KeyY':
                if (this.cardRevealed) {
                    this.handleCardResponse(true);
                }
                break;
            case 'KeyN':
                if (this.cardRevealed) {
                    this.handleCardResponse(false);
                }
                break;
        }
    }

    /**
     * Start a new learning session
     */
    async startNewSession() {
        try {
            if (!this.settings.learningPath) {
                this.showError('Please select a language pair first.');
                return;
            }
            
            this.showLoadingScreen();
            
            // Start session with schedule manager
            const sessionData = await this.scheduleManager.startSession(
                this.settings.learningPath,
                this.settings.dailyCardCount
            );
            
            if (sessionData.remainingCards === 0) {
                this.showSessionComplete({
                    cardsCompleted: sessionData.totalCards,
                    totalCards: sessionData.totalCards,
                    message: 'Great job! You\'ve completed all your cards for today!'
                });
                this.hideLoadingScreen();
                return;
            }
            
            this.currentSession = sessionData;
            
            // Start progress tracking
            this.progressTracker.startSession(
                this.settings.learningPath,
                sessionData.totalCards
            );
            
            this.sessionStartTime = Date.now();
            
            // Load first card
            await this.loadNextCard();
            
            this.showSessionScreen();
            this.hideLoadingScreen();
            
        } catch (error) {
            console.error('Failed to start session:', error);
            this.showError('Failed to start learning session. Please try again.');
            this.hideLoadingScreen();
        }
    }

    /**
     * Load the next card in the session
     */
    async loadNextCard() {
        const nextProgress = this.scheduleManager.getNextCard();
        
        if (!nextProgress) {
            await this.completeSession();
            return;
        }
        
        // Get word data for this card
        const word = await this.database.getWordById(nextProgress.wordId);
        if (!word) {
            console.error('Word not found:', nextProgress.wordId);
            await this.loadNextCard(); // Skip this card
            return;
        }
        
        // Get learning data for current language pair
        const [sourceLang, targetLang] = this.settings.learningPath.split('-');
        const learningData = word.getLearningData(sourceLang, targetLang);
        
        this.currentCard = {
            progress: nextProgress,
            word: word,
            learningData: learningData,
            startTime: Date.now()
        };
        
        // Start timing this card
        this.progressTracker.startCardTimer(word.id);
        
        this.displayCard();
        this.cardRevealed = false;
    }

    /**
     * Display the current card
     */
    displayCard() {
        if (!this.currentCard) return;
        
        const wordText = document.getElementById('word-text');
        const sourceExamples = document.getElementById('source-examples');
        const translationText = document.getElementById('translation-text');
        const exampleText = document.getElementById('example-text');
        const cardFront = document.getElementById('card-front');
        const cardBack = document.getElementById('card-back');
        const actionButtons = document.getElementById('action-buttons');
        
        // Update progress
        this.updateProgressDisplay();
        
        // Get language codes
        const [sourceLang, targetLang] = this.settings.learningPath.split('-');
        
        // Show front of card
        if (wordText) {
            wordText.textContent = this.currentCard.learningData.sourceWord;
        }
        
        // Show all source language examples on front card
        if (sourceExamples) {
            const sourceExamplesList = this.currentCard.word.getExamples(sourceLang);
            if (sourceExamplesList.length > 0) {
                sourceExamples.innerHTML = sourceExamplesList
                    .map(example => `<div class="italic text-gray-600 mb-1">"${example}"</div>`)
                    .join('');
                sourceExamples.style.display = 'block';
            } else {
                sourceExamples.style.display = 'none';
            }
        }
        
        if (cardFront) cardFront.style.display = 'block';
        if (cardBack) cardBack.style.display = 'none';
        if (actionButtons) actionButtons.style.display = 'none';
        
        // Setup back of card
        if (translationText) {
            if (this.settings.couplesMode && this.settings.getLanguages().sourceLang === 'en') {
                // Couples mode: show both Hungarian and Bulgarian
                const couplesTranslations = document.getElementById('couples-translations');
                const translation1 = document.getElementById('translation-1');
                const translation2 = document.getElementById('translation-2');
                
                if (couplesTranslations && translation1 && translation2) {
                    translation1.textContent = `🇭🇺 ${this.currentCard.word.getTranslation('hu')}`;
                    translation2.textContent = `🇧🇬 ${this.currentCard.word.getTranslation('bg')}`;
                    couplesTranslations.style.display = 'block';
                    translationText.style.display = 'none';
                }
            } else {
                // Normal mode
                translationText.textContent = this.currentCard.learningData.targetWord;
                translationText.style.display = 'block';
                const couplesTranslations = document.getElementById('couples-translations');
                if (couplesTranslations) couplesTranslations.style.display = 'none';
            }
        }
        
        // Show all target language examples on back card
        const targetExamples = document.getElementById('target-examples');
        if (targetExamples) {
            const targetExamplesList = this.currentCard.word.getExamples(targetLang);
            if (targetExamplesList.length > 0) {
                targetExamples.innerHTML = targetExamplesList
                    .map(example => `<div class="italic text-gray-600 mb-1">"${example}"</div>`)
                    .join('');
                targetExamples.style.display = 'block';
            } else {
                targetExamples.innerHTML = '<div class="text-gray-500">No examples available.</div>';
                targetExamples.style.display = 'block';
            }
        }
    }

    /**
     * Toggle between front and back of the card
     */
    toggleCard() {
        if (!this.currentCard) return;
        
        const cardFront = document.getElementById('card-front');
        const cardBack = document.getElementById('card-back');
        const actionButtons = document.getElementById('action-buttons');
        
        if (this.cardRevealed) {
            // Show front
            if (cardFront) cardFront.style.display = 'block';
            if (cardBack) cardBack.style.display = 'none';
            if (actionButtons) actionButtons.style.display = 'none';
            this.cardRevealed = false;
        } else {
            // Show back
            if (cardFront) cardFront.style.display = 'none';
            if (cardBack) cardBack.style.display = 'block';
            if (actionButtons) actionButtons.style.display = 'flex';
            this.cardRevealed = true;
        }
        
        // Add flip animation
        const flashcard = document.getElementById('flashcard');
        if (flashcard) {
            flashcard.classList.add('flipped');
            setTimeout(() => flashcard.classList.remove('flipped'), 400);
        }
    }

    /**
     * Show the answer side of the card
     */
    showAnswer() {
        if (this.cardRevealed || !this.currentCard) return;
        this.toggleCard();
    }

    /**
     * Speak text using Web Speech API
     * @param {string} text - Text to speak
     * @param {string} language - Language code (en, hu, bg)
     */
    speakText(text, language) {
        if (!('speechSynthesis' in window)) {
            console.warn('Speech synthesis not supported in this browser');
            return;
        }

        // Stop any currently speaking text
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find the best available voice for the language
        const voices = speechSynthesis.getVoices();
        const bestVoice = this.findBestVoice(voices, language);
        
        if (bestVoice) {
            utterance.voice = bestVoice;
            utterance.lang = bestVoice.lang;
            console.log(`Using voice: ${bestVoice.name} (${bestVoice.lang}) for "${text}"`);
        } else {
            // Fallback to language code mapping
            const languageMap = {
                'en': 'en-US',
                'hu': 'hu-HU', 
                'bg': 'bg-BG'
            };
            utterance.lang = languageMap[language] || 'en-US';
            console.warn(`No specific voice found for ${language}, using fallback: ${utterance.lang}`);
        }
        
        utterance.rate = 0.7; // Slower for better learning
        utterance.pitch = 1;
        utterance.volume = 1;

        // Handle errors
        utterance.onerror = (event) => {
            console.warn('Speech synthesis error:', event.error);
        };

        // Wait a moment for voices to load if needed
        if (voices.length === 0) {
            setTimeout(() => this.speakText(text, language), 100);
            return;
        }

        speechSynthesis.speak(utterance);
    }

    /**
     * Find the best available voice for a given language
     * @param {SpeechSynthesisVoice[]} voices - Available voices
     * @param {string} language - Target language code (en, hu, bg)
     * @returns {SpeechSynthesisVoice|null} Best matching voice
     */
    findBestVoice(voices, language) {
        if (!voices.length) return null;

        // Define preferred voices for each language (in order of preference)
        const voicePreferences = {
            'en': [
                'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-NZ',
                'Microsoft David - English (United States)',
                'Microsoft Zira - English (United States)',
                'Google US English',
                'Alex', 'Karen', 'Daniel'
            ],
            'hu': [
                'hu-HU', 'hu',
                'Microsoft Szabolcs - Hungarian (Hungary)',
                'Google magyar',
                'Hungarian',
                'Mariska'
            ],
            'bg': [
                'bg-BG', 'bg',
                'Microsoft Ivan - Bulgarian (Bulgaria)',
                'Google български',
                'Bulgarian'
            ]
        };

        const preferences = voicePreferences[language] || [];
        
        // First, try to find exact matches with our preferences
        for (const pref of preferences) {
            const voice = voices.find(v => 
                v.lang.toLowerCase().includes(pref.toLowerCase()) ||
                v.name.toLowerCase().includes(pref.toLowerCase())
            );
            if (voice) return voice;
        }
        
        // If no preferred voice found, find any voice for the language
        const langCode = language.toLowerCase();
        const voice = voices.find(v => 
            v.lang.toLowerCase().startsWith(langCode) ||
            v.lang.toLowerCase().includes(langCode)
        );
        
        if (voice) return voice;
        
        // Last resort: use default voice for English fallback
        if (language !== 'en') {
            return this.findBestVoice(voices, 'en');
        }
        
        return null;
    }

    /**
     * Initialize speech synthesis and load available voices
     */
    initializeSpeechSynthesis() {
        if (!('speechSynthesis' in window)) {
            console.warn('Speech synthesis not supported');
            return;
        }

        // Load voices - some browsers need this event
        const loadVoices = () => {
            const voices = speechSynthesis.getVoices();
            if (voices.length > 0) {
                console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
                
                // Test which languages are actually supported
                const supportedLanguages = ['en', 'hu', 'bg'];
                supportedLanguages.forEach(lang => {
                    const voice = this.findBestVoice(voices, lang);
                    if (voice) {
                        console.log(`Best voice for ${lang}: ${voice.name} (${voice.lang})`);
                    } else {
                        console.warn(`No voice found for language: ${lang}`);
                    }
                });
            }
        };

        // Load voices immediately if available
        loadVoices();

        // Also listen for the voiceschanged event (some browsers need this)
        speechSynthesis.addEventListener('voiceschanged', loadVoices);
    }

    /**
     * Handle user response to a card
     */
    async handleCardResponse(wasCorrect) {
        if (!this.cardRevealed || !this.currentCard) return;
        
        try {
            // End timing for this card
            const reviewTime = this.progressTracker.endCardTimer(this.currentCard.word.id);
            
            // Record the response
            this.progressTracker.recordResponse(
                this.currentCard.word.id,
                wasCorrect,
                reviewTime,
                {
                    bucketLevel: this.currentCard.progress.bucketLevel,
                    isNewCard: this.currentCard.progress.getTotalReviews() === 0
                }
            );
            
            // Complete the card with schedule manager
            const result = await this.scheduleManager.completeCard(
                this.currentCard.word.id,
                wasCorrect,
                reviewTime,
                this.settings.learningPath
            );
            
            if (result.success) {
                if (result.isSessionComplete) {
                    await this.completeSession();
                } else {
                    await this.loadNextCard();
                }
            } else {
                this.showError('Failed to save progress. Please try again.');
            }
            
        } catch (error) {
            console.error('Failed to handle card response:', error);
            this.showError('Failed to save progress. Please try again.');
        }
    }

    /**
     * Complete the current session
     */
    async completeSession() {
        try {
            // End progress tracking
            const sessionStats = this.progressTracker.endSession(true);
            
            // Get session statistics
            const scheduleStats = await this.scheduleManager.getSessionStatistics(
                this.settings.learningPath
            );
            
            this.showSessionComplete({
                ...sessionStats,
                ...scheduleStats
            });
            
        } catch (error) {
            console.error('Failed to complete session:', error);
            this.showError('Session completed but failed to save statistics.');
        }
    }

    /**
     * Update progress display
     */
    updateProgressDisplay() {
        if (!this.currentSession) return;
        
        const sessionProgress = document.getElementById('session-progress');
        const cardsCompleted = document.getElementById('cards-completed');
        const totalCards = document.getElementById('total-cards');
        const progressBar = document.getElementById('progress-bar');
        
        const completed = this.progressTracker.getCurrentSessionStats().cardsReviewed;
        const total = this.currentSession.totalCards;
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        
        if (sessionProgress) sessionProgress.textContent = `${completed}/${total}`;
        if (cardsCompleted) cardsCompleted.textContent = completed.toString();
        if (totalCards) totalCards.textContent = total.toString();
        if (progressBar) progressBar.style.width = `${percentage}%`;
        
        // Update language pair display
        const currentLanguagePair = document.getElementById('current-language-pair');
        if (currentLanguagePair && this.settings) {
            currentLanguagePair.textContent = this.settings.getLearningPathLabel();
        }
    }

    /**
     * Update couples mode display
     */
    updateCouplesModeDisplay() {
        const couplesModeIndicator = document.getElementById('couples-mode-indicator');
        if (couplesModeIndicator) {
            couplesModeIndicator.style.display = this.settings.couplesMode ? 'block' : 'none';
        }
    }

    /**
     * Show welcome screen
     */
    showWelcomeScreen() {
        this.currentScreen = 'welcome';
        this.hideAllScreens();
        
        const welcomeScreen = document.getElementById('welcome-screen');
        if (welcomeScreen) welcomeScreen.style.display = 'block';
        
        // Update language selector if settings exist
        if (this.settings.learningPath) {
            const languageSelector = document.getElementById('language-selector');
            if (languageSelector) {
                languageSelector.value = this.settings.learningPath;
                const startBtn = document.getElementById('start-learning-btn');
                if (startBtn) startBtn.disabled = false;
            }
        }
    }

    /**
     * Show session screen
     */
    showSessionScreen() {
        this.currentScreen = 'session';
        this.hideAllScreens();
        
        const sessionScreen = document.getElementById('flashcard-session');
        const progressIndicator = document.getElementById('progress-indicator');
        
        if (sessionScreen) sessionScreen.style.display = 'block';
        if (progressIndicator) progressIndicator.style.display = 'block';
    }

    /**
     * Show session complete screen
     */
    showSessionComplete(stats) {
        this.currentScreen = 'complete';
        this.hideAllScreens();
        
        const completeScreen = document.getElementById('session-complete');
        const progressIndicator = document.getElementById('progress-indicator');
        
        if (completeScreen) completeScreen.style.display = 'block';
        if (progressIndicator) progressIndicator.style.display = 'none';
        
        // Update stats display
        const statsCompleted = document.getElementById('stats-completed');
        const statsSuccessRate = document.getElementById('stats-success-rate');
        const statsTime = document.getElementById('stats-time');
        
        if (statsCompleted) statsCompleted.textContent = stats.cardsCompleted || 0;
        if (statsSuccessRate) statsSuccessRate.textContent = `${stats.successRate || 0}%`;
        if (statsTime) statsTime.textContent = stats.timeSpentFormatted || '0s';
        
        // Reset session state
        this.currentSession = null;
        this.currentCard = null;
    }

    /**
     * Show settings panel
     */
    showSettings() {
        const settingsPanel = document.getElementById('settings-panel');
        const settingsOverlay = document.getElementById('settings-overlay');
        
        if (settingsPanel) {
            settingsPanel.classList.add('open');
            settingsPanel.style.transform = 'translateX(0)';
        }
        if (settingsOverlay) settingsOverlay.style.display = 'block';
        
        // Update settings form with current values
        this.applySettingsToUI();
    }

    /**
     * Hide settings panel
     */
    hideSettings() {
        const settingsPanel = document.getElementById('settings-panel');
        const settingsOverlay = document.getElementById('settings-overlay');
        
        if (settingsPanel) {
            settingsPanel.classList.remove('open');
            settingsPanel.style.transform = 'translateX(100%)';
        }
        if (settingsOverlay) settingsOverlay.style.display = 'none';
    }

    /**
     * Hide all screens
     */
    hideAllScreens() {
        const screens = [
            'welcome-screen',
            'flashcard-session',
            'session-complete'
        ];
        
        screens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) screen.style.display = 'none';
        });
    }

    /**
     * Show loading screen
     */
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const appContainer = document.getElementById('app');
        
        if (loadingScreen) loadingScreen.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const appContainer = document.getElementById('app');
        
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
    }

    /**
     * Show error message
     */
    showError(message) {
        // Simple error display - could be enhanced with a modal
        alert(`Error: ${message}`);
        console.error(message);
    }

    /**
     * Export user data
     */
    exportData() {
        try {
            const exportData = this.storage.exportData();
            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `language-learning-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showError('Failed to export data.');
        }
    }

    /**
     * Import user data
     */
    importData(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                const success = this.storage.importData(importData, false);
                
                if (success) {
                    alert('Data imported successfully! The page will reload.');
                    window.location.reload();
                } else {
                    this.showError('Failed to import data. Please check the file format.');
                }
                
            } catch (error) {
                console.error('Failed to import data:', error);
                this.showError('Failed to import data. Invalid file format.');
            }
        };
        
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    window.languageLearningApp = app; // Make available globally for debugging
    
    try {
        await app.init();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        alert('Failed to initialize the application. Please refresh the page.');
    }
});