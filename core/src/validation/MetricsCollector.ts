import { predictionAccuracyTracker } from '../patternRecognition/predictionTracking.js';
import { logInfo, logWarn } from '../utils/logging.js';
import type { AccuracyMetrics } from './ValidationConfig.js';

export class MetricsCollector {
  private reports: ValidationReport[] = [];

  constructor(private readonly maxReports = 100) {}

  collect(userId?: string): AccuracyMetrics {
    try {
      return userId
        ? predictionAccuracyTracker.getUserAccuracyMetrics(userId)
        : predictionAccuracyTracker.getAccuracyMetrics();
    } catch (err) {
      logWarn('Metrics collection failed', { error: (err as Error).message });
      throw err;
    }
  }

  addReport(report: ValidationReport): void {
    this.reports.push(report);
    if (this.reports.length > this.maxReports) {
      this.reports = this.reports.slice(-this.maxReports);
    }
  }

  getLatestReports(count = 5): ValidationReport[] {
    return this.reports.slice(-count).reverse();
  }

  getAllReports(): ValidationReport[] {
    return [...this.reports].reverse();
  }

  clear(): void {
    this.reports = [];
  }
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

export interface ValidationResult {
  isValid: boolean;
  metrics: AccuracyMetrics;
  issues: string[];
  recommendations: string[];
  confidence: number;
}