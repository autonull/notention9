import type {
  ValidationConfig,
  ValidationResult,
  ValidationReport,
  ABTestConfig,
  ABTestResult,
  AccuracyMetrics
} from './ValidationConfig.js';
import { DEFAULT_VALIDATION_CONFIG, evaluateValidation, calculateConfidence } from './ValidationConfig.js';
import { MetricsCollector } from './MetricsCollector.js';
import { ABTestManager } from './ABTestManager.js';
import { ValidationReporter } from './ValidationReporter.js';
import { logInfo, logWarn } from '../utils/logging.js';
import { ValidationError } from '../utils/errors/index.js';

export class ValidationFramework {
  private config: ValidationConfig;
  private readonly metricsCollector: MetricsCollector;
  private readonly abTestManager: ABTestManager;
  private readonly reporter: ValidationReporter;

  constructor(config?: Partial<ValidationConfig>) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    this.metricsCollector = new MetricsCollector();
    this.abTestManager = new ABTestManager(this.config.aBTestingEnabled);
    this.reporter = new ValidationReporter(this.config);
  }

  validatePredictionSystem(userId?: string): ValidationResult {
    try {
      const metrics = this.metricsCollector.collect(userId);
      const validation = evaluateValidation(metrics, this.config);
      const confidence = calculateConfidence(metrics, this.config.targetAccuracyRate);

      const result: ValidationResult = {
        isValid: validation.isValid,
        metrics,
        issues: validation.issues,
        recommendations: validation.recommendations,
        confidence
      };

      logInfo('Validation completed', {
        userId: userId ?? 'all_users',
        isValid: result.isValid,
        accuracyRate: (metrics.predictionAccuracyRate * 100).toFixed(1) + '%',
        issuesCount: result.issues.length
      });

      return result;
    } catch (err) {
      logWarn('Validation failed', { error: (err as Error).message });
      throw new ValidationError('Failed to validate prediction system', { originalError: err });
    }
  }

  generateValidationReport(period: 'daily' | 'weekly' | 'monthly' = 'daily'): ValidationReport {
    const metrics = this.metricsCollector.collect();
    const report = this.reporter.generateReport(metrics, period);
    this.metricsCollector.addReport(report);
    return report;
  }

  startABTest(config: ABTestConfig): boolean {
    return this.abTestManager.startTest(config);
  }

  evaluateABTest(testName: string): ABTestResult | null {
    const metrics = this.metricsCollector.collect();
    return this.abTestManager.evaluateTest(testName, metrics);
  }

  getLatestReports(count = 5): ValidationReport[] {
    return this.metricsCollector.getLatestReports(count);
  }

  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.abTestManager.setEnabled(this.config.aBTestingEnabled);
    logInfo('Validation configuration updated', { newConfig: this.config });
  }

  getConfig(): ValidationConfig {
    return { ...this.config };
  }

  getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }

  getABTestManager(): ABTestManager {
    return this.abTestManager;
  }
}

export const validationFramework = new ValidationFramework();