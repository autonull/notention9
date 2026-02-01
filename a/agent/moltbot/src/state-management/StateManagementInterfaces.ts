// Interfaces for comprehensive ClawdBot state management

// Represents the complete state of ClawdBot
export interface ClawdBotState {
  id: string;
  status: 'running' | 'stopped' | 'paused' | 'error' | 'initializing';
  version: string;
  uptime: number; // in seconds
  activeAgents: AgentState[];
  availableSkills: SkillDescriptor[];
  configuration: ClawdBotConfiguration;
  recentLogs: LogEntry[];
  resourceUsage: ResourceUsage;
  lastError?: ErrorInfo;
  connectedServices: ConnectedService[];
  capabilities: Capability[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// State of an individual agent
export interface AgentState {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'active' | 'inactive' | 'paused' | 'error' | 'initializing';
  createdAt: string;
  lastRun?: string;
  nextRun?: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  lastError?: ErrorInfo;
  configuration: any;
  triggers: TriggerState[];
  actions: ActionState[];
  conditions: ConditionState[];
}

// State of a trigger
export interface TriggerState {
  id: string;
  type: string;
  description: string;
  enabled: boolean;
  lastTriggered?: string;
  triggerCount: number;
  configuration: any;
}

// State of an action
export interface ActionState {
  id: string;
  type: string;
  description: string;
  enabled: boolean;
  lastExecuted?: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  lastResult?: any;
  configuration: any;
}

// State of a condition
export interface ConditionState {
  id: string;
  type: string;
  expression: string;
  description: string;
  lastEvaluated?: string;
  satisfied: boolean;
  currentValue?: any;
  configuration: any;
}

// Skill descriptor
export interface SkillDescriptor {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: ParameterSpec[];
  enabled: boolean;
}

// Parameter specification for skills
export interface ParameterSpec {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum';
  required: boolean;
  description: string;
  defaultValue?: any;
  options?: string[]; // for enum types
}

// ClawdBot configuration
export interface ClawdBotConfiguration {
  id: string;
  name: string;
  description: string;
  settings: {
    [key: string]: any;
  };
  agents: AgentConfiguration[];
  skills: SkillConfiguration[];
  triggers: TriggerConfiguration[];
  connections: ConnectionConfiguration[];
}

// Agent configuration
export interface AgentConfiguration {
  id: string;
  name: string;
  description: string;
  type: string;
  enabled: boolean;
  triggers: TriggerConfiguration[];
  actions: ActionConfiguration[];
  conditions: ConditionConfiguration[];
  schedule?: ScheduleConfiguration;
}

// Various configuration interfaces
export interface TriggerConfiguration {
  id: string;
  type: string;
  enabled: boolean;
  parameters: {
    [key: string]: any;
  };
}

export interface ActionConfiguration {
  id: string;
  type: string;
  enabled: boolean;
  parameters: {
    [key: string]: any;
  };
}

export interface ConditionConfiguration {
  id: string;
  type: string;
  expression: string;
  parameters: {
    [key: string]: any;
  };
}

export interface ScheduleConfiguration {
  type: 'once' | 'interval' | 'cron' | 'conditional';
  expression: string;
  timezone?: string;
  enabled: boolean;
}

export interface ConnectionConfiguration {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  credentials?: {
    [key: string]: any;
  };
  settings: {
    [key: string]: any;
  };
}

export interface SkillConfiguration {
  id: string;
  enabled: boolean;
  parameters: {
    [key: string]: any;
  };
}

// Log entry
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  source: string; // agent id, skill id, etc.
  data?: any;
}

// Resource usage
export interface ResourceUsage {
  cpu: number; // percentage
  memory: number; // in MB
  disk: number; // in MB
  network: {
    upload: number; // in KB/s
    download: number; // in KB/s
  };
}

// Connected service
export interface ConnectedService {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: string;
  capabilities: string[];
}

// Capability
export interface Capability {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

// Error information
export interface ErrorInfo {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  resolved: boolean;
  resolution?: string;
}

// State manager interface
export interface StateManager {
  // Get current state
  getState(): Promise<ClawdBotState>;

  // Update state
  updateState(newState: Partial<ClawdBotState>): Promise<void>;

  // Get specific agent state
  getAgentState(agentId: string): Promise<AgentState | undefined>;

  // Update agent state
  updateAgentState(agentId: string, newState: Partial<AgentState>): Promise<void>;

  // Get configuration
  getConfiguration(): Promise<ClawdBotConfiguration>;

  // Update configuration
  updateConfiguration(newConfig: Partial<ClawdBotConfiguration>): Promise<void>;

  // Add log entry
  addLog(entry: LogEntry): void;

  // Get recent logs
  getRecentLogs(count?: number): LogEntry[];

  // Subscribe to state changes
  subscribe(callback: (state: ClawdBotState) => void): () => void;

  // Initialize state manager
  initialize(): Promise<void>;

  // Clean up resources
  cleanup(): Promise<void>;
}