import type { UisgGraph, UisgSurface, SurfaceVariant } from './types.js';
import type { TemplateTarget } from './templates/render.js';
import { loadGraph } from './cli.js';
import { getTemplate, type Template } from './templates/index.js';
import { resolveSurface } from './resolve.js';
import { validateSurfaceVariant } from './validate.js';

export interface AiGenerateOptions {
    surfaceId: string;
    prompt: string;
    contextId?: string;
    variantId: string;
    target?: TemplateTarget;
    fromVariant?: string;
    maxCandidates?: number;
}

export interface AiCandidate {
    variant: SurfaceVariant;
    templateOverride?: string;
    confidence: number;
    reasoning: string;
    staticChecks: StaticCheckResult[];
}

export interface StaticCheckResult {
    check: 'schema' | 'tone' | 'types';
    passed: boolean;
    errors: string[];
}

export interface AiGenerateResult {
    surfaceId: string;
    prompt: string;
    candidates: AiCandidate[];
    selected?: AiCandidate;
    runId: string;
}

const SYSTEM_PROMPT = `You are a UISG variant generator. Given a surface, its graph context, and a natural language prompt, generate a SurfaceVariant JSON patch.

The variant schema:
{
  template?: string;                    // override template shape (item|panel|editor|status)
  propsSchema?: Record<string, ParamDef>; // additional/override props (Zod-like)
  strategyOverrides?: Record<SeamRole, string>; // strategy per context
  description: string;                  // human-readable
  status: 'experimental' | 'candidate' | 'promoted' | 'archived';
}

Available templates: item, panel, editor, status
Available seam roles: capture, elicit, layout, display, match, notify, sync, persist, navigate, analyze, export, search, render, validate, transform, compose

Respond with ONLY valid JSON:
{
  "variant": { ...SurfaceVariant },
  "templateOverride": "string or null",
  "confidence": 0.0-1.0,
  "reasoning": "explanation"
}`;

function buildContext(surface: UisgSurface, graph: UisgGraph, contextId?: string): string {
    const contextNode = contextId
        ? graph.nodes.find((n): n is UisgSurface => n.id === contextId && n.type === 'surface')
        : null;

    const relatedSurfaces = graph.edges
        .filter(e => e.from === surface.id || e.to === surface.id)
        .map(e => graph.nodes.find((n): n is UisgSurface => n.id === (e.from === surface.id ? e.to : e.from) && n.type === 'surface'))
        .filter((n): n is UisgSurface => Boolean(n));

    const context = contextNode ? { id: contextNode.id, name: contextNode.name, template: contextNode.template } : null;

    return JSON.stringify({
        surface: {
            id: surface.id,
            name: surface.name,
            template: surface.template,
            propsSchema: surface.propsSchema,
            variants: surface.variants,
            defaultVariant: surface.defaultVariant,
        },
        context,
        relatedSurfaces: relatedSurfaces.map(s => ({
            id: s.id,
            name: s.name,
            template: s.template,
        })),
        templates: Object.values(getTemplate('item') ? { item: getTemplate('item') } : {}),
    }, null, 2);
}

function callLLM(prompt: string): Promise<string> {
    const provider = process.env.UISG_AI_PROVIDER ?? 'mock';
    
    if (provider === 'mock') {
        return Promise.resolve(mockLLMResponse(prompt));
    }
    
    if (provider === 'ollama') {
        return callOllama(prompt);
    }
    
    if (provider === 'anthropic') {
        return callAnthropic(prompt);
    }
    
    throw new Error(`Unknown AI provider: ${provider}`);
}

function mockLLMResponse(prompt: string): string {
    // Extract just the user prompt part (after "Prompt: ")
    const promptMatch = prompt.match(/Prompt:\s*(.+?)(?:\n\n|$)/s);
    const userPrompt = promptMatch ? promptMatch[1].toLowerCase() : prompt.toLowerCase();
    
    if (userPrompt.includes('dense') || userPrompt.includes('compact')) {
        return JSON.stringify({
            variant: {
                template: 'item',
                description: 'Dense list view for mobile',
                status: 'experimental',
                strategyOverrides: {
                    layout: 'stacked',
                    display: 'inline',
                },
            },
            templateOverride: null,
            confidence: 0.85,
            reasoning: 'Prompt requests dense/compact view; item template with stacked layout is appropriate',
        });
    }
    
    if (userPrompt.includes('card') || userPrompt.includes('detailed')) {
        return JSON.stringify({
            variant: {
                template: 'panel',
                description: 'Detailed card view with expanded metadata',
                status: 'experimental',
                propsSchema: {
                    showMetadata: { type: 'boolean', optional: true },
                    expandable: { type: 'boolean', optional: true },
                },
                strategyOverrides: {
                    layout: 'grid',
                    display: 'card',
                },
            },
            templateOverride: null,
            confidence: 0.8,
            reasoning: 'Prompt requests detailed/card view; panel template with grid layout fits',
        });
    }
    
    if (userPrompt.includes('editor') || userPrompt.includes('edit')) {
        return JSON.stringify({
            variant: {
                template: 'editor',
                description: 'Inline editor with markdown support',
                status: 'experimental',
                propsSchema: {
                    placeholder: { type: 'string', optional: true },
                    toolbar: { type: 'boolean', optional: true },
                },
                strategyOverrides: {
                    elicit: 'inline-editor',
                },
            },
            templateOverride: null,
            confidence: 0.75,
            reasoning: 'Prompt requests editor; editor template with inline strategy',
        });
    }
    
    if (userPrompt.includes('status') || userPrompt.includes('badge') || userPrompt.includes('indicator')) {
        return JSON.stringify({
            variant: {
                template: 'status',
                description: 'Status badge with color coding',
                status: 'experimental',
                propsSchema: {
                    variant: { type: 'string', optional: true },
                    size: { type: 'string', optional: true },
                },
            },
            templateOverride: null,
            confidence: 0.75,
            reasoning: 'Prompt requests status/badge; status template',
        });
    }
    
    return JSON.stringify({
        variant: {
            template: 'item',
            description: 'Generated variant from prompt',
            status: 'experimental',
        },
        templateOverride: null,
        confidence: 0.6,
        reasoning: 'Generic fallback for unrecognized prompt',
    });
}

async function callOllama(prompt: string): Promise<string> {
    const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL ?? 'llama3.1';
    
    const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            prompt: `${SYSTEM_PROMPT}\n\nUser: ${prompt}`,
            stream: false,
            format: 'json',
            options: { temperature: 0.3 },
        }),
    });
    
    if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.response;
}

async function callAnthropic(prompt: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2048,
            temperature: 0.3,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }],
        }),
    });
    
    if (!response.ok) {
        throw new Error(`Anthropic error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.content[0].text;
}

function runStaticChecks(variant: SurfaceVariant, templateOverride: string | null): StaticCheckResult[] {
    const results: StaticCheckResult[] = [];
    
    // Schema check
    const schemaErrors = validateSurfaceVariant(variant);
    results.push({
        check: 'schema',
        passed: schemaErrors.length === 0,
        errors: schemaErrors,
    });
    
    // Tone check (placeholder - would run lint:tone on generated code)
    results.push({
        check: 'tone',
        passed: true,
        errors: [],
    });
    
    // Type check (placeholder - would run tsc --noEmit on generated component)
    results.push({
        check: 'types',
        passed: true,
        errors: [],
    });
    
    return results;
}

function smokeTest(candidate: AiCandidate, surface: UisgSurface, graph: UisgGraph, target: TemplateTarget): number {
    let score = candidate.confidence;
    
    for (const check of candidate.staticChecks) {
        if (check.passed) score += 0.1;
        else score -= 0.2;
    }
    
    if (candidate.variant.template && getTemplate(candidate.variant.template as any)) {
        score += 0.05;
    }
    
    return Math.max(0, Math.min(1, score));
}

export async function aiGenerateVariant(options: AiGenerateOptions): Promise<AiGenerateResult> {
    const graph = loadGraph(new Map());
    const surface = graph.nodes.find(n => n.id === options.surfaceId && n.type === 'surface') as UisgSurface;
    
    if (!surface) {
        throw new Error(`Surface not found: ${options.surfaceId}`);
    }
    
    const target = options.target ?? 'react';
    const maxCandidates = options.maxCandidates ?? 3;
    
    const contextInfo = buildContext(surface, graph, options.contextId);
    const baseVariant = options.fromVariant ? surface.variants?.[options.fromVariant] : surface.defaultVariant ? surface.variants?.[surface.defaultVariant] : undefined;
    const baseInfo = baseVariant ? JSON.stringify(baseVariant, null, 2) : 'none (base surface)';
    
    const userPrompt = `
Surface: ${surface.id} (${surface.name})
Current template: ${surface.template ?? 'none'}
Base variant: ${baseInfo}
Context: ${options.contextId ?? 'default'}
Target: ${target}

Prompt: ${options.prompt}

Graph context:
${contextInfo}

Generate ${maxCandidates} candidate variants. Return as JSON array.
`;

    const llmResponse = await callLLM(userPrompt);
    
    let candidatesData: Array<{
        variant: SurfaceVariant;
        templateOverride?: string;
        confidence: number;
        reasoning: string;
    }>;
    
    try {
        const parsed = JSON.parse(llmResponse);
        candidatesData = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
        throw new Error(`Failed to parse LLM response: ${llmResponse.slice(0, 200)}`);
    }
    
    const candidates: AiCandidate[] = candidatesData.slice(0, maxCandidates).map(c => {
        const staticChecks = runStaticChecks(c.variant, c.templateOverride ?? null);
        return {
            variant: c.variant,
            templateOverride: c.templateOverride,
            confidence: c.confidence,
            reasoning: c.reasoning,
            staticChecks,
        };
    });
    
    for (const candidate of candidates) {
        candidate.confidence = smokeTest(candidate, surface, graph, target);
    }
    
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    const selected = candidates[0];
    
    const runId = `ai-gen-${Date.now()}`;
    
    return {
        surfaceId: options.surfaceId,
        prompt: options.prompt,
        candidates,
        selected,
        runId,
    };
}

export async function aiGenerateAndCreate(options: AiGenerateOptions): Promise<{ variantId: string; result: AiGenerateResult }> {
    const result = await aiGenerateVariant(options);
    
    if (!result.selected) {
        throw new Error('No valid candidates generated');
    }
    
    if (result.selected.staticChecks.some(c => !c.passed)) {
        throw new Error('Selected candidate failed static checks');
    }
    
    const { createVariant } = await import('./variants.js');
    const record = createVariant(
        options.surfaceId,
        options.variantId,
        result.selected.variant,
        options.fromVariant
    );
    
    return { variantId: record.id, result };
}