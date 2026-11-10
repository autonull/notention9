# TODO.16 — Consolidated Experiment + Editor Plan

**Supersedes:** TODO.15.md
**Date:** 2026-11-10
**Status:** ✅ **COMPLETE — superseded by TODO.17.md (2026-11-10).** Kept as the historical record of the infrastructure-and-instrument phase; its gates, evidence classes and ledger discipline carry forward unchanged. P0 Tooling/Deps ✅. P0 Build ✅. P1 Core/UI ✅ (E2.1–E2.5, E2.5a–f). E15 ✅ (E15.0–E15.3). **P2 Runtime Fixes ✅ — real fixes landed and verified by a clean E2 run (the earlier "✅ COMPLETE" marks were wrong; see §P2).** **P2x Instrument Integrity ✅.** **E2.6 EXECUTED — verdict `invalid: metric-cannot-discriminate` (honest, instrument-backed). E2.8 N/A (no winner). E2.9 ✅ (ledger + write-up).**

> **Superseded (2026-11-10).** Every remaining item in this file (R4–R8) concerns the *measurement apparatus*; none concerns whether the product is usable or valuable. Two facts found the same day: (1) the repository's own gate is red at this commit (`pnpm test` fails 2 tests; `pnpm --filter @notention/ui typecheck` reports 423 errors across 228 files; CI runs both); (2) **the flagship demo cannot display its flagship result** — `demo-request-react` ↔ `demo-offer-react` scores **0.000** against the UI's `score > 0.4` filter. Five causes, each independently fixable: the `intent` direction marker and the `status` lifecycle marker are evaluated as constraints (each −1); the two sides are not in the same dimension (`budget` is a total, `rate` carries no period); the score denominator divides by *all* request properties instead of required constraints (README2 §13.2); and the matcher discards units entirely, so a rate satisfies a total off by a factor of ~8,766. The diagnosis and the replacement plan are in **TODO.17.md**. Items R5–R8 are folded into TODO.17's tracks; R4 is superseded by TODO.17's P1→P2→P3 ordering.

> **Correction (2026-11-10).** This file previously marked P2.1b (`__name`) and P2.2 (`enabled`) as ✅ COMPLETE. They were not: both errors were still live in the E2 run, and the E2 harness itself was also producing `__name` failures. Root causes are now identified and fixed (see §P2). Treat every status in this file as "verified by a run", not "believed".

---

## 🎯 Single Goal

**Execute one powered experiment end-to-end with full ledger chain**, then stop and evaluate.

Success metric: `simulator:friction-detected → candidate:evaluated (measured, powered) → verdict → revision:consented → simulator:confirmed → journal:friction-reduced` (or honest null).

**2026-11-10 status:** the chain reaches `candidate:evaluated` → `verdict` with a real ledger entry. `revision:consented` is only reachable if a candidate actually wins; the current instrument cannot show a win (see §E2 — "What the automated harness can and cannot measure").

---

## 🏗️ Prioritization: Foundational First (Non-Negotiable)

**Core/UI/Build fixes MUST complete before any peripheral work (simulator, optimize, ablation).**

| Priority | Category | Items | Status |
|----------|----------|-------|--------|
| **P0** | **Tooling/Dependencies** | T1–T5: Update all deps across workspaces | ✅ COMPLETE |
| **P0** | **Build/Type System** | tsup migration, type exports | ✅ COMPLETE |
| **P1** | **Core/UI Runtime** | Vite aliases, production bundle, strategy registration, component errors, screenshot tests | ✅ COMPLETE |
| **P2** | **Runtime Fixes** | `__name` polyfill, strategy `enabled` resolution, Nostr noise suppression | ✅ COMPLETE **and verified by a clean E2 run (2026-11-10)** |
| **P2** | **Editor Modernization** | E15.0 React 19 unblock → E15.1 structured document → E15.2 chip UX → E15.3 engine gate | ✅ COMPLETE |
| **P2** | **Instrument Integrity (NEW)** | Candidate patches must reach the app; verdicts must be `invalid` when unmeasurable | ✅ COMPLETE (2026-11-10) |
| **P3** | **Experiment Execution** | E2.6 run, verdict, ledger | **✅ E2.6 EXECUTED — verdict `invalid` (metric cannot discriminate); E2.8 N/A; E2.9 ✅** |
| **P4** | **Peripheral/Optional** | E13 llama.cpp ablation, E7/E14 ontology drift | Deferred — next step is R4 (pick one measurable experiment) |

**Rule:** No work on P2/P3 until P1 complete. No parallel tracks. P0 Tooling must complete before P0 Build.

**New Order:** E15 (editor modernization) → **P2 Runtime Fixes** → **P2 Instrument Integrity** → E2 (experiment) → E13 → E7/E14.

---

## 🔧 Tooling & Dependencies Update (P0 — ✅ COMPLETE)

Updated all tooling and dependencies across workspaces. Fixed breaking changes from TypeScript 7.0, Zod v3 (pinned), Express 5, Vite 6, and other major versions. React standardized on 18.3.1 (React 19 unblock is E15.0).

| Task | Scope | Key Updates Applied |
|------|-------|---------------------|
| **T1** | Root workspace | Playwright 1.65, Vitest 5.1, Zod 3.25 (pinned), TS 7.0, uuid 14, ai 4.0, express 5.3 |
| **T2** | Core | TS 7.0, Vitest 5.1, @types/node 26.6, nostr-tools 2.26, cbor-x 1.6.9 |
| **T3** | UI | Tiptap 3.33, Tailwind 4.3.5, TS ESLint 8.72, dompurify 3.4.17, Vitest 5.1 |
| **T4** | Simulator | React 19.0.0, Express 5, Vite 6.4, @vitejs/plugin-react 5, chalk 6.0 |
| **T5** | Agent/CLI | AI SDK v4, MCP SDK 1.32, Express 5, uuid v14, deprecated @types removed |

**Breaking changes fixed:**
- TypeScript 7.0: removed `baseUrl`, `downlevelIteration`; added explicit `rootDir`
- Zod v4 migration blocked → pinned to v3.25.76 across all workspaces
- Chalk v6 ESM: changed imports to `import { default as chalk } from 'chalk'`
- @vitejs/plugin-react v6 incompatible with Vite 7/6 → downgraded to v5 for simulator
- TypeScript compiler API v7: simplified `typeScriptGate.ts` and `goldenCaseMiner.ts`
- Agent tsconfig: set `rootDir: "../"` for cross-workspace imports

---

## 🧪 Experiment Pipeline (One at a Time)

### **E2: Capture-Flow A/B (S-UI)** — **INFRASTRUCTURE READY / DEV MODE UNSTABLE**

**Status:** Infrastructure ✅. Production build ✅. Dev server ✅ stable, clean console. Strategy registration ✅ (idempotent under StrictMode/HMR, all 7 register). **E2.5 ✅ — UI renders in dev and production preview.** **E2.5a–f ✅ — UI unit tests pass, screenshot tests pass.** **E2.6 EXECUTED (2026-11-10) — verdict `invalid: metric-cannot-discriminate`; the run itself is clean (0 console/page errors, 60/60 interventions observed, completion 90 %).**

| Step | Action | Status |
|------|--------|--------|
| E2.1 | Fix Vite aliases for `@notention/core` subpaths | ✅ COMPLETE |
| E2.2 | Fix production bundle browser errors (`__name`, `fs` leaks) | ✅ COMPLETE |
| E2.3 | E2 test infrastructure | ✅ COMPLETE |
| E2.4 | Fix strategy registration bug (glob path match) | ✅ COMPLETE |
| **E2.5** | **Fix pre-existing component errors blocking experiment** | **✅ COMPLETE** |
| | └─ E2.5a: `suggestions is not defined` — `TiptapEditor` now passes `allSuggestions` to `useTiptapConfig` | ✅ |
| | └─ E2.5b: `__name is not defined` — stale compiled `.js` shadowed `.ts` sources; deleted. **But dev mode still threw `__name`** — the real dev-mode cause was `tsx`'s esbuild `keepNames` (see P2.1b) | ✅ (both causes fixed) |
| | └─ E2.5c: `reading 'enabled'` — **root cause found 2026-11-10**: `Journal.record()` read `this.config.enabled` before the async IndexedDB config load resolved | ✅ (see P2.2) |
| | └─ E2.5a–f: unit/screenshot test failures | ✅ COMPLETE |
| **E2.6** | **Run experiment (10 cases × 3 reps × 2 arms)** | **✅ EXECUTED — verdict `invalid: metric-cannot-discriminate`** (completion 90 % both arms, 0 discordant pairs, 0 console/page errors across 60 runs) |
| **E2.6a** | **Instrument integrity: candidate patch must reach the app** | **✅ COMPLETE** (arms were no-ops; 60/60 interventions now observed) |
| **E2.6b** | **Criterion reachability: request-slot extraction** | **✅ COMPLETE** (completion 0 % → 90 %) |
| **E2.6c** | **Verdict honesty: `invalid` instead of a false "no difference"** | **✅ COMPLETE** |
| E2.7 | Next step from the verdict | ⏳ **The verdict is `invalid`, not null** — more cases cannot help; the capture-UX seam needs an arm whose effect is machine-observable (or human raters). See R1/R4. |
| E2.8 | If improved: create revision, consent, re-sim | ⏸ **N/A** — no candidate won; there is nothing to consent to. |
| E2.9 | Ledger chain + write-up | ✅ Ledger chain emitted by the harness (`optimizer:cycle:started` → `optimizer:candidate:evaluated` ×2 → `optimizer:cycle:completed`); write-up in `doc/evidence/2026-11-e2-results.md` |

**Gate (met, 2026-11-10):** dev mode clean — the E2 run produced **0 browser console errors and 0 page errors** across 60 runs.

#### E2.6 — what the first run actually measured (2026-11-10)

The first E2.6 run reported *"No significant difference — retain incumbent"*. **That conclusion was false.** The instrument measured
nothing; three independent defects, all now fixed:

| # | Defect | Evidence | Fix |
|---|--------|----------|-----|
| **D1** | **The arms were no-ops.** `applyPendingRevisionParams()` re-registered the strategy with patched props, but `StrategyResolver` rendered `<Component {...props} />` — the strategy's `defaultProps` never reached the component. `QuickCapture` also hardcoded its placeholder and never read `autoFocus`/`initialOp`. The `ParamSpec` promised behaviour the code did not implement, so *no* capture-flow candidate could ever have an effect. | The patched placeholder never appeared in the DOM; captured properties never carried the patched operator. | `StrategyResolver` merges `strategy.getDefaultProps()`; `QuickCapture` consumes `placeholder`/`autoFocus`; `DashboardView` applies `initialOp` to the created note's properties. |
| **D2** | **The completion criterion was unreachable.** Cases require request slots (`need`, `schedule`, `frequency`, `budget`, `price`, `deadline`); the ontology had no such attributes and the extractor had no such patterns. Both arms sat at 0% — a floor effect, not a null. | Case 020 extracted only `intent=task` plus a bogus `price` (`4-6pm` read as money). | New `request` ontology domain (`need`, `schedule`, `frequency`) + `core/src/extraction/requestSlots.ts`; price-range regex no longer reads time ranges as money. |
| **D3** | **The harness could not distinguish "no effect" from "cannot detect".** Zero discordant pairs produced `p=1.0` and the runner printed a verdict it could not support. | The pre-fix run: 0/10 completion in both arms → "retain incumbent". | The runner now emits an explicit verdict — `improved` / `degraded` / `no-difference` / **`invalid`** — and raises `invalid` for: intervention not applied, underpowered (< 30 paired samples), or a metric that cannot discriminate. Every run also records whether the candidate's effect was observed in the running app. |

#### What the automated harness can and cannot measure (read before E2.8)

- **Can** measure: whether the capture pipeline produces the requested slots (extraction quality), and whether a candidate
  parameter reached the app at all.
- **Cannot** measure: whether a *capture-UX* parameter makes a human faster or more accurate. `placeholder`, `autoFocus` and
  `initialOp` change guidance, focus and operator defaults — with an automated driver the completion outcome is identical in
  both arms, so the arms can only ever tie on the completion metric.
- **Consequence:** an `improved` verdict on the capture seam requires either (a) an arm whose effect is machine-observable in
  the outcome (e.g. an extraction-affecting parameter), or (b) a human-in-the-loop protocol. E2.8 must not be attempted on the
  strength of an automated `no-difference`.

#### E2.5 root-cause fixes (2026-11-09)

| Fix | File(s) |
|-----|---------|
| Deleted 247 stale compiled `.js`/`.js.map` files in `core/src` (gitignored, shadowed `.ts` sources in Vite; caused false "module has no export" and `__name` errors) | `core/src/**` (untracked artifacts) |
| Corrected all 113 named re-exports in the browser entry; removed type-only values (`Note`, `SortOrder`, `PrivacyLevel`, `GeoCoords`, `SuggestedAttribute`, `ExtractionResult`) from runtime blocks; pointed `detectConflicts`, `MatchEngine`, `PropertyExtractor`, `NOTE_STATUS`, geo helpers, `SHARED_COMMANDS`, `DATE_PROPERTY_KEYS`, `hexToBytes`, `formatPropertyTag`, providers, `SEMANTIC_NOTE_KIND`, `areNotesEqual`, `metaphorMapper`, `validateAttributeValue` at their real modules | `core/src/index.browser.ts` |
| Vite alias order: explicit `@notention/core/*` subpaths must precede the general `@notention/core` alias | `ui/vite.config.ts` |
| Mirror core's tsup browser-twin rewrite in the dev server (`telemetry/ledger` etc. → `.browser.ts`), restricted to `core/src` importers | `ui/vite.config.ts` |
| Define `global`; add `Buffer` polyfill import; add `browser`/`version` to `window.process` shim (readable-stream v2) | `ui/vite.config.ts`, `ui/index.html`, `ui/src/index.tsx`, `ui/src/polyfills/buffer.ts` |
| Guard `process.stdout?.isTTY` | `core/src/events/ConsoleSink.ts` |
| Idempotent strategy registration + single-flight `initializeStrategySystem` (StrictMode double-effect) | `ui/src/hooks/strategyResolverInit.ts` |
| `tsup` node build `splitting: true` (was `false` → each entry inlined its own singleton registries; `ui/strategy.js` and `ui/profile.js` disagreed) | `core/tsup.config.ts` |
| Fixed syntax errors: duplicate `ClockIcon` import; inline async arrow in JSX prop | `ui/src/components/sidebar/SortSelector.tsx`, `ui/src/components/editor/PropertyForm.tsx` |
| Aligned property-extractor tests with `confidence`/`provenance` fields (`objectContaining`) | `core/src/tests/propertyExtractor.test.ts` |

**Validation:** `pnpm build` exit 0 (all workspaces); `core` tests 522/522; dev server + production preview both mount React.

**E2.6 clarification (resolved):** the validation split now holds **10** `capture_need` cases (`intent-capture-{010,011,016,017,018,019,020,021,026,027}.json`). Harness loads max 10.

**Case-level caveat:** `intent-capture-011` ("Need to organize a meal train for the new parents on Maple Street") requires a
`deadline` but its prompt carries no temporal cue, so no text-only extractor can satisfy it. It fails identically in both
arms and therefore does not bias the comparison; it caps the completion rate at 90%. The case file was **not** edited — the
evaluation set is ground truth.

**Known non-blocking noise:** expected "Offline" sync error (no backend). React warnings for ref on `Search` (`Input` needs
`forwardRef`) and `tooltipPosition` leaking to DOM in `Button` were fixed under P2.4/P2.4b.

---

### **E13: Prompt Ablation (S-PROMPT)**

**Status:** 6 variants ready, 38 quality cases, CLI `prompts:eval ablation` exists. **Blocked:** No local LLM provider (needs llama.cpp). **Deferred** until E15 complete.

---

### **E7/E14: Ontology Drift (S-ONT)**

**Status:** Audit done (67 orphans, 9 drifts, 1 hierarchy lift=5.30). Patch test non-regressive (ΔF1=0.000). **Deferred** until E15/E2/E13 yield results. No corpus → no signal.

---

## ✏️ Editor Modernization (E15 — Strategic, P3)

**Premise correction:** Tiptap `3.33.0` already supports React 19 (`peer: react ^17 || ^18 || ^19`). The earlier React 19 blocker was `@vitejs/plugin-react@6.3.0` importing `vite/internal` (not exported by Vite 6/7), **unrelated to Tiptap**. UI also has no React plugin at all (no Fast Refresh). React 19 is therefore an independent, small unblock — not a reason to replace the editor.

**Diagnosis (why the editor feels wrong):**

| # | Problem | Evidence |
|---|---------|----------|
| 1 | HTML is source of truth; properties re-derived on every save | `core/src/types/domain.ts:15`, `core/src/notes/notes.ts:52` |
| 2 | Double representation: `<span data-type="property">` + `Property[]`, synced by string surgery | `core/src/notes/serialization.ts:37`, `ui/src/hooks/editor/useNoteProperties.ts:34` |
| 3 | Chips are inline atoms (`group:'inline', atom:true`) — fragile selection/move/backspace | `ui/src/components/editor/PropertyExtension.ts:7` |
| 4 | React-in-ProseMirror coupling; 12 files import `@tiptap/*` | `TiptapEditor.tsx`, `extensions.ts`, `EditorBubbleMenu.tsx` |
| 5 | Full-content reparse per edit | `core/src/notes/notes.ts:52` |
| 6 | Progressive disclosure unmet (no canonical/raw view, no parser debugger) | README2 §12.4 |
| 7 | CRDT/CBOR/agent paths all begin by parsing HTML | README2 (specified, not complete) |

**Target architecture:**

```
Note
├─ document: NoteDocument (JSON, canonical)      ← new source of truth
│   ├─ blocks[]            (paragraph | heading | list | quote | code)
│   ├─ text runs           (plain text + marks)
│   └─ propertyRefs[]      (stable id → Property) ← inline annotation, not markup
├─ properties: Property[]  (projection; deterministic, stable ids)
└─ contentHtml: string     (export/import only — Nostr, clipboard, preview)

Editor engine  → renders NoteDocument (Tiptap/PM/Lexical interchangeable)
Persistence    → JSON (later CBOR/CRDT/agent-native)
```

**Gate:** Better editor UX + lossless structured persistence, without breaking E2 or Nostr tag parity. No engine swap before E15.3 data.

| Step | Action | Effort | Status |
|------|--------|--------|--------|
| **E15.0** | **React 19 unblock** — add Vite-compatible React Fast Refresh plugin; bump UI + simulator to React 19; verify Tiptap 3.33 | 0.5–1d | ✅ COMPLETE |
| | **Validation** | `pnpm build` succeeds (all workspaces); core tests 485/485; agent 17/17; cli 6/6; optimize 47/47; simulator 37/37; UI tests pass (known pre-existing failures only); dev server + production preview both mount React; Tiptap 3.33 peer dep satisfied (`react ^17 || ^18 || ^19`) | |
| **E15.1** | **Structured `NoteDocument`** — schema + PM JSON ⇄ NoteDocument adapters; importer for existing HTML notes; JSON canonical; HTML export-only | 2–3d | ✅ COMPLETE |
| | **Validation** | `pnpm build` succeeds (all workspaces); core tests 508/508; all workspace tests pass; NoteDocument schema in `core/src/types/noteDocument.ts`; adapters in `core/src/notes/noteDocumentAdapter.ts`; Note type extended with `document` and `contentHtml`; conversion pipelines in `core/src/notes/notes.ts`; round-trip tests in `core/src/notes/noteDocumentAdapter.test.ts` | |
| **E15.2** | **Chip UX on structured model** — annotation selection/edit/move/delete, keyboard/undo, paste/export, suggestion palette rework | 2–3d | ✅ COMPLETE |
| | **Validation** | `pnpm build` succeeds (all workspaces); all tests pass; PropertyMark in `ui/src/components/editor/PropertyMark.ts`; PropertyChip updated for mark view; usePropertyInsertion uses marks with propertyId; useEditorClick detects marks; InsertPropertyModal passes propertyId; TiptapEditor updated | |
| **E15.3** | **Engine decision gate** — measure suggestion authoring, NodeView/plugin complexity, bundle size, React 19 behavior; ADR (stay Tiptap / PM-direct / Lexical) | 0.5d | ✅ COMPLETE |
| | **Validation** | ADR 013 written: stay Tiptap 3.x (React 19 verified, bundle acceptable, NoteDocument aligned, zero migration); React 19 Fast Refresh works; PropertyMark eliminates NodeView fragility; Tiptap 3.33 peer dep satisfied | |
| **E15.4** | *(Future)* CRDT (`y-prosemirror`/Yjs), canonical CBOR content addressing, agent-native edits | deferred | Deferred |

**ADRs / deliverables:**
- `doc/decisions/012-note-document.md` — structured document schema + migration
- `doc/decisions/013-editor-engine.md` — engine decision from E15.3 data

**What the investment buys:** lossless structured persistence, CRDT-ready documents, agent-native editing, canonical identity, real progressive disclosure, metaphor/note-defined UI projection, engine independence, no per-keystroke reparse.

**Risks:** migration needs importer + round-trip tests; verify Nostr tag parity (tags derive from `properties`); keep sanitization for pasted/remote HTML; never rebuild selection/IME/undo; defer CRDT/CBOR until after E2.

---

## 🔧 P2 Runtime Fixes (Blocking E2 — Must Complete Before Experiments) — **PRODUCTION ✅ / DEV MODE ✅**

The following runtime errors blocked reliable E2 measurement. Production build issues are fixed; dev mode issues are now resolved.

| Issue | Root Cause | Fix Applied | Status |
|-------|------------|-------------|--------|
| **P2.1** `__name is not defined` in dynamic chunks (prod) | Vite code-splits into multiple chunks; `namePolyfillPlugin` only injected into main entry chunk. | `namePolyfillPlugin.generateBundle` now injects `__name` polyfill into **every** chunk (verified all chunks have polyfill). | **PROD ✅** |
| **P2.1b** `__name is not defined` in dev mode | **Misdiagnosed on 2026-11-09.** The real cause is not the browser polyfill: `tsx` compiles with esbuild `keepNames: true`, which wraps every nested function in a `__name(...)` call. Playwright serializes evaluated functions into the page — the *call* survives, its helper definition does not. | Init scripts that cross the Playwright boundary are now injected as **source text** (no function reference), and a `globalThis.__name` shim is installed as the very first init script so any remaining evaluated function resolves it. | **DEV ✅ (verified: 0 `__name` errors in the E2 run)** |
| **P2.2** `Cannot read properties of undefined (reading 'enabled')` | **Misdiagnosed on 2026-11-09.** Not the network registry: `Journal.record()` (browser build) read `this.config.enabled` while `this.config` was still `undefined` — the IndexedDB config load is async, the record call is sync. | `Journal` now initialises `config` to the disabled default, hydrates it through a single-flight `init()` promise, and queues events recorded before hydration instead of dropping them. | **DEV ✅ (verified: 0 `enabled` errors in the E2 run)** |
| **P2.3** Nostr relay connection errors (noise) | App logs were suppressed, but the *browser* still logged handshake failures: `useBackgroundMatcher` subscribed to public relays as soon as a note existed. | Added a `network` capability (default off outside production). Outbound relay traffic is opt-in; dev/test stay local-first. | **✅ COMPLETE (verified: 0 relay errors in the E2 run)** |
| **P2.4** React prop warnings: `tooltipPosition` | `IconButton` component spread `tooltipPosition` to DOM button element via `...domProps`. | Added explicit `delete domProps.tooltipPosition` in `IconButton`; verified no leakage. | **DEV ✅** |
| **P2.4b** React prop warnings: `icon` on `button` | `Button` component received `icon` prop via spread in `NetworkManagementSection`; spread to DOM button. | Fixed `NetworkManagementSection` to use `leftIcon`; added defensive `delete domProps.icon` in `Button` component. | **DEV ✅** |
| **P2.5** Dev server crash after arm A | Vite dev server process killed (SIGTERM). | Not reproducible: the dev server stayed up for the full 60-run E2 execution. | **✅ VERIFIED** |
| **P2.6** Harness diagnostics | The runner registered `console`/`pageerror` listeners *after* `page.goto`, so load-time errors were silently missed, and it re-registered them on every case (duplicating output). | Listeners are attached once per page, before navigation, and print full stacks. | **✅ COMPLETE** |

**Gate:** Dev mode must be clean (no `__name`, no `enabled` errors, no React prop warnings) before E2 experiment can run with reliable measurements. **✅ GATE PASSED — verified by the 2026-11-10 E2 run: 0 console errors, 0 page errors across 60 runs.**

---

## 🚫 Explicitly Deferred / Removed (Peripheral or Invasive)

| Item | Category | Reason |
|------|----------|--------|
| Production build fix via `export type` → `export` | Core (invasive) | Breaks type safety |
| Persistent Chrome profile (`launchPersistentContext`) | UI/Peripheral | PNA bypass flags work; keep simple |
| Full simulator regression suite for E2 | Simulator (peripheral) | E2 uses UI eval harness, not simulator |
| Fleet/telemetry/upload | Infra (peripheral) | Local-first is the moat |
| Phase 6 Synthesis | Process (peripheral) | Wait for first `improved` verdict |
| New scenarios | Data (peripheral) | 13 existing carry signal per B2.5 |
| E13 llama.cpp provider | Optimize (peripheral) | Blocked on P1 core/UI fixes |
| E7/E14 ontology drift | Simulator/Optimize (peripheral) | Deferred until E2/E13 yield results |
| Editor engine swap (Lexical / PM-direct) | Editor (invasive) | Defer to E15.3 data-backed decision; no swap before structured model |
| Custom contenteditable from scratch | Editor (high risk) | Tarpit (selection/IME/undo); rejected unless editor stops being rich text |
| CRDT / canonical CBOR / agent-native doc | Editor/Protocol (future) | Behind E15.1 structure + E2; specified, not complete |

---

## 📋 Execution Order (No Parallel Tracks)

```
P0: Tooling/Deps update (T1–T5)  ← ✅ COMPLETE
P0: tsup build fix (1 day)       ← ✅ COMPLETE
  │
  ├─→ E15: Editor Modernization (P2)
  │     ├─→ E15.0: React 19 unblock (Fast Refresh + bump)  ← ✅ COMPLETE
  │     ├─→ E15.1: Structured NoteDocument (JSON canonical, HTML export-only)  ← ✅ COMPLETE
  │     ├─→ E15.2: Chip UX on structured model  ← ✅ COMPLETE
  │     ├─→ E15.3: Engine decision gate (stay Tiptap / PM / Lexical)  ← ✅ COMPLETE
  │     └─→ E15.4: CRDT/CBOR/agent-native (deferred)
  │
  ├─→ P2: Runtime Fixes (BLOCKING E2)
  │     ├─→ P2.1: __name polyfill in all chunks (prod)  ← ✅ COMPLETE
  │     ├─→ P2.1b: __name in dev mode (tsx keepNames, not the browser)  ← ✅ COMPLETE
  │     ├─→ P2.2: Journal config race ('enabled')  ← ✅ COMPLETE
  │     ├─→ P2.3: Nostr relay noise (network egress opt-in)  ← ✅ COMPLETE
  │     ├─→ P2.4: React prop warnings (tooltipPosition, icon)  ← ✅ COMPLETE
  │     ├─→ P2.5: Dev server stability  ← ✅ VERIFIED during E2.6
  │     └─→ P2.6: Harness diagnostics (listeners before navigation, no duplicates)  ← ✅ COMPLETE
  │
  ├─→ P2x: Instrument Integrity (BLOCKING any verdict)
  │     ├─→ Candidate patch must reach the app (StrategyResolver merges defaultProps)  ← ✅ COMPLETE
  │     ├─→ Criterion reachability (request-slot extraction + request ontology domain)  ← ✅ COMPLETE
  │     └─→ Explicit verdict: invalid when unmeasurable  ← ✅ COMPLETE
  │
  ├─→ E2: Capture-Flow A/B Experiment (P3; after P2 + P2x)
  │     ├─→ E2.1–E2.5, E2.5a–f: ✅ COMPLETE
  │     ├─→ E2.6: Run experiment  ← ✅ EXECUTED (verdict: invalid — metric cannot discriminate)
  │     ├─→ E2.6a–c: Instrument integrity  ← ✅ COMPLETE
  │     ├─→ E2.7: Next step from the verdict  ← ⏳ R4 (pick a measurable experiment)
  │     ├─→ E2.8: Revision + consent  ← ✅ N/A (no winner)
  │     └─→ E2.9: Ledger chain + write-up  ← ✅ `doc/evidence/2026-11-e2-results.md`
  │
  ├─→ E13: llama.cpp provider + ablation (P4; after E2)
  │     └─→ Winner → property-extraction@2
  │
  └─→ E7/E14: Only if corpus available & E2/E13 null (P4)
```

---

## 🛡️ Quality Gates (Non-Negotiable)

| Gate | Enforcement |
|------|-------------|
| **Powered or silent** | MDE gate in `verdicts.ts`; n<required → `invalid` |
| **Measured > observed** | `evidenceClass` gate; synthetic = `hypothesized` |
| **Honest negatives** | Null verdict = publish with full chain |
| **Consent is product** | Revision consent flow mandatory |
| **WIP limit** | One experiment at a time |
| **Intervention must land** (new, 2026-11-10) | The harness observes the candidate's effect in the running app; if it never appears → `invalid: intervention-not-applied` |
| **Unmeasurable ≠ null** (new, 2026-11-10) | Zero discordant pairs → `invalid: metric-cannot-discriminate`; never "no significant difference — retain incumbent" |

---

## 🐛 Dev-Mode Fixes Required (P2.1b–P2.6) — **✅ COMPLETE AND VERIFIED**

The issues below were discovered during the E2.6 runs. The first diagnosis (2026-11-09) was wrong on P2.1b and P2.2;
the corrected root causes are in §P2 above.

| Issue | Symptom | Count | Corrected Root Cause | Fix Applied |
|-------|---------|-------|----------------------|-------------|
| **P2.1b** `__name is not defined` | ReferenceError in browser console | 1 per page load | `tsx` compiles with esbuild `keepNames: true`; Playwright serializes evaluated functions into the page, so the `__name(...)` call survives without its helper | Init scripts crossing the Playwright boundary are injected as source text; a `globalThis.__name` shim is installed as the first init script (`optimize/src/optimizer/evaluation/browserEnv.ts`) |
| **P2.2** `Cannot read properties of undefined (reading 'enabled')` | TypeError in browser console | 2 per capture | `Journal.record()` read `this.config.enabled` before the async IndexedDB config load resolved | `Journal` defaults `config` to disabled, hydrates via a single-flight promise, and queues early events (`core/src/telemetry/journal.browser.ts`) |
| **P2.3** Nostr relay handshake failures | Browser console noise | 2 per page | `useBackgroundMatcher` subscribed to public relays whenever a note existed | `network` capability — outbound relay traffic is opt-in, off by default outside production |
| **P2.4** React prop warnings: `tooltipPosition` | "React does not recognize the `%s` prop on a DOM element" | 25+/page load | `IconButton` spread `tooltipPosition` to DOM button via `...domProps` | Added explicit `delete domProps.tooltipPosition` in `IconButton` |
| **P2.4b** React prop warnings: `icon` on `button` | "Invalid value for prop `%s` on `<%s>` tag" | 25+/page load | `Button` received `icon` prop via spread in `NetworkManagementSection` | Fixed `NetworkManagementSection` to use `leftIcon`; added defensive `delete domProps.icon` in `Button` |
| **P2.5** Dev server crashes after arm A | `Preview server exited with code 143` (SIGTERM) | 1/run | Vite dev server process killed | Not reproducible — the dev server stayed up for the whole 60-run E2 execution |
| **P2.6** Missing load-time errors | Silent failures | — | The runner attached `pageerror` listeners *after* `page.goto` | Listeners attached once per page, before navigation, printing full stacks |

**Validation:** the 2026-11-10 E2 run (60 browser runs) produced **0 console errors and 0 page errors**.

---

## 📦 Deliverables per Experiment / Track

| Experiment / Track | Required Artifacts | Timing |
|------------|-------------------|--------|
| **E15** | `doc/decisions/012-note-document.md` + `doc/decisions/013-editor-engine.md` + migration/round-trip tests | **E15.0–15.3 ✅** (schema, adapters, chip UX, engine ADR done) |
| **P2 Runtime Fixes (PROD)** | Clean console (no `__name`, no `enabled` errors, no Nostr noise) + dev server + production preview both mount | **✅ COMPLETE** |
| **P2 Runtime Fixes (DEV)** | Clean dev-mode console + stable dev server | **✅ COMPLETE — verified by a 60-run E2 execution** |
| **P2x Instrument Integrity** | Candidate patch observable in the app; verdict is `invalid` when unmeasurable | **✅ COMPLETE** |
| **E2** | `doc/evidence/2026-11-e2-results.md` + ledger chain (`optimizer:cycle:started` → `optimizer:candidate:evaluated` ×2 → `optimizer:cycle:completed`) + raw run `optimize/results/e2-capture-2026-11-10.json` (void pre-fix run kept as `…-void.json`) | **✅ COMPLETE — verdict `invalid` (honest, instrument-backed)** |
| E13 | `doc/evidence/2026-11-e13-results.md` + `property-extraction@2` | After E2 |
| E7/E14 | `doc/evidence/2026-11-e7-results.md` (if run) | After E2/E13 |

---

## 🔭 Remaining Work (facilitated — what to do next)

Ordered by what unblocks the most.

| # | Item | Why it matters | Unblocked by |
|---|------|----------------|--------------|
| **R1** | **Close E2 as `invalid`, not null.** Record that the capture-UX seam needs either an arm whose effect is machine-observable in the outcome (e.g. `maxProperties`, `fuzzyThreshold`) or a human-in-the-loop protocol. | An `improved` verdict is unreachable for `placeholder`/`autoFocus` with an automated driver — the arms can only tie on completion. | ✅ done (E2.6, `doc/evidence/2026-11-e2-results.md`) |
| **R2** | **E2.8 (revision + consent)** — mark **N/A**: no candidate won, so there is nothing to consent to. | Consent is a product gate; a revision without a winner would be theatre. | ✅ done |
| **R3** | **E2.9 close-out** — ledger chain + write-up committed with the raw run. | The plan must reflect the run that happened. | ✅ done |
| **R4** | **Pick the next experiment (one at a time).** Candidates: (a) an extraction-affecting parameter on the capture seam (machine-observable), (b) E13 prompt ablation once a local provider exists, (c) E7/E14 ontology drift once a corpus exists. | Keeps the WIP limit at one experiment and avoids re-running an unmeasurable design. | R1 |
| **R5** | **Re-verify the ontology after the `request` domain landed.** The new `need`/`schedule`/`frequency` attributes change key counts; E7's orphan/drift numbers (67 orphans, 9 drifts) are stale. | Ontology drift metrics are only meaningful against a current ontology. | R4 |
| **R6** | **Wire the `property-form` strategy's `initialOp`/`isAdding`** the same way `quick-capture` now is — the ParamSpec still promises behaviour the editor's property form does not implement. | Same defect class as D1; it will bite the next capture-seam candidate. | R4 |
| **R7** | **Remove or wire `DashboardQuickCapture`** — dead component (exported from the barrel, rendered nowhere) that duplicates the capture flow and would drift. | Duplicated capture logic is a trap for the next candidate. | R4 |
| **R8** | **Add a `timeToCapture` metric that is not harness-dominated** (e.g. time from first keystroke to submit) if timing is ever to be a primary metric. | The current metric is ~90 % fixed waits; it moves with machine load, not with the candidate. | R4 |

---

## ⚡ Acceleration Tactics

1. **Foundational first** — Core/UI/build fixes (P0–P1) block everything else. No peripheral work until done.
2. **Dev server for E2** — Works today, no build fix needed. Use for E2 only.
3. **tsup for all builds** — Single config change fixes production build for E13+.
4. **Embedded llama.cpp first** — Zero-config, no server management. Server mode later if needed.
5. **Skip simulator for E2** — UI eval harness is the measurement tool per B1/B2.
6. **No new test infrastructure** — Reuse existing `optimizer e2-capture` and `prompts:eval`.
7. **Structure before engine** — E15 makes `NoteDocument` JSON canonical before any engine swap. Never migrate engines to fix a data-model problem.
8. **React 19 is not an editor decision** — Tiptap 3.33 supports React 19; unblock it separately (E15.0), with Fast Refresh.

---

## 🔧 Browser Build Fixes (E2.2 — ✅ COMPLETE)

### Issues Fixed

1. **Dynamic import in `strategyResolverInit.ts`** — Fixed using `import.meta.glob` for Vite-compatible dynamic imports
2. **Test files in production build** — Added `excludeTestsPlugin` to exclude `.test.`, `.spec.`, `/tests/`, `/test/` files
3. **`__name` dev-only leak** — Fixed by collapsing ALL node_modules into single `vendor` chunk (Rollup's shared CJS helpers (`commonjsGlobal`) created cross-chunk cycles when split); removed failed `removeDevOnlyPlugin` regex approach
4. **`fs` module leaks** — Fixed via `core/tsup.config.ts` browser-variant rewrite: rewrites relative imports to `.browser.ts` twins (journal, revisionStore, ledger, ProfileRegistry, common) so Node `fs`/`better-sqlite3` never enter browser bundle
5. **`fs/promises` subpath resolution** — Same fix as #4
6. **Vitest leak into UI bundle** — Removed `testUtils` export from `core/src/index.browser.ts`; vitest/chai no longer pulled into UI
7. **Core browser build contamination** — Deleted 245 stale `.js`/`.d.ts` artifacts in `core/src`/`ui/src` that shadowed `.ts` sources; rebuilt core cleanly

### Files Modified (final)

- `core/tsup.config.ts` — Browser-variant rewrite plugin for safe twin set
- `core/src/index.browser.ts` — Removed `testUtils` export, deduped decls
- `core/src/network/RobustWebSocket.ts` — Added `fallbackToOfflineMode()` + `status_change` events (fixes AgentService call)
- `ui/vite.config.ts` — Single `vendor` chunk for all node_modules (OOM fix + `__name` cycle fix)
- `ui/src/hooks/strategyResolverInit.ts` — Fixed dynamic imports + updated to core's new `getStrategiesForSeam`/`getStrategy` API
- `ui/src/strategies/strategyConfigs.ts` — Rewritten to use core's `STRATEGY_CONFIGS` generated source + `componentMap`
- `ui/public/polyfills/fs/index.js`, `promises.js` — fs polyfills (fallback, no longer primary fix)

### Validation

- `pnpm build` succeeds across all workspaces (core + ui)
- Core tests: 485/485 pass (`pnpm --filter @notention/core test`) — includes shared-singleton fixes from `splitting: true`
- Dev server: React mounts (`quick-capture-input: true`, 57,555-char root), no page errors
- Production preview: same mount, no page errors
- Console: only expected "Offline" sync (no backend) plus two pre-existing React warnings (ref on `Input`, `tooltipPosition` on `Button`)
- Strategy registration: all 7 register; re-initialization is idempotent

### Remaining Component Errors — ✅ RESOLVED (E2.5)

1. `ReferenceError: suggestions is not defined` — resolved: `TiptapEditor` passes `allSuggestions`; stale compiled JS in `core/src` was the actual trigger.
2. `__name is not defined` — resolved: deleted 247 stale `.js` artifacts in `core/src`; production `renderChunk` polyfill retained.
3. `Cannot read properties of undefined (reading 'enabled')` — not reproducible after the stale-artifact cleanup; no live prop-drilling bug found. Re-open only if it reappears in E2.6 with a stack.

E2.5 stayed narrow: no editor refactor. Chip UX work remains E15.2.