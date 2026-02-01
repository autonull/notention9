export * from './types/index.js';
export * from './errorTypes.js';
export * from './nostr.js';
export * from './ontology.default.js';
export * from './ontologyHelpers.js';
export * from './properties.js';
export * from './parsing.js';
export * from './dateParsing.js';
export * from './notes.js';
export * from './conflicts.js';
export * from './constants.js';
export * from './quantities.js';
export * from './matching.js';
export * from './templates.js';
export * from './networkGate.js';
export * from './skills/types.js';
export * from './feedback/types.js';

// Ontology-driven services (Phase 1.4 & 2)
export * from './ontologyService.js';
export * from './ontologyServiceFactory.js';
export * from './propertyExtractor.js';
export * from './queryBuilder.js';

// Skill system (Phase 4)
export * from './skills/BaseSkill.js';
export * from './skills/SkillRegistry.js';
export * from './skillPatternMatcher.js';
export * from './skillApprovalManager.js';
export * from './skillExecutor.js';

// Sovereign Thought System (Phase 5)
export * from './decomposer/LifeDecomposer.js';

// Security (Phase 5.1/5.3)
export * from './security/CredentialManager.js';

// Thought Runtime (Phase 5)
export * from './thoughts/ThoughtRuntime.js';

// Network (Phase 3/5)
export * from './network/ResonanceProtocol.js';
export * from './network/PublicMatching.js';

// Sync (Phase 4/5)
export * from './sync/MerkleThoughtTree.js';
