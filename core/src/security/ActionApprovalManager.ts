import { CapabilityManager, CapabilityType } from './CapabilityManager.js';
import { getLedger, LedgerEventType } from '../telemetry/ledger.js';
import { generateId } from '../utils/common.js';
import { EventStore } from '../schemas/sharedTypes.js';

/**
 * Action types that require approval
 */
export type ActionKind = 
    | 'browser:navigate'
    | 'browser:screenshot'
    | 'browser:scrape'
    | 'browser:interact'
    | 'network:fetch'
    | 'filesystem:read'
    | 'filesystem:write'
    | 'system:exec';

/**
 * Action approval status
 */
export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired';

/**
 * Action approval request
 */
export interface ActionApprovalRequest {
    id: string;
    kind: ActionKind;
    scope: string;
    preview: string; // Human-readable description of what will happen
    capabilities: Array<{ type: CapabilityType; scope: string }>;
    requestedAt: string;
    expiresAt: string;
    status: ApprovalStatus;
    noteId?: string; // Optional: the note triggering this action
}

/**
 * Action approval decision
 */
export interface ActionApprovalDecision {
    requestId: string;
    decision: 'approve' | 'deny';
    decidedAt: string;
    reason?: string;
    scope?: string; // Optional: narrowed scope (e.g., specific domain instead of '*')
    undoUntil?: string; // ISO timestamp for undo window
}

/**
 * Action audit entry
 */
export interface ActionAuditEntry {
    id: string;
    request: ActionApprovalRequest;
    decision: ActionApprovalDecision;
    executedAt?: string;
    executionResult?: 'success' | 'failed';
    executionError?: string;
}

/**
 * Action Approval Manager
 * Handles the approval workflow for privileged actions
 */
export class ActionApprovalManager {
    private capabilityManager = new CapabilityManager();
    private pendingRequests = new Map<string, ActionApprovalRequest>();
    private auditLog: ActionAuditEntry[] = [];
    private eventStore?: EventStore;
    private defaultExpiryMs = 5 * 60 * 1000; // 5 minutes
    private defaultUndoWindowMs = 30 * 1000; // 30 seconds

    constructor(eventStore?: EventStore) {
        this.eventStore = eventStore;
    }

    /**
     * Request approval for an action
     */
    async requestApproval(request: Omit<ActionApprovalRequest, 'id' | 'requestedAt' | 'expiresAt' | 'status'>): Promise<ActionApprovalRequest> {
        const id = generateId();
        const now = new Date();
        const requestedAt = now.toISOString();
        const expiresAt = new Date(now.getTime() + this.defaultExpiryMs).toISOString();

        const fullRequest: ActionApprovalRequest = {
            ...request,
            id,
            requestedAt,
            expiresAt,
            status: 'pending',
        };

        this.pendingRequests.set(id, fullRequest);
        return fullRequest;
    }

    /**
     * Check if an action is allowed (has valid approval or granted permission)
     */
    async checkActionAllowed(
        kind: ActionKind,
        scope: string,
        permissions: ReturnType<CapabilityManager['extractPermissions']>
    ): Promise<{ allowed: boolean; reason?: string; approvalId?: string }> {
        // First check if there's a pending approval
        for (const [id, request] of this.pendingRequests) {
            if (request.kind === kind && 
                this.capabilityManager.matchScope(request.scope, scope) &&
                request.status === 'approved' &&
                new Date(request.expiresAt) > new Date()) {
                return { allowed: true, approvalId: id };
            }
        }

        // Then check CapabilityManager permissions
        const requiredCapability = kind as CapabilityType;
        const allowed = this.capabilityManager.checkPermission(requiredCapability, scope, permissions);
        
        if (allowed) {
            return { allowed: true };
        }

        return { allowed: false, reason: 'No approval or permission granted' };
    }

    /**
     * Approve an action request
     */
    async approve(requestId: string, decision: Omit<ActionApprovalDecision, 'requestId' | 'decidedAt' | 'decision'>): Promise<ActionApprovalDecision> {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            throw new Error(`Approval request ${requestId} not found`);
        }

        if (request.status !== 'pending') {
            throw new Error(`Request ${requestId} is not pending (status: ${request.status})`);
        }

        if (new Date(request.expiresAt) < new Date()) {
            request.status = 'expired';
            throw new Error(`Approval request ${requestId} has expired`);
        }

        const now = new Date();
        const fullDecision: ActionApprovalDecision = {
            requestId,
            decision: 'approve',
            decidedAt: now.toISOString(),
            reason: decision.reason,
            scope: decision.scope || request.scope,
            undoUntil: decision.undoUntil || new Date(now.getTime() + this.defaultUndoWindowMs).toISOString(),
        };

        request.status = 'approved';

        // Log to ledger
        await this.logApproval(fullDecision, request);

        return fullDecision;
    }

    /**
     * Deny an action request
     */
    async deny(requestId: string, decision: Omit<ActionApprovalDecision, 'requestId' | 'decidedAt' | 'decision'>): Promise<ActionApprovalDecision> {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            throw new Error(`Approval request ${requestId} not found`);
        }

        if (request.status !== 'pending') {
            throw new Error(`Request ${requestId} is not pending (status: ${request.status})`);
        }

        const fullDecision: ActionApprovalDecision = {
            requestId,
            decision: 'deny',
            decidedAt: new Date().toISOString(),
            reason: decision.reason,
            scope: decision.scope,
        };

        request.status = 'denied';

        // Log to ledger
        await this.logApproval(fullDecision, request);

        return fullDecision;
    }

    /**
     * Execute an approved action with undo window
     */
    async executeApproved<T>(
        approvalId: string,
        executor: () => Promise<T>
    ): Promise<{ result: T; undo: () => Promise<void> }> {
        const request = this.pendingRequests.get(approvalId);
        if (!request || request.status !== 'approved') {
            throw new Error(`No valid approval found for ${approvalId}`);
        }

        const decision = await this.getDecision(approvalId);
        if (!decision || decision.decision !== 'approve') {
            throw new Error(`No approval decision found for ${approvalId}`);
        }

        const undoUntil = decision.undoUntil ? new Date(decision.undoUntil) : null;
        const undoAvailable = undoUntil && undoUntil > new Date();

        let executed = false;
        let result: T;
        let executionError: string | undefined;

        try {
            result = await executor();
            executed = true;
        } catch (e) {
            executionError = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            // Log execution
            await this.logExecution(approvalId, request, executed, executionError);
        }

        // Create undo function
        const undo = async () => {
            if (!undoAvailable) {
                throw new Error('Undo window has expired');
            }
            if (!executed) {
                throw new Error('Action was not executed');
            }
            // Note: Actual undo logic depends on the action type
            // This is a placeholder - real implementation would need action-specific undo
            console.warn(`Undo requested for ${approvalId}, but no undo logic implemented for this action type`);
        };

        return { result: result!, undo };
    }

    /**
     * Get pending requests
     */
    getPendingRequests(): ActionApprovalRequest[] {
        return Array.from(this.pendingRequests.values())
            .filter(r => r.status === 'pending' && new Date(r.expiresAt) > new Date());
    }

    /**
     * Get approval decision
     */
    async getDecision(requestId: string): Promise<ActionApprovalDecision | undefined> {
        // Query from ledger
        if (this.eventStore) {
            const events = await this.eventStore.query({
                type: 'action:approval' as LedgerEventType,
                limit: 100,
            });
            const event = events.find(e => e.payload.type === 'action:approval' && e.payload.request.id === requestId);
            if (event?.payload.type === 'action:approval') {
                return event.payload.decision as ActionApprovalDecision;
            }
        }
        return undefined;
    }

    /**
     * Export audit log
     */
    exportAudit(): ActionAuditEntry[] {
        return [...this.auditLog];
    }

    /**
     * Clear expired requests
     */
    cleanupExpired(): void {
        const now = new Date();
        for (const [id, request] of this.pendingRequests) {
            if (new Date(request.expiresAt) < now) {
                if (request.status === 'pending') {
                    request.status = 'expired';
                }
            }
        }
    }

    private async logApproval(decision: ActionApprovalDecision, request: ActionApprovalRequest): Promise<void> {
        if (!this.eventStore) return;

        const auditEntry: ActionAuditEntry = {
            id: generateId(),
            request,
            decision,
        };

        this.auditLog.push(auditEntry);

        // Also log to ledger
        await this.eventStore.append({
            type: 'action:approval' as LedgerEventType,
            actor: 'human',
            payload: {
                type: 'action:approval',
                request,
                decision,
            },
        });
    }

    private async logExecution(approvalId: string, request: ActionApprovalRequest, executed: boolean, error?: string): Promise<void> {
        if (!this.eventStore) return;

        await this.eventStore.append({
            type: 'action:execution' as LedgerEventType,
            actor: 'system',
            payload: {
                type: 'action:execution',
                approvalId,
                requestId: request.id,
                kind: request.kind,
                scope: request.scope,
                executed,
                error,
            },
        });
    }
}

/**
 * Convenience function to create an approval manager with ledger integration
 */
export function createActionApprovalManager(eventStore?: EventStore): ActionApprovalManager {
    return new ActionApprovalManager(eventStore);
}