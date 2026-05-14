import type { Note } from './types/index.js';
import type { SkillPatternMatcher, SkillDefinition, SkillMatch } from './skillPatternMatcher.js';
import type { SkillApprovalManager } from './skillApprovalManager.js';
import { NetworkGate } from './networkGate.js';
import type { OntologyService } from './ontologyService.js';
import { BaseSkill } from './skills/BaseSkill.js';
import { Logger } from './utils/logging.js';
import {
    executeLegacySkill,
    executeBaseSkill,
    type SkillExecutionResult
} from './skillExecutor/index.js';

/**
 * SkillExecutor - Orchestrates skill execution based on pattern matching
 * 
 * Supports two skill types:
 * - Legacy SkillDefinition: Object-based skills with execute function
 * - BaseSkill: Class-based skills with lifecycle methods
 */
export class SkillExecutor {
    private matcher: SkillPatternMatcher;
    private approvalManager: SkillApprovalManager;
    private networkGate: NetworkGate;
    private ontologyService: OntologyService;
    private logger = Logger.getInstance();

    private onResultNotes?: (notes: Note[], sourceNote: Note, skill: SkillDefinition | BaseSkill) => void;

    constructor(
        matcher: SkillPatternMatcher,
        approvalManager: SkillApprovalManager,
        ontologyService?: OntologyService
    ) {
        this.matcher = matcher;
        this.approvalManager = approvalManager;
        this.networkGate = new NetworkGate();
        this.ontologyService = ontologyService || matcher.getOntologyService();
    }

    /**
     * Process note and execute matching skills
     * Main entry point for skill execution
     */
    async processNote(
        note: Note,
        options: {
            autoExecute?: boolean;
            confidenceThreshold?: number;
        } = {}
    ): Promise<SkillExecutionResult[]> {
        const { autoExecute = true, confidenceThreshold = 50 } = options;

        const matches = this.matcher.matchSkills(note);
        const qualified = matches.filter(m => m.confidence >= confidenceThreshold);

        if (qualified.length === 0) {
            return [];
        }

        return await Promise.all(
            qualified.map(match => this.executeSkill(note, match, autoExecute))
        );
    }

    /**
     * Execute a specific skill
     */
    private async executeSkill(
        note: Note,
        match: SkillMatch,
        autoExecute: boolean
    ): Promise<SkillExecutionResult> {
        const { skill } = match;

        try {
            if ('execute' in skill && typeof skill.execute === 'function') {
                return await this.executeLegacySkill(note, skill as SkillDefinition, match, autoExecute);
            } else if (skill instanceof BaseSkill) {
                return await this.executeBaseSkill(note, skill, autoExecute);
            } else {
                return {
                    success: false,
                    error: 'Invalid skill type'
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `[SkillExecutor] Error executing skill:`,
                error instanceof Error ? error : new Error(errorMessage)
            );
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Execute a legacy skill definition
     */
    private async executeLegacySkill(
        note: Note,
        skill: SkillDefinition,
        match: SkillMatch,
        autoExecute: boolean
    ): Promise<SkillExecutionResult> {
        return executeLegacySkill(
            note,
            skill,
            match,
            autoExecute,
            {
                approvalManager: this.approvalManager,
                networkGate: this.networkGate,
                logger: this.logger
            },
            this.onResultNotes
        );
    }

    /**
     * Execute a base skill class
     */
    private async executeBaseSkill(
        note: Note,
        skill: BaseSkill,
        autoExecute: boolean
    ): Promise<SkillExecutionResult> {
        return executeBaseSkill(
            note,
            skill,
            autoExecute,
            {
                networkGate: this.networkGate,
                logger: this.logger
            },
            this.onResultNotes
        );
    }

    /**
     * Set callback for result notes
     */
    setResultCallback(
        callback: (notes: Note[], sourceNote: Note, skill: SkillDefinition | BaseSkill) => void
    ): void {
        this.onResultNotes = callback;
    }

    /**
     * Get pattern matcher
     */
    getMatcher(): SkillPatternMatcher {
        return this.matcher;
    }

    /**
     * Get approval manager
     */
    getApprovalManager(): SkillApprovalManager {
        return this.approvalManager;
    }

    /**
     * Get ontology service
     */
    getOntologyService(): OntologyService {
        return this.ontologyService;
    }
}
