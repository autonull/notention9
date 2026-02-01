import {
  UIReplacementComponent,
  UIReplacementContext,
  UIInteraction
} from './UIReplacementInterfaces';

export class AgentControlPanel implements UIReplacementComponent {
  id = 'agent-control-panel';
  name = 'Agent Control Panel';
  description = 'Control and monitor your automation agents';
  type: 'panel' = 'panel';
  position = 'right';
  priority = 100;
  enabled = true;

  render(context: UIReplacementContext): string {
    const agents = context.activeAgents || [];

    let html = `
      <div class="agent-control-panel" id="agent-control-panel">
        <div class="panel-header">
          <h3>Automation Agents</h3>
          <button class="btn btn-sm" onclick="toggleAgentPanel()">×</button>
        </div>
        <div class="panel-content">
    `;

    if (agents.length > 0) {
      agents.forEach(agent => {
        const statusColor = agent.status === 'active' ? '#10b981' : '#9ca3af';
        html += `
          <div class="agent-item" data-agent-id="${agent.id}">
            <div class="agent-status-indicator" style="background-color: ${statusColor}"></div>
            <div class="agent-info">
              <div class="agent-name">${agent.name}</div>
              <div class="agent-description">${agent.description}</div>
            </div>
            <div class="agent-controls">
              <button class="btn btn-xs" onclick="toggleAgent('${agent.id}')">
                ${agent.status === 'active' ? 'Pause' : 'Start'}
              </button>
              <button class="btn btn-xs" onclick="deleteAgent('${agent.id}')">X</button>
            </div>
          </div>
        `;
      });
    } else {
      html += `
        <div class="no-agents-message">
          <p>No active agents. Create agents from your notes to automate tasks.</p>
        </div>
      `;
    }

    html += `
        </div>
        <div class="panel-footer">
          <button class="btn btn-primary btn-sm" onclick="createNewAgent()">
            + New Agent
          </button>
        </div>
      </div>
    `;

    html += this.getScripts();

    return html;
  }

  handleInteraction(interaction: UIInteraction): void {
    console.log(`Agent control panel interaction:`, interaction);
    // Handle the interaction appropriately
  }

  shouldDisplay(context: UIReplacementContext): boolean {
    // Show on all pages except maybe settings
    return context.currentPage !== 'settings';
  }

  private getScripts(): string {
    return `
      <script>
        function toggleAgentPanel() {
          const panel = document.getElementById('agent-control-panel');
          panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }

        function toggleAgent(agentId) {
          if (window.uiWebSocket && window.uiWebSocket.readyState === WebSocket.OPEN) {
            window.uiWebSocket.send(JSON.stringify({
              type: 'agent_control',
              payload: { agentId, action: 'toggle' }
            }));
          }
        }

        function deleteAgent(agentId) {
          if (confirm('Are you sure you want to delete this agent?')) {
            if (window.uiWebSocket && window.uiWebSocket.readyState === WebSocket.OPEN) {
              window.uiWebSocket.send(JSON.stringify({
                type: 'agent_control',
                payload: { agentId, action: 'delete' }
              }));
            }
          }
        }

        function createNewAgent() {
          if (window.uiWebSocket && window.uiWebSocket.readyState === WebSocket.OPEN) {
            window.uiWebSocket.send(JSON.stringify({
              type: 'show_agent_creation_ui'
            }));
          }
        }
      </script>
    `;
  }
}