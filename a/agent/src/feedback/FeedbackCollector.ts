import type { Feedback, FeedbackStats } from '@notention/core';

/**
 * FeedbackCollector manages user feedback and learning.
 *
 * Responsibilities:
 * 1. Store feedback from users
 * 2. Calculate aggregate statistics
 * 3. Adjust system behavior based on feedback
 */
export class FeedbackCollector {
    private feedbackStore: Map<string, Feedback[]> = new Map();

    /**
     * Record user feedback
     */
    async recordFeedback(feedback: Feedback): Promise<void> {
        const entityFeedback = this.feedbackStore.get(feedback.entityId) || [];
        entityFeedback.push(feedback);
        this.feedbackStore.set(feedback.entityId, entityFeedback);

        console.log(`📊 Feedback recorded: ${feedback.entityType} ${feedback.entityId} (${feedback.value > 0 ? '👍' : '👎'})`);

        // Trigger learning based on feedback type
        switch (feedback.entityType) {
            case 'skill':
                await this.updateSkillPriority(feedback);
                break;
            case 'match':
                await this.updateMatchingWeights(feedback);
                break;
            case 'import':
                await this.updateImportQuality(feedback);
                break;
        }
    }

    /**
     * Get feedback statistics for an entity
     */
    getStats(entityId: string): FeedbackStats | null {
        const feedback = this.feedbackStore.get(entityId);
        if (!feedback || feedback.length === 0) return null;

        const positiveCount = feedback.filter(f => f.value > 0).length;
        const negativeCount = feedback.filter(f => f.value < 0).length;
        const totalScore = feedback.reduce((sum, f) => sum + f.value, 0);
        const averageScore = totalScore / feedback.length;

        return {
            entityId,
            entityType: feedback[0].entityType,
            totalFeedback: feedback.length,
            averageScore,
            positiveCount,
            negativeCount,
            lastFeedback: Math.max(...feedback.map(f => f.timestamp))
        };
    }

    /**
     * Get all feedback for debugging/analysis
     */
    getAllFeedback(): Feedback[] {
        const all: Feedback[] = [];
        for (const feedback of this.feedbackStore.values()) {
            all.push(...feedback);
        }
        return all.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Clear feedback (for testing)
     */
    clear(): void {
        this.feedbackStore.clear();
    }

    /**
     * Update skill activation threshold based on feedback
     */
    private async updateSkillPriority(feedback: Feedback): Promise<void> {
        const stats = this.getStats(feedback.entityId);
        if (!stats) return;

        console.log(`🎯 Skill ${feedback.entityId} average score: ${stats.averageScore.toFixed(2)}`);

        // Future: Adjust skill confidence thresholds
        // If avgScore < -0.3, increase confidence threshold (make it harder to activate)
        // If avgScore > 0.5, decrease confidence threshold (make it easier to activate)
    }

    /**
     * Update matching algorithm weights based on feedback
     */
    private async updateMatchingWeights(feedback: Feedback): Promise<void> {
        const stats = this.getStats(feedback.entityId);
        if (!stats) return;

        console.log(`🔍 Match ${feedback.entityId} average score: ${stats.averageScore.toFixed(2)}`);

        // Future: Adjust property weights in matching algorithm
    }

    /**
     * Update import quality scoring based on feedback
     */
    private async updateImportQuality(feedback: Feedback): Promise<void> {
        const stats = this.getStats(feedback.entityId);
        if (!stats) return;

        console.log(`📥 Import ${feedback.entityId} average score: ${stats.averageScore.toFixed(2)}`);

        // Future: Adjust priority of future imports from same source
    }

    /**
     * Export feedback analytics
     */
    getAnalytics(): {
        totalFeedback: number;
        byType: Record<string, number>;
        overallSentiment: number;
    } {
        const allFeedback = this.getAllFeedback();

        const byType: Record<string, number> = {};
        let totalScore = 0;

        for (const feedback of allFeedback) {
            byType[feedback.entityType] = (byType[feedback.entityType] || 0) + 1;
            totalScore += feedback.value;
        }

        return {
            totalFeedback: allFeedback.length,
            byType,
            overallSentiment: allFeedback.length > 0 ? totalScore / allFeedback.length : 0
        };
    }
}

/**
 * Global singleton collector
 */
export const feedbackCollector = new FeedbackCollector();
