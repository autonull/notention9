import type { RunEvent, RunEventType } from './types.js';

export interface RunMetrics {
    timeToFirstMatchMs: number | null;
    matchesPerMinute: number;
    unmatchedRate: number;
    matchScoreDistribution: number[];
    perDomainBreakdown: Record<string, { matches: number; avgScore: number }>;
    totalEvents: number;
    totalMatches: number;
    totalErrors: number;
    scenarioDuration: number;
}

interface MatchEventData {
    agentId: string;
    agentName: string;
    matchedEventId: string;
    matchedPubkey: string;
    score: number;
    matches: Array<{ request: string; offer: string; score: number }>;
}

interface ErrorEventData {
    agentName: string;
    error: string;
    context: string;
}

interface AgentActionData {
    agentName: string;
    action: string;
    inputMethod: string;
    targetId?: string;
}

interface ScenarioStartData {
    description: string;
    duration: number;
}

interface ScenarioEndData {
    duration: number;
}

/**
 * Metrics collector for simulator runs
 * Consumes RunEvent stream and produces aggregated metrics (B2.3)
 */
export class MetricsCollector {
    private events: RunEvent[] = [];
    private matchEvents: MatchEventData[] = [];
    private errorEvents: ErrorEventData[] = [];
    private actionEvents: AgentActionData[] = [];
    private scenarioStartTime: number | null = null;
    private scenarioDuration: number = 0;
    private firstMatchTime: number | null = null;

    consume(event: RunEvent): void {
        this.events.push(event);

        switch (event.type) {
            case 'match:found':
                this.matchEvents.push(event.data as unknown as MatchEventData);
                if (this.firstMatchTime === null) {
                    this.firstMatchTime = event.timestamp;
                }
                break;
            case 'error':
                this.errorEvents.push(event.data as unknown as ErrorEventData);
                break;
            case 'agent:action':
                this.actionEvents.push(event.data as unknown as AgentActionData);
                break;
            case 'scenario:start':
                this.scenarioStartTime = event.timestamp;
                const startData = event.data as unknown as ScenarioStartData;
                this.scenarioDuration = startData.duration * 1000; // Convert to ms
                break;
            case 'scenario:end':
                const endData = event.data as unknown as ScenarioEndData;
                this.scenarioDuration = endData.duration * 1000;
                break;
        }
    }

    getMetrics(): RunMetrics {
        const totalMatches = this.matchEvents.length;
        const totalErrors = this.errorEvents.length;
        const totalEvents = this.events.length;

        // Time to first match
        let timeToFirstMatchMs: number | null = null;
        if (this.firstMatchTime !== null && this.scenarioStartTime !== null) {
            timeToFirstMatchMs = this.firstMatchTime - this.scenarioStartTime;
        }

        // Matches per minute
        const durationMinutes = this.scenarioDuration / 60000;
        const matchesPerMinute = durationMinutes > 0 ? totalMatches / durationMinutes : 0;

        // Unmatched rate (approximation: actions without subsequent matches)
        const totalActions = this.actionEvents.length;
        const unmatchedRate = totalActions > 0 ? 1 - (totalMatches / totalActions) : 0;

        // Match score distribution
        const matchScoreDistribution = this.matchEvents.map(e => e.score).sort((a, b) => a - b);

        // Per-domain breakdown
        const perDomainBreakdown: Record<string, { matches: number; avgScore: number }> = {};
        for (const match of this.matchEvents) {
            // Extract domain from agent name (e.g., "Developer 1" -> "Developer")
            const domain = match.agentName.split(' ')[0];
            if (!perDomainBreakdown[domain]) {
                perDomainBreakdown[domain] = { matches: 0, avgScore: 0 };
            }
            const domainData = perDomainBreakdown[domain];
            domainData.matches++;
            domainData.avgScore = (domainData.avgScore * (domainData.matches - 1) + match.score) / domainData.matches;
        }

        return {
            timeToFirstMatchMs,
            matchesPerMinute,
            unmatchedRate,
            matchScoreDistribution,
            perDomainBreakdown,
            totalEvents,
            totalMatches,
            totalErrors,
            scenarioDuration: this.scenarioDuration,
        };
    }

    reset(): void {
        this.events = [];
        this.matchEvents = [];
        this.errorEvents = [];
        this.actionEvents = [];
        this.scenarioStartTime = null;
        this.scenarioDuration = 0;
        this.firstMatchTime = null;
    }
}

/**
 * Create a metrics collector and attach to a ScenarioRunner
 */
export function attachMetricsCollector(runner: { runEventSink: ((event: RunEvent) => void) | undefined }): MetricsCollector {
    const collector = new MetricsCollector();
    runner.runEventSink = (event: RunEvent) => collector.consume(event);
    return collector;
}