// Data Models and Sample Data
class LocalizedText {
    constructor(original, translation, transliteration = null) {
        this.original = original;
        this.translation = translation;
        this.transliteration = transliteration;
    }
}

class Word {
    constructor(id, text, language, translation, transliteration = null) {
        this.id = id;
        this.text = text;
        this.language = language;
        this.translation = translation;
        this.transliteration = transliteration;
        this.lastStudied = null;
        this.nextReview = new Date();
        this.performance = 0;
        this.timesStudied = 0;
    }
}

class Exercise {
    constructor(type, question, options, correctAnswer) {
        this.type = type;
        this.question = question;
        this.options = options;
        this.correctAnswer = correctAnswer;
    }
}

class WordContent {
    constructor(wordId, examples, grammar, exercises) {
        this.wordId = wordId;
        this.examples = examples;
        this.grammar = grammar;
        this.exercises = exercises;
    }
}

class StudySession {
    constructor() {
        this.wordsStudied = 0;
        this.target = 10;
        this.currentLanguage = null;
    }
}

// Sample Data
const sampleWords = {
    bulgarian: [
        new Word('bg_1', 'обичам', 'bulgarian', 'to love', 'obicham'),
        new Word('bg_2', 'къща', 'bulgarian', 'house', 'kashta'),
        new Word('bg_3', 'красив', 'bulgarian', 'beautiful', 'krasiv'),
        new Word('bg_4', 'бързо', 'bulgarian', 'quickly', 'barzo'),
        new Word('bg_5', 'вода', 'bulgarian', 'water', 'voda'),
    ],
    hungarian: [
        new Word('hu_1', 'szeret', 'hungarian', 'to love'),
        new Word('hu_2', 'ház', 'hungarian', 'house'),
        new Word('hu_3', 'szép', 'hungarian', 'beautiful'),
        new Word('hu_4', 'gyorsan', 'hungarian', 'quickly'),
        new Word('hu_5', 'víz', 'hungarian', 'water'),
    ]
};

// Sample template files to cycle through
const sampleTemplates = [
    'bg-verb-sample.json',
    'bg-noun-sample.json', 
    'bg-adjective-sample.json',
    'bg-adverb-sample.json'
];

let currentTemplateIndex = 0;
let loadedSampleContent = {};

// Application State
const appState = {
    session: new StudySession(),
    currentWord: null,
    currentContent: null,
    currentExerciseIndex: 0,
    exercisesCompleted: false
};

// DOM Elements
const elements = {
    languageSelection: document.getElementById('language-selection'),
    wordContent: document.getElementById('word-content'),
    loading: document.getElementById('loading'),
    errorContainer: document.getElementById('error-container'),
    progress: document.getElementById('progress'),
    currentLanguage: document.getElementById('current-language'),
    wordMain: document.getElementById('word-main'),
    wordTransliteration: document.getElementById('word-transliteration'),
    wordTranslation: document.getElementById('word-translation'),
    examplesContainer: document.getElementById('examples-container'),
    grammarType: document.getElementById('grammar-type'),
    grammarDetails: document.getElementById('grammar-details'),
    exercisesContainer: document.getElementById('exercises-container'),
    ratingSection: document.getElementById('rating-section'),
    nextWordBtn: document.getElementById('next-word-btn')
};

// Utility Functions
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function showElement(element) {
    element.classList.remove('hidden');
}

function hideElement(element) {
    element.classList.add('hidden');
}

function showError(message) {
    elements.errorContainer.innerHTML = `<div class="error">${message}</div>`;
}

function clearError() {
    elements.errorContainer.innerHTML = '';
}

// Rendering Functions
function renderLocalizedText(localizedText) {
    const parts = [];
    parts.push(`<span class="original">${localizedText.original}</span>`);
    if (localizedText.transliteration) {
        parts.push(`<span class="transliteration">(${localizedText.transliteration})</span>`);
    }
    parts.push(`<span class="translation">${localizedText.translation}</span>`);
    return parts.join(' ');
}

function renderWord(word) {
    elements.wordMain.textContent = word.text;
    elements.wordTransliteration.textContent = word.transliteration || '';
    elements.wordTranslation.textContent = word.translation;
    
    if (!word.transliteration) {
        hideElement(elements.wordTransliteration);
    } else {
        showElement(elements.wordTransliteration);
    }
}

function renderExamples(examples) {
    const html = examples.map(example => `
        <div class="example">
            <div class="example-original">${example.original}</div>
            ${example.transliteration ? `<div class="example-transliteration">${example.transliteration}</div>` : ''}
            <div class="example-translation">${example.translation}</div>
        </div>
    `).join('');
    
    elements.examplesContainer.innerHTML = html;
}

function renderGrammar(grammar) {
    elements.grammarType.textContent = grammar.wordType;
    
    let html = '';
    
    if (grammar.wordType === 'verb' && grammar.details.conjugations) {
        html = Object.entries(grammar.details.conjugations).map(([tense, conjugations]) => `
            <div class="tense-section">
                <div class="tense-title">${tense}</div>
                <table class="grammar-table">
                    <thead>
                        <tr>
                            <th>Singular</th>
                            <th>Plural</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <div class="form-item">${conjugations.I.original}</div>
                                <div class="transliteration">${conjugations.I.transliteration || ''}</div>
                                <div class="translation">${conjugations.I.translation}</div>
                            </td>
                            <td>
                                <div class="form-item">${conjugations.we.original}</div>
                                <div class="transliteration">${conjugations.we.transliteration || ''}</div>
                                <div class="translation">${conjugations.we.translation}</div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <div class="form-item">${conjugations.you.original}</div>
                                <div class="transliteration">${conjugations.you.transliteration || ''}</div>
                                <div class="translation">${conjugations.you.translation}</div>
                            </td>
                            <td>
                                <div class="form-item">${conjugations.you_plural ? conjugations.you_plural.original : conjugations.they.original}</div>
                                <div class="transliteration">${conjugations.you_plural ? (conjugations.you_plural.transliteration || '') : (conjugations.they.transliteration || '')}</div>
                                <div class="translation">${conjugations.you_plural ? conjugations.you_plural.translation : conjugations.they.translation}</div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <div class="form-item">${conjugations.he.original}</div>
                                <div class="transliteration">${conjugations.he.transliteration || ''}</div>
                                <div class="translation">${conjugations.he.translation}</div>
                            </td>
                            <td rowspan="3">
                                <div class="form-item">${conjugations.they.original}</div>
                                <div class="transliteration">${conjugations.they.transliteration || ''}</div>
                                <div class="translation">${conjugations.they.translation}</div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <div class="form-item">${conjugations.she.original}</div>
                                <div class="transliteration">${conjugations.she.transliteration || ''}</div>
                                <div class="translation">${conjugations.she.translation}</div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <div class="form-item">${conjugations.it.original}</div>
                                <div class="transliteration">${conjugations.it.transliteration || ''}</div>
                                <div class="translation">${conjugations.it.translation}</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `).join('');
    } else if (grammar.wordType === 'noun' && grammar.details) {
        html = `
            <div class="conjugation-table">
                <div class="conjugation-label">Gender</div>
                <div class="conjugation-value">${grammar.details.gender}</div>
                <div class="conjugation-label">Indefinite</div>
                <div class="conjugation-value">${renderLocalizedText(grammar.details.articles.indefinite)}</div>
                <div class="conjugation-label">Definite</div>
                <div class="conjugation-value">${renderLocalizedText(grammar.details.articles.definite)}</div>
                <div class="conjugation-label">Plural</div>
                <div class="conjugation-value">${renderLocalizedText(grammar.details.plural)}</div>
                <div class="conjugation-label">Plural Definite</div>
                <div class="conjugation-value">${renderLocalizedText(grammar.details.definite_plural)}</div>
            </div>
        `;
    } else if (grammar.wordType === 'adjective' && grammar.details.genderForms) {
        html = `
            <table class="grammar-table">
                <thead>
                    <tr>
                        <th>Gender</th>
                        <th>Indefinite</th>
                        <th>Definite</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(grammar.details.genderForms).map(([gender, locText]) => `
                        <tr>
                            <td class="pronoun">${gender}</td>
                            <td>${renderLocalizedText(locText)}</td>
                            <td>${grammar.details.definiteForms && grammar.details.definiteForms[gender] 
                                ? renderLocalizedText(grammar.details.definiteForms[gender]) 
                                : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else if (grammar.wordType === 'adverb' && grammar.details) {
        html = `
            <div class="conjugation-table">
                <div class="conjugation-label">Usage</div>
                <div class="conjugation-value">${renderLocalizedText(grammar.details.usage)}</div>
                ${grammar.details.comparative ? `
                    <div class="conjugation-label">Comparative</div>
                    <div class="conjugation-value">${renderLocalizedText(grammar.details.comparative)}</div>
                ` : ''}
                ${grammar.details.superlative ? `
                    <div class="conjugation-label">Superlative</div>
                    <div class="conjugation-value">${renderLocalizedText(grammar.details.superlative)}</div>
                ` : ''}
            </div>
        `;
    }
    
    elements.grammarDetails.innerHTML = html;
}

function renderExercise(exercise, index) {
    const exerciseDiv = document.createElement('div');
    exerciseDiv.className = 'exercise';
    exerciseDiv.dataset.exerciseIndex = index;
    
    if (exercise.type === 'sentence_order') {
        // Split the correct answer into individual words for scrambling
        const words = exercise.correctAnswer.split(' ');
        
        // Create word objects with transliterations by matching with options
        const wordObjects = words.map(word => {
            const matchingOption = exercise.options.find(option => option.original === word);
            return {
                original: word,
                transliteration: matchingOption?.transliteration || null,
                translation: matchingOption?.translation || null
            };
        });
        
        const scrambledWords = shuffleArray([...wordObjects]);
        
        // Create transliteration for the target sentence
        const targetTransliteration = wordObjects.map(wordObj => wordObj.transliteration).filter(t => t).join(' ');
        
        exerciseDiv.innerHTML = `
            <div class="exercise-type">${exercise.type.replace('_', ' ')}</div>
            <div class="exercise-question">
                <div class="question-instruction">Arrange the words to form the correct sentence:</div>
                <div class="question-translation">"${exercise.question.translation}"</div>
            </div>
            <div class="target-sentence">
                <div class="target-sentence-label">Target sentence:</div>
                <div class="target-sentence-content">
                    <div class="target-english">${exercise.question.translation}</div>
                </div>
            </div>
            <div class="word-order-container">
                <div class="word-bank">
                    <div class="word-bank-label">Available words:</div>
                    <div class="word-bank-items">
                        ${scrambledWords.map((wordObj, wordIndex) => `
                            <div class="word-item" data-word-index="${wordIndex}" data-word-text="${wordObj.original}">
                                <div class="word-original">${wordObj.original}</div>
                                ${wordObj.transliteration ? `<div class="word-transliteration">${wordObj.transliteration}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="sentence-construction">
                    <div class="sentence-construction-label">Your sentence:</div>
                    <div class="drop-zone">
                        <div class="drop-zone-placeholder">Drag words here to build the sentence</div>
                    </div>
                </div>
                <div class="word-order-actions">
                    <button class="btn reset-btn">Reset</button>
                    <button class="btn submit-btn" disabled>Submit</button>
                </div>
            </div>
        `;
        
        // Add word ordering functionality
        setupWordOrderExercise(exerciseDiv, exercise, index);
    } else {
        exerciseDiv.innerHTML = `
            <div class="exercise-type">${exercise.type.replace('_', ' ')}</div>
            <div class="exercise-question">
                <div class="question-original">${exercise.question.original}</div>
                ${exercise.question.transliteration ? `<div class="question-transliteration">${exercise.question.transliteration}</div>` : ''}
                <div class="question-translation">${exercise.question.translation}</div>
            </div>
            <div class="exercise-options">
                ${exercise.options.map((option, optionIndex) => `
                    <div class="exercise-option" data-option-index="${optionIndex}">
                        <div class="option-original">${option.original}</div>
                        ${option.transliteration ? `<div class="option-transliteration">${option.transliteration}</div>` : ''}
                        <div class="option-translation">${option.translation}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add click handlers for regular options
        const options = exerciseDiv.querySelectorAll('.exercise-option');
        options.forEach((option, optionIndex) => {
            option.addEventListener('click', () => handleOptionClick(index, optionIndex, exercise));
        });
    }
    
    return exerciseDiv;
}

function renderExercises(exercises) {
    elements.exercisesContainer.innerHTML = '';
    exercises.forEach((exercise, index) => {
        const exerciseElement = renderExercise(exercise, index);
        elements.exercisesContainer.appendChild(exerciseElement);
    });
}

// Word Order Exercise Setup
function setupWordOrderExercise(exerciseDiv, exercise, exerciseIndex) {
    const wordBankItems = exerciseDiv.querySelector('.word-bank-items');
    const dropZone = exerciseDiv.querySelector('.drop-zone');
    const resetBtn = exerciseDiv.querySelector('.reset-btn');
    const submitBtn = exerciseDiv.querySelector('.submit-btn');
    const placeholder = exerciseDiv.querySelector('.drop-zone-placeholder');
    
    let draggedElement = null;
    let orderedWords = [];
    
    // Make word items draggable
    const wordItems = wordBankItems.querySelectorAll('.word-item');
    wordItems.forEach(item => {
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
            draggedElement = e.target;
            e.target.style.opacity = '0.5';
        });
        
        item.addEventListener('dragend', (e) => {
            e.target.style.opacity = '';
            draggedElement = null;
        });
        
        item.addEventListener('click', () => {
            if (!item.classList.contains('used')) {
                moveWordToSentence(item);
            }
        });
    });
    
    // Setup drop zone
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (draggedElement && !draggedElement.classList.contains('used')) {
            moveWordToSentence(draggedElement);
        }
    });
    
    function moveWordToSentence(wordItem) {
        const wordText = wordItem.dataset.wordText;
        const wordIndex = parseInt(wordItem.dataset.wordIndex);
        const wordOriginal = wordItem.querySelector('.word-original')?.textContent || wordText;
        const wordTransliteration = wordItem.querySelector('.word-transliteration')?.textContent;
        
        // Create placed word element
        const placedWord = document.createElement('div');
        placedWord.className = 'placed-word';
        placedWord.dataset.wordText = wordText;
        placedWord.dataset.originalIndex = wordIndex;
        
        // Add word content with transliteration
        placedWord.innerHTML = `
            <div class="placed-word-original">${wordOriginal}</div>
            ${wordTransliteration ? `<div class="placed-word-transliteration">${wordTransliteration}</div>` : ''}
        `;
        
        // Add remove functionality
        placedWord.addEventListener('click', () => {
            removeWordFromSentence(placedWord, wordItem);
        });
        
        // Hide placeholder if this is the first word
        if (orderedWords.length === 0) {
            placeholder.style.display = 'none';
        }
        
        // Add to sentence
        dropZone.appendChild(placedWord);
        wordItem.classList.add('used');
        
        // Track ordered words
        orderedWords.push({
            element: placedWord,
            originalIndex: wordIndex,
            text: wordText
        });
        
        updateSubmitButton();
    }
    
    function removeWordFromSentence(placedWord, originalWordItem) {
        const index = orderedWords.findIndex(word => word.element === placedWord);
        if (index > -1) {
            orderedWords.splice(index, 1);
            placedWord.remove();
            originalWordItem.classList.remove('used');
            
            // Show placeholder if no words left
            if (orderedWords.length === 0) {
                placeholder.style.display = 'block';
            }
            
            updateSubmitButton();
        }
    }
    
    function updateSubmitButton() {
        const correctAnswer = exercise.correctAnswer.split(' ');
        submitBtn.disabled = orderedWords.length !== correctAnswer.length;
    }
    
    // Reset functionality
    resetBtn.addEventListener('click', () => {
        // Remove all placed words and restore original words
        orderedWords.forEach(word => {
            word.element.remove();
            const originalWord = wordBankItems.querySelector(`[data-word-index="${word.originalIndex}"]`);
            if (originalWord) {
                originalWord.classList.remove('used');
            }
        });
        orderedWords = [];
        placeholder.style.display = 'block';
        updateSubmitButton();
        
        // Remove any previous feedback
        exerciseDiv.querySelectorAll('.exercise-feedback').forEach(el => el.remove());
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submit';
        exerciseDiv.dataset.answered = 'false';
    });
    
    // Submit functionality
    submitBtn.addEventListener('click', () => {
        if (exerciseDiv.dataset.answered === 'true') return;
        
        const userAnswer = orderedWords.map(word => word.text).join(' ');
        const isCorrect = userAnswer === exercise.correctAnswer;
        
        // Mark as answered
        exerciseDiv.dataset.answered = 'true';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitted';
        
        // Show feedback
        const feedback = document.createElement('div');
        feedback.className = `exercise-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        feedback.innerHTML = `
            <div class="feedback-text">
                ${isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </div>
            <div class="feedback-answer">
                <strong>Your sentence:</strong> "${userAnswer}"<br>
                <strong>Correct sentence:</strong> "${exercise.correctAnswer}"
            </div>
        `;
        
        exerciseDiv.appendChild(feedback);
        
        // Record answer
        if (!appState.currentAnswers) {
            appState.currentAnswers = [];
        }
        appState.currentAnswers[exerciseIndex] = isCorrect;
        
        // Emit exercise completion event
        emitExerciseCompletionEvent(exerciseIndex, exercise.type, isCorrect);
        
        // Check if this completes all exercises
        checkAllExercisesCompleted();
    });
}

// Event Emission
function emitExerciseCompletionEvent(exerciseIndex, exerciseType, isCorrect) {
    const event = new CustomEvent('exerciseCompleted', {
        detail: {
            exerciseIndex,
            exerciseType,
            isCorrect,
            timestamp: new Date().toISOString(),
            wordId: appState.currentWord?.id,
            language: appState.session.currentLanguage
        }
    });
    
    document.dispatchEvent(event);
    console.log('Exercise completed:', event.detail);
}

// Exercise Handling
function handleOptionClick(exerciseIndex, optionIndex, exercise) {
    const exerciseDiv = document.querySelector(`[data-exercise-index="${exerciseIndex}"]`);
    const options = exerciseDiv.querySelectorAll('.exercise-option');
    const selectedOption = options[optionIndex];
    
    // Skip if already answered
    if (exerciseDiv.dataset.answered === 'true') {
        return;
    }
    
    // Mark as answered
    exerciseDiv.dataset.answered = 'true';
    
    // Check if correct
    const selectedText = selectedOption.querySelector('.option-original').textContent;
    const isCorrect = selectedText === exercise.correctAnswer || 
                     selectedOption.querySelector('.option-translation').textContent === exercise.correctAnswer;
    
    // Mark selected option
    selectedOption.classList.add('selected');
    
    // Show correct/incorrect feedback
    options.forEach((option, idx) => {
        const optionText = option.querySelector('.option-original').textContent;
        const optionTranslation = option.querySelector('.option-translation').textContent;
        
        if (optionText === exercise.correctAnswer || optionTranslation === exercise.correctAnswer) {
            option.classList.add('correct');
        } else if (idx === optionIndex && !isCorrect) {
            option.classList.add('incorrect');
        }
    });
    
    // Record answer
    if (!appState.currentAnswers) {
        appState.currentAnswers = [];
    }
    appState.currentAnswers[exerciseIndex] = isCorrect;
    
    // Emit exercise completion event
    emitExerciseCompletionEvent(exerciseIndex, exercise.type, isCorrect);
    
    // Check if this completes all exercises
    checkAllExercisesCompleted();
}

function checkAllExercisesCompleted() {
    const allExercises = document.querySelectorAll('.exercise');
    const completedExercises = document.querySelectorAll('.exercise .exercise-option.selected');
    
    if (completedExercises.length === allExercises.length) {
        appState.exercisesCompleted = true;
        showElement(elements.ratingSection);
    }
}

// Language Selection
function handleLanguageSelection(language) {
    appState.session.currentLanguage = language;
    elements.currentLanguage.textContent = language;
    
    // Update UI
    document.querySelectorAll('.language-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelector(`[data-language="${language}"]`).classList.add('selected');
    
    hideElement(elements.languageSelection);
    loadNextWord();
}

// Word Loading
function getNextTemplateWord() {
    // Cycle through sample templates for Bulgarian
    if (appState.session.currentLanguage === 'bulgarian') {
        const templateFile = sampleTemplates[currentTemplateIndex];
        currentTemplateIndex = (currentTemplateIndex + 1) % sampleTemplates.length;
        return templateFile;
    }
    // For Hungarian, use first word for now
    const words = sampleWords['hungarian'];
    return words[0];
}

async function loadSampleTemplate(templateFile) {
    try {
        const response = await fetch(templateFile);
        if (!response.ok) {
            throw new Error(`Failed to load ${templateFile}`);
        }
        const data = await response.json();
        
        // Convert to our data structure
        const examples = data.examples.map(ex => new LocalizedText(ex.original, ex.translation, ex.transliteration));
        
        const exercises = data.exercises.map(ex => new Exercise(
            ex.type,
            new LocalizedText(ex.question.original, ex.question.translation, ex.question.transliteration),
            ex.options.map(opt => new LocalizedText(opt.original, opt.translation, opt.transliteration)),
            ex.correctAnswer
        ));
        
        const word = new Word(data.wordId, data.word, 'bulgarian', data.translation, data.transliteration);
        const content = new WordContent(data.wordId, examples, data.grammar, exercises);
        
        return { word, content };
    } catch (error) {
        console.error('Error loading template:', error);
        throw error;
    }
}

async function loadNextWord() {
    try {
        showElement(elements.loading);
        hideElement(elements.wordContent);
        hideElement(elements.ratingSection);
        hideElement(elements.nextWordBtn);
        clearError();
        
        if (appState.session.currentLanguage === 'bulgarian') {
            // Load from template files
            const templateFile = getNextTemplateWord();
            const { word, content } = await loadSampleTemplate(templateFile);
            appState.currentWord = word;
            appState.currentContent = content;
        } else {
            // For Hungarian, use simple fallback for now
            const word = getNextTemplateWord();
            appState.currentWord = word;
            // Create minimal content for Hungarian
            appState.currentContent = new WordContent(
                word.id,
                [new LocalizedText(word.text, word.translation)],
                { wordType: 'unknown', details: {} },
                []
            );
        }
        
        // Render content
        renderWord(appState.currentWord);
        renderExamples(appState.currentContent.examples);
        renderGrammar(appState.currentContent.grammar);
        renderExercises(appState.currentContent.exercises);
        
        // Reset state
        appState.exercisesCompleted = false;
        appState.currentAnswers = [];
        
        hideElement(elements.loading);
        showElement(elements.wordContent);
        
    } catch (error) {
        hideElement(elements.loading);
        showError('Failed to load word: ' + error.message);
    }
}

// Rating and Progress
function handleRating(rating) {
    // Update session progress
    appState.session.wordsStudied++;
    elements.progress.textContent = `${appState.session.wordsStudied}/${appState.session.target}`;
    
    // Show next word button or complete session
    if (appState.session.wordsStudied >= appState.session.target) {
        showError('Session completed! Great job!');
        hideElement(elements.nextWordBtn);
    } else {
        showElement(elements.nextWordBtn);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Language selection
    document.querySelectorAll('.language-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            handleLanguageSelection(e.target.dataset.language);
        });
    });
    
    // Rating buttons
    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            handleRating(e.target.dataset.rating);
        });
    });
    
    // Next word button
    elements.nextWordBtn.addEventListener('click', () => {
        loadNextWord();
    });
    
    // Exercise completion event listener for validation
    document.addEventListener('exerciseCompleted', (event) => {
        console.log('🎯 EXERCISE COMPLETED EVENT RECEIVED:');
        console.log('├── Exercise Index:', event.detail.exerciseIndex);
        console.log('├── Exercise Type:', event.detail.exerciseType);
        console.log('├── Is Correct:', event.detail.isCorrect ? '✅ CORRECT' : '❌ INCORRECT');
        console.log('├── Timestamp:', event.detail.timestamp);
        console.log('├── Word ID:', event.detail.wordId);
        console.log('├── Language:', event.detail.language);
        console.log('└── Full Event Detail:', event.detail);
        console.log('---');
    });
    
    // Initialize progress display
    elements.progress.textContent = `${appState.session.wordsStudied}/${appState.session.target}`;
});