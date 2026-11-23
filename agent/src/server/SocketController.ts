import { WebSocket } from 'ws';
import { PersistenceService } from '../persistence.js';
import { FeedbackCollector } from '../feedback/FeedbackCollector.js';
import { Note, Feedback, SuggestionOrchestrator, SuggestionEvent, NoteSuggestion, createActionApprovalManager, type ActionApprovalManager, type CapabilityType } from '@notention/core';
import { error, log } from '../core/utils.js';
import { MeshtasticAgentManager } from '../network/MeshtasticAgentManager.js';
import { tryCatch } from '../utils/errorHandling.js';

interface SocketMessage {
  type: string;
  payload?: any;
  id?: string;
}

interface SuggestionSubscription {
  noteId: string;
  ws: WebSocket;
}

function sendResponse(ws: WebSocket, id: string | undefined, success: boolean, data?: any): void {
    ws.send(JSON.stringify({ type: success ? 'response' : 'error', id, success, ...data }));
}

export class SocketController {
  private uiClients = new Set<WebSocket>();
  private meshtasticManager: MeshtasticAgentManager;
  private suggestionSubscriptions = new Map<string, Set<WebSocket>>();
  private suggestionOrchestrator: SuggestionOrchestrator;
  private actionApprovalManager: ActionApprovalManager;

  constructor(
    private feedbackCollector: FeedbackCollector
  ) {
    this.meshtasticManager = new MeshtasticAgentManager((note) => {
        this.broadcast({ type: 'note_created', payload: note });
    });
    this.suggestionOrchestrator = SuggestionOrchestrator.getInstance();
    this.setupSuggestionEventForwarding();
    this.initActionApprovalManager();
  }

  private initActionApprovalManager(): void {
    this.actionApprovalManager = createActionApprovalManager();
  }

  private setupSuggestionEventForwarding(): void {
    this.suggestionOrchestrator.onAll((event: SuggestionEvent) => {
      this.broadcastSuggestionEvent(event);
    });
  }

  private broadcastSuggestionEvent(event: SuggestionEvent): void {
    const subscribers = this.suggestionSubscriptions.get(event.noteId);
    if (!subscribers) return;

    const message = {
      type: 'suggestion_event',
      payload: event
    };

    for (const ws of subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  public addClient(ws: WebSocket): void {
    this.uiClients.add(ws);
    ws.on('close', () => {
      this.uiClients.delete(ws);
      this.removeAllSuggestionSubscriptions(ws);
    });
  }

  private removeAllSuggestionSubscriptions(ws: WebSocket): void {
    for (const [noteId, subscribers] of this.suggestionSubscriptions.entries()) {
      subscribers.delete(ws);
      if (subscribers.size === 0) {
        this.suggestionSubscriptions.delete(noteId);
      }
    }
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

      suggestion_subscribe: async () => {
        const noteId = payload?.noteId;
        if (!noteId) {
          sendResponse(ws, id, false, { message: 'noteId required' });
          return;
        }

        if (!this.suggestionSubscriptions.has(noteId)) {
          this.suggestionSubscriptions.set(noteId, new Set());
        }
        this.suggestionSubscriptions.get(noteId)!.add(ws);

        // Send current suggestions
        const suggestions = this.suggestionOrchestrator.getSuggestions(noteId);
        sendResponse(ws, id, true, {
          type: 'suggestion_subscribe',
          payload: { suggestions, subscribed: true }
        });
      },

      // Action execution with approval
      execute_action: async () => {
        if (!this.actionApprovalManager) {
          sendResponse(ws, id, false, { message: 'Action approval system not initialized' });
          return;
        }

        const { action, noteId } = payload as { action: any; noteId?: string };
        if (!action || !action.type) {
          sendResponse(ws, id, false, { message: 'Invalid action: missing type' });
          return;
        }

        // Build capability list from action
        const capabilities = this.extractCapabilitiesFromAction(action);

        // Request approval
        const request = await this.actionApprovalManager.requestApproval({
            kind: action.type,
            scope: action.scope || '*',
            preview: this.generateActionPreview(action),
            capabilities,
            noteId: payload.noteId,
        });

        // Send approval request to UI
        sendResponse(ws, id, true, {
            type: 'action_approval_required',
            payload: {
                requestId: request.id,
                kind: request.kind,
                scope: request.scope,
                preview: request.preview,
                capabilities: request.capabilities,
                requestedAt: request.requestedAt,
                expiresAt: request.expiresAt,
                noteId: request.noteId,
            }
        });

        // Wait for approval decision (with timeout)
        const approvalResult = await this.waitForApproval(request.id, 5 * 60 * 1000);
        if (!approvalResult || approvalResult.decision !== 'approve') {
            sendResponse(ws, id, false, { message: 'Action denied or expired', approved: false });
            return;
        }

        // Execute the approved action
        try {
            const result = await this.executeActionWithApproval(action, request.id, approvalResult);
            sendResponse(ws, id, true, { type: 'action_result', payload: result });
        } catch (e) {
            error('ActionExecutor', 'Action execution failed', e as Error);
            sendResponse(ws, id, false, { message: (e as Error).message });
        }
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

  /**
   * Extract capabilities from an action object
   */
  private extractCapabilitiesFromAction(action: any): Array<{ type: CapabilityType; scope: string }> {
    const capabilities: Array<{ type: CapabilityType; scope: string }> = [];

    switch (action.type) {
      case 'browser:navigate':
      case 'browser:screenshot':
      case 'browser:scrape':
      case 'browser:interact':
        capabilities.push({ type: action.type as CapabilityType, scope: action.url || action.scope || '*' });
        break;
      case 'network:fetch':
        try {
          capabilities.push({ type: 'network:fetch', scope: new URL(action.url).hostname });
        } catch {
          capabilities.push({ type: 'network:fetch', scope: action.url });
        }
        break;
      case 'filesystem:read':
      case 'filesystem:write':
        capabilities.push({ type: action.type as CapabilityType, scope: action.path || '*' });
        break;
      case 'system:exec':
        capabilities.push({ type: 'system:exec', scope: '*' });
        break;
      default:
        capabilities.push({ type: action.type as CapabilityType, scope: action.scope || '*' });
    }

    return capabilities;
  }

  /**
   * Generate a human-readable preview of what the action will do
   */
  private generateActionPreview(action: any): string {
    switch (action.type) {
      case 'browser:navigate':
        return `Navigate to ${action.url}`;
      case 'browser:screenshot':
        return `Take a screenshot of ${action.url || 'current page'}${action.screenshot === 'full' ? ' (full page)' : ''}`;
      case 'browser:scrape':
        return `Scrape content from ${action.url || 'current page'}`;
      case 'browser:interact':
        if (action.interactions && action.interactions.length > 0) {
          const steps = action.interactions.map((i: any) => `${i.type} ${i.selector || ''}`).join(', ');
          return `Interact with page: ${steps}`;
        }
        return 'Interact with page';
      case 'network:fetch':
        return `Make ${action.method || 'GET'} request to ${action.url}`;
      case 'filesystem:read':
        return `Read file: ${action.path}`;
      case 'filesystem:write':
        return `Write to file: ${action.path}`;
      case 'system:exec':
        return `Execute command: ${action.command}`;
      default:
        return `Execute ${action.type}`;
    }
  }

  /**
   * Wait for approval decision with timeout
   * In a real implementation, this would listen for a WebSocket message from the UI
   * For now, we use a polling mechanism with a timeout
   */
  private async waitForApproval(requestId: string, timeoutMs: number): Promise<{ decision: 'approve' | 'deny'; scope?: string; undoUntil?: string } | null> {
    const startTime = Date.now();
    const checkInterval = 500;

    return new Promise((resolve) => {
      const checkApproval = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed > timeoutMs) {
          return resolve(null);
        }
        
        // In a real implementation, this would check a decision queue
        // For now, we simulate by checking if the request has been resolved
        // The actual approval comes from the UI via WebSocket
        
        // This is a placeholder - real implementation would wait for a WebSocket message
        // from the UI with the approval decision
        setTimeout(checkApproval, checkInterval);
      };
      checkApproval();
    });
  }

  /**
   * Execute an approved action
   */
  private async executeActionWithApproval(action: any, requestId: string, approval: any): Promise<any> {
    // Log execution start
    const { log } = await import('../core/utils.js');
    log('ActionExecutor', `Executing approved action: ${action.type}`, { requestId });

    // Import action executor
    const { executeAction } = await import('../core/actionExecutor.js');
    
    // Execute the action
    const result = await executeAction(action);
    
    return result;
  }
}
