import type { Note } from './types';
import { patternRecognitionService, Prediction, PredictionResult } from './patternRecognition.js';
import { generateId, safeDivide, average } from './utils/common.js';
import { logInfo } from './utils/logging.js';
import { BaseService } from './baseService.js';

export interface AccuracyMetrics {
  predictionAccuracyRate: number; // Overall accuracy rate (0.0 to 1.0)
  totalPredictions: number;
  accuratePredictions: number;
  totalUsersTracked: number;
  predictionVolumePerDay: number[];
  feedbackReceived: number;
  userSatisfaction: number; // Average satisfaction rating (0.0 to 1.0)
}

export interface PredictionTrackingRecord {
  id: string;
  userId: string;
  prediction: Prediction;
  actualOutcome?: string; // What the user actually did
  wasAccurate: boolean;
  feedback?: string; // User feedback on the prediction
  satisfactionRating?: number; // 1-5 scale
  timestamp: number;
  reviewed: boolean; // Whether this has been analyzed
}

export class PredictionAccuracyTracker extends BaseService {
  private trackingRecords: PredictionTrackingRecord[] = [];
  private readonly MAX_RECORDS = 10000; // Limit to prevent memory issues

  constructor() {
    super('prediction-tracking');
  }

  /**
   * Records a prediction for tracking
   */
  recordPrediction(userId: string, prediction: Prediction): string {
    return this.safeExecuteSync(() => {
      const record: PredictionTrackingRecord = {
        id: generateId('pred_track_'),
        userId,
        prediction,
        wasAccurate: false,
        timestamp: Date.now(),
        reviewed: false
      };

      this.trackingRecords.push(record);

      // Maintain size limit
      if (this.trackingRecords.length > this.MAX_RECORDS) {
        this.trackingRecords = this.trackingRecords.slice(-this.MAX_RECORDS);
      }

      logInfo(`Recorded prediction for tracking`, {
        userId,
        predictionId: record.id,
        totalRecords: this.trackingRecords.length,
        serviceId: this.id
      });

      return record.id;
    }, 'recordPrediction', { userId }).result!;
  }

  /**
   * Records the actual outcome of a prediction
   */
  recordOutcome(recordId: string, actualOutcome: string, wasAccurate: boolean, feedback?: string, satisfactionRating?: number): boolean {
    return this.safeExecuteSync(() => {
      const recordIndex = this.trackingRecords.findIndex(r => r.id === recordId);

      if (recordIndex !== -1) {
        const record = this.trackingRecords[recordIndex];
        record.actualOutcome = actualOutcome;
        record.wasAccurate = wasAccurate;
        record.feedback = feedback;
        record.satisfactionRating = satisfactionRating;
        record.reviewed = true;

        // Update the pattern's accuracy in the pattern recognition service
        patternRecognitionService.recordPredictionOutcome(record.prediction.pattern.id, wasAccurate, feedback);

        logInfo(`Recorded outcome for prediction`, {
          recordId,
          wasAccurate,
          hasFeedback: !!feedback,
          serviceId: this.id
        });

        return true;
      }

      return false;
    }, 'recordOutcome', { recordId, wasAccurate, hasFeedback: !!feedback }).result!;
  }

  /**
   * Gets accuracy metrics
   */
  getAccuracyMetrics(): AccuracyMetrics {
    return this.safeExecuteSync(() => {
      const totalPredictions = this.trackingRecords.length;
      const reviewedRecords = this.trackingRecords.filter(r => r.reviewed);
      const accuratePredictions = reviewedRecords.filter(r => r.wasAccurate).length;

      const predictionAccuracyRate = safeDivide(accuratePredictions, reviewedRecords.length);

      // Calculate unique users tracked
      const uniqueUsers = new Set(reviewedRecords.map(r => r.userId)).size;

      // Calculate prediction volume per day (last 7 days)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recentPredictions = reviewedRecords.filter(r => r.timestamp >= sevenDaysAgo);
      const dailyVolumes: number[] = [];

      for (let i = 0; i < 7; i++) {
        const dayStart = sevenDaysAgo + (i * 24 * 60 * 60 * 1000);
        const dayEnd = dayStart + (24 * 60 * 60 * 1000);
        const dayPredictions = recentPredictions.filter(r =>
          r.timestamp >= dayStart && r.timestamp < dayEnd
        ).length;
        dailyVolumes.push(dayPredictions);
      }

      // Calculate feedback and satisfaction metrics
      const feedbackRecords = reviewedRecords.filter(r => r.feedback);
      const feedbackReceived = feedbackRecords.length;

      const satisfactionRatings = reviewedRecords
        .filter(r => r.satisfactionRating !== undefined)
        .map(r => r.satisfactionRating as number);
      const userSatisfaction = satisfactionRatings.length > 0 ? average(satisfactionRatings) / 5 : 0; // Normalize to 0-1

      return {
        predictionAccuracyRate,
        totalPredictions,
        accuratePredictions,
        totalUsersTracked: uniqueUsers,
        predictionVolumePerDay: dailyVolumes,
        feedbackReceived,
        userSatisfaction
      };
    }, 'getAccuracyMetrics').result!;
  }

  /**
   * Gets prediction metrics for a specific user
   */
  getUserAccuracyMetrics(userId: string): AccuracyMetrics {
    return this.safeExecuteSync(() => {
      const userRecords = this.trackingRecords.filter(r => r.userId === userId);
      const reviewedRecords = userRecords.filter(r => r.reviewed);
      const accuratePredictions = reviewedRecords.filter(r => r.wasAccurate).length;

      const predictionAccuracyRate = safeDivide(accuratePredictions, reviewedRecords.length);

      const feedbackRecords = reviewedRecords.filter(r => r.feedback);
      const satisfactionRatings = reviewedRecords
        .filter(r => r.satisfactionRating !== undefined)
        .map(r => r.satisfactionRating as number);
      const userSatisfaction = satisfactionRatings.length > 0 ? average(satisfactionRatings) / 5 : 0; // Normalize to 0-1

      return {
        predictionAccuracyRate,
        totalPredictions: userRecords.length,
        accuratePredictions,
        totalUsersTracked: 1, // Just this user
        predictionVolumePerDay: [], // Would need more complex calculation
        feedbackReceived: feedbackRecords.length,
        userSatisfaction
      };
    }, 'getUserAccuracyMetrics', { userId }).result!;
  }

  /**
   * Gets recent predictions for a user
   */
  getRecentPredictions(userId: string, limit: number = 10): PredictionTrackingRecord[] {
    return this.trackingRecords
      .filter(r => r.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Resets tracking data (for testing purposes)
   */
  reset(): void {
    this.trackingRecords = [];
    logInfo('Prediction tracking data reset');
  }
}

// Export a singleton instance for default usage
export const predictionAccuracyTracker = new PredictionAccuracyTracker();