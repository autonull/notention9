import { WebSocket } from 'ws';
import { PersistenceService } from '../persistence.js';
import { FeedbackCollector } from '../feedback/FeedbackCollector.js';
import { Note, Feedback } from '@notention/core';
import { error, log } from '../core/utils.js';
import { MeshtasticAgentManager } from '../network/MeshtasticAgentManager.js';

interface SocketMessage {
  type: string;
  payload?: any;
  id?: string;
}

export class SocketController {
  private uiClients = new Set<WebSocket>();
  private meshtasticManager: MeshtasticAgentManager;

  constructor(
    private feedbackCollector: FeedbackCollector
  ) {
    this.meshtasticManager = new MeshtasticAgentManager((note) => {
        this.broadcast({ type: 'note_created', payload: note });
    });
  }

  public addClient(ws: WebSocket): void {
    this.uiClients.add(ws);
    ws.on('close', () => this.uiClients.delete(ws));
  }

  public broadcast(message: SocketMessage): void {
    for (const client of this.uiClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    }
  }

  public async handleMessage(message: SocketMessage, ws: WebSocket): Promise<void> {

    try {
      switch (message.type) {
        case 'get_agent_status': {
          ws.send(JSON.stringify({ type: 'agent_status', payload: { status: 'mcp-only' } }));
          break;
        }

        case 'get_notes': {
          const notes = await PersistenceService.getNotesSafe();
          ws.send(JSON.stringify({ type: 'notes_list', payload: notes, id: message.id }));
          break;
        }

        case 'save_note': {
          await PersistenceService.saveNoteSafe(message.payload as Note);
          ws.send(JSON.stringify({ type: 'response', id: message.id, success: true }));
          break;
        }

        case 'delete_note': {
          const payload = message.payload as { id: string };
          await PersistenceService.deleteNoteSafe(payload.id);
          ws.send(JSON.stringify({ type: 'response', id: message.id, success: true }));
          break;
        }

        case 'feedback': {
            const feedback = message.payload as Feedback;
            await this.feedbackCollector.recordFeedback(feedback);
            ws.send(JSON.stringify({ type: 'response', id: message.id, success: true }));
            break;
        }

        case 'mesh_connect': {
            try {
                const { port } = message.payload;
                await this.meshtasticManager.connect(port);
                ws.send(JSON.stringify({ type: 'response', id: message.id, success: true }));
            } catch (e: any) {
                ws.send(JSON.stringify({ type: 'error', message: e.message, id: message.id }));
            }
            break;
        }

        case 'mesh_config': {
            try {
                const { saveReceivedNotes } = message.payload;
                this.meshtasticManager.updateConfig({ saveReceivedNotes });
                ws.send(JSON.stringify({ type: 'response', id: message.id, success: true }));
            } catch (e: any) {
                ws.send(JSON.stringify({ type: 'error', message: e.message, id: message.id }));
            }
            break;
        }

        case 'mesh_status': {
            const status = this.meshtasticManager.getStatus();
            ws.send(JSON.stringify({ type: 'mesh_status', payload: status, id: message.id }));
            break;
        }

        case 'mesh_send_note': {
            try {
                await this.meshtasticManager.sendNote(message.payload as Note);
                ws.send(JSON.stringify({ type: 'response', id: message.id, success: true }));
            } catch (e: any) {
                ws.send(JSON.stringify({ type: 'error', message: e.message, id: message.id }));
            }
            break;
        }

        // Catch-all for events that might have been removed
        case 'note_created':
        case 'note_updated':
        case 'execute_workflow':
            // No-op for now as these were handled by internal agent
            break;

        default:
          ws.send(JSON.stringify({ type: 'error', message: `Unknown type: ${message.type}` }));
      }
    } catch (e: unknown) {
      error('WS', 'Error handling message', e as Error);
      ws.send(JSON.stringify({ type: 'error', message: 'Internal error' }));
    }
  }
}
