import type { OntologyNode } from '@notention/core';
import {
    type ExtractionSchema,
    type PropertySchema,
    type ExtractionPrompt,
    type ExtractionExample,
    type RepairResult,
    generateExtractionSchema,
    buildExtractionPrompt,
    repairExtraction,
    validateAgainstSchema,
} from '@notention/core/ontology/schema';

/**
 * Re-export types from core for backward compatibility
 */
export type {
    ExtractionSchema,
    PropertySchema,
    ExtractionPrompt,
    ExtractionExample,
    RepairResult,
};

/**
 * Re-export functions from core for backward compatibility
 */
export {
    generateExtractionSchema,
    buildExtractionPrompt,
    repairExtraction,
    validateAgainstSchema,
};