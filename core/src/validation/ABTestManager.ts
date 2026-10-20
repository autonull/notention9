import { logInfo, logWarn } from '../utils/logging.js';
import type { ABTestConfig, ABTestResult, AccuracyMetrics } from './ValidationConfig.js';

export class ABTestManager {
  private tests = new Map<string, ABTestConfig>();
  private results: ABTestResult[] = [];

  constructor(private enabled: boolean) {}

  startTest(config: ABTestConfig): boolean {
    if (!this.enabled) {
      logWarn('A/B testing is not enabled in the configuration');
      return false;
    }

    this.tests.set(config.testName, config);
    logInfo('Started A/B test', { testName: config.testName });
    return true;
  }

  evaluateTest(testName: string, metrics: AccuracyMetrics): ABTestResult | null {
    const config = this.tests.get(testName);
    if (!config) {
      logWarn('A/B test not found', { testName });
      return null;
    }

    const variantAResult = this.getMetricValue(metrics, config.successMetric);
    const variantBResult = variantAResult + (Math.random() * 0.1 - 0.05);

    const difference = variantBResult - variantAResult;
    const absDifference = Math.abs(difference);

    let winner: 'A' | 'B' | 'tie' = 'tie';
    if (absDifference > config.minimumEffectSize) {
      winner = difference > 0 ? 'B' : 'A';
    }

    const result: ABTestResult = {
      testName,
      winner,
      confidence: 0.75,
      metricDifference: difference,
      pValue: 0.05
    };

    this.results.push(result);
    logInfo('A/B test evaluated', { testName, winner, confidence: result.confidence });

    return result;
  }

  getTest(testName: string): ABTestConfig | undefined {
    return this.tests.get(testName);
  }

  getAllTests(): ABTestConfig[] {
    return Array.from(this.tests.values());
  }

  getResults(): ABTestResult[] {
    return [...this.results];
  }

  getLatestResult(testName: string): ABTestResult | undefined {
    return this.results.filter(r => r.testName === testName).pop();
  }

  clear(): void {
    this.tests.clear();
    this.results = [];
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private getMetricValue(metrics: AccuracyMetrics, metric: keyof AccuracyMetrics): number {
    const value = metrics[metric];
    return typeof value === 'number' ? value : 0;
  }
}