/**
 * UserProgress model for tracking learning progress with spaced repetition
 */
export class UserProgress {
    /**
     * Create a new UserProgress instance
     * @param {Object} data - Progress data object
     * @param {string} data.wordId - Word ID this progress relates to
     * @param {string} data.learningPath - Learning path (e.g., 'en-hu', 'hu-bg')
     * @param {number} data.bucketLevel - Current spaced repetition bucket (0-4)
     * @param {string} data.lastReviewed - ISO date string of last review
     * @param {string} data.nextReview - ISO date string of next scheduled review
     * @param {number} data.successCount - Total correct answers
     * @param {number} data.failureCount - Total incorrect answers
     * @param {number} data.consecutiveSuccesses - Current streak of correct answers
     * @param {number} data.totalReviewTime - Total time spent reviewing (ms)
     */
    constructor(data) {
        this.wordId = data.wordId || '';
        this.learningPath = data.learningPath || '';
        this.bucketLevel = data.bucketLevel || 0;
        this.lastReviewed = data.lastReviewed || null;
        this.nextReview = data.nextReview || new Date().toISOString();
        this.successCount = data.successCount || 0;
        this.failureCount = data.failureCount || 0;
        this.consecutiveSuccesses = data.consecutiveSuccesses || 0;
        this.totalReviewTime = data.totalReviewTime || 0;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        
        // Spaced repetition intervals in days
        this.bucketIntervals = [1, 3, 7, 14, 30];
        this.maxBucketLevel = this.bucketIntervals.length - 1;
    }

    /**
     * Record a successful review
     * @param {number} reviewTime - Time spent on this review in milliseconds
     */
    recordSuccess(reviewTime = 0) {
        this.successCount++;
        this.consecutiveSuccesses++;
        this.totalReviewTime += reviewTime;
        this.lastReviewed = new Date().toISOString();
        
        // Promote to next bucket if at least 2 consecutive successes
        if (this.consecutiveSuccesses >= 2 && this.bucketLevel < this.maxBucketLevel) {
            this.bucketLevel++;
        }
        
        this.scheduleNextReview();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Record a failed review
     * @param {number} reviewTime - Time spent on this review in milliseconds
     */
    recordFailure(reviewTime = 0) {
        this.failureCount++;
        this.consecutiveSuccesses = 0;
        this.totalReviewTime += reviewTime;
        this.lastReviewed = new Date().toISOString();
        
        // Demote bucket level on failure
        if (this.bucketLevel > 0) {
            this.bucketLevel = Math.max(0, this.bucketLevel - 1);
        }
        
        this.scheduleNextReview();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Schedule the next review based on current bucket level
     */
    scheduleNextReview() {
        const interval = this.bucketIntervals[this.bucketLevel];
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + interval);
        
        // Add some randomization (±20%) to avoid clustering
        const randomOffset = (Math.random() - 0.5) * 0.4 * interval;
        nextReviewDate.setDate(nextReviewDate.getDate() + randomOffset);
        
        this.nextReview = nextReviewDate.toISOString();
    }

    /**
     * Check if this word is due for review
     * @param {Date} currentDate - Current date (defaults to now)
     * @returns {boolean} True if due for review
     */
    isDue(currentDate = new Date()) {
        return new Date(this.nextReview) <= currentDate;
    }

    /**
     * Check if this word is overdue for review
     * @param {Date} currentDate - Current date (defaults to now)
     * @returns {boolean} True if overdue
     */
    isOverdue(currentDate = new Date()) {
        const reviewDate = new Date(this.nextReview);
        const daysSinceReview = (currentDate - reviewDate) / (1000 * 60 * 60 * 24);
        return daysSinceReview > 1; // More than 1 day overdue
    }

    /**
     * Get days until next review
     * @param {Date} currentDate - Current date (defaults to now)
     * @returns {number} Days until review (negative if overdue)
     */
    getDaysUntilReview(currentDate = new Date()) {
        const reviewDate = new Date(this.nextReview);
        return Math.ceil((reviewDate - currentDate) / (1000 * 60 * 60 * 24));
    }

    /**
     * Get success rate as percentage
     * @returns {number} Success rate (0-100)
     */
    getSuccessRate() {
        const totalReviews = this.successCount + this.failureCount;
        if (totalReviews === 0) return 0;
        return Math.round((this.successCount / totalReviews) * 100);
    }

    /**
     * Get total review count
     * @returns {number} Total number of reviews
     */
    getTotalReviews() {
        return this.successCount + this.failureCount;
    }

    /**
     * Get average review time in seconds
     * @returns {number} Average time per review in seconds
     */
    getAverageReviewTime() {
        const totalReviews = this.getTotalReviews();
        if (totalReviews === 0) return 0;
        return Math.round(this.totalReviewTime / totalReviews / 1000);
    }

    /**
     * Get learning stage description
     * @returns {string} Human-readable stage description
     */
    getLearningStage() {
        const stages = ['New', 'Learning', 'Familiar', 'Known', 'Mastered'];
        return stages[this.bucketLevel] || 'Unknown';
    }

    /**
     * Get priority score for scheduling (higher = more urgent)
     * @param {Date} currentDate - Current date (defaults to now)
     * @returns {number} Priority score
     */
    getPriorityScore(currentDate = new Date()) {
        let score = 0;
        
        // Overdue items get highest priority
        if (this.isOverdue(currentDate)) {
            const daysOverdue = Math.abs(this.getDaysUntilReview(currentDate));
            score += daysOverdue * 10;
        }
        
        // Due items get high priority
        if (this.isDue(currentDate)) {
            score += 5;
        }
        
        // Lower bucket levels (newer words) get higher priority
        score += (this.maxBucketLevel - this.bucketLevel);
        
        // Words with recent failures get higher priority
        if (this.consecutiveSuccesses === 0 && this.failureCount > 0) {
            score += 3;
        }
        
        return score;
    }

    /**
     * Reset progress to beginning
     */
    reset() {
        this.bucketLevel = 0;
        this.lastReviewed = null;
        this.nextReview = new Date().toISOString();
        this.successCount = 0;
        this.failureCount = 0;
        this.consecutiveSuccesses = 0;
        this.totalReviewTime = 0;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Validate progress data
     * @returns {Object} Validation result with isValid and errors
     */
    validate() {
        const errors = [];
        
        if (!this.wordId || this.wordId.trim() === '') {
            errors.push('Word ID is required');
        }
        
        if (!this.learningPath || !this.learningPath.match(/^[a-z]{2}-[a-z]{2}$/)) {
            errors.push('Valid learning path is required (format: xx-xx)');
        }
        
        if (typeof this.bucketLevel !== 'number' || 
            this.bucketLevel < 0 || 
            this.bucketLevel > this.maxBucketLevel) {
            errors.push(`Bucket level must be between 0 and ${this.maxBucketLevel}`);
        }
        
        if (this.successCount < 0 || this.failureCount < 0) {
            errors.push('Success and failure counts must be non-negative');
        }
        
        if (this.consecutiveSuccesses < 0) {
            errors.push('Consecutive successes must be non-negative');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Convert progress to JSON-serializable object
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            wordId: this.wordId,
            learningPath: this.learningPath,
            bucketLevel: this.bucketLevel,
            lastReviewed: this.lastReviewed,
            nextReview: this.nextReview,
            successCount: this.successCount,
            failureCount: this.failureCount,
            consecutiveSuccesses: this.consecutiveSuccesses,
            totalReviewTime: this.totalReviewTime,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Create UserProgress instance from JSON object
     * @param {Object} json - JSON object
     * @returns {UserProgress} UserProgress instance
     */
    static fromJSON(json) {
        return new UserProgress(json);
    }

    /**
     * Create multiple UserProgress instances from JSON array
     * @param {Object[]} jsonArray - Array of JSON objects
     * @returns {UserProgress[]} Array of UserProgress instances
     */
    static fromJSONArray(jsonArray) {
        return jsonArray.map(json => UserProgress.fromJSON(json));
    }
}