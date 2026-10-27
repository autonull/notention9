# TODO.4.1 — Foundational Slice: Optimization Loop, Observation Bridge, Bounded Control

Derived from `TODO.4.md`. This is the *buildable* first slice: a shallow, broad vertical that makes every one of the seven planes present, wired, and mechanically verifiable — without pretending to solve UX problems yet.

**The slice proves exactly one thing:**

> A user can ask for an optimization run in natural language; the system runs a declarative journey against the real UI; the app reports its own semantic state, prompt traces, and action traces; the result is a replayable evidence bundle that deterministically yields structured findings — and nothing outside a disposable browser context was mutated.

Everything in `TODO.4.md` §20 (hallucinated findings, brittle tests, silent prompt regressions, unsafe text commands, overstepping agents) is mitigated *at the seam* by this slice, not by policy prose.

---

## 1. Verified Baseline

Ground truth from the repository (not assumptions):

| Capability | Where it actually lives | Slice uses it as |
| :--- | :--- | :--- |
| Journey E2E harness | `ui/test/playwright.config.ts` — single worker, `serviceWorkers: 'block'`, UI on `:4199`, relay on `:7000`, `VITE_ENABLE_AGENT=false VITE_LLM_SOURCE=none` | **Reused verbatim**; add an `optimize` project, do not build a second browser harness |
| Deterministic seeding | `ui/test/support/seed.ts` — writes `localforage` / `keyvaluepairs` directly | Promoted to `optimize` package, re-exported by UI tests |
| App-ready signal | `[data-ready]` on `AppShell` root, `ui/src/components/AppShell.tsx:186`; `settle()` in `ui/test/support/settle.ts` | Sole readiness gate; no `waitForTimeout` |
| Network isolation | `ui/test/fixtures/routes.ts` — aborts non-local origins, stubs OSM tiles, closes non-local WS | Default for every journey |
| Storage keys | `ui/src/config/storageKeys.ts` (`notention-notes`, `notention-settings-v2`, …) | **Move to `core/src/constants/storageKeys.ts`**, re-export from UI (cross-package DRY) |
| Deterministic UIs already declared | `ExtractionReview` carries `data-testid="extraction-review"` + visible confidence %; `usePropertyReview` computes `0.85 / 0.6` | Evidence + the first real prompt-UI policy target |
| MCP tool plane | `agent/src/server/McpServer.ts` (SSE at `MCP_PATHS.SSE = '/mcp/sse'`, POST `/mcp/message?sessionId=`), `McpToolRegistry` with zod schemas, plugins `core / intelligence / batch` | Policy hook point for guardrails; contract-tested, not on the critical path |
| Capability gate | `agent/src/core/Capabilities.ts` — `browser/files` default **false** | Precedent for the policy layer |
| CLI command seam | `cli/src/commands/command.ts` (`createCommand`, `CommandRegistry`), `cli/src/commands/index.ts` | Add commands by composition; no REPL surgery |
| Prompt-as-string | `agent/src/intelligence/LlmPropertyExtractor.ts` — inline template literal, unversioned, no output validation | Extracted into the prompt registry |
| Core purity | `core` has no React/DOM imports; `NotePipeline` in `core/src/notes/notes.ts` is the mutation funnel | Trace emission must be **injected**, never `window.*` from core |
| Simulator | `simulator/src/scenario.ts` — `ScenarioRunner`, `onEvent`, `EventConfig` | Event sink that can feed the same evidence schema |

Not present today (grep-verified: zero matches for `__NOTENTION`, `report.?only`, `audit`, `optimize`): no debug bridge, no guardrail mode, no evidence schema, no audit log, no prompt registry.

---

## 2. Architectural Decisions

Each decision removes a plausible-but-wrong version of the slice.

**AD-1 — Add `@notention/optimize` workspace; do not scatter code into `ui/test` or `core`.**
`core` must stay DOM-free; `ui/test` must stay a test harness. `@notention/optimize` owns schemas, journey registry, policy, reporter, CLI entry. Dependencies: `@notention/core`, `playwright`, `zod`, `tsx`. Registered in `pnpm-workspace.yaml` and root `package.json#workspaces`.

**AD-2 — Reuse the Playwright runner instead of writing a browser driver.**
Journeys run as `ui/test/optimize/*.journey.ts` under a new `optimize` project in the existing config. We inherit webServer lifecycle, relay, service-worker blocking, network isolation, retries, and trace-on-failure for free. The `optimize` package supplies fixtures + reporter; it does not own a server.

**AD-3 — Observation is an injected sink, not a global.**
`core` gains `TraceSink` / `setTraceSink()` (default no-op). The UI installs a browser sink that writes to `window.__NOTENTION__`; the agent installs a JSONL sink. Same events, two transports, zero coupling and zero production overhead.

**AD-4 — Accessibility snapshots use `locator.ariaSnapshot()`.**
`page.accessibility` is **absent** from the installed `playwright-core` types (resolved 1.58.1; root declares `^1.60.0`) — verified, not assumed. Use `locator.ariaSnapshot()` (YAML) and `expect(locator).toMatchAriaSnapshot()` for contract assertions. Any plan referencing `page.accessibility.snapshot()` is stale.

**AD-5 — Findings are derived deterministically in this slice.**
`deriveFindings(bundle)` is a pure rule table over failed assertions, console errors, and policy violations. No LLM in the loop yet. This keeps the slice deterministic and makes "evidence over opinion" structural rather than aspirational. Agents *consume* findings later (`TODO.4.md` §4.2).

**AD-6 — Report-only governs the world outside the browser context, not the browser.**
The journey must click and type; that is its job. Report-only means: no MCP write tools, no publish/relay transmit, no filesystem or repo writes, no external origins. The browser context is disposable by construction (fresh Playwright context per journey) — so no `--test-workspace` flag is needed; that requirement from v1 was invented complexity.

**AD-7 — Correlate everything with one `runId`.**
The fixture generates `runId`, injects it via `page.addInitScript` before navigation, and the bridge tags every state/trace event with it. Without this, browser traces cannot be attributed to a run — the single most common failure mode of "evidence" systems.

**AD-8 — Unify extraction in `core` before instrumenting it.**
Three divergent extractors exist today: `core/src/notes/propertyExtractor/*` (`extractIntents|RegexProps|Location|Date|Fuzzy`), `ui/src/services/ai/LocalProvider.alignToOntology` (~200 lines of price/date/role/ontology regexes — the richest implementation), and `agent/src/intelligence/LlmPropertyExtractor` (inline prompt, no schema validation). Instrumenting three paths would triple the trace work and let them drift. Move the `LocalAIProvider` heuristics to `core/src/extraction/deterministic.ts` as `alignToOntology(text, ontology, options?)`; `PropertyExtractor` delegates to it; `LocalAIProvider` becomes a thin adapter. Traces are then emitted at **one** point, reachable headlessly (no React), and the golden set evaluates the same function the UI runs.

**AD-9 — The bridge handshake is explicit, and ordered.**
`runId` is written by `addInitScript` before hydration; `DevBridge` reads it in a mount effect and publishes `window.__NOTENTION_READY__ = true` only after the sink is installed. `settle()` waits for both `[data-ready]` and `__NOTENTION_READY__`. Otherwise the first `assertState` races React's effect flush and fails intermittently — the most likely CI flake in this slice.

---

## 3. Plane Coverage (Shallow × Broad)

| Plane | This slice | Deliberately not yet |
| :--- | :--- | :--- |
| **Control** | CLI `/optimize`, `/findings`, `/reproduce`; `parseOptimizeIntent` (structured + narrow NL); JSONL audit log | Speech, Director decomposition, in-app chat |
| **Agent** | Deterministic `deriveFindings`; report-only guardrail | Audit/Implementation/Verification agents |
| **Tool** | Playwright actions via journey steps; MCP client + contract test (gated) | Repository tools, safety-tool surface, browser-tool MCP |
| **Application** | `window.__NOTENTION__` bridge + readiness handshake; single extraction path in `core`; prompt + action trace emission; confidence presentation policy | Adaptive slots, generative UI |
| **Evidence** | `EvidenceBundle` + bundle writer + aria/screenshot/console capture + replay | Searchable store, visual diffing |
| **Knowledge** | `Finding` schema, journey registry (alias source), prompt registry, `index.jsonl`, golden cases | Metric baselines over time, backlog prioritization |
| **Guardrail** | `ToolPolicy` (`read/write/consequential`), `report-only` mode, journey allowlist, external-origin block | Permission levels 3–4, automated halt |

---

## 4. Data Contracts

These are the load-bearing types. Zod for everything crossing a process or file boundary; plain TS where it stays in-process.

### 4.1 Journey — declarative, serializable, replayable

```ts
// optimize/src/journey.ts
export type Step =
    | { kind: 'seed'; notes: Note[]; settings?: Partial<AppSettings> }
    | { kind: 'navigate'; hash: string }
    | { kind: 'act'; target: Target; action: 'click' | 'fill' | 'press'; value?: string }
    | { kind: 'assertAria'; target: Target; snapshot: string }        // toMatchAriaSnapshot
    | { kind: 'assertState'; path: StatePath; equals: unknown }       // semantic, never DOM
    | { kind: 'assertNoConsoleErrors' }
    | { kind: 'capture'; label: string };

export type Target =
    | { role: AriaRole; name: string }
    | { testId: string }
    | { label: string };

export interface JourneySpec {
    id: string;                        // 'capture-and-edit'
    version: number;                   // bump ⇒ baselines invalid
    intent: string;                    // user-goal sentence, used in findings
    journeysTouched: string[];         // TODO.4 §6 journey buckets
    seed: { notes: Note[]; settings: Partial<AppSettings> };
    steps: Step[];
    teardown?: Step[];
    status: 'draft' | 'ready';
}
```

`act`/`assertAria` accept only role+name, `data-testid`, or label. CSS classes and text fragments are not representable — the type system enforces AD-4/§11.1 rather than a review guideline.

### 4.2 Evidence

```ts
// optimize/src/evidence.ts
export interface EvidenceBundle {
    runId: string;
    journey: { id: string; version: number; intent: string };
    repo: { gitRev: string; dirty: boolean };
    env: { uiUrl: string; reportOnly: true };
    prompts: Record<string, string>;          // promptId → version
    steps: Array<{ index: number; kind: Step['kind']; label?: string; startedAt: string; durationMs: number }>;
    snapshots: Array<{ label: string; aria: string; shot: string; state: SemanticState }>;
    traces: { prompt: PromptTrace[]; action: ActionTrace[] };
    console: Array<{ type: string; text: string; location?: string }>;
    network: Array<{ method: string; url: string; status?: number; blocked: boolean }>;
    assertions: Array<{ id: string; ok: boolean; expected?: unknown; actual?: unknown; message?: string }>;
    metrics: { stepCount: number; durationMs: number; consoleErrors: number; failedAssertions: number };
}
```

Layout on disk — replay is a first-class operation, so the layout *is* the API:

```
doc/evidence/<runId>/
├── bundle.json                  # EvidenceBundle
├── findings.json                # Finding[]
├── state/<label>.json           # SemanticState snapshots
├── aria/<label>.yml             # ariaSnapshot()
├── shots/<label>.png
└── console.jsonl
doc/evidence/index.jsonl         # append-only: one line per run (runId, journey, ok, failed)
```

### 4.3 Semantic state (what the app says about itself)

```ts
// optimize/src/state.ts — mirrors what the bridge exposes
export interface SemanticState {
    route: { view: string; hash: string; noteId: string | null };
    note: null | {
        id: string; title: string;
        properties: Property[];
        propertyIndex: Record<string, string[]>;   // key → values; the primary assertion surface
        tags: string[];
        privacy: Note['privacy'];
        saveStatus: 'idle' | 'saving' | 'saved' | 'error';
        publishReadiness: { ready: boolean; blocking: string[] };
    };
    editor: { dirty: boolean; propertyDraft: null | { key?: string; operator?: string; value?: string } };
    review: Array<{ property: Property; confidence: number; presentation: 'silent' | 'suggest' | 'clarify' | 'block' }>;
    validation: { errors: string[]; missing: string[] };
    dialogs: Array<{ id: string; kind: 'confirm' | 'modal'; confirmLabel?: string }>;
    pendingConfirmations: Array<{ action: string; consequence: string }>;
}
```

`propertyIndex` exists so journeys assert membership without array arithmetic: `assertState { path: 'note.propertyIndex.skill', equals: ['React'] }`. Paths are dotted and array-aware (`review.0.confidence`); an unresolvable path is a **fixture error**, never a silent pass. Operators are limited to `equals` / `contains` in this slice — enough for semantic truth, too little to become a query language.

### 4.4 Traces

```ts
// core/src/tracing/types.ts
export interface TraceSink {
    prompt(entry: PromptTrace): void;
    action(entry: ActionTrace): void;
}

export interface PromptTrace {
    runId?: string; promptId: string; version: string;
    input: unknown; context?: Record<string, unknown>;
    output: unknown; parsed?: unknown;
    confidence: number | null; durationMs: number;
    outcome: 'applied' | 'suggested' | 'rejected' | 'invalid' | 'refused';
    uiSurface: string;
}

export interface ActionTrace {
    runId?: string;
    source: 'ui' | 'agent' | 'cli' | 'optimize';
    intent: string;                 // 'note.updateContent' | 'note.publish' | 'tool.create_note'
    toolCalls?: Array<{ name: string; phase: 'request' | 'result' | 'blocked' }>;
    stateChanges?: Array<{ path: string; from?: unknown; to?: unknown }>;
    validationFailures?: Array<{ field: string; message: string }>;
    confirmations?: Array<{ action: string; outcome: 'requested' | 'granted' | 'cancelled' }>;
    outcome: 'ok' | 'blocked' | 'failed' | 'requires_confirmation';
}
```

`outcome` is the join key between prompt behaviour and UI behaviour: `suggested` → rendered in `ExtractionReview`; `rejected` → user dismissed; `invalid` → safe-failure path. This single field is what makes `TODO.4.md` §10.5 ("prompt-UI decision policy") testable.

Emission points (minimum viable, each one assertion-relevant):

| Emitter | Site | Emits |
| :--- | :--- | :--- |
| `alignToOntology` | `core/src/extraction/deterministic.ts` | `PromptTrace{promptId:'property-extraction', outcome:'suggested'}` |
| `LlmPropertyExtractor.extract` | `agent/src/intelligence/` | `PromptTrace{confidence, parsed, outcome}` |
| `NotePipeline.{updateContent,upsertProperty,removeProperty}` | `core/src/notes/notes.ts` | `ActionTrace{intent:'note.*', stateChanges}` |
| `useEditorPublishing` privacy gate | `ui/src/hooks/useEditorPublishing.ts` | `ActionTrace{intent:'note.publish', confirmations, outcome:'requires_confirmation'}` |
| MCP tool handler | `agent/src/server/McpToolRegistry.ts` | `ActionTrace{intent:'tool.*', toolCalls, outcome}` |

Without these five, `bundle.traces.action` is empty and `publish-gate` can only assert on network — brittle. The gate assertion must read the trace (`outcome: 'requires_confirmation'`, zero `toolCalls` with `phase: 'result'` for transmit), not the relay.

### 4.5 Findings

```ts
// optimize/src/finding.ts
export interface Finding {
    id: string;                 // `fnd_${sha256(journeyId + version + assertionId).slice(0,12)}`
                                //   deliberately excludes runId: the same defect keeps its id across runs
    title: string;
    journey: string;
    location: string;           // file guess + state path + step index
    severity: 'low' | 'medium' | 'high';
    confidence: 'low' | 'medium' | 'high';
    evidence: { runId: string; assertions: string[]; snapshots: string[] };
    reproduction: { journeyId: string; version: number; bundle: string };
    affectedLayer: Array<'ui' | 'prompt' | 'core' | 'network'>;
    userImpact: string;
    proposedVerification: string;
}
```

Severity/confidence come from a rule table keyed on which plane failed (e.g. failed `assertNoConsoleErrors` ⇒ `prompt`+`ui`, `medium`), not from a model.

### 4.6 Tool policy & control

```ts
// optimize/src/policy.ts
export type SideEffect = 'read' | 'write' | 'consequential';
export interface ToolPolicy { name: string; sideEffect: SideEffect; requiresConfirmation: boolean }

// Notention's rule (TODO.4 §9.3): text alone never completes a consequential action.
export const CONSEQUENTIAL = new Set(['publish_note', 'delete_note', 'merge_ontology', 'grant_permission']);
```

```ts
// core/src/optimize/intent.ts — shared by CLI and (later) in-app control
export interface OptimizeIntent {
    action: 'optimize' | 'reproduce' | 'findings';
    journey?: string;
    target?: string;            // finding id or runId
    constraints: { privacy?: 'private' | 'public'; noisySpeech?: boolean };
    mode: 'report-only';
}
```

---

## 5. The Loop, End to End

```
CLI: /optimize capture-and-edit
  │
  ├─ parseOptimizeIntent(text) ─────────────► OptimizeIntent        [Control]
  │    (aliases derived from registry; no second copy of journey names)
  ├─ Guardrail.assertAllowed(intent) ──────► mode=report-only       [Guardrail]
  ├─ OptimizeLog.append({runId, intent}) ──► getNotentionDir()      [Guardrail]
  └─ spawn: pnpm --filter @notention/ui test:e2e --project=optimize --grep <journeyId>
        │
        ├─ addInitScript: window.__OPTIMIZE_RUN_ID__ = runId        [Application]
        ├─ seed(IndexedDB) → reload → settle('[data-ready]' + __NOTENTION_READY__)
        ├─ for each Step: act / assertAria / assertState / capture
        │     ├─ act: locator auto-waits (visible + enabled)        [Tool]
        │     ├─ assertState reads __NOTENTION__.state()            [Evidence]
        │     └─ traces pulled from the bridge                      [Application→Evidence]
        ├─ alignToOntology emits PromptTrace at the source          [Application]
        ├─ NotePipeline / publish gate emit ActionTrace             [Application]
        ├─ capture console + blocked-network log                    [Evidence]
        └─ reporter writes doc/evidence/<runId>/ + index.jsonl      [Evidence]
  │
  ├─ deriveFindings(bundle) ──────────────► Finding[]              [Agent]
  ├─ write findings.json; append optimize log entry                [Knowledge]
  └─ print: journey, ok/fail, N findings, bundle path              [Control]
```

`/reproduce <findingId>` re-runs `bundle.journey` at its recorded version and asserts the same assertion IDs fail — reproduction is proven, not claimed.

---

## 6. Workstreams (Consolidated, Dependency-Ordered)

Each is a *shallow* cut: one seam, one test, no speculative generality.

### WS-0 · Workspace & Shared Primitives — *unblocks everything* (Day 1, am) ✅ **COMPLETE**
- Create `optimize/` (`package.json`, `tsconfig.json`, `README.md`, `src/index.ts`); add to `pnpm-workspace.yaml` **and** root `package.json#workspaces`.
- Move `STORAGE_KEYS` → `core/src/constants/storageKeys.ts`; `ui/src/config/storageKeys.ts` re-exports it.
- Add root scripts: `"optimize": "tsx optimize/src/cli.ts"`, `"optimize:check": "node scripts/check-optimize-locators.mjs"`.
- `scripts/check-optimize-locators.mjs`: fail if `optimize/` or `ui/test/optimize/` contains `locator('.` or `page.accessibility` (executable enforcement of AD-4 + §11.1, ~25 lines).

**Done when:** `pnpm optimize --help` runs; locator check passes with a seeded violation failing.

### WS-0.5 · Extraction Unification — *prerequisite for trustworthy traces* (Day 1, pm) ✅ **COMPLETE**
- `core/src/extraction/deterministic.ts`: move the `ui/src/services/ai/LocalProvider.alignToOntology` heuristics verbatim, plus the existing `core/src/notes/propertyExtractor/extractors.ts` passes. Export `alignToOntology(text, ontology, opts?): Property[]`.
- `core/src/extraction/index.ts`: also export `explainAlignment(text, props)` → per-property `{matchedBy: 'regex'|'ontology-key'|'intent'}` (needed to attribute a wrong extraction to a rule, later).
- `PropertyExtractor.extractFromText` delegates to `alignToOntology`; keep its public signature (no call-site churn).
- `LocalAIProvider.alignToOntology` → `return alignToOntology(text, ontology)`. Delete the moved regexes (no dead copies).
- `PropertyExtractor` unit tests must stay green *unchanged* — that is the proof the move was behaviour-preserving. Any intentional divergence gets its own test with a comment-free name.

**Done when:** `pnpm --filter @notention/core test` and `pnpm --filter @notention/ui test` are green with no test edits; `grep -c "less than" ui/src/services/ai/LocalProvider.ts` drops to 0; the golden set (WS-3) runs against `core` with no UI import.

### WS-1 · Evidence Bundle + Reporter + Bridge (Days 2–3) ✅ **COMPLETE**
**Bundle/Reporter**
- `optimize/src/evidence.ts` (zod schema + `writeBundle`), `optimize/src/reporter.ts`.
- Playwright `OptimizeReporter` (`onTestEnd`) assembles the bundle from fixture state; writes `bundle.json`, `findings.json`, `index.jsonl`.
- `optimize/src/replay.ts`: `loadBundle(runId)`, `planReplay(bundle): { command, env }`.
- `optimize/package.json` ships an `exports` map (`.`, `./journey`, `./evidence`, `./policy`) so `cli`, `agent`, and `ui/test` import named subpaths instead of reaching into `src/`.

**Bridge (injected sink)**
- `core/src/tracing/{types.ts,sink.ts,promptRegistry.ts}`: `TraceSink`, `setTraceSink`, no-op default.
- `core/src/constants/paths.ts`: `getNotentionDir()` — honours `NOTENTION_DATA_DIR`, else `$XDG_DATA_HOME/notention`, else `~/.notention`. Agent persistence, `OptimizeLog`, and CLI config all resolve through it; no new ad-hoc dot-directories.
- `core/src/prompts/propertyExtraction.ts`: canonical prompt definition `{id: 'property-extraction', version: '1'}`; agent's `LlmPropertyExtractor` consumes it (deletes the inline template).
- `core/src/policy/presentation.ts`: `resolvePresentation(confidence, risk): 'silent' | 'suggest' | 'clarify' | 'block'` (+ unit tests, no mocks).
- `ui/src/dev/bridge.ts`: gated by `import.meta.env.VITE_DEV_HOOKS === 'true'`; exposes `__NOTENTION__ = { runId, state(), promptTraces(), actionTraces(), flush() }` and sets `__NOTENTION_READY__` **after** the sink is installed (AD-9).
- `ui/src/dev/DevBridge.tsx`: mounted inside `AppShell` (has `useView`/`useNotes` context); reads `window.__OPTIMIZE_RUN_ID__` in a mount effect.
- `ui/src/components/AppShell.tsx`: `{import.meta.env.VITE_DEV_HOOKS && <DevBridge/>}` — a bare import keeps `DevBridge` in the production bundle (dead-code elimination needs the guard at the usage site).
- `ui/test/support/settle.ts`: wait for `[data-ready]` **and** `__NOTENTION_READY__` when `VITE_DEV_HOOKS` is on.
- `ui/src/hooks/usePropertyReview.ts`: replace hardcoded `0.85/0.6` thresholds with `resolvePresentation`; render `item.presentation`; no trace emission here (it happens at the extractor, AD-8).
- Action-trace wiring: `NotePipeline` (3 methods) and `useEditorPublishing` privacy gate.
- `ui/test/playwright.config.ts`: build with `VITE_DEV_HOOKS=true` (test builds only; production never defines it).

**Done when:** a synthetic fixture test produces a schema-valid bundle; `pnpm optimize --replay <runId>` re-executes identically; `state()` returns a populated `SemanticState`; a rejected suggestion produces a `PromptTrace` with `outcome:'rejected'`; a note edit produces an `ActionTrace` with `stateChanges`; production bundle contains neither `__NOTENTION__` nor `DevBridge` (`grep` in CI).

### WS-2 · Journey Framework + First Journeys (Days 3–4) ✅ **COMPLETE**
- `optimize/src/steps.ts` resolver (`Target` → Playwright locator), `optimize/src/execute.ts` (step interpreter with per-step timing/assertion capture).
- `execute.ts` auto-waits: every `act` resolves the locator with `waitFor({state:'visible'})` before dispatch, so a `fill` on a freshly opened dialog cannot race its mount.
- `ui/test/optimize/{capture-and-edit,publish-gate,ontology-conflict}.journey.ts` under a new `optimize` project.
  - `capture-and-edit` — **complete**: seed → navigate `#notes/scene-editor-note` → add detail via dialog → assert `note.propertyIndex.skill` contains `React` → assert editor text has no `[`/`]` → reload → assert persistence → `assertNoConsoleErrors`.
  - `publish-gate` — complete but *negative*: request publish on a private note; assert `pendingConfirmations` non-empty **and** an `ActionTrace{intent:'note.publish', outcome:'requires_confirmation'}` with zero transmit `toolCalls`.
  - `ontology-conflict` — registered with seed + first two steps only (breadth marker, explicitly `status: 'draft'`).
- `optimize/src/registry.ts` with `status: 'draft' | 'ready'`; `/optimize` refuses drafts unless `--allow-draft`. Registry entries are the source for NL aliases (WS-5) and for `--list`.

**Done when:** `capture-and-edit` passes with zero CSS-class locators; deleting `data-testid="extraction-review"` breaks `assertAria` (proves contract), not the state assertion; `publish-gate` fails if the publish gate is removed (mutation check, run manually once).

### WS-2.5 · Discovery & Metaprogramming Layer — *eliminates brittle manual journeys* (Day 4, parallel with WS-2 tail) ✅ **COMPLETE**
- `optimize/src/discovery/componentScanner.ts` — static analysis of `ui/src/components/**/*.tsx` to discover routes, dialogs, forms, actions.
- `optimize/src/discovery/stateSchema.ts` — infers `SemanticState` shape from hooks, bridge, and core types.
- `optimize/src/discovery/traceEmitterScanner.ts` — finds all `addPromptTrace`/`addActionTrace` emission sites across packages.
- `optimize/src/discovery/journeyGenerator.ts` — generates `JourneySpec` from discovered patterns (replaces manual journey files).
- `optimize/src/discovery/selectorInference.ts` — derives stable Playwright selectors from component tree (role, label, testId).
- `optimize/src/discovery/index.ts` — unified `DiscoveryEngine` facade; `discoverAll()`, `generateJourney(name)`, `generateFromIntent(nl)`.
- Exports: `optimize/src/discovery` added to `optimize/package.json#exports`.

**Done when:** `discoveryEngine.generateJourney('capture-and-edit')` produces a valid `JourneySpec`; selectors inferred for all dialog fields and toolbar actions; trace emitters match AD-8 table; NL intent "capture and edit" resolves to the journey.

### WS-2.6 · Advanced State Schema Inference — *eliminates `StatePath` string drift* (Day 5)
- `optimize/src/discovery/tsAstScanner.ts` — TypeScript Compiler API / ts-morph scanner for `ui/src/hooks/**/*.ts`, `core/src/**/*.ts`.
- `optimize/src/discovery/typeSchema.ts` — `TypeSchema.fromProject()` extracts return types of `useNotes`, `useView`, `useEditorLogic`, `useEditorPublishing`, resolves generics, flattens nested objects.
- `optimize/src/discovery/statePathRegistry.ts` — canonical `StatePath` registry with dotted notation, array awareness (`note.propertyIndex.*`), validation that paths exist at runtime.
- Replace all hardcoded `StatePath` strings in journeys with registry lookups.

**Done when:** `statePathRegistry.get('note.propertyIndex.skill')` returns typed path; journey `assertState` uses registry; adding a new property to `Note` type automatically appears in registry.

### WS-2.7 · Journey Synthesis from Goals — *eliminates manual journey files* (Day 6)
- `optimize/src/discovery/journeySynthesizer.ts` — `JourneySynthesizer.fromGoal(goal, options)` builds journey via:
  1. Component graph from `ComponentScanner` (nodes=components, edges=props/context/hooks)
  2. State transition graph from `TypeSchema` (pre/post conditions per action)
  3. BFS/Dijkstra from entry component to target state predicate
  4. Emits `JourneySpec` with `seed`, `steps`, `assertions`
- `optimize/src/discovery/goalParser.ts` — parses NL goal ("capture note and add framework property") into `{ entryComponent, targetState, constraints }`.
- Deprecate `journeyGenerator.ts` switch cases; registry stores only `JourneySpec` (generated or manual).

**Done when:** `journeySynthesizer.fromGoal('add a deadline property to a note')` produces valid `JourneySpec`; all existing journeys regeneratable; new features auto-discoverable.

### WS-2.8 · Event Flow & Selector Derivation — *eliminates manual selector/action specs* (Day 6, parallel)
- `optimize/src/discovery/eventFlowScanner.ts` — scans JSX for `onClick`, `onSubmit`, `onChange` → traces to handler functions → builds action graph.
- `optimize/src/discovery/accessibilitySelector.ts` — uses Playwright `ariaSnapshot()` on live app to derive canonical selectors for discovered actions/dialogs.
- `optimize/src/discovery/mcpContractScanner.ts` — parses `agent/src/server/plugins/*.ts` for `McpToolRegistry.register()` calls → generates contract test specs.
- `optimize/src/discovery/goldenCaseMiner.ts` — mines `doc/evidence/**/bundle.json` for high-confidence extraction examples → regenerates `property-extraction.golden.json`.

**Done when:** Selectors for all actions derived from live ARIA; MCP contract tests auto-generated; golden cases refresh from production traces.

### WS-3 · Prompt Lab Seed (Day 4, parallel with WS-2 tail) ✅ **COMPLETE**
- `optimize/src/prompts/` golden-case files: `property-extraction.golden.json` (10 cases: clean typed, noisy transcript, ambiguity, invalid schema, privacy-sensitive) with `input / expected / forbidden / expectedOutcome`.
- `optimize/src/prompts/evaluate.ts`: runs the **core** `alignToOntology` against the golden set (no network, no UI import); emits pass/fail per case into the bundle.
- `evaluate.ts` accepts a `Provider` injection point: `{ name, extract(text, ontology): Promise<Property[]> }`. The deterministic provider wraps `alignToOntology`; a `CannedProvider` replays recorded LLM outputs. This lets prompt regressions in the *LLM* path be tested without a network call, and keeps the eval honest about which provider failed.
- `ui/src/tests/prompts/presentation.test.ts`: the §10.5 matrix (high/low confidence × low/high risk) against `resolvePresentation`.

**Done when:** golden evaluation runs offline in <2s and a deliberately degraded extractor fails ≥3 cases; a `CannedProvider` case with a schema-violating payload yields `outcome:'invalid'` rather than a thrown error.

### WS-4 · Guardrails (Day 5) ✅ **COMPLETE**
- `optimize/src/policy.ts` + `agent/src/server/McpToolRegistry.ts`: `register(name, def)` gains optional `sideEffect` (default `'write'` — safe default); `execute` consults a `Guardrail` singleton that rejects when `reportOnly && sideEffect !== 'read'`.
- `agent/src/guardrails/{Guardrail.ts,OptimizeLog.ts}`; `OptimizeLog` appends JSONL to `getNotentionDir()/optimize.log` (override with `NOTENTION_OPTIMIZE_LOG`).
- Blocked tools emit `ActionTrace{outcome:'blocked'}` through the same sink, so a guardrail refusal is visible in the bundle rather than only in a server log.
- Cli `SecurityCommand` surfaces the current mode (`/security` already exists — extend output, don't add a command).

**Done when:** with `NOTENTION_REPORT_ONLY=1`, `create_note` via MCP returns `isError`, logs a `blocked` event, and emits a blocked `ActionTrace`; `read_notes` still succeeds.

### WS-5 · Control Surface (Day 5, parallel with WS-4) ✅ **COMPLETE**
- `optimize/src/intent.ts` + `parseOptimizeIntent(text)` — grammar-first (`/optimize <journey>`, `/reproduce <findingId>`, `/findings [--json]`). NL aliases are **derived from the registry** (`id`, `intent`, `journeysTouched`) rather than hand-listed, so a new `ready` journey is addressable immediately.
- `cli/src/commands/{OptimizeCommand,ReproduceCommand,FindingsCommand}.ts` via `createCommand`; register in `cli/src/commands/index.ts`.
- `OptimizeCommand` spawns the Playwright project, streams output, then prints findings + bundle path. Never mutates repo.

**Done when:** `/optimize capture-and-edit` prints `runId`, `ok/fail`, finding count; `/reproduce` on a failing finding reproduces it; unknown journey fails with a list of `ready` journeys; adding a registry entry makes `/optimize "<its intent>"` work with no CLI change.

### WS-6 · MCP Contract Seam *(stretch, off critical path)* ✅ **COMPLETE**
- `optimize/src/mcp/client.ts`: `@modelcontextprotocol/sdk` `Client` + `SSEClientTransport` at `/mcp/sse`.
- `ui/test/optimize/mcp-contract.journey.ts`, skipped unless `NOTENTION_MCP_URL` is set: asserts tool inventory, zod schema round-trip, and that every `consequential` tool is policy-gated.

**Done when:** test is green against a running agent **and** cleanly skipped when absent (no flaky dependency in CI).

---

## 7. Acceptance Criteria

| # | Criterion | Verification |
| :-- | :--- | :--- |
| 1 | One journey optimized end-to-end, reproducibly | `pnpm optimize --journey capture-and-edit` exits 0; `doc/evidence/<runId>/bundle.json` validates against `EvidenceBundleSchema` |
| 2 | Assertions are semantic | Deleting the `[data-testid]` used by `assertAria` does not change `assertState` outcomes; `pnpm optimize:check` reports 0 selector/`page.accessibility` violations |
| 3 | App self-reports state | `assertState note.propertyIndex.skill` passes via `window.__NOTENTION__.state()`; readiness handshake prevents the race |
| 4 | Prompt behaviour is traced & versioned | Bundle `prompts` map is non-empty; `traces.prompt[]` contains `property-extraction@1` with `outcome`, emitted at the extractor (not the hook) |
| 5 | Prompt→UI policy is enforced in code | `resolvePresentation` unit tests cover the 2×2 matrix; `usePropertyReview` renders its verdict instead of literal thresholds |
| 6 | Findings are deterministic | Re-running (new `runId`) and replaying (same bundle) both yield byte-identical `findings.json`; ids derive from `journeyId+version+assertionId`, never `runId` |
| 7 | Safety is structural | `NOTENTION_REPORT_ONLY=1` blocks all `write`/`consequential` MCP tools; `publish-gate` proves `outcome:'requires_confirmation'` with no transmit trace; blocked actions appear in the bundle |
| 8 | NL control works, bounded | `/optimize`, `/reproduce`, `/findings` behave; aliases derive from the registry; consequential verbs parse but are refused without `--confirm` |
| 9 | Isolation is real | Journey runs in a fresh browser context; `routes.ts` blocks non-local origins; no writes outside `doc/evidence/` and `getNotentionDir()` |
| 10 | No production leakage | `grep -rE "__NOTENTION__|DevBridge" ui/dist` → empty after production build |
| 11 | One extraction path | `LocalAIProvider` contains no extraction regexes; `optimize` golden eval imports only from `core`; `core` tests unchanged and green |
| 12 | Action traces exist | An edit produces `ActionTrace{intent:'note.updateContent', stateChanges}`; a rejected publish produces `outcome:'requires_confirmation'` |
| 13 | Zero regressions | `pnpm test`, `pnpm --filter @notention/ui test:e2e`, `pnpm optimize:check`, `pnpm run build` all green |

---

## 8. Risks & Mitigations

| Risk | Why it bites here | Mitigation |
| :--- | :--- | :--- |
| Playwright API drift | `page.accessibility` already absent from installed types | AD-4 + `optimize:check` regex gate in CI |
| Trace correlation loss | Browser traces orphaned from run record | AD-7 `runId` via `addInitScript`; bridge tags every event; bundle cross-checks counts |
| Trace blind spots | Instrumenting hooks leaves headless + LLM paths untraced | AD-8 unify extraction first; emit at the extractor, not the component |
| Bridge readiness race | `assertState` runs before the mount effect installs the sink | AD-9 `__NOTENTION_READY__` handshake awaited by `settle()` |
| Extractor divergence | Two implementations drift the moment one is tuned | AD-8 single source in `core`; `LocalAIProvider` delegates; golden set imports `core` only |
| Core contamination | Emitting `window.*` from `@notention/core` breaks headless/agent | AD-3 injected sink; core ships a no-op default |
| Hidden mutation | "Optimize" quietly changes disk/relay | AD-6 precise definition + `publish-gate` negative journey + blocked-origin routes + `getNotentionDir()` confinement |
| Network-only safety proof | Relay runs on localhost, so `isolateNetwork` cannot prove "no transmit" | Assert the `ActionTrace` outcome, not the socket |
| Production leakage | An unconditional `<DevBridge/>` import survives tree-shaking | Guard at the usage site (`import.meta.env.VITE_DEV_HOOKS && <DevBridge/>`) + `grep` gate |
| Vite env replace fails | `import.meta.env.VITE_DEV_HOOKS` not substituted in conditional JSX | `define` in `vite.config.ts` + explicit `.env.optimize`; verify with `grep` in CI |
| Bundle bloat | Evidence becomes unreadable/unusable | Fixed capture budget: ≤1 shot + 1 aria + 1 state per `capture` step (≤4 per journey); console captured as JSONL, truncated to 200 entries |
| Seeding drift | Fixtures silently diverge from app storage | `STORAGE_KEYS` moved to `core`; `seed()` asserts the written keys are read back after reload |
| Journey/vs/refactor churn | Semantic assertions become a second brittle layer | Assertion targets are typed (`StatePath`); unknown path = fixture error, not skip |
| Draft-journey rot | Half-built journeys silently "pass" | `status` field; `/optimize` refuses drafts; CI runs only `ready` |
| Reporter coupling to Playwright internals | `onTestEnd` API churn | Reporter is <100 lines; bundle assembly lives in `optimize/` (pure functions), reporter only forwards |
| First-run CI instability | Dialog animation, fonts, hydration, worker start order | Explicit time budget (below); no `waitForTimeout` allowed — fix the wait or the app, never the sleep |

---

## 9. File Impact

```
optimize/                              NEW workspace
├── package.json  tsconfig.json  README.md
│   └── exports: ".", "./journey", "./evidence", "./policy", "./prompts", "./discovery"
└── src/
    ├── index.ts
    ├── journey.ts        types + zod
    ├── registry.ts       journey catalogue (source of NL aliases)
    ├── steps.ts          Target → locator
    ├── execute.ts        step interpreter + auto-wait
    ├── evidence.ts       EvidenceBundle + writer
    ├── finding.ts        derives findings (pure rule table)
    ├── reporter.ts       Playwright reporter
    ├── replay.ts         bundle → command
    ├── policy.ts         SideEffect, CONSEQUENTIAL
    ├── cli.ts            pnpm optimize
    ├── prompts/
    │   ├── evaluate.ts            provider-injectable (deterministic | canned)
    │   └── property-extraction.golden.json
    ├── mcp/client.ts     (WS-6)
    └── discovery/        NEW (WS-2.5, WS-2.6, WS-2.7, WS-2.8)
        ├── componentScanner.ts       routes, dialogs, actions from JSX
        ├── stateSchema.ts            SemanticState from hooks/bridge/core
        ├── traceEmitterScanner.ts    all trace emission points
        ├── journeyGenerator.ts       JourneySpec from discoveries (deprecated by WS-2.7)
        ├── selectorInference.ts      stable selectors from component tree
        ├── index.ts                  DiscoveryEngine facade
        ├── tsAstScanner.ts           TS Compiler API scanner for types (WS-2.6)
        ├── typeSchema.ts             TypeSchema.fromProject() (WS-2.6)
        ├── statePathRegistry.ts      canonical StatePath registry (WS-2.6)
        ├── journeySynthesizer.ts     JourneySynthesizer.fromGoal() (WS-2.7)
        ├── goalParser.ts             NL goal → structured intent (WS-2.7)
        ├── eventFlowScanner.ts       onClick/onSubmit → action graph (WS-2.8)
        ├── accessibilitySelector.ts  live ARIA → canonical selectors (WS-2.8)
        ├── mcpContractScanner.ts     agent plugin → contract tests (WS-2.8)
        └── goldenCaseMiner.ts        evidence bundles → golden cases (WS-2.8)

core/src/
├── constants/{storageKeys,paths}.ts              MOVED + NEW (`getNotentionDir`)
├── extraction/{deterministic,index}.ts           NEW (AD-8; absorbs LocalProvider heuristics)
├── tracing/{types,sink}.ts                       NEW
├── prompts/{registry,propertyExtraction}.ts      NEW
├── policy/presentation.ts                        NEW
├── optimize/intent.ts                            NEW
└── notes/notes.ts                                + ActionTrace emission (3 methods)

ui/src/
├── dev/{bridge.ts,DevBridge.tsx}   NEW (dev-gated; sets __NOTENTION_READY__)
├── config/storageKeys.ts           re-export only
├── services/ai/LocalProvider.ts    alignToOntology → core; regexes deleted
├── hooks/usePropertyReview.ts      render resolvePresentation verdict
├── hooks/useEditorPublishing.ts    + ActionTrace on privacy gate
└── components/AppShell.tsx         conditional <DevBridge/>

ui/test/
├── playwright.config.ts            + optimize project, + VITE_DEV_HOOKS
├── support/seed.ts                 re-export from optimize
├── support/settle.ts               + __NOTENTION_READY__ wait
└── optimize/{capture-and-edit,publish-gate,ontology-conflict,mcp-contract}.journey.ts  NEW

agent/src/
├── server/McpToolRegistry.ts       + sideEffect + guardrail check
├── server/plugins/CorePlugin.ts    declare sideEffects
├── guardrails/{Guardrail,OptimizeLog}.ts   NEW
└── intelligence/LlmPropertyExtractor.ts consume core prompt definition

cli/src/commands/{OptimizeCommand,ReproduceCommand,FindingsCommand}.ts   NEW
cli/src/commands/index.ts           register
scripts/check-optimize-locators.mjs    NEW
pnpm-workspace.yaml, package.json   add `optimize`
```

---

## 10. Deferred (with the `TODO.4.md` section that owns it)

| Deferred | Owned by |
| :--- | :--- |
| Director / Audit / Implementation / Verification agents | §4.2, Workstream H |
| Speech pipeline (STT, normalization, confidence, spoken feedback) | §9.2, Workstream E |
| Storybook component workbench | §7.3, Workstream F |
| Simulator → journey bridge (`ScenarioRunner.onEvent` → same schema) | §13, Workstream G |
| Visual regression baselines, pixel diffing | §7.8 |
| Adaptive UI slots, generative layouts | §12 |
| Metric baselines over time, cognitive-load proxies | §8.3, §8.5 |
| In-app Director chat, evidence UI, approval flows | §4.1, Workstream I |
| Human usability session ingestion | §14 |
| Permission levels 3–4 (supervised/trusted implementation) | §15.1 |
| LLM-based finding generation and prioritization | §4.2, §17.7 |

---

## 11. Definition of Done

- [x] WS-0, WS-0.5…WS-5 complete; WS-6 merged behind an env gate (or explicitly deferred with a tracking note)
- [x] WS-2.5 Discovery & Metaprogramming Layer complete (`optimize/src/discovery/`); journeys generated, not hand-written
- [ ] WS-2.6 Advanced State Schema Inference complete (`tsAstScanner`, `typeSchema`, `statePathRegistry`); `StatePath` strings eliminated
- [ ] WS-2.7 Journey Synthesis from Goals complete (`journeySynthesizer`, `goalParser`); manual journey files deprecated
- [ ] WS-2.8 Event Flow & Selector Derivation complete (`eventFlowScanner`, `accessibilitySelector`, `mcpContractScanner`, `goldenCaseMiner`); selectors/contracts/goldens auto-derived
- [ ] `pnpm optimize --journey capture-and-edit` green in CI and locally; bundle committed as a **baseline fixture** in `doc/evidence/baselines/capture-and-edit/`
- [ ] `pnpm test`, `pnpm --filter @notention/ui test:e2e`, `pnpm optimize:check`, `pnpm run build` all green
- [x] `optimize/README.md` documents: journey authoring, step kinds, replay, report-only semantics, and the "no class selectors" rule
- [ ] Root `README.md` command table gains the `pnpm optimize` row
- [x] `LocalAIProvider` holds no extraction regexes; `optimize` imports extraction only from `core`
- [x] No `__NOTENTION__` or `DevBridge` in production output; no `page.accessibility` in the tree
- [ ] One finding produced by the slice is filed and triaged (proves the loop closes, not just runs)

---

## 12. Schedule & Buffers

| Block | Work | Note |
| :--- | :--- | :--- |
| Day 1 (am) | WS-0 workspace, `STORAGE_KEYS`, locator gate | Mechanical |
| Day 1 (pm) | WS-0.5 extraction unification | Gate: existing tests pass **unchanged** |
| Days 2–3 | WS-1 bundle, reporter, bridge, traces | Longest block; do not start WS-2 early |
| Days 3–4 | WS-2 journeys | `capture-and-edit` first, then `publish-gate` |
| Day 4 | WS-3 golden set ∥ WS-2.5 discovery layer | Provider injection + static analysis |
| Day 5 | WS-4 guardrails ∥ WS-5 control ∥ WS-2.6 state schema | Independent files |
| Day 6 | WS-2.7 journey synthesis ∥ WS-2.8 event flow/selectors | Core metaprogramming |
| **Day 7** | **CI stabilization buffer** | Reserved, not optional |

The buffer is part of the plan because it is the one cost that is certain and unschedulable: the first headless run in CI will surface at least one timing assumption (worker start order, font load, dialog mount, PWA/SW interference). The rule during that day: replace the wait, never lengthen it.

---

## 13. Simulation-Derived Adjustments

Findings from mentally walking the implementation, and where each landed:

| # | Discovery | Resolution |
| :-- | :--- | :--- |
| 1 | `useGardener` is the only entry to `alignToOntology`, and it needs React | Non-React `alignToOntology` in `core` (WS-0.5) |
| 2 | The richest extractor lives in `ui/`, not `core/` | Moved (AD-8) |
| 3 | Traces were planned at the hook, which sees only the result | Emit at the extractor (AD-8, §4.4 table) |
| 4 | Nothing emitted `ActionTrace` | 5 named emission points (§4.4) |
| 5 | `runId` must exist before the bridge mounts | `addInitScript` + `__OPTIMIZE_RUN_ID__` (AD-9) |
| 6 | `settle()` could pass before the sink installed | `__NOTENTION_READY__` handshake (AD-9) |
| 7 | `assertState` on `note.properties` needs array predicates | `note.propertyIndex` normalized view (§4.3) |
| 8 | `publish-gate` cannot prove "no transmit" from the network log (relay is localhost) | Assert the `ActionTrace` outcome instead (§4.4, AC-7) |
| 9 | `.notention/` was an invented path convention | `getNotentionDir()` in `core` (WS-1) |
| 10 | An unconditional `DevBridge` import survives tree-shaking | Guard at the usage site (WS-1, AC-10) |
| 11 | Golden set only covered the deterministic path | Provider injection incl. `CannedProvider` (WS-3) |
| 12 | `fill` on a freshly opened dialog could race its mount | Step interpreter auto-wait (WS-2) |
| 13 | NL alias table would duplicate journey names | Aliases derived from the registry (WS-5) |
| 14 | First CI run will flake | Day 6 buffer; no `waitForTimeout` allowed (§8) |
| 15 | Deriving `Finding.id` from `runId` contradicted "byte-identical on replay" | Id derives from `journeyId+version+assertionId` (§4.5, AC-6) |
| 16 | Manual journeys brittle, duplicate component knowledge | Discovery layer (WS-2.5) infers routes, dialogs, actions, selectors from source |
| 17 | Vite `import.meta.env` not replaced in conditional JSX | `define` in `vite.config.ts` + explicit env file; DevBridge now loads in optimize builds |

---

## 14. What This Unlocks Next

| Next step | Enabled by |
| :--- | :--- |
| Add journeys for search/navigation/publishing breadth | `registry.ts` + typed `Step` |
| Swap deterministic findings for an Audit Agent | `Finding` schema + `deriveFindings` as the reference implementation |
| Prompt A/B experiments | `prompts` registry + golden sets + `PromptTrace.outcome` |
| Speech control | `OptimizeIntent` is already the post-STT target |
| Simulator evidence | `ScenarioRunner.onEvent` → `EvidenceBundle` steps |
| In-app review UI | `index.jsonl` + bundle layout are UI-agnostic |
| Bounded implementation agents | `ToolPolicy` + `reportOnly` + replayable reproduction |

---

*This slice builds the microscope and locks the sample stage. It does not yet look at what it finds.*