/**
 * Match Digest CLI Command
 * Generates a ranked digest of match events and pending actions
 */

import { Command, registerCommand } from '../Command.js';
import { getDefaultAdapter } from '@notention/core/storage';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
    generateMatchDigest,
    generateJsonMatchDigest,
    DEFAULT_MATCH_DIGEST_CONFIG,
    createMatchDigestConfig,
    type MatchDigestEvent,
    type MatchDigestConfig,
} from '@notention/core/telemetry/matchDigest';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..', '..');
const DATA_DIR = join(PROJECT_ROOT, '.notention', 'match-digest');
const MATCH_DIGEST_FILE = join(DATA_DIR, 'events.jsonl');
const CONFIG_FILE = join(DATA_DIR, 'config.json');

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
        const parent = join(current, '..');
        if (parent === current) break;
        current = parent;
    }
    return join(__dirname, '..', '..');
}

const ROOT = findProjectRoot(__dirname);
const ACTUAL_DATA_DIR = join(ROOT, '.notention', 'match-digest');
const ACTUAL_MATCH_DIGEST_FILE = join(ACTUAL_DATA_DIR, 'events.jsonl');
const ACTUAL_CONFIG_FILE = join(ACTUAL_DATA_DIR, 'config.json');

function loadConfig(): MatchDigestConfig {
    if (!existsSync(ACTUAL_CONFIG_FILE)) {
        saveConfig(DEFAULT_MATCH_DIGEST_CONFIG);
        return DEFAULT_MATCH_DIGEST_CONFIG;
    }
    try {
        return JSON.parse(readFileSync(ACTUAL_CONFIG_FILE, 'utf-8')) as MatchDigestConfig;
    } catch {
        saveConfig(DEFAULT_MATCH_DIGEST_CONFIG);
        return DEFAULT_MATCH_DIGEST_CONFIG;
    }
}

function saveConfig(config: MatchDigestConfig): void {
    if (!existsSync(ACTUAL_DATA_DIR)) {
        mkdirSync(ACTUAL_DATA_DIR, { recursive: true });
    }
    writeFileSync(ACTUAL_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

function getEvents(): MatchDigestEvent[] {
    if (!existsSync(ACTUAL_MATCH_DIGEST_FILE)) return [];

    const content = readFileSync(ACTUAL_MATCH_DIGEST_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.length > 0);

    const events: MatchDigestEvent[] = [];
    for (const line of lines) {
        try {
            events.push(JSON.parse(line) as MatchDigestEvent);
        } catch {
            // Skip malformed lines
        }
    }
    return events;
}

export class MatchDigestCommand extends Command {
    readonly name = 'match:digest';
    readonly description = 'Generate a ranked digest of match events and pending actions';
    readonly options = [
        { name: 'days', type: 'number' as const, short: 'd', description: 'Lookback period in days (default: 7)' },
        { name: 'json', type: 'boolean' as const, description: 'Output as JSON' },
        { name: 'top', type: 'number' as const, short: 't', description: 'Top signals per kind (default: 5)' },
        { name: 'min-score', type: 'number' as const, description: 'Minimum match score for new matches (default: 0.5)' },
        { name: 'quiet-start', type: 'number' as const, description: 'Quiet hours start hour 0-23 (default: 22)' },
        { name: 'quiet-end', type: 'number' as const, description: 'Quiet hours end hour 0-23 (default: 8)' },
        { name: 'enabled', type: 'boolean' as const, description: 'Enable/disable match digest (persists)' },
    ];

    async execute(args: {
        days?: number;
        json?: boolean;
        top?: number;
        minScore?: number;
        quietStart?: number;
        quietEnd?: number;
        enabled?: boolean;
        positionals: string[];
    }): Promise<number> {
        try {
            const config = loadConfig();

            // Handle enable/disable
            if (args.enabled !== undefined) {
                config.enabled = args.enabled;
                saveConfig(config);
                this.printInfo(`Match digest ${args.enabled ? 'enabled' : 'disabled'}.`);
                return 0;
            }

            if (!config.enabled) {
                this.printWarning('Match digest is disabled. Use --enabled=true to enable.');
                return 0;
            }

            // Update config from args
            const updatedConfig = createMatchDigestConfig({
                lookbackDays: args.days ?? config.lookbackDays ?? DEFAULT_MATCH_DIGEST_CONFIG.lookbackDays,
                topSignalsPerKind: args.top ?? config.topSignalsPerKind ?? DEFAULT_MATCH_DIGEST_CONFIG.topSignalsPerKind,
                minScoreForNewMatch: args.minScore ?? config.minScoreForNewMatch ?? DEFAULT_MATCH_DIGEST_CONFIG.minScoreForNewMatch,
                quietHoursStart: args.quietStart ?? config.quietHoursStart ?? DEFAULT_MATCH_DIGEST_CONFIG.quietHoursStart,
                quietHoursEnd: args.quietEnd ?? config.quietHoursEnd ?? DEFAULT_MATCH_DIGEST_CONFIG.quietHoursEnd,
            });

            // Save updated config
            saveConfig({ ...config, ...updatedConfig });

            // Load all events
            const events = getEvents();

            if (events.length === 0) {
                this.printInfo('No match events recorded. Events are recorded when matches are found, accepted, dismissed, or actions are pending/completed.');
                return 0;
            }

            if (args.json) {
                const jsonDigest = await generateJsonMatchDigest(events, updatedConfig);
                console.log(JSON.stringify(jsonDigest, null, 2));
            } else {
                const digest = await generateMatchDigest(events, updatedConfig);
                console.log(digest);
            }

            return 0;
        } catch (error) {
            return this.handleError(error, 'Failed to generate match digest');
        }
    }
}

registerCommand(MatchDigestCommand);