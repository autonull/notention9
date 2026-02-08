import { Note, RobustWebSocket } from '@notention/core';
import { capabilities } from '../config/Capabilities';

class AgentService extends RobustWebSocket {
  private _enabled: boolean;
  private _url: string | null = null;

  constructor() {
    // Reduce max retries to fail faster to Offline mode
    super({ maxReconnectAttempts: 1 });

    // Initialize enabled state from local storage or capabilities
    const storedEnabled = typeof window !== 'undefined' ? localStorage.getItem('agent_enabled') : null;
    this._enabled = storedEnabled !== null ? storedEnabled === 'true' : capabilities.agent;

    if (typeof window !== 'undefined') {
        this._url = localStorage.getItem('agent_url');
    }
  }

  async connect(url?: string): Promise<void> {
    // If explicitly disabled via internal state, do not connect
    if (!this._enabled) {
      this.logger.info('Agent subsystem disabled by user setting');
      return;
    }

    const resolvedUrl = await this.resolveUrl(url || this._url || undefined);

    if (resolvedUrl) {
      try {
        await super.connect(resolvedUrl);
      } catch (e) {
        this.logger.warn('Initial connection failed, falling back to offline', e);
        this.fallbackToOfflineMode();
      }
    } else {
      this.logger.info('Operating in offline mode');
      this.fallbackToOfflineMode();
    }
  }

  setEnabled(enabled: boolean) {
      this._enabled = enabled;
      if (typeof window !== 'undefined') {
          localStorage.setItem('agent_enabled', String(enabled));
      }

      if (enabled) {
          this.connect();
      } else {
          this.disconnect();
      }
  }

  setEndpoint(url: string) {
      this._url = url;
      if (typeof window !== 'undefined') {
          localStorage.setItem('agent_url', url);
      }
      if (this._enabled) {
          this.disconnect();
          this.connect();
      }
  }

  getEndpoint(): string | null {
      return this._url;
  }

  private async resolveUrl(url?: string): Promise<string | null> {
    if (url) return url;

    // Try to discover from config
    try {
      const res = await fetch('/agent-config.json');
      if (res.ok) {
        const config = await res.json();
        return config.wsUrl;
      }
    } catch (e) {
      this.logger.warn('Failed to fetch agent config', e);
    }

    // Fallback to global variable
    if (typeof window !== 'undefined' && (window as any).AGENT_WS_URL) {
      return (window as any).AGENT_WS_URL;
    }

    return null;
  }

  async fetchNotes(): Promise<Note[]> {
    if (!this._enabled) {
      return [];
    }

    if (!this.isOnlineMode) {
      return Promise.reject(new Error('Offline'));
    }

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const timeout = setTimeout(() => {
        this.off('message', handler);
        reject(new Error('Timeout fetching notes'));
      }, 5000);

      const handler = (msg: any) => {
        if (msg.type === 'notes_list' && msg.id === id) {
          clearTimeout(timeout);
          this.off('message', handler);
          resolve(msg.payload);
        }
      };

      this.on('message', handler);
      this.send({ type: 'get_notes', id });
    });
  }

  async saveNote(note: Note): Promise<void> {
    if (!this._enabled) return;
    this.send({ type: 'save_note', payload: note });
  }

  async deleteNote(id: string): Promise<void> {
    if (!this._enabled) return;
    this.send({ type: 'delete_note', payload: { id } });
  }

  // Alias methods if needed to match previous API exactly, though base class has most
  isOffline(): boolean {
    return !this.isOnlineMode && this._enabled;
  }

  isEnabled(): boolean {
    return this._enabled;
  }
}

export const agentService = new AgentService();
