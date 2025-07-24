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
        this.currentPhraseResult = null;
        this.targetSentence = null;
        this.droppedWords = [];
        
        // UI state
        this.currentScreen = 'welcome'; // welcome, session, complete, settings
        this.cardRevealed = false;
        this.sessionStartTime = null;
        this.pandaReactionTimeout = null;
        this.currentStreak = 0; // Track consecutive correct answers
        
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
            // Force pink theme immediately for iPhone compatibility
            this.forcePinkTheme();
            
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
        // Apply CSS classes to body based on settings
        this.applyDisplaySettings();
        
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
     * Set learning mode based on selected value
     * @param {string} mode - The selected learning mode
     */
    setLearningMode(mode) {
        // Reset all modes first
        this.settings.display.multipleChoice = false;
        this.settings.display.phraseConstruction = false;
        
        // Set the selected mode
        if (mode === 'multiple-choice') {
            this.settings.display.multipleChoice = true;
        } else if (mode === 'fill-blank') {
            this.settings.display.phraseConstruction = true;
            this.settings.display.phraseMode = 'fillBlank';
        } else if (mode === 'word-order') {
            this.settings.display.phraseConstruction = true;
            this.settings.display.phraseMode = 'wordOrder';
        }
        // flashcards mode: both multipleChoice and phraseConstruction stay false
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Setup form elements
        const sourceLanguage = document.getElementById('source-language');
        const targetLanguage = document.getElementById('target-language');
        const startLearningBtn = document.getElementById('start-learning-btn');
        const setupStatus = document.getElementById('setup-status');

        // Language selection validation
        const validateSetup = () => {
            const source = sourceLanguage?.value;
            const target = targetLanguage?.value;
            
            if (!source || !target) {
                startLearningBtn.disabled = true;
                setupStatus.textContent = 'Please select both languages to continue';
                return false;
            }
            
            if (source === target) {
                startLearningBtn.disabled = true;
                setupStatus.textContent = 'Please select different languages';
                return false;
            }
            
            startLearningBtn.disabled = false;
            setupStatus.textContent = 'Ready to start learning!';
            
            // Update settings
            this.settings.setLearningPath(`${source}-${target}`);
            return true;
        };

        // Language dropdowns
        if (sourceLanguage) {
            sourceLanguage.addEventListener('change', validateSetup);
        }
        if (targetLanguage) {
            targetLanguage.addEventListener('change', validateSetup);
        }

        // Learning mode selection
        const learningModeInputs = document.querySelectorAll('input[name="learning-mode"]');
        
        // Set initial mode based on what's checked in HTML
        const checkedMode = document.querySelector('input[name="learning-mode"]:checked');
        if (checkedMode) {
            this.setLearningMode(checkedMode.value);
        }
        
        learningModeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.setLearningMode(e.target.value);
            });
        });

        // Text assistance (mutually exclusive)
        const textAssistanceInputs = document.querySelectorAll('input[name="text-assistance"]');
        textAssistanceInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const value = e.target.value;
                this.settings.display.showPhonetics = (value === 'phonetics');
                this.settings.display.showTransliterations = (value === 'transliteration');
            });
        });

        // Couples mode
        const couplesModeSetup = document.getElementById('couples-mode-setup');
        if (couplesModeSetup) {
            couplesModeSetup.addEventListener('change', (e) => {
                this.settings.setCouplesMode(e.target.checked);
            });
        }

        // Daily cards
        const dailyCardsSetup = document.getElementById('daily-cards-setup');
        if (dailyCardsSetup) {
            dailyCardsSetup.addEventListener('change', (e) => {
                this.settings.setDailyCardCount(parseInt(e.target.value));
            });
        }

        // Theme controls
        const colorPickerSetup = document.getElementById('color-picker-setup');
        if (colorPickerSetup) {
            colorPickerSetup.addEventListener('change', (e) => {
                this.handleColorChange(e);
            });
        }

        const whiteThemeSetup = document.getElementById('white-theme-setup');
        if (whiteThemeSetup) {
            whiteThemeSetup.addEventListener('click', () => {
                this.toggleWhiteTheme();
            });
        }

        // Start learning button
        if (startLearningBtn) {
            startLearningBtn.addEventListener('click', () => {
                if (validateSetup()) {
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
        
        // Phrase construction buttons
        const fillBlankNextBtn = document.getElementById('fill-blank-next-btn');
        if (fillBlankNextBtn) {
            fillBlankNextBtn.addEventListener('click', this.handleFillBlankNext.bind(this));
        }
        
        const wordOrderNextBtn = document.getElementById('word-order-next-btn');
        if (wordOrderNextBtn) {
            wordOrderNextBtn.addEventListener('click', this.handleWordOrderNext.bind(this));
        }
        
        // Settings panel functionality removed - now handled in homepage setup
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
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
            
            // Reset streak counter for new session
            this.currentStreak = 0;
            
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
    async loadNextCard(skipCount = 0) {
        const MAX_SKIP_COUNT = 50; // Prevent infinite loops
        
        if (skipCount > MAX_SKIP_COUNT) {
            console.error('Too many cards skipped in a row, completing session');
            await this.completeSession();
            return;
        }
        
        const nextProgress = this.scheduleManager.getNextCard();
        
        if (!nextProgress) {
            await this.completeSession();
            return;
        }
        
        // Get word data for this card
        const word = await this.database.getWordById(nextProgress.wordId);
        if (!word) {
            console.error('Word not found:', nextProgress.wordId);
            await this.loadNextCard(skipCount + 1); // Skip this card
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
        
        // Check if this card should be skipped for the current mode
        if (this.shouldSkipCardForCurrentMode()) {
            console.log(`Skipping card "${word.word}" (${word.id}) - no suitable examples for current mode`);
            // Mark this card as completed to move past it
            await this.scheduleManager.completeCard(word.id, true, 0, this.settings.learningPath);
            await this.loadNextCard(skipCount + 1); // Recursively try next card with incremented counter
            return;
        }
        
        // Reset results from previous modes
        this.currentMultipleChoiceResult = null;
        this.currentPhraseResult = null;
        this.targetSentence = null;
        this.droppedWords = [];
        
        // Start timing this card
        this.progressTracker.startCardTimer(word.id);
        
        // Reset panda to neutral for new card
        this.resetPandaState();
        
        await this.displayCard();
        this.cardRevealed = false;
    }

    /**
     * Check if the current card should be skipped for the current learning mode
     */
    shouldSkipCardForCurrentMode() {
        if (!this.currentCard || !this.currentCard.word) return false;
        
        const [sourceLang, targetLang] = this.settings.learningPath.split('-');
        const targetWord = this.currentCard.word.getTranslation(targetLang);
        
        // For phrase construction modes, check if we have suitable examples
        if (this.settings.display.phraseConstruction) {
            const targetExamples = this.currentCard.word.getExamples(targetLang);
            
            if (this.settings.display.phraseMode === 'fillBlank') {
                // Fill-blank needs examples that contain the target word
                const hasValidExample = targetExamples.some(example => 
                    example.toLowerCase().includes(targetWord.toLowerCase())
                );
                if (!hasValidExample) {
                    console.log(`Fill-blank mode: No examples contain "${targetWord}"`);
                    return true;
                }
            } else if (this.settings.display.phraseMode === 'wordOrder') {
                // Word order needs examples that contain the target word (preferred) or any examples
                const hasValidExample = targetExamples.some(example => 
                    example.toLowerCase().includes(targetWord.toLowerCase())
                );
                if (!hasValidExample && targetExamples.length === 0) {
                    console.log(`Word order mode: No examples available for "${targetWord}"`);
                    return true;
                }
            }
        }
        
        // Other modes (flashcards, multiple choice) don't need special example requirements
        return false;
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
        
        // Handle phrase construction display
        await this.setupPhraseConstruction();
        
        // Handle card display state based on active modes
        const flashcard = document.getElementById('flashcard');
        
        if (this.settings.display.phraseConstruction) {
            // Hide entire flashcard in phrase construction mode
            if (flashcard) flashcard.style.display = 'none';
            if (actionButtons) actionButtons.style.display = 'none';
            this.cardRevealed = true;
        } else if (this.settings.display.multipleChoice) {
            // Show front of card for multiple choice mode (source language)
            if (flashcard) flashcard.style.display = 'block';
            if (cardFront) cardFront.style.display = 'block';
            if (cardBack) cardBack.style.display = 'none';
            if (actionButtons) actionButtons.style.display = 'none';
            this.cardRevealed = false;
        } else {
            // Normal flashcard mode
            if (flashcard) flashcard.style.display = 'block';
            if (cardFront) cardFront.style.display = 'block';
            if (cardBack) cardBack.style.display = 'none';
            if (actionButtons) actionButtons.style.display = 'none';
            this.cardRevealed = false;
        }
        
        // Apply multiple choice CSS class if active
        const body = document.body;
        if (this.settings.display.multipleChoice) {
            body.classList.add('multiple-choice-active');
        } else {
            body.classList.remove('multiple-choice-active');
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
     * Setup phrase construction for the current card
     */
    async setupPhraseConstruction() {
        const phraseConstruction = document.getElementById('phrase-construction');
        const fillBlankMode = document.getElementById('fill-blank-mode');
        const wordOrderMode = document.getElementById('word-order-mode');
        
        if (!phraseConstruction) return;

        if (!this.settings.display.phraseConstruction) {
            phraseConstruction.style.display = 'none';
            // Hide next buttons when phrase construction is disabled
            const fillBlankNext = document.getElementById('fill-blank-next');
            const wordOrderNext = document.getElementById('word-order-next');
            if (fillBlankNext) fillBlankNext.style.display = 'none';
            if (wordOrderNext) wordOrderNext.style.display = 'none';
            return;
        }

        phraseConstruction.style.display = 'block';
        
        // Hide both next buttons initially
        const fillBlankNext = document.getElementById('fill-blank-next');
        const wordOrderNext = document.getElementById('word-order-next');
        const fillBlankHint = document.getElementById('fill-blank-hint');
        if (fillBlankNext) fillBlankNext.style.display = 'none';
        if (wordOrderNext) wordOrderNext.style.display = 'none';
        if (fillBlankHint) fillBlankHint.classList.add('hidden');
        
        // Show the appropriate mode
        if (this.settings.display.phraseMode === 'fillBlank') {
            fillBlankMode.style.display = 'block';
            wordOrderMode.style.display = 'none';
            await this.setupFillBlankMode();
        } else if (this.settings.display.phraseMode === 'wordOrder') {
            fillBlankMode.style.display = 'none';
            wordOrderMode.style.display = 'block';
            await this.setupWordOrderMode();
        }
    }

    /**
     * Setup fill-in-the-blank mode
     */
    async setupFillBlankMode() {
        if (!this.currentCard) return;

        const [sourceLang, targetLang] = this.settings.learningPath.split('-');
        const targetWord = this.currentCard.word.getTranslation(targetLang);
        
        // Find examples that contain the target word
        const targetExamples = this.currentCard.word.getExamples(targetLang);
        const sourceExamples = this.currentCard.word.getExamples(sourceLang);
        
        // Filter examples that contain the target word (case insensitive)
        const validExamples = [];
        targetExamples.forEach((example, index) => {
            if (example.toLowerCase().includes(targetWord.toLowerCase())) {
                validExamples.push({
                    target: example,
                    source: sourceExamples[index] || sourceExamples[0] || `"${this.currentCard.word.getTranslation(sourceLang)}"`,
                    index: index
                });
            }
        });
        
        // This should not happen since we check at loadNextCard level
        if (validExamples.length === 0) {
            console.error(`Unexpected: No valid examples in fill-blank mode for "${targetWord}"`);
            return;
        }

        // Pick a random valid example
        const selectedExample = validExamples[Math.floor(Math.random() * validExamples.length)];

        // Show source reference above the blank with transliteration if applicable
        const hintElement = document.getElementById('fill-blank-hint');
        if (hintElement) {
            const sourceTransliteration = sourceLang === 'bg' ? this.currentCard.word.getExampleTransliterations('bg')[selectedExample.index] : '';
            
            if (sourceTransliteration && this.settings.display.showTransliterations) {
                hintElement.innerHTML = `
                    <div>${selectedExample.source}</div>
                    <div class="text-sm text-gray-500 mt-1 transliteration-text">${sourceTransliteration}</div>
                `;
            } else {
                hintElement.textContent = selectedExample.source;
            }
            hintElement.classList.remove('hidden');
        }

        // Create a fill-in-the-blank from the TARGET example (testing source -> target knowledge)
        const phraseWithBlanks = selectedExample.target.replace(new RegExp(targetWord, 'gi'), '____');
        
        // Display the phrase with blanks and transliteration if applicable
        const phraseElement = document.getElementById('phrase-with-blanks');
        const targetTransliterations = targetLang === 'bg' ? this.currentCard.word.getExampleTransliterations('bg') : [];
        const selectedExampleTransliteration = targetTransliterations[selectedExample.index] || '';
        
        if (targetLang === 'bg' && selectedExampleTransliteration && this.settings.display.showTransliterations) {
            const transliterationWithBlanks = selectedExampleTransliteration.replace(new RegExp(this.currentCard.word.getTransliteration(targetLang), 'gi'), '____');
            phraseElement.innerHTML = `
                <div>${phraseWithBlanks}</div>
                <div class="text-sm text-gray-500 mt-2 transliteration-text">${transliterationWithBlanks}</div>
            `;
        } else {
            phraseElement.textContent = phraseWithBlanks;
        }

        // Generate multiple choice options for the blank (target language choices)
        await this.generateBlankChoices(targetWord);
    }


    /**
     * Generate choices for fill-in-the-blank
     */
    async generateBlankChoices(correctAnswer) {
        const [, targetLang] = this.settings.learningPath.split('-');
        const allWords = await this.database.loadWords();
        
        // Get other words for wrong answers (in TARGET language)
        const otherWords = allWords
            .filter(word => word.id !== this.currentCard.word.id && word.hasTranslation(targetLang))
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(word => word.getTranslation(targetLang));

        // Create choices array
        const choices = [correctAnswer, ...otherWords].sort(() => Math.random() - 0.5);

        // Display choices
        const choicesContainer = document.getElementById('blank-choices');
        choicesContainer.innerHTML = '';

        choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.className = 'blank-choice bg-white border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg p-3 text-sm font-medium transition-colors';
            
            // Show transliteration for Bulgarian target choices if enabled
            if (targetLang === 'bg' && this.settings.display.showTransliterations) {
                // Find the word object for this choice to get its transliteration
                const choiceWord = allWords.find(word => word.getTranslation(targetLang) === choice) || this.currentCard.word;
                const choiceTransliteration = choiceWord.getTransliteration(targetLang);
                
                if (choiceTransliteration && choiceTransliteration !== choice) {
                    button.innerHTML = `
                        <div>${choice}</div>
                        <div class="text-xs text-gray-500 mt-1 transliteration-text">${choiceTransliteration}</div>
                    `;
                } else {
                    button.textContent = choice;
                }
            } else {
                button.textContent = choice;
            }
            
            button.onclick = () => this.handleBlankChoice(choice, correctAnswer, button);
            choicesContainer.appendChild(button);
        });
    }

    /**
     * Handle blank choice selection
     */
    handleBlankChoice(selectedChoice, correctAnswer, clickedButton) {
        const isCorrect = selectedChoice === correctAnswer;
        
        // Store result
        this.currentPhraseResult = isCorrect;
        
        // Show panda reaction immediately when phrase is completed
        this.showPandaReaction(isCorrect);
        
        // Disable all choices and show results
        const choices = document.querySelectorAll('.blank-choice');
        choices.forEach(choice => {
            choice.disabled = true;
            choice.onclick = null;
            
            if (choice.textContent === correctAnswer) {
                choice.classList.add('bg-green-200', 'border-green-400');
            } else if (choice === clickedButton && !isCorrect) {
                choice.classList.add('bg-red-200', 'border-red-400');
            }
        });

        // Show next button
        const nextButton = document.getElementById('fill-blank-next');
        if (nextButton) {
            nextButton.style.display = 'flex';
        }
    }

    /**
     * Setup word ordering mode
     */
    async setupWordOrderMode() {
        if (!this.currentCard) return;

        const [sourceLang, targetLang] = this.settings.learningPath.split('-');
        const targetWord = this.currentCard.word.getTranslation(targetLang);
        
        // Find examples that contain the target word
        const targetExamples = this.currentCard.word.getExamples(targetLang);
        const sourceExamples = this.currentCard.word.getExamples(sourceLang);
        
        // Filter examples that contain the target word (case insensitive)
        const validExamples = [];
        targetExamples.forEach((example, index) => {
            if (example.toLowerCase().includes(targetWord.toLowerCase())) {
                validExamples.push({
                    target: example,
                    source: sourceExamples[index] || sourceExamples[0] || `"${this.currentCard.word.getTranslation(sourceLang)}"`,
                    index: index
                });
            }
        });
        
        // For word ordering, we should also prefer examples that contain the target word
        // but can be more flexible since we're not creating blanks
        if (validExamples.length === 0) {
            console.log(`No target examples contain "${targetWord}", using any available examples for word ordering`);
            
            // Use any available target example for word ordering
            if (targetExamples.length > 0) {
                targetExamples.forEach((example, index) => {
                    validExamples.push({
                        target: example,
                        source: sourceExamples[index] || sourceExamples[0] || `"${this.currentCard.word.getTranslation(sourceLang)}"`,
                        index: index
                    });
                });
            }
        }
        
        // This should not happen since we check at loadNextCard level  
        if (validExamples.length === 0) {
            console.error(`Unexpected: No valid examples in word-order mode for "${targetWord}"`);
            return;
        }

        // Pick a random valid example
        const selectedExample = validExamples[Math.floor(Math.random() * validExamples.length)];

        // Show source hint with transliteration if applicable
        const hintElement = document.getElementById('target-phrase-hint');
        const sourceTransliteration = sourceLang === 'bg' ? this.currentCard.word.getExampleTransliterations('bg')[selectedExample.index] : '';
        
        if (sourceTransliteration && this.settings.display.showTransliterations) {
            hintElement.innerHTML = `
                <div>${selectedExample.source}</div>
                <div class="text-sm text-gray-500 mt-1 transliteration-text">${sourceTransliteration}</div>
            `;
        } else {
            hintElement.textContent = selectedExample.source;
        }

        // Split TARGET sentence into words and shuffle (they reconstruct the target sentence)
        this.targetSentence = selectedExample.target;
        // Split into words and punctuation, keeping track of original structure
        const allTokens = selectedExample.target.split(/(\s+|[.,!?;])/).filter(part => part.length > 0);
        // Only show non-space tokens to user
        const wordTokens = allTokens.filter(token => !token.match(/^\s+$/));
        const shuffledWords = [...wordTokens].sort(() => Math.random() - 0.5);
        
        // Store the word structure for reconstruction
        this.wordStructure = allTokens;

        // Display shuffled words
        const wordBank = document.getElementById('word-bank');
        wordBank.innerHTML = '';
        
        // Get transliterations for target language if Bulgarian
        const targetTransliterations = targetLang === 'bg' ? this.currentCard.word.getExampleTransliterations('bg') : [];
        const selectedExampleTransliteration = targetTransliterations[selectedExample.index] || '';
        
        shuffledWords.forEach((word, index) => {
            const wordElement = document.createElement('div');
            wordElement.className = 'word-token bg-blue-100 border border-blue-300 rounded px-3 py-2 cursor-pointer hover:bg-blue-200 transition-colors';
            
            // Show transliteration for Bulgarian target words if enabled
            if (targetLang === 'bg' && selectedExampleTransliteration && this.settings.display.showTransliterations) {
                // Find the transliteration for this specific word token
                const targetTokens = selectedExample.target.split(/(\s+|[.,!?;])/).filter(part => part.length > 0 && !part.match(/^\s+$/));
                const transliterationTokens = selectedExampleTransliteration.split(/(\s+|[.,!?;])/).filter(part => part.length > 0 && !part.match(/^\s+$/));
                
                const wordIndexInTarget = targetTokens.indexOf(word);
                const wordTransliteration = wordIndexInTarget >= 0 && wordIndexInTarget < transliterationTokens.length ? 
                    transliterationTokens[wordIndexInTarget] : '';
                
                if (wordTransliteration && wordTransliteration !== word) {
                    wordElement.innerHTML = `
                        <div>${word}</div>
                        <div class="text-xs text-gray-600 transliteration-text">${wordTransliteration}</div>
                    `;
                } else {
                    wordElement.textContent = word;
                }
            } else {
                wordElement.textContent = word;
            }
            
            wordElement.draggable = true;
            wordElement.dataset.word = word;
            wordElement.onclick = () => this.moveWordToDropZone(wordElement);
            
            // Add drag start event
            wordElement.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', '');
                wordElement.classList.add('opacity-50');
                this.draggedElement = wordElement;
            });
            
            wordElement.addEventListener('dragend', (e) => {
                wordElement.classList.remove('opacity-50');
                this.draggedElement = null;
            });
            
            wordBank.appendChild(wordElement);
        });

        // Initialize drop zone
        this.initializeDropZone();
    }


    /**
     * Initialize the drop zone for word ordering
     */
    initializeDropZone() {
        const dropZone = document.getElementById('word-drop-zone');
        this.droppedWords = [];
        this.draggedElement = null;
        
        // Clear drop zone
        dropZone.innerHTML = '<span class="text-gray-400 text-sm" id="drop-zone-hint">Drop words here</span>';
        
        // Add drag and drop events to drop zone for reordering
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-blue-400', 'bg-blue-50');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            // Only remove highlight if leaving the drop zone entirely
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('border-blue-400', 'bg-blue-50');
            }
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-400', 'bg-blue-50');
            
            if (this.draggedElement) {
                const wordBank = document.getElementById('word-bank');
                
                if (wordBank.contains(this.draggedElement)) {
                    // Moving from word bank to drop zone
                    this.moveWordToDropZone(this.draggedElement);
                } else if (dropZone.contains(this.draggedElement)) {
                    // Handle reordering within drop zone
                    const dropTarget = e.target.closest('.word-token');
                    if (dropTarget && dropTarget !== this.draggedElement) {
                        // Insert before the target
                        dropZone.insertBefore(this.draggedElement, dropTarget);
                        this.updateDroppedWordsOrder();
                    }
                }
            }
        });
    }

    /**
     * Update the dropped words order based on DOM order
     */
    updateDroppedWordsOrder() {
        const dropZone = document.getElementById('word-drop-zone');
        const wordElements = dropZone.querySelectorAll('.word-token');
        this.droppedWords = Array.from(wordElements).map(el => el.dataset.word);
    }

    /**
     * Move word to drop zone
     */
    moveWordToDropZone(wordElement) {
        const dropZone = document.getElementById('word-drop-zone');
        const hint = document.getElementById('drop-zone-hint');
        
        // Hide hint if this is the first word
        if (hint && this.droppedWords.length === 0) {
            hint.style.display = 'none';
        }
        
        // Create word in drop zone
        const droppedWord = document.createElement('div');
        droppedWord.className = 'word-token bg-green-100 border border-green-300 rounded px-3 py-2 cursor-pointer hover:bg-green-200 transition-colors';
        droppedWord.innerHTML = wordElement.innerHTML; // Preserve transliteration HTML
        droppedWord.dataset.word = wordElement.dataset.word;
        droppedWord.draggable = true;
        droppedWord.onclick = () => this.removeWordFromDropZone(droppedWord);
        
        // Add drag events for reordering within drop zone
        droppedWord.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', '');
            droppedWord.classList.add('opacity-50');
            this.draggedElement = droppedWord;
        });
        
        droppedWord.addEventListener('dragend', (e) => {
            droppedWord.classList.remove('opacity-50');
            this.draggedElement = null;
        });
        
        dropZone.appendChild(droppedWord);
        this.droppedWords.push(wordElement.dataset.word);
        
        // Remove from word bank
        wordElement.remove();
        
        // Check if complete
        this.checkWordOrderComplete();
    }

    /**
     * Remove word from drop zone back to word bank
     */
    removeWordFromDropZone(droppedWordElement) {
        const wordBank = document.getElementById('word-bank');
        const dropZone = document.getElementById('word-drop-zone');
        
        // Remove from dropped words array
        const wordIndex = this.droppedWords.indexOf(droppedWordElement.dataset.word);
        if (wordIndex > -1) {
            this.droppedWords.splice(wordIndex, 1);
        }
        
        // Create new word element in word bank
        const wordElement = document.createElement('div');
        wordElement.className = 'word-token bg-blue-100 border border-blue-300 rounded px-3 py-2 cursor-pointer hover:bg-blue-200 transition-colors';
        wordElement.innerHTML = droppedWordElement.innerHTML; // Preserve transliteration HTML
        wordElement.dataset.word = droppedWordElement.dataset.word;
        wordElement.draggable = true;
        wordElement.onclick = () => this.moveWordToDropZone(wordElement);
        wordBank.appendChild(wordElement);
        
        // Remove from drop zone
        droppedWordElement.remove();
        
        // Show hint if drop zone is empty
        if (this.droppedWords.length === 0) {
            const hint = document.getElementById('drop-zone-hint');
            if (hint) {
                hint.style.display = 'inline';
            }
        }
    }

    /**
     * Reconstruct sentence with proper spaces from word order
     */
    reconstructSentenceWithSpaces(droppedWords) {
        if (!this.wordStructure) {
            // Fallback: just join with spaces
            return droppedWords.join(' ');
        }
        
        let result = '';
        let wordIndex = 0;
        
        for (let token of this.wordStructure) {
            if (token.match(/^\s+$/)) {
                // This is a space - add it as is
                result += token;
            } else {
                // This is a word/punctuation - use from droppedWords
                if (wordIndex < droppedWords.length) {
                    result += droppedWords[wordIndex];
                    wordIndex++;
                }
            }
        }
        
        return result;
    }

    /**
     * Check if word ordering is complete and correct
     */
    checkWordOrderComplete() {
        const wordBank = document.getElementById('word-bank');
        const nextButton = document.getElementById('word-order-next');
        
        // Check if all words are used
        if (wordBank.children.length === 0) {
            // Reconstruct sentence with proper spacing
            const constructedSentence = this.reconstructSentenceWithSpaces(this.droppedWords);
            const targetSentence = this.targetSentence;
            
            // Simple comparison since we're reconstructing with proper spacing
            const isCorrect = constructedSentence.trim() === targetSentence.trim();
            
            this.currentPhraseResult = isCorrect;
            
            // Show panda reaction immediately when word order is completed
            this.showPandaReaction(isCorrect);
            
            // Show visual feedback
            const dropZone = document.getElementById('word-drop-zone');
            const words = dropZone.querySelectorAll('.word-token');
            
            words.forEach(word => {
                // Remove existing colors first
                word.classList.remove('bg-green-100', 'border-green-300', 'bg-red-200', 'border-red-400');
                
                if (isCorrect) {
                    // Correct answer - show green
                    word.classList.add('bg-green-200', 'border-green-400');
                } else {
                    // Incorrect answer - show red
                    word.classList.add('bg-red-200', 'border-red-400');
                }
                
                // Disable interaction
                word.onclick = null;
                word.draggable = false;
            });
            
            // If incorrect, show the correct answer
            if (!isCorrect) {
                const hintElement = document.getElementById('target-phrase-hint');
                if (hintElement) {
                    const originalText = hintElement.textContent;
                    hintElement.innerHTML = `
                        <div class="mb-2">${originalText}</div>
                        <div class="text-sm text-green-600 font-medium">Correct answer: "${this.targetSentence}"</div>
                    `;
                }
            }
            
            // Show next button
            if (nextButton) {
                nextButton.style.display = 'flex';
            }
        }
    }

    /**
     * Handle fill blank next button
     */
    handleFillBlankNext() {
        // Ensure cardRevealed is true for phrase construction
        this.cardRevealed = true;
        
        if (this.currentPhraseResult !== null) {
            this.handleCardResponse(this.currentPhraseResult);
        }
    }

    /**
     * Handle word order next button
     */
    handleWordOrderNext() {
        // Ensure cardRevealed is true for phrase construction
        this.cardRevealed = true;
        
        if (this.currentPhraseResult !== null) {
            this.handleCardResponse(this.currentPhraseResult);
        }
    }

    /**
     * Toggle between front and back of the card
     */
    toggleCard() {
        if (!this.currentCard) return;
        
        // Don't allow manual toggle in phrase construction mode
        if (this.settings.display.phraseConstruction) {
            return;
        }
        
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
            if (actionButtons) {
                // In phrase construction mode, hide action buttons
                if (this.settings.display.phraseConstruction) {
                    actionButtons.style.display = 'none';
                } else {
                    actionButtons.style.display = 'flex';
                }
            }
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
        if (!this.cardRevealed || !this.currentCard) {
            return;
        }
        
        try {
            // Show panda reaction if not in multiple choice mode (already shown there)
            if (!this.settings.display.multipleChoice && !this.settings.display.phraseConstruction) {
                this.showPandaReaction(wasCorrect);
            } else if (this.settings.display.phraseConstruction) {
                // Panda reaction already shown immediately when phrase completed
                console.log('PHRASE MODE: Panda reaction already shown, skipping duplicate');
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
                    const delay = (this.settings.display.multipleChoice || this.settings.display.phraseConstruction) ? 0 : 1500;
                    setTimeout(async () => {
                        await this.loadNextCard();
                    }, delay);
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
     * Show panda reaction based on answer correctness with streak tracking
     * @param {boolean} isCorrect - Whether the answer was correct
     */
    showPandaReaction(isCorrect) {
        const pandaMascot = document.getElementById('panda-mascot');
        const celebrationEmoji = document.getElementById('celebration-emoji');
        if (!pandaMascot) return;
        
        // Clear any existing reaction timeout
        if (this.pandaReactionTimeout) {
            clearTimeout(this.pandaReactionTimeout);
        }
        
        // Store previous streak for logic
        const previousStreak = this.currentStreak;
        
        // Update streak counter
        if (isCorrect) {
            this.currentStreak++;
        } else {
            this.currentStreak = 0;
        }
        
        // Remove all existing state classes
        pandaMascot.classList.remove(
            'panda-neutral', 'panda-happy', 'panda-sad', 
            'panda-streak', 'panda-super-streak'
        );
        
        // Only hide celebration emoji if we're breaking a streak or not in celebration mode
        if (celebrationEmoji) {
            // Hide if we're not in celebration territory or if this is an incorrect answer
            if (this.currentStreak < 3 || !isCorrect) {
                celebrationEmoji.classList.add('hidden');
                console.log('Hiding celebration emoji');
            } else {
                console.log('Keeping celebration emoji visible, streak:', this.currentStreak);
            }
        } else {
            console.log('ERROR: celebration emoji element not found!');
        }
        
        // Add appropriate reaction class based on correctness and streak
        if (isCorrect) {
            if (this.currentStreak >= 5) {
                // Super streak celebration for 5+ correct answers
                console.log('Adding panda-super-streak class, streak:', this.currentStreak);
                pandaMascot.classList.add('panda-super-streak');
                if (celebrationEmoji) {
                    celebrationEmoji.textContent = '🌟 INCREDIBLE! 🌟';
                    celebrationEmoji.style.color = 'magenta';
                    celebrationEmoji.style.fontSize = '2.2rem';
                    celebrationEmoji.style.fontWeight = 'bold';
                    celebrationEmoji.style.textShadow = '3px 3px 6px rgba(0,0,0,0.7)';
                    celebrationEmoji.style.animation = 'bounce 0.5s infinite';
                    celebrationEmoji.style.background = 'none';
                    celebrationEmoji.style.padding = '0';
                    celebrationEmoji.style.borderRadius = '0';
                    celebrationEmoji.classList.remove('hidden');
                    console.log('SHOWING SUPER CELEBRATION');
                }
            } else if (this.currentStreak >= 3) {
                // Streak celebration for 3-4 correct answers
                console.log('Adding panda-streak class, streak:', this.currentStreak);
                pandaMascot.classList.add('panda-streak');
                if (celebrationEmoji) {
                    celebrationEmoji.textContent = '🎉 AMAZING! 🎉';
                    celebrationEmoji.style.color = 'gold';
                    celebrationEmoji.style.fontSize = '2rem';
                    celebrationEmoji.style.fontWeight = 'bold';
                    celebrationEmoji.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
                    celebrationEmoji.style.animation = 'bounce 1s infinite';
                    celebrationEmoji.style.background = 'none';
                    celebrationEmoji.style.padding = '0';
                    celebrationEmoji.style.borderRadius = '0';
                    celebrationEmoji.classList.remove('hidden');
                    console.log('SHOWING STREAK CELEBRATION');
                }
            } else {
                // Normal happy reaction for 1-2 correct answers
                console.log('Adding panda-happy class, streak:', this.currentStreak);
                pandaMascot.classList.add('panda-happy');
            }
        } else {
            console.log('Adding panda-sad class, resetting streak');
            pandaMascot.classList.add('panda-sad');
        }
        
        // Reset to neutral after reaction completes
        const resetDelay = 2000;
        
        this.pandaReactionTimeout = setTimeout(() => {
            this.resetPandaState();
        }, resetDelay);
    }
    
    /**
     * Reset panda to neutral state
     */
    resetPandaState() {
        const pandaMascot = document.getElementById('panda-mascot');
        const celebrationEmoji = document.getElementById('celebration-emoji');
        if (!pandaMascot) return;
        
        // Clear any pending timeout
        if (this.pandaReactionTimeout) {
            clearTimeout(this.pandaReactionTimeout);
            this.pandaReactionTimeout = null;
        }
        
        // Hide celebration emoji
        if (celebrationEmoji) {
            celebrationEmoji.classList.add('hidden');
            celebrationEmoji.style.animation = '';
        }
        
        // Remove all state classes and set to neutral
        pandaMascot.classList.remove(
            'panda-happy', 'panda-sad', 'panda-streak', 'panda-super-streak'
        );
        pandaMascot.classList.add('panda-neutral');
    }
    
    /**
     * Force pink theme for iPhone compatibility
     */
    forcePinkTheme() {
        // Set body background immediately - MORE PINK!
        document.body.style.backgroundColor = '#F8BBD9';
        document.body.style.background = '#F8BBD9';
        document.body.style.setProperty('background-color', '#F8BBD9', 'important');
        
        // Apply to document root as well
        document.documentElement.style.setProperty('--bg-primary', '#F8BBD9');
        document.documentElement.style.setProperty('--bg-header', '#F06292');
        document.documentElement.style.setProperty('--bg-card', '#FFFFFF');
        document.documentElement.style.setProperty('--primary-color', '#E91E63');
        document.documentElement.style.setProperty('--text-primary', '#2E2E2E');
        document.documentElement.style.setProperty('--text-secondary', '#4A1A4A');
        document.documentElement.style.setProperty('--border-color', '#E91E63');
        
        console.log('Forced MORE PINK theme for mobile compatibility');
    }

    /**
     * Handle color picker change
     */
    handleColorChange(event) {
        const color = event.target.value;
        this.applyDynamicTheme(color);
    }

    /**
     * Toggle white theme
     */
    toggleWhiteTheme() {
        this.applyDynamicTheme('#FFFFFF');
    }

    /**
     * Apply dynamic theme with generated color palette
     */
    applyDynamicTheme(baseColor) {
        const palette = this.generateColorPalette(baseColor);
        
        // Apply colors to CSS variables
        document.documentElement.style.setProperty('--bg-primary', palette.background);
        document.documentElement.style.setProperty('--bg-header', palette.header);
        document.documentElement.style.setProperty('--primary-color', palette.primary);
        document.documentElement.style.setProperty('--primary-hover', palette.primaryHover);
        document.documentElement.style.setProperty('--accent-light', palette.accent);
        document.documentElement.style.setProperty('--accent-lighter', palette.accentLight);
        
        // Force body background for mobile compatibility
        document.body.style.backgroundColor = palette.background;
        document.body.style.background = palette.background;
        document.body.style.setProperty('background-color', palette.background, 'important');
        
        console.log('Applied dynamic theme with base color:', baseColor);
    }

    /**
     * Generate color palette from base color
     */
    generateColorPalette(baseColor) {
        const hsl = this.hexToHsl(baseColor);
        
        // Generate different shades
        const background = this.hslToHex(hsl.h, Math.max(10, hsl.s * 0.3), Math.max(85, hsl.l));
        const header = this.hslToHex(hsl.h, Math.max(20, hsl.s * 0.7), Math.max(70, hsl.l * 0.8));
        const primary = this.hslToHex(hsl.h, Math.max(30, hsl.s * 0.9), Math.max(50, hsl.l * 0.6));
        const primaryHover = this.hslToHex(hsl.h, Math.max(30, hsl.s * 0.9), Math.max(40, hsl.l * 0.5));
        const accent = this.hslToHex(hsl.h, Math.max(25, hsl.s * 0.6), Math.max(65, hsl.l * 0.75));
        const accentLight = this.hslToHex(hsl.h, Math.max(15, hsl.s * 0.4), Math.max(80, hsl.l * 0.9));
        
        return {
            background,
            header,
            primary,
            primaryHover,
            accent,
            accentLight
        };
    }

    /**
     * Convert hex to HSL
     */
    hexToHsl(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    /**
     * Convert HSL to hex
     */
    hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
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