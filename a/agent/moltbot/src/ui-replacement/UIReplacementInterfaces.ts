// Interfaces for complete UI replacement functionality

// Represents a UI replacement component that can replace ClawdBot UI elements
export interface UIReplacementComponent {
  id: string;
  name: string;
  description: string;
  type: 'panel' | 'widget' | 'modal' | 'sidebar' | 'toolbar' | 'editor-extension';
  position?: string; // Where to place the component (top, bottom, left, right, etc.)
  priority: number; // Higher numbers appear first
  enabled: boolean;

  // Function to generate the UI element
  render(context: UIReplacementContext): string;

  // Handle user interactions
  handleInteraction(interaction: UIInteraction): void;

  // Check if this component should be displayed in the current context
  shouldDisplay(context: UIReplacementContext): boolean;
}

// Context passed to UI replacement components
export interface UIReplacementContext {
  currentPage: string; // Current Notention page/view
  selectedNote?: any; // Currently selected note
  activeAgents?: any[]; // Currently active agents
  clawdBotStatus: any; // Current ClawdBot status
  userPreferences: any; // User preferences for UI
  [key: string]: any; // Additional context
}

// User interaction with a UI replacement component
export interface UIInteraction {
  componentId: string;
  action: string; // 'click', 'hover', 'drag', 'input', etc.
  data: any; // Additional data about the interaction
  timestamp: string;
}

// Manager for UI replacement components
export interface UIReplacementManager {
  registerComponent(component: UIReplacementComponent): void;
  unregisterComponent(id: string): boolean;
  getComponents(context: UIReplacementContext): UIReplacementComponent[];
  renderAll(context: UIReplacementContext): string[];
  handleInteraction(interaction: UIInteraction): void;
}

// Metaphor for representing ClawdBot functionality in Notention UI
export interface FunctionalityMetaphor {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string; // 'automation', 'monitoring', 'communication', etc.

  // Maps ClawdBot functionality to Notention UI concepts
  toNotentionConcept(clawdBotFunction: any): NotentionConcept;

  // Maps Notention UI interactions to ClawdBot commands
  toClawdBotCommand(notentionAction: NotentionAction): any;
}

// A concept in the Notention UI
export interface NotentionConcept {
  type: string; // 'note', 'tag', 'property', 'relationship', etc.
  representation: string; // How it's represented in the UI
  actions: NotentionAction[]; // Available actions
  properties: any; // Associated properties
}

// An action in the Notention UI
export interface NotentionAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  handler: (context: any) => void;
  time?: string;
}

// UI replacement strategy
export interface UIReplacementStrategy {
  id: string;
  name: string;
  description: string;

  // Determine if this strategy applies to the current situation
  canApply(context: UIReplacementContext): boolean;

  // Apply the replacement
  apply(context: UIReplacementContext): UIReplacementComponent[];
}