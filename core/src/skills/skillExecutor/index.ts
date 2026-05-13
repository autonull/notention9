/**
 * Skill Executor Utilities
 * 
 * Modular execution strategies for different skill types:
 * - legacyExecutor: Execute legacy SkillDefinition skills
 * - baseSkillExecutor: Execute BaseSkill class instances
 * - resultTransformer: Transform and create result notes
 */

export { executeLegacySkill, type LegacySkillExecutorConfig } from './legacyExecutor.js';
export { executeBaseSkill, type BaseSkillExecutorConfig } from './baseSkillExecutor.js';
export { createResultNote, transformResults, type SkillResult } from './resultTransformer.js';
export { type SkillExecutionContext, type SkillExecutionResult } from './types.js';
