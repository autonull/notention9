import { Feedback, Logger } from '@notention/core';

export class FeedbackCollector {
  private feedbackStore: Map<string, Feedback[]> = new Map();
  private logger = Logger.getInstance();

  async recordFeedback(feedback: Feedback): Promise<void> {
    const entity = this.feedbackStore.get(feedback.entityId) || [];
    entity.push(feedback);
    this.feedbackStore.set(feedback.entityId, entity);

    this.logger.info(`Feedback recorded for ${feedback.entityType} ${feedback.entityId}: ${feedback.value}`);

    // Trigger learning or adjustments (future)
    await this.updateSkillPriority(feedback);
  }

  private async updateSkillPriority(feedback: Feedback): Promise<void> {
    if (feedback.entityType !== 'skill') return;

    const allFeedback = this.feedbackStore.get(feedback.entityId) || [];
    const avgScore = allFeedback.reduce((sum, f) => sum + f.value, 0) / allFeedback.length;

    this.logger.info(`Skill ${feedback.entityId} avg score: ${avgScore}`);
    // In future, this could update the skill's confidence score in the registry
  }

  getFeedback(entityId: string): Feedback[] {
      return this.feedbackStore.get(entityId) || [];
  }
}
