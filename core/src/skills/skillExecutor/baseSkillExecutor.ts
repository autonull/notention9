import type { Note, Property } from '../../types/index.js';
import type { BaseSkill } from '../BaseSkill.js';
import type { NetworkGate } from '../../network/networkGate.js';
import type { Logger } from '../../utils/logging.js';
import type { SkillExecutionResult } from './types.js';
import { createResultNote } from './resultTransformer.js';
import { CapabilityManager } from '../../security/CapabilityManager.js';

export interface BaseSkillExecutorConfig {
    networkGate: NetworkGate;
    logger: Logger;
}

/**
 * Execute a BaseSkill instance
 */
export async function executeBaseSkill(
    note: Note,
    skill: BaseSkill,
    autoExecute: boolean,
    config: BaseSkillExecutorConfig,
    onResultNotes?: (notes: Note[], sourceNote: Note, skill: BaseSkill) => void
): Promise<SkillExecutionResult> {
    const { networkGate, logger } = config;

    try {
        const canTransmit = await networkGate.canTransmit(
            note,
            `${skill.getName()} (external API)`,
            undefined
        ).catch(() => false);

        if (!canTransmit && note.privacy !== 'public') {
            logger.info(`[SkillExecutor] Skipping ${skill.getId()} - note is private`);
            return {
                success: false,
                error: 'Cannot execute skill on private note'
            };
        }

        const capabilityManager = new CapabilityManager();
        const permissions = capabilityManager.extractPermissions(note.properties);

        logger.info(`[SkillExecutor] Executing ${skill.getName()} with properties:`, note.properties);

        const data = await skill.execute(note.properties);

        const properties = mapExternalToProperties(data, skill);

        const resultNotes = [createResultNote(data, note, properties, skill)];

        if (resultNotes.length > 0 && onResultNotes) {
            onResultNotes(resultNotes, note, skill);
        }

        return {
            success: true,
            data,
            resultNotes
        };
    } catch (error: any) {
        logger.error(`[SkillExecutor] Error executing ${skill.getName()}:`, error);
        return {
            success: false,
            error: error.message || 'Unknown error'
        };
    }
}

/**
 * Map external data to properties using skill's mapping
 */
function mapExternalToProperties(data: any, skill: BaseSkill): Property[] {
    if (skill['mapExternalToProperties']) {
        return skill['mapExternalToProperties'](data, {});
    }

    // Fallback: create minimal properties from data
    const properties: Property[] = [];

    if (typeof data === 'object' && data !== null) {
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && value !== null) {
                properties.push({
                    key: key.toLowerCase(),
                    operator: ':',
                    values: [String(value)]
                });
            }
        }
    }

    return properties;
}
