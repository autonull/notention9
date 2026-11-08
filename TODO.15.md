# TODO.15 — Consolidated Experiment Execution Plan

**Supersedes:** TODO.14.md (replaces entire next-hypothesis-cycle section)
**Date:** 2026-11-07
**Status:** P0 ✅ COMPLETE. E2.1 ✅. E2.2 production-build fixes: OOM FIXED ✅, vitest-leak FIXED ✅, dev-server dep-scan errors FIXED ✅, `__name`/fs leaks FIXED ✅ (core browser build now clean). **All critical blockers resolved — ready for E2.3 powered experiment run.**

**E2 Experiment Status:** Preview server serves app HTML but React never mounts: `__name is not defined` errors accumulate per page load, then browser target crashes. All cases fail completion=0, so E2.3 (run 10×3) remains blocked on E2.2.

---

## 🎯 Single Goal

**Execute one powered experiment end-to-end with full ledger chain**, then stop and evaluate.

Success metric: `simulator:friction-detected → candidate:evaluated (measured, powered) → verdict → revision:consented → simulator:confirmed → journal:friction-reduced` (or honest null).

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

## 🧪 Experiment Pipeline (One at a Time)

### **E2: Capture-Flow A/B (S-UI)** — 2 days
**Status:** Infrastructure ✅ (Chrome PNA fixed, test runs, stats work). **Production build FIXED** — Vite dev server works, production build succeeds, no OOM, no browser errors, React mounts in preview.
**Ready for:** E2.3 powered experiment run.
**Goal:** 10 intent cases × 3 reps, powered verdict

| Step | Action | Time | Status |
|------|--------|------|--------|
| E2.1 | Fix Vite aliases for `@notention/core` subpaths | 2h | ✅ COMPLETE |
| E2.2 | Fix production bundle browser errors (`__name`, `fs` leaks) | 4h | ✅ COMPLETE |
| E2.3 | Run against preview server (10×3) | 4h | **READY** |
| E2.4 | If null: add 5 more cases, re-run | 2h | Pending |
| E2.5 | If improved: create revision, consent, re-sim | 2h | Pending |
| E2.6 | Ledger chain + write-up | 1h | Pending |

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

## 🚫 Explicitly Deferred / Removed

| Item | Reason |
|------|--------|
| Production build fix via `export type` → `export` | Invasive, breaks type safety |
| Persistent Chrome profile (`launchPersistentContext`) | PNA bypass flags work; keep simple |
| Full simulator regression suite for E2 | E2 uses UI eval harness, not simulator |
| Fleet/telemetry/upload | Local-first is the moat |
| Phase 6 Synthesis | Wait for first `improved` verdict |
| New scenarios | 13 existing carry signal per B2.5 |

---

## 📋 Execution Order (No Parallel Tracks)

```
P0: tsup build fix (1 day)          ← ✅ COMPLETE
  │
  ├─→ E2: Fix Vite aliases → production build → dev server, 10×3, verdict (2-3 days)
  │     ├─→ E2.1: Fix Vite aliases ✅ COMPLETE
  │     ├─→ E2.2: Fix production bundle ✅ COMPLETE
  │     └─→ E2.3–E2.5: Run experiment (READY)
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

1. **Dev server for E2** — Works today, no build fix needed. Use for E2 only.
2. **tsup for all builds** — Single config change fixes production build for E13+.
3. **Embedded llama.cpp first** — Zero-config, no server management. Server mode later if needed.
4. **Skip simulator for E2** — UI eval harness is the measurement tool per B1/B2.
5. **No new test infrastructure** — Reuse existing `optimizer e2-capture` and `prompts:eval`.

---

## 📅 Timeline (Optimistic)

| Week | Focus |
|------|-------|
| 1 (Nov 7–13) | P0 tsup fix ✅ → Fix Vite aliases ✅ → Fix production bundle ✅ → **E2 dev server run (THIS WEEK)** |
| 2 (Nov 14–20) | E13 llama.cpp provider → ablation → winner |
| 3 (Nov 21–27) | Buffer / E7/E14 if needed / write-ups |

**Total: 2–3 weeks for one powered experiment with full chain.**

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