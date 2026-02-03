import { Logger } from './utils/logging.js';
import { SkillDefinition, SkillMatch } from './skillPatternMatcher.js';

/**
 * SkillApprovalManager - One-time approval for skill execution
 * 
 * As per TODO2.md Phase 4: Skills require one-time user approval before auto-execution.
 * After approval, matching patterns auto-execute in background.
 */

export interface SkillApproval {
    skillId: string;
    approvedAt: number;
    approvedPatterns: string[]; // Stringified pattern signatures
    autoExecute: boolean;
}

export class SkillApprovalManager {
    private approvals: Map<string, SkillApproval> = new Map();

    // Callbacks for user prompts
    private onApprovalRequest?: (
        skill: SkillDefinition,
        match: SkillMatch,
        reason: string
    ) => Promise<boolean>;

    constructor(
        onApprovalRequest?: (
            skill: SkillDefinition,
            match: SkillMatch,
            reason: string
        ) => Promise<boolean>
    ) {
        this.onApprovalRequest = onApprovalRequest;
    }

    /**
     * Check if skill is approved for auto-execution
     */
    isApproved(skillId: string): boolean {
        const approval = this.approvals.get(skillId);
        return approval !== undefined && approval.autoExecute;
    }

    /**
     * Request approval for skill execution
     * Returns true if approved (either previously or newly approved by user)
     */
    async requestApproval(
        skill: SkillDefinition,
        match: SkillMatch
    ): Promise<boolean> {
        // Check if already approved
        if (this.isApproved(skill.id)) {
            return true;
        }

        // No callback - cannot approve
        if (!this.onApprovalRequest) {
            Logger.getInstance().warn(`Skill ${skill.id} requires approval but no callback provided`);
            return false;
        }

        // Generate approval reason
        const reason = this.generateApprovalReason(skill, match);

        // Ask user
        const approved = await this.onApprovalRequest(skill, match, reason);

        if (approved) {
            // Record approval
            this.approvals.set(skill.id, {
                skillId: skill.id,
                approvedAt: Date.now(),
                approvedPatterns: match.matchedAttributes,
                autoExecute: true
            });
        }

        return approved;
    }

    /**
     * Generate human-readable approval reason
     */
    private generateApprovalReason(skill: SkillDefinition, match: SkillMatch): string {
        const attrs = match.matchedAttributes.join(', ');
        return (
            `"${skill.name}" wants to execute because your note contains: ${attrs}. ` +
            `This will query external APIs and create result notes. ` +
            `Confidence: ${match.confidence}%`
        );
    }

    /**
     * Revoke approval for a skill
     */
    revokeApproval(skillId: string): void {
        this.approvals.delete(skillId);
    }

    /**
     * Get all approved skills
     */
    getApprovedSkills(): SkillApproval[] {
        return Array.from(this.approvals.values());
    }

    /**
     * Load approvals from storage (for persistence)
     */
    loadApprovals(approvals: SkillApproval[]): void {
        for (const approval of approvals) {
            this.approvals.set(approval.skillId, approval);
        }
    }

    /**
     * Export approvals for storage
     */
    exportApprovals(): SkillApproval[] {
        return this.getApprovedSkills();
    }

    /**
     * Set approval request callback
     */
    setApprovalCallback(
        callback: (
            skill: SkillDefinition,
            match: SkillMatch,
            reason: string
        ) => Promise<boolean>
    ): void {
        this.onApprovalRequest = callback;
    }
}
