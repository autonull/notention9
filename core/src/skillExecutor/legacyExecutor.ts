import type { Note } from '../types/index.js';
import type { SkillDefinition, SkillMatch } from '../skillPatternMatcher.js';
import type { SkillApprovalManager } from '../skillApprovalManager.js';
import type { NetworkGate } from '../networkGate.js';
import type { Logger } from '../utils/logging.js';
import type { SkillExecutionResult } from './types.js';
import { transformResults } from './resultTransformer.js';

export interface LegacySkillExecutorConfig {
    approvalManager: SkillApprovalManager;
    networkGate: NetworkGate;
    logger: Logger;
}

/**
 * Execute a legacy skill definition
 */
export async function executeLegacySkill(
    note: Note,
    skill: SkillDefinition,
    match: SkillMatch,
    autoExecute: boolean,
    config: LegacySkillExecutorConfig,
    onResultNotes?: (notes: Note[], sourceNote: Note, skill: SkillDefinition) => void
): Promise<SkillExecutionResult> {
    const { approvalManager, networkGate, logger } = config;

    try {
        if (autoExecute) {
            const approved = await approvalManager.requestApproval(skill, match);
            if (!approved) {
                return {
                    success: false,
                    error: 'Skill execution not approved by user'
                };
            }
        }

        const canTransmit = await networkGate.canTransmit(
            note,
            `${skill.name} (external API)`,
            undefined
        ).catch(() => false);

        if (!canTransmit && note.privacy !== 'public') {
            logger.info(`[SkillExecutor] Skipping ${skill.id} - note is private`);
            return {
                success: false,
                error: 'Cannot execute skill on private note'
            };
        }

        const exportParams = mapToExternal(note, skill);

        if (!skill.execute) {
            return {
                success: false,
                error: 'Skill has no execute function'
            };
        }

        logger.info(`[SkillExecutor] Executing ${skill.name} with params:`, exportParams);

        const data = await skill.execute(note.properties);

        const resultNotes = transformResults(data, note, skill);

        if (resultNotes.length > 0 && onResultNotes) {
            onResultNotes(resultNotes, note, skill);
        }

        return {
            success: true,
            data,
            resultNotes
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[SkillExecutor] Error executing ${skill.name}:`, error instanceof Error ? error : new Error(errorMessage));
        return {
            success: false,
            error: errorMessage
        };
    }
}

/**
 * Map note properties to external API parameters using skill's export mapping
 */
function mapToExternal(note: Note, skill: SkillDefinition): Record<string, any> {
    if (!skill.exportMapping) {
        return {};
    }

    const params: Record<string, any> = {};

    for (const [internalKey, externalKey] of Object.entries(skill.exportMapping)) {
        const prop = note.properties.find(p => p.key === internalKey);
        if (prop && prop.values.length > 0) {
            params[externalKey] = prop.values[0];
        }
    }

    return params;
}
