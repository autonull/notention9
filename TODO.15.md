# TODO.15 — Consolidated Experiment Execution Plan

**Supersedes:** TODO.14.md (replaces entire next-hypothesis-cycle section)
**Date:** 2026-11-07
**Status:** P0 ✅ COMPLETE. Production build unblocked. E2 infrastructure ready (Vite aliases fixed, dev server works, production build works but has memory issues). E2.1 ✅ COMPLETE.

**E2 Experiment Status:** Infrastructure complete. React app not mounting in preview server due to browser errors (`__name is not defined`, `fs` module leaks). Production build succeeds but gets killed by OOM (9.6 MB main bundle). Dev server runs but has dependency optimization issues with playwright-core. Need to resolve browser build issues before E2 can yield valid results.

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
**Status:** Infrastructure ✅ (Chrome PNA fixed, test runs, stats work). **Production build works but OOM** — Vite dev server works, production build succeeds but gets killed by OOM (9.6 MB main bundle). **Browser errors block React mount** — `__name is not defined` (dev-only leak), `fs` module leaks in production bundle.
**Blocker:** Browser build issues prevent React app from mounting in preview server. Need to fix production bundle before E2 can yield valid results.
**Goal:** 10 intent cases × 3 reps, powered verdict

| Step | Action | Time | Status |
|------|--------|------|--------|
| E2.1 | Fix Vite aliases for `@notention/core` subpaths | 2h | ✅ COMPLETE |
| E2.2 | Fix production bundle browser errors (`__name`, `fs` leaks) | 4h | In Progress |
| E2.3 | Run against preview server (10×3) | 4h | Blocked |
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
  ├─→ E2: Fix Vite aliases → dev server, 10×3, verdict (2-3 days)
  │     ├─→ E2.1: Fix Vite aliases ✅ COMPLETE
  │     └─→ E2.2–E2.5: Run experiment (Ready)
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
| 1 (Nov 7–13) | P0 tsup fix → Fix Vite aliases → E2 dev server run → verdict |
| 2 (Nov 14–20) | E13 llama.cpp provider → ablation → winner |
| 3 (Nov 21–27) | Buffer / E7/E14 if needed / write-ups |

**Total: 2–3 weeks for one powered experiment with full chain.**

---

## 🔧 Browser Build Fixes (E2.2 - In Progress)

### Issues Fixed
1. **Dynamic import in `strategyResolverInit.ts`** — Fixed using `import.meta.glob` for Vite-compatible dynamic imports
2. **Test files in production build** — Added `excludeTestsPlugin` to exclude `.test.`, `.spec.`, `/tests/`, `/test/` files
3. **`__name` dev-only leak** — Added `removeDevOnlyPlugin` to strip `__name` from production bundles
4. **`fs` module leaks** — Created comprehensive `fs.browser.js` polyfill with directory-based alias (`fs/` with `index.js` and `promises.js`)
5. **`fs/promises` subpath resolution** — Fixed by using directory-based alias for `fs` instead of file-based

### Remaining Issues
- **Production build OOM** — 9.6 MB main bundle kills build process even with 8GB Node memory. Need code splitting or bundle size reduction.
- **Dev server dependency optimization** — Playwright-core transitive dependency causes crashes during dev server startup. Need to exclude test files from dep scan.

### Files Modified
- `ui/vite.config.ts` — Added plugins, aliases, build config
- `ui/src/hooks/strategyResolverInit.ts` — Fixed dynamic imports
- `ui/public/polyfills/fs/index.js` — fs polyfill
- `ui/public/polyfills/fs/promises.js` — fs/promises polyfill
- `core/tsup.config.ts` — Already had fs externalized for browser

### Next Steps
1. Reduce main bundle size (enable code splitting, analyze bundle)
2. Fix dev server dependency optimization (exclude test directory from dep scan)
3. Re-run E2 experiment once React app mounts in preview server

---

## 🔄 If P0 tsup Fails (Fallback)

```bash
# Keep tsc for Node.js, use tsup only for browser bundle
# core/package.json:
"scripts": {
  "build": "tsc && tsup --config tsup.config.ts",
  "build:browser": "tsup --config tsup.config.ts"
}
```
- Browser bundle from `dist/browser/` via package.json `browser` export
- Node.js from `dist/` via `tsc`
- Vite uses `browser` condition → gets tsup bundle
- No source changes required