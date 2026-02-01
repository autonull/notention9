import {
  UIReplacementContext,
  UIInteraction,
  UIReplacementStrategy
} from './UIReplacementInterfaces';
import { NotentionUIReplacementManager } from './NotentionUIReplacementManager';
import { AgentControlPanel } from './AgentControlPanel';
import { AutomationSuggestionWidget } from './AutomationSuggestionWidget';
import {
  ConditionalAutomationMetaphor,
  ScheduledTaskMetaphor,
  MonitoringAgentMetaphor
} from './MetaphorSystem';

export class ComprehensiveUIReplacementSystem {
  private manager: NotentionUIReplacementManager;
  private metaphors: Map<string, any>;
  private strategies: UIReplacementStrategy[];

  constructor() {
    this.manager = new NotentionUIReplacementManager();
    this.metaphors = new Map();
    this.strategies = [];

    // Register default UI replacement components
    this.registerDefaultComponents();

    // Register default metaphors
    this.registerDefaultMetaphors();

    // Register default strategies
    this.registerDefaultStrategies();
  }

  private registerDefaultComponents(): void {
    this.manager.registerComponent(new AgentControlPanel());
    this.manager.registerComponent(new AutomationSuggestionWidget());
  }

  private registerDefaultMetaphors(): void {
    const condAuto = new ConditionalAutomationMetaphor();
    const schedTask = new ScheduledTaskMetaphor();
    const monAgent = new MonitoringAgentMetaphor();

    this.metaphors.set(condAuto.id, condAuto);
    this.metaphors.set(schedTask.id, schedTask);
    this.metaphors.set(monAgent.id, monAgent);
  }

  private registerDefaultStrategies(): void {
    // Add default strategies here
  }

  /**
   * Generate UI replacement elements for the current context
   */
  generateUIReplacements(context: UIReplacementContext): string[] {
    return this.manager.renderAll(context);
  }

  /**
   * Handle a user interaction with a UI replacement component
   */
  handleInteraction(interaction: UIInteraction): void {
    this.manager.handleInteraction(interaction);
  }

  /**
   * Get a metaphor by ID
   */
  getMetaphor(id: string): any | undefined {
    return this.metaphors.get(id);
  }

  /**
   * Get all available metaphors
   */
  getAllMetaphors(): any[] {
    return Array.from(this.metaphors.values());
  }

  /**
   * Transform a ClawdBot concept using the appropriate metaphor
   */
  transformClawdBotConcept(concept: any): any {
    // Determine the appropriate metaphor based on the concept type
    const metaphorId = concept.type || concept.category || 'conditional-automation';
    const metaphor = this.getMetaphor(metaphorId);

    if (metaphor) {
      return metaphor.toNotentionConcept(concept);
    }

    // Default to conditional automation metaphor
    const defaultMetaphor = this.getMetaphor('conditional-automation');
    return defaultMetaphor ? defaultMetaphor.toNotentionConcept(concept) : concept;
  }

  /**
   * Convert a Notention UI action to a ClawdBot command
   */
  convertToClawdBotCommand(action: any): any {
    const metaphorId = action.metaphorId || 'conditional-automation';
    const metaphor = this.getMetaphor(metaphorId);

    if (metaphor) {
      return metaphor.toClawdBotCommand(action);
    }

    // Default conversion
    return {
      type: 'clawdbot_command',
      command: 'unknown',
      parameters: action
    };
  }

  /**
   * Register a new UI replacement component
   */
  registerComponent(component: any): void {
    this.manager.registerComponent(component);
  }

  /**
   * Register a new metaphor
   */
  registerMetaphor(metaphor: any): void {
    this.metaphors.set(metaphor.id, metaphor);
  }

  /**
   * Register a new replacement strategy
   */
  registerStrategy(strategy: UIReplacementStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Get the UI replacement manager
   */
  getManager(): NotentionUIReplacementManager {
    return this.manager;
  }
}