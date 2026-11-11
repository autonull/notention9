export interface NoteValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface PropertyValidationResult {
  isValid: boolean;
  message: string;
}