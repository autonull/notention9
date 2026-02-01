// Interface for translating notes to ClawdBot actions/configurations
export interface NoteTranslationStrategy {
  /**
   * Determines if this strategy can handle a given note
   */
  canHandle(note: any): boolean;

  /**
   * Translates a note into ClawdBot actions or configurations
   */
  translate(note: any): Promise<ClawdBotAction[] | ClawdBotConfiguration>;

  /**
   * Gets the priority of this strategy (higher numbers are tried first)
   */
  getPriority(): number;

  /**
   * Gets the name/type of this strategy
   */
  getName(): string;
}

// Represents an action that can be sent to ClawdBot
export interface ClawdBotAction {
  id: string;
  type: string; // e.g., 'schedule', 'communicate', 'execute', 'monitor'
  description: string;
  parameters: Record<string, any>;
  conditions?: Condition[];
  schedule?: Schedule;
  priority?: number;
}

// Represents a configuration for ClawdBot
export interface ClawdBotConfiguration {
  id: string;
  type: string; // e.g., 'agent', 'workflow', 'monitor'
  settings: Record<string, any>;
  triggers: Trigger[];
  actions: ClawdBotAction[];
}

// Condition that must be met for an action to execute
export interface Condition {
  type: string; // e.g., 'time', 'sensor', 'state', 'external'
  expression: string;
  parameters: Record<string, any>;
}

// Schedule for when an action should execute
export interface Schedule {
  type: string; // e.g., 'once', 'recurring', 'conditional'
  expression: string; // cron-like expression or natural language
  timezone?: string;
}

// Trigger that initiates a workflow
export interface Trigger {
  type: string; // e.g., 'note_change', 'time', 'external_event', 'condition_met'
  conditions: Condition[];
}

// Context for translation strategies
export interface TranslationContext {
  note: any;
  gateway: any; // ClawdBot gateway
  pluginManager: any;
  logger: any;
}