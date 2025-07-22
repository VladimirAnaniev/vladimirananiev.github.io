/**
 * ProgressTracker handles recording user responses and calculating statistics
 */
import { UserProgress } from '../models/UserProgress.js';

export class ProgressTracker {
    /**
     * Create a new ProgressTracker instance
     * @param {StorageManager} storageManager - Storage manager instance
     */
    constructor(storageManager) {
        this.storage = storageManager;
        this.sessionStats = {
            startTime: null,
            endTime: null,
            cardsReviewed: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            totalReviewTime: 0,
            streakMaintained: false
        };
        this.cardTimers = new Map(); // Track timing per card
    }

    /**
     * Start tracking a learning session
     * @param {string} learningPath - Learning path
     * @param {number} totalCards - Total cards in session
     * @returns {string} Session ID
     */
    startSession(learningPath, totalCards) {
        const sessionId = this.generateSessionId();
        
        this.sessionStats = {
            sessionId,
            learningPath,
            totalCards,
            startTime: new Date().toISOString(),
            endTime: null,
            cardsReviewed: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            totalReviewTime: 0,
            averageTimePerCard: 0,
            successRate: 0,
            streakMaintained: false,
            cardResults: []
        };
        
        return sessionId;
    }

    /**
     * Start timing a card review
     * @param {string} wordId - Word ID being reviewed
     */
    startCardTimer(wordId) {
        this.cardTimers.set(wordId, {
            startTime: performance.now(),
            endTime: null
        });
    }

    /**
     * End timing a card review
     * @param {string} wordId - Word ID being reviewed
     * @returns {number} Review time in milliseconds
     */
    endCardTimer(wordId) {
        const timer = this.cardTimers.get(wordId);
        if (timer && !timer.endTime) {
            timer.endTime = performance.now();
            const reviewTime = timer.endTime - timer.startTime;
            this.cardTimers.delete(wordId); // Clean up
            return Math.round(reviewTime);
        }
        return 0;
    }

    /**
     * Record a card response
     * @param {string} wordId - Word ID
     * @param {boolean} wasCorrect - Whether answer was correct
     * @param {number} reviewTimeMs - Time spent on review
     * @param {Object} cardData - Additional card data
     * @returns {Object} Response record
     */
    recordResponse(wordId, wasCorrect, reviewTimeMs, cardData = {}) {
        const responseRecord = {
            wordId,
            wasCorrect,
            reviewTimeMs,
            timestamp: new Date().toISOString(),
            bucketLevel: cardData.bucketLevel || 0,
            wasNewCard: cardData.isNewCard || false,
            ...cardData
        };

        // Update session stats
        this.sessionStats.cardsReviewed++;
        this.sessionStats.totalReviewTime += reviewTimeMs;
        
        if (wasCorrect) {
            this.sessionStats.correctAnswers++;
        } else {
            this.sessionStats.incorrectAnswers++;
        }
        
        this.sessionStats.averageTimePerCard = Math.round(
            this.sessionStats.totalReviewTime / this.sessionStats.cardsReviewed
        );
        
        this.sessionStats.successRate = Math.round(
            (this.sessionStats.correctAnswers / this.sessionStats.cardsReviewed) * 100
        );
        
        this.sessionStats.cardResults.push(responseRecord);
        
        return responseRecord;
    }

    /**
     * End the current session
     * @param {boolean} completed - Whether session was completed
     * @returns {Object} Session summary
     */
    endSession(completed = true) {
        this.sessionStats.endTime = new Date().toISOString();
        this.sessionStats.completed = completed;
        
        const sessionDuration = new Date(this.sessionStats.endTime) - 
                               new Date(this.sessionStats.startTime);
        
        this.sessionStats.sessionDuration = sessionDuration;
        this.sessionStats.sessionDurationFormatted = this.formatDuration(sessionDuration);
        
        // Save session to storage
        this.saveSession(this.sessionStats);
        
        // Update daily and overall statistics
        this.updateDailyStats(this.sessionStats);
        this.updateOverallStats(this.sessionStats);
        
        return { ...this.sessionStats };
    }

    /**
     * Save session data to storage
     * @param {Object} sessionData - Session data to save
     */
    saveSession(sessionData) {
        const dateKey = this.getDateKey(new Date(sessionData.startTime));
        const sessionKey = `session_${sessionData.learningPath}_${dateKey}_${sessionData.sessionId}`;
        
        this.storage.setItem(sessionKey, sessionData);
        
        // Also save to sessions list
        const sessionsList = this.storage.getItem('sessions_list', []);
        sessionsList.push({
            sessionId: sessionData.sessionId,
            learningPath: sessionData.learningPath,
            date: sessionData.startTime,
            completed: sessionData.completed,
            successRate: sessionData.successRate,
            cardsReviewed: sessionData.cardsReviewed
        });
        
        // Keep only last 100 sessions to avoid storage bloat
        if (sessionsList.length > 100) {
            sessionsList.splice(0, sessionsList.length - 100);
        }
        
        this.storage.setItem('sessions_list', sessionsList);
    }

    /**
     * Update daily statistics
     * @param {Object} sessionData - Session data
     */
    updateDailyStats(sessionData) {
        const dateKey = this.getDateKey(new Date(sessionData.startTime));
        const dailyKey = `daily_stats_${sessionData.learningPath}_${dateKey}`;
        
        const existingStats = this.storage.getItem(dailyKey, {
            date: sessionData.startTime,
            learningPath: sessionData.learningPath,
            sessionsCompleted: 0,
            totalCardsReviewed: 0,
            totalCorrectAnswers: 0,
            totalIncorrectAnswers: 0,
            totalReviewTime: 0,
            averageSuccessRate: 0,
            timeSpent: 0,
            streakDay: false
        });
        
        existingStats.sessionsCompleted++;
        existingStats.totalCardsReviewed += sessionData.cardsReviewed;
        existingStats.totalCorrectAnswers += sessionData.correctAnswers;
        existingStats.totalIncorrectAnswers += sessionData.incorrectAnswers;
        existingStats.totalReviewTime += sessionData.totalReviewTime;
        existingStats.timeSpent += sessionData.sessionDuration;
        
        existingStats.averageSuccessRate = Math.round(
            (existingStats.totalCorrectAnswers / existingStats.totalCardsReviewed) * 100
        );
        
        existingStats.streakDay = existingStats.totalCardsReviewed >= 
                                 (sessionData.totalCards * 0.8); // 80% completion threshold
        
        this.storage.setItem(dailyKey, existingStats);
    }

    /**
     * Update overall statistics
     * @param {Object} sessionData - Session data
     */
    updateOverallStats(sessionData) {
        const overallKey = `overall_stats_${sessionData.learningPath}`;
        
        const existingStats = this.storage.getItem(overallKey, {
            learningPath: sessionData.learningPath,
            totalSessions: 0,
            totalCardsReviewed: 0,
            totalCorrectAnswers: 0,
            totalIncorrectAnswers: 0,
            totalTimeSpent: 0,
            averageSuccessRate: 0,
            currentStreak: 0,
            longestStreak: 0,
            firstSessionDate: null,
            lastSessionDate: null
        });
        
        existingStats.totalSessions++;
        existingStats.totalCardsReviewed += sessionData.cardsReviewed;
        existingStats.totalCorrectAnswers += sessionData.correctAnswers;
        existingStats.totalIncorrectAnswers += sessionData.incorrectAnswers;
        existingStats.totalTimeSpent += sessionData.sessionDuration;
        existingStats.lastSessionDate = sessionData.startTime;
        
        if (!existingStats.firstSessionDate) {
            existingStats.firstSessionDate = sessionData.startTime;
        }
        
        existingStats.averageSuccessRate = Math.round(
            (existingStats.totalCorrectAnswers / existingStats.totalCardsReviewed) * 100
        );
        
        this.storage.setItem(overallKey, existingStats);
    }

    /**
     * Get daily statistics
     * @param {string} learningPath - Learning path
     * @param {Date} date - Date to get stats for
     * @returns {Object} Daily statistics
     */
    getDailyStats(learningPath, date = new Date()) {
        const dateKey = this.getDateKey(date);
        const dailyKey = `daily_stats_${learningPath}_${dateKey}`;
        return this.storage.getItem(dailyKey, null);
    }

    /**
     * Get weekly statistics
     * @param {string} learningPath - Learning path
     * @param {Date} weekStartDate - Start of week
     * @returns {Object} Weekly statistics aggregated from daily stats
     */
    getWeeklyStats(learningPath, weekStartDate = null) {
        if (!weekStartDate) {
            const today = new Date();
            weekStartDate = new Date(today);
            weekStartDate.setDate(today.getDate() - today.getDay()); // Start of week
        }
        
        const weekStats = {
            weekStart: weekStartDate.toISOString(),
            learningPath,
            totalSessions: 0,
            totalCardsReviewed: 0,
            totalCorrectAnswers: 0,
            totalTimeSpent: 0,
            averageSuccessRate: 0,
            streakDays: 0,
            dailyBreakdown: []
        };
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStartDate);
            date.setDate(weekStartDate.getDate() + i);
            
            const dailyStats = this.getDailyStats(learningPath, date);
            
            if (dailyStats) {
                weekStats.totalSessions += dailyStats.sessionsCompleted;
                weekStats.totalCardsReviewed += dailyStats.totalCardsReviewed;
                weekStats.totalCorrectAnswers += dailyStats.totalCorrectAnswers;
                weekStats.totalTimeSpent += dailyStats.timeSpent;
                
                if (dailyStats.streakDay) {
                    weekStats.streakDays++;
                }
            }
            
            weekStats.dailyBreakdown.push({
                date: date.toISOString(),
                dateKey: this.getDateKey(date),
                stats: dailyStats
            });
        }
        
        weekStats.averageSuccessRate = weekStats.totalCardsReviewed > 0 ?
            Math.round((weekStats.totalCorrectAnswers / weekStats.totalCardsReviewed) * 100) : 0;
        
        return weekStats;
    }

    /**
     * Get overall statistics
     * @param {string} learningPath - Learning path
     * @returns {Object} Overall statistics
     */
    getOverallStats(learningPath) {
        const overallKey = `overall_stats_${learningPath}`;
        const stats = this.storage.getItem(overallKey, null);
        
        if (stats) {
            // Calculate current streak
            stats.currentStreak = this.calculateCurrentStreak(learningPath);
            
            // Update longest streak if needed
            if (stats.currentStreak > stats.longestStreak) {
                stats.longestStreak = stats.currentStreak;
                this.storage.setItem(overallKey, stats);
            }
            
            // Add formatted time
            stats.totalTimeSpentFormatted = this.formatDuration(stats.totalTimeSpent);
        }
        
        return stats;
    }

    /**
     * Calculate current learning streak
     * @param {string} learningPath - Learning path
     * @returns {number} Current streak in days
     */
    calculateCurrentStreak(learningPath) {
        let streak = 0;
        const today = new Date();
        let currentDate = new Date(today);
        
        while (true) {
            const dailyStats = this.getDailyStats(learningPath, currentDate);
            
            if (dailyStats && dailyStats.streakDay) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
            
            // Prevent infinite loop
            if (streak > 365) break;
        }
        
        return streak;
    }

    /**
     * Get recent sessions
     * @param {string} learningPath - Learning path (optional)
     * @param {number} limit - Number of sessions to return
     * @returns {Array} Recent sessions
     */
    getRecentSessions(learningPath = null, limit = 10) {
        const sessionsList = this.storage.getItem('sessions_list', []);
        
        let filteredSessions = sessionsList;
        if (learningPath) {
            filteredSessions = sessionsList.filter(session => 
                session.learningPath === learningPath
            );
        }
        
        return filteredSessions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);
    }

    /**
     * Get word-level statistics
     * @param {string} learningPath - Learning path
     * @param {string} wordId - Word ID (optional)
     * @returns {Object} Word statistics
     */
    getWordStats(learningPath, wordId = null) {
        const sessions = this.getRecentSessions(learningPath, 50);
        const wordStats = {};
        
        sessions.forEach(session => {
            const sessionData = this.storage.getItem(
                `session_${session.learningPath}_${this.getDateKey(new Date(session.date))}_${session.sessionId}`
            );
            
            if (sessionData && sessionData.cardResults) {
                sessionData.cardResults.forEach(result => {
                    if (!wordId || result.wordId === wordId) {
                        if (!wordStats[result.wordId]) {
                            wordStats[result.wordId] = {
                                wordId: result.wordId,
                                totalReviews: 0,
                                correctReviews: 0,
                                incorrectReviews: 0,
                                averageReviewTime: 0,
                                totalReviewTime: 0,
                                successRate: 0,
                                lastReviewed: null
                            };
                        }
                        
                        const stats = wordStats[result.wordId];
                        stats.totalReviews++;
                        stats.totalReviewTime += result.reviewTimeMs;
                        
                        if (result.wasCorrect) {
                            stats.correctReviews++;
                        } else {
                            stats.incorrectReviews++;
                        }
                        
                        stats.averageReviewTime = Math.round(stats.totalReviewTime / stats.totalReviews);
                        stats.successRate = Math.round((stats.correctReviews / stats.totalReviews) * 100);
                        stats.lastReviewed = result.timestamp;
                    }
                });
            }
        });
        
        return wordId ? wordStats[wordId] || null : wordStats;
    }

    /**
     * Generate session ID
     * @returns {string} Unique session ID
     */
    generateSessionId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
     * Format duration in human readable format
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} Formatted duration
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
    }

    /**
     * Clear all tracking data
     * @param {string} learningPath - Learning path (optional, clears all if not specified)
     * @returns {boolean} True if cleared successfully
     */
    clearTrackingData(learningPath = null) {
        try {
            const keys = this.storage.getAllKeys();
            const keysToRemove = keys.filter(key => {
                const isTrackingKey = key.startsWith('session_') || 
                                     key.startsWith('daily_stats_') || 
                                     key.startsWith('overall_stats_') ||
                                     key === 'sessions_list';
                
                if (!learningPath) return isTrackingKey;
                
                return isTrackingKey && key.includes(learningPath);
            });
            
            keysToRemove.forEach(key => this.storage.removeItem(key));
            
            // Clear sessions list if no specific learning path
            if (!learningPath) {
                this.storage.removeItem('sessions_list');
            } else {
                // Filter sessions list
                const sessionsList = this.storage.getItem('sessions_list', []);
                const filteredSessions = sessionsList.filter(s => s.learningPath !== learningPath);
                this.storage.setItem('sessions_list', filteredSessions);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to clear tracking data:', error);
            return false;
        }
    }

    /**
     * Get current session stats (in progress)
     * @returns {Object} Current session statistics
     */
    getCurrentSessionStats() {
        return { ...this.sessionStats };
    }
}