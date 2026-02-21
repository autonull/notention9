
// Represents a UI metaphor for the Notention system
export interface UIMetaphor {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string; // 'automation', 'monitoring', 'communication', 'scheduling', etc.
  template: string; // Template for creating the metaphor in the UI
  properties: MetaphorProperty[];
}

// Property of a UI metaphor
export interface MetaphorProperty {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'time' | 'enum' | 'object';
  label: string;
  description: string;
  required: boolean;
  defaultValue?: any;
  options?: string[]; // For enum types
}

// Interface for UI metaphor mapping logic
export interface UIMetaphorMapper {
  /**
   * Map a concept to a Notention UI metaphor
   */
  mapToMetaphor(concept: any): UIMetaphor | null;

  /**
   * Map a UI metaphor back to a concept
   */
  mapFromMetaphor(metaphor: UIMetaphor): any;

  /**
   * Get available metaphors
   */
  getAvailableMetaphors(): UIMetaphor[];
}
