import axios from 'axios';

// ClawdBot communication client for proxy-based architecture
export interface ClawdBotCommand {
  id: string;
  command: string;
  payload: any;
  timestamp: string;
}

export interface ClawdBotResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export interface ClawdBotClientOptions {
  port: number;
  host?: string;
  timeout?: number;
}

export class ClawdBotClient {
  private port: number;
  private host: string;
  private timeout: number;
  private baseUrl: string;

  constructor(options: ClawdBotClientOptions) {
    this.port = options.port;
    this.host = options.host || '127.0.0.1';
    this.timeout = options.timeout || 10000; // 10 seconds
    this.baseUrl = `http://${this.host}:${this.port}`;
  }

  // Initialize the client (could be used to verify connection)
  async initialize(): Promise<void> {
    try {
      // Try to get basic status to verify connection
      await this.getStatus();
      console.log('Successfully connected to ClawdBot gateway');
    } catch (error) {
      console.error('Failed to connect to ClawdBot gateway:', error);
      throw error;
    }
  }

  async getStatus(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/status`, {
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error getting status from ClawdBot:', error);
      throw error;
    }
  }

  async executeAction(action: any): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/execute`, {
        action,
        timestamp: new Date().toISOString()
      }, {
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error executing action in ClawdBot:', error);
      throw error;
    }
  }

  async createAgent(agentConfig: any): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/agents`, agentConfig, {
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error creating agent in ClawdBot:', error);
      throw error;
    }
  }

  async deleteAgent(agentId: string): Promise<any> {
    try {
      const response = await axios.delete(`${this.baseUrl}/agents/${agentId}`, {
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting agent in ClawdBot:', error);
      throw error;
    }
  }

  async listAgents(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/agents`, {
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error listing agents in ClawdBot:', error);
      throw error;
    }
  }

  async updateAgent(agentId: string, config: any): Promise<any> {
    try {
      const response = await axios.put(`${this.baseUrl}/agents/${agentId}`, config, {
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error updating agent in ClawdBot:', error);
      throw error;
    }
  }

  async getAgent(agentId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/agents/${agentId}`, {
        timeout: this.timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error getting agent from ClawdBot:', error);
      throw error;
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.getStatus();
      return true;
    } catch {
      return false;
    }
  }
}