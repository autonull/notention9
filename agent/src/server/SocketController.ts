import { WebSocket } from 'ws';
import { AgentRegistry } from '../core/AgentRegistry';
import { AgentWorkflowSkillExecutor } from '../skills/AgentWorkflowSkillExecutor';
import { PersistenceService } from '../persistence';
import { FeedbackCollector } from '../feedback/FeedbackCollector';
import { Note, Feedback } from '@notention/core';
import { error, log } from '../core/utils';

export class SocketController {
  private uiClients = new Set<WebSocket>();

  constructor(
    private agentRegistry: AgentRegistry,
    private skillExecutor: AgentWorkflowSkillExecutor,
    private feedbackCollector: FeedbackCollector
  ) {}

  public addClient(ws: WebSocket) {
    this.uiClients.add(ws);
    ws.on('close', () => this.uiClients.delete(ws));
  }

  public broadcast(message: any) {
    for (const client of this.uiClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    }
  }

  public async handleMessage(message: any, ws: WebSocket) {
    const agent = this.agentRegistry.getDefault();
    if (!agent) {
      ws.send(JSON.stringify({ type: 'error', message: 'No agent available' }));
      return;
    }

    // Simple permissive check for now
    const shouldExecuteSkills = async (note: Note) => true;

    try {
      switch (message.type) {
        case 'note_created': {
          const notes = await this.skillExecutor.executeForNote(message.payload);
          for (const result of notes) {
            this.broadcast({ type: 'note_created', payload: result });
          }
          break;
        }

        case 'note_updated':
          if (await shouldExecuteSkills(message.payload)) {
            const results = await this.skillExecutor.executeForNote(message.payload);
            for (const result of results) {
              this.broadcast({ type: 'note_created', payload: result });
            }
          }
          break;

        case 'execute_workflow':
          try {
            const result = await agent.executeWorkflow(message.payload.workflowId, message.payload.input);
            ws.send(JSON.stringify({ type: 'workflow_result', payload: result }));
          } catch (e: any) {
            ws.send(JSON.stringify({ type: 'error', message: e.message }));
          }
          break;

        case 'get_agent_status':
          const status = await agent.getStatus();
          ws.send(JSON.stringify({ type: 'agent_status', payload: status }));
          break;

        case 'get_notes': {
          const notes = await PersistenceService.getNotesSafe();
          ws.send(JSON.stringify({ type: 'notes_list', payload: notes, id: message.id }));
          break;
        }

        case 'save_note': {
          await PersistenceService.saveNoteSafe(message.payload);
          ws.send(JSON.stringify({ type: 'response', id: message.id, success: true }));
          break;
        }

        case 'delete_note': {
          await PersistenceService.deleteNoteSafe(message.payload.id);
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
    } catch (e) {
      error('WS', 'Error handling message', e);
      ws.send(JSON.stringify({ type: 'error', message: 'Internal error' }));
    }
  }
}
