import { clamp } from '../utils/common.js';
import type { AccuracyMetrics as BaseAccuracyMetrics } from '../patternRecognition/predictionTracking.js';

export type AccuracyMetrics = BaseAccuracyMetrics;

export interface ValidationConfig {
  targetAccuracyRate: number;
  trackingEnabled: boolean;
  feedbackCollectionEnabled: boolean;
  aBTestingEnabled: boolean;
  metricsReportingInterval: number;
}

export interface ValidationResult {
  isValid: boolean;
  metrics: AccuracyMetrics;
  issues: string[];
  recommendations: string[];
  confidence: number;
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
  variantA: string;
  variantB: string;
  sampleSize: number;
  successMetric: keyof AccuracyMetrics;
  minimumEffectSize: number;
}

export interface ABTestResult {
  testName: string;
  winner: 'A' | 'B' | 'tie';
  confidence: number;
  metricDifference: number;
  pValue: number;
}

const PERIOD_CONFIGS = {
  daily: { points: 7, interval: 24 * 60 * 60 * 1000 },
  weekly: { points: 4, interval: 7 * 24 * 60 * 60 * 1000 },
  monthly: { points: 12, interval: 30 * 24 * 60 * 60 * 1000 }
} as const;

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  targetAccuracyRate: 0.3,
  trackingEnabled: true,
  feedbackCollectionEnabled: true,
  aBTestingEnabled: false,
  metricsReportingInterval: 24 * 60 * 60 * 1000
};

export function getPeriodConfig(period: 'daily' | 'weekly' | 'monthly') {
  return PERIOD_CONFIGS[period];
}

export function calculateConfidence(metrics: AccuracyMetrics, targetAccuracyRate: number): number {
  let confidence = 0.5;

  if (metrics.totalPredictions > 50) confidence += 0.3;
  if (metrics.totalPredictions > 100) confidence += 0.2;

  const validatedRatio = metrics.totalPredictions > 0
    ? metrics.accuratePredictions / metrics.totalPredictions
    : 0;
  if (validatedRatio < 0.1) confidence -= 0.2;

  return clamp(confidence, 0, 1);
}

export function evaluateValidation(
  metrics: AccuracyMetrics,
  config: ValidationConfig
): { isValid: boolean; issues: string[]; recommendations: string[] } {
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (metrics.predictionAccuracyRate < config.targetAccuracyRate) {
    issues.push(
      `Accuracy rate (${(metrics.predictionAccuracyRate * 100).toFixed(1)}%) below target (${(config.targetAccuracyRate * 100).toFixed(1)}%)`
    );
    recommendations.push('Implement user feedback mechanisms to improve prediction accuracy');
    recommendations.push('Analyze inaccurate predictions to identify patterns in failures');
  }

  if (metrics.totalPredictions === 0) {
    issues.push('No predictions have been made yet');
    recommendations.push('Encourage user activity to generate prediction opportunities');
  } else if (metrics.totalPredictions < 10) {
    issues.push(`Low prediction volume (${metrics.totalPredictions}), insufficient data for reliable metrics`);
    recommendations.push('Allow more time for system to gather data');
  }

  if (config.feedbackCollectionEnabled && metrics.feedbackReceived === 0) {
    issues.push('No user feedback received, limiting learning capability');
    recommendations.push('Prompt users to provide feedback on predictions');
  }

  const isValid = issues.length === 0 && metrics.predictionAccuracyRate >= config.targetAccuracyRate;
  return { isValid, issues, recommendations };
}