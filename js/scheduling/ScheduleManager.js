/**
 * ScheduleManager handles daily queue generation and learning schedules
 */
import { SpacedRepetition } from '../algorithms/SpacedRepetition.js';
import { UserProgress } from '../models/UserProgress.js';

export class ScheduleManager {
    /**
     * Create a new ScheduleManager instance
     * @param {StorageManager} storageManager - Storage manager instance
     * @param {DatabaseLoader} databaseLoader - Database loader instance
     */
    constructor(storageManager, databaseLoader) {
        this.storage = storageManager;
        this.database = databaseLoader;
        this.algorithm = new SpacedRepetition();
        this.currentQueue = [];
        this.completedToday = [];
        this.sessionInProgress = false;
    }

    /**
     * Generate daily learning queue
     * @param {string} learningPath - Learning path (e.g., 'en-hu')
     * @param {number} targetCount - Target number of cards
     * @param {Date} currentDate - Current date
     * @returns {Promise<Object>} Daily queue with metadata
     */
    async generateDailyQueue(learningPath, targetCount = 50, currentDate = new Date()) {
        try {
            // Load user progress for this learning path
            const allProgress = await this.loadProgressForPath(learningPath);
            
            // Load available words for the learning path
            const [sourceLang, targetLang] = learningPath.split('-');
            const availableWords = await this.database.getWordsForLearningPath(sourceLang, targetLang);
            
            // Generate queue using spaced repetition algorithm
            const queueData = this.algorithm.generateDailyQueue(
                allProgress, 
                availableWords, 
                targetCount, 
                currentDate
            );
            
            // Save queue for the day
            await this.saveDailyQueue(learningPath, queueData, currentDate);
            
            this.currentQueue = queueData.cards;
            this.sessionInProgress = false;
            
            return {
                ...queueData,
                learningPath,
                generatedAt: currentDate.toISOString(),
                isCompleted: false
            };
            
        } catch (error) {
            console.error('Failed to generate daily queue:', error);
            throw new Error(`Failed to generate daily queue: ${error.message}`);
        }
    }

    /**
     * Load user progress for a specific learning path
     * @param {string} learningPath - Learning path
     * @returns {Promise<UserProgress[]>} Array of progress records
     */
    async loadProgressForPath(learningPath) {
        const progressData = this.storage.getItem(`progress_${learningPath}`, []);
        return progressData.map(data => UserProgress.fromJSON(data));
    }

    /**
     * Save user progress for a specific learning path
     * @param {string} learningPath - Learning path
     * @param {UserProgress[]} progressArray - Array of progress records
     * @returns {Promise<boolean>} True if saved successfully
     */
    async saveProgressForPath(learningPath, progressArray) {
        const progressData = progressArray.map(progress => progress.toJSON());
        return this.storage.setItem(`progress_${learningPath}`, progressData);
    }

    /**
     * Save daily queue data
     * @param {string} learningPath - Learning path
     * @param {Object} queueData - Queue data
     * @param {Date} date - Date for the queue
     * @returns {Promise<boolean>} True if saved successfully
     */
    async saveDailyQueue(learningPath, queueData, date) {
        const dateKey = this.getDateKey(date);
        const queueKey = `queue_${learningPath}_${dateKey}`;
        
        const queueRecord = {
            learningPath,
            date: date.toISOString(),
            dateKey,
            ...queueData,
            createdAt: new Date().toISOString(),
            completedCards: [],
            isCompleted: false
        };
        
        return this.storage.setItem(queueKey, queueRecord);
    }

    /**
     * Load daily queue for a specific date
     * @param {string} learningPath - Learning path
     * @param {Date} date - Date to load
     * @returns {Promise<Object|null>} Queue data or null
     */
    async loadDailyQueue(learningPath, date = new Date()) {
        const dateKey = this.getDateKey(date);
        const queueKey = `queue_${learningPath}_${dateKey}`;
        return this.storage.getItem(queueKey, null);
    }

    /**
     * Get today's queue or generate if doesn't exist
     * @param {string} learningPath - Learning path
     * @param {number} targetCount - Target number of cards
     * @returns {Promise<Object>} Today's queue
     */
    async getTodaysQueue(learningPath, targetCount = 50) {
        const today = new Date();
        let todaysQueue = await this.loadDailyQueue(learningPath, today);
        
        if (!todaysQueue) {
            todaysQueue = await this.generateDailyQueue(learningPath, targetCount, today);
        } else {
            // Reconstruct progress objects from saved data
            todaysQueue.cards = todaysQueue.cards.map(cardData => 
                UserProgress.fromJSON(cardData)
            );
            this.currentQueue = todaysQueue.cards;
            this.completedToday = todaysQueue.completedCards || [];
        }
        
        return todaysQueue;
    }

    /**
     * Start a learning session
     * @param {string} learningPath - Learning path
     * @param {number} targetCount - Target number of cards
     * @returns {Promise<Object>} Session data
     */
    async startSession(learningPath, targetCount = 50) {
        const queue = await this.getTodaysQueue(learningPath, targetCount);
        
        this.sessionInProgress = true;
        
        // Filter out already completed cards
        const remainingCards = queue.cards.filter(card => 
            !this.completedToday.some(completed => 
                completed.wordId === card.wordId
            )
        );
        
        return {
            learningPath,
            totalCards: queue.totalCards,
            remainingCards: remainingCards.length,
            completedCards: this.completedToday.length,
            cards: remainingCards,
            metadata: queue.metadata,
            sessionId: this.generateSessionId(),
            startedAt: new Date().toISOString()
        };
    }

    /**
     * Complete a card in the current session
     * @param {string} wordId - Word ID
     * @param {boolean} wasCorrect - Whether answer was correct
     * @param {number} reviewTimeMs - Time spent on review
     * @param {string} learningPath - Learning path
     * @returns {Promise<Object>} Completion result
     */
    async completeCard(wordId, wasCorrect, reviewTimeMs = 0, learningPath) {
        try {
            // Find the card in current queue
            const cardIndex = this.currentQueue.findIndex(card => card.wordId === wordId);
            if (cardIndex === -1) {
                throw new Error(`Card ${wordId} not found in current queue`);
            }
            
            const progress = this.currentQueue[cardIndex];
            
            // Update progress using spaced repetition algorithm
            this.algorithm.updateProgress(progress, wasCorrect, reviewTimeMs);
            
            // Add to completed cards
            const completedCard = {
                wordId,
                wasCorrect,
                reviewTimeMs,
                completedAt: new Date().toISOString(),
                bucketLevel: progress.bucketLevel,
                nextReview: progress.nextReview
            };
            
            this.completedToday.push(completedCard);
            
            // Save updated progress
            const allProgress = await this.loadProgressForPath(learningPath);
            const existingIndex = allProgress.findIndex(p => p.wordId === wordId);
            
            if (existingIndex >= 0) {
                allProgress[existingIndex] = progress;
            } else {
                allProgress.push(progress);
            }
            
            await this.saveProgressForPath(learningPath, allProgress);
            
            // Update daily queue with completion
            await this.updateDailyQueueCompletion(learningPath, completedCard);
            
            const remainingCards = this.currentQueue.length - this.completedToday.length;
            const isSessionComplete = remainingCards === 0;
            
            return {
                success: true,
                cardCompleted: completedCard,
                remainingCards,
                completedCount: this.completedToday.length,
                totalCards: this.currentQueue.length,
                isSessionComplete,
                nextCard: isSessionComplete ? null : this.getNextCard()
            };
            
        } catch (error) {
            console.error('Failed to complete card:', error);
            return {
                success: false,
                error: error.message,
                remainingCards: this.currentQueue.length - this.completedToday.length
            };
        }
    }

    /**
     * Get the next card to review
     * @returns {Object|null} Next card data or null if session complete
     */
    getNextCard() {
        const completedWordIds = new Set(this.completedToday.map(c => c.wordId));
        const nextCard = this.currentQueue.find(card => !completedWordIds.has(card.wordId));
        return nextCard || null;
    }

    /**
     * Update daily queue with completion data
     * @param {string} learningPath - Learning path
     * @param {Object} completedCard - Completed card data
     * @returns {Promise<boolean>} True if updated successfully
     */
    async updateDailyQueueCompletion(learningPath, completedCard) {
        const today = new Date();
        const queue = await this.loadDailyQueue(learningPath, today);
        
        if (queue) {
            queue.completedCards = queue.completedCards || [];
            queue.completedCards.push(completedCard);
            queue.isCompleted = queue.completedCards.length >= queue.totalCards;
            queue.lastCompletedAt = new Date().toISOString();
            
            const dateKey = this.getDateKey(today);
            const queueKey = `queue_${learningPath}_${dateKey}`;
            return this.storage.setItem(queueKey, queue);
        }
        
        return false;
    }

    /**
     * Get session statistics
     * @param {string} learningPath - Learning path
     * @returns {Promise<Object>} Session statistics
     */
    async getSessionStatistics(learningPath) {
        const today = new Date();
        const queue = await this.loadDailyQueue(learningPath, today);
        
        if (!queue) {
            return {
                cardsCompleted: 0,
                totalCards: 0,
                successRate: 0,
                timeSpent: 0,
                isCompleted: false
            };
        }
        
        const completedCards = queue.completedCards || [];
        const correctCards = completedCards.filter(card => card.wasCorrect);
        const totalTime = completedCards.reduce((sum, card) => sum + (card.reviewTimeMs || 0), 0);
        
        return {
            cardsCompleted: completedCards.length,
            totalCards: queue.totalCards,
            successRate: completedCards.length > 0 ? 
                Math.round((correctCards.length / completedCards.length) * 100) : 0,
            timeSpent: totalTime,
            timeSpentFormatted: this.formatTime(Math.round(totalTime / 1000)),
            isCompleted: queue.isCompleted,
            startedAt: queue.createdAt,
            lastCompletedAt: queue.lastCompletedAt
        };
    }

    /**
     * Get learning streak
     * @param {string} learningPath - Learning path
     * @returns {Promise<number>} Current streak in days
     */
    async getLearningStreak(learningPath) {
        const today = new Date();
        let streak = 0;
        let currentDate = new Date(today);
        
        // Check backwards from today
        while (true) {
            const queue = await this.loadDailyQueue(learningPath, currentDate);
            if (queue && queue.isCompleted) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
            
            // Limit check to prevent infinite loop
            if (streak > 365) break;
        }
        
        return streak;
    }

    /**
     * Get upcoming reviews count
     * @param {string} learningPath - Learning path
     * @param {number} days - Number of days to look ahead
     * @returns {Promise<Object>} Upcoming reviews by date
     */
    async getUpcomingReviews(learningPath, days = 7) {
        const allProgress = await this.loadProgressForPath(learningPath);
        const upcoming = {};
        
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateKey = this.getDateKey(date);
            
            const dueCards = allProgress.filter(progress => {
                const reviewDate = new Date(progress.nextReview);
                return this.getDateKey(reviewDate) === dateKey;
            });
            
            upcoming[dateKey] = {
                date: date.toISOString(),
                count: dueCards.length,
                isToday: i === 0
            };
        }
        
        return upcoming;
    }

    /**
     * Generate session ID
     * @returns {string} Unique session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get date key for storage
     * @param {Date} date - Date object
     * @returns {string} Date key (YYYY-MM-DD format)
     */
    getDateKey(date) {
        return date.toISOString().split('T')[0];
    }

    /**
     * Format time in human readable format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time
     */
    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const minutes = Math.round(seconds / 60);
            return `${minutes}m`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.round((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }

    /**
     * Reset current session
     */
    resetSession() {
        this.currentQueue = [];
        this.completedToday = [];
        this.sessionInProgress = false;
    }

    /**
     * Get current session status
     * @returns {Object} Session status
     */
    getSessionStatus() {
        return {
            inProgress: this.sessionInProgress,
            totalCards: this.currentQueue.length,
            completedCount: this.completedToday.length,
            remainingCount: this.currentQueue.length - this.completedToday.length
        };
    }
}