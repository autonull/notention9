import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { StrategySpec } from './StrategySpec.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * T4 Request - Emits a request for a developer or delegated agent to implement a new seam/strategy
 */

export interface T4Request {
    id: string;
    type: 'new-seam' | 'new-strategy' | 'seam-modification' | 'infrastructure';
    title: string;
    description: string;
    evidence: T4Evidence;
    constraints: T4Constraints;
    acceptance: string[];
    proposedSeam?: StrategySpec['seam'];
    priority: 'low' | 'medium' | 'high' | 'critical';
    createdAt: string;
    createdBy: 'system' | 'human';
    status: 'open' | 'assigned' | 'in-progress' | 'review' | 'done' | 'rejected';
    assignee?: string;
}

export interface T4Evidence {
    problemStatement: string;
    observedFriction: string[];
    failureSignals: string[];
    impactScore: number; // frequency × severity × recoverability × reach
    affectedWorkflows: string[];
    baselineMetrics?: Record<string, number>;
    suggestedSolution?: string;
}

export interface T4Constraints {
    must: string[];
    may: string[];
    mustNot: string[];
    deadline?: string;
    estimatedEffort?: 'small' | 'medium' | 'large';
    dependencies?: string[];
}

export interface T4RequestDir {
    root: string;
    requests: Map<string, T4Request>;
}

/**
 * Create a T4 request from evaluation evidence
 */
export function createT4Request(
    evidence: T4Evidence,
    options: {
        type?: T4Request['type'];
        proposedSeam?: StrategySpec['seam'];
        priority?: T4Request['priority'];
        createdBy?: 'system' | 'human';
        constraints?: Partial<T4Constraints>;
    } = {}
): T4Request {
    const id = `t4-${evidence.problemStatement.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-${Date.now()}`;
    
    const request: T4Request = {
        id,
        type: options.type || 'new-strategy',
        title: evidence.problemStatement,
        description: generateDescription(evidence),
        evidence,
        constraints: {
            must: options.constraints?.must || [
                'Keyboard navigable',
                'ARIA labels on all inputs',
                'Works offline',
                'Conforms to existing seam interfaces',
            ],
            may: options.constraints?.may || [
                'react',
                '@notention/ui/*',
                '@notention/core/*',
                'zod',
                'date-fns',
            ],
            mustNot: options.constraints?.mustNot || [
                'fs', 'fs/promises', 'node:*',
                'eval', 'fetch',
                'localStorage', 'sessionStorage', 'indexedDB',
            ],
            deadline: options.constraints?.deadline,
            estimatedEffort: options.constraints?.estimatedEffort || 'medium',
            dependencies: options.constraints?.dependencies || [],
        },
        acceptance: generateAcceptanceCriteria(evidence),
        proposedSeam: options.proposedSeam,
        priority: options.priority || 'medium',
        createdAt: new Date().toISOString(),
        createdBy: options.createdBy || 'system',
        status: 'open',
    };
    
    return request;
}

function generateDescription(evidence: T4Evidence): string {
    return `
## Problem
${evidence.problemStatement}

## Observed Friction
${evidence.observedFriction.map(f => `- ${f}`).join('\n')}

## Failure Signals
${evidence.failureSignals.map(f => `- ${f}`).join('\n')}

## Impact Score
${evidence.impactScore} (frequency × severity × recoverability × reach)

## Affected Workflows
${evidence.affectedWorkflows.map(w => `- ${w}`).join('\n')}

## Suggested Solution
${evidence.suggestedSolution || 'To be determined by implementer'}

## Baseline Metrics
${evidence.baselineMetrics ? JSON.stringify(evidence.baselineMetrics, null, 2) : 'Not available'}
`;
}

function generateAcceptanceCriteria(evidence: T4Evidence): string[] {
    return [
        `Solves: ${evidence.problemStatement}`,
        'Passes all static gates (TypeScript, ESLint, seam conformance, import allowlist, no ambient caps, a11y, keyboard)',
        'Beats baseline on primary metrics (completion + relevance)',
        'No golden case regressions',
        'Resource cost within acceptable limits',
        'Human confirms usability',
    ];
}

/**
 * Save T4 request to directory
 */
export function saveT4Request(request: T4Request, dir: string = 'loop/requests'): void {
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, `${request.id}.md`);
    
    const markdown = `# ${request.title}

**ID:** ${request.id}
**Type:** ${request.type}
**Priority:** ${request.priority}
**Status:** ${request.status}
**Created:** ${request.createdAt}
**Created by:** ${request.createdBy}
${request.assignee ? `**Assignee:** ${request.assignee}` : ''}

---

${request.description}

---

## Constraints

### Must
${request.constraints.must.map(m => `- ${m}`).join('\n')}

### May
${request.constraints.may.map(m => `- ${m}`).join('\n')}

### Must Not
${request.constraints.mustNot.map(m => `- ${m}`).join('\n')}

${request.constraints.deadline ? `**Deadline:** ${request.constraints.deadline}` : ''}
${request.constraints.estimatedEffort ? `**Estimated Effort:** ${request.constraints.estimatedEffort}` : ''}
${request.constraints.dependencies?.length ? `**Dependencies:** ${request.constraints.dependencies.join(', ')}` : ''}

---

## Acceptance Criteria
${request.acceptance.map((a, i) => `${i + 1}. ${a}`).join('\n')}

---

## Proposed Seam
${request.proposedSeam || 'Not specified'}
`;
    
    writeFileSync(filePath, markdown);
}

/**
 * Load all T4 requests from directory
 */
export function loadT4Requests(dir: string = 'loop/requests'): T4RequestDir {
    const result: T4RequestDir = { root: dir, requests: new Map() };
    
    if (!existsSync(dir)) return result;
    
    const files = readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.json'));
    
    for (const file of files) {
        try {
            const content = readFileSync(join(dir, file), 'utf-8');
            let request: T4Request;
            
            if (file.endsWith('.json')) {
                request = JSON.parse(content);
            } else {
                // Parse markdown frontmatter
                request = parseMarkdownRequest(content, file);
            }
            
            result.requests.set(request.id, request);
        } catch (e) {
            console.warn(`Failed to load T4 request ${file}: ${e}`);
        }
    }
    
    return result;
}

function parseMarkdownRequest(content: string, filename: string): T4Request {
    // Simple frontmatter parser
    const lines = content.split('\n');
    const frontmatter: Record<string, string> = {};
    let inFrontmatter = false;
    let frontmatterEnd = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === '---') {
            if (!inFrontmatter) {
                inFrontmatter = true;
            } else {
                frontmatterEnd = i;
                break;
            }
        } else if (inFrontmatter) {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
                frontmatter[key.trim()] = valueParts.join(':').trim();
            }
        }
    }
    
    // Extract ID from filename
    const id = filename.replace('.md', '');
    
    return {
        id,
        type: (frontmatter['Type'] as T4Request['type']) || 'new-strategy',
        title: frontmatter['Title'] || frontmatter['title'] || 'Untitled',
        description: content.slice(frontmatterEnd + 1).trim(),
        evidence: {
            problemStatement: frontmatter['Title'] || frontmatter['title'] || 'Unknown problem',
            observedFriction: [],
            failureSignals: [],
            impactScore: 0,
            affectedWorkflows: [],
        },
        constraints: {
            must: [],
            may: [],
            mustNot: [],
        },
        acceptance: [],
        proposedSeam: frontmatter['Proposed Seam'],
        priority: (frontmatter['Priority'] as T4Request['priority']) || 'medium',
        createdAt: frontmatter['Created'] || new Date().toISOString(),
        createdBy: (frontmatter['Created by'] as 'system' | 'human') || 'system',
        status: (frontmatter['Status'] as T4Request['status']) || 'open',
        assignee: frontmatter['Assignee'],
    };
}

/**
 * Emit T4 request from evaluation evidence (automatic)
 */
export function emitT4RequestFromEvidence(
    evidence: T4Evidence,
    outputDir: string = 'loop/requests'
): T4Request {
    const request = createT4Request(evidence);
    saveT4Request(request, outputDir);
    console.log(`📝 Emitted T4 request: ${request.id}`);
    return request;
}

/**
 * Auto-generate T4 requests from failed evaluation candidates
 */
export function generateT4FromFailedCandidates(
    evaluationReport: { candidates: Array<{ candidateId: string; passed: boolean; taskResults: Map<string, any> | Record<string, any>; overallSuccessRate?: number }> },
    outputDir: string = 'loop/requests'
): T4Request[] {
    const requests: T4Request[] = [];
    
    for (const candidate of evaluationReport.candidates) {
        if (candidate.passed) continue;
        
        // Analyze which tasks failed
        const failedTasks: string[] = [];
        const failureReasons: string[] = [];
        
        // Handle both Map and plain object
        const taskResults = candidate.taskResults instanceof Map 
            ? candidate.taskResults 
            : new Map(Object.entries(candidate.taskResults));
        
        for (const [taskId, result] of taskResults) {
            if (result.successRate < 0.5) {
                failedTasks.push(taskId);
                failureReasons.push(`${taskId}: ${(result.successRate * 100).toFixed(0)}% success`);
            }
        }
        
        if (failedTasks.length > 0) {
            const evidence: T4Evidence = {
                problemStatement: `Candidate ${candidate.candidateId} fails on ${failedTasks.length} task(s)`,
                observedFriction: failureReasons,
                failureSignals: [`Candidate ${candidate.candidateId} did not beat baseline`],
                impactScore: 0.5, // Medium impact
                affectedWorkflows: failedTasks,
                baselineMetrics: {
                    candidateSuccessRate: candidate.overallSuccessRate || 0,
                },
                suggestedSolution: `Improve strategy for ${failedTasks.join(', ')} or redesign seam interface`,
            };
            
            const request = emitT4RequestFromEvidence(evidence, outputDir);
            requests.push(request);
        }
    }
    
    return requests;
}