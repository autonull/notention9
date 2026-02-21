import { validateAttributeValue, type AttributeValidationResult } from '@notention/core';

// Re-export for compatibility
export type ValidationResult = AttributeValidationResult;
export const validatePropertyAgainstOntology = validateAttributeValue;
