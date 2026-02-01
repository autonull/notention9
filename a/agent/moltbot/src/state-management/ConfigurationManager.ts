import {
  ClawdBotConfiguration,
  AgentConfiguration,
  SkillConfiguration,
  ConnectionConfiguration
} from './StateManagementInterfaces';

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
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class FileSystemConfigurationManager implements ConfigurationManager {
  private configPath: string;
  private config: ClawdBotConfiguration | null = null;

  constructor(configPath: string = './config/clawdbot-config.json') {
    this.configPath = configPath;
  }

  async loadConfiguration(): Promise<ClawdBotConfiguration> {
    try {
      // In a real implementation, this would read from the file system
      // For now, we'll return a default configuration
      this.config = this.getDefaultConfiguration();
      return this.config;
    } catch (error) {
      console.error('Error loading configuration:', error);
      this.config = this.getDefaultConfiguration();
      return this.config;
    }
  }

  async saveConfiguration(config: ClawdBotConfiguration): Promise<void> {
    try {
      // In a real implementation, this would write to the file system
      this.config = config;
      console.log('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
      throw error;
    }
  }

  validateConfiguration(config: ClawdBotConfiguration): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate agents
    if (config.agents) {
      for (const agent of config.agents) {
        if (!agent.id) {
          errors.push(`Agent missing ID`);
        }
        if (!agent.name) {
          warnings.push(`Agent ${agent.id || 'unnamed'} missing name`);
        }
      }
    }

    // Validate skills
    if (config.skills) {
      for (const skill of config.skills) {
        if (!skill.id) {
          errors.push(`Skill missing ID`);
        }
      }
    }

    // Validate connections
    if (config.connections) {
      for (const conn of config.connections) {
        if (!conn.id) {
          errors.push(`Connection missing ID`);
        }
        if (!conn.type) {
          errors.push(`Connection ${conn.id} missing type`);
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
      this.config.agents = agents;
      await this.saveConfiguration(this.config);
    }
  }

  async updateSkills(skills: SkillConfiguration[]): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      this.config.skills = skills;
      await this.saveConfiguration(this.config);
    }
  }

  async updateConnections(connections: ConnectionConfiguration[]): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      this.config.connections = connections;
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
        this.config.agents[existingIndex] = agent;
      } else {
        this.config.agents.push(agent);
      }
      await this.saveConfiguration(this.config);
    }
  }

  async removeAgent(agentId: string): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      this.config.agents = this.config.agents.filter(a => a.id !== agentId);
      await this.saveConfiguration(this.config);
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
        this.config.skills[existingIndex] = skill;
      } else {
        this.config.skills.push(skill);
      }
      await this.saveConfiguration(this.config);
    }
  }

  async removeSkill(skillId: string): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      this.config.skills = this.config.skills.filter(s => s.id !== skillId);
      await this.saveConfiguration(this.config);
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
        this.config.connections[existingIndex] = connection;
      } else {
        this.config.connections.push(connection);
      }
      await this.saveConfiguration(this.config);
    }
  }

  async removeConnection(connectionId: string): Promise<void> {
    if (!this.config) {
      await this.loadConfiguration();
    }

    if (this.config) {
      this.config.connections = this.config.connections.filter(c => c.id !== connectionId);
      await this.saveConfiguration(this.config);
    }
  }

  private getDefaultConfiguration(): ClawdBotConfiguration {
    return {
      id: 'default-config',
      name: 'Default Configuration',
      description: 'Default ClawdBot configuration',
      settings: {
        startTime: new Date().toISOString()
      },
      agents: [],
      skills: [],
      triggers: [],
      connections: []
    };
  }
}