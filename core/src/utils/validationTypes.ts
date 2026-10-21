export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface AttributeValidationResult {
  isValid: boolean;
  message: string;
}