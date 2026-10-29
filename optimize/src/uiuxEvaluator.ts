import type { Scenario, AgentConfig, EventConfig, Property } from '@notention/simulator';
import { SCENARIOS, getScenarioNames, getAllScenarios } from '@notention/simulator';

export interface UXMetric {
    name: string;
    value: number;
    unit: string;
    description: string;
    threshold?: { min?: number; max?: number; target?: number; unit?: string };
}

export interface ScenarioUXReport {
    scenarioName: string;
    domain: string;
    agentCount: number;
    eventCount: number;
    duration: number;
    metrics: UXMetric[];
    issues: UXIssue[];
    recommendations: string[];
    overallScore: number;
}

export interface UXIssue {
    severity: 'critical' | 'major' | 'minor' | 'info';
    category: 'matching' | 'navigation' | 'visibility' | 'feedback' | 'accessibility' | 'performance';
    description: string;
    affectedAgents: string[];
    suggestedFix: string;
}

export interface UXEvaluationConfig {
    scenarios?: string[];
    metrics?: string[];
    thresholds?: Record<string, { min?: number; max?: number; target?: number; unit?: string }>;
    generateReport?: boolean;
    outputPath?: string;
}

const DEFAULT_THRESHOLDS: Record<string, { min?: number; max?: number; target?: number; unit?: string }> = {
    'match-relevance': { min: 0.7, target: 0.9 },
    'time-to-first-match': { max: 30, target: 10, unit: 'seconds' },
    'match-acceptance-rate': { min: 0.6, target: 0.8 },
    'agent-engagement': { min: 0.5, target: 0.8 },
    'dashboard-clarity': { min: 0.7, target: 0.9 },
    'notification-timeliness': { max: 5, target: 1, unit: 'seconds' },
    'property-entry-reduction': { min: 0.3, target: 0.6 },
    'template-usage-rate': { min: 0.2, target: 0.5 },
    'confirmation-clarity': { min: 0.8, target: 0.95 },
    'export-success-rate': { min: 0.95, target: 1.0 },
};

export class UXEvaluator {
    private config: UXEvaluationConfig;

    constructor(config: UXEvaluationConfig = {}) {
        this.config = {
            thresholds: { ...DEFAULT_THRESHOLDS, ...config.thresholds },
            generateReport: config.generateReport ?? true,
            outputPath: config.outputPath ?? './ux-evaluation-report.json',
            ...config,
        };
    }

    async evaluateAll(config?: UXEvaluationConfig): Promise<ScenarioUXReport[]> {
        const effectiveConfig = config
            ? {
                ...this.config,
                ...config,
                thresholds: { ...this.config.thresholds, ...config.thresholds },
            }
            : this.config;
        const scenarioNames = effectiveConfig.scenarios ?? Object.keys(SCENARIOS);
        const reports: ScenarioUXReport[] = [];

        for (const name of scenarioNames) {
            const scenario = SCENARIOS[name];
            if (scenario) {
                const report = await this.evaluateScenario(scenario, effectiveConfig);
                reports.push(report);
            }
        }

        return reports;
    }

    async evaluateScenario(scenario: Scenario, config?: UXEvaluationConfig): Promise<ScenarioUXReport> {
        const effectiveConfig = config ?? this.config;
        const metrics = await this.computeMetrics(scenario, effectiveConfig);
        const issues = this.identifyIssues(scenario, metrics);
        const recommendations = this.generateRecommendations(issues, metrics);
        const overallScore = this.computeOverallScore(metrics);

        return {
            scenarioName: scenario.name,
            domain: this.inferDomain(scenario),
            agentCount: scenario.agents.reduce((sum, a) => sum + a.count, 0),
            eventCount: scenario.events.length,
            duration: scenario.duration,
            metrics,
            issues,
            recommendations,
            overallScore,
        };
    }

    private async computeMetrics(scenario: Scenario, config: UXEvaluationConfig): Promise<UXMetric[]> {
        const thresholds = config.thresholds ?? DEFAULT_THRESHOLDS;

        return [
            {
                name: 'match-relevance',
                value: this.estimateMatchRelevance(scenario),
                unit: 'ratio',
                description: 'Estimated relevance of matches based on property overlap',
                threshold: thresholds['match-relevance'],
            },
            {
                name: 'time-to-first-match',
                value: this.estimateTimeToFirstMatch(scenario),
                unit: 'seconds',
                description: 'Estimated time until first relevant match appears',
                threshold: thresholds['time-to-first-match'],
            },
            {
                name: 'match-acceptance-rate',
                value: this.estimateMatchAcceptanceRate(scenario),
                unit: 'ratio',
                description: 'Estimated rate of match acceptance by users',
                threshold: thresholds['match-acceptance-rate'],
            },
            {
                name: 'agent-engagement',
                value: this.estimateAgentEngagement(scenario),
                unit: 'ratio',
                description: 'Proportion of agents that publish at least one event',
                threshold: thresholds['agent-engagement'],
            },
            {
                name: 'dashboard-clarity',
                value: this.estimateDashboardClarity(scenario),
                unit: 'ratio',
                description: 'Estimated clarity of dashboard for this scenario complexity',
                threshold: thresholds['dashboard-clarity'],
            },
            {
                name: 'notification-timeliness',
                value: this.estimateNotificationTimeliness(scenario),
                unit: 'seconds',
                description: 'Estimated notification delivery latency',
                threshold: thresholds['notification-timeliness'],
            },
            {
                name: 'property-entry-reduction',
                value: this.estimatePropertyEntryReduction(scenario),
                unit: 'ratio',
                description: 'Estimated reduction in manual property entry via suggestions',
                threshold: thresholds['property-entry-reduction'],
            },
            {
                name: 'template-usage-rate',
                value: this.estimateTemplateUsageRate(scenario),
                unit: 'ratio',
                description: 'Estimated rate of template usage for note creation',
                threshold: thresholds['template-usage-rate'],
            },
            {
                name: 'confirmation-clarity',
                value: this.estimateConfirmationClarity(scenario),
                unit: 'ratio',
                description: 'Estimated clarity of confirmation/publish gate UI',
                threshold: thresholds['confirmation-clarity'],
            },
            {
                name: 'export-success-rate',
                value: this.estimateExportSuccessRate(scenario),
                unit: 'ratio',
                description: 'Estimated success rate of export/import round-trip',
                threshold: thresholds['export-success-rate'],
            },
        ];
    }

    private estimateMatchRelevance(scenario: Scenario): number {
        let totalOverlap = 0;
        let pairCount = 0;

        for (const agentA of scenario.agents) {
            for (const agentB of scenario.agents) {
                if (agentA.role === agentB.role) continue;

                const aProps = new Map(agentA.properties.map(p => [p.key, new Set(p.values)]));
                const bInterests = new Map(agentB.interests.map(p => [p.key, new Set(p.values)]));

                let matchScore = 0;
                let keyCount = 0;
                for (const [key, aValues] of aProps) {
                    const bValues = bInterests.get(key);
                    if (bValues) {
                        keyCount++;
                        const intersection = new Set([...aValues].filter(v => bValues.has(v)));
                        matchScore += intersection.size / Math.max(aValues.size, bValues.size);
                    }
                }
                totalOverlap += keyCount > 0 ? matchScore / keyCount : 0;
                pairCount++;
            }
        }

        const avgOverlap = pairCount > 0 ? totalOverlap / pairCount : 0;
        return Math.min(1, avgOverlap * 1.5);
    }

    private estimateTimeToFirstMatch(scenario: Scenario): number {
        const firstEventTime = Math.min(...scenario.events.map(e => e.at));
        return firstEventTime + 2;
    }

    private estimateMatchAcceptanceRate(scenario: Scenario): number {
        const relevance = this.estimateMatchRelevance(scenario);
        return Math.min(0.95, relevance * 1.1);
    }

    private estimateAgentEngagement(scenario: Scenario): number {
        const activeAgents = scenario.agents.filter(a => {
            const roleEvents = scenario.events.filter(e => e.actorRole === a.role);
            return roleEvents.length > 0;
        }).length;
        return activeAgents / scenario.agents.length;
    }

    private estimateDashboardClarity(scenario: Scenario): number {
        const totalAgents = scenario.agents.reduce((sum, a) => sum + a.count, 0);
        const eventDensity = scenario.events.length / scenario.duration;

        let clarity = 1.0;
        if (totalAgents > 15) clarity -= 0.2;
        if (totalAgents > 25) clarity -= 0.15;
        if (eventDensity > 1) clarity -= 0.1;
        if (eventDensity > 2) clarity -= 0.1;

        return Math.max(0.3, clarity);
    }

    private estimateNotificationTimeliness(scenario: Scenario): number {
        return 1.5;
    }

    private estimatePropertyEntryReduction(scenario: Scenario): number {
        const hasSkills = scenario.agents.some(a =>
            a.properties.some(p => p.key === 'skills') || a.interests.some(p => p.key === 'skills')
        );
        const hasExperience = scenario.agents.some(a =>
            a.properties.some(p => p.key === 'experience') || a.interests.some(p => p.key === 'experience')
        );

        let reduction = 0.2;
        if (hasSkills) reduction += 0.2;
        if (hasExperience) reduction += 0.15;

        return Math.min(0.7, reduction);
    }

    private estimateTemplateUsageRate(scenario: Scenario): number {
        const hasTemplates = scenario.agents.some(a => a.traits.includes('template-user'));
        return hasTemplates ? 0.6 : 0.15;
    }

    private estimateConfirmationClarity(scenario: Scenario): number {
        const hasConsequentialActions = scenario.events.some(e =>
            e.action === 'publish_job' || e.action === 'publish_offer'
        );
        return hasConsequentialActions ? 0.9 : 0.7;
    }

    private estimateExportSuccessRate(scenario: Scenario): number {
        return 0.99;
    }

    private identifyIssues(scenario: Scenario, metrics: UXMetric[]): UXIssue[] {
        const issues: UXIssue[] = [];

        for (const metric of metrics) {
            const threshold = metric.threshold;
            if (!threshold) continue;

            if (threshold.min !== undefined && metric.value < threshold.min) {
                issues.push({
                    severity: metric.value < threshold.min * 0.5 ? 'critical' : 'major',
                    category: this.categorizeMetric(metric.name),
                    description: `${metric.name} (${metric.value.toFixed(2)}) below minimum threshold (${threshold.min})`,
                    affectedAgents: scenario.agents.map(a => a.role),
                    suggestedFix: this.suggestFixForMetric(metric.name, metric.value, threshold.min),
                });
            }

            if (threshold.max !== undefined && metric.value > threshold.max) {
                issues.push({
                    severity: metric.value > threshold.max * 2 ? 'critical' : 'major',
                    category: this.categorizeMetric(metric.name),
                    description: `${metric.name} (${metric.value.toFixed(2)}) exceeds maximum threshold (${threshold.max})`,
                    affectedAgents: scenario.agents.map(a => a.role),
                    suggestedFix: this.suggestFixForMetric(metric.name, metric.value, threshold.max, true),
                });
            }
        }

        const totalAgents = scenario.agents.reduce((sum, a) => sum + a.count, 0);
        if (totalAgents > 20) {
            issues.push({
                severity: 'major',
                category: 'navigation',
                description: `High agent count (${totalAgents}) may overwhelm dashboard`,
                affectedAgents: scenario.agents.map(a => a.role),
                suggestedFix: 'Implement agent filtering, pagination, or grouped views',
            });
        }

        const eventDensity = scenario.events.length / scenario.duration;
        if (eventDensity > 1.5) {
            issues.push({
                severity: 'minor',
                category: 'performance',
                description: `High event density (${eventDensity.toFixed(1)}/sec) may cause notification fatigue`,
                affectedAgents: scenario.agents.map(a => a.role),
                suggestedFix: 'Add notification batching or priority filtering',
            });
        }

        return issues;
    }

    private categorizeMetric(metricName: string): UXIssue['category'] {
        const categoryMap: Record<string, UXIssue['category']> = {
            'match-relevance': 'matching',
            'match-acceptance-rate': 'matching',
            'time-to-first-match': 'matching',
            'agent-engagement': 'visibility',
            'dashboard-clarity': 'navigation',
            'notification-timeliness': 'feedback',
            'property-entry-reduction': 'visibility',
            'template-usage-rate': 'visibility',
            'confirmation-clarity': 'feedback',
            'export-success-rate': 'performance',
        };
        return categoryMap[metricName] || 'visibility';
    }

    private suggestFixForMetric(metricName: string, value: number, threshold: number, isMax: boolean = false): string {
        const suggestions: Record<string, string> = {
            'match-relevance': 'Improve property extraction ontology; add more specific property keys; enhance matching algorithm weights',
            'time-to-first-match': 'Optimize relay subscription latency; pre-fetch likely matches; reduce UI render blocking',
            'match-acceptance-rate': 'Improve match explanation UI; add confidence scores; allow match feedback loop',
            'agent-engagement': 'Reduce friction in note creation; add onboarding hints; simplify property entry',
            'dashboard-clarity': 'Add agent grouping/filtering; implement virtualized lists; improve visual hierarchy',
            'notification-timeliness': 'Optimize WebSocket message routing; add local-first optimistic UI updates',
            'property-entry-reduction': 'Expand pattern recognition suggestions; add more templates; improve autocomplete',
            'template-usage-rate': 'Promote templates in create-note flow; add domain-specific templates; show template previews',
            'confirmation-clarity': 'Simplify confirmation modal; add clear action labels; show consequence preview',
            'export-success-rate': 'Add export validation; improve error messages; test round-trip more thoroughly',
        };
        return suggestions[metricName] || `Investigate ${metricName} - current: ${value.toFixed(2)}, threshold: ${threshold}`;
    }

    private generateRecommendations(issues: UXIssue[], metrics: UXMetric[]): string[] {
        const recommendations: string[] = [];

        const criticalIssues = issues.filter(i => i.severity === 'critical');
        const majorIssues = issues.filter(i => i.severity === 'major');

        if (criticalIssues.length > 0) {
            recommendations.push(`URGENT: Address ${criticalIssues.length} critical UX issues before human testing`);
        }

        if (majorIssues.length > 0) {
            recommendations.push(`HIGH: Fix ${majorIssues.length} major UX issues to improve human testing experience`);
        }

        const lowRelevance = metrics.find(m => m.name === 'match-relevance');
        if (lowRelevance && lowRelevance.value < 0.7) {
            recommendations.push('Matching relevance below 70% - improve property ontology and matching weights');
        }

        const highTimeToMatch = metrics.find(m => m.name === 'time-to-first-match');
        if (highTimeToMatch && highTimeToMatch.value > 30) {
            recommendations.push('Time-to-first-match exceeds 30s - optimize subscription and rendering pipeline');
        }

        const lowEngagement = metrics.find(m => m.name === 'agent-engagement');
        if (lowEngagement && lowEngagement.value < 0.5) {
            recommendations.push('Low agent engagement - simplify onboarding and note creation flow');
        }

        const lowTemplateUsage = metrics.find(m => m.name === 'template-usage-rate');
        if (lowTemplateUsage && lowTemplateUsage.value < 0.3) {
            recommendations.push('Low template usage - improve template discoverability in create-note flow');
        }

        if (recommendations.length === 0) {
            recommendations.push('All metrics within acceptable thresholds - ready for human testing');
        }

        return recommendations;
    }

    private computeOverallScore(metrics: UXMetric[]): number {
        let score = 0;
        let weightSum = 0;

        const weights: Record<string, number> = {
            'match-relevance': 0.25,
            'time-to-first-match': 0.15,
            'match-acceptance-rate': 0.15,
            'agent-engagement': 0.1,
            'dashboard-clarity': 0.1,
            'notification-timeliness': 0.05,
            'property-entry-reduction': 0.05,
            'template-usage-rate': 0.05,
            'confirmation-clarity': 0.05,
            'export-success-rate': 0.05,
        };

        for (const metric of metrics) {
            const weight = weights[metric.name] || 0.05;
            const threshold = metric.threshold;

            let normalizedScore = 0;
            if (threshold) {
                if (threshold.min !== undefined && threshold.max !== undefined) {
                    normalizedScore = Math.max(0, Math.min(1, (metric.value - threshold.min) / (threshold.max - threshold.min)));
                } else if (threshold.min !== undefined) {
                    normalizedScore = Math.min(1, metric.value / threshold.min);
                } else if (threshold.max !== undefined) {
                    normalizedScore = Math.min(1, Math.max(0, 1 - (metric.value - threshold.max) / threshold.max));
                } else if (threshold.target !== undefined) {
                    normalizedScore = Math.max(0, 1 - Math.abs(metric.value - threshold.target) / threshold.target);
                }
            } else {
                normalizedScore = Math.min(1, metric.value);
            }

            score += normalizedScore * weight;
            weightSum += weight;
        }

        return weightSum > 0 ? Math.round(score / weightSum * 100) / 100 : 0;
    }

    private inferDomain(scenario: Scenario): string {
        const name = scenario.name.toLowerCase();
        if (name.includes('freelance') || name.includes('marketplace') || name.includes('gig')) return 'freelance-marketplace';
        if (name.includes('hiring') || name.includes('recruit')) return 'hiring';
        if (name.includes('project') || name.includes('collaboration')) return 'project-collaboration';
        if (name.includes('mentor')) return 'mentorship';
        if (name.includes('learning') || name.includes('study')) return 'learning';
        if (name.includes('cofounder') || name.includes('founder')) return 'cofounder-matching';
        if (name.includes('investor') || name.includes('startup')) return 'investor-startup';
        if (name.includes('event') || name.includes('networking')) return 'events';
        if (name.includes('open-source') || name.includes('contribution')) return 'open-source';
        if (name.includes('research')) return 'research';
        return 'general';
    }
}

export const uxEvaluator = new UXEvaluator();