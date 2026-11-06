/**
 * E7 Ontology Drift & Co-occurrence Audit
 * 
 * Computes key frequency, pairwise co-occurrence lift, operator-distribution per key
 * from quality cases and diffs against the ontology.
 */

import { DEFAULT_ONTOLOGY } from '@notention/core/ontology/domains.js';
import type { OntologyNode, OntologyAttribute } from '@notention/core/types/index.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface QualityCase {
    name: string;
    input: string;
    expected: ExpectedProperty[];
    forbidden?: ForbiddenProperty[];
    expectedOutcome?: string;
}

export interface ExpectedProperty {
    key: string;
    operator: string;
    values: string[];
    confidence?: number;
}

export interface ForbiddenProperty {
    key: string;
    operator: string;
    values: string[];
}

export interface KeyStats {
    key: string;
    frequency: number;
    cases: number;
    operators: Map<string, number>;
    coOccursWith: Map<string, number>;
}

export interface AuditResult {
    keyStats: KeyStats[];
    orphanKeys: string[];           // Keys in ontology but never used in quality cases
    unusedByMatchKeys: string[];    // Keys used in extraction but never in match cases
    overBroadOperators: OverBroadOperator[];
    missingHierarchies: MissingHierarchy[];
    operatorDrift: OperatorDrift[];
}

export interface OverBroadOperator {
    key: string;
    currentOperators: string[];
    observedOperators: string[];
    missingFromObserved: string[];
    extraInObserved: string[];
}

export interface MissingHierarchy {
    keys: string[];
    coOccurrence: number;
    lift: number;
    suggestedParent: string | null;
}

export interface OperatorDrift {
    key: string;
    expectedDefault: string;
    observedDefault: string;
    driftScore: number;
}

function collectAllOntologyKeys(ontology: OntologyNode[]): Map<string, { node: OntologyNode; attr: OntologyAttribute }> {
    const keys = new Map<string, { node: OntologyNode; attr: OntologyAttribute }>();
    
    function traverse(nodes: OntologyNode[]) {
        for (const node of nodes) {
            if (node.attributes) {
                for (const [key, attr] of Object.entries(node.attributes)) {
                    keys.set(key, { node, attr });
                }
            }
            if (node.children) {
                traverse(node.children);
            }
        }
    }
    
    traverse(ontology);
    return keys;
}

function getRealOperators(attr: OntologyAttribute): string[] {
    return attr.operators?.real ?? [];
}

function getImaginaryOperators(attr: OntologyAttribute): string[] {
    return attr.operators?.imaginary ?? [];
}

function getDefaultOperator(attr: OntologyAttribute): string | null {
    const real = getRealOperators(attr);
    return real.length > 0 ? real[0] : null;
}

async function loadQualityCases(): Promise<QualityCase[]> {
    const manifestPath = join(__dirname, '..', '..', '..', 'eval', 'cases', 'manifest.json');
    const content = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);
    
    const cases: QualityCase[] = [];
    
    for (const c of manifest.cases) {
        // Only process extraction quality cases
        if (c.qualityFamily !== 'extraction') continue;
        
        const casePath = join(__dirname, '..', '..', '..', 'eval', 'cases', c.path);
        const caseContent = readFileSync(casePath, 'utf-8');
        const caseData = JSON.parse(caseContent);
        cases.push({
            name: c.id,
            input: caseData.input,
            expected: caseData.expected ?? [],
            forbidden: caseData.forbidden ?? [],
            expectedOutcome: caseData.expectedOutcome ?? 'suggested',
        });
    }
    
    return cases;
}

function computeKeyStats(cases: QualityCase[]): KeyStats[] {
    const keyMap = new Map<string, KeyStats>();
    const totalCases = cases.length;
    
    // First pass: collect frequencies and operators
    for (const c of cases) {
        const keysInCase = new Set<string>();
        
        for (const prop of c.expected) {
            keysInCase.add(prop.key);
            
            let stats = keyMap.get(prop.key);
            if (!stats) {
                stats = {
                    key: prop.key,
                    frequency: 0,
                    cases: 0,
                    operators: new Map(),
                    coOccursWith: new Map(),
                };
                keyMap.set(prop.key, stats);
            }
            
            stats.frequency++;
            const opCount = stats.operators.get(prop.operator) ?? 0;
            stats.operators.set(prop.operator, opCount + 1);
        }
        
        // Count cases containing each key
        for (const key of keysInCase) {
            const stats = keyMap.get(key)!;
            stats.cases++;
        }
        
        // Second pass: co-occurrence
        const keysArray = Array.from(keysInCase);
        for (let i = 0; i < keysArray.length; i++) {
            for (let j = i + 1; j < keysArray.length; j++) {
                const k1 = keysArray[i];
                const k2 = keysArray[j];
                
                const s1 = keyMap.get(k1)!;
                const s2 = keyMap.get(k2)!;
                
                s1.coOccursWith.set(k2, (s1.coOccursWith.get(k2) ?? 0) + 1);
                s2.coOccursWith.set(k1, (s2.coOccursWith.get(k1) ?? 0) + 1);
            }
        }
    }
    
    // Normalize co-occurrence to lift (observed / expected)
    for (const [key, stats] of keyMap) {
        const pKey = stats.cases / totalCases;
        
        for (const [otherKey, coCount] of stats.coOccursWith) {
            const otherStats = keyMap.get(otherKey)!;
            const pOther = otherStats.cases / totalCases;
            const expected = pKey * pOther * totalCases;
            const lift = expected > 0 ? coCount / expected : 0;
            stats.coOccursWith.set(otherKey, lift);
        }
    }
    
    return Array.from(keyMap.values()).sort((a, b) => b.frequency - a.frequency);
}

function findOrphanKeys(keyStats: KeyStats[], ontologyKeys: Map<string, any>): string[] {
    const usedKeys = new Set(keyStats.map(s => s.key));
    const orphans: string[] = [];
    
    for (const [key] of ontologyKeys) {
        if (!usedKeys.has(key)) {
            orphans.push(key);
        }
    }
    
    return orphans.sort();
}

function findOverBroadOperators(keyStats: KeyStats[], ontologyKeys: Map<string, any>): OverBroadOperator[] {
    const results: OverBroadOperator[] = [];
    
    for (const stats of keyStats) {
        const ontologyEntry = ontologyKeys.get(stats.key);
        if (!ontologyEntry) continue; // Key not in ontology (will be caught elsewhere)
        
        const expectedReal = getRealOperators(ontologyEntry.attr);
        const observedOperators = Array.from(stats.operators.keys());
        
        const missingFromObserved = expectedReal.filter(op => !observedOperators.includes(op));
        const extraInObserved = observedOperators.filter(op => !expectedReal.includes(op));
        
        if (missingFromObserved.length > 0 || extraInObserved.length > 0) {
            results.push({
                key: stats.key,
                currentOperators: expectedReal,
                observedOperators,
                missingFromObserved,
                extraInObserved,
            });
        }
    }
    
    return results;
}

function findMissingHierarchies(keyStats: KeyStats[], minLift = 3.0, minClusterSize = 3): MissingHierarchy[] {
    const results: MissingHierarchy[] = [];
    const visited = new Set<string>();
    
    // Build co-occurrence graph - only keep edges with high lift
    const edges: Array<{ k1: string; k2: string; lift: number }> = [];
    
    for (const stats of keyStats) {
        for (const [otherKey, lift] of stats.coOccursWith) {
            if (lift >= minLift) {
                edges.push({ k1: stats.key, k2: otherKey, lift });
            }
        }
    }
    
    // Find connected components (clusters) using Union-Find
    const parent = new Map<string, string>();
    
    function find(x: string): string {
        if (!parent.has(x)) parent.set(x, x);
        if (parent.get(x) !== x) {
            parent.set(x, find(parent.get(x)!));
        }
        return parent.get(x)!;
    }
    
    function union(x: string, y: string): void {
        parent.set(find(x), find(y));
    }
    
    for (const edge of edges) {
        union(edge.k1, edge.k2);
    }
    
    // Group by component
    const components = new Map<string, Set<string>>();
    for (const stats of keyStats) {
        const root = find(stats.key);
        if (!components.has(root)) components.set(root, new Set());
        components.get(root)!.add(stats.key);
    }
    
    // Report clusters of size >= minClusterSize
    for (const [, keys] of components) {
        if (keys.size >= minClusterSize) {
            const keysArray = Array.from(keys);
            // Calculate average lift within cluster
            let totalLift = 0;
            let pairCount = 0;
            
            for (let i = 0; i < keysArray.length; i++) {
                for (let j = i + 1; j < keysArray.length; j++) {
                    const s1 = keyStats.find(s => s.key === keysArray[i]);
                    const lift = s1?.coOccursWith.get(keysArray[j]) ?? 0;
                    if (lift > 0) {
                        totalLift += lift;
                        pairCount++;
                    }
                }
            }
            
            const avgLift = pairCount > 0 ? totalLift / pairCount : 0;
            
            // Suggest parent based on most central key (highest degree)
            let suggestedParent: string | null = null;
            let maxDegree = 0;
            for (const key of keysArray) {
                const stats = keyStats.find(s => s.key === key);
                if (stats) {
                    const degree = Array.from(stats.coOccursWith.values()).filter(l => l >= minLift).length;
                    if (degree > maxDegree) {
                        maxDegree = degree;
                        suggestedParent = key;
                    }
                }
            }
            
            results.push({
                keys: keysArray.sort(),
                coOccurrence: pairCount,
                lift: avgLift,
                suggestedParent,
            });
        }
    }
    
    return results.sort((a, b) => b.lift - a.lift);
}

function findOperatorDrift(keyStats: KeyStats[], ontologyKeys: Map<string, any>): OperatorDrift[] {
    const results: OperatorDrift[] = [];
    
    for (const stats of keyStats) {
        const ontologyEntry = ontologyKeys.get(stats.key);
        if (!ontologyEntry) continue;
        
        const expectedDefault = getDefaultOperator(ontologyEntry.attr);
        if (!expectedDefault) continue;
        
        // Find most observed operator
        let observedDefault = '';
        let maxCount = 0;
        for (const [op, count] of stats.operators) {
            if (count > maxCount) {
                maxCount = count;
                observedDefault = op;
            }
        }
        
        if (observedDefault && observedDefault !== expectedDefault) {
            // Drift score = proportion of non-default usage
            const total = stats.frequency;
            const defaultCount = stats.operators.get(expectedDefault) ?? 0;
            const driftScore = 1 - (defaultCount / total);
            
            results.push({
                key: stats.key,
                expectedDefault,
                observedDefault,
                driftScore,
            });
        }
    }
    
    return results.sort((a, b) => b.driftScore - a.driftScore);
}

export async function runOntologyAudit(): Promise<AuditResult> {
    console.log('🔬 E7 Ontology Drift & Co-occurrence Audit');
    console.log('===========================================\n');
    
    // Load quality cases
    const qualityCases = await loadQualityCases();
    console.log(`Loaded ${qualityCases.length} quality cases`);
    
    // Collect ontology keys
    const ontologyKeys = collectAllOntologyKeys(DEFAULT_ONTOLOGY);
    console.log(`Ontology has ${ontologyKeys.size} keys\n`);
    
    // Compute statistics
    const keyStats = computeKeyStats(qualityCases);
    console.log(`Found ${keyStats.length} keys in quality cases\n`);
    
    // Run analyses
    const orphanKeys = findOrphanKeys(keyStats, ontologyKeys);
    console.log(`Orphan keys (in ontology, not in cases): ${orphanKeys.length}`);
    
    const overBroadOperators = findOverBroadOperators(keyStats, ontologyKeys);
    console.log(`Keys with operator drift: ${overBroadOperators.length}`);
    
    const missingHierarchies = findMissingHierarchies(keyStats);
    console.log(`Missing hierarchy candidates (lift ≥ 0.9, size ≥ 3): ${missingHierarchies.length}`);
    
    const operatorDrift = findOperatorDrift(keyStats, ontologyKeys);
    console.log(`Keys with default operator drift: ${operatorDrift.length}`);
    
    const result: AuditResult = {
        keyStats,
        orphanKeys,
        unusedByMatchKeys: [], // Would need match cases to compute
        overBroadOperators,
        missingHierarchies,
        operatorDrift,
    };
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('AUDIT SUMMARY');
    console.log('='.repeat(60));
    
    console.log('\n📊 TOP 20 KEYS BY FREQUENCY:');
    console.log('Key'.padEnd(25) + 'Freq  Cases  Top Operators');
    console.log('-'.repeat(60));
    for (const s of keyStats.slice(0, 20)) {
        const topOps = Array.from(s.operators.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([op, count]) => `${op}(${count})`)
            .join(', ');
        console.log(`${s.key.padEnd(25)} ${String(s.frequency).padStart(4)}  ${String(s.cases).padStart(4)}  ${topOps}`);
    }
    
    if (orphanKeys.length > 0) {
        console.log('\n🚫 ORPHAN KEYS (in ontology, never used):');
        console.log(orphanKeys.slice(0, 30).join(', '));
        if (orphanKeys.length > 30) console.log(`... and ${orphanKeys.length - 30} more`);
    }
    
    if (overBroadOperators.length > 0) {
        console.log('\n⚠️  OPERATOR DRIFT (observed ≠ ontology):');
        for (const d of overBroadOperators.slice(0, 15)) {
            console.log(`  ${d.key}: ontology=[${d.currentOperators.join(', ')}] observed=[${d.observedOperators.join(', ')}]`);
            if (d.missingFromObserved.length > 0) console.log(`    Missing from observed: ${d.missingFromObserved.join(', ')}`);
            if (d.extraInObserved.length > 0) console.log(`    Extra in observed: ${d.extraInObserved.join(', ')}`);
        }
    }
    
    if (missingHierarchies.length > 0) {
        console.log('\n🔗 MISSING HIERARCHY CANDIDATES (co-occur frequently):');
        for (const h of missingHierarchies.slice(0, 10)) {
            console.log(`  [${h.keys.join(', ')}] lift=${h.lift.toFixed(2)} pairs=${h.coOccurrence}`);
        }
    }
    
    if (operatorDrift.length > 0) {
        console.log('\n📈 DEFAULT OPERATOR DRIFT:');
        for (const d of operatorDrift.slice(0, 15)) {
            console.log(`  ${d.key}: expected="${d.expectedDefault}" observed="${d.observedDefault}" drift=${d.driftScore.toFixed(2)}`);
        }
    }
    
    return result;
}

export async function runAuditAndSave(outputPath?: string): Promise<void> {
    const result = await runOntologyAudit();
    
    if (outputPath) {
        const serializable = {
            timestamp: new Date().toISOString(),
            keyStats: result.keyStats.map(s => ({
                key: s.key,
                frequency: s.frequency,
                cases: s.cases,
                operators: Object.fromEntries(s.operators),
                coOccursWith: Object.fromEntries(s.coOccursWith),
            })),
            orphanKeys: result.orphanKeys,
            unusedByMatchKeys: result.unusedByMatchKeys,
            overBroadOperators: result.overBroadOperators,
            missingHierarchies: result.missingHierarchies,
            operatorDrift: result.operatorDrift,
        };
        
        writeFileSync(outputPath, JSON.stringify(serializable, null, 2));
        console.log(`\n💾 Results saved to ${outputPath}`);
    }
}