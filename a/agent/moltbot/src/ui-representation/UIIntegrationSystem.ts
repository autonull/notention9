import {
  AgentRepresentation,
  UIMetaphor,
  RepresentationConverter,
  UIMetaphorMapper,
  VisualizationComponent
} from './UIMappingInterfaces';
import { ClawdBotRepresentationConverter } from './ClawdBotRepresentationConverter';
import { NotentionUIMetaphorMapper } from './NotentionUIMetaphorMapper';
import { AgentVisualizationComponent } from './AgentVisualizationComponent';

export interface UIIntegrationContext {
  gateway: any;
  strategyManager: any;
  pluginManager: any;
  logger: any;
  noteId?: string;
  agentId?: string;
}

export interface UIIntegrationResult {
  success: boolean;
  message: string;
  data?: any;
  uiElements?: string[];
}

export class UIIntegrationSystem {
  private converter: RepresentationConverter;
  private metaphorMapper: UIMetaphorMapper;
  private visualizationComponents: Map<string, VisualizationComponent>;

  constructor() {
    this.converter = new ClawdBotRepresentationConverter();
    this.metaphorMapper = new NotentionUIMetaphorMapper();
    this.visualizationComponents = new Map();

    // Register default visualization components
    this.registerVisualizationComponent('default', new AgentVisualizationComponent());
    this.registerVisualizationComponent('agent', new AgentVisualizationComponent('agent'));
  }

  /**
   * Register a new visualization component
   */
  registerVisualizationComponent(type: string, component: VisualizationComponent): void {
    this.visualizationComponents.set(type, component);
  }

  /**
   * Convert a ClawdBot configuration to UI representation
   */
  convertToUIRepresentation(clawdBotConfig: any): AgentRepresentation {
    return this.converter.toAgentRepresentation(clawdBotConfig);
  }

  /**
   * Convert UI representation back to ClawdBot configuration
   */
  convertFromUIRepresentation(uiRepresentation: AgentRepresentation): any {
    return this.converter.fromAgentRepresentation(uiRepresentation);
  }

  /**
   * Map a ClawdBot concept to a Notention UI metaphor
   */
  mapToUIMetaphor(clawdBotConcept: any): UIMetaphor {
    return this.metaphorMapper.mapToMetaphor(clawdBotConcept);
  }

  /**
   * Render a visualization for an agent
   */
  renderAgentVisualization(agent: AgentRepresentation, expanded: boolean = false): string {
    const component = this.visualizationComponents.get('agent') || this.visualizationComponents.get('default');
    if (!component) {
      return `<div class="agent-placeholder">No visualization component available</div>`;
    }

    return component.render(agent, {
      expanded,
      selected: false,
      highlighted: false,
      editing: false,
      configuration: {}
    });
  }

  /**
   * Generate UI elements for displaying ClawdBot functionality in Notention
   */
  generateUIDisplayElements(context: UIIntegrationContext): UIIntegrationResult {
    try {
      const elements: string[] = [];

      // If we have a specific agent ID, render that agent
      if (context.agentId) {
        // In a real implementation, this would fetch the agent config from ClawdBot
        const mockAgentConfig = {
          id: context.agentId,
          name: `Agent ${context.agentId}`,
          description: 'Mock agent for demonstration',
          type: 'conditional',
          status: 'active',
          triggers: [{ description: 'Time-based trigger' }],
          actions: [{ description: 'Send notification' }],
          conditions: [{ description: 'Temperature > 75°F', satisfied: true }]
        };

        const representation = this.convertToUIRepresentation(mockAgentConfig);
        const visualization = this.renderAgentVisualization(representation);
        elements.push(visualization);
      }
      // If we have a note ID, analyze it for potential agents
      else if (context.noteId) {
        // In a real implementation, this would analyze the note for potential automation
        elements.push(this.generateNoteAutomationSuggestions(context.noteId));
      }
      // Otherwise, provide an overview of active agents
      else {
        elements.push(this.generateActiveAgentsOverview());
      }

      return {
        success: true,
        message: `Generated ${elements.length} UI elements`,
        uiElements: elements
      };
    } catch (error) {
      return {
        success: false,
        message: `Error generating UI elements: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generate suggestions for automating a note
   */
  private generateNoteAutomationSuggestions(noteId: string): string {
    return `
      <div class="automation-suggestions" data-note-id="${noteId}">
        <h4>Potential Automations</h4>
        <p>This note might benefit from automation. Would you like to create an agent?</p>
        <button class="btn btn-primary" onclick="createAgentFromNote('${noteId}')">
          Create Automation Agent
        </button>
      </div>
      <script>
        function createAgentFromNote(noteId) {
          if (window.uiWebSocket && window.uiWebSocket.readyState === WebSocket.OPEN) {
            window.uiWebSocket.send(JSON.stringify({
              type: 'create_agent_from_note',
              payload: { noteId }
            }));
          }
        }
      </script>
    `;
  }

  /**
   * Generate an overview of active agents
   */
  private generateActiveAgentsOverview(): string {
    // In a real implementation, this would fetch active agents from ClawdBot
    return `
      <div class="agents-overview">
        <h4>Active Automation Agents</h4>
        <p>No agents currently active. Create agents from your notes to automate tasks.</p>
        <button class="btn btn-secondary" onclick="showAgentCreation()">
          Create New Agent
        </button>
      </div>
      <script>
        function showAgentCreation() {
          // Show agent creation UI
          if (window.uiWebSocket && window.uiWebSocket.readyState === WebSocket.OPEN) {
            window.uiWebSocket.send(JSON.stringify({
              type: 'show_agent_creation_ui'
            }));
          }
        }
      </script>
    `;
  }

  /**
   * Get available UI metaphors for the user to choose from
   */
  getAvailableMetaphors(): UIMetaphor[] {
    return this.metaphorMapper.getAvailableMetaphors();
  }

  /**
   * Process a UI interaction and convert it to a ClawdBot action
   */
  processUIInteraction(interaction: any): any {
    // Convert UI interaction to ClawdBot command
    switch (interaction.type) {
      case 'agent_control':
        return {
          type: 'clawdbot_command',
          command: 'control_agent',
          parameters: {
            agentId: interaction.payload.agentId,
            action: interaction.payload.action
          }
        };
      case 'create_agent_from_note':
        return {
          type: 'clawdbot_command',
          command: 'create_agent_from_note',
          parameters: {
            noteId: interaction.payload.noteId
          }
        };
      case 'agent_ui_state_change':
        return {
          type: 'ui_state_update',
          agentId: interaction.payload.agentId,
          state: interaction.payload.expanded
        };
      default:
        return {
          type: 'unknown_interaction',
          original: interaction
        };
    }
  }
}