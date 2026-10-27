export type SideEffect = 'read' | 'write' | 'consequential';

export interface ToolPolicy {
    name: string;
    sideEffect: SideEffect;
    requiresConfirmation: boolean;
}

export const CONSEQUENTIAL = new Set([
    'publish_note',
    'delete_note',
    'merge_ontology',
    'grant_permission',
]);

export interface GuardrailConfig {
    reportOnly: boolean;
}

export class Guardrail {
    private config: GuardrailConfig;

    constructor(config: GuardrailConfig = { reportOnly: true }) {
        this.config = config;
    }

    assertAllowed(toolName: string, sideEffect: SideEffect = 'write'): void {
        if (this.config.reportOnly && sideEffect !== 'read') {
            throw new Error(`Tool ${toolName} blocked in report-only mode (sideEffect: ${sideEffect})`);
        }
    }

    isAllowed(toolName: string, sideEffect: SideEffect = 'write'): boolean {
        if (this.config.reportOnly && sideEffect !== 'read') {
            return false;
        }
        return true;
    }
}

export const guardrail = new Guardrail({ reportOnly: process.env.NOTENTION_REPORT_ONLY === '1' });