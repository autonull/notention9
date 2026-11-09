# TODO.15 — Consolidated Experiment Execution Plan

**Supersedes:** TODO.14.md (replaces entire next-hypothesis-cycle section)
**Date:** 2026-11-08
**Status:** P0 ✅ COMPLETE. E2.1 ✅. E2.2 production-build fixes: OOM FIXED ✅, vitest-leak FIXED ✅, dev-server dep-scan errors FIXED ✅, `__name`/fs leaks FIXED ✅. **E2.4 strategy registration bug FIXED ✅** — all 7 strategies register. **E2.5: Pre-existing component errors block experiment** — `suggestions` ReferenceError, `__name` in lazy chunks, `enabled` prop drilling. Must fix before E2.6 run.

**E2 Experiment Status:** Preview server starts, React mounts, Playwright test executes 10 cases × 3 reps × 2 arms with statistical analysis (McNemar, Wilcoxon). Strategy registration bug FIXED ✅ — all 7 strategies now register. **Experiment blocked by 3 pre-existing component errors** (see E2.5): `suggestions is not defined`, `__name` in lazy chunks, `enabled` prop drilling. Must fix before powered run.

---

## 🎯 Single Goal

**Execute one powered experiment end-to-end with full ledger chain**, then stop and evaluate.

Success metric: `simulator:friction-detected → candidate:evaluated (measured, powered) → verdict → revision:consented → simulator:confirmed → journal:friction-reduced` (or honest null).

---

## 🔧 Tooling & Dependencies Update (P0 — Do First)

**Update all tooling and dependencies before any code changes.** This prevents version conflicts, deprecated package issues, and ensures compatibility with modern APIs.

| Task | Scope | Current → Latest | Risk |
|------|-------|------------------|------|
| **T1** | Root workspace | `@playwright/test` 1.60→1.65, `playwright` 1.60→1.65, `vitest` 4.1→5.1, `zod` 3.25→4.6, `date-fns` 4.1→4.4, `uuid` 9.0→14.0, `ws` 8.20→8.22, `typescript` 5.9→7.0, `tsx` 4.21→4.23, `esbuild` 0.28→0.28.2, `boxen` 8.0→9.0, `ts-morph` 27.0→28.0, `commander` 11.1→15.1, `glob` 13.0→14.0, `undici` 6.29→8.12, `@ai-sdk/openai` 0.0.48→4.0.111, `ai` 3.4→7.0, `express` 4.22→5.3, `ora` 5.4→10.0, `chalk` 4.1→6.0 | Medium — breaking changes in zod v4, ai v7, express v5, playwright v1.65 |
| **T2** | Core | `typescript` 5.9→7.0, `vitest` 4.1→5.1, `zod` 3.25→4.6, `tsx` 4.21→4.23, `@types/node` 20.19→26.6, `esbuild` 0.28→0.28.2, `date-fns` 4.1→4.4, `nostr-tools` 2.23→2.26, `cbor-x` 1.6.4→1.6.9 | High — zod v4, TS 7.0 breaking changes |
| **T3** | UI | `@tiptap/*` 3.23→3.33, `@playwright/test` 1.60→1.65, `dompurify` 3.4→3.17, `@noble/hashes` 2.2→2.4, `tailwindcss` 4.3→4.3.5, `@typescript-eslint/*` 8.59→8.72, `postcss` 8.5→8.5.32, `autoprefixer` 10.5→10.6, `react` 18.3→19.3 (simulator) | High — Tiptap v3.33, React 19, TS ESLint breaking changes |
| **T4** | Simulator | `react` 18.3→19.3, `react-dom` 18.3→19.3, `react-router-dom` 7.15→7.18, `@vitejs/plugin-react` 5.2→6.3, `express` 4.22→5.3, `fluent-ffmpeg` 2.1 (deprecated), `nostr-tools` 2.23→2.26, `chalk` 4.1→6.0 | High — React 19, Express 5, Vite plugin 6 |
| **T5** | Agent/CLI | `ai` 3.4→7.0, `@ai-sdk/openai` 0.0.48→4.0.111, `@modelcontextprotocol/sdk` 1.29→1.32, `express` 4.22→5.3, `typescript` 5.9→7.0, `zod` 3.25→4.6, `uuid` 9.0→14.0, `vitest` 4.1→5.1, `@types/*` deprecated → removed | High — AI SDK v4, MCP SDK, Express 5, zod v4 |

**Action:** Run `pnpm up -L --latest` in each workspace, then `pnpm install`, then `pnpm build` to verify. Fix breaking changes before proceeding.

**Estimated time:** 1 day (parallel across workspaces)

---

## 🔴 Critical Blocker (Must Fix First) — ✅ RESOLVED

### **P0: Production Build Type Export Fix** — ✅ COMPLETE (1 day)
**Problem:** React app 0% completion in production build. Root cause: `tsc` emits empty files for `export type` / `export interface` re-exports.

**Fix (Option A — recommended):** Replace `tsc` with `tsup` for ALL core builds.
- `tsup` preserves type exports in bundled output
- Single config change, no source modifications
- Already working for browser entry point

**Implementation:**
```json
// core/package.json
"scripts": {
  "build": "tsup && pnpm run build:types",
  "build:types": "tsc --emitDeclarationOnly"
}
```

**Changes made:**
- `core/tsup.config.ts`: Added `dts: false` (using separate tsc for types), configured browser/Node entries
- `core/tsconfig.json`: Set `composite: false`, fixed declaration output
- `core/package.json`: Added `build:types` script, chained after `tsup`
- `core/src/utils/mutex.ts`: Added `Mutex` export for agent package
- Fixed `override` modifiers across codebase for TypeScript 5.0+ strict mode
- Fixed `better-sqlite3` type imports
- Fixed `eventSchema.ts` union type narrowing
- Fixed `paramSpec.ts` unreachable code
- Added missing exports in `optimize/package.json` for evaluation modules
- Fixed `cli/src/server-connection.ts` retry options
- Fixed `ui/eval/intentRunner.ts` import paths

**Validation:** ✅ `pnpm build` succeeds across all workspaces

**Rollback:** If `tsup` breaks Node.js entry, keep `tsc` for Node, `tsup` for browser only.

---

## 🏗️ Prioritization: Foundational First (Non-Negotiable)

**Core/UI/Build fixes MUST complete before any peripheral work (simulator, optimize, ablation).**

| Priority | Category | Items | Status |
|----------|----------|-------|--------|
| **P0** | **Tooling/Dependencies** | T1–T5: Update all deps across workspaces (playwright, vitest, zod, typescript, ai, react, etc.) | **NEXT — Do First** |
| **P0** | **Build/Type System** | tsup migration, type exports | ✅ COMPLETE |
| **P1** | **Core/UI Runtime** | Vite aliases, production bundle, strategy registration, component errors | E2.1–E2.4 ✅, **E2.5 NEXT** |
| **P2** | **Experiment Execution** | E2.6–E2.9 run, verdict, ledger | Blocked on P1 |
| **P3** | **Peripheral/Optional** | E13 llama.cpp ablation, E7/E14 ontology drift | Deferred until P2 done |

**Rule:** No work on P3 until P1 + P2 complete. No parallel tracks. P0 Tooling must complete before P0 Build.

---

## 🧪 Experiment Pipeline (One at a Time)

### **E2: Capture-Flow A/B (S-UI)** — 2 days
**Status:** Infrastructure ✅ (Chrome PNA fixed, test runs, stats work). **Production build FIXED** — Vite dev server works, production build succeeds, no OOM, no browser errors, React mounts in preview.
**E2.3 attempted:** Test executes end-to-end, statistical analysis runs, but 0% completion due to strategy registration bug (UI issue, not infrastructure).
**Goal:** 10 intent cases × 3 reps, powered verdict

| Step | Action | Time | Status |
|------|--------|------|--------|
| E2.1 | Fix Vite aliases for `@notention/core` subpaths | 2h | ✅ COMPLETE |
| E2.2 | Fix production bundle browser errors (`__name`, `fs` leaks) | 4h | ✅ COMPLETE |
| E2.3 | Run against preview server (10×3) | 4h | ✅ INFRASTRUCTURE WORKS; 0% completion (strategy registration bug) |
| E2.4 | Fix strategy registration bug (glob path match) | 1h | ✅ COMPLETE |
| E2.5 | Fix pre-existing component errors blocking experiment | 2h | **NEXT** |
|   | └─ E2.5a: `ReferenceError: suggestions is not defined` in `useSmartNoteAssistant` | 1h | Pending |
|   | └─ E2.5b: `__name is not defined` in lazy chunks (polyfill all dynamic imports) | 30m | Pending |
|   | └─ E2.5c: `Cannot read properties of undefined (reading 'enabled')` — prop drilling fix | 30m | Pending |
| E2.6 | Re-run experiment (10×3) | 2h | Pending |
| E2.7 | If null: add 5 more cases, re-run | 2h | Pending |
| E2.8 | If improved: create revision, consent, re-sim | 2h | Pending |
| E2.9 | Ledger chain + write-up | 1h | Pending |

**Gate:** Powered verdict (any sign) + ledger chain recorded.

---

### **E13: Prompt Ablation (S-PROMPT)** — 3 days
**Status:** 6 variants ready, 38 quality cases, CLI `prompts:eval ablation` exists
**Blocker:** No local LLM provider (needs llama.cpp)

| Step | Action | Time |
|------|--------|------|
| E13.1 | Add `llama-cpp` provider (embedded + server mode) | 1d |
| E13.2 | Download model (Qwen2.5-7B-Instruct-GGUF) | 0.5d |
| E13.3 | Run ablation 38×3 on dev server | 4h |
| E13.4 | Register winner as `property-extraction@2` | 1h |
| E13.5 | Ledger chain + write-up | 1h |

**Gate:** Powered verdict + winner registered + ledger chain.

---

### **E7/E14: Ontology Drift (S-ONT)** — On Deck
**Status:** Audit done (67 orphans, 9 drifts, 1 hierarchy lift=5.30). Patch test non-regressive (ΔF1=0.000).
**Decision:** Defer until E2/E13 yield results. No corpus → no signal.

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
P0: Tooling/Deps update (T1–T5) (1 day)  ← **NEXT — Do First**
P0: tsup build fix (1 day)               ← ✅ COMPLETE
  │
  ├─→ E2: Fix Vite aliases → production build → dev server, 10×3, verdict (2-3 days)
  │     ├─→ E2.1: Fix Vite aliases ✅ COMPLETE
  │     ├─→ E2.2: Fix production bundle ✅ COMPLETE
  │     ├─→ E2.3: E2 test infrastructure ✅ COMPLETE
  │     ├─→ E2.4: Fix glob path match ✅ COMPLETE (all 7 strategies register)
  │     ├─→ E2.5: Fix pre-existing component errors (suggestions, __name, enabled)
  │     └─→ E2.6–E2.9: Run experiment, verdict, ledger chain
  │
  ├─→ E13: llama.cpp provider + ablation (3 days)
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

## 📅 Timeline (Optimistic)

| Week | Focus |
|------|-------|
| 1 (Nov 7–13) | **P0 Tooling/Deps (T1–T5)** → P0 tsup fix ✅ → Fix Vite aliases ✅ → Fix production bundle ✅ → E2.4 strategy fix ✅ |
| 2 (Nov 14–20) | **E2.5 component fixes** → E2.6 run experiment → E2.7/E2.8 verdict/consent/sim → E2.9 ledger chain |
| 3 (Nov 21–27) | E13 llama.cpp provider → ablation → winner |
| 4 (Nov 28–Dec 4) | Buffer / E7/E14 if needed / write-ups |

**Total: 4 weeks for one powered experiment with full chain (incl. tooling update).**

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