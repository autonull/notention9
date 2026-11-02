/**
 * Optimizer Package - Public API
 * Consolidates all optimizer modules
 */

// Candidate Generators (R1)
export * from './candidateGenerators.js';

// Budget Allocators (R6)
export * from './budgetAllocators.js';

// Strategy Loader (R3)
export * from './strategyLoader.js';

// Resolution Pipeline (R4, R5)
export * from './resolutionPipeline.js';

// Declarative Config (R7)
export * from './declarativeConfig.js';

// Types
export * from './types.js';