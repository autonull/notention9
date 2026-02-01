import {
  ClawdBotState,
  AgentState,
  StateManager,
  LogEntry,
  ErrorInfo
} from './StateManagementInterfaces';

export class ComprehensiveStateManager implements StateManager {
  private currentState: ClawdBotState;
  private subscribers: Array<(state: ClawdBotState) => void> = [];
  private logHistory: LogEntry[] = [];
  private maxLogEntries: number = 1000;
  private gateway: any; // ClawdBot gateway reference

  constructor(gateway: any) {
    this.gateway = gateway;
    this.currentState = this.getDefaultState();
  }

  async initialize(): Promise<void> {
    console.log('Initializing comprehensive state manager');

    try {
      // Initialize with current state from gateway
      this.currentState = await this.fetchCurrentState();
      console.log('State manager initialized successfully');
    } catch (error) {
      console.error('Error initializing state manager:', error);
      this.addLog({
        id: `init-error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Failed to initialize state manager: ${(error as Error).message}`,
        source: 'StateManager'
      });
    }
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up state manager');
    this.subscribers = [];
    this.logHistory = [];
  }

  async getState(): Promise<ClawdBotState> {
    try {
      // Refresh state from gateway periodically
      const freshState = await this.fetchCurrentState();
      this.currentState = freshState;
      return this.currentState;
    } catch (error) {
      console.error('Error fetching current state:', error);
      this.addLog({
        id: `state-fetch-error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Failed to fetch current state: ${(error as Error).message}`,
        source: 'StateManager'
      });
      return this.currentState; // Return cached state
    }
  }

  async updateState(newState: Partial<ClawdBotState>): Promise<void> {
    const prevState = { ...this.currentState };

    // Update state properties
    Object.assign(this.currentState, newState);

    // Notify subscribers of the change
    this.notifySubscribers(this.currentState);

    // Log the state change
    this.addLog({
      id: `state-update-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `State updated: ${Object.keys(newState).join(', ')}`,
      source: 'StateManager',
      data: {
        changedProperties: Object.keys(newState),
        previousState: prevState,
        newState: this.currentState
      }
    });
  }

  async getAgentState(agentId: string): Promise<AgentState | undefined> {
    try {
      const state = await this.getState();
      return state.activeAgents.find(agent => agent.id === agentId);
    } catch (error) {
      console.error(`Error getting agent state for ${agentId}:`, error);
      return undefined;
    }
  }

  async updateAgentState(agentId: string, newState: Partial<AgentState>): Promise<void> {
    const agentIndex = this.currentState.activeAgents.findIndex(a => a.id === agentId);

    if (agentIndex === -1) {
      console.warn(`Agent with ID ${agentId} not found in state`);
      return;
    }

    const prevAgentState = { ...this.currentState.activeAgents[agentIndex] };

    // Update the agent state
    Object.assign(this.currentState.activeAgents[agentIndex], newState);

    // Update the overall state
    await this.updateState({
      activeAgents: [...this.currentState.activeAgents],
      uptime: this.currentState.uptime
    });

    // Log the agent state change
    this.addLog({
      id: `agent-state-update-${agentId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Agent ${agentId} state updated`,
      source: 'AgentManager',
      data: {
        agentId,
        changedProperties: Object.keys(newState),
        previousState: prevAgentState,
        newState: this.currentState.activeAgents[agentIndex]
      }
    });
  }

  async getConfiguration(): Promise<any> {
    try {
      // In a real implementation, this would fetch from the gateway
      return this.currentState.configuration;
    } catch (error) {
      console.error('Error fetching configuration:', error);
      return this.currentState.configuration;
    }
  }

  async updateConfiguration(newConfig: any): Promise<void> {
    const prevConfig = { ...this.currentState.configuration };

    // Update configuration
    Object.assign(this.currentState.configuration, newConfig);

    // Update the overall state
    await this.updateState({
      configuration: this.currentState.configuration
    });

    // Log the configuration change
    this.addLog({
      id: `config-update-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Configuration updated',
      source: 'ConfigManager',
      data: {
        changedProperties: Object.keys(newConfig),
        previousConfig: prevConfig,
        newConfig: this.currentState.configuration
      }
    });
  }

  addLog(entry: LogEntry): void {
    // Add timestamp if not provided
    if (!entry.timestamp) {
      entry.timestamp = new Date().toISOString();
    }

    // Add to log history
    this.logHistory.push(entry);

    // Maintain max log entries
    if (this.logHistory.length > this.maxLogEntries) {
      this.logHistory = this.logHistory.slice(-this.maxLogEntries);
    }

    // If this is an error, update the last error in state
    if (entry.level === 'error') {
      const errorInfo: ErrorInfo = {
        id: entry.id,
        timestamp: entry.timestamp,
        message: entry.message,
        source: entry.source,
        severity: 'medium', // Default severity
        resolved: false
      };

      this.updateState({
        lastError: errorInfo
      }).catch(err => console.error('Error updating last error in state:', err));
    }
  }

  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logHistory.slice(-count);
  }

  subscribe(callback: (state: ClawdBotState) => void): () => void {
    this.subscribers.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index !== -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private notifySubscribers(state: ClawdBotState): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(state);
      } catch (error) {
        console.error('Error in state subscriber:', error);
        this.addLog({
          id: `subscriber-error-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `Subscriber error: ${(error as Error).message}`,
          source: 'StateManager'
        });
      }
    }
  }

  private getDefaultState(): ClawdBotState {
    return {
      id: 'clawdbot-default',
      status: 'initializing',
      version: 'unknown',
      uptime: 0,
      activeAgents: [],
      availableSkills: [],
      configuration: {
        id: 'default-config',
        name: 'Default Configuration',
        description: 'Default ClawdBot configuration',
        settings: {},
        agents: [],
        skills: [],
        triggers: [],
        connections: []
      },
      recentLogs: [],
      resourceUsage: {
        cpu: 0,
        memory: 0,
        disk: 0,
        network: { upload: 0, download: 0 }
      },
      connectedServices: [],
      capabilities: []
    };
  }

  private async fetchCurrentState(): Promise<ClawdBotState> {
    // In a real implementation, this would fetch the actual state from the ClawdBot gateway
    // For now, we'll simulate by returning the current state with updated timestamps

    // Update uptime
    const startTime = new Date(this.currentState.configuration.settings.startTime || new Date());
    const currentTime = new Date();
    const uptimeSeconds = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);

    return {
      ...this.currentState,
      uptime: uptimeSeconds,
      recentLogs: this.getRecentLogs(20) // Last 20 logs
    };
  }
}