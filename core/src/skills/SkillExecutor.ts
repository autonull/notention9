import type { Note, Property } from '../types/index.js';
import type { Skill, ActionSequence } from './types.js';
import { SkillApprovalManager, type SkillApproval } from './skillApprovalManager.js';
import { logInfo, logWarn, logError } from '../utils/logging.js';

export interface SkillExecutionResult {
    success: boolean;
    sequence: ActionSequence | null;
    notes: Note[];
    error?: string;
    approvalRequired: boolean;
    approvalReason?: string;
}

export interface SkillExecutionOptions {
    autoApprove?: boolean;
    onApprovalRequest?: (
        skill: Skill,
        sequence: ActionSequence,
        reason: string
    ) => Promise<boolean>;
}

export class SkillExecutor {
    private skills: Map<string, Skill> = new Map();
    private approvalManager: SkillApprovalManager;
    private executionHistory: SkillExecutionRecord[] = [];

    constructor() {
        this.approvalManager = new SkillApprovalManager();
    }

    registerSkill(skill: Skill): void {
        this.skills.set(skill.id, skill);
        logInfo(`Registered skill: ${skill.name} (${skill.id})`);
    }

    unregisterSkill(skillId: string): boolean {
        return this.skills.delete(skillId);
    }

    getSkill(skillId: string): Skill | undefined {
        return this.skills.get(skillId);
    }

    getAllSkills(): Skill[] {
        return Array.from(this.skills.values());
    }

    findMatchingSkills(note: Note): Skill[] {
        return Array.from(this.skills.values())
            .filter(skill => {
                try {
                    return skill.canHandle(note) > 0;
                } catch (e) {
                    logError(`Error checking skill ${skill.id}`, e as Error);
                    return false;
                }
            });
    }

    async executeSkill(
        skillId: string,
        note: Note,
        options: SkillExecutionOptions = {}
    ): Promise<SkillExecutionResult> {
        const skill = this.skills.get(skillId);
        if (!skill) {
            return {
                success: false,
                sequence: null,
                notes: [],
                error: `Skill not found: ${skillId}`,
                approvalRequired: false
            };
        }

        const sequence = skill.exportToActions(note);
        
        if (sequence.actions.length === 0) {
            const notes = skill.importFromData([], note);
            return {
                success: true,
                sequence,
                notes,
                approvalRequired: false
            };
        }

        const approved = this.approvalManager.isApproved(skillId);
        const autoApprove = options.autoApprove ?? false;

        if (!approved && !autoApprove) {
            if (!options.onApprovalRequest) {
                return {
                    success: false,
                    sequence,
                    notes: [],
                    error: 'Approval required but no approval callback provided',
                    approvalRequired: true,
                    approvalReason: this.approvalManager['generateApprovalReason']?.(skill, { 
                        skill, 
                        confidence: 100, 
                        matchedAttributes: sequence.actions.map(a => a.type) 
                    } as any)
                };
            }

            const userApproved = await options.onApprovalRequest(skill, sequence, 
                this.generateApprovalReason(skill, sequence)
            );

            if (!userApproved) {
                this.recordExecution({
                    skillId,
                    noteId: note.id,
                    timestamp: Date.now(),
                    approved: false,
                    success: false,
                    error: 'User rejected approval'
                });
                return {
                    success: false,
                    sequence,
                    notes: [],
                    error: 'User rejected approval',
                    approvalRequired: true,
                    approvalReason: this.generateApprovalReason(skill, sequence)
                };
            }
        }

        try {
            const results = await this.executeActionSequence(sequence);
            const notes = skill.importFromData(results, note);

            this.recordExecution({
                skillId,
                noteId: note.id,
                timestamp: Date.now(),
                approved: true,
                success: true,
                resultCount: notes.length
            });

            return {
                success: true,
                sequence,
                notes,
                approvalRequired: false
            };
        } catch (error) {
            logError(`Skill execution failed: ${skillId}`, error as Error);
            this.recordExecution({
                skillId,
                noteId: note.id,
                timestamp: Date.now(),
                approved: true,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            return {
                success: false,
                sequence,
                notes: [],
                error: error instanceof Error ? error.message : 'Unknown error',
                approvalRequired: false
            };
        }
    }

    private async executeActionSequence(sequence: ActionSequence): Promise<any[]> {
        const results: any[] = [];
        
        for (const action of sequence.actions) {
            const result = await this.executeAction(action);
            results.push(result);
        }

        return results;
    }

    private async executeAction(action: any): Promise<any> {
        if (action.type === 'navigate' && action.url) {
            return { url: action.url, type: 'navigation' };
        }
        
        if (action.type === 'wait') {
            await new Promise(resolve => setTimeout(resolve, action.duration || 1000));
            return { type: 'wait', duration: action.duration };
        }

        if (action.type === 'scrape' && action.scrapeRules) {
            return { type: 'scrape', rules: action.scrapeRules, data: {} };
        }

        if (action.type === 'screenshot') {
            return { type: 'screenshot', fullPage: action.fullPage };
        }

        if (action.type === 'fill-form' && action.selector && action.value) {
            return { type: 'fill-form', selector: action.selector, value: action.value };
        }

        if (action.type === 'click' && action.selector) {
            return { type: 'click', selector: action.selector };
        }

        if (action.type === 'api' && action.url) {
            const response = await fetch(action.url, {
                method: action.method || 'GET',
                headers: action.headers,
                body: action.body ? JSON.stringify(action.body) : undefined
            });
            return response.json();
        }

        return { type: 'unknown', action };
    }

    private generateApprovalReason(skill: Skill, sequence: ActionSequence): string {
        const actionDescriptions = sequence.actions
            .map(a => a.description || a.type)
            .join(', ');
        
        const domains = this.getSkillDomains(skill);
        const requiresAuth = this.skillRequiresAuth(skill);

        return (
            `"${skill.name}" wants to execute the following actions: ${actionDescriptions}.\n\n` +
            `External domains: ${domains.join(', ') || 'none'}\n` +
            `Requires authentication: ${requiresAuth ? 'Yes' : 'No'}\n` +
            `Expected outcome: ${sequence.expectedOutcome || 'Unknown'}\n\n` +
            `This will create ${sequence.actions.length} action(s) and may query external services.`
        );
    }

    private getSkillDomains(skill: Skill): string[] {
        if ('metadata' in skill && (skill as any).metadata?.domains) {
            return (skill as any).metadata.domains;
        }
        return [];
    }

    private skillRequiresAuth(skill: Skill): boolean {
        if ('metadata' in skill && (skill as any).metadata?.requiresAuth) {
            return (skill as any).metadata.requiresAuth;
        }
        return false;
    }

    private recordExecution(record: SkillExecutionRecord): void {
        this.executionHistory.push(record);
        if (this.executionHistory.length > 1000) {
            this.executionHistory.shift();
        }
    }

    getExecutionHistory(): SkillExecutionRecord[] {
        return [...this.executionHistory];
    }

    getApprovedSkills(): SkillApproval[] {
        return this.approvalManager.getApprovedSkills();
    }

    revokeApproval(skillId: string): void {
        this.approvalManager.revokeApproval(skillId);
    }

    setApprovalCallback(callback: (
        skill: Skill,
        match: any,
        reason: string
    ) => Promise<boolean>): void {
        this.approvalManager.setApprovalCallback(callback);
    }

    loadApprovals(approvals: SkillApproval[]): void {
        this.approvalManager.loadApprovals(approvals);
    }

    exportApprovals(): SkillApproval[] {
        return this.approvalManager.exportApprovals();
    }
}

export interface SkillExecutionRecord {
    skillId: string;
    noteId: string;
    timestamp: number;
    approved: boolean;
    success: boolean;
    resultCount?: number;
    error?: string;
}

export const skillExecutor = new SkillExecutor();