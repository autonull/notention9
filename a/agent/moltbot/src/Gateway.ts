import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { MoltBotBridge } from './bridge/MoltBotBridge';
import { MessageTransformer, MoltBotMessage } from './transformers/MessageTransformer';
import { Note } from '../../core/src/types/index.js';

export class Gateway {
  private process: ChildProcess | null = null;
  private configDir: string;
  private bridge: MoltBotBridge;
  public version: string = '2026.1.24-3'; // Hardcoded matches installed version
  private onMessageReceived?: (note: Note) => void;

  constructor(config: { configDir: string; onMessageReceived?: (note: Note) => void }) {
    this.configDir = config.configDir;
    this.onMessageReceived = config.onMessageReceived;
    this.bridge = new MoltBotBridge({
      port: 18789,
      reconnectInterval: 2000,
      maxReconnectAttempts: 30
    });

    // Wire up message transformer to bridge events
    this.setupMessageHandlers();
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Spawning ClawdBot gateway...');

      const cmd = 'npx';
      const args = ['clawdbot', 'gateway', '--port', '18789', '--no-color'];

      this.process = spawn(cmd, args, {
        cwd: process.cwd(),
        env: { ...process.env, CLAWDBOT_HOME: this.configDir },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      if (this.process.stdout) {
        this.process.stdout.on('data', (data) => {
          const msg = data.toString();
          console.log('[ClawdBot]', msg.trim());

          // Connect bridge when gateway indicates readiness
          if (msg.includes('Gateway listening') || msg.includes('ready')) {
            if (!this.bridge.isConnected) {
              this.bridge.connect().catch(err =>
                console.error('[Gateway] Bridge connection failed:', err?.message || err)
              );
            }
          }
        });
      }

      if (this.process.stderr) {
        this.process.stderr.on('data', (data) => {
          console.error('[ClawdBot Error]', data.toString().trim());
        });
      }

      this.process.on('error', (err) => {
        console.error('ClawdBot failed to start:', err?.message || err);
        reject(err);
      });

      this.process.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`ClawdBot exited with code ${code}`);
        }
        this.bridge.disconnect();
      });

      // Give it a moment to start
      setTimeout(() => resolve(), 2000);
    });
  }

  async stop(): Promise<void> {
    await this.bridge.disconnect();

    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  getBridge(): MoltBotBridge {
    return this.bridge;
  }

  /**
   * Set up handlers for incoming MoltBot messages
   * Transforms messages to Notes using ontology properties
   */
  private setupMessageHandlers(): void {
    this.bridge.on('message', (message: any) => {
      try {
        // Transform MoltBot message → Note
        const note = MessageTransformer.inboundToNote(message as MoltBotMessage);

        console.log('[Gateway] Incoming message transformed to note:', note.id);

        // Notify callback (will be handled by coordinator/index.ts)
        if (this.onMessageReceived) {
          this.onMessageReceived(note);
        }
      } catch (error) {
        console.error('[Gateway] Error transforming inbound message:', error);
      }
    });
  }

  /**
   * Send a note as a MoltBot message
   * Detects send intent from ontology operators
   */
  async sendNote(note: Note): Promise<void> {
    if (!MessageTransformer.hasSendIntent(note)) {
      throw new Error('Note does not have send intent (no "send to" operator)');
    }

    const message = MessageTransformer.outboundToMessage(note);
    if (!message) {
      throw new Error('Failed to transform note to message');
    }

    console.log('[Gateway] Sending note as message:', message);

    // Send via bridge
    await this.bridge.sendCommand('send_message', message);
  }

  async getStatus(): Promise<any> {
    return {
      connected: !!this.process,
      bridgeConnected: this.bridge.isConnected,
      status: this.process ? 'running' : 'stopped',
      version: this.version
    };
  }
}
