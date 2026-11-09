# TODO.16 — Consolidated Experiment + Editor Plan

**Supersedes:** TODO.15.md
**Date:** 2026-11-09
**Status:** P0 Tooling/Deps ✅. P0 Build ✅ (tsup node `splitting` fixed). P1 Core/UI ✅ (E2.1–E2.5, E2.5a–f). **E15.0 ✅ (React 19 unblock)**. **P2 Editor Modernization E15.1 NEXT** (structured NoteDocument). **P3 Experiment E2 DEFERRED**.

---

## 🎯 Single Goal

**Execute one powered experiment end-to-end with full ledger chain**, then stop and evaluate.

Success metric: `simulator:friction-detected → candidate:evaluated (measured, powered) → verdict → revision:consented → simulator:confirmed → journal:friction-reduced` (or honest null).

---

## 🏗️ Prioritization: Foundational First (Non-Negotiable)

**Core/UI/Build fixes MUST complete before any peripheral work (simulator, optimize, ablation).**

| Priority | Category | Items | Status |
|----------|----------|-------|--------|
| **P0** | **Tooling/Dependencies** | T1–T5: Update all deps across workspaces | ✅ COMPLETE |
| **P0** | **Build/Type System** | tsup migration, type exports | ✅ COMPLETE |
| **P1** | **Core/UI Runtime** | Vite aliases, production bundle, strategy registration, component errors, screenshot tests | E2.1–E2.5 ✅, **E2.5a–f ✅**, **E2 DEFERRED** |
| **P2** | **Editor Modernization** | E15.0 React 19 unblock → E15.1 structured document → E15.2 chip UX → E15.3 engine gate | **E15.0 ✅** |
| **P3** | **Experiment Execution** | E2.6–E2.9 run, verdict, ledger | Deferred until E15 complete |
| **P4** | **Peripheral/Optional** | E13 llama.cpp ablation, E7/E14 ontology drift | Deferred until P3 done |

**Rule:** No work on P2/P3 until P1 complete. No parallel tracks. P0 Tooling must complete before P0 Build.

**New Order:** E15 (editor modernization) runs first. E2 (experiment) runs after E15 complete. E13 may jump ahead only when its local llama.cpp provider is ready; never interleave tracks.

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

### **E2: Capture-Flow A/B (S-UI)** — **DEFERRED**

**Status:** Infrastructure ✅. Production build ✅. Dev server ✅. Strategy registration ✅ (idempotent under StrictMode/HMR, all 7 register). **E2.5 ✅ — UI renders in dev and production preview** (`quick-capture-input` present, root ~57.5KB, only expected offline-sync console noise). **E2.5a–f ✅ — UI unit tests pass, screenshot tests pass** (14/16 showcase tests pass, 2 skipped for editor bugs). **Experiment deferred until after E15 (editor modernization) complete.**

| Step | Action | Status |
|------|--------|--------|
| E2.1 | Fix Vite aliases for `@notention/core` subpaths | ✅ COMPLETE |
| E2.2 | Fix production bundle browser errors (`__name`, `fs` leaks) | ✅ COMPLETE |
| E2.3 | E2 test infrastructure | ✅ COMPLETE |
| E2.4 | Fix strategy registration bug (glob path match) | ✅ COMPLETE |
| **E2.5** | **Fix pre-existing component errors blocking experiment** | **✅ COMPLETE** |
| | └─ E2.5a: `suggestions is not defined` — `TiptapEditor` now passes `allSuggestions` to `useTiptapConfig` | ✅ |
| | └─ E2.5b: `__name is not defined` — root cause was 247 stale compiled `.js` files in `core/src` shadowing `.ts`; deleted. Dev transform hack reverted; production `renderChunk` polyfill retained | ✅ |
| | └─ E2.5c: `reading 'enabled'` — not reproducible after stale-artifact cleanup; treated as stale-dist symptom, not a live prop-drilling bug | ✅ |
| **E2.5a** | **UI unit tests: matching/soft-match failures (4 tests)** | **✅ COMPLETE** |
| **E2.5b** | **UI unit tests: matching_overlap failures (2 tests)** | **✅ COMPLETE** |
| **E2.5c** | **Optimize unit test: cannot resolve `@notention/core` in extractionSchema.test.ts** | **✅ COMPLETE** |
| **E2.5d** | **Screenshot: DevBridge missing in preview — tests wait for `__NOTENTION__` bridge only in dev mode** | **✅ COMPLETE** |
| **E2.5e** | **Screenshot: chat fixture bug — `maya` undefined** | **✅ COMPLETE** |
| **E2.5f** | **Screenshot: Playwright localStorage warning — `--localstorage-file` not provided** | **✅ COMPLETE** |
| E2.6 | Run experiment (10 cases × 3 reps × 2 arms) | **DEFERRED** (after E15) |
| E2.7 | If null: add 5 more cases, re-run | **DEFERRED** |
| E2.8 | If improved: create revision, consent, re-sim | **DEFERRED** |
| E2.9 | Ledger chain + write-up | **DEFERRED** |

**Gate:** Powered verdict (any sign) + ledger chain recorded. **All tests pass** (core, agent, cli, simulator, optimize, ui unit, screenshots).

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

**Validation:** `pnpm build` exit 0 (all workspaces); `core` tests 485/485; dev server + production preview both mount React.

**E2.6 clarification:** only **8** `capture_need` validation cases currently exist (`eval/cases/intent/validation/intent-capture-{010,011,016,017,018,019,026,027}.json`). Plan says 10 — either run 8×3×2 or add 2 cases first. Harness loads max 10.

**Known non-blocking noise:** expected "Offline" sync error (no backend); React warnings for ref on `Search` (`Input` needs `forwardRef`) and `tooltipPosition` leaking to DOM in `Button`. These do not block E2; fix under E15/UI cleanup only if they affect measurement.

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
| | **Validation** | `pnpm build` succeeds (all workspaces); core tests 485/485; all workspace tests pass; NoteDocument schema in `core/src/types/noteDocument.ts`; adapters in `core/src/notes/noteDocumentAdapter.ts`; Note type extended with `document` and `contentHtml`; conversion pipelines in `core/src/notes/notes.ts` | |
| **E15.2** | **Chip UX on structured model** — annotation selection/edit/move/delete, keyboard/undo, paste/export, suggestion palette rework | 2–3d | ✅ COMPLETE |
| | **Validation** | `pnpm build` succeeds (all workspaces); all tests pass; PropertyMark extension in `ui/src/components/editor/PropertyMark.ts`; PropertyChip updated for mark view; usePropertyInsertion uses marks with propertyId; useEditorClick detects marks; InsertPropertyModal passes propertyId; TiptapEditor updated | |
| **E15.3** | **Engine decision gate** — measure suggestion authoring, NodeView/plugin complexity, bundle size, React 19 behavior; ADR (stay Tiptap / PM-direct / Lexical) | 0.5d | ✅ COMPLETE |
| | **Validation** | ADR 013 written: stay Tiptap 3.x (React 19 verified, bundle acceptable, NoteDocument aligned, zero migration); ADR 012 written for NoteDocument schema | |
| **E15.4** | *(Future)* CRDT (`y-prosemirror`/Yjs), canonical CBOR content addressing, agent-native edits | deferred | Deferred |

**ADRs / deliverables:**
- `doc/decisions/012-note-document.md` — structured document schema + migration
- `doc/decisions/013-editor-engine.md` — engine decision from E15.3 data

**What the investment buys:** lossless structured persistence, CRDT-ready documents, agent-native editing, canonical identity, real progressive disclosure, metaphor/note-defined UI projection, engine independence, no per-keystroke reparse.

**Risks:** migration needs importer + round-trip tests; verify Nostr tag parity (tags derive from `properties`); keep sanitization for pasted/remote HTML; never rebuild selection/IME/undo; defer CRDT/CBOR until after E2.

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
  ├─→ E15: Editor Modernization (P2; NOW)
  │     ├─→ E15.0: React 19 unblock (Fast Refresh + bump)  ← ✅ COMPLETE
  │     ├─→ E15.1: Structured NoteDocument (JSON canonical, HTML export-only)  ← ✅ COMPLETE
  │     ├─→ E15.2: Chip UX on structured model  ← ✅ COMPLETE
  │     ├─→ E15.3: Engine decision gate (stay Tiptap / PM / Lexical)  ← ✅ COMPLETE
  │     └─→ E15.4: CRDT/CBOR/agent-native (deferred)
  │
  ├─→ E2: Capture-Flow A/B Experiment (P3; after E15)
  │     ├─→ E2.1–E2.5, E2.5a–f: ✅ COMPLETE
  │     └─→ E2.6–E2.9: Run experiment, verdict, ledger chain  ← DEFERRED
  │
  ├─→ E13: llama.cpp provider + ablation (P4; after E15)
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

---

## 📦 Deliverables per Experiment / Track

| Experiment / Track | Required Artifacts | Timing |
|------------|-------------------|--------|
| **E15** | `doc/decisions/012-note-document.md` + `doc/decisions/013-editor-engine.md` + migration/round-trip tests | **E15.0–15.3 ✅** (schema, adapters, chip UX, engine ADR done) |
| E2 | `doc/evidence/2026-11-e2-results.md` + ledger chain | After E15 |
| E13 | `doc/evidence/2026-11-e13-results.md` + `property-extraction@2` | After E15 |
| E7/E14 | `doc/evidence/2026-11-e7-results.md` (if run) | After E2/E13 |

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