/**
 * SpacedRepetition algorithm for managing learning schedules and bucket system
 */
import { UserProgress } from '../models/UserProgress.js';

export class SpacedRepetition {
    /**
     * Create a new SpacedRepetition instance
     * @param {Object} config - Algorithm configuration
     */
    constructor(config = {}) {
        // Default bucket intervals in days
        this.bucketIntervals = config.bucketIntervals || [1, 3, 7, 14, 30];
        this.maxBucketLevel = this.bucketIntervals.length - 1;
        
        // Algorithm parameters
        this.config = {
            minSuccessesForPromotion: config.minSuccessesForPromotion || 2,
            demotionOnFailure: config.demotionOnFailure !== false, // Default true
            randomizationFactor: config.randomizationFactor || 0.2, // ±20%
            graduationThreshold: config.graduationThreshold || 21, // Days to graduate
            ...config
        };
    }

    /**
     * Calculate next review date based on performance
     * @param {UserProgress} progress - User progress data
     * @param {boolean} wasCorrect - Whether the answer was correct
     * @param {Date} currentDate - Current date (defaults to now)
     * @returns {Date} Next review date
     */
    calculateNextReview(progress, wasCorrect, currentDate = new Date()) {
        let newBucketLevel = progress.bucketLevel;
        
        if (wasCorrect) {
            // Promote if enough consecutive successes
            if (progress.consecutiveSuccesses + 1 >= this.config.minSuccessesForPromotion && 
                newBucketLevel < this.maxBucketLevel) {
                newBucketLevel++;
            }
        } else {
            // Demote on failure (if enabled)
            if (this.config.demotionOnFailure && newBucketLevel > 0) {
                newBucketLevel = Math.max(0, newBucketLevel - 1);
            }
        }
        
        return this.getNextReviewDate(newBucketLevel, currentDate);
    }

    /**
     * Get next review date for a bucket level
     * @param {number} bucketLevel - Current bucket level (0-4)
     * @param {Date} currentDate - Current date
     * @returns {Date} Next review date
     */
    getNextReviewDate(bucketLevel, currentDate = new Date()) {
        const interval = this.bucketIntervals[bucketLevel] || this.bucketIntervals[0];
        const nextReview = new Date(currentDate);
        
        // Add base interval
        nextReview.setDate(nextReview.getDate() + interval);
        
        // Add randomization to prevent clustering
        const randomOffset = this.getRandomOffset(interval);
        nextReview.setDate(nextReview.getDate() + randomOffset);
        
        return nextReview;
    }

    /**
     * Get random offset for scheduling
     * @param {number} baseInterval - Base interval in days
     * @returns {number} Random offset in days
     */
    getRandomOffset(baseInterval) {
        const maxOffset = baseInterval * this.config.randomizationFactor;
        return (Math.random() - 0.5) * 2 * maxOffset;
    }

    /**
     * Update user progress after a review
     * @param {UserProgress} progress - User progress to update
     * @param {boolean} wasCorrect - Whether the answer was correct
     * @param {number} reviewTimeMs - Time spent on review in milliseconds
     * @param {Date} currentDate - Current date (defaults to now)
     * @returns {UserProgress} Updated progress
     */
    updateProgress(progress, wasCorrect, reviewTimeMs = 0, currentDate = new Date()) {
        if (wasCorrect) {
            progress.recordSuccess(reviewTimeMs);
        } else {
            progress.recordFailure(reviewTimeMs);
        }
        
        return progress;
    }

    /**
     * Get cards due for review
     * @param {UserProgress[]} allProgress - All user progress records
     * @param {Date} currentDate - Current date (defaults to now)
     * @returns {UserProgress[]} Due cards sorted by priority
     */
    getDueCards(allProgress, currentDate = new Date()) {
        return allProgress
            .filter(progress => progress.isDue(currentDate))
            .sort((a, b) => {
                // Sort by priority (higher = more urgent)
                const priorityA = this.calculatePriority(a, currentDate);
                const priorityB = this.calculatePriority(b, currentDate);
                return priorityB - priorityA;
            });
    }

    /**
     * Get overdue cards
     * @param {UserProgress[]} allProgress - All user progress records
     * @param {Date} currentDate - Current date (defaults to now)
     * @returns {UserProgress[]} Overdue cards sorted by urgency
     */
    getOverdueCards(allProgress, currentDate = new Date()) {
        return allProgress
            .filter(progress => progress.isOverdue(currentDate))
            .sort((a, b) => {
                // Sort by days overdue (most overdue first)
                const daysOverdueA = Math.abs(a.getDaysUntilReview(currentDate));
                const daysOverdueB = Math.abs(b.getDaysUntilReview(currentDate));
                return daysOverdueB - daysOverdueA;
            });
    }

    /**
     * Calculate priority score for a card
     * @param {UserProgress} progress - Progress record
     * @param {Date} currentDate - Current date
     * @returns {number} Priority score (higher = more urgent)
     */
    calculatePriority(progress, currentDate = new Date()) {
        let priority = 0;
        
        // Base priority from UserProgress
        priority += progress.getPriorityScore(currentDate);
        
        // Additional algorithm-specific priorities
        
        // Boost cards that are graduating soon
        if (progress.bucketLevel === this.maxBucketLevel - 1) {
            priority += 2;
        }
        
        // Boost cards with low success rate
        const successRate = progress.getSuccessRate();
        if (successRate < 70) {
            priority += 3;
        }
        
        // Boost new cards slightly
        if (progress.getTotalReviews() < 3) {
            priority += 1;
        }
        
        return priority;
    }

    /**
     * Generate daily learning queue
     * @param {UserProgress[]} allProgress - All user progress records
     * @param {Word[]} availableWords - Available words to learn
     * @param {number} targetCount - Target number of cards
     * @param {Date} currentDate - Current date
     * @returns {Object} Learning queue with cards and metadata
     */
    generateDailyQueue(allProgress, availableWords, targetCount = 50, currentDate = new Date()) {
        const queue = [];
        const metadata = {
            dueCount: 0,
            overdueCount: 0,
            newCount: 0,
            reviewCount: 0
        };
        
        // Get due and overdue cards
        const dueCards = this.getDueCards(allProgress, currentDate);
        const overdueCards = this.getOverdueCards(allProgress, currentDate);
        
        // Add overdue cards first (highest priority)
        overdueCards.forEach(progress => {
            if (queue.length < targetCount) {
                queue.push(progress);
                metadata.overdueCount++;
            }
        });
        
        // Add due cards
        dueCards.forEach(progress => {
            if (queue.length < targetCount && !queue.includes(progress)) {
                queue.push(progress);
                metadata.dueCount++;
            }
        });
        
        // Fill remaining slots with new words
        if (queue.length < targetCount) {
            const existingWordIds = new Set(allProgress.map(p => p.wordId));
            const newWords = availableWords.filter(word => !existingWordIds.has(word.id));
            
            // Sort new words by frequency (most common first)
            newWords.sort((a, b) => a.frequencyRank - b.frequencyRank);
            
            const neededNewCards = targetCount - queue.length;
            const newCardsToAdd = newWords.slice(0, neededNewCards);
            
            newCardsToAdd.forEach(word => {
                // Create new progress entry for new word
                const newProgress = new UserProgress({
                    wordId: word.id,
                    learningPath: this.getLearningPathFromProgress(allProgress[0]) || 'en-hu',
                    bucketLevel: 0,
                    nextReview: currentDate.toISOString()
                });
                
                queue.push(newProgress);
                metadata.newCount++;
            });
        }
        
        metadata.reviewCount = metadata.dueCount + metadata.overdueCount;
        
        // Shuffle the queue to avoid predictable patterns
        this.shuffleArray(queue);
        
        return {
            cards: queue,
            metadata,
            totalCards: queue.length
        };
    }

    /**
     * Get learning path from existing progress (helper method)
     * @param {UserProgress} progress - Sample progress record
     * @returns {string} Learning path
     */
    getLearningPathFromProgress(progress) {
        return progress ? progress.learningPath : 'en-hu';
    }

    /**
     * Shuffle array in place (Fisher-Yates algorithm)
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Get learning statistics
     * @param {UserProgress[]} allProgress - All user progress records
     * @param {Date} currentDate - Current date
     * @returns {Object} Learning statistics
     */
    getStatistics(allProgress, currentDate = new Date()) {
        const stats = {
            totalCards: allProgress.length,
            bucketDistribution: [0, 0, 0, 0, 0],
            averageSuccessRate: 0,
            totalReviews: 0,
            dueToday: 0,
            overdue: 0,
            graduated: 0,
            learning: 0,
            new: 0
        };
        
        let totalSuccessRate = 0;
        let cardsWithReviews = 0;
        
        allProgress.forEach(progress => {
            // Bucket distribution
            if (progress.bucketLevel <= this.maxBucketLevel) {
                stats.bucketDistribution[progress.bucketLevel]++;
            }
            
            // Success rate
            const successRate = progress.getSuccessRate();
            if (progress.getTotalReviews() > 0) {
                totalSuccessRate += successRate;
                cardsWithReviews++;
            }
            
            // Total reviews
            stats.totalReviews += progress.getTotalReviews();
            
            // Status counts
            if (progress.isDue(currentDate)) {
                stats.dueToday++;
            }
            if (progress.isOverdue(currentDate)) {
                stats.overdue++;
            }
            
            // Learning stage
            if (progress.bucketLevel === this.maxBucketLevel) {
                stats.graduated++;
            } else if (progress.getTotalReviews() > 0) {
                stats.learning++;
            } else {
                stats.new++;
            }
        });
        
        stats.averageSuccessRate = cardsWithReviews > 0 ? 
            Math.round(totalSuccessRate / cardsWithReviews) : 0;
        
        return stats;
    }

    /**
     * Estimate study time for daily queue
     * @param {number} cardCount - Number of cards
     * @param {number} averageTimePerCard - Average time per card in seconds
     * @returns {Object} Time estimation
     */
    estimateStudyTime(cardCount, averageTimePerCard = 15) {
        const totalSeconds = cardCount * averageTimePerCard;
        const minutes = Math.round(totalSeconds / 60);
        
        return {
            totalSeconds,
            minutes,
            formattedTime: this.formatTime(totalSeconds)
        };
    }

    /**
     * Format time in human readable format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time
     */
    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds} seconds`;
        } else if (seconds < 3600) {
            const minutes = Math.round(seconds / 60);
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.round((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }

    /**
     * Export algorithm configuration
     * @returns {Object} Configuration object
     */
    exportConfig() {
        return {
            bucketIntervals: [...this.bucketIntervals],
            maxBucketLevel: this.maxBucketLevel,
            config: { ...this.config }
        };
    }

    /**
     * Update algorithm configuration
     * @param {Object} newConfig - New configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        if (newConfig.bucketIntervals) {
            this.bucketIntervals = [...newConfig.bucketIntervals];
            this.maxBucketLevel = this.bucketIntervals.length - 1;
        }
    }
}