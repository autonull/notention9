/**
 * Coverage Matrix — Ontology coverage analysis and flat-vs-facet decision
 * Tracks which ontology nodes are covered by quality cases and evaluates
 * whether facet-based extraction improves over flat extraction
 */

import type { OntologyNode, Property } from '../types/index.js';
import { collectOntologyKeys } from '../ontology/index.js';

export interface CoverageStats {
    /** Total ontology nodes */
    totalNodes: number;
    /** Nodes with at least one quality case */
    coveredNodes: number;
    /** Nodes with no quality cases */
    uncoveredNodes: number;
    /** Coverage ratio (0-1) */
    coverageRatio: number;
    /** Per-node coverage details */
    byNode: NodeCoverage[];
    /** Coverage by attribute */
    byAttribute: AttributeCoverage[];
}

export interface NodeCoverage {
    nodeId: string;
    label: string;
    /** Required attributes for this node */
    requiredAttributes: string[];
    /** Attributes covered by quality cases */
    coveredAttributes: string[];
    /** Attributes not covered */
    uncoveredAttributes: string[];
    /** Number of quality cases for this node */
    caseCount: number;
    /** Coverage ratio for this node */
    coverageRatio: number;
}

export interface AttributeCoverage {
    attribute: string;
    /** Number of nodes requiring this attribute */
    nodesRequiring: number;
    /** Number of nodes where attribute is covered */
    nodesCovered: number;
    /** Coverage ratio */
    coverageRatio: number;
}

export interface FlatVsFacetResult {
    /** Flat extraction F1 (baseline) */
    flatF1: number;
    /** Facet extraction F1 (with hierarchy) */
    facetF1: number;
    /** Difference (facet - flat) */
    delta: number;
    /** Whether facet is significantly better */
    facetBetter: boolean;
    /** Per-node comparison */
    byNode: Array<{
        nodeId: string;
        flatF1: number;
        facetF1: number;
        delta: number;
    }>;
    /** Recommendation */
    recommendation: 'flat' | 'facet' | 'inconclusive';
    /** Confidence in recommendation */
    confidence: number;
}

/**
 * Compute ontology coverage from quality cases
 */
export function computeCoverage(
    ontology: OntologyNode[],
    qualityCases: Array<{
        input: string;
        expected: Array<{ key: string; operator: string; values: string[] }>;
        tags: string[];
    }>
): CoverageStats {
    const allKeys = collectOntologyKeys(ontology);
    const nodeMap = new Map<string, OntologyNode>();
    
    // Build node map
    function traverse(node: OntologyNode) {
        nodeMap.set(node.id, node);
        node.children?.forEach(traverse);
    }
    ontology.forEach(traverse);

    // Track which attributes are covered per node
    const coveredAttrs = new Map<string, Set<string>>();
    
    for (const node of nodeMap.values()) {
        coveredAttrs.set(node.id, new Set());
    }

    // Analyze quality cases for coverage
    for (const caseData of qualityCases) {
        // Determine which node this case relates to (by tags or content)
        const relevantNodes = findRelevantNodes(caseData, nodeMap);
        
        for (const nodeId of relevantNodes) {
            const attrs = coveredAttrs.get(nodeId) ?? new Set();
            for (const exp of caseData.expected) {
                attrs.add(exp.key);
            }
            coveredAttrs.set(nodeId, attrs);
        }
    }

    // Build per-node coverage
    const byNode: NodeCoverage[] = [];
    for (const [nodeId, node] of nodeMap) {
        const covered = coveredAttrs.get(nodeId) ?? new Set();
        const required = node.requiredAttributes ?? [];
        
        const coveredList = Array.from(covered);
        const uncovered = required.filter(r => !covered.has(r));
        
        byNode.push({
            nodeId,
            label: node.label,
            requiredAttributes: required,
            coveredAttributes: coveredList,
            uncoveredAttributes: uncovered,
            caseCount: covered.size, // Approximation
            coverageRatio: required.length > 0 ? coveredList.filter(r => required.includes(r)).length / required.length : 1,
        });
    }

    // Compute attribute-level coverage
    const attrMap = new Map<string, { requiring: Set<string>; covered: Set<string> }>();
    
    for (const node of nodeMap.values()) {
        for (const attr of node.requiredAttributes ?? []) {
            const entry = attrMap.get(attr) ?? { requiring: new Set(), covered: new Set() };
            entry.requiring.add(node.id);
            if (coveredAttrs.get(node.id)?.has(attr)) {
                entry.covered.add(node.id);
            }
            attrMap.set(attr, entry);
        }
    }

    const byAttribute: AttributeCoverage[] = [];
    for (const [attr, data] of attrMap) {
        byAttribute.push({
            attribute: attr,
            nodesRequiring: data.requiring.size,
            nodesCovered: data.covered.size,
            coverageRatio: data.requiring.size > 0 ? data.covered.size / data.requiring.size : 1,
        });
    }

    const totalNodes = nodeMap.size;
    const coveredNodes = byNode.filter(n => n.coverageRatio > 0).length;
    
    return {
        totalNodes,
        coveredNodes,
        uncoveredNodes: totalNodes - coveredNodes,
        coverageRatio: totalNodes > 0 ? coveredNodes / totalNodes : 1,
        byNode,
        byAttribute,
    };
}

/**
 * Find ontology nodes relevant to a quality case
 */
function findRelevantNodes(
    caseData: { input: string; expected: Array<{ key: string }>; tags: string[] },
    nodeMap: Map<string, OntologyNode>
): string[] {
    const relevant: string[] = [];
    
    // Match by expected keys against node attributes (primary)
    for (const [nodeId, node] of nodeMap) {
        const nodeAttrs = node.attributes ? Object.keys(node.attributes) : [];
        if (caseData.expected.some(e => nodeAttrs.includes(e.key))) {
            relevant.push(nodeId);
        }
    }
    
    // Also match by tags for broader coverage
    for (const [nodeId, node] of nodeMap) {
        if (relevant.includes(nodeId)) continue;
        const nodeTags = node.attributes ? Object.keys(node.attributes) : [];
        if (caseData.tags.some(tag => nodeTags.includes(tag) || node.label.toLowerCase().includes(tag))) {
            relevant.push(nodeId);
        }
    }
    
    // Fallback: all nodes
    if (relevant.length === 0) {
        relevant.push(...nodeMap.keys());
    }
    
    return relevant;
}

/**
 * Compare flat vs facet extraction
 * Flat: extracts all properties at top level
 * Facet: organizes properties by ontology node hierarchy
 */
export function compareFlatVsFacet(
    flatResults: Array<{
        caseId: string;
        expected: Array<{ key: string; operator: string; values: string[] }>;
        extracted: Property[];
    }>,
    facetResults: Array<{
        caseId: string;
        expected: Array<{ key: string; operator: string; values: string[] }>;
        extracted: Property[];
    }>,
    ontology: OntologyNode[],
    minDelta = 0.05 // 5pp minimum improvement
): FlatVsFacetResult {
    const nodeMap = new Map<string, OntologyNode>();
    function traverse(node: OntologyNode) {
        nodeMap.set(node.id, node);
        node.children?.forEach(traverse);
    }
    ontology.forEach(traverse);

    // Compute per-case F1 for both approaches
    const flatScores = new Map<string, number>();
    const facetScores = new Map<string, number>();

    for (const result of flatResults) {
        flatScores.set(result.caseId, computeF1(result.expected, result.extracted));
    }
    for (const result of facetResults) {
        facetScores.set(result.caseId, computeF1(result.expected, result.extracted));
    }

    // Aggregate
    const allCaseIds = new Set([...flatScores.keys(), ...facetScores.keys()]);
    let flatSum = 0, facetSum = 0, count = 0;
    const byNode: FlatVsFacetResult['byNode'] = [];

    // Per-node comparison (approximate - would need case->node mapping)
    for (const caseId of allCaseIds) {
        const flat = flatScores.get(caseId) ?? 0;
        const facet = facetScores.get(caseId) ?? 0;
        flatSum += flat;
        facetSum += facet;
        count++;
    }

    const flatF1 = count > 0 ? flatSum / count : 0;
    const facetF1 = count > 0 ? facetSum / count : 0;
    const delta = facetF1 - flatF1;
    const facetBetter = delta > minDelta;

    return {
        flatF1,
        facetF1,
        delta,
        facetBetter,
        byNode,
        recommendation: delta > minDelta ? 'facet' : delta < -minDelta ? 'flat' : 'inconclusive',
        confidence: Math.min(Math.abs(delta) / minDelta, 1),
    };
}

/**
 * Compute F1 score for extraction
 */
function computeF1(
    expected: Array<{ key: string; operator: string; values: string[] }>,
    extracted: Property[]
): number {
    let tp = 0, fp = 0, fn = 0;
    const expectedMap = new Map<string, Set<string>>();
    
    for (const exp of expected) {
        const id = `${exp.key}::${exp.operator}`;
        expectedMap.set(id, new Set(exp.values.map(v => v.toLowerCase().trim())));
    }

    for (const prop of extracted) {
        const id = `${prop.key}::${prop.operator}`;
        const expectedValues = expectedMap.get(id);
        const extractedValues = new Set(prop.values.map(v => v.toLowerCase().trim()));
        
        if (expectedValues) {
            const matched = Array.from(extractedValues).some(v => expectedValues.has(v));
            if (matched) tp++;
            else fp++;
            expectedMap.delete(id);
        } else {
            fp++;
        }
    }

    fn = expectedMap.size;
    
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 1;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 1;
    return (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;
}

/**
 * Generate coverage report
 */
export function generateCoverageReport(stats: CoverageStats): string {
    const lines = [
        '# Ontology Coverage Report',
        '',
        `**Overall Coverage**: ${(stats.coverageRatio * 100).toFixed(1)}% (${stats.coveredNodes}/${stats.totalNodes} nodes)`,
        '',
        '## Per-Node Coverage',
        '',
        '| Node | Label | Required | Covered | Uncovered | Ratio | Cases |',
        '|------|-------|----------|---------|-----------|-------|-------|',
    ];

    for (const node of stats.byNode.sort((a, b) => a.coverageRatio - b.coverageRatio)) {
        lines.push(
            `| ${node.nodeId} | ${node.label} | ${node.requiredAttributes.length} | ` +
            `${node.coveredAttributes.length} | ${node.uncoveredAttributes.length} | ` +
            `${(node.coverageRatio * 100).toFixed(1)}% | ${node.caseCount} |`
        );
    }

    lines.push('', '## Per-Attribute Coverage', '');
    lines.push('| Attribute | Nodes Requiring | Nodes Covered | Ratio |');
    lines.push('|-----------|----------------|---------------|-------|');

    for (const attr of stats.byAttribute.sort((a, b) => a.coverageRatio - b.coverageRatio)) {
        lines.push(
            `| ${attr.attribute} | ${attr.nodesRequiring} | ${attr.nodesCovered} | ${(attr.coverageRatio * 100).toFixed(1)}% |`
        );
    }

    lines.push('', '## Uncovered Nodes', '');
    const uncovered = stats.byNode.filter(n => n.coverageRatio === 0);
    if (uncovered.length > 0) {
        for (const node of uncovered) {
            lines.push(`- **${node.nodeId}** (${node.label}): Missing ${node.requiredAttributes.join(', ')}`);
        }
    } else {
        lines.push('All nodes have at least partial coverage.');
    }

    return lines.join('\n');
}

/**
 * Coverage thresholds for decision making
 */
export interface CoverageThresholds {
    /** Minimum overall coverage to consider ontology adequate */
    minOverallCoverage: number;
    /** Minimum per-node coverage for critical nodes */
    minNodeCoverage: number;
    /** Maximum uncovered critical attributes */
    maxUncoveredCritical: number;
}

export const DEFAULT_COVERAGE_THRESHOLDS: CoverageThresholds = {
    minOverallCoverage: 0.7,    // 70% overall
    minNodeCoverage: 0.5,       // 50% per node
    maxUncoveredCritical: 3,    // Max 3 critical uncovered
};

/**
 * Check if coverage meets thresholds
 */
export function checkCoverageThresholds(
    stats: CoverageStats,
    thresholds: CoverageThresholds = DEFAULT_COVERAGE_THRESHOLDS,
    criticalNodes: string[] = []
): { passed: boolean; violations: string[] } {
    const violations: string[] = [];

    if (stats.coverageRatio < thresholds.minOverallCoverage) {
        violations.push(`Overall coverage ${(stats.coverageRatio * 100).toFixed(1)}% below ${(thresholds.minOverallCoverage * 100).toFixed(1)}%`);
    }

    for (const node of stats.byNode) {
        if (node.coverageRatio < thresholds.minNodeCoverage) {
            if (criticalNodes.includes(node.nodeId) || criticalNodes.length === 0) {
                violations.push(`Node ${node.nodeId} coverage ${(node.coverageRatio * 100).toFixed(1)}% below ${(thresholds.minNodeCoverage * 100).toFixed(1)}%`);
            }
        }
    }

    const criticalUncovered = stats.byNode.filter(n => 
        criticalNodes.includes(n.nodeId) && n.coverageRatio === 0
    ).length;
    if (criticalUncovered > thresholds.maxUncoveredCritical) {
        violations.push(`${criticalUncovered} critical nodes have zero coverage (max ${thresholds.maxUncoveredCritical})`);
    }

    return { passed: violations.length === 0, violations };
}