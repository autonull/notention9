import { WebSocket } from 'ws';
import { AgentRegistry } from '../core/AgentRegistry.js';
import { AgentWorkflowSkillExecutor } from '../skills/AgentWorkflowSkillExecutor.js';
import { PersistenceService } from '../persistence.js';
import { FeedbackCollector } from '../feedback/FeedbackCollector.js';
import { Note, Feedback } from '@notention/core';
import { error, log } from '../core/utils.js';

interface SocketMessage {
  type: string;
  payload?: any;
  id?: string;
}

export class SocketController {
  private uiClients = new Set<WebSocket>();

  constructor(
    private agentRegistry: AgentRegistry,
    private skillExecutor: AgentWorkflowSkillExecutor,
    private feedbackCollector: FeedbackCollector
  ) {}

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
    const agent = this.agentRegistry.getDefault();
    if (!agent) {
      ws.send(JSON.stringify({ type: 'error', message: 'No agent available' }));
      return;
    }

    const shouldExecuteSkills = async (_note: Note): Promise<boolean> => true;

    try {
      switch (message.type) {
        case 'note_created': {
          const notes = await this.skillExecutor.executeForNote(message.payload as Note);
          for (const result of notes) {
            this.broadcast({ type: 'note_created', payload: result });
          }
          break;
        }

        case 'note_updated':
          if (await shouldExecuteSkills(message.payload as Note)) {
            const results = await this.skillExecutor.executeForNote(message.payload as Note);
            for (const result of results) {
              this.broadcast({ type: 'note_created', payload: result });
            }
          }
          break;

        case 'execute_workflow': {
          try {
            const payload = message.payload as { workflowId: string; input: any };
            const result = await agent.executeWorkflow(payload.workflowId, payload.input);
            ws.send(JSON.stringify({ type: 'workflow_result', payload: result }));
          } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            ws.send(JSON.stringify({ type: 'error', message: errorMessage }));
          }
          break;
        }

        case 'get_agent_status': {
          const status = await agent.getStatus();
          ws.send(JSON.stringify({ type: 'agent_status', payload: status }));
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

        default:
          ws.send(JSON.stringify({ type: 'error', message: `Unknown type: ${message.type}` }));
      }
    } catch (e: unknown) {
      error('WS', 'Error handling message', e as Error);
      ws.send(JSON.stringify({ type: 'error', message: 'Internal error' }));
    }
  }
}
