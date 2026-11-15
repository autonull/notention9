/**
 * Two-step extraction pipeline:
 * Step 1 (Router): Classify input → select relevant ontology domain/keys/operators
 * Step 2 (Extract): Run extraction with focused schema from router
 */

import { DEFAULT_ONTOLOGY, collectOntologyKeysInTree, type OntologyNode, type Property } from '@notention/core';
import { extractWithLlamaCpp, closeLlamaCpp, getLlama, createChatWrapper, resolveGpuLayers, getOrCreateGrammar, parseResponse } from '../llm/llamaCppBridge.js';
import { buildSystemPrompt, leafOntologyKeys, EXTRACTION_EXAMPLES } from './extractionPrompt.js';
import { VALID_OPERATOR_SET } from './policy.js';
import { LlamaChatSession } from 'node-llama-cpp';

// ============================================================================
// STEP 1: ROUTER — classify input and pick relevant ontology subset
// ============================================================================

export interface RouterResult {
    domain: string;
    keys: string[];
    operators: string[];
    confidence: number;
    reasoning: string;
}

const DOMAIN_DEFINITIONS: Record<string, { keys: string[]; description: string }> = {
    'schedule': {
        keys: ['intent', 'startTime', 'endTime', 'schedule', 'to', 'location', 'frequency'],
        description: 'Meetings, appointments, recurring events, calendar items',
    },
    'request-service': {
        keys: ['intent', 'role', 'budget', 'price', 'deadline', 'schedule', 'location', 'student', 'patient', 'vehicle', 'format', 'audience', 'subject', 'level', 'certification'],
        description: 'Need a service provider: tutor, driver, mover, instructor, consultant, caregiver',
    },
    'request-goods': {
        keys: ['intent', 'item', 'budget', 'price', 'deadline', 'quantity', 'location'],
        description: 'Need physical goods: food, furniture, electronics, supplies',
    },
    'offer-service': {
        keys: ['intent', 'role', 'price', 'schedule', 'location', 'audience', 'format', 'subject', 'level', 'certification'],
        description: 'Offering a service: tutoring, driving, consulting, care',
    },
    'offer-goods': {
        keys: ['intent', 'item', 'price', 'quantity', 'location', 'deadline'],
        description: 'Selling/donating physical goods',
    },
    'governance': {
        keys: ['role', 'jurisdiction', 'contractType', 'allocationRule', 'credentials', 'issuers', 'wallet', 'presentation', 'trustSource', 'steward', 'guardian', 'bargainingUnit', 'authority', 'careSchedule', 'acceptsReferrals', 'specialty', 'accepts', 'context', 'reciprocity', 'resourceType', 'harvestShare', 'lineage', 'meetingType', 'conferenceType'],
        description: 'Contracts, permits, labor, credentials, resource allocation, referrals, kinship, stewardship',
    },
    'message': {
        keys: ['intent', 'to', 'subject', 'body', 'cc', 'bcc', 'from'],
        description: 'Communication: email, message, notification',
    },
    'general': {
        keys: ['intent', 'role', 'item', 'budget', 'price', 'schedule', 'deadline', 'location', 'to', 'need', 'description'],
        description: 'Fallback for unclear inputs',
    },
};

const ROUTER_SYSTEM_PROMPT = `You are a domain router for semantic extraction. Given a note, classify it into ONE domain and list the relevant ontology keys.

Domains:
${Object.entries(DOMAIN_DEFINITIONS).map(([name, def]) => `- ${name}: ${def.description}\n  Keys: ${def.keys.join(', ')}`).join('\n')}

Output JSON only:
{
  "domain": "domain_name",
  "keys": ["key1", "key2", ...],
  "operators": ["is", "contains", "less than", ...],
  "confidence": 0.9,
  "reasoning": "brief reason"
}`;

async function runRouter(text: string, modelPath: string): Promise<RouterResult> {
    const result = await extractWithLlamaCpp(text, DEFAULT_ONTOLOGY, {
        modelPath,
        systemPrompt: ROUTER_SYSTEM_PROMPT,
        temperature: 0,
        maxTokens: 256,
    });

    // Parse router output (it's not a Property array, it's a single JSON object)
    let parsed: RouterResult;
    try {
        const response = JSON.stringify(result);
        const match = response.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON found');
        parsed = JSON.parse(match[0]);
    } catch {
        // Fallback to general domain
        parsed = {
            domain: 'general',
            keys: DOMAIN_DEFINITIONS.general.keys,
            operators: [...VALID_OPERATOR_SET],
            confidence: 0.3,
            reasoning: 'Router parse failed, using fallback',
        };
    }

    return parsed;
}

// ============================================================================
// STEP 2: FOCUSED EXTRACTION — use router's domain to constrain schema
// ============================================================================

function buildFocusedSystemPrompt(keys: string[], operators: string[]): string {
    const examples = EXTRACTION_EXAMPLES
        .map(e => `"${e.input}" -> ${e.output}`)
        .join('\n');

    return `You are a precise semantic property extraction system. Output ONLY a JSON array.

Each item has exactly: "key", "operator", "values" (non-empty string array).

Allowed keys: ${keys.join(', ')}
Allowed operators: ${operators.join(', ')}

Modality rules:
- Meeting/appointment => "intent" "is" "schedule". Need/request => "intent" "is" "request".
- Facts/events use "is". Desires/hypotheticals use constraints: "contains", "less than", "before", "after", "near".
- Service/provider => "role". Goods => "item". Budget ceiling => "budget" "less than". Fixed price => "price" "is".
- Time windows => "schedule" "contains". Hard cutoffs => "deadline" "contains". Clock ranges => "startTime"/"endTime" "is".
- Do not emit "description".

Examples:
${examples}`;
}

async function runFocusedExtraction(text: string, routerResult: RouterResult, modelPath: string, fewShotBank?: any[], fewShotCount = 0): Promise<Property[]> {
    const systemPrompt = buildFocusedSystemPrompt(routerResult.keys, routerResult.operators);
    return extractWithLlamaCpp(text, DEFAULT_ONTOLOGY, {
        modelPath,
        systemPrompt,
        temperature: 0,
        maxTokens: 512,
        fewShotBank,
        fewShotCount,
    });
}

// ============================================================================
// PIPELINE ENTRY POINT
// ============================================================================

async function runRouterRaw(text: string, modelPath: string): Promise<RouterResult> {
    const llama = await getLlama({ gpu: 'cuda' });
    const model = await llama.loadModel({ modelPath, gpuLayers: resolveGpuLayers() });
    const context = await model.createContext({ contextSize: 2048 });
    const session = new (await import('node-llama-cpp')).LlamaChatSession({
        contextSequence: context.getSequence(),
        systemPrompt: ROUTER_SYSTEM_PROMPT,
        chatWrapper: createChatWrapper(modelPath),
    });

    const response = await session.prompt(`Classify: "${text}"`, {
        maxTokens: 256,
        temperature: 0,
    });

    await context.dispose();
    await model.dispose();
    await llama.dispose();

    let parsed: RouterResult;
    try {
        const match = response.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON found');
        parsed = JSON.parse(match[0]);
    } catch {
        parsed = {
            domain: 'general',
            keys: DOMAIN_DEFINITIONS.general.keys,
            operators: [...VALID_OPERATOR_SET],
            confidence: 0.3,
            reasoning: 'Router parse failed, using fallback',
        };
    }
    return parsed;
}

export async function runTwoStepExtraction(
    text: string,
    modelPath: string,
    fewShotBank?: any[],
    fewShotCount = 0
): Promise<{ router: RouterResult; extraction: Property[] }> {
    const router = await runRouterRaw(text, modelPath);
    const extraction = await runFocusedExtraction(text, router, modelPath, fewShotBank, fewShotCount);
    return { router, extraction };
}

// ============================================================================
// COMPARISON HARNESS
// ============================================================================

import { scoreExtraction } from './policy.js';

export interface ComparisonResult {
    input: string;
    expected: Property[];
    oneStep: Property[];
    twoStep: { router: RouterResult; extraction: Property[] };
    oneStepF1: number;
    twoStepF1: number;
}

export async function comparePipelines(
    inputs: string[],
    expectedList: Property[][],
    modelPath: string,
    fewShotBank?: any[],
    fewShotCount = 0
): Promise<ComparisonResult[]> {
    const results: ComparisonResult[] = [];

    for (let i = 0; i < inputs.length; i++) {
        const text = inputs[i];
        const expected = expectedList[i];

        // 1-step (current)
        const oneStep = await extractWithLlamaCpp(text, DEFAULT_ONTOLOGY, { modelPath, temperature: 0, fewShotBank, fewShotCount });
        const oneStepScore = scoreExtraction(expected, oneStep);

        // 2-step
        const twoStep = await runTwoStepExtraction(text, modelPath, fewShotBank, fewShotCount);
        const twoStepScore = scoreExtraction(expected, twoStep.extraction);

        results.push({
            input: text,
            expected,
            oneStep,
            twoStep,
            oneStepF1: oneStepScore.f1,
            twoStepF1: twoStepScore.f1,
        });
    }

    return results;
}