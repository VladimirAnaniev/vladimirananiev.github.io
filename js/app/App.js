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
        this.currentMultipleChoiceResult = null;
        
        // UI state
        this.currentScreen = 'welcome'; // welcome, session, complete, settings
        this.cardRevealed = false;
        this.sessionStartTime = null;
        this.pandaReactionTimeout = null;
        
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
        
        // Update phonetics toggle
        const phoneticsToggle = document.getElementById('show-phonetics-toggle');
        if (phoneticsToggle) {
            phoneticsToggle.checked = this.settings.display.showPhonetics;
        }
        
        // Update transliterations toggle
        const transliterationsToggle = document.getElementById('show-transliterations-toggle');
        if (transliterationsToggle) {
            transliterationsToggle.checked = this.settings.display.showTransliterations;
        }
        
        // Update multiple choice toggle
        const multipleChoiceToggle = document.getElementById('multiple-choice-toggle');
        if (multipleChoiceToggle) {
            multipleChoiceToggle.checked = this.settings.display.multipleChoice;
        }
        
        // Apply CSS classes to body based on settings
        this.applyDisplaySettings();
        
        // Update daily cards count
        const dailyCardsInput = document.getElementById('daily-cards-input');
        if (dailyCardsInput) {
            dailyCardsInput.value = this.settings.dailyCardCount;
        }
        
        // Show/hide couples mode indicator
        this.updateCouplesModeDisplay();
    }

    /**
     * Apply display settings as CSS classes to body
     */
    applyDisplaySettings() {
        const body = document.body;
        
        // Apply phonetics visibility
        if (this.settings.display.showPhonetics) {
            body.classList.remove('hide-phonetics');
        } else {
            body.classList.add('hide-phonetics');
        }
        
        // Apply transliterations visibility
        if (this.settings.display.showTransliterations) {
            body.classList.remove('hide-transliterations');
        } else {
            body.classList.add('hide-transliterations');
        }
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
        
        // Event delegation for dynamically created example speaker buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.example-speaker-btn')) {
                e.preventDefault();
                e.stopPropagation(); // Prevent card flip when clicking speaker
                e.stopImmediatePropagation(); // Stop all other handlers
                const button = e.target.closest('.example-speaker-btn');
                const text = button.getAttribute('data-text');
                const lang = button.getAttribute('data-lang');
                if (text && lang) {
                    this.speakText(text, lang);
                }
                return false;
            }
        }, true); // Use capture phase to intercept before other handlers
        
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
        
        // Multiple choice next button
        const multipleChoiceNextBtn = document.getElementById('multiple-choice-next-btn');
        if (multipleChoiceNextBtn) {
            multipleChoiceNextBtn.addEventListener('click', this.handleMultipleChoiceNext.bind(this));
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
        
        const phoneticsToggle = document.getElementById('show-phonetics-toggle');
        if (phoneticsToggle) {
            phoneticsToggle.addEventListener('change', (e) => {
                this.settings.setShowPhonetics(e.target.checked);
                this.saveSettings();
            });
        }
        
        const transliterationsToggle = document.getElementById('show-transliterations-toggle');
        if (transliterationsToggle) {
            transliterationsToggle.addEventListener('change', (e) => {
                this.settings.setShowTransliterations(e.target.checked);
                this.saveSettings();
            });
        }
        
        const multipleChoiceToggle = document.getElementById('multiple-choice-toggle');
        if (multipleChoiceToggle) {
            multipleChoiceToggle.addEventListener('change', (e) => {
                this.settings.setMultipleChoice(e.target.checked);
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
            
            // Initialize panda to neutral state
            this.resetPandaState();
            
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
        
        // Reset panda to neutral for new card
        this.resetPandaState();
        
        await this.displayCard();
        this.cardRevealed = false;
    }

    /**
     * Display the current card
     */
    async displayCard() {
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
                const sourceTransliterations = sourceLang === 'bg' ? this.currentCard.word.getExampleTransliterations('bg') : [];
                sourceExamples.innerHTML = sourceExamplesList
                    .map((example, index) => {
                        const transliteration = sourceTransliterations[index] || '';
                        return `
                        <div class="flex items-center justify-between mb-2 group">
                            <div class="flex-1 pr-2">
                                <div class="italic text-gray-600">"${example}"</div>
                                ${transliteration ? `<div class="text-sm text-gray-500 mt-1 example-transliteration">${transliteration}</div>` : ''}
                            </div>
                            <button class="example-speaker-btn ml-2 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                                    data-text="${example}" data-lang="${sourceLang}" title="Play example">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 11-6 0 3 3 0 616 0z"></path>
                                </svg>
                            </button>
                        </div>`;
                    })
                    .join('');
                sourceExamples.style.display = 'block';
            } else {
                sourceExamples.style.display = 'none';
            }
        }
        
        if (cardFront) cardFront.style.display = 'block';
        if (cardBack) cardBack.style.display = 'none';
        if (actionButtons) actionButtons.style.display = 'flex';
        
        // Setup back of card
        const phoneticsText = document.getElementById('phonetics-text');
        const transliterationText = document.getElementById('transliteration-text');
        
        if (translationText) {
            if (this.settings.couplesMode && this.settings.canUseCouplesMode()) {
                // Couples mode: show two translations based on source language
                const couplesTranslations = document.getElementById('couples-translations');
                const translation1 = document.getElementById('translation-1');
                const translation2 = document.getElementById('translation-2');
                const { sourceLang } = this.settings.getLanguages();
                
                if (couplesTranslations && translation1 && translation2) {
                    if (sourceLang === 'en') {
                        // English source: show Hungarian and Bulgarian
                        translation1.textContent = `🇭🇺 ${this.currentCard.word.getTranslation('hu')}`;
                        translation2.textContent = `🇧🇬 ${this.currentCard.word.getTranslation('bg')}`;
                    } else if (sourceLang === 'bg') {
                        // Bulgarian source: show English and Hungarian
                        translation1.textContent = `🇺🇸 ${this.currentCard.word.getTranslation('en')}`;
                        translation2.textContent = `🇭🇺 ${this.currentCard.word.getTranslation('hu')}`;
                    }
                    couplesTranslations.style.display = 'block';
                    translationText.style.display = 'none';
                }
                
                // Hide phonetics and transliteration in couples mode (too cluttered)
                if (phoneticsText) phoneticsText.style.display = 'none';
                if (transliterationText) transliterationText.style.display = 'none';
            } else {
                // Normal mode
                translationText.textContent = this.currentCard.learningData.targetWord;
                translationText.style.display = 'block';
                const couplesTranslations = document.getElementById('couples-translations');
                if (couplesTranslations) couplesTranslations.style.display = 'none';
                
                // Show phonetics for target language
                if (phoneticsText) {
                    const phonetics = this.currentCard.word.getPhonetics(targetLang);
                    if (phonetics && phonetics.trim()) {
                        phoneticsText.textContent = `[${phonetics}]`;
                        phoneticsText.style.display = 'block';
                    } else {
                        phoneticsText.style.display = 'none';
                    }
                }
                
                // Show transliteration for Bulgarian
                if (transliterationText) {
                    const transliteration = this.currentCard.word.getTransliteration(targetLang);
                    if (transliteration && transliteration.trim() && targetLang === 'bg') {
                        transliterationText.textContent = `${transliteration}`;
                        transliterationText.style.display = 'block';
                    } else {
                        transliterationText.style.display = 'none';
                    }
                }
            }
        }
        
        // Show all target language examples on back card
        const targetExamples = document.getElementById('target-examples');
        if (targetExamples) {
            const targetExamplesList = this.currentCard.word.getExamples(targetLang);
            if (targetExamplesList.length > 0) {
                const targetTransliterations = targetLang === 'bg' ? this.currentCard.word.getExampleTransliterations('bg') : [];
                targetExamples.innerHTML = targetExamplesList
                    .map((example, index) => {
                        const transliteration = targetTransliterations[index] || '';
                        return `
                        <div class="flex items-center justify-between mb-2 group">
                            <div class="flex-1 pr-2">
                                <div class="italic text-gray-600">"${example}"</div>
                                ${transliteration ? `<div class="text-sm text-gray-500 mt-1 example-transliteration">${transliteration}</div>` : ''}
                            </div>
                            <button class="example-speaker-btn ml-2 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                                    data-text="${example}" data-lang="${targetLang}" title="Play example">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 11-6 0 3 3 0 616 0z"></path>
                                </svg>
                            </button>
                        </div>`;
                    })
                    .join('');
                targetExamples.style.display = 'block';
            } else {
                targetExamples.innerHTML = '<div class="text-gray-500">No examples available.</div>';
                targetExamples.style.display = 'block';
            }
        }
        
        // Handle multiple choice display
        await this.setupMultipleChoice();
        
        // Hide action buttons if multiple choice is active
        if (this.settings.display.multipleChoice) {
            if (actionButtons) actionButtons.style.display = 'none';
        }
    }

    /**
     * Setup multiple choice question for the current card
     */
    async setupMultipleChoice() {
        const multipleChoice = document.getElementById('multiple-choice');
        const multipleChoiceNext = document.getElementById('multiple-choice-next');
        
        if (!multipleChoice) return;

        if (!this.settings.display.multipleChoice) {
            multipleChoice.style.display = 'none';
            if (multipleChoiceNext) multipleChoiceNext.style.display = 'none';
            this.currentMultipleChoiceResult = null;
            return;
        }

        multipleChoice.style.display = 'block';
        if (multipleChoiceNext) multipleChoiceNext.style.display = 'none';
        this.currentMultipleChoiceResult = null;
        
        // Generate choices for multiple choice
        const choices = await this.generateMultipleChoices();
        const choiceContainers = document.querySelectorAll('.choice-container');
        const [, targetLang] = this.settings.learningPath.split('-');
        
        choiceContainers.forEach((container, index) => {
            if (choices[index]) {
                const choice = choices[index];
                const choiceText = container.querySelector('.choice-text');
                const choiceTransliteration = container.querySelector('.choice-transliteration');
                const soundButton = container.querySelector('.choice-sound-btn');
                
                // Set text content
                choiceText.textContent = choice.text;
                
                // Set transliteration if target language is Bulgarian
                if (targetLang === 'bg') {
                    const transliteration = choice.word.getTransliteration('bg');
                    if (transliteration) {
                        choiceTransliteration.textContent = transliteration;
                        choiceTransliteration.classList.remove('hidden');
                    } else {
                        choiceTransliteration.classList.add('hidden');
                    }
                } else {
                    choiceTransliteration.classList.add('hidden');
                }
                
                // Set up choice button (container is now the button)
                container.onclick = (e) => {
                    if (!e.target.closest('.choice-sound-btn')) {
                        this.handleMultipleChoiceAnswer(choice.isCorrect, container);
                    }
                };
                
                // Set up sound button
                if (soundButton) {
                    soundButton.onclick = (e) => {
                        e.stopPropagation();
                        this.speakText(choice.text, targetLang);
                    };
                }
                
                // Reset visual state
                container.classList.remove('bg-green-200', 'bg-red-200', 'border-green-400', 'border-red-400');
                container.classList.add('bg-white', 'border-gray-200');
                container.disabled = false;
            }
        });
    }

    /**
     * Generate multiple choice options
     * @returns {Promise<Object[]>} Array of choice objects with text, word, and isCorrect properties
     */
    async generateMultipleChoices() {
        if (!this.currentCard) return [];

        const [, targetLang] = this.settings.learningPath.split('-');
        const correctAnswer = this.currentCard.word.getTranslation(targetLang);
        
        // Get all words from database
        const allWords = await this.database.loadWords();
        
        // Get other words for wrong answers
        const otherWords = allWords
            .filter(word => word.id !== this.currentCard.word.id && word.hasTranslation(targetLang))
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(word => ({ 
                text: word.getTranslation(targetLang), 
                word: word,
                isCorrect: false 
            }));

        // Add correct answer
        const choices = [
            { 
                text: correctAnswer, 
                word: this.currentCard.word,
                isCorrect: true 
            },
            ...otherWords
        ];

        // Shuffle choices
        return choices.sort(() => Math.random() - 0.5);
    }

    /**
     * Handle multiple choice answer selection
     * @param {boolean} isCorrect - Whether the selected answer is correct
     * @param {HTMLElement} clickedContainer - The container that was clicked
     */
    handleMultipleChoiceAnswer(isCorrect, clickedContainer) {
        const [, targetLang] = this.settings.learningPath.split('-');
        const correctAnswer = this.currentCard.word.getTranslation(targetLang);
        
        // Store the result for later use
        this.currentMultipleChoiceResult = isCorrect;
        
        // Disable all choice buttons and show results
        const choiceContainers = document.querySelectorAll('.choice-container');
        choiceContainers.forEach(container => {
            const text = container.querySelector('.choice-text').textContent;
            
            container.disabled = true;
            container.onclick = null; // Disable clicking
            
            if (text === correctAnswer) {
                // Highlight correct answer in green
                container.classList.remove('bg-white', 'border-gray-200');
                container.classList.add('bg-green-200', 'border-green-400');
            } else if (container === clickedContainer && !isCorrect) {
                // Highlight wrong answer in red
                container.classList.remove('bg-white', 'border-gray-200');
                container.classList.add('bg-red-200', 'border-red-400');
            }
        });

        // Show panda reaction
        this.showPandaReaction(isCorrect);

        // Show the Next button
        const multipleChoiceNext = document.getElementById('multiple-choice-next');
        if (multipleChoiceNext) {
            multipleChoiceNext.style.display = 'flex';
        }

        // Flip card to show the back
        if (!this.cardRevealed) {
            setTimeout(() => {
                this.toggleCard();
            }, 800);
        }
    }
    
    /**
     * Handle Next button click in multiple choice mode
     */
    handleMultipleChoiceNext() {
        if (this.currentMultipleChoiceResult !== null) {
            this.handleCardResponse(this.currentMultipleChoiceResult);
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
            if (actionButtons) actionButtons.style.display = 'flex';
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
            // Show panda reaction if not in multiple choice mode (already shown there)
            if (!this.settings.display.multipleChoice) {
                this.showPandaReaction(wasCorrect);
            }
            
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
                    // Wait a moment for panda reaction before loading next card
                    setTimeout(async () => {
                        await this.loadNextCard();
                    }, this.settings.display.multipleChoice ? 0 : 1500);
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

    /**
     * Show panda reaction based on answer correctness
     * @param {boolean} isCorrect - Whether the answer was correct
     */
    showPandaReaction(isCorrect) {
        const pandaMascot = document.getElementById('panda-mascot');
        if (!pandaMascot) return;
        
        // Clear any existing reaction timeout
        if (this.pandaReactionTimeout) {
            clearTimeout(this.pandaReactionTimeout);
        }
        
        // Remove all existing state classes
        pandaMascot.classList.remove('panda-neutral', 'panda-happy', 'panda-sad');
        
        // Add appropriate reaction class
        if (isCorrect) {
            pandaMascot.classList.add('panda-happy');
        } else {
            pandaMascot.classList.add('panda-sad');
        }
        
        // Reset to neutral after reaction completes
        this.pandaReactionTimeout = setTimeout(() => {
            this.resetPandaState();
        }, 2000);
    }
    
    /**
     * Reset panda to neutral state
     */
    resetPandaState() {
        const pandaMascot = document.getElementById('panda-mascot');
        if (!pandaMascot) return;
        
        // Clear any pending timeout
        if (this.pandaReactionTimeout) {
            clearTimeout(this.pandaReactionTimeout);
            this.pandaReactionTimeout = null;
        }
        
        // Remove all state classes and set to neutral
        pandaMascot.classList.remove('panda-happy', 'panda-sad');
        pandaMascot.classList.add('panda-neutral');
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