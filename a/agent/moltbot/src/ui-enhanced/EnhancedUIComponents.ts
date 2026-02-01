// Enhanced UI components for ergonomic and intuitive experience

export interface EnhancedUIComponent {
  id: string;
  name: string;
  description: string;
  category: 'control' | 'monitoring' | 'configuration' | 'visualization';
  priority: number;

  // Render the component with the given state
  render(state: any, context?: any): string;

  // Handle user interactions
  handleInteraction(interaction: UIInteraction): void;

  // Get any required CSS for the component
  getCSS(): string;

  // Get any required JavaScript for the component
  getJS(): string;
}

export interface UIInteraction {
  componentId: string;
  action: string;
  data: any;
  timestamp: string;
  userId?: string;
}

// Component for agent control with enhanced UX
export class EnhancedAgentControl implements EnhancedUIComponent {
  id = 'enhanced-agent-control';
  name = 'Enhanced Agent Control';
  description = 'Intuitive controls for managing automation agents';
  category: 'control' = 'control';
  priority = 100;

  render(state: any, context?: any): string {
    const agents = state.activeAgents || [];

    let html = `
      <div class="enhanced-agent-control">
        <div class="section-header">
          <h3>Automation Agents</h3>
          <div class="controls">
            <button class="btn btn-sm btn-outline" onclick="refreshAgents()" title="Refresh agents">
              <i class="icon-refresh"></i>
            </button>
            <button class="btn btn-sm btn-primary" onclick="createNewAgent()" title="Create new agent">
              <i class="icon-plus"></i> New
            </button>
          </div>
        </div>

        <div class="agents-grid">
    `;

    if (agents.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-icon">🤖</div>
          <h4>No Active Agents</h4>
          <p>Create your first automation agent to get started</p>
          <button class="btn btn-primary" onclick="createNewAgent()">
            Create Agent
          </button>
        </div>
      `;
    } else {
      agents.forEach(agent => {
        const statusColor = this.getStatusColor(agent.status);
        const statusIcon = this.getStatusIcon(agent.status);
        const progressPercent = agent.executionCount > 0
          ? Math.min(100, (agent.successCount / agent.executionCount) * 100)
          : 0;

        html += `
          <div class="agent-card" data-agent-id="${agent.id}">
            <div class="agent-header">
              <div class="agent-status-badge" style="background-color: ${statusColor}">
                ${statusIcon}
              </div>
              <div class="agent-title">
                <h4>${agent.name}</h4>
                <small>${agent.description}</small>
              </div>
              <div class="agent-actions">
                <button class="btn btn-xs" onclick="toggleAgent('${agent.id}')" title="${agent.status === 'active' ? 'Pause' : 'Start'} agent">
                  ${agent.status === 'active' ? '⏸️' : '▶️'}
                </button>
                <button class="btn btn-xs" onclick="editAgent('${agent.id}')" title="Edit agent">
                  ✏️
                </button>
                <button class="btn btn-xs" onclick="deleteAgent('${agent.id}')" title="Delete agent">
                  🗑️
                </button>
              </div>
            </div>

            <div class="agent-stats">
              <div class="stat-group">
                <div class="stat-item">
                  <span class="stat-label">Success Rate</span>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                  </div>
                  <span class="stat-value">${Math.round(progressPercent)}%</span>
                </div>

                <div class="stat-item">
                  <span class="stat-label">Executions</span>
                  <span class="stat-value">${agent.executionCount}</span>
                </div>

                <div class="stat-item">
                  <span class="stat-label">Last Run</span>
                  <span class="stat-value">${agent.lastRun ? new Date(agent.lastRun).toLocaleTimeString() : 'Never'}</span>
                </div>
              </div>
            </div>

            <div class="agent-details">
              <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">${agent.type}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Created:</span>
                <span class="detail-value">${new Date(agent.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        `;
      });
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  handleInteraction(interaction: UIInteraction): void {
    console.log(`Enhanced agent control interaction:`, interaction);
  }

  getCSS(): string {
    return `
      .enhanced-agent-control {
        padding: 1rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #e5e7eb;
      }

      .section-header h3 {
        margin: 0;
        color: #1f2937;
        font-size: 1.25rem;
      }

      .controls {
        display: flex;
        gap: 0.5rem;
      }

      .agents-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
      }

      .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 3rem 1rem;
        color: #6b7280;
      }

      .empty-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }

      .agent-card {
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        overflow: hidden;
        background: white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        transition: box-shadow 0.2s ease;
      }

      .agent-card:hover {
        box-shadow: 0 4px 6px rgba(0,0,0,0.15);
      }

      .agent-header {
        display: flex;
        align-items: center;
        padding: 1rem;
        background: #f9fafb;
        border-bottom: 1px solid #e5e7eb;
      }

      .agent-status-badge {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 0.8rem;
        margin-right: 0.75rem;
        flex-shrink: 0;
      }

      .agent-title {
        flex: 1;
        min-width: 0;
      }

      .agent-title h4 {
        margin: 0 0 0.25rem 0;
        font-size: 1rem;
        color: #1f2937;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .agent-title small {
        margin: 0;
        font-size: 0.75rem;
        color: #6b7280;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
      }

      .agent-actions {
        display: flex;
        gap: 0.25rem;
        flex-shrink: 0;
      }

      .agent-stats {
        padding: 1rem;
      }

      .stat-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .stat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .stat-label {
        font-size: 0.75rem;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .stat-value {
        font-weight: 600;
        color: #1f2937;
      }

      .progress-bar {
        width: 100%;
        height: 0.25rem;
        background: #e5e7eb;
        border-radius: 0.125rem;
        overflow: hidden;
        margin: 0.25rem 0;
      }

      .progress-fill {
        height: 100%;
        background: #10b981;
        transition: width 0.3s ease;
      }

      .agent-details {
        padding: 0 1rem 1rem;
        border-top: 1px solid #f3f4f6;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
        margin-bottom: 0.25rem;
      }

      .detail-label {
        color: #6b7280;
      }

      .detail-value {
        color: #1f2937;
        font-weight: 500;
      }

      .btn {
        padding: 0.25rem 0.5rem;
        border: 1px solid transparent;
        border-radius: 0.25rem;
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.2s ease;
      }

      .btn:hover {
        opacity: 0.8;
      }

      .btn-primary {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }

      .btn-outline {
        background: transparent;
        color: #374151;
        border-color: #d1d5db;
      }

      .btn-xs {
        padding: 0.125rem 0.25rem;
        font-size: 0.75rem;
      }

      .btn-sm {
        padding: 0.25rem 0.5rem;
        font-size: 0.875rem;
      }
    `;
  }

  getJS(): string {
    return `
      function refreshAgents() {
        if (window.uiWebSocket && window.uiWebSocket.readyState === WebSocket.OPEN) {
          window.uiWebSocket.send(JSON.stringify({
            type: 'refresh_agents'
          }));
        }
      }

      function createNewAgent() {
        if (window.uiWebSocket && window.uiWebSocket.readyState === WebSocket.OPEN) {
          window.uiWebSocket.send(JSON.stringify({
            type: 'show_agent_creation_ui'
          }));
        }
      }

      function toggleAgent(agentId) {
        if (window.uiWebSocket && window.uiWebSocket.readyState === WebSocket.OPEN) {
          window.uiWebSocket.send(JSON.stringify({
            type: 'agent_control',
            payload: { agentId, action: 'toggle' }
          }));
        }
      }

      function editAgent(agentId) {
        if (window.uiWebSocket && window.uiWebSocket.readyState === WebSocket.OPEN) {
          window.uiWebSocket.send(JSON.stringify({
            type: 'show_agent_editor',
            payload: { agentId }
          }));
        }
      }

      function deleteAgent(agentId) {
        if (confirm('Are you sure you want to delete this agent? This cannot be undone.')) {
          if (window.uiWebSocket && window.uiWebSocket.readyState === WebSocket.OPEN) {
            window.uiWebSocket.send(JSON.stringify({
              type: 'agent_control',
              payload: { agentId, action: 'delete' }
            }));
          }
        }
      }
    `;
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'active': return '#10b981'; // green
      case 'paused': return '#f59e0b'; // yellow
      case 'error': return '#ef4444'; // red
      case 'initializing': return '#3b82f6'; // blue
      default: return '#9ca3af'; // gray
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'active': return '▶';
      case 'paused': return '⏸';
      case 'error': return '⚠';
      case 'initializing': return '⚡';
      default: return '●';
    }
  }
}