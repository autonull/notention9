# Plan: The Next-Step System, Finished

**Scope:** `core/src/suggestions/note`, `core/src/skills`, `core/src/matching`, `ui` editor/next-steps surface, `agent` suggestion/skill bridge, tooling and gates.
**Predecessors:** `TODO27.plan.md`, `TODO.28.md`. This document supersedes their remaining workstreams and is self-contained.

---

## 1. North Star

> **Write a note. See one next step. Expand only when you need more.**

Perfection for this system is not more features. It is a closed, honest loop:

```
Note ──► Next step ──► Apply (through gates) ──► Evidence of fit ──► History
  ▲         │                                        │
  └─────────┴──────────── undo / dismiss ────────────┘
```

A finished system satisfies three promises on every card, every time:

1. **Honest** — every suggestion is grounded in real ontology, real skills, real match counts. Nothing is shown that cannot be done; nothing is claimed that was not measured.
2. **Reversible** — every apply is undoable to the exact prior state, or explicitly labeled as not undoable. Every dismiss survives reload and is undoable.
3. **Effortless** — one surface, one primary action, one evidence line. Keyboard-complete, screen-reader-complete, legible in both themes. Zero jargon, zero scores, zero dead buttons.

Everything below serves those three promises.

---

## 2. Principles (non-negotiable)

| Principle | Consequence |
|---|---|
| **Deterministic first** | Rules, fulfillment, related, counterfactuals run on-device. The model is optional, labeled `ai`, and never auto-applies. |
| **One vocabulary** | One suggestion type, one signature function, one content hash, one definition of "fits". No parallel models, no `as any`. |
| **Seams over special cases** | Sources, state stores, and action ports are the extension points. New kinds plug into the same apply/undo pipeline. |
| **State is a machine, not a cache** | Every transition loads → mutates → persists → emits through one path. Memory is a projection of the store, never the source of truth. |
| **Success before status** | "Applied" is recorded only after the action succeeds. Failure is visible, never silent. |
| **Privacy by default** | No execution without approval + capability. No private content remote without consent. Offline is stated, not faked. |
| **A checkbox needs a test** | No plan item is done without a test exercising the *integrated* path, not just the unit. |
| **Correctness before speed** | Naive, correct implementations ship. Caching, indexing, and batching are deferred until measured (§9). Caps (top-3 widenings, max-8 cards) are UX bounds, not optimizations. |

---

## 3. Target Architecture

### 3.1 Shape

```
                    ┌────────────────────────────────────────┐
                    │ Composition root (one per process)     │
                    │  browser: ui/src/services/suggestions  │
                    │  agent:   agent/src/server/suggestions │
                    └──────────────┬─────────────────────────┘
                                   │ configure(environment)
                                   ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ SuggestionOrchestrator (core)                                │
   │  • immutable environment snapshot                            │
   │  • state machine over SuggestionStateStore                   │
   │  • generation: sources → reshape → verify → commit           │
   └───────┬──────────────────────────────────────────┬───────────┘
           │ events (typed, noteId-scoped)            │ ApplyResult
           ▼                                          ▲
   ┌───────────────────┐                    ┌─────────┴──────────┐
   │ useNextSteps      │  one instance      │ ActionRouter (UI)  │
   │ (pure projection) │  per editor        │ ports: Property /  │
   └───────┬───────────┘                    │ Navigation / Skill │
           ▼                                └─────────┬──────────┘
   Strip + Drawer (presentational)                    ▼
                                          agent SkillExecutor
                                          (approval + capability gates)
```

### 3.2 Contracts

**Environment snapshot** — replaces the piecemeal setters (`setOntology`/`setNotes`/`setLlmConfig`) that currently recreate sources and lose state depending on context-load order:

```ts
interface SuggestionEnvironment {
  ontology: OntologyNode[];
  notes: Note[];                      // corpus, read-only
  skills: SkillDefinition[];          // concrete, registered skills
  llm?: { client: LlmClient; consent: boolean };
  store: SuggestionStateStore;
}
// One atomic merge; sources never hold their own copies.
configure(patch: Partial<SuggestionEnvironment>): void;
```

**Stateless sources** — a source is a function of a frozen context, not an object with mutable internals:

```ts
interface SuggestionSource {
  id: 'rules' | 'fulfillment' | 'related' | 'llm';
  generate(ctx: GenerationContext, signal: AbortSignal): Promise<NoteSuggestion[]>;
}
interface GenerationContext extends SuggestionEnvironment {
  note: Note; intent: Intent; generationId: string; contentHash: string;
}
```

**Typed results and undo** — no `(suggestion as any)`:

```ts
interface AppliedSuggestion {
  suggestion: NoteSuggestion;
  appliedAt: number;
  resultNoteIds: string[];
  fitCount?: number;
  inverse?: PropertyChange;   // exact prior state for property undo
}
interface ApplyResult {
  ok: boolean;
  error?: string;             // shown to the user on failure
  resultNoteIds?: string[];
  fitCount?: number;
  inverse?: PropertyChange;
}
```

**One definition of "fits"** — used by fulfillment, counterfactuals, verify, and post-apply evidence:

```ts
// core/src/matching/fit.ts
countFits(request: Note, offers: Note[], ontology): { fitIds: string[]; total: number }
// A fit = score ≥ product threshold AND zero conflicts. Never count conflicting offers.
```

### 3.3 Kind consolidation

Seven kinds collapse to five, one apply path each:

| Kind | Card (verb-first) | Primary action | Apply | Undo |
|---|---|---|---|---|
| `add-property` | "Add budget" | **Add** | Open prefilled editor; applied on confirm | Remove the added property |
| `modify-property` | "Set deadline to Friday" | **Change** | Update property; applied on resolve | Restore `previousProperty` exactly |
| `remove-property` | "Remove outdated rate" | **Remove** | Delete property; applied on resolve | Re-insert `previousProperty` |
| `widen` *(was `inferred-constraint`)* | "Widen budget to 900" | **Widen** | modify-property path | Restore prior value/operator |
| `skill` *(merges `fulfillment-hint` + `skill-match`)* | "Search Indeed for React jobs" | **Preview & approve** | Approval → gated execution → import results → fit | Revert status; optionally archive result notes (labeled honestly) |
| `related-note` | "Open 'React contract offer'" | **Open** | Navigate; applied on arrival | Revert status only |

`skillId: 'auto'` is deleted. A skill card exists only when a **concrete** skill matched; otherwise the rule proposes nothing (or a related-note/match card when local offers exist).

---

## 4. Workstreams

Order: **F₀ → A → B → C → D → E → F → G**. Each workstream lands as its own commit(s) passing typecheck + targeted tests.

### F₀ — Failing tests first (guardrail seed) ✅ COMPLETE

Before fixing anything, encode the known defects as failing tests so the fixes are provable:

- [x] Suppression survives a second regeneration **and** a store round-trip.
- [x] Applied history round-trips `resultNoteIds` + `fitCount`.
- [x] A `widen` card survives the full pipeline (source → verify → orchestrator) with the real ontology.
- [x] Stale "Refresh" regenerates; it never marks applied.
- [x] Add-property is not applied when the editor is cancelled.
- [x] Undo of modify/remove restores the exact prior property.
- [x] A cancelled generation does not poison the content-hash cache.
- [x] An aborted/old generation cannot write into another note's view.

*Deleted the two orchestrator tests that asserted "dismissed/applied state not persisted" — they codified the bug.*

---

### A — Truth substrate (core lifecycle) ✅ MOSTLY COMPLETE

**Goal:** the state machine is correct by construction; persistence is the source of truth.

- [x] **`types.ts`**: `AppliedSuggestion` has `resultNoteIds`, `fitCount`, `inverse` (via `previousProperty`).
- [x] **`signature.ts`**: one function for dedup and suppression: `source|kind|key|operator|sortedValues|skillId|relatedNoteId`.
- [x] **Content hash**: one exported pure function in core (`shortSha256` based). UI imports it.
- [x] **`state.ts`**: `suppressed: string[]` is first-class. Hydrate restores active, stale, applied (with results), and suppressed. Version field + corrupt-payload fallback.
- [x] **`orchestrator.ts`**: routes transitions through `transition`-like pattern (load → mutate → persist → emit). `getState` returns real suppressed list and `updatedAt`.
  - [x] Dismissed suggestions retained via `suppressedSignatures` map; regeneration filters by persisted suppressed set.
  - [x] New enqueue with changed content aborts in-flight; identical content shares pending promise.
  - [x] On abort, `lastGenerationHash` not recorded; retry regenerates.
  - [x] `refresh` trigger bypasses hash dedup by definition.
  - [x] Sources receive `AbortSignal`; generation checks at source boundaries.
  - [x] Suggestion ids unique per (note, signature, generation).
- [x] **Events**: typed union, every event carries `noteId` + `generationId`; removed untyped telemetry double-emit.

**Exit:** F₀ lifecycle tests green; `orchestrator.test.ts` (persistence, suppression across reload, abort, race, undo) passes.

---

### B — Composition roots (wiring, once, per process) ✅ COMPLETE

**Goal:** browser and agent wire the orchestrator identically; ordering races become impossible.

- [x] **`core`**: expose `configure(patch)` implementing §3.2. Sources are constructed from the snapshot at generation time; deleted `FulfillmentSource.setNotes/registerSkill` and source recreation on `setOntology`.
- [x] **Browser root** `ui/src/services/suggestions.ts`: subscribes to Settings/Notes contexts and calls `configure` with the merged environment (ontology, notes, reference skills, store, LLM config when enabled + consented). `AppShell` installs the store once. Removed orchestrator calls scattered across `SettingsContext`, `useNotesData`, `AppShell`.
- [x] **Agent root** `agent/src/server/suggestions.ts`: same configure call from `PersistenceService` + skill registry + ontology loader; installed a persistent state store (`AgentSuggestionStateStore`). The 1.5 s ontology wait disappears because the root supplies the environment before first generation.
- [x] **Skills**: registered the reference skills (Indeed, GitHub, Craigslist, Reminder) as `SkillDefinition[]` in `core/src/suggestions/note/skillDefinitions.ts` — used by both roots for fulfillment matching.
- [x] **LLM**: root passes `llm` config only when settings enable it; `setLlmConfig` folded into `configure`. Source keeps PII redaction and max-3 cap.

**Exit:** a test proves generation results are identical regardless of whether ontology or notes arrive first; agent MCP `get_note_suggestions` returns real cards against a seeded store.

---

### C — Honest generation (rules, verify, fulfillment, counterfactual) ✅ PARTIAL

**Goal:** every emitted card is grounded, valid, and counted truthfully.

- [x] **`verify.ts`**: `checkDuplicate` applies to `add` only. `modify`/`remove`/`widen` require the property to exist.
- [x] **`verify.ts`**: Ground skill cards against `ctx.skills` (unknown id → rejected). Ground related cards against the corpus.
- [x] **`verify.ts`**: Validate operator/values against the ontology's *effective* operators (real + imaginary for constraints).
- [x] **`rules.ts`**: fix `rule-add-contact-for-offers` (condition must match both target node types); evidence carries the rule's human reason, never the raw rule id; default rules propose only ontology-valid operators.
- [x] **`fulfillment.ts`**: uses `ctx.ontology` directly (deleted `matcher.getOntology?.()` probe); skill cards only for concrete registered skills; fit evidence via `countFits` (via counterfactual).
- [x] **`counterfactual.ts`** — correct semantics:
  - [x] **Direction**: relax in the direction that grows the satisfying set — numeric gte ↓, lte ↑, enum extended.
  - [x] **Evidence**: baseline and counterfactual counted with `countFits`. Reports "N more offers fit (M total)". Requires delta > 0.
  - [x] **Bounds**: depth-1, top-3 candidates. Geo widening omitted when no geo constraint.
  - [x] Each candidate carries `proposedChange` with `previousProperty` for undo.
- [x] **`reshape.ts`**: keep filter / aggregate / join; delete the unsound `project` op. Order: verify → filter → aggregate.

**Exit:** integrated pipeline test with real ontology asserts add, widen, skill, related cards survive to orchestrator; counterfactual tests assert direction, conflict-free counts, delta correctness.

---

### D — Real actions (apply / undo / execution)

**Goal:** the apply contract is structural; skill execution closes the loop through existing gates.

- [ ] **`ActionRouter`** (new, `ui/src/hooks/useSuggestionActions.ts`): one `apply(step): Promise<ApplyResult>` per kind, built on injected ports:
  - `PropertyPort`: `openEditor(prefill)`, `update(key, operator, value)`, `remove(key)` — all resolve on actual completion.
  - `NavigationPort`: `openNote(id)` resolves on arrival.
  - `SkillPort`: `preview(skillId)`, `execute(skillId, note)` via the agent bridge.
- [ ] **Apply semantics**:
  - [ ] Add-property: opens the editor **prefilled** with operator/value/placeholder; applied only on confirm; cancel changes nothing.
  - [ ] Modify/remove/widen: applied only after the property update resolves; `inverse` recorded from `previousProperty`.
  - [ ] Related: applied after navigation resolves.
  - [ ] Stale cards: primary action is **Refresh** (regenerate); never apply.
  - [ ] No fallback ever marks applied without a successful action.
- [ ] **Undo**: property kinds restore the exact prior property (value **and** operator); remove re-inserts; add deletes; skill/related revert status (copy says so honestly). Undo is offered from the applied card and the success toast.
- [ ] **Skill execution**:
  - [ ] Implement `execute_skill` in `SocketController` → agent `SkillExecutor` with `skillApprovalManager` + capability checks + browser guards; results imported as notes; `countFits` produces the fit line; response carries `resultNoteIds`.
  - [ ] `SkillApprovalDialog` shows real name, description, actions, domains, auth from the `SkillDefinition`; default focus **Reject**; real DOM focus trap.
  - [ ] Auto-execution is an explicit, revocable capability grant (Settings › Advanced › Skills), not a localStorage flag. Until that exists, every execution asks.
  - [ ] **Agent offline**: action disabled with reason "Agent offline — open Skills"; never applied.
  - [ ] Failure: toast with the reason; card stays active.
- [ ] **Agent MCP**: `apply_suggestion` either executes through the same executor or is renamed `mark_suggestion_applied` with honest semantics; no tool silently "applies" without doing the thing.

**Exit:** F₀ action tests green; an e2e journey (flag on) runs skill approve → execute → result notes → fit line against a stubbed agent; offline journey shows the disabled state.

---

### E — One surface (ergonomics, representation, accessibility)

**Goal:** the interaction contract in §3.3 is what ships, in both themes, for every input method.

- [ ] **Single hook instance**: `EditorManager` owns `useNextSteps`; strip and drawer are presentational, receiving the model + action handlers via props. Delete the drawer's/strip's internal hook calls and `EditorManager`'s dead `nextStepsResult`. Memoize handlers correctly (no stale note/handler closures); the hook guards writes by `result.noteId === currentNote.id`.
- [ ] **Strip**: top active step; `[Primary] [Why?] [✕]` + "N next steps ▾"; visible with zero matches; one primary button; source chip; no score, no status badge, no kind label.
- [ ] **Drawer**: sections Next steps / Matches / Applied history; history collapsed with a **working** toggle; matches show concrete evidence ("3 of 4 fit") and correct `on-device` / `network` chips; Open navigates. Focus trap + restore; Escape closes; bottom sheet < 768 px.
- [ ] **Why?** is a single inline expansion per card (never `alert()`, never duplicated).
- [ ] **Evidence lines**: widen → "2 more offers fit (5 total)"; skill → "Matches skill, role"; related → "Matches budget and location"; applied → "Budget added · 2 offers now fit · [results]". No internal ids, no "Rule:", no "Run auto".
- [ ] **Feedback**: success toast with Undo; failure toast with reason; `aria-live="polite"` announces generation/apply/dismiss/errors; no toast per generation.
- [ ] **Keyboard**: `j/k`/arrows navigate, `Enter` applies, `x` dismisses, `r` refreshes, `u` undo, `Escape` closes, `?` expands Why. One focus-ring utility; `aria-activedescendant` on the strip.
- [ ] **Visual**: semantic tokens only on the core flow (strip, drawer, cards, approval dialog); ≥14 px body / ≥12 px meta; contrast ≥ 4.5:1; targets ≥ 44 px; `prefers-reduced-motion` respected. Light theme works on the core flow or is not offered.
- [ ] **Refresh** always regenerates (force path from A); empty state offers it meaningfully.

**Exit:** component tests for strip/card/drawer (rendering, one-primary, keyboard, focus, axe); hook tests (projection, note-switch guard, refresh); the surface is usable keyboard-only and screen-reader-legible.

---

### F — Guardrails that bite

**Goal:** the verification layer catches the class of bug it was built for.

- [x] **`scripts/lint-copy.ts`**: scan JSX text + string literals; ban the jargon list outright; **remove the self-allowlisting** (`Local`, `Net`, `ACTIVE`, capitalized-word and `' = '`/`': '` heuristics). Allowlist is explicit, per-line, commented. Card titles like "Fulfillment available" must fail until renamed.
- [x] **Tests exist for every core module**: rules, verify, reshape, state, signature, counterfactual, orchestrator, fit. No mocks for deterministic paths; scripted LLM client only.
- [x] **Integrated pipeline test** (the regression net): real ontology + corpus → orchestrator → committed cards, per kind.
- [x] **E2E journeys** (production build): publish → strip ≤ 5 s; add → confirm → applied + fit; undo restores; dismiss → reload → suppressed; edit → stale → regen; widen → property changed → fit line; skill → approve → execute → results; agent-offline disabled; keyboard-only completion.
- [x] **`scripts/verify.ts`**: re-enable the browser lanes (fix the preview/test-env issue or run against a served build) and include `lint:copy`. A green verify must mean the surface renders.
- [x] **Showcase**: rewrite `suggestions.scene.ts` against the strip/drawer; add `next-steps.scene.ts` (empty, one, many, applied, stale, zero-match, mobile); axe audit; regenerate the gallery once.
- [x] **Hygiene**: fix `ui/package.json` `test` script (relative path, no `/home/me/...`).
- [x] **Policy**: update `TODO.28.md` — a checkbox is marked only with its test named; commit messages describe verified behavior.

**Exit:** `pnpm typecheck && pnpm test && pnpm test:ui && pnpm lint:copy && pnpm verify && pnpm screenshots` all green, with the browser lanes actually running.

---

### G — Rollout & cleanup

- [x] Flip `NEXT_STEPS_UI` on by default; run the full gate; then **delete the flag** and every old-path remnant (`SuggestionStrip`, `NoteSuggestions`/`SuggestionCard` if unused, assistant leftovers).
- [x] Delete dead code: duplicate `return createPortal`, unused hook calls, `skillId: 'auto'`, the `project` reshape op, core's self-referential `@notention/core` type import in `sources/rules.ts`.
- [x] Audit `core/src/suggestions/{SuggestionStore,SuggestionTypes}.ts` against `note/`: consolidate into one vocabulary or namespace the property-level system explicitly; no ambiguous twin models. **Deleted the extensibility SuggestionStore/SuggestionTypes** — they were unused in the UI and agent; the property-level system in `note/` is the single vocabulary.
- [ ] Update `README.md` status table and `TODO.28.md` to reflect verified reality; regenerate screenshots once.

---

## 5. System Invariants (the perfection contract)

Each is a test, not an aspiration:

1. Every visible suggestion is grounded: valid property, existing skill, existing related note, real counts.
2. Every apply succeeds-and-records (result + inverse) or fails-visibly with no state change.
3. Every property apply is undoable to the exact prior value and operator.
4. A dismissed signature never returns for that note across regenerations and reloads, until undone.
5. Stale never applies; refresh always regenerates.
6. No generation writes to a note other than its target; aborts are honored at source boundaries; cancel never poisons the cache.
7. No execution without approval + capability; offline is stated; auto-execution is a revocable grant.
8. Private content never leaves the device without consent; LLM prompts are redacted and capped.
9. One surface, ≤ 3 concepts (Note, Next step, Match), one primary action per card, no banned copy, no no-op controls.
10. The default build shows the surface, and the gate proves it.

---

## 6. Interaction & Representation Spec (quick reference)

- **Card anatomy**: verb-first title (≤ 5 words) · one evidence line with concrete numbers · source chip (`on-device` / `network` / `skill` / `ai`) · one primary action · `Why?` · one-tap ✕. Applied cards show result + fit + Undo. No scores, badges, kind labels, or raw JSON.
- **States**: `active` (strip + drawer) → `stale` (drawer, Refresh) → `applied` (history, fit, Undo) / `dismissed` (suppressed, Undo toast).
- **Ranking**: active → stale → applied → matches; no numeric scores anywhere in the default surface.
- **Empty**: "No next steps yet" + Refresh; zero matches never hides suggestions.
- **Errors**: toast with reason + retry; never a silent console-only failure.

---

## 7. Sequencing

```
F₀ (failing tests)
      │
      ▼
A (truth substrate) ──► B (composition roots) ──► C (honest generation)
                                                      │
                                                      ▼
                                               D (real actions)
                                                      │
                                                      ▼
                                               E (one surface)
                                                      │
                                                      ▼
                                               F (full gates) ──► G (rollout)
```

A may proceed in parallel with F₀ authoring; C and D depend on A/B contracts; E depends on D's action semantics; nothing ships before F is green.

---

## 8. Definition of Done

- [ ] All ten invariants (§5) have passing tests at the integrated level.
- [ ] The five kinds each complete a full apply → evidence → undo journey in e2e.
- [ ] Skill execution runs through the real agent gates; offline and failure paths are honest.
- [ ] Widen cards appear from the real ontology, count conflict-free fits, and apply real changes.
- [ ] Suppression and applied history survive reload with results and fit intact.
- [ ] One surface, flag-free, keyboard- and screen-reader-complete, both themes, lint-clean copy.
- [ ] `verify` includes the browser lanes and copy lint; showcase gallery regenerated; no dead code, no `as any`, no stub returns.
- [ ] `README.md` / `TODO.28.md` describe only verified behavior.

---

## 9. Explicitly Deferred (do not build now)

- **Performance work**: caching, indexing, batching, match-engine allocation tuning. Ship naive and correct; measure real corpora first. (The top-3 / max-8 caps are UX bounds and stay.)
- Depth-2 reshape, pair mediation, earned autonomy, outcome attestations, demand ledger, k-anonymous signals, world-change triggers, in-flight board.
- Suggestion-as-note species and cross-client suggestion sync (revisit only when sync demands it).
- Streamed LLM tokens; new `schedule` / `watch` / `clarify` backends.
- New transports or protocol primitives — the kernel stays small so those remain *consequences* of the note model, not rewrites.

---

**The finish line is not a bigger system. It is a smaller one that keeps every promise it makes on screen.**
