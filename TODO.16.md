# TODO.16 — Consolidated Experiment Execution Plan

**Supersedes:** TODO.15.md
**Date:** 2026-11-09
**Status:** P0 Tooling/Deps update next. P0 Build fix ✅. P1 Core/UI: strategy registration ✅, component errors blocking.

---

## 🎯 Single Goal

**Execute one powered experiment end-to-end with full ledger chain**, then stop and evaluate.

Success metric: `simulator:friction-detected → candidate:evaluated (measured, powered) → verdict → revision:consented → simulator:confirmed → journal:friction-reduced` (or honest null).

---

## 🏗️ Prioritization: Foundational First (Non-Negotiable)

**Core/UI/Build fixes MUST complete before any peripheral work (simulator, optimize, ablation).**

| Priority | Category | Items | Status |
|----------|----------|-------|--------|
| **P0** | **Tooling/Dependencies** | T1–T5: Update all deps across workspaces | **NEXT** |
| **P0** | **Build/Type System** | tsup migration, type exports | ✅ COMPLETE |
| **P1** | **Core/UI Runtime** | Vite aliases, production bundle, strategy registration, component errors | E2.1–E2.4 ✅, **E2.5 NEXT** |
| **P2** | **Experiment Execution** | E2.6–E2.9 run, verdict, ledger | Blocked on P1 |
| **P3** | **Peripheral/Optional** | E13 llama.cpp ablation, E7/E14 ontology drift | Deferred until P2 done |

**Rule:** No work on P3 until P1 + P2 complete. No parallel tracks. P0 Tooling must complete before P0 Build.

---

## 🔧 Tooling & Dependencies Update (P0 — Do First)

Update all tooling and dependencies before any code changes. This prevents version conflicts, deprecated package issues, and ensures compatibility with modern APIs.

| Task | Scope | Key Updates |
|------|-------|-------------|
| **T1** | Root workspace | Playwright 1.65, Vitest 5.1, Zod 4.6, TS 7.0, uuid 14, ai 7.0, express 5.3, etc. |
| **T2** | Core | TS 7.0, Vitest 5.1, Zod 4.6, @types/node 26.6, nostr-tools 2.26, cbor-x 1.6.9 |
| **T3** | UI | Tiptap 3.33, React 19 (simulator), Tailwind 4.3.5, TS ESLint 8.72, dompurify 3.17 |
| **T4** | Simulator | React 19, Express 5, Vite React plugin 6.3, fluent-ffmpeg (deprecated), chalk 6.0 |
| **T5** | Agent/CLI | AI SDK v4, MCP SDK 1.32, Express 5, zod v4, uuid v14, deprecated @types removal |

**Action:** Run `pnpm up -L --latest` in each workspace, then `pnpm install`, then `pnpm build` to verify. Fix breaking changes before proceeding.

---

## 🧪 Experiment Pipeline (One at a Time)

### **E2: Capture-Flow A/B (S-UI)**

**Status:** Infrastructure ✅ (Chrome PNA fixed, test runs, stats work). Production build FIXED — Vite dev server works, production build succeeds, no OOM, no browser errors, React mounts in preview. Strategy registration FIXED ✅ — all 7 strategies register. **Experiment blocked by 3 pre-existing component errors** (see E2.5).

| Step | Action | Status |
|------|--------|--------|
| E2.1 | Fix Vite aliases for `@notention/core` subpaths | ✅ COMPLETE |
| E2.2 | Fix production bundle browser errors (`__name`, `fs` leaks) | ✅ COMPLETE |
| E2.3 | E2 test infrastructure | ✅ COMPLETE |
| E2.4 | Fix strategy registration bug (glob path match) | ✅ COMPLETE |
| **E2.5** | **Fix pre-existing component errors blocking experiment** | **NEXT** |
| | └─ E2.5a: `ReferenceError: suggestions is not defined` in `useSmartNoteAssistant` | Pending |
| | └─ E2.5b: `__name is not defined` in lazy chunks (polyfill all dynamic imports) | Pending |
| | └─ E2.5c: `Cannot read properties of undefined (reading 'enabled')` — prop drilling fix | Pending |
| E2.6 | Run experiment (10 cases × 3 reps × 2 arms) | Pending |
| E2.7 | If null: add 5 more cases, re-run | Pending |
| E2.8 | If improved: create revision, consent, re-sim | Pending |
| E2.9 | Ledger chain + write-up | Pending |

**Gate:** Powered verdict (any sign) + ledger chain recorded.

---

### **E13: Prompt Ablation (S-PROMPT)**

**Status:** 6 variants ready, 38 quality cases, CLI `prompts:eval ablation` exists. **Blocked:** No local LLM provider (needs llama.cpp). **Deferred** until E2 complete.

---

### **E7/E14: Ontology Drift (S-ONT)**

**Status:** Audit done (67 orphans, 9 drifts, 1 hierarchy lift=5.30). Patch test non-regressive (ΔF1=0.000). **Deferred** until E2/E13 yield results. No corpus → no signal.

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

---

## 📋 Execution Order (No Parallel Tracks)

```
P0: Tooling/Deps update (T1–T5)  ← NEXT
P0: tsup build fix (1 day)       ← ✅ COMPLETE
  │
  ├─→ E2: Fix Vite aliases → production build → dev server, 10×3, verdict
  │     ├─→ E2.1: Fix Vite aliases ✅ COMPLETE
  │     ├─→ E2.2: Fix production bundle ✅ COMPLETE
  │     ├─→ E2.3: E2 test infrastructure ✅ COMPLETE
  │     ├─→ E2.4: Fix glob path match ✅ COMPLETE (all 7 strategies register)
  │     ├─→ E2.5: Fix pre-existing component errors (suggestions, __name, enabled)
  │     └─→ E2.6–E2.9: Run experiment, verdict, ledger chain
  │
  ├─→ E13: llama.cpp provider + ablation
  │     └─→ Winner → property-extraction@2
  │
  └─→ E7/E14: Only if corpus available & E2/E13 null
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

## 📦 Deliverables per Experiment

| Experiment | Required Artifacts |
|------------|-------------------|
| E2 | `doc/evidence/2026-11-e2-results.md` + ledger chain |
| E13 | `doc/evidence/2026-11-e13-results.md` + `property-extraction@2` |
| E7/E14 | `doc/evidence/2026-11-e7-results.md` (if run) |

---

## ⚡ Acceleration Tactics

1. **Foundational first** — Core/UI/build fixes (P0–P1) block everything else. No peripheral work until done.
2. **Dev server for E2** — Works today, no build fix needed. Use for E2 only.
3. **tsup for all builds** — Single config change fixes production build for E13+.
4. **Embedded llama.cpp first** — Zero-config, no server management. Server mode later if needed.
5. **Skip simulator for E2** — UI eval harness is the measurement tool per B1/B2.
6. **No new test infrastructure** — Reuse existing `optimizer e2-capture` and `prompts:eval`.

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
- Production preview: React mounts (`quick-capture-input: true`, 57KB root), no console errors except expected "Offline" sync (no backend)
- Strategy registration: All 7 strategies now register correctly (was 0/7 before fix)

### Remaining Component Errors (pre-existing, not strategy registration)

1. `ReferenceError: suggestions is not defined` — in `useSmartNoteAssistant` hook, likely minification variable collision
2. `__name is not defined` in lazy-loaded chunks — Rollup helper not polyfilled in dynamic imports
3. `Cannot read properties of undefined (reading 'enabled')` — prop drilling issue in editor components

These are separate from the strategy registration fix and require dedicated debugging.