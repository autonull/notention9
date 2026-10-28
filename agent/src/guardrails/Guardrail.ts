import { guardrail as optimizeGuardrail } from '@notention/optimize/policy';
import { getOptimizeLogPathSync } from '@notention/core/constants/paths';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export interface OptimizeLogEntry {
    runId: string;
    timestamp: string;
    intent: any;
    action: 'start' | 'tool_blocked' | 'tool_allowed' | 'end';
    toolName?: string;
    sideEffect?: string;
    details?: any;
}

export class OptimizeLog {
    private logPath: string;

    constructor(logPath?: string) {
        this.logPath = logPath ?? getOptimizeLogPathSync();
        this.ensureLogDir();
    }

    private ensureLogDir(): void {
        const dir = dirname(this.logPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }

    append(entry: OptimizeLogEntry): void {
        appendFileSync(this.logPath, JSON.stringify(entry) + '\n', 'utf-8');
    }

    logToolBlocked(runId: string, toolName: string, sideEffect: string): void {
        this.append({
            runId,
            timestamp: new Date().toISOString(),
            intent: {},
            action: 'tool_blocked',
            toolName,
            sideEffect,
        });
    }

    logToolAllowed(runId: string, toolName: string, sideEffect: string): void {
        this.append({
            runId,
            timestamp: new Date().toISOString(),
            intent: {},
            action: 'tool_allowed',
            toolName,
            sideEffect,
        });
    }
}

export const optimizeLog = new OptimizeLog();
export const guardrail = optimizeGuardrail;