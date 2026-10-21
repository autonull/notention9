import { WebSocket } from 'ws';
import { PersistenceService } from '../persistence.js';
import { FeedbackCollector } from '../feedback/FeedbackCollector.js';
import { Note, Feedback } from '@notention/core';
import { error, log } from '../core/utils.js';
import { MeshtasticAgentManager } from '../network/MeshtasticAgentManager.js';
import { tryCatch } from '../utils/errorHandling.js';

interface SocketMessage {
  type: string;
  payload?: any;
  id?: string;
}

function sendResponse(ws: WebSocket, id: string | undefined, success: boolean, data?: any): void {
    ws.send(JSON.stringify({ type: success ? 'response' : 'error', id, success, ...data }));
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
    const { type, payload, id } = message;

    const handlers: Record<string, () => Promise<void>> = {
      get_agent_status: async () => {
        sendResponse(ws, id, true, { type: 'agent_status', payload: { status: 'mcp-only' } });
      },

      get_notes: async () => {
        const notes = await PersistenceService.getNotesSafe();
        sendResponse(ws, id, true, { type: 'notes_list', payload: notes });
      },

      save_note: async () => {
        await PersistenceService.saveNoteSafe(payload as Note);
        sendResponse(ws, id, true);
      },

      delete_note: async () => {
        await PersistenceService.deleteNoteSafe((payload as { id: string }).id);
        sendResponse(ws, id, true);
      },

      feedback: async () => {
        await this.feedbackCollector.recordFeedback(payload as Feedback);
        sendResponse(ws, id, true);
      },

      mesh_connect: async () => {
        await this.meshtasticManager.connect(payload.port);
        sendResponse(ws, id, true);
      },

      mesh_config: async () => {
        this.meshtasticManager.updateConfig({ saveReceivedNotes: payload.saveReceivedNotes });
        sendResponse(ws, id, true);
      },

      mesh_status: async () => {
        const status = this.meshtasticManager.getStatus();
        sendResponse(ws, id, true, { type: 'mesh_status', payload: status });
      },

      mesh_send_note: async () => {
        await this.meshtasticManager.sendNote(payload as Note);
        sendResponse(ws, id, true);
      },

      // No-op handlers
      note_created: async () => {},
      note_updated: async () => {},
      execute_workflow: async () => {},
    };

    const handler = handlers[type];
    if (handler) {
      const result = await tryCatch(
        () => handler(),
        `WS.${type}`,
        undefined
      );
      // If handler failed, send error response
      if (result === undefined && id !== undefined) {
        // Check if the error was already handled (no response sent yet)
        // The tryCatch logs the error but doesn't send response, so we send it here
        sendResponse(ws, id, false, { message: 'Operation failed' });
      }
    } else {
      sendResponse(ws, id, false, { message: `Unknown type: ${type}` });
    }
  }
}
