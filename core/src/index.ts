export * from './types/index.js';
export * from './errorTypes.js';
export * from './nostr.js';
export * from './ontology.default.js';
export * from './ontologyHelpers.js';
export * from './properties.js';
export * from './parsing.js';
export * from './dateParsing.js';
export * from './notes.js';
export * from './spacetime.js';
export * from './conflicts.js';
export * from './constants.js';
export * from './quantities.js';
export * from './templates.js';
export * from './networkGate.js';
export * from './skills/types.js';
export * from './feedback/types.js';

// Utilities
export * from './utils/common.js';
export * from './utils/errors.js';
export * from './utils/logging.js';
export * from './utils/tools.js';
export * from './utils/concurrency.js';
export * from './baseService.js';

// Pattern Recognition and Prediction (Phase 1)
export * from './patternRecognition.js';
export * from './predictionTracking.js';
export { ValidationFramework, validationFramework } from './validationFramework.js';
export * from './autonomousTasks.js';

// Ontology-driven services (Phase 1.4 & 2)
export * from './ontologyService.js';
export * from './ontologyServiceFactory.js';
export * from './propertyExtractor.js';
export * from './queryBuilder.js';

// Skill system (Phase 4)
export * from './skills/BaseSkill.js';
export * from './skills/IndeedSkill.js';
export * from './skills/CraigslistSkill.js';
export * from './skills/GitHubSkill.js';
export * from './skills/ReminderSkill.js';
export * from './skills/SkillRegistry.js';
export * from './skillPatternMatcher.js';
export * from './skillApprovalManager.js';
export * from './skillExecutor.js';

// Onboarding (Phase 1.1)
export * from './onboarding/types.js';
export * from './onboarding/OnboardingService.js';

// Configuration (Phase 1.3)
export * from './config/NoteBasedConfig.js';

// Metaphor System (Phase 3)
export * from './metaphor/MetaphorRegistry.js';
export * from './metaphor/MetaphorMapper.js';
