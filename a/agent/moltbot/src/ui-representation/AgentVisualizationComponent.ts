import {
  AgentRepresentation,
  AgentUIState,
  VisualizationComponent
} from './UIMappingInterfaces';

export class AgentVisualizationComponent implements VisualizationComponent {
  private type: string;

  constructor(type: string = 'default') {
    this.type = type;
  }

  render(agent: AgentRepresentation, state: AgentUIState): string {
    // Generate HTML/JS that can be injected into the Notention UI
    const statusColor = this.getStatusColor(agent.status);
    const statusIcon = this.getStatusIcon(agent.status);

    let html = `
      <div class="clawdbot-agent-card" data-agent-id="${agent.id}" style="border-left: 4px solid ${statusColor};">
        <div class="agent-header">
          <div class="agent-icon">${this.getAgentIcon(agent.type)}</div>
          <div class="agent-info">
            <h4 class="agent-name">${agent.name}</h4>
            <p class="agent-description">${agent.description}</p>
            <div class="agent-meta">
              <span class="agent-type">${agent.type}</span>
              <span class="agent-status" style="color: ${statusColor}">
                <span class="status-icon">${statusIcon}</span>
                ${agent.status}
              </span>
            </div>
          </div>
        </div>
    `;

    if (state.expanded) {
      html += this.renderExpandedView(agent);
    }

    html += `
        <div class="agent-actions">
          <button class="btn btn-sm toggle-btn" onclick="toggleAgent('${agent.id}')">
            ${state.expanded ? 'Collapse' : 'Expand'}
          </button>
          <button class="btn btn-sm control-btn" onclick="controlAgent('${agent.id}', 'toggle')">
            ${agent.status === 'active' ? 'Pause' : 'Activate'}
          </button>
        </div>
      </div>
    `;

    // Add JavaScript for interactivity
    html += this.getAgentScripts();

    return html;
  }

  handleInteraction(agentId: string, action: string, data: any): void {
    console.log(`Handling interaction for agent ${agentId}: ${action}`, data);
    // In a real implementation, this would communicate with the backend
  }

  getType(): string {
    return this.type;
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'active': return '#10b981'; // green
      case 'inactive': return '#9ca3af'; // gray
      case 'paused': return '#f59e0b'; // yellow
      case 'error': return '#ef4444'; // red
      default: return '#6b7280'; // default gray
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'active': return '▶️';
      case 'inactive': return '⏹️';
      case 'paused': return '⏸️';
      case 'error': return '❌';
      default: return '❓';
    }
  }

  private getAgentIcon(type: string): string {
    switch (type) {
      case 'conditional': return '⚡';
      case 'scheduled': return '⏰';
      case 'monitoring': return '👁️';
      case 'communication': return '💬';
      default: return '🤖';
    }
  }

  private renderExpandedView(agent: AgentRepresentation): string {
    let html = '<div class="agent-details">';

    // Show statistics if available
    if (agent.statistics) {
      html += `
        <div class="agent-stats">
          <div class="stat-item">
            <span class="stat-label">Runs:</span>
            <span class="stat-value">${agent.statistics.runs}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Success:</span>
            <span class="stat-value">${agent.statistics.successes}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Failures:</span>
            <span class="stat-value">${agent.statistics.failures}</span>
          </div>
        </div>
      `;
    }

    // Show triggers
    if (agent.triggers.length > 0) {
      html += '<div class="agent-section"><h5>Triggers</h5><ul>';
      agent.triggers.forEach(trigger => {
        html += `<li class="trigger-item">${trigger.description}</li>`;
      });
      html += '</ul></div>';
    }

    // Show actions
    if (agent.actions.length > 0) {
      html += '<div class="agent-section"><h5>Actions</h5><ul>';
      agent.actions.forEach(action => {
        html += `<li class="action-item">${action.description}</li>`;
      });
      html += '</ul></div>';
    }

    // Show conditions
    if (agent.conditions.length > 0) {
      html += '<div class="agent-section"><h5>Conditions</h5><ul>';
      agent.conditions.forEach(condition => {
        html += `<li class="condition-item">${condition.description} (${condition.satisfied ? '✓' : '○'})</li>`;
      });
      html += '</ul></div>';
    }

    html += '</div>';

    return html;
  }

  private getAgentScripts(): string {
    return `
      <script>
        function toggleAgent(agentId) {
          const card = document.querySelector(\`[data-agent-id="\${agentId}"]\`);
          const btn = card.querySelector('.toggle-btn');

          // Toggle expanded state
          const isExpanded = card.classList.contains('expanded');
          card.classList.toggle('expanded', !isExpanded);
          btn.textContent = isExpanded ? 'Expand' : 'Collapse';

          // In a real implementation, this would update the backend
          if (window.uiWebSocket && window.uiWebSocket.readyState === WebSocket.OPEN) {
            window.uiWebSocket.send(JSON.stringify({
              type: 'agent_ui_state_change',
              payload: {
                agentId,
                expanded: !isExpanded
              }
            }));
          }
        }

        function controlAgent(agentId, action) {
          // Send control command to backend
          if (window.uiWebSocket && window.uiWebSocket.readyState === WebSocket.OPEN) {
            window.uiWebSocket.send(JSON.stringify({
              type: 'agent_control',
              payload: {
                agentId,
                action
              }
            }));
          }
        }
      </script>
    `;
  }
}