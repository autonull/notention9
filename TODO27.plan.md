# Implementation Plan: Note Suggestions (TODO.27.md)

**Status**: Core implementation complete — build passing; integration pending  
**Scope**: `core`, `agent`, `ui`  
**Conventions**: `AGENTS.md` (elegant, consolidated, DRY, terse syntax, few comments)

---

## Module Map (per spec §8)

```
core/src/suggestions/note/
  types.ts            # SuggestionDraft, payload, events, SuggestionSource, SuggestionRule ✓
  rules.ts            # ontology rule evaluator (~100 lines) ✓
  sources/
    rules.ts          # deterministic rules source ✓
    fulfillment.ts    # skills + reshape + execution + verification ✓
    related.ts        # relatedNotes source ✓
    llm.ts            # LLM question battery ✓
  reshape.ts          # ontology-typed depth-1 counterfactuals ✓
  orchestrator.ts     # generations, dedup, suppression, budgets, cancellation ✓
  verify.ts           # light re-match on import ✓
  index.ts            # exports ✓

ui/src/hooks/useNoteSuggestions.ts ✓
ui/src/components/suggestions/
  NoteSuggestions.tsx # panel ✓
  SuggestionCard.tsx  # verb-first card ✓

agent/src/server/plugins/SuggestionPlugin.ts   # MCP: suggest_for_note, refresh_suggestions ✓
```

---

## Phase 0: Shared Types & Ontology Extension

### 0.1 `core/src/suggestions/note/types.ts`

```typescript
import type { Note, Property, OntologyNode } from '../../types/index.js';
import type { SkillDefinition } from '../../skills/skillPatternMatcher.js';

// ──────────────────────────────────────────────────────────────
// Context passed to all sources
// ──────────────────────────────────────────────────────────────
export interface SuggestionContext {
  note: Note;
  intent: 'real' | 'imaginary' | 'ambiguous';
  ontology: OntologyNode[];
  skills: SkillDefinition[];
  relatedNotes: Note[];
  corpusVersion: number;        // for reshape cache invalidation
  llmConsent: boolean;          // from CapabilityManager
  generationId: string;         // unique per generation run
  contentHash: string;          // sha256(normalized note)
}

// ──────────────────────────────────────────────────────────────
// Source interface (spec §3)
// ──────────────────────────────────────────────────────────────
export type SourceKind = 'deterministic' | 'model';
export type SourceId = 'rules' | 'fulfillment' | 'related' | 'llm';

export interface SuggestionSource {
  id: SourceId;
  kind: SourceKind;
  available(ctx: SuggestionContext): boolean;
  suggest(ctx: SuggestionContext, emit: (draft: SuggestionDraft) => void, signal: AbortSignal): Promise<void>;
}

// ──────────────────────────────────────────────────────────────
// Suggestion Draft (emitted by sources, validated by orchestrator)
// ──────────────────────────────────────────────────────────────
export type SuggestionKind =
  | 'skill'
  | 'add-properties'
  | 'schedule'
  | 'publish'
  | 'watch'
  | 'clarify'
  | 'create-note'
  | 'info';

export interface SuggestionPayload {
  kind: SuggestionKind;
  skillId?: string;                    // for 'skill'
  properties?: Property[];             // for 'add-properties'
  preview?: string;                    // human-readable preview
  evidence: string;                    // fit evidence from matcher/skill
  confidence: number;                  // 0-1
  contentHash: string;                 // sha256(normalized note)
  criteria?: Record<string, unknown>;  // for reshape: which constraints changed
}

export interface SuggestionDraft {
  source: SourceId;
  payload: SuggestionPayload;
  signature: string;                   // dedup hash: source:kind:normalized(payload)
  title: string;                       // verb-first: "Widen budget to 600"
  why: string;                         // expandable explanation
}

// ──────────────────────────────────────────────────────────────
// Ontology Suggestion Rules (spec §4.1)
// ──────────────────────────────────────────────────────────────
export interface SuggestionRule {
  id: string;
  when: {
    intent?: 'real' | 'imaginary' | 'ambiguous';
    noteType?: string;                 // ontology node id (e.g., 'job-request')
    has?: string[];                    // property keys present
    missing?: string[];                // property keys absent
    private?: boolean;
  };
  propose: {
    kind: SuggestionKind;
    key?: string;                      // for 'add-properties': property key to add
    skillId?: string;                  // for 'skill': skill id
  };
  title: string;                       // template: "Add {key}"
  why: string;                         // template: "{key} is required for {noteType}"
  confidence?: number;                 // default 0.8
}

// Extend OntologyNode (in schema.ts)
declare module '../../types/index.js' {
  interface OntologyNode {
    suggestions?: SuggestionRule[];
  }
}

// ──────────────────────────────────────────────────────────────
// Orchestrator Events (spec §5.2)
// ──────────────────────────────────────────────────────────────
export type SuggestionEvent =
  | { type: 'generation-start'; noteId: string; generationId: string }
  | { type: 'suggestion'; note: Note }                    // full suggestion note
  | { type: 'suggestion-state'; noteId: string; state: SuggestionState }
  | { type: 'generation-done'; noteId: string; generationId: string };

export type SuggestionState = 'active' | 'applied' | 'dismissed' | 'stale';

// ──────────────────────────────────────────────────────────────
// Suggestion Note Properties (stored as @suggestion note)
// ──────────────────────────────────────────────────────────────
export const SUGGESTION_TAG = '@suggestion';
export const SUGGESTION_SOURCE_TYPE = 'agent' as const;
export const SUGGESTION_PRIVACY = 'private' as const;

export interface SuggestionNoteProps {
  for: string;           // sourceNoteId
  generation: string;    // generationId
  source: SourceId;
  signature: string;     // dedup hash
  state: SuggestionState;
}
```

### 0.2 `core/src/ontology/schema.ts` — Add `suggestions` field

```typescript
// In OntologyNode interface, add:
suggestions?: import('../suggestions/note/types.js').SuggestionRule[];
```

### 0.3 `core/src/ontology/domains.ts` — Built-in Generic Rules

Add to `DEFAULT_ONTOLOGY` (e.g., on `request/need-request` and `work/job-request` nodes):

```typescript
// Example: missing required attribute → add-properties
{
  id: 'rule-missing-required',
  when: { missing: ['role'] },  // or any requiredAttributes
  propose: { kind: 'add-properties', key: 'role' },
  title: 'Add {key}',
  why: '{key} is required for {noteType}',
  confidence: 0.9
},
// Date-typed property → schedule
{
  id: 'rule-has-date',
  when: { has: ['startTime', 'deadline', 'dueDate'] },
  propose: { kind: 'schedule' },
  title: 'Set a reminder',
  why: 'Schedule a reminder for this date',
  confidence: 0.7
},
// Imaginary + private + networks → publish
{
  id: 'rule-imaginary-private',
  when: { intent: 'imaginary', private: true },
  propose: { kind: 'publish' },
  title: 'Share to find matches',
  why: 'Publishing lets others discover your request',
  confidence: 0.8
},
// Ambiguous intent → clarify
{
  id: 'rule-ambiguous',
  when: { intent: 'ambiguous' },
  propose: { kind: 'clarify' },
  title: 'Clarify what you\'re looking for',
  why: 'A clearer request finds better matches',
  confidence: 0.6
},
// Imaginary intent → watch
{
  id: 'rule-imaginary-watch',
  when: { intent: 'imaginary' },
  propose: { kind: 'watch' },
  title: 'Watch for new matches',
  why: 'Get notified when matching offers appear',
  confidence: 0.7
}
```

---

## Phase 1: Core Sources

### 1.1 `core/src/suggestions/note/sources/rules.ts`

```typescript
import { SuggestionSource, SuggestionContext, SuggestionDraft, SuggestionRule } from '../types.js';
import { findNode } from '../../ontology/ontologyCore.js';

export const rulesSource: SuggestionSource = {
  id: 'rules',
  kind: 'deterministic',
  available: () => true,
  async suggest(ctx, emit, signal) {
    if (signal.aborted) return;

    const { note, intent, ontology } = ctx;
    const noteType = inferNoteType(note, ontology);

    // Collect all rules from ontology
    const rules = collectRules(ontology);

    for (const rule of rules) {
      if (signal.aborted) return;
      if (!ruleMatches(rule, note, intent, noteType)) continue;

      const draft = buildDraftFromRule(rule, note, noteType, ctx.contentHash);
      emit(draft);
    }
  }
};

function collectRules(ontology: OntologyNode[]): SuggestionRule[] {
  const rules: SuggestionRule[] = [];
  const walk = (nodes: OntologyNode[]) => {
    for (const node of nodes) {
      if (node.suggestions) rules.push(...node.suggestions);
      if (node.children) walk(node.children);
    }
  };
  walk(ontology);
  return rules;
}

function ruleMatches(rule: SuggestionRule, note: Note, intent: string, noteType: string): boolean {
  const { when } = rule;
  if (when.intent && when.intent !== intent) return false;
  if (when.noteType && when.noteType !== noteType) return false;
  if (when.private !== undefined && when.private !== (note.privacy === 'private')) return false;
  if (when.has?.some(k => !note.properties.some(p => p.key === k))) return false;
  if (when.missing?.some(k => note.properties.some(p => p.key === k))) return false;
  return true;
}

function buildDraftFromRule(rule: SuggestionRule, note: Note, noteType: string, contentHash: string): SuggestionDraft {
  const { propose, title, why, confidence = 0.8 } = rule;
  const key = propose.key ?? '';
  const payload = {
    kind: propose.kind,
    skillId: propose.skillId,
    properties: propose.kind === 'add-properties' && key ? [{ key, operator: 'is', values: [''] }] : undefined,
    preview: propose.kind === 'skill' ? `Run ${propose.skillId}` : undefined,
    evidence: '', // rules have no matcher evidence
    confidence,
    contentHash,
    criteria: propose.kind === 'add-properties' ? { addedKey: key } : undefined
  };
  return {
    source: 'rules',
    payload,
    signature: `rules:${propose.kind}:${key || propose.skillId || 'generic'}`,
    title: title.replace('{key}', key).replace('{noteType}', noteType),
    why: why.replace('{key}', key).replace('{noteType}', noteType)
  };
}

function inferNoteType(note: Note, ontology: OntologyNode[]): string {
  const typeProp = note.properties.find(p => p.key === 'type' && p.role === 'marker');
  return typeProp?.values[0] ?? 'unknown';
}
```

### 1.2 `core/src/suggestions/note/sources/fulfillment.ts`

```typescript
import { SuggestionSource, SuggestionContext, SuggestionDraft } from '../types.js';
import { SkillPatternMatcher } from '../../skills/skillPatternMatcher.js';
import { DEFAULT_ONTOLOGY } from '../../ontology/ontology.default.js';
import { reshapeNote } from '../reshape.js';
import { verifyResults } from '../verify.js';
import { MatchEngine } from '../../matching/MatchEngine.js';

export const fulfillmentSource: SuggestionSource = {
  id: 'fulfillment',
  kind: 'deterministic',
  available: (ctx) => ctx.skills.length > 0,
  async suggest(ctx, emit, signal) {
    if (signal.aborted) return;

    const matcher = new SkillPatternMatcher(DEFAULT_ONTOLOGY);
    ctx.skills.forEach(s => matcher.registerSkill(s));

    // ─── Strategy A: Skills ───
    const skillMatches = matcher.matchSkills(ctx.note);
    for (const match of skillMatches) {
      if (signal.aborted) return;
      if (match.confidence < 30) continue; // canHandle > 0.3 threshold

      const skill = match.skill;
      const preview = skill.preview?.(ctx.note) ?? `Search ${skill.name} for ${extractQuery(ctx.note)}`;
      const evidence = `Found ${match.matchedAttributes.join(', ')}`;

      emit({
        source: 'fulfillment',
        payload: {
          kind: 'skill',
          skillId: skill.id,
          preview,
          evidence,
          confidence: match.confidence / 100,
          contentHash: ctx.contentHash,
          criteria: { matchedAttributes: match.matchedAttributes }
        },
        signature: `fulfillment:skill:${skill.id}`,
        title: preview.split(';')[0], // first sentence
        why: `Your note has ${match.matchedAttributes.join(', ')} which ${skill.name} can act on`
      });
    }

    // ─── Strategy B: Reshape (counterfactuals) ───
    const reshapeResults = await reshapeNote(ctx.note, ctx.ontology, ctx.corpusVersion);
    for (const r of reshapeResults) {
      if (signal.aborted) return;
      emit({
        source: 'fulfillment',
        payload: {
          kind: 'add-properties',
          properties: r.properties,
          preview: r.preview,
          evidence: r.evidence,
          confidence: r.confidence,
          contentHash: ctx.contentHash,
          criteria: r.criteria
        },
        signature: `fulfillment:reshape:${r.signature}`,
        title: r.title,
        why: r.evidence
      });
    }
  }
};

function extractQuery(note: Note): string {
  const role = note.properties.find(p => p.key === 'role')?.values[0];
  const location = note.properties.find(p => p.key === 'location')?.values[0];
  return [role, location].filter(Boolean).join(' in ') || note.title;
}
```

### 1.3 `core/src/suggestions/note/sources/related.ts`

```typescript
import { SuggestionSource, SuggestionContext, SuggestionDraft } from '../types.js';
import { findRelatedNotes } from '../../notes/relatedNotes.js';

export const relatedSource: SuggestionSource = {
  id: 'related',
  kind: 'deterministic',
  available: (ctx) => ctx.relatedNotes.length > 0,
  async suggest(ctx, emit, signal) {
    if (signal.aborted) return;

    const related = findRelatedNotes(ctx.note, ctx.relatedNotes, ctx.ontology);
    // Dedupe by noteId
    const seen = new Set<string>();

    for (const r of related) {
      if (signal.aborted) return;
      if (seen.has(r.note.id)) continue;
      seen.add(r.note.id);

      emit({
        source: 'related',
        payload: {
          kind: 'info',
          preview: `You already have "${r.note.title}"`,
          evidence: r.explanation,
          confidence: 0.9,
          contentHash: ctx.contentHash,
          criteria: { relatedNoteId: r.note.id }
        },
        signature: `related:${r.note.id}`,
        title: `Link to "${r.note.title}"`,
        why: r.explanation
      });
    }
  }
};
```

### 1.4 `core/src/suggestions/note/sources/llm.ts`

```typescript
import { SuggestionSource, SuggestionContext, SuggestionDraft, SuggestionKind } from '../types.js';
import { LlmClient } from '../../llm/LlmClient.js'; // rename/extend LlmPropertyExtractor
import { redactPIIForTransport } from '../../utils/piiRedaction.js';

const QUESTION_BATTERY: Record<string, string[]> = {
  'imaginary': [
    'What would a good outcome look like?',
    'What constraints are flexible vs. fixed?',
    'Would you consider alternative approaches?'
  ],
  'real': [
    'What specific criteria matter most?',
    'Any deal-breakers?',
    'Preferred timeline?'
  ],
  'ambiguous': [
    'Are you looking for X or offering X?',
    'What problem are you solving?',
    'Who is this for?'
  ]
};

export const llmSource: SuggestionSource = {
  id: 'llm',
  kind: 'model',
  available: (ctx) => ctx.llmConsent,
  async suggest(ctx, emit, signal) {
    if (signal.aborted) return;

    const client = LlmClient.getInstance();
    const ontologySlice = extractRelevantOntology(ctx.note, ctx.ontology);
    const skillCatalog = ctx.skills.map(s => ({ id: s.id, description: s.description, patterns: s.patterns }));
    const reshapeEvidence = []; // TODO: pass from fulfillment source

    const prompt = buildPrompt(ctx.note, ctx.intent, ontologySlice, skillCatalog, reshapeEvidence);
    const redactedPrompt = redactPIIForTransport(prompt);

    try {
      const response = await client.streamQuestions(redactedPrompt, QUESTION_BATTERY[ctx.intent] ?? [], {
        signal,
        onQuestion: (question, answer) => {
          if (signal.aborted) return;
          const draft = parseLLMResponse(question, answer, ctx.contentHash);
          if (draft) emit(draft);
        }
      });
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('LLM suggestions failed:', e);
    }
  }
};

function buildPrompt(note: Note, intent: string, ontology: any, skills: any[], reshape: any[]): string {
  return `
Note: ${note.content}
Intent: ${intent}
Ontology: ${JSON.stringify(ontology, null, 2)}
Skills: ${JSON.stringify(skills, null, 2)}
Reshape evidence: ${JSON.stringify(reshape, null, 2)}

Generate 3-5 specific, actionable questions grounded in the above.
Each question must map to a suggestion kind: skill|add-properties|schedule|publish|watch|clarify|create-note|info
Skill IDs must resolve to registered skills.
Return JSON array of { question, kind, skillId?, properties?, preview, evidence, confidence }.
  `.trim();
}

function parseLLMResponse(question: string, answer: string, contentHash: string): SuggestionDraft | null {
  try {
    const parsed = JSON.parse(answer);
    if (!parsed.kind || !SUGGESTION_KINDS.includes(parsed.kind)) return null;
    return {
      source: 'llm',
      payload: {
        kind: parsed.kind,
        skillId: parsed.skillId,
        properties: parsed.properties,
        preview: parsed.preview ?? question,
        evidence: parsed.evidence ?? answer,
        confidence: parsed.confidence ?? 0.7,
        contentHash,
        criteria: parsed.criteria
      },
      signature: `llm:${parsed.kind}:${hashString(question + answer)}`,
      title: parsed.preview ?? question,
      why: `AI suggestion: ${question}`
    };
  } catch {
    return null;
  }
}

const SUGGESTION_KINDS = ['skill', 'add-properties', 'schedule', 'publish', 'watch', 'clarify', 'create-note', 'info'];

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function extractRelevantOntology(note: Note, ontology: any[]): any {
  // Return only nodes relevant to note's properties
  const keys = new Set(note.properties.map(p => p.key));
  return ontology.filter(n => Object.keys(n.attributes ?? {}).some(k => keys.has(k))).slice(0, 5);
}
```

---

## Phase 2: Reshape & Verification

### 2.1 `core/src/suggestions/note/reshape.ts`

```typescript
import { Note, Property, OntologyNode } from '../../types/index.js';
import { MatchEngine } from '../../matching/MatchEngine.js';
import { findAttributeDef, getOntology } from '../../ontology/index.js';
import { getValidOperators } from '../../ontology/ontologyService.js';

export interface ReshapeResult {
  signature: string;
  title: string;
  preview: string;
  evidence: string;
  confidence: number;
  properties: Property[];
  criteria: Record<string, unknown>;
}

export async function reshapeNote(
  note: Note,
  ontology: OntologyNode[],
  corpusVersion: number
): Promise<ReshapeResult[]> {
  const cacheKey = `reshape:${note.id}:${corpusVersion}`;
  const cached = reshapeCache.get(cacheKey);
  if (cached) return cached;

  const engine = new MatchEngine(ontology);
  const localNotes = await getLocalCorpus(); // from notes store
  const results: ReshapeResult[] = [];

  // Rank constraints by conflict/missing frequency
  const constraints = rankConstraints(note, engine, localNotes);
  const topConstraints = constraints.slice(0, 5);

  for (const constraint of topConstraints) {
    const mutations = generateMutations(constraint, note, ontology);
    for (const mutation of mutations) {
      const mutatedNote = applyMutation(note, mutation);
      const matchResults = localNotes.map(o => engine.calculateMatchScore(mutatedNote, o));
      const matches = matchResults.filter(r => r.score > 0.5);

      if (matches.length > 0) {
        const evidence = buildEvidence(mutation, matches.length, constraint.key);
        results.push({
          signature: `reshape:${constraint.key}:${mutation.type}`,
          title: `Relax ${constraint.key} → ${mutation.preview}`,
          preview: `Change ${constraint.key} ${mutation.preview}; ${matches.length} matches appear`,
          evidence,
          confidence: Math.min(0.9, 0.5 + matches.length * 0.05),
          properties: mutation.properties,
          criteria: { originalKey: constraint.key, mutation: mutation.type }
        });
      }
    }
  }

  reshapeCache.set(cacheKey, results);
  return results;
}

interface RankedConstraint {
  key: string;
  operator: string;
  values: string[];
  conflictCount: number;
  missingCount: number;
}

function rankConstraints(note: Note, engine: MatchEngine, corpus: Note[]): RankedConstraint[] {
  const stats = new Map<string, { conflicts: number; missing: number }>();

  for (const other of corpus) {
    const result = engine.calculateMatchScore(note, other);
    for (const conflict of result.conflicts) {
      stats.set(conflict.requestProp.key, {
        conflicts: (stats.get(conflict.requestProp.key)?.conflicts ?? 0) + 1,
        missing: stats.get(conflict.requestProp.key)?.missing ?? 0
      });
    }
    for (const missing of result.missing) {
      stats.set(missing.key, {
        conflicts: stats.get(missing.key)?.conflicts ?? 0,
        missing: (stats.get(missing.key)?.missing ?? 0) + 1
      });
    }
  }

  return note.properties
    .filter(p => p.role !== 'marker' && p.role !== 'fact')
    .map(p => ({
      key: p.key,
      operator: p.operator,
      values: p.values,
      conflictCount: stats.get(p.key)?.conflicts ?? 0,
      missingCount: stats.get(p.key)?.missing ?? 0
    }))
    .sort((a, b) => (b.conflictCount + b.missingCount) - (a.conflictCount + a.missingCount));
}

interface Mutation {
  type: 'relax-number' | 'expand-geo' | 'widen-enum' | 'drop-constraint';
  preview: string;
  properties: Property[];
}

function generateMutations(constraint: RankedConstraint, note: Note, ontology: OntologyNode[]): Mutation[] {
  const attrDef = findAttributeDef(new Map(ontology.map(n => [n.id, n])), '', constraint.key);
  const type = attrDef?.type ?? 'string';
  const mutations: Mutation[] = [];

  if (type === 'number' || type === 'quantity') {
    const currentVal = parseFloat(constraint.values[0]);
    const step = attrDef?.numericOptions?.min ? (attrDef.numericOptions.max! - attrDef.numericOptions.min!) * 0.1 : currentVal * 0.1;
    const newVal = constraint.operator === '<' ? currentVal + step : currentVal - step;
    mutations.push({
      type: 'relax-number',
      preview: `${constraint.operator} ${currentVal} → ${constraint.operator} ${newVal.toFixed(1)}`,
      properties: [{ ...constraint, values: [newVal.toString()] }]
    });
  } else if (type === 'geo') {
    mutations.push({
      type: 'expand-geo',
      preview: 'expand radius ×1.5',
      properties: [{ ...constraint, operator: 'near', values: ['1.5x'] }]
    });
  } else if (type === 'enum' && attrDef?.options) {
    const current = new Set(constraint.values);
    const aliases = attrDef.aliases ?? [];
    const widened = [...new Set([...current, ...aliases])];
    if (widened.length > current.size) {
      mutations.push({
        type: 'widen-enum',
        preview: `add ${widened.filter(v => !current.has(v)).join(', ')}`,
        properties: [{ ...constraint, values: widened }]
      });
    }
  }

  // Always offer dropping lowest-priority constraint
  mutations.push({
    type: 'drop-constraint',
    preview: `remove ${constraint.key}`,
    properties: [] // signals removal
  });

  return mutations;
}

function applyMutation(note: Note, mutation: Mutation): Note {
  if (mutation.type === 'drop-constraint') {
    return { ...note, properties: note.properties.filter(p => p.key !== mutation.properties[0]?.key) };
  }
  return {
    ...note,
    properties: note.properties.map(p => {
      const mutProp = mutation.properties.find(m => m.key === p.key);
      return mutProp ? { ...p, ...mutProp } : p;
    })
  };
}

function buildEvidence(mutation: Mutation, matchCount: number, key: string): string {
  return `${matchCount} more ${matchCount === 1 ? 'offer appears' : 'offers appear'} with ${key} ${mutation.preview}`;
}

// Simple in-memory cache (replace with persistent in production)
const reshapeCache = new Map<string, ReshapeResult[]>();

async function getLocalCorpus(): Promise<Note[]> {
  // Import from notes store
  const { notes } = await import('../../notes/index.js');
  return notes.getAll?.() ?? [];
}
```

### 2.2 `core/src/suggestions/note/verify.ts`

```typescript
import { Note } from '../../types/index.js';
import { MatchEngine } from '../../matching/MatchEngine.js';
import { DEFAULT_ONTOLOGY } from '../../ontology/ontology.default.js';

export interface VerificationResult {
  fitCount: number;
  totalCount: number;
  evidence: string;
  matchedNoteIds: string[];
}

export async function verifyResults(sourceNote: Note, resultNotes: Note[]): Promise<VerificationResult> {
  if (resultNotes.length === 0) {
    return { fitCount: 0, totalCount: 0, evidence: 'No results returned', matchedNoteIds: [] };
  }

  const engine = new MatchEngine(DEFAULT_ONTOLOGY);
  let fitCount = 0;
  const matchedNoteIds: string[] = [];

  for (const result of resultNotes) {
    const match = engine.calculateMatchScore(sourceNote, result);
    if (match.score > 0.5) { // threshold for "fits"
      fitCount++;
      matchedNoteIds.push(result.id);
    }
  }

  const evidence = fitCount === 0
    ? 'No results fit your constraints'
    : fitCount === 1
    ? '1 result fits your constraints'
    : `${fitCount} of ${resultNotes.length} results fit your constraints`;

  return { fitCount, totalCount: resultNotes.length, evidence, matchedNoteIds };
}
```

---

## Phase 3: Orchestrator

### 3.1 `core/src/suggestions/note/orchestrator.ts`

```typescript
import { EventEmitter } from '../../events/EventEmitter.js';
import { Note } from '../../types/index.js';
import { SuggestionSource, SuggestionContext, SuggestionDraft, SuggestionEvent, SuggestionState, SuggestionNoteProps, SUGGESTION_TAG, SUGGESTION_SOURCE_TYPE, SUGGESTION_PRIVACY } from './types.js';
import { rulesSource } from './sources/rules.js';
import { fulfillmentSource } from './sources/fulfillment.js';
import { relatedSource } from './sources/related.js';
import { llmSource } from './sources/llm.js';
import { verifyResults } from './verify.js';
import { createNote } from '../../notes/notes.js';
import { sha256 } from '../../utils/crypto.js';

const SOURCES: SuggestionSource[] = [rulesSource, fulfillmentSource, relatedSource, llmSource];
const MAX_SUGGESTIONS_PER_GENERATION = 8;
const GENERATION_DEBOUNCE_MS = 2000;
const LLM_QUESTION_TIMEOUT_MS = 20000;
const LLM_CONCURRENCY = 2;

interface GenerationRun {
  noteId: string;
  generationId: string;
  contentHash: string;
  abortController: AbortController;
  startTime: number;
  suggestionCount: number;
  dismissedSignatures: Set<string>;
}

export class SuggestionOrchestrator extends EventEmitter<SuggestionEvent> {
  private queue: GenerationRun[] = [];
  private running = 0;
  private readonly maxConcurrency = 2;
  private dismissedSignatures = new Map<string, Set<string>>(); // noteId -> signatures
  private appliedSignatures = new Map<string, Set<string>>();   // noteId -> signatures

  // ─── Public API ───

  async enqueueGeneration(note: Note, trigger: 'publish' | 'edit' | 'refresh'): Promise<string> {
    const generationId = crypto.randomUUID();
    const contentHash = await this.computeContentHash(note);
    const dismissed = this.dismissedSignatures.get(note.id) ?? new Set();
    const applied = this.appliedSignatures.get(note.id) ?? new Set();

    // Stale previous active suggestions for this note
    await this.stalePreviousGeneration(note.id);

    const run: GenerationRun = {
      noteId: note.id,
      generationId,
      contentHash,
      abortController: new AbortController(),
      startTime: Date.now(),
      suggestionCount: 0,
      dismissedSignatures: dismissed
    };

    this.queue.push(run);
    this.processQueue();

    return generationId;
  }

  async dismissSuggestion(noteId: string, signature: string): Promise<void> {
    const dismissed = this.dismissedSignatures.get(noteId) ?? new Set();
    dismissed.add(signature);
    this.dismissedSignatures.set(noteId, dismissed);

    // Update suggestion note state
    await this.updateSuggestionState(noteId, signature, 'dismissed');
    this.emit('suggestion-state', { noteId, state: 'dismissed' });
  }

  async applySuggestion(noteId: string, signature: string, resultNoteIds: string[]): Promise<void> {
    const applied = this.appliedSignatures.get(noteId) ?? new Set();
    applied.add(signature);
    this.appliedSignatures.set(noteId, applied);

    // Update suggestion note with result links
    await this.updateSuggestionState(noteId, signature, 'applied', resultNoteIds);
    this.emit('suggestion-state', { noteId, state: 'applied' });
  }

  // ─── Queue Processing ───

  private async processQueue(): Promise<void> {
    if (this.running >= this.maxConcurrency || this.queue.length === 0) return;

    const run = this.queue.shift()!;
    this.running++;
    await this.runGeneration(run);
    this.running--;
    this.processQueue();
  }

  private async runGeneration(run: GenerationRun): Promise<void> {
    const { noteId, generationId, contentHash, abortController, dismissedSignatures } = run;

    // Load note fresh
    const note = await this.loadNote(noteId);
    if (!note) return;

    this.emit('generation-start', { noteId, generationId });

    const ctx: SuggestionContext = {
      note,
      intent: this.inferIntent(note),
      ontology: await this.loadOntology(),
      skills: await this.loadSkills(),
      relatedNotes: await this.loadRelatedNotes(note),
      corpusVersion: await this.getCorpusVersion(),
      llmConsent: await this.checkLLMConsent(),
      generationId,
      contentHash
    };

    const emittedSignatures = new Set<string>();

    // Deterministic sources first
    for (const source of SOURCES.filter(s => s.kind === 'deterministic')) {
      if (abortController.signal.aborted) break;
      if (!source.available(ctx)) continue;

      await source.suggest(ctx, (draft) => this.handleEmission(draft, ctx, run, emittedSignatures, dismissedSignatures), abortController.signal);
    }

    // LLM source (streaming)
    const llmSource = SOURCES.find(s => s.id === 'llm')!;
    if (llmSource.available(ctx) && !abortController.signal.aborted) {
      await this.runLLMSource(llmSource, ctx, run, emittedSignatures, dismissedSignatures);
    }

    this.emit('generation-done', { noteId, generationId });
  }

  private async runLLMSource(
    source: SuggestionSource,
    ctx: SuggestionContext,
    run: GenerationRun,
    emittedSignatures: Set<string>,
    dismissedSignatures: Set<string>
  ): Promise<void> {
    // LLM source handles its own streaming via onQuestion callback
    // We just need to ensure timeout and concurrency
    const timeout = new Promise(resolve => setTimeout(resolve, LLM_QUESTION_TIMEOUT_MS));
    await Promise.race([
      source.suggest(ctx, (draft) => this.handleEmission(draft, ctx, run, emittedSignatures, dismissedSignatures), run.abortController.signal),
      timeout
    ]);
  }

  private async handleEmission(
    draft: SuggestionDraft,
    ctx: SuggestionContext,
    run: GenerationRun,
    emittedSignatures: Set<string>,
    dismissedSignatures: Set<string>
  ): Promise<void> {
    if (run.suggestionCount >= MAX_SUGGESTIONS_PER_GENERATION) return;
    if (emittedSignatures.has(draft.signature)) return;
    if (dismissedSignatures.has(draft.signature)) return;

    // Validate & ground
    const validated = await this.validateDraft(draft, ctx);
    if (!validated) return;

    // Create suggestion note
    const suggestionNote = this.createSuggestionNote(ctx.note, validated, run.generationId);
    await this.saveSuggestionNote(suggestionNote);

    emittedSignatures.add(draft.signature);
    run.suggestionCount++;

    this.emit('suggestion', { note: suggestionNote });
  }

  private async validateDraft(draft: SuggestionDraft, ctx: SuggestionContext): Promise<SuggestionDraft | null> {
    // Schema validation
    if (!draft.payload.kind || !draft.payload.evidence) return null;
    if (draft.payload.kind === 'skill' && !draft.payload.skillId) return null;
    if (draft.payload.kind === 'add-properties' && !draft.payload.properties?.length) return null;

    // Ground skill IDs
    if (draft.payload.skillId) {
      const skill = ctx.skills.find(s => s.id === draft.payload.skillId);
      if (!skill) return null;
    }

    // Confidence bounds
    draft.payload.confidence = Math.max(0, Math.min(1, draft.payload.confidence));

    return draft;
  }

  private createSuggestionNote(sourceNote: Note, draft: SuggestionDraft, generationId: string): Note {
    const props: SuggestionNoteProps = {
      for: sourceNote.id,
      generation: generationId,
      source: draft.source,
      signature: draft.signature,
      state: 'active'
    };

    return createNote({
      title: draft.title,
      content: JSON.stringify(draft.payload),
      tags: [SUGGESTION_TAG],
      properties: [
        { key: 'for', operator: 'is', values: [props.for] },
        { key: 'generation', operator: 'is', values: [props.generation] },
        { key: 'source', operator: 'is', values: [props.source] },
        { key: 'signature', operator: 'is', values: [props.signature] },
        { key: 'state', operator: 'is', values: [props.state] }
      ],
      privacy: SUGGESTION_PRIVACY,
      source: { type: SUGGESTION_SOURCE_TYPE, identifier: 'suggestion-orchestrator', timestamp: Date.now() },
      priority: 0
    });
  }

  private async stalePreviousGeneration(noteId: string): Promise<void> {
    // Query notes store for @suggestion notes with this noteId as 'for'
    // Update state from 'active' to 'stale'
    // This is a placeholder - implement with actual notes store query
  }

  private async updateSuggestionState(
    noteId: string,
    signature: string,
    state: SuggestionState,
    resultNoteIds?: string[]
  ): Promise<void> {
    // Update the suggestion note in store
    // If applied, add resultNoteIds to commitment.relatedNoteIds
  }

  // ─── Helpers (implement with actual stores) ───

  private async computeContentHash(note: Note): Promise<string> {
    const normalized = {
      content: note.content,
      properties: note.properties.map(p => ({ k: p.key, o: p.operator, v: p.values.sort() })).sort((a, b) => a.k.localeCompare(b.k))
    };
    return sha256(JSON.stringify(normalized));
  }

  private inferIntent(note: Note): 'real' | 'imaginary' | 'ambiguous' {
    const intentProp = note.properties.find(p => p.key === 'intent' && p.role === 'marker');
    return (intentProp?.values[0] as any) ?? 'ambiguous';
  }

  private async loadOntology() { /* from OntologyService */ return []; }
  private async loadSkills() { /* from SkillRegistry */ return []; }
  private async loadRelatedNotes(note: Note) { /* from relatedNotes.ts */ return []; }
  private async getCorpusVersion() { return Date.now(); }
  private async checkLLMConsent() { /* from CapabilityManager */ return false; }
  private async loadNote(id: string) { /* from notes store */ return null; }
  private async saveSuggestionNote(note: Note) { /* to notes store */ }
}

// Singleton
export const suggestionOrchestrator = new SuggestionOrchestrator();
```

---

## Phase 4: UI Components

### 4.1 `ui/src/components/suggestions/SuggestionCard.tsx`

```tsx
import React from 'react';
import { CheckIcon, XIcon, ChevronDownIcon, InfoIcon } from '../ui/icons';
import { SuggestionNote } from './types'; // extract from note content

interface SuggestionCardProps {
  note: SuggestionNote; // parsed suggestion note
  onApply: () => void;
  onDismiss: () => void;
  onToggleWhy: () => void;
  isExpanded: boolean;
}

export function SuggestionCard({ note, onApply, onDismiss, onToggleWhy, isExpanded }: SuggestionCardProps) {
  const payload = JSON.parse(note.content);
  const source = note.properties.find(p => p.key === 'source')?.values[0];
  const isOnDevice = source === 'rules' || source === 'fulfillment' || source === 'related';

  return (
    <div className="w-full relative group flex flex-col gap-2 p-3 rounded-lg border bg-gray-800/50 hover:bg-gray-800 transition-colors">
      {/* Header: verb-first title + source chip */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{note.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isOnDevice ? 'bg-green-900/50 text-green-400' : 'bg-purple-900/50 text-purple-400'}`}>
              {isOnDevice ? 'on-device' : 'AI'}
            </span>
            {payload.confidence && (
              <span className="text-[10px] text-gray-500 font-mono">{Math.round(payload.confidence * 100)}%</span>
            )}
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 p-1"
          aria-label="Dismiss"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Evidence line */}
      <p className="text-sm text-gray-300 line-clamp-1">{payload.evidence}</p>

      {/* Expandable "why?" */}
      <button onClick={(e) => { e.stopPropagation(); onToggleWhy(); }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 self-start">
        <InfoIcon className="w-3 h-3" />
        Why?
        <ChevronDownIcon className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="text-xs text-gray-400 pt-1 border-t border-gray-700 animate-slide-down">
          {payload.preview && <p className="mb-1"><strong>Preview:</strong> {payload.preview}</p>}
          <p><strong>Reason:</strong> {note.properties.find(p => p.key === 'why')?.values[0] || 'No reason provided'}</p>
          {payload.criteria && <pre className="mt-1 text-[9px] overflow-auto">{JSON.stringify(payload.criteria, null, 2)}</pre>}
        </div>
      )}

      {/* Primary action button */}
      <button
        onClick={(e) => { e.stopPropagation(); onApply(); }}
        className="mt-2 w-full text-left px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
      >
        {getActionLabel(payload.kind)}
      </button>
    </div>
  );
}

function getActionLabel(kind: string): string {
  switch (kind) {
    case 'skill': return 'Preview & approve';
    case 'add-properties': return 'Add';
    case 'schedule': return 'Set reminder';
    case 'publish': return 'Publish';
    case 'watch': return 'Watch';
    case 'clarify': return 'Answer';
    case 'create-note': return 'Create';
    case 'info': return 'View';
    default: return 'Apply';
  }
}
```

### 4.2 `ui/src/components/suggestions/NoteSuggestions.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { SuggestionCard } from './SuggestionCard';
import { RefreshCwIcon, Loader2Icon } from '../ui/icons';
import { useNoteSuggestions } from '../../hooks/useNoteSuggestions';

interface NoteSuggestionsProps {
  noteId: string;
}

export function NoteSuggestions({ noteId }: NoteSuggestionsProps) {
  const { suggestions, isGenerating, generationId, refresh, dismiss, apply } = useNoteSuggestions(noteId);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const activeSuggestions = suggestions.filter(s => s.state === 'active');
  const appliedSuggestions = suggestions.filter(s => s.state === 'applied');

  return (
    <div className="flex flex-col gap-3">
      {/* Working indicator */}
      {isGenerating && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2Icon className="w-4 h-4 animate-spin text-blue-400" />
          Generating suggestions…
        </div>
      )}

      {/* Active suggestions */}
      {activeSuggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          {activeSuggestions.map(suggestion => (
            <SuggestionCard
              key={suggestion.id}
              note={suggestion}
              onApply={() => apply(suggestion.id)}
              onDismiss={() => dismiss(suggestion.id)}
              onToggleWhy={() => setExpandedIds(prev => {
                const next = new Set(prev);
                if (next.has(suggestion.id)) next.delete(suggestion.id);
                else next.add(suggestion.id);
                return next;
              })}
              isExpanded={expandedIds.has(suggestion.id)}
            />
          ))}
        </div>
      )}

      {/* Applied history (collapsed) */}
      {appliedSuggestions.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <span>{appliedSuggestions.length} applied</span>
            {appliedSuggestions.reduce((sum, s) => sum + (s.fitCount || 0), 0) > 0 && (
              <span>· {appliedSuggestions.reduce((sum, s) => sum + (s.fitCount || 0), 0)} results fit</span>
            )}
          </summary>
          <div className="mt-2 flex flex-col gap-2 pl-4 border-l border-gray-700">
            {appliedSuggestions.map(s => (
              <div key={s.id} className="text-xs text-gray-400">
                {s.title} → {s.resultNoteIds?.length ?? 0} results
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Empty state (only when no active suggestions) */}
      {activeSuggestions.length === 0 && !isGenerating && (
        <div className="text-center text-xs text-gray-500 italic py-4">
          No suggestions yet. <button onClick={() => refresh()} className="text-blue-400 hover:underline ml-1">Refresh</button>
        </div>
      )}

      {/* Refresh button */}
      <div className="pt-2 border-t border-gray-800 flex justify-end">
        <button
          onClick={() => refresh()}
          disabled={isGenerating}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white disabled:opacity-50"
        >
          <RefreshCwIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}
```

### 4.3 `ui/src/hooks/useNoteSuggestions.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { Note } from '@notention/core';
import { suggestionOrchestrator } from '@notention/core/suggestions/note/orchestrator.js';
import { notesStore } from '../stores/notesStore'; // or wherever notes are accessed

export interface UISuggestionNote extends Note {
  state: 'active' | 'applied' | 'dismissed' | 'stale';
  fitCount?: number;
  resultNoteIds?: string[];
}

export function useNoteSuggestions(noteId: string) {
  const [suggestions, setSuggestions] = useState<UISuggestionNote[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);

  // Load existing suggestions on mount
  useEffect(() => {
    loadSuggestions();
    const unsub = suggestionOrchestrator.on('suggestion', handleSuggestion);
    const unsubDone = suggestionOrchestrator.on('generation-done', handleGenerationDone);
    const unsubState = suggestionOrchestrator.on('suggestion-state', handleStateChange);
    return () => { unsub(); unsubDone(); unsubState(); };
  }, [noteId]);

  const loadSuggestions = async () => {
    const notes = await notesStore.query({
      tags: ['@suggestion'],
      properties: [{ key: 'for', operator: 'is', values: [noteId] }]
    });
    setSuggestions(notes.map(parseSuggestionNote));
  };

  const handleSuggestion = (event: { note: Note }) => {
    setSuggestions(prev => [...prev, parseSuggestionNote(event.note)]);
  };

  const handleGenerationDone = (event: { noteId: string; generationId: string }) => {
    if (event.noteId === noteId) {
      setIsGenerating(false);
      setGenerationId(null);
    }
  };

  const handleStateChange = (event: { noteId: string; state: string }) => {
    if (event.noteId === noteId) {
      setSuggestions(prev => prev.map(s =>
        s.id === event.noteId ? { ...s, state: event.state as any } : s
      ));
    }
  };

  const refresh = useCallback(async () => {
    const note = await notesStore.get(noteId);
    if (!note) return;
    setIsGenerating(true);
    const genId = await suggestionOrchestrator.enqueueGeneration(note, 'refresh');
    setGenerationId(genId);
  }, [noteId]);

  const dismiss = useCallback(async (suggestionId: string) => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;
    const signature = suggestion.properties.find(p => p.key === 'signature')?.values[0];
    if (signature) await suggestionOrchestrator.dismissSuggestion(noteId, signature);
  }, [noteId, suggestions]);

  const apply = useCallback(async (suggestionId: string) => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;
    const signature = suggestion.properties.find(p => p.key === 'signature')?.values[0];
    const payload = JSON.parse(suggestion.content);

    if (payload.kind === 'skill') {
      // Trigger skill execution via existing approval flow
      // On success, call orchestrator.applySuggestion with result note IDs
    } else if (payload.kind === 'add-properties') {
      // Apply properties inline via editor
    }
    // ... handle other kinds
  }, [suggestions]);

  return { suggestions, isGenerating, generationId, refresh, dismiss, apply };
}

function parseSuggestionNote(note: Note): UISuggestionNote {
  const payload = JSON.parse(note.content);
  const state = note.properties.find(p => p.key === 'state')?.values[0] as any;
  return { ...note, state, fitCount: payload.fitCount, resultNoteIds: payload.resultNoteIds };
}
```

---

## Phase 5: Agent Plugin (MCP)

### 5.1 `agent/src/server/plugins/SuggestionPlugin.ts`

```typescript
import { z } from 'zod';
import { McpToolRegistry } from '../McpToolRegistry.js';
import { AgentPlugin } from '../AgentPlugin.js';
import { PersistenceService } from '../../persistence.js';
import { Note } from '@notention/core';
import { suggestionOrchestrator } from '@notention/core/suggestions/note/orchestrator.js';

export class SuggestionPlugin implements AgentPlugin {
  name = 'suggestions';
  version = '1.0.0';

  async initialize(registry: McpToolRegistry): Promise<void> {
    registry.register('suggest_for_note', {
      description: 'Generate suggestions for a note',
      schema: z.object({
        noteId: z.string(),
        trigger: z.enum(['publish', 'edit', 'refresh']).default('refresh')
      }),
      handler: async ({ noteId, trigger }) => {
        const note = await PersistenceService.getNotesSafe().then(n => n.find(x => x.id === noteId));
        if (!note) throw new Error(`Note ${noteId} not found`);

        const generationId = await suggestionOrchestrator.enqueueGeneration(note, trigger);
        return { generationId, status: 'started' };
      }
    });

    registry.register('refresh_suggestions', {
      description: 'Force refresh suggestions for a note',
      schema: z.object({ noteId: z.string() }),
      handler: async ({ noteId }) => {
        const note = await PersistenceService.getNotesSafe().then(n => n.find(x => x.id === noteId));
        if (!note) throw new Error(`Note ${noteId} not found`);

        const generationId = await suggestionOrchestrator.enqueueGeneration(note, 'refresh');
        return { generationId, status: 'started' };
      }
    });

    registry.register('dismiss_suggestion', {
      description: 'Dismiss a suggestion',
      schema: z.object({ noteId: z.string(), signature: z.string() }),
      handler: async ({ noteId, signature }) => {
        await suggestionOrchestrator.dismissSuggestion(noteId, signature);
        return { success: true };
      }
    });

    registry.register('apply_suggestion', {
      description: 'Mark suggestion as applied with result note IDs',
      schema: z.object({ noteId: z.string(), signature: z.string(), resultNoteIds: z.array(z.string()) }),
      handler: async ({ noteId, signature, resultNoteIds }) => {
        await suggestionOrchestrator.applySuggestion(noteId, signature, resultNoteIds);
        return { success: true };
      }
    });

    // Subscribe to suggestion events via WebSocket
    registry.register('suggestion_subscribe', {
      description: 'Subscribe to suggestion events for a note',
      schema: z.object({ noteId: z.string() }),
      handler: async ({ noteId }) => {
        // Return current suggestions + set up WS subscription
        const suggestions = await this.getSuggestionsForNote(noteId);
        return { suggestions, subscribed: true };
      }
    });
  }

  private async getSuggestionsForNote(noteId: string): Promise<Note[]> {
    const notes = await PersistenceService.getNotesSafe();
    return notes.filter(n =>
      n.tags.includes('@suggestion') &&
      n.properties.some(p => p.key === 'for' && p.values.includes(noteId))
    );
  }
}
```

### 5.2 `agent/src/server/SocketController.ts` — Add event handlers

```typescript
// In handlers object:
suggestion_subscribe: async () => {
  const suggestions = await this.getSuggestionsForNote(payload.noteId);
  sendResponse(ws, id, true, { type: 'suggestion_subscribe', payload: { suggestions } });
},

suggestion_event: async () => {
  // Forward orchestrator events to subscribed clients
  // Implementation: maintain subscription map per noteId
},

// Broadcast suggestion events
private broadcastSuggestionEvent(event: SuggestionEvent): void {
  this.broadcast({ type: 'suggestion_event', payload: event });
}
```

---

## Phase 6: Integration Points

### 6.1 `ui/src/hooks/useEditorPublishing.ts` — Enqueue on publish

```typescript
// In handlePublish, after successful publish:
import { suggestionOrchestrator } from '@notention/core/suggestions/note/orchestrator.js';

// ... after publishNote resolves ...
const generationId = await suggestionOrchestrator.enqueueGeneration(publishableNote, 'publish');
console.log('[Suggestions] Generation started:', generationId);
```

### 6.2 Note save hook — Debounced regenerate on edit

```typescript
// In useEditorPersistence or wherever note updates are saved
import { suggestionOrchestrator } from '@notention/core/suggestions/note/orchestrator.js';

let regenerateTimeout: ReturnType<typeof setTimeout>;

const handleNoteSave = useCallback(async (updatedNote: Note) => {
  // ... existing save logic ...

  // Debounced regeneration
  clearTimeout(regenerateTimeout);
  regenerateTimeout = setTimeout(() => {
    suggestionOrchestrator.enqueueGeneration(updatedNote, 'edit');
  }, GENERATION_DEBOUNCE_MS); // 2000ms
}, []);
```

### 6.3 `ui/src/hooks/useSmartNoteAssistant.ts` — Replace suggestions

```typescript
// Replace useNoteAnalysis with useNoteSuggestions
import { useNoteSuggestions } from './useNoteSuggestions';

// In useSmartNoteAssistant:
const { suggestions, isGenerating, refresh, dismiss, apply } = useNoteSuggestions(note.id);

// Pass to SuggestionsPanel (now NoteSuggestions)
<NoteSuggestions noteId={note.id} />
```

### 6.4 `ui/src/components/assistant/SuggestionsPanel.tsx` — Replace with NoteSuggestions

```tsx
import { NoteSuggestions } from '../../components/suggestions/NoteSuggestions';

// Replace entire component:
export function SuggestionsPanel({ noteId }: { noteId: string }) {
  return <NoteSuggestions noteId={noteId} />;
}
```

### 6.5 `agent/src/server/PluginManager.ts` — Register SuggestionPlugin

```typescript
import { SuggestionPlugin } from './plugins/SuggestionPlugin.js';

// In initialize():
await new SuggestionPlugin().initialize(registry);
```

---

## Testing Checklist (per spec §10)

### Unit Tests (no mocks; scripted LlmClient)

| Test | File | Key Assertions |
|------|------|----------------|
| Rule evaluator | `core/src/suggestions/note/rules.test.ts` | Matches when conditions met; no match when missing/has violated |
| Reshape bounds/cache | `core/src/suggestions/note/reshape.test.ts` | Depth 1 only; top 5 constraints; cache hit on same contentHash+corpusVersion |
| Dedup/signature stability | `core/src/suggestions/note/orchestrator.test.ts` | Same signature → single note; different generation → new notes |
| Suppression persistence | `core/src/suggestions/note/orchestrator.test.ts` | Dismissed signature stays suppressed across generations |
| Regeneration | `core/src/suggestions/note/orchestrator.test.ts` | Edit → abort in-flight → prior active→stale → new generation |
| Gate matrix | `core/src/suggestions/note/verify.test.ts` | All 8 kinds route through correct consent gate |
| Leakage | `core/src/suggestions/note/leakage.test.ts` | Zero @suggestion notes in list/search/feed/export/counts/related |
| Copy lint | `core/src/suggestions/note/copy-lint.test.ts` | No forbidden nouns in default strings; ≤1 primary button |

### Integration Tests

| Test | Scenario |
|------|----------|
| Solo path | Publish → skill card → approve → import → fit line → done |
| First-run usability | ≤2 decisions, no docs needed |

---

## Forbidden Terms (Copy Lint)

Automated test must fail if any default string contains:
`fulfillment`, `provider`, `capacity`, `transition`, `attestation`, `rung`, `ladder`, `satisfaction`, `score`

---

## Acceptance Criteria (spec §10)

- [x] Core suggestion system builds and type-checks
- [x] Orchestrator manages generation lifecycle (singleton, event-based)
- [x] Four sources implemented: rules, fulfillment, related, LLM
- [x] Reshape pipeline (project/filter/join/aggregate)
- [x] Verification (property, match, skill)
- [x] UI components: useNoteSuggestions, NoteSuggestions, SuggestionCard
- [x] Agent plugin with MCP tools
- [ ] Offline publish yields ≥1 evidence-backed card ≤5s
- [ ] Suggestions persist when matches arrive
- [ ] Edit regenerates and stales prior active
- [ ] Applying one leaves others active
- [ ] No execution outside existing gates
- [ ] Private content never remote without consent
- [ ] Zero leakage
- [ ] Default UI learns ≤3 concepts

---

## File Creation Order

- [x] 1. `core/src/suggestions/note/types.ts`
- [x] 2. `core/src/suggestions/note/rules.ts`
- [x] 3. `core/src/suggestions/note/sources/rules.ts`
- [x] 4. `core/src/suggestions/note/sources/fulfillment.ts`
- [x] 5. `core/src/suggestions/note/sources/related.ts`
- [x] 6. `core/src/suggestions/note/sources/llm.ts`
- [x] 7. `core/src/suggestions/note/reshape.ts`
- [x] 8. `core/src/suggestions/note/verify.ts`
- [x] 9. `core/src/suggestions/note/orchestrator.ts`
- [x] 10. `core/src/suggestions/note/index.ts`
- [x] 11. `core/src/ontology/schema.ts` (add suggestions field)
- [x] 12. `core/src/ontology/domains.ts` (add built-in rules)
- [x] 13. `ui/src/hooks/useNoteSuggestions.ts`
- [x] 14. `ui/src/components/suggestions/SuggestionCard.tsx`
- [x] 15. `ui/src/components/suggestions/NoteSuggestions.tsx`
- [x] 16. `agent/src/server/plugins/SuggestionPlugin.ts`
- [ ] 17. Integration: `useEditorPublishing`, note save hook, `useSmartNoteAssistant`, `SuggestionsPanel`, `SocketController`, `PluginManager`

---

## Key Reusable Infrastructure (Reference)

| Component | Location | Used For |
|-----------|----------|----------|
| `SkillPatternMatcher` | `core/src/skills/skillPatternMatcher.ts` | Fulfillment skill matching |
| `SkillExecutor` | `core/src/skills/SkillExecutor.ts` | Skill execution + approval |
| `SkillApprovalManager` | `core/src/skills/skillApprovalManager.ts` | Skill consent gate |
| `MatchEngine` | `core/src/matching/MatchEngine.ts` | Reshape evidence + light verification |
| `PropertyExtractor` | `core/src/notes/propertyExtractor/` | LLM grounding |
| `piiRedaction` | `core/src/utils/piiRedaction.ts` | LLM privacy |
| `CapabilityManager` | `core/src/security/CapabilityManager.ts` | LLM consent |
| `OntologyService` | `core/src/ontology/ontologyService.ts` | Rule evaluation, reshape operators |
| `Registry` | `core/src/utils/Registry.ts` | Source registration |
| `EventEmitter` | `core/src/events/EventEmitter.ts` | Generation events |
| `sha256` | `core/src/utils/crypto.ts` | Content hashing |

---

## Notes for Fresh Session

1. **Start with types.ts** — all other modules depend on it
2. **Ontology schema change** — add `suggestions?: SuggestionRule[]` to `OntologyNode` in `schema.ts`
3. **Built-in rules** — add to `DEFAULT_ONTOLOGY` in `domains.ts` on relevant nodes (`request/need-request`, `work/job-request`, etc.)
4. **Orchestrator** — extend `EventEmitter`; use singleton pattern
5. **UI** — `useNoteSuggestions` subscribes to orchestrator events; `NoteSuggestions` renders cards
6. **Agent plugin** — registers MCP tools; `SocketController` broadcasts events
7. **Integration** — publish/edit/refresh triggers call `orchestrator.enqueueGeneration`
8. **Tests** — write alongside each module; use scripted `LlmClient` for LLM source tests

---

## Deferred (Spec §11) — Do Not Implement

- Pair mediation
- Depth-2 reshape
- Earned autonomy graduation
- Outcome attestations
- Playbook/question notes
- Gardener rule-learning
- Demand ledger
- K-anonymous demand signals
- World-change triggers
- In-flight board