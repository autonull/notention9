import type { JourneySpec } from '../journey.js';
import { edgesFrom, indexGraph, type GraphIndex } from './query.js';
import { validateGraph } from './validate.js';
import type { UisgCapability, UisgFlow, UisgGraph, UisgStep } from './types.js';

export interface GraphFinding {
    issue: string;
    evidence: string[];
    impact: string;
    suggestedChange: string;
    severity: 'low' | 'medium' | 'high';
    nodeId?: string;
}

export interface AnalyzeOptions {
    journeyIds?: ReadonlySet<string>;
}

const finding = (severity: GraphFinding['severity'], issue: string, evidence: string[], impact: string, suggestedChange: string, nodeId?: string): GraphFinding =>
    ({ severity, issue, evidence, impact, suggestedChange, nodeId });

const isImplemented = ({ status }: { status: string }) => status === 'implemented' || status === 'partial';

function recoveryFindings(index: GraphIndex, flow: UisgFlow): GraphFinding[] {
    const steps = edgesFrom(index, flow.id, 'contains')
        .map(({ to }) => index.byId.get(to))
        .filter((node): node is UisgStep => node?.type === 'step');
    const invoked = steps.flatMap(step => edgesFrom(index, step.id, 'invokes'))
        .map(({ to }) => index.byId.get(to))
        .filter((node): node is UisgCapability => node?.type === 'capability');
    const destructive = invoked.filter(({ risk }) => risk === 'destructive');
    if (!destructive.length) return [];
    const findings: GraphFinding[] = [];
    const evidence = [flow.id, ...destructive.map(({ id }) => id)];
    if (!steps.some(({ kind }) => kind === 'confirm'))
        findings.push(finding('high', 'missing-confirmation', evidence, 'Destructive capability can execute without an explicit confirmation step.', 'Add a confirm step with the consequence stated, or a recovery path.', flow.id));
    const branches = steps.flatMap(step => edgesFrom(index, step.id, 'next'));
    if (!branches.some(({ when }) => when === 'cancelled' || when === 'denied'))
        findings.push(finding('medium', 'missing-recovery', evidence, 'No cancel/deny branch leaves the user committed to a destructive outcome.', 'Model the cancelled branch and its return surface.', flow.id));
    return findings;
}

export function analyzeGraph(graph: UisgGraph, options: AnalyzeOptions = {}): GraphFinding[] {
    const findings: GraphFinding[] = [];
    const { issues } = validateGraph(graph);
    for (const { severity, code, message, ref } of issues)
        findings.push(finding(severity === 'error' ? 'high' : 'medium', code, [ref ?? message], message, 'Fix the graph reference or model the missing path.', ref));

    const index = indexGraph(graph);
    for (const node of graph.nodes) {
        if (node.type === 'flow' && isImplemented(node)) {
            findings.push(...recoveryFindings(index, node));
            if (!node.journey)
                findings.push(finding('medium', 'unexecutable-flow', [node.id], 'Implemented flow has no JourneySpec link; it cannot be simulated or compared.', 'Compile it with to-journey or link an existing journey.', node.id));
            else if (options.journeyIds && !options.journeyIds.has(node.journey))
                findings.push(finding('high', 'stale-journey-link', [node.id, node.journey], `Linked journey ${node.journey} is not registered.`, 'Update the link or restore the journey.', node.id));
        }
        if (node.type === 'step' && isImplemented(node)) {
            if (['action', 'choice', 'confirm'].includes(node.kind) && !node.target)
                findings.push(finding('medium', 'untargeted-step', [node.id], 'Step cannot be targeted by role+name, label, or testId; it is unreachable to keyboard/AT automation and journeys.', 'Give the control an accessible name or testId, then record the target.', node.id));
            if (node.kind === 'result' && node.statePath === undefined && !edgesFrom(index, node.id, 'renders').length)
                findings.push(finding('low', 'unasserted-result', [node.id], 'Result has neither a state assertion nor a rendered surface; completion is unverifiable.', 'Add statePath/stateEquals or a renders edge.', node.id));
        }
        if (node.type === 'capability' && isImplemented(node) && !node.seam && !node.strategy && !node.skill && !node.source?.length)
            findings.push(finding('medium', 'ungrounded-capability', [node.id], 'Capability has no seam, strategy, skill, or source reference.', 'Ground it in a registry ID or source path.', node.id));
        if (node.type === 'surface' && isImplemented(node) && !node.component && !node.route && !node.configKey)
            findings.push(finding('low', 'ungrounded-surface', [node.id], 'Surface has no component, route, or configuration key.', 'Reference the view component, hash route, or uiSurfaces key.', node.id));
    }
    return findings;
}

export function journeyTargetDrift(journeys: JourneySpec[], presentTestIds: ReadonlySet<string>): GraphFinding[] {
    const seen = new Set<string>();
    const findings: GraphFinding[] = [];
    for (const journey of journeys) {
        for (const step of journey.steps) {
            if (!('target' in step) || !('testId' in step.target)) continue;
            const { testId } = step.target;
            const key = `${journey.id}:${testId}`;
            if (presentTestIds.has(testId) || seen.has(key)) continue;
            seen.add(key);
            findings.push(finding('high', 'journey-target-drift', [journey.id, testId],
                `Journey ${journey.id} targets testId ${testId}, which is absent from the current UI.`,
                'Restore the testId or retarget the journey, then re-run it.', journey.id));
        }
    }
    return findings;
}
