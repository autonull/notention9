import { Note, RobustWebSocket } from '@notention/core';
import { capabilities } from '../config/Capabilities';

class AgentService extends RobustWebSocket {

  constructor() {
    super();
  }

  async connect(url?: string): Promise<void> {
    if (!capabilities.agent) {
      this.logger.info('Agent subsystem disabled via config');
      // Status remains 'disconnected' or we can leave it as is.
      // Important: Do NOT call fallbackToOfflineMode() which emits 'connected'.
      return;
    }

    const resolvedUrl = await this.resolveUrl(url);

    if (resolvedUrl) {
      await super.connect(resolvedUrl);
    } else {
      this.logger.info('Operating in offline mode');
      this.fallbackToOfflineMode();
    }
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
    if (!capabilities.agent) {
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
    this.send({ type: 'save_note', payload: note });
  }

  async deleteNote(id: string): Promise<void> {
    this.send({ type: 'delete_note', payload: { id } });
  }

  // Alias methods if needed to match previous API exactly, though base class has most
  isOffline(): boolean {
    return !this.isOnlineMode && capabilities.agent;
  }

  isEnabled(): boolean {
    return capabilities.agent;
  }
}

export const agentService = new AgentService();
