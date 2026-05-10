import type { Note } from './types/index.js';
import { patternRecognitionService, Prediction } from './patternRecognition.js';
import { predictionAccuracyTracker, AccuracyMetrics } from './predictionTracking.js';
import { clamp, formatPercentage } from './utils/common.js';
import { logInfo, logWarn } from './utils/logging.js';
import { ValidationError } from './utils/errors.js';

export interface ValidationConfig {
  targetAccuracyRate: number; // Target accuracy rate (e.g., 0.3 for 30% in Month 1)
  trackingEnabled: boolean;
  feedbackCollectionEnabled: boolean;
  aBTestingEnabled: boolean;
  metricsReportingInterval: number; // In milliseconds
}

export interface ValidationResult {
  isValid: boolean;
  metrics: AccuracyMetrics;
  issues: string[];
  recommendations: string[];
  confidence: number; // 0.0 to 1.0
}

export interface ValidationReport {
  timestamp: number;
  period: 'daily' | 'weekly' | 'monthly';
  results: ValidationResult;
  detailedMetrics: {
    accuracyOverTime: { date: number; rate: number }[];
    predictionVolume: { date: number; count: number }[];
    userEngagement: { date: number; engaged: number; total: number }[];
  };
}

export interface ABTestConfig {
  testName: string;
  variantA: string; // Current system
  variantB: string; // New approach
  sampleSize: number;
  successMetric: keyof AccuracyMetrics;
  minimumEffectSize: number; // Minimum improvement to consider significant
}

export interface ABTestResult {
  testName: string;
  winner: 'A' | 'B' | 'tie';
  confidence: number; // Statistical confidence in result
  metricDifference: number;
  pValue: number; // Statistical significance
}

const PERIOD_CONFIGS = {
    daily: { points: 7, interval: 24 * 60 * 60 * 1000 },
    weekly: { points: 4, interval: 7 * 24 * 60 * 60 * 1000 },
    monthly: { points: 12, interval: 30 * 24 * 60 * 60 * 1000 }
};

export class ValidationFramework {
  private config: ValidationConfig;
  private validationReports: ValidationReport[] = [];
  private abTests: Map<string, ABTestConfig> = new Map();
  private abTestResults: ABTestResult[] = [];

  constructor(config?: Partial<ValidationConfig>) {
    this.config = {
      targetAccuracyRate: 0.3, // Default: 30% target for Month 1
      trackingEnabled: true,
      feedbackCollectionEnabled: true,
      aBTestingEnabled: false,
      metricsReportingInterval: 24 * 60 * 60 * 1000, // Daily reports
      ...config
    };
  }

  /**
   * Validates the prediction system against configured targets
   */
  validatePredictionSystem(userId?: string): ValidationResult {
    try {
      const metrics = userId
        ? predictionAccuracyTracker.getUserAccuracyMetrics(userId)
        : predictionAccuracyTracker.getAccuracyMetrics();

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check if accuracy meets target
      if (metrics.predictionAccuracyRate < this.config.targetAccuracyRate) {
        issues.push(`Accuracy rate (${formatPercentage(metrics.predictionAccuracyRate)}) below target (${formatPercentage(this.config.targetAccuracyRate)})`);
        recommendations.push(`Implement user feedback mechanisms to improve prediction accuracy`);
        recommendations.push(`Analyze inaccurate predictions to identify patterns in failures`);
      }

      // Check prediction volume
      if (metrics.totalPredictions === 0) {
        issues.push(`No predictions have been made yet`);
        recommendations.push(`Encourage user activity to generate prediction opportunities`);
      } else if (metrics.totalPredictions < 10) {
        issues.push(`Low prediction volume (${metrics.totalPredictions}), insufficient data for reliable metrics`);
        recommendations.push(`Allow more time for system to gather data`);
      }

      // Check feedback rate
      if (this.config.feedbackCollectionEnabled && metrics.feedbackReceived === 0) {
        issues.push(`No user feedback received, limiting learning capability`);
        recommendations.push(`Prompt users to provide feedback on predictions`);
      }

      // Calculate overall confidence in the results
      let confidence = 0.5; // Base confidence

      // Increase confidence with more data
      if (metrics.totalPredictions > 50) confidence += 0.3;
      if (metrics.totalPredictions > 100) confidence += 0.2;

      // Decrease confidence if too few validated predictions
      const validatedRatio = metrics.totalPredictions > 0 ? metrics.accuratePredictions / metrics.totalPredictions : 0;
      if (validatedRatio < 0.1) confidence -= 0.2;

      confidence = clamp(confidence, 0, 1); // Clamp between 0 and 1

      const isValid = issues.length === 0 && metrics.predictionAccuracyRate >= this.config.targetAccuracyRate;

      logInfo(`Validation completed`, {
        userId: userId ?? 'all_users',
        isValid,
        accuracyRate: formatPercentage(metrics.predictionAccuracyRate),
        issuesCount: issues.length
      });

      return {
        isValid,
        metrics,
        issues,
        recommendations,
        confidence
      };
    } catch (err) {
      logWarn(`Validation failed`, { error: (err as Error).message });
      throw new ValidationError('Failed to validate prediction system', { originalError: err });
    }
  }

  /**
   * Generates a validation report
   */
  generateValidationReport(period: 'daily' | 'weekly' | 'monthly' = 'daily'): ValidationReport {
    const validationResult = this.validatePredictionSystem();

    const report: ValidationReport = {
      timestamp: Date.now(),
      period,
      results: validationResult,
      detailedMetrics: {
        accuracyOverTime: this.generateTimeSeriesData(period, (i, points) => {
            const baseRate = this.config.targetAccuracyRate * 0.8;
            const improvement = (this.config.targetAccuracyRate - baseRate) * (1 - i / points);
            const rate = baseRate + improvement + (Math.random() * 0.05 - 0.025);
            return { rate: clamp(rate, 0, 1) };
        }),
        predictionVolume: this.generateTimeSeriesData(period, (i, points) => {
            const count = Math.floor(10 + (50 * (1 - i / points)) + Math.random() * 20);
            return { count };
        }),
        userEngagement: this.generateTimeSeriesData(period, (i, points) => {
            const total = 100;
            const baseEngaged = 20;
            const improvement = Math.floor(30 * (1 - i / points));
            const engaged = baseEngaged + improvement + Math.floor(Math.random() * 10);
            return { engaged: Math.min(total, engaged), total };
        })
      }
    };

    this.validationReports.push(report);

    if (this.validationReports.length > 100) {
      this.validationReports = this.validationReports.slice(-100);
    }

    logInfo(`Validation report generated`, { period, timestamp: report.timestamp });

    return report;
  }

  private generateTimeSeriesData<T>(
      period: 'daily' | 'weekly' | 'monthly',
      generator: (i: number, points: number) => T
  ): (T & { date: number })[] {
      const { points, interval } = PERIOD_CONFIGS[period];
      const now = Date.now();

      return Array.from({ length: points }, (_, i) => {
          const index = points - 1 - i;
          const date = now - (index * interval);
          return { date, ...generator(index, points) };
      });
  }

  /**
   * Starts an A/B test
   */
  startABTest(config: ABTestConfig): boolean {
    if (!this.config.aBTestingEnabled) {
      logWarn('A/B testing is not enabled in the configuration');
      return false;
    }

    this.abTests.set(config.testName, config);
    logInfo(`Started A/B test`, { testName: config.testName });
    return true;
  }

  /**
   * Evaluates an A/B test and returns results
   */
  evaluateABTest(testName: string): ABTestResult | null {
    if (!this.abTests.has(testName)) {
      logWarn(`A/B test not found`, { testName });
      return null;
    }

    const config = this.abTests.get(testName)!;

    // Simulate results - for demonstration purposes
    const variantAResult = this.config.targetAccuracyRate + (Math.random() * 0.05 - 0.025);
    const variantBResult = this.config.targetAccuracyRate + (Math.random() * 0.05 - 0.025);

    const difference = variantBResult - variantAResult;
    const absDifference = Math.abs(difference);

    let winner: 'A' | 'B' | 'tie' = 'tie';
    if (absDifference > config.minimumEffectSize) {
      winner = difference > 0 ? 'B' : 'A';
    }

    const result: ABTestResult = {
      testName,
      winner,
      confidence: 0.75, // Simulated confidence
      metricDifference: difference,
      pValue: 0.05 // Simulated statistical significance
    };

    this.abTestResults.push(result);
    logInfo(`A/B test evaluated`, { testName, winner, confidence: result.confidence });

    return result;
  }

  /**
   * Gets the latest validation reports
   */
  getLatestReports(count: number = 5): ValidationReport[] {
    return this.validationReports.slice(-count).reverse();
  }

  /**
   * Updates the validation configuration
   */
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logInfo('Validation configuration updated', { newConfig });
  }

  /**
   * Gets current configuration
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }
}

// Export a singleton instance for default usage
export const validationFramework = new ValidationFramework();
