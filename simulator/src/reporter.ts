import fs from 'fs';
import path from 'path';
import { EventConfig, Scenario } from './scenario.js';

export interface SimulationStats {
    totalEvents: number;
    matches: number;
    errors: number;
    agentActivity: Record<string, number>;
}

export class SimulationReporter {
    private stats: SimulationStats = {
        totalEvents: 0,
        matches: 0,
        errors: 0,
        agentActivity: {}
    };

    private logs: string[] = [];

    constructor(private readonly outputDir: string, private readonly scenario: Scenario) {}

    public logEvent(event: EventConfig) {
        this.stats.totalEvents++;
        this.logs.push(`[${event.at}s] ${event.actorRole} -> ${event.action} (${event.inputMethod || 'raw'})`);

        // Track per-role activity (simpler than per-ID without ID in EventConfig)
        this.stats.agentActivity[event.actorRole] = (this.stats.agentActivity[event.actorRole] || 0) + 1;
    }

    public logMatch(matcher: string, matchedWith: string, score: number) {
        this.stats.matches++;
        this.logs.push(`[MATCH] ${matcher} matched with ${matchedWith} (Score: ${score.toFixed(2)})`);
    }

    public generateReport() {
        const reportPath = path.join(this.outputDir, 'report.md');

        const content = `
# Simulation Report: ${this.scenario.name}

**Date:** ${new Date().toLocaleString()}
**Duration:** ${this.scenario.duration}s
**Agents:** ${this.scenario.agents.length} groups

## Statistics
- **Total Events:** ${this.stats.totalEvents}
- **Matches Found:** ${this.stats.matches}
- **Errors:** ${this.stats.errors}

## Agent Activity
${Object.entries(this.stats.agentActivity).map(([role, count]) => `- **${role}:** ${count} actions`).join('\n')}

## Event Log
\`\`\`
${this.logs.join('\n')}
\`\`\`
`;

        fs.writeFileSync(reportPath, content.trim());
        console.log(`📝 Report generated at ${reportPath}`);
    }
}
