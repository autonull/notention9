export * from './types/index.js';

// Domain barrels
export * from './notes/index.js';
export * from './matching/index.js';
export * from './ontology/index.js';
export * from './network/index.js';
export * from './skills/index.js';

// Utils - explicit re-exports to avoid ValidationResult conflict with validation framework
export * from './utils/errors/index.js';
export * from './utils/common.js';
export * from './utils/logging.js';
export * from './utils/agentLogging.js';
export * from './utils/encoding.js';
export * from './utils/string.js';
export * from './utils/tools.js';
export * from './utils/commands.js';
export * from './utils/csvExport.js';
export * from './utils/baseService.js';
export * from './utils/autonomousTasks.js';
export * from './utils/inference.js';
export * from './utils/matching.js';
export * from './utils/html.js';
export * from './utils/dateParsing.js';
export * from './utils/constants.js';
export * from './utils/geo.js';

export * from './templates/index.js';
export * from './patternRecognition/index.js';
export * from './security/index.js';
export * from './config/index.js';
export * from './onboarding/index.js';
export * from './export/index.js';
export * from './tools/index.js';
export * from './remote/index.js';
export * from './testing/index.js';
export * from './fixtures/index.js';

// Tasks & Validation
export * from './tasks/index.js';

// Validation Framework - explicit re-exports to avoid conflicts with utils
export {
  ValidationFramework,
  validationFramework,
  type ValidationConfig as ValidationFrameworkConfig,
  type ValidationResult as ValidationFrameworkResult,
  type ValidationReport as ValidationFrameworkReport,
  type ABTestConfig,
  type ABTestResult,
  type AccuracyMetrics,
  DEFAULT_VALIDATION_CONFIG,
  getPeriodConfig,
  calculateConfidence,
  evaluateValidation,
  MetricsCollector,
  ABTestManager,
  ValidationReporter
} from './validation/index.js';

// Nostr-specific (keep separate for optional dependency)
export * from './network/nostr/nostr.js';
export * from './network/nostr/privacy.js';
export * from './network/nostr/discovery.js';