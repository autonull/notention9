import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadGraph } from './cli.js';
import { validateGraph } from './validate.js';
import type { UisgGraph, UisgNode, UisgStatus } from './types.js';
import { ROOT } from './paths.js';

const RUNS_FILE = resolve(ROOT, 'doc/uisg/runs.jsonl');
const DECISIONS_FILE = resolve(ROOT, 'doc/uisg/decisions.jsonl');
const FINDINGS_FILE = resolve(ROOT, 'doc/uisg/findings.jsonl');

export type LifecycleStatus = 'implemented' | 'partial' | 'planned' | 'candidate' | 'experimental' | 'removed' | 'rejected';
export type ImplementationStatus = 'verified' | 'observed' | 'inferred' | 'unknown';
export type EvidenceSource = 'manual' | 'reverse-engineered' | 'test-derived' | 'generated';
export type FindingStatus = 'open' | 'fixed' | 'verified' | 'wontfix';

export interface EvidenceBundle {
    source: EvidenceSource;
    refs: string[];
    commit?: string;
    date: string;
    confidence: 'high' | 'medium' | 'low';
}

export interface Provenance {
    source: EvidenceSource;
    path: string;
    commit: string;
    date: string;
    confidence: 'high' | 'medium' | 'low';
}

export interface LifecycleTransition {
    nodeId: string;
    from: LifecycleStatus;
    to: LifecycleStatus;
    actor: string;
    reason: string;
    evidence: EvidenceBundle;
    impact: string;
    timestamp: string;
}

export interface DecisionRecord {
    flowId: string;
    variantId: string;
    hypothesis: string;
    metric: string;
    baselineRunId: string;
    variantRunId: string;
    comparison: string;
    decision: 'adopt' | 'reject';
    adoptedAt: string;
    evidence: EvidenceBundle;
    actor: string;
}

export interface RunRecord {
    flowId: string;
    runId: string;
    bundlePath: string;
    status: 'passed' | 'failed' | 'skipped' | 'error';
    timestamp: string;
    dimensions?: {
        viewport?: string;
        theme?: string;
        profile?: string;
        context?: string;
        variant?: string;
    };
}

export interface FindingRecord {
    id: string;
    issue: string;
    evidence: string[];
    impact: string;
    suggestedChange: string;
    severity: 'low' | 'medium' | 'high';
    nodeId?: string;
    status: FindingStatus;
    createdAt: string;
    updatedAt: string;
    fixedAt?: string;
    fixedBy?: string;
    verificationRunId?: string;
}

function generateFindingId(): string {
    return `finding-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function appendRunRecord(record: RunRecord): void {
    appendFileSync(RUNS_FILE, JSON.stringify(record) + '\n');
}

export function appendDecision(record: DecisionRecord): void {
    appendFileSync(DECISIONS_FILE, JSON.stringify(record) + '\n');
}

export function appendFinding(finding: Omit<FindingRecord, 'id' | 'createdAt' | 'updatedAt'>): FindingRecord {
    const record: FindingRecord = {
        ...finding,
        id: generateFindingId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    appendFileSync(FINDINGS_FILE, JSON.stringify(record) + '\n');
    return record;
}

export function loadRuns(): RunRecord[] {
    try {
        const content = readFileSync(RUNS_FILE, 'utf8');
        return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    } catch {
        return [];
    }
}

export function loadDecisions(): DecisionRecord[] {
    try {
        const content = readFileSync(DECISIONS_FILE, 'utf8');
        return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    } catch {
        return [];
    }
}

export function loadFindings(): FindingRecord[] {
    try {
        const content = readFileSync(FINDINGS_FILE, 'utf8');
        return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    } catch {
        return [];
    }
}

export function markFindingFixed(findingId: string, fixedBy: string, verificationRunId: string): FindingRecord | null {
    const findings = loadFindings();
    const idx = findings.findIndex(f => f.id === findingId);
    if (idx === -1) return null;

    findings[idx] = {
        ...findings[idx],
        status: 'fixed',
        fixedAt: new Date().toISOString(),
        fixedBy,
        verificationRunId,
        updatedAt: new Date().toISOString(),
    };

    writeFileSync(FINDINGS_FILE, findings.map(f => JSON.stringify(f)).join('\n') + '\n');
    return findings[idx];
}

export function verifyFinding(findingId: string, verificationRunId: string): FindingRecord | null {
    const findings = loadFindings();
    const idx = findings.findIndex(f => f.id === findingId);
    if (idx === -1) return null;

    findings[idx] = {
        ...findings[idx],
        status: 'verified',
        verificationRunId,
        updatedAt: new Date().toISOString(),
    };

    writeFileSync(FINDINGS_FILE, findings.map(f => JSON.stringify(f)).join('\n') + '\n');
    return findings[idx];
}

export function transitionLifecycle(
    graph: UisgGraph,
    nodeId: string,
    to: LifecycleStatus,
    actor: string,
    reason: string,
    evidence: EvidenceBundle,
    impact: string
): { graph: UisgGraph; transition: LifecycleTransition } {
    const nodeIdx = graph.nodes.findIndex(n => n.id === nodeId);
    if (nodeIdx === -1) throw new Error(`Node ${nodeId} not found`);

    const from = graph.nodes[nodeIdx].status as LifecycleStatus;
    const allowedTransitions: Record<LifecycleStatus, LifecycleStatus[]> = {
        implemented: ['partial', 'removed', 'rejected'],
        partial: ['implemented', 'planned', 'removed', 'rejected'],
        planned: ['implemented', 'partial', 'candidate', 'removed', 'rejected'],
        candidate: ['planned', 'experimental', 'rejected'],
        experimental: ['implemented', 'candidate', 'rejected'],
        removed: [],
        rejected: ['planned', 'candidate'],
    };

    if (!allowedTransitions[from]?.includes(to)) {
        throw new Error(`Invalid lifecycle transition: ${from} -> ${to}`);
    }

    const transition: LifecycleTransition = {
        nodeId,
        from,
        to,
        actor,
        reason,
        evidence,
        impact,
        timestamp: new Date().toISOString(),
    };

    const newGraph: UisgGraph = {
        ...graph,
        nodes: graph.nodes.map((n, i) => i === nodeIdx ? { ...n, status: to } : n),
    };

    appendFileSync(DECISIONS_FILE, JSON.stringify({ type: 'lifecycle', ...transition }) + '\n');

    return { graph: newGraph, transition };
}

export function updateImplementationStatus(
    graph: UisgGraph,
    nodeId: string,
    implementation: ImplementationStatus,
    evidence: EvidenceBundle
): UisgGraph {
    const nodeIdx = graph.nodes.findIndex(n => n.id === nodeId);
    if (nodeIdx === -1) throw new Error(`Node ${nodeId} not found`);

    return {
        ...graph,
        nodes: graph.nodes.map((n, i) =>
            i === nodeIdx ? { ...n, implementation, evidence: [evidence], provenance: [evidence] } : n
        ),
    };
}

export interface NodeRecord {
    nodeId: string;
    lifecycle: LifecycleStatus;
    implementation: ImplementationStatus;
    evidence: EvidenceBundle[];
    provenance: Provenance[];
}