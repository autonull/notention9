type Listener = (...args: any[]) => void;

class AgentService {
  private ws: WebSocket | null = null;
  private url: string | null = null;
  private listeners: Record<string, Listener[]> = {};

  async connect(url?: string) {
    if (this.ws) return;

    if (!url) {
      // Try to discover
      try {
        const res = await fetch('/agent-config.json');
        if (res.ok) {
           const config = await res.json();
           url = config.wsUrl;
        }
      } catch (e) {
        // console.log('No agent config found');
      }
    }

    if (!url && typeof window !== 'undefined' && (window as any).CLAWDBOT_WS_URL) {
        url = (window as any).CLAWDBOT_WS_URL;
    }

    if (!url) return;
    this.url = url;

    try {
        this.ws = new WebSocket(url);
        this.ws.onopen = () => {
          console.log('Connected to Agent');
          this.emit('connected');
        };
        this.ws.onmessage = (msg) => {
            this.emit('message', msg.data);
        };
        this.ws.onclose = () => {
            this.ws = null;
            this.emit('disconnected');
            // Reconnect logic could go here
            setTimeout(() => this.connect(url), 5000);
        };
        this.ws.onerror = (err) => {
            console.error('Agent connection error', err);
        };
    } catch (e) {
        console.error('Failed to create WebSocket', e);
    }
  }

  send(data: any) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(data));
      } else {
          console.warn('Agent not connected, cannot send', data);
      }
  }

  on(event: string, fn: Listener) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(fn);
  }

  off(event: string, fn: Listener) {
      if (!this.listeners[event]) return;
      this.listeners[event] = this.listeners[event].filter(l => l !== fn);
  }

  emit(event: string, ...args: any[]) {
      if (this.listeners[event]) {
          this.listeners[event].forEach(fn => fn(...args));
      }
  }
}

export const agentService = new AgentService();
