/**
 * Feedback types for user feedback on system behavior.
 * Enables learning and improvement of skills, matching, and suggestions.
 */

export interface Feedback {
    /** Unique identifier for this feedback */
    id: string;

    /** ID of the entity being rated (note, skill, match, etc.) */
    entityId: string;

    /** Type of entity */
    entityType: 'note' | 'skill' | 'match' | 'suggestion' | 'property' | 'import';

    /** Feedback value: -1 (negative) to +1 (positive) */
    value: number;

    /** Optional context for detailed feedback */
    context?: {
        reason?: string;
        details?: string;
        category?: string;
    };

    /** Timestamp of feedback */
    timestamp: number;

    /** User ID (for multi-user scenarios) */
    userId?: string;
}

/**
 * Feedback statistics for an entity
 */
export interface FeedbackStats {
    entityId: string;
    entityType: Feedback['entityType'];
    totalFeedback: number;
    averageScore: number;
    positiveCount: number;
    negativeCount: number;
    lastFeedback?: number;
}
