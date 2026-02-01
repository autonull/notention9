import {
  ClawdBotConfiguration,
  AgentConfiguration,
  SkillConfiguration,
  ConnectionConfiguration,
  ValidationResult
} from '../state-management/StateManagementInterfaces';

export interface ConfigurationChange {
  id: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete' | 'enable' | 'disable';
  entityType: 'agent' | 'skill' | 'connection' | 'setting';
  entityId: string;
  oldValue?: any;
  newValue?: any;
  userId?: string;
  description: string;
}

export interface ConfigurationManager {
  // Load configuration from storage
  loadConfiguration(): Promise<ClawdBotConfiguration>;

  // Save configuration to storage
  saveConfiguration(config: ClawdBotConfiguration): Promise<void>;

  // Validate configuration
  validateConfiguration(config: ClawdBotConfiguration): ValidationResult;

  // Get specific configuration sections
  getAgents(): Promise<AgentConfiguration[]>;
  getSkills(): Promise<SkillConfiguration[]>;
  getConnections(): Promise<ConnectionConfiguration[]>;

  // Update specific configuration sections
  updateAgents(agents: AgentConfiguration[]): Promise<void>;
  updateSkills(skills: SkillConfiguration[]): Promise<void>;
  updateConnections(connections: ConnectionConfiguration[]): Promise<void>;

  // Add/remove specific configurations
  addAgent(agent: AgentConfiguration): Promise<void>;
  removeAgent(agentId: string): Promise<void>;
  addSkill(skill: SkillConfiguration): Promise<void>;
  removeSkill(skillId: string): Promise<void>;
  addConnection(connection: ConnectionConfiguration): Promise<void>;
  removeConnection(connectionId: string): Promise<void>;

  // Enable/disable configurations
  enableAgent(agentId: string): Promise<void>;
  disableAgent(agentId: string): Promise<void>;
  enableSkill(skillId: string): Promise<void>;
  disableSkill(skillId: string): Promise<void>;
  enableConnection(connectionId: string): Promise<void>;
  disableConnection(connectionId: string): Promise<void>;

  // Get configuration history
  getChangeHistory(limit?: number): ConfigurationChange[];

  // Rollback configuration
  rollbackTo(changeId: string): Promise<void>;

  // Export/import configuration
  exportConfiguration(): Promise<string>;
  importConfiguration(configString: string): Promise<void>;

  // Backup/restore
  backupConfiguration(): Promise<void>;
  restoreConfiguration(backupId: string): Promise<void>;

  // Initialize configuration manager
  initialize(): Promise<void>;

  // Clean up resources
  cleanup(): Promise<void>;
}

export class ComprehensiveConfigurationManager implements ConfigurationManager {
  private config: ClawdBotConfiguration | null = null;
  private configPath: string;
  private changeHistory: ConfigurationChange[] = [];
  private maxHistorySize: number = 1000;
  private backupManager: BackupManager;

  constructor(configPath: string = './config/clawdbot-config.json') {
    this.configPath = configPath;
    this.backupManager = new BackupManager();
  }

  async initialize(): Promise<void> {
    console.log('Initializing comprehensive configuration manager');
    try {
      this.config = await this.loadConfiguration();
      console.log('Configuration manager initialized successfully');
    } catch (error) {
      console.error('Error initializing configuration manager:', error);
      this.config = this.getDefaultConfiguration();
    }
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up configuration manager');
    this.changeHistory = [];
    this.config = null;
  }

  async loadConfiguration(): Promise<ClawdBotConfiguration> {
    try {
      // In a real implementation, this would read from the file system
      // For now, we'll return a default configuration
      console.log(`Loading configuration from ${this.configPath}`);
      return this.getDefaultConfiguration();
    } catch (error) {
      console.error(`Error loading configuration from ${this.configPath}:`, error);
      return this.getDefaultConfiguration();
    }
  }

  async saveConfiguration(config: ClawdBotConfiguration): Promise<void> {
    try {
      // In a real implementation, this would write to the file system
      this.config = config;
      console.log(`Configuration saved to ${this.configPath}`);

      // Create a backup
      await this.backupManager.createBackup(config);
    } catch (error) {
      console.error(`Error saving configuration to ${this.configPath}:`, error);
      throw error;
    }
  }

  validateConfiguration(config: ClawdBotConfiguration): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate agents
    if (config.agents) {
      const agentIds = new Set<string>();
      for (const agent of config.agents) {
        if (!agent.id) {
          errors.push(`Agent missing ID`);
        } else if (agentIds.has(agent.id)) {
          errors.push(`Duplicate agent ID: ${agent.id}`);
        } else {
          agentIds.add(agent.id);
        }

        if (!agent.name) {
          warnings.push(`Agent ${agent.id || 'unnamed'} missing name`);
        }

        // Validate agent-specific properties
        if (agent.triggers && agent.triggers.length === 0) {
          warnings.push(`Agent ${agent.id} has no triggers`);
        }
        if (agent.actions && agent.actions.length === 0) {
          warnings.push(`Agent ${agent.id} has no actions`);
        }
      }
    }

    // Validate skills
    if (config.skills) {
      const skillIds = new Set<string>();
      for (const skill of config.skills) {
        if (!skill.id) {
          errors.push(`Skill missing ID`);
        } else if (skillIds.has(skill.id)) {
          errors.push(`Duplicate skill ID: ${skill.id}`);
        } else {
          skillIds.add(skill.id);
        }
      }
    }

    // Validate connections
    if (config.connections) {
      const connectionIds = new Set<string>();
      for (const conn of config.connections) {
        if (!conn.id) {
          errors.push(`Connection missing ID`);
        } else if (connectionIds.has(conn.id)) {
          errors.push(`Duplicate connection ID: ${conn.id}`);
        } else {
          connectionIds.add(conn.id);
        }

        if (!conn.type) {
          errors.push(`Connection ${conn.id} missing type`);
        }

        if (!conn.name) {
          warnings.push(`Connection ${conn.id} missing name`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async getAgents(): Promise<AgentConfiguration[]> {
    if (!this.config) {
      await this.loadConfiguration();
    }
    return this.config?.agents || [];
  }

  async getSkills(): Promise<SkillConfiguration[]> {
    if (!this.config) {
      await this.loadConfiguration();
    }
    return this.config?.skills || [];
  }

  async getConnections(): Promise<ConnectionConfiguration[]> {
    if (!this.config) {
      await this.loadConfiguration();
    }
    return this.config?.connections || [];
  }

  async updateAgents(agents: AgentConfiguration[]): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      const oldAgents = [...this.config.agents];
      this.config.agents = agents;

      // Log the change
      this.logChange({
        id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        action: 'update',
        entityType: 'agent',
        entityId: 'all-agents',
        oldValue: oldAgents,
        newValue: agents,
        description: `Updated all agents configuration`
      });

      await this.saveConfiguration(this.config);
    }
  }

  async updateSkills(skills: SkillConfiguration[]): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      const oldSkills = [...this.config.skills];
      this.config.skills = skills;

      // Log the change
      this.logChange({
        id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        action: 'update',
        entityType: 'skill',
        entityId: 'all-skills',
        oldValue: oldSkills,
        newValue: skills,
        description: `Updated all skills configuration`
      });

      await this.saveConfiguration(this.config);
    }
  }

  async updateConnections(connections: ConnectionConfiguration[]): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      const oldConnections = [...this.config.connections];
      this.config.connections = connections;

      // Log the change
      this.logChange({
        id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        action: 'update',
        entityType: 'connection',
        entityId: 'all-connections',
        oldValue: oldConnections,
        newValue: connections,
        description: `Updated all connections configuration`
      });

      await this.saveConfiguration(this.config);
    }
  }

  async addAgent(agent: AgentConfiguration): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      // Check for duplicate ID
      const existingIndex = this.config.agents.findIndex(a => a.id === agent.id);
      if (existingIndex !== -1) {
        // Update existing
        const oldAgent = { ...this.config.agents[existingIndex] };
        this.config.agents[existingIndex] = agent;

        // Log the change
        this.logChange({
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'update',
          entityType: 'agent',
          entityId: agent.id,
          oldValue: oldAgent,
          newValue: agent,
          description: `Updated agent: ${agent.name || agent.id}`
        });
      } else {
        // Add new
        this.config.agents.push(agent);

        // Log the change
        this.logChange({
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'create',
          entityType: 'agent',
          entityId: agent.id,
          newValue: agent,
          description: `Added new agent: ${agent.name || agent.id}`
        });
      }

      await this.saveConfiguration(this.config);
    }
  }

  async removeAgent(agentId: string): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      const agentIndex = this.config.agents.findIndex(a => a.id === agentId);
      if (agentIndex !== -1) {
        const removedAgent = this.config.agents[agentIndex];
        this.config.agents.splice(agentIndex, 1);

        // Log the change
        this.logChange({
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'delete',
          entityType: 'agent',
          entityId: agentId,
          oldValue: removedAgent,
          description: `Removed agent: ${removedAgent.name || agentId}`
        });

        await this.saveConfiguration(this.config);
      }
    }
  }

  async addSkill(skill: SkillConfiguration): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      // Check for duplicate ID
      const existingIndex = this.config.skills.findIndex(s => s.id === skill.id);
      if (existingIndex !== -1) {
        // Update existing
        const oldSkill = { ...this.config.skills[existingIndex] };
        this.config.skills[existingIndex] = skill;

        // Log the change
        this.logChange({
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'update',
          entityType: 'skill',
          entityId: skill.id,
          oldValue: oldSkill,
          newValue: skill,
          description: `Updated skill: ${skill.id}`
        });
      } else {
        // Add new
        this.config.skills.push(skill);

        // Log the change
        this.logChange({
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'create',
          entityType: 'skill',
          entityId: skill.id,
          newValue: skill,
          description: `Added new skill: ${skill.id}`
        });
      }

      await this.saveConfiguration(this.config);
    }
  }

  async removeSkill(skillId: string): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      const skillIndex = this.config.skills.findIndex(s => s.id === skillId);
      if (skillIndex !== -1) {
        const removedSkill = this.config.skills[skillIndex];
        this.config.skills.splice(skillIndex, 1);

        // Log the change
        this.logChange({
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'delete',
          entityType: 'skill',
          entityId: skillId,
          oldValue: removedSkill,
          description: `Removed skill: ${skillId}`
        });

        await this.saveConfiguration(this.config);
      }
    }
  }

  async addConnection(connection: ConnectionConfiguration): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      // Check for duplicate ID
      const existingIndex = this.config.connections.findIndex(c => c.id === connection.id);
      if (existingIndex !== -1) {
        // Update existing
        const oldConnection = { ...this.config.connections[existingIndex] };
        this.config.connections[existingIndex] = connection;

        // Log the change
        this.logChange({
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'update',
          entityType: 'connection',
          entityId: connection.id,
          oldValue: oldConnection,
          newValue: connection,
          description: `Updated connection: ${connection.name || connection.id}`
        });
      } else {
        // Add new
        this.config.connections.push(connection);

        // Log the change
        this.logChange({
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'create',
          entityType: 'connection',
          entityId: connection.id,
          newValue: connection,
          description: `Added new connection: ${connection.name || connection.id}`
        });
      }

      await this.saveConfiguration(this.config);
    }
  }

  async removeConnection(connectionId: string): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      const connectionIndex = this.config.connections.findIndex(c => c.id === connectionId);
      if (connectionIndex !== -1) {
        const removedConnection = this.config.connections[connectionIndex];
        this.config.connections.splice(connectionIndex, 1);

        // Log the change
        this.logChange({
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'delete',
          entityType: 'connection',
          entityId: connectionId,
          oldValue: removedConnection,
          description: `Removed connection: ${removedConnection.name || connectionId}`
        });

        await this.saveConfiguration(this.config);
      }
    }
  }

  async enableAgent(agentId: string): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      const agent = this.config.agents.find(a => a.id === agentId);
      if (agent && !agent.enabled) {
        const oldEnabled = agent.enabled;
        agent.enabled = true;

        // Log the change
        this.logChange({
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'enable',
          entityType: 'agent',
          entityId: agentId,
          oldValue: { enabled: oldEnabled },
          newValue: { enabled: true },
          description: `Enabled agent: ${agent.name || agentId}`
        });

        await this.saveConfiguration(this.config);
      }
    }
  }

  async disableAgent(agentId: string): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      const agent = this.config.agents.find(a => a.id === agentId);
      if (agent && agent.enabled) {
        const oldEnabled = agent.enabled;
        agent.enabled = false;

        // Log the change
        this.logChange({
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'disable',
          entityType: 'agent',
          entityId: agentId,
          oldValue: { enabled: oldEnabled },
          newValue: { enabled: false },
          description: `Disabled agent: ${agent.name || agentId}`
        });

        await this.saveConfiguration(this.config);
      }
    }
  }

  async enableSkill(skillId: string): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      const skill = this.config.skills.find(s => s.id === skillId);
      if (skill && !skill.enabled) {
        const oldEnabled = skill.enabled;
        skill.enabled = true;

        // Log the change
        this.logChange({
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'enable',
          entityType: 'skill',
          entityId: skillId,
          oldValue: { enabled: oldEnabled },
          newValue: { enabled: true },
          description: `Enabled skill: ${skillId}`
        });

        await this.saveConfiguration(this.config);
      }
    }
  }

  async disableSkill(skillId: string): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      const skill = this.config.skills.find(s => s.id === skillId);
      if (skill && skill.enabled) {
        const oldEnabled = skill.enabled;
        skill.enabled = false;

        // Log the change
        this.logChange({
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'disable',
          entityType: 'skill',
          entityId: skillId,
          oldValue: { enabled: oldEnabled },
          newValue: { enabled: false },
          description: `Disabled skill: ${skillId}`
        });

        await this.saveConfiguration(this.config);
      }
    }
  }

  async enableConnection(connectionId: string): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      const connection = this.config.connections.find(c => c.id === connectionId);
      if (connection && !connection.enabled) {
        const oldEnabled = connection.enabled;
        connection.enabled = true;

        // Log the change
        this.logChange({
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'enable',
          entityType: 'connection',
          entityId: connectionId,
          oldValue: { enabled: oldEnabled },
          newValue: { enabled: true },
          description: `Enabled connection: ${connection.name || connectionId}`
        });

        await this.saveConfiguration(this.config);
      }
    }
  }

  async disableConnection(connectionId: string): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      const connection = this.config.connections.find(c => c.id === connectionId);
      if (connection && connection.enabled) {
        const oldEnabled = connection.enabled;
        connection.enabled = false;

        // Log the change
        this.logChange({
          id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'disable',
          entityType: 'connection',
          entityId: connectionId,
          oldValue: { enabled: oldEnabled },
          newValue: { enabled: false },
          description: `Disabled connection: ${connection.name || connectionId}`
        });

        await this.saveConfiguration(this.config);
      }
    }
  }

  getChangeHistory(limit: number = 50): ConfigurationChange[] {
    return this.changeHistory.slice(-limit).reverse();
  }

  async rollbackTo(changeId: string): Promise<void> {
    const changeIndex = this.changeHistory.findIndex(c => c.id === changeId);
    if (changeIndex === -1) {
      throw new Error(`Change with ID ${changeId} not found`);
    }

    // For simplicity, we'll just restore from the last backup before this change
    // In a real implementation, this would involve more sophisticated state management
    console.log(`Rolling back to change: ${changeId}`);

    // Restore from backup
    const backups = await this.backupManager.listBackups();
    if (backups.length > 0) {
      const latestBackup = backups[0]; // Assuming backups are sorted by date
      await this.restoreConfiguration(latestBackup.id);
    }
  }

  async exportConfiguration(): Promise<string> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      // Remove sensitive data before export
      const exportConfig = { ...this.config };
      if (exportConfig.connections) {
        exportConfig.connections = exportConfig.connections.map(conn => {
          const { credentials, ...safeConn } = conn;
          return safeConn as any;
        });
      }

      return JSON.stringify(exportConfig, null, 2);
    }

    return JSON.stringify(this.getDefaultConfiguration(), null, 2);
  }

  async importConfiguration(configString: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configString);

      // Validate the imported configuration
      const validation = this.validateConfiguration(importedConfig);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Import the configuration
      this.config = importedConfig;
      await this.saveConfiguration(this.config);

      console.log('Configuration imported successfully');
    } catch (error) {
      console.error('Error importing configuration:', error);
      throw error;
    }
  }

  async backupConfiguration(): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      await this.backupManager.createBackup(this.config);
    }
  }

  async restoreConfiguration(backupId: string): Promise<void> {
    const backup = await this.backupManager.getBackup(backupId);
    if (backup) {
      this.config = backup;
      await this.saveConfiguration(this.config);
      console.log(`Configuration restored from backup: ${backupId}`);
    } else {
      throw new Error(`Backup with ID ${backupId} not found`);
    }
  }

  private logChange(change: ConfigurationChange): void {
    this.changeHistory.push(change);

    // Maintain max history size
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory = this.changeHistory.slice(-this.maxHistorySize);
    }
  }

  private getDefaultConfiguration(): ClawdBotConfiguration {
    return {
      id: 'default-config',
      name: 'Default Configuration',
      description: 'Default ClawdBot configuration',
      settings: {
        startTime: new Date().toISOString(),
        debugMode: false,
        logLevel: 'info'
      },
      agents: [],
      skills: [],
      triggers: [],
      connections: []
    };
  }
}

// Backup manager for configuration backups
class BackupManager {
  private backups: Map<string, any> = new Map();
  private maxBackups: number = 10;

  async createBackup(config: any): Promise<string> {
    const backupId = `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const backup = {
      id: backupId,
      timestamp: new Date().toISOString(),
      config: { ...config },
      size: JSON.stringify(config).length
    };

    this.backups.set(backupId, backup);

    // Maintain max backups
    if (this.backups.size > this.maxBackups) {
      // Remove oldest backup
      const oldestKey = this.backups.keys().next().value;
      if (oldestKey) {
        this.backups.delete(oldestKey);
      }
    }

    return backupId;
  }

  async getBackup(backupId: string): Promise<any> {
    return this.backups.get(backupId)?.config || null;
  }

  async listBackups(): Promise<Array<{id: string, timestamp: string, size: number}>> {
    return Array.from(this.backups.values())
      .map(b => ({ id: b.id, timestamp: b.timestamp, size: b.size }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Newest first
  }

  async deleteBackup(backupId: string): Promise<boolean> {
    return this.backups.delete(backupId);
  }
}