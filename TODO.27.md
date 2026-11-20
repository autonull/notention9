# Note Suggestions — Revised Development Specification

**Scope:** `core`, `agent`, `ui` · **Conventions:** `AGENTS.md` ·

## 1. The model (contract)

1. User writes a note, publishes.
2. Publish optionally goes to networks; matching begins (unchanged).
3. **In parallel, suggestion sources run.** One source is the fulfillment system (skills + reshape + execution + light verification). Suggestions are **kept** regardless of match state — zero matches, some matches, or many. Each suggestion is an independent possibility; applying one does not dismiss the others; arriving matches do not invalidate suggestions.
4. User edits the note → **regenerate** (debounced). Prior unexplored suggestions become stale; applied history remains.

That is the whole feature. No ladder UI, no fallback mode, no ops dashboard.

## 2. The one object: a Suggestion note

Everything is a note — but there is exactly **one** new species.

```
tags: [@suggestion]
properties:
  [for:is:<sourceNoteId>]
  [generation:is:<generationId>]
  [source:is:rules|fulfillment|related|llm]
  [signature:is:<dedupHash>]
  [state:is:active|applied|dismissed|stale]
content: JSON payload (same convention as @skill:definition notes)
commitment.relatedNoteIds: [sourceNoteId, ...resultNoteIds]
privacy: private · source.type: 'agent' · publish-blocked · filtered from user surfaces
```

Payload:

```json
{
  "kind": "skill | add-properties | schedule | publish | watch | clarify | create-note | info",
  "skillId": "indeed-v1",
  "properties": [{"key":"budget","operator":"<","values":["600"]}],
  "preview": "Search Indeed for plumbers in Leeds; import 5–10 listings.",
  "evidence": "3 more offers appear at budget<600",
  "confidence": 0.9,
  "contentHash": "sha256(normalized note)",
  "criteria": null
}
```

**States:** `active → applied | dismissed | stale`.
- **applied** — user ran it; keeps result links and fit evidence.
- **dismissed** — one tap; its signature is suppressed for this note (no nagging).
- **stale** — content changed or TTL expired; archived, not shown.

**Regeneration semantics:** edit → new `generationId` + `contentHash`; abort in-flight run; prior `active` → `stale`; `applied` kept as history; dedup by signature within a generation; dismissed signatures stay suppressed. Matches arriving change nothing here.

No capacity notes, no proposal/outcome/question/playbook species, no separate index. Suggestions are queried from the notes store by `[for] + [generation] + [state]`.

## 3. Sources (the seam)

```ts
export interface SuggestionSource {
  id: 'rules' | 'fulfillment' | 'related' | 'llm';
  kind: 'deterministic' | 'model';
  available(ctx: SuggestionContext): boolean;
  suggest(ctx: SuggestionContext,
          emit: (draft: SuggestionDraft) => void,
          signal: AbortSignal): Promise<void>;
}
```

Four sources, registered via the existing `Registry`:

| Source | What it does |
|---|---|
| **rules** | Evaluates declarative `SuggestionRule`s stored in the ontology (§4). Slot gaps, reminders, publish hints, watch offers, clarify. Instant, offline. |
| **fulfillment** | The system we designed, as one source. Two strategies: **(a) skills** — `SkillPatternMatcher` / `canHandle > 0.3` → skill-action suggestions with `skill.preview`; **(b) reshape** — ontology-typed counterfactuals (§4.2) → add-properties suggestions with real matcher evidence. Execution and light verification (§5.3) live here. |
| **related** | `relatedNotes` → "you already have X", link/merge, or a self-serve pointer. Instant, local. |
| **llm** | Question battery (3–5 by intent/note type), grounded in ontology + skill catalog + reshape evidence; streams per question; schema-validated; skill ids must resolve. Optional. |

**Ordering:** deterministic sources emit instantly; LLM appends as it arrives. Active cards sort by confidence (deterministic first on ties). Applied history collapses below. No cost model, no rungs.

The "counterparty of last resort" framing survives only as the *concept* behind the fulfillment source: the system offers its own capacity (skills) and ways to become matchable (reshape). **No synthetic matches, no scores shown for actions, no special zero-match mode.**

## 4. Ontology as the declarative substrate (your question: yes)

This is where flexibility and expansion come from, with *less* code.

### 4.1 Suggestion rules live in the ontology

Ontology node metadata gains one optional field:

```ts
interface SuggestionRule {
  id: string;
  when: {
    intent?: 'real' | 'imaginary' | 'ambiguous';
    noteType?: string;
    has?: string[];        // property keys present
    missing?: string[];    // property keys absent
    private?: boolean;
  };
  propose: { kind: SuggestionKind; key?: string; skillId?: string };
  title: string;           // template, e.g. "Add {key}"
  why: string;             // template, e.g. "{key} is required for {noteType}"
  confidence?: number;
}
// ontology node: { ...existing, suggestions?: SuggestionRule[] }
```

One pure evaluator (~100 lines) runs rules against `(note, intent, ontology)` → drafts. Built-in generic rules ship in `DEFAULT_ONTOLOGY`:

- missing required attribute for the note type → `add-properties` "Add {key}"
- date-typed property present → `schedule` "Set a reminder"
- imaginary + private + networks enabled → `publish` "Share to find matches"
- ambiguous intent → `clarify` "What are you looking for?"
- imaginary intent → `watch` "Watch for new matches"

**Expansion is data, not code:** a new domain (housing, childcare, gigs) adds rules to its ontology nodes and immediately gets suggestions. The ontology is already editable and Gardener-grown; rules ride that same substrate. Later, accepted suggestions can propose new rules back into the ontology — but that learning loop is future work, not core.

### 4.2 Reshape mutations are ontology-typed

Counterfactual suggestions need no per-domain logic because mutation operators come from ontology value types:

- **number** → relax by ontology step (or 10%)
- **geo** → expand radius ×1.5
- **enum** → widen via ontology aliases
- **any constraint** → drop lowest-priority

Core bounds: **depth 1 only, top 5 constraints** ranked by conflict/missing frequency; run the real `matchNotes` over local + discovered notes; emit only mutations that produce matches, with the engine's own explanation as evidence. Cache by `(contentHash, corpusVersion)`. (Depth-2 beams and pair mediation are future.)

### 4.3 Skills already bind through the ontology

`SkillPatternMatcher` does fuzzy key matching via ontology aliases (`role = job = position`). No new binding mechanism is needed; the fulfillment source reuses it. New skills register patterns against ontology keys and are suggested automatically.

### 4.4 LLM questions are selected by ontology

Question templates live in the existing prompt registry, keyed by intent + ontology note type/domain. Adding a domain can add its questions as data. The model receives the ontology slice, skill catalog, and reshape rows as ground truth; it judges and phrases rather than invents.

**Net effect:** the ontology is the single declarative substrate for rules, mutations, skill binding, and question selection. Flexibility and expansion without new engines.

## 5. Lifecycle

### 5.1 Triggers (core = three)

- **publish** → generate (fire-and-forget; never blocks/fails publish)
- **edit** → regenerate after ~2 s debounce on save
- **manual refresh** → force a new generation

No idle-save, world-change, or sweep triggers in core.

### 5.2 Generation

Global queue (concurrency 1–2, by `note.priority`). Per run: `AbortController`; deterministic sources first; LLM streams per question (concurrency 2, ~20 s/question, ~90 s/run, ≤8 suggestions/note/generation, daily token budget). Each emission: validate → ground → dedup by signature → persist as a suggestion note → broadcast event. Whole artifacts only; a single subtle working indicator while running.

Events (browser store-observer or agent WS, existing envelope):

```ts
type SuggestionEvent =
  | { type:'generation-start'; noteId; generationId }
  | { type:'suggestion'; note: Note }
  | { type:'suggestion-state'; noteId; state }
  | { type:'generation-done'; noteId; generationId };
```

### 5.3 Execution (all existing gates)

| Kind | Path | Consent |
|---|---|---|
| `skill` | `SkillExecutor` → `executeAction` | existing `SkillApprovalDialog` (extended with preview/evidence; **no new sheet**) |
| `add-properties` | editor apply / ghost chip | inline, undoable |
| `schedule` | ReminderSkill | skill approval |
| `publish` | `usePublish` | existing privacy gate |
| `watch` | creates monitoring/scheduled note via existing metaphors | one authorization |
| `clarify` | inline answer → extraction → property review | existing flow |
| `create-note` | notes API, linked | inline confirm |
| `info` | none | — |

Nothing auto-executes on arrival. Existing `SkillApprovalManager.autoExecute` remains exactly as-is; we add no graduation system.

### 5.4 Light verification (cheap, keeps the moat)

When a skill imports results, run `matchNotes(sourceNote, result)` and append fit evidence to the applied suggestion: *"3 of 5 results fit your constraints."* Results link via `commitment.relatedNoteIds`. The user marks the note done through the existing lifecycle. **No outcome species, no signatures, no autonomy ledger.** Satisfaction scores stay internal; the UI shows concrete counts and the existing constraint checklist.

## 6. Privacy (small matrix, existing machinery)

| Case | Rule |
|---|---|
| Private note, no consent | deterministic + local-model only |
| Private + consent (`LmConsentModal` or `[llm:analyze:is:allowed]`) | remote allowed with PII redaction |
| Any remote prompt | redaction applied; `relatedNotes` content never included |
| Suggestion notes | private, publish-blocked, absolutely filtered from user surfaces |

Reuse `NetworkGate` / `CapabilityManager` / `InferenceRouter` / `piiRedaction`. One small helper may share consent checks; no new gate subsystem.

## 7. UI (minimal, additive)

- The existing assistant **Suggestions** section is always present when suggestions exist — independent of match count. **Matches** section unchanged.
- **Card:** verb-first title · one evidence line · plain source chip ("on-device" / "AI") · one primary button · "why?" expandable · one-tap ✕. No scores, no rungs, no cost dots, no protocol nouns.
- **Working indicator** while generating; cards stream in as whole artifacts.
- **Zero-match empty state:** gentle line ("No matches yet — here are some next steps") with suggestions already visible beside it. No takeover, no coachmark.
- **Applied history** collapsed: "2 applied · 3 results fit." Expanding shows linked result notes.
- **Refresh** button; one settings toggle "Suggest next steps" + existing AI consent. No dashboard, no queues, no rail, no autonomy ledger in core.
- Keyboard (`j/k`, enter, `x`), batched live region, reduced-motion, offline (deterministic sources still work; absent models simply aren't listed).

**Copy lint (automated):** no internal nouns (`fulfillment`, `provider`, `capacity`, `transition`, `attestation`, `rung`, `ladder`, `satisfaction`, `score`) in default strings; no engine scores on cards; ≤1 primary button per card.

## 8. Module map & integration

```
core/src/suggestions/note/
  types.ts            SuggestionDraft, payload, events, SuggestionSource, SuggestionRule
  rules.ts            ontology rule evaluator
  sources/
    rules.ts  fulfillment.ts  related.ts  llm.ts
  reshape.ts          ontology-typed depth-1 counterfactuals
  orchestrator.ts     generations, dedup, suppression, budgets, cancellation
  verify.ts           light re-match on import
ui/src/hooks/useNoteSuggestions.ts
ui/src/components/suggestions/NoteSuggestions.tsx  SuggestionCard.tsx
agent/src/server/plugins/SuggestionPlugin.ts   (MCP: suggest_for_note, refresh_suggestions)
```

Integration: `useEditorPublishing` (enqueue on publish success) · note save hook (debounced regenerate) · `useSmartNoteAssistant` (merge into existing `Suggestion[]`, replace the action-apply stub) · `SuggestionsPanel` (cards) · `LocalMatchesPanel`/`NetworkMatchesPanel` (empty-state line) · `AgentService`/`SocketController` (`suggestion.subscribe` / `suggestion.event`) · ontology types (optional `suggestions` field) · prompt registry (battery).

**Unchanged:** `MatchEngine`, `SkillExecutor`, `executeAction` gates, `SkillApprovalManager` semantics, dev-loop `core/src/suggestions/SuggestionStore`.

## 10. Delivery, tests, acceptance

**P1 (offline core):** suggestion notes + filters; `rules`, `fulfillment.skills`, `related` sources; publish/edit/refresh triggers; generations/dedup/suppression; UI cards + inline adds; skill approval reuse; leakage + copy-lint tests.
**P2:** depth-1 reshape + LLM source + streaming + agent plugin/WS + watch + light verification.
**P3 (future, optional):** §11.

Tests (no mocks; scripted `LlmClient` for the port): rule evaluator · reshape bounds/cache · dedup/signature stability · suppression · regeneration (edit → abort + stale + new generation) · gate matrix · leakage (zero species in list/search/feed/export/counts/related) · copy lint · solo path (publish → skill card → approve → import → fit line → done) · first-run usability (≤2 decisions, no docs).

**Acceptance:** offline publish yields ≥1 evidence-backed card ≤5 s · suggestions persist when matches arrive · edit regenerates and stales prior active · applying one leaves others active · no execution outside existing gates · private content never remote without consent · zero leakage · default UI learns ≤3 concepts.

## 11. Explicitly deferred (not core)

Pair mediation · depth-2 reshape · earned autonomy graduation · outcome attestations · playbook/question notes · Gardener rule-learning · demand ledger · k-anonymous demand signals · world-change triggers · In-flight board.

---

## Worked examples

```
publish "Need a plumber, Leeds, budget<500"
  → networks: matching begins (maybe 0, maybe 3 matches)
  → suggestions (parallel, kept regardless):
      rules:        "Add a preferred time"            [Add]
      fulfillment:  "Widen budget to 600 — 3 more offers appear"  [Add]
      fulfillment:  "Search Indeed — imports 5–10 listings"       [Preview & approve]
      fulfillment:  "Watch for new matches"                       [Watch]
      llm (streams): "Split into 'quote first' + 'book the job'"  [Create]
user approves Search Indeed → existing approval dialog → skill runs
  → 5 offer notes imported, linked; fit line: "3 of 5 fit your constraints"
  → other suggestions remain active; matches arriving change nothing
user edits note (adds preferred time) → regenerate; old active cards stale;
  applied history stays; dismissed signatures stay suppressed
```

```
publish "Selling a GPU"
  → networks: matching begins
  → suggestions (parallel, kept regardless):
      llm (streams): "Donate to consignment/repurposing"  [Popup map select, when complete: adds a 'destination'-like location property to the Note (signifying it's been decided)]
      llm (streams): "Find specs"  [Web search]
```

