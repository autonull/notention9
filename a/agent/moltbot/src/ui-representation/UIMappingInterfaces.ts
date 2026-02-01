// Interfaces for representing ClawdBot functionality in the Notention UI

// Represents a ClawdBot agent/workflow in the UI
export interface AgentRepresentation {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'paused' | 'error';
  type: string; // 'conditional', 'scheduled', 'monitoring', 'communication', etc.
  createdAt: string;
  lastRun?: string;
  nextRun?: string;
  triggers: TriggerRepresentation[];
  actions: ActionRepresentation[];
  conditions: ConditionRepresentation[];
  statistics?: AgentStatistics;
}

// Statistics for an agent
export interface AgentStatistics {
  runs: number;
  successes: number;
  failures: number;
  lastError?: string;
  avgRuntime?: number;
}

// Represents a trigger in the UI
export interface TriggerRepresentation {
  id: string;
  type: string; // 'time', 'note_change', 'external_event', 'condition_met'
  description: string;
  enabled: boolean;
  configuration: any;
  lastTriggered?: string;
}

// Represents an action in the UI
export interface ActionRepresentation {
  id: string;
  type: string; // 'execute_command', 'send_message', 'modify_note', 'external_api', etc.
  description: string;
  enabled: boolean;
  configuration: any;
  lastExecuted?: string;
  lastResult?: any;
}

// Represents a condition in the UI
export interface ConditionRepresentation {
  id: string;
  type: string; // 'time', 'sensor', 'state', 'external', 'note_property'
  expression: string;
  description: string;
  currentValue?: any;
  lastEvaluated?: string;
  satisfied: boolean;
}

// Represents the UI state for an agent
export interface AgentUIState {
  expanded: boolean;
  selected: boolean;
  highlighted: boolean;
  editing: boolean;
  configuration: any;
}

// Interface for converting ClawdBot entities to UI representations
export interface RepresentationConverter {
  /**
   * Convert a ClawdBot configuration to a UI representation
   */
  toAgentRepresentation(config: any): AgentRepresentation;

  /**
   * Convert UI representation back to ClawdBot configuration
   */
  fromAgentRepresentation(representation: AgentRepresentation): any;

  /**
   * Update an existing representation with new data
   */
  updateRepresentation(current: AgentRepresentation, newData: any): AgentRepresentation;

  /**
   * Create a default representation for a new agent
   */
  createDefaultRepresentation(type: string): AgentRepresentation;
}

// Interface for UI visualization components
export interface VisualizationComponent {
  /**
   * Render the component for a specific agent
   */
  render(agent: AgentRepresentation, state: AgentUIState): string;

  /**
   * Handle user interactions with the component
   */
  handleInteraction(agentId: string, action: string, data: any): void;

  /**
   * Get the component type
   */
  getType(): string;
}

// Interface for UI metaphor mapping
export interface UIMetaphorMapper {
  /**
   * Map a ClawdBot concept to a Notention UI metaphor
   */
  mapToMetaphor(clawdBotConcept: any): UIMetaphor;

  /**
   * Map a UI metaphor back to a ClawdBot concept
   */
  mapFromMetaphor(metaphor: UIMetaphor): any;

  /**
   * Get available metaphors
   */
  getAvailableMetaphors(): UIMetaphor[];
}

// Represents a UI metaphor
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