/**
 * Match Digest Pipeline (W4.4) - Node.js Implementation
 * Generates digests of new matches and pending actions
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDefaultAdapter } from '../storage/Storage.js';

import {
    type MatchDigestEvent,
    type MatchDigestAggregate,
    type MatchDigestSignal,
    type MatchDigestConfig,
    DEFAULT_MATCH_DIGEST_CONFIG,
    MS_PER_DAY,
    isInQuietHours,
    filterEventsByTime,
    aggregateEvents,
    rankAggregates,
    groupSignalsByKind,
    createMatchDigestConfig,
    MatchDigestPipeline,
    generateMatchDigest,
    generateJsonMatchDigest,
    matchFilterStage,
    matchAggregateStage,
    matchRankStage,
    matchRenderStage,
    matchRenderJsonStage,
} from './matchDigest.types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function findProjectRoot(startDir: string): string {
    let current = startDir;
    while (current !== '/') {
        if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
            return current;
        }
        const pkgPath = join(current, 'package.json');
        if (existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
                if (pkg.workspaces || pkg.private === true) {
                    return current;
                }
            } catch {
                // Ignore parse errors
            }
        }
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
    }
    return join(__dirname, '..', '..');
}

const PROJECT_ROOT = findProjectRoot(__dirname);
const DATA_DIR = join(PROJECT_ROOT, '.notention', 'match-digest');
const MATCH_DIGEST_FILE = join(DATA_DIR, 'events.jsonl');
const CONFIG_FILE = join(DATA_DIR, 'config.json');

// Ensure directory exists
if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
}

let matchDigestConfig: MatchDigestConfig = { ...DEFAULT_MATCH_DIGEST_CONFIG };

function loadMatchDigestConfig(): MatchDigestConfig {
    if (!existsSync(CONFIG_FILE)) {
        saveMatchDigestConfig(DEFAULT_MATCH_DIGEST_CONFIG);
        return DEFAULT_MATCH_DIGEST_CONFIG;
    }
    try {
        return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as MatchDigestConfig;
    } catch {
        saveMatchDigestConfig(DEFAULT_MATCH_DIGEST_CONFIG);
        return DEFAULT_MATCH_DIGEST_CONFIG;
    }
}

function saveMatchDigestConfig(config: MatchDigestConfig): void {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

matchDigestConfig = loadMatchDigestConfig();

export function getMatchDigestConfig(): MatchDigestConfig {
    return { ...matchDigestConfig };
}

export function setMatchDigestConfig(config: Partial<MatchDigestConfig>): void {
    matchDigestConfig = { ...matchDigestConfig, ...config };
    saveMatchDigestConfig(matchDigestConfig);
}

export function recordMatchEvent(event: Omit<MatchDigestEvent, 'bucket'>): void {
    if (!matchDigestConfig.enabled) return;

    const now = new Date();
    const bucket = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const fullEvent: MatchDigestEvent = {
        ...event,
        bucket,
        timestamp: event.timestamp ?? now.toISOString(),
    };

    const line = JSON.stringify(fullEvent) + '\n';
    appendFileSync(MATCH_DIGEST_FILE, line, 'utf-8');
}

export function getMatchEvents(since?: string): MatchDigestEvent[] {
    if (!existsSync(MATCH_DIGEST_FILE)) return [];

    const content = readFileSync(MATCH_DIGEST_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.length > 0);

    const sinceTime = since ? new Date(since).getTime() : 0;

    const events: MatchDigestEvent[] = [];
    for (const line of lines) {
        try {
            const event = JSON.parse(line) as MatchDigestEvent;
            const eventTime = new Date(event.bucket).getTime();
            if (eventTime >= sinceTime) {
                events.push(event);
            }
        } catch {
            // Skip malformed lines
        }
    }
    return events;
}

export async function generateMatchDigestFromStore(config?: Partial<MatchDigestConfig>): Promise<string> {
    const events = getMatchEvents();
    const fullConfig = { ...matchDigestConfig, ...config };
    const pipeline = MatchDigestPipeline.createDefault();
    const context = await pipeline.run(events, fullConfig);
    return context.metadata.digest as string ?? 'No digest generated';
}

export async function generateJsonMatchDigestFromStore(config?: Partial<MatchDigestConfig>): Promise<any> {
    const events = getMatchEvents();
    const fullConfig = { ...matchDigestConfig, ...config };
    const pipeline = MatchDigestPipeline.createJson();
    const context = await pipeline.run(events, fullConfig);
    return context.metadata.jsonDigest;
}

// Convenience functions for common event types
export function recordNewMatch(noteId: string, matchId: string, score: number): void {
    recordMatchEvent({
        kind: 'new_match',
        count: 1,
        noteId,
        matchId,
        score,
    });
}

export function recordPendingAction(noteId: string, actionType: string): void {
    recordMatchEvent({
        kind: 'pending_action',
        count: 1,
        noteId,
        actionType,
    });
}

export function recordMatchAccepted(noteId: string, matchId: string, score: number): void {
    recordMatchEvent({
        kind: 'match_accepted',
        count: 1,
        noteId,
        matchId,
        score,
    });
}

export function recordMatchDismissed(noteId: string, matchId: string, score: number): void {
    recordMatchEvent({
        kind: 'match_dismissed',
        count: 1,
        noteId,
        matchId,
        score,
    });
}

export function recordActionCompleted(noteId: string, actionType: string): void {
    recordMatchEvent({
        kind: 'action_completed',
        count: 1,
        noteId,
        actionType,
    });
}

// Re-export all types and utilities from the shared module
export {
    DEFAULT_MATCH_DIGEST_CONFIG,
    MS_PER_DAY,
    isInQuietHours,
    filterEventsByTime,
    aggregateEvents,
    rankAggregates,
    groupSignalsByKind,
    createMatchDigestConfig,
    MatchDigestPipeline,
    generateMatchDigest,
    generateJsonMatchDigest,
    matchFilterStage,
    matchAggregateStage,
    matchRankStage,
    matchRenderStage,
    matchRenderJsonStage,
    type MatchDigestEvent,
    type MatchDigestAggregate,
    type MatchDigestSignal,
    type MatchDigestConfig,
} from './matchDigest.types.js';