# TODO.15 — Consolidated Experiment Execution Plan

**Supersedes:** TODO.14.md (replaces entire next-hypothesis-cycle section)
**Date:** 2026-11-07
**Status:** Phases A–D complete. E2 infrastructure complete. Production build blocked on type exports.

---

## 🎯 Single Goal

**Execute one powered experiment end-to-end with full ledger chain**, then stop and evaluate.

Success metric: `simulator:friction-detected → candidate:evaluated (measured, powered) → verdict → revision:consented → simulator:confirmed → journal:friction-reduced` (or honest null).

---

## 🔴 Critical Blocker (Must Fix First)

### **P0: Production Build Type Export Fix** — 1 day
**Problem:** React app 0% completion in production build. Root cause: `tsc` emits empty files for `export type` / `export interface` re-exports.

**Fix (Option A — recommended):** Replace `tsc` with `tsup` for ALL core builds.
- `tsup` preserves type exports in bundled output
- Single config change, no source modifications
- Already working for browser entry point

**Implementation:**
```json
// core/package.json
"scripts": {
  "build": "tsup",
  "build:types": "tsc --emitDeclarationOnly --noEmit false"
}
```

**Validation:** `pnpm build` → `pnpm --filter @notention/ui build` → production build mounts.

**Rollback:** If `tsup` breaks Node.js entry, keep `tsc` for Node, `tsup` for browser only.

---

## 🧪 Experiment Pipeline (One at a Time)

### **E2: Capture-Flow A/B (S-UI)** — 2 days
**Status:** Infrastructure ✅ (Chrome PNA fixed, test runs, stats work)
**Blocker:** Production build → use **Vite dev server** (works today)
**Goal:** 10 intent cases × 3 reps, powered verdict

| Step | Action | Time |
|------|--------|------|
| E2.1 | Run against Vite dev server (10×3) | 4h |
| E2.2 | If null: add 5 more cases, re-run | 2h |
| E2.3 | If improved: create revision, consent, re-sim | 2h |
| E2.4 | Ledger chain + write-up | 1h |

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
P0: tsup build fix (1 day)          ← UNBLOCKS EVERYTHING
  │
  ├─→ E2: dev server, 10×3, verdict (2 days)
  │     └─→ If null: more cases / If improved: revision + re-sim
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
| 1 (Nov 7–13) | P0 tsup fix → E2 dev server run → verdict |
| 2 (Nov 14–20) | E13 llama.cpp provider → ablation → winner |
| 3 (Nov 21–27) | Buffer / E7/E14 if needed / write-ups |

**Total: 2–3 weeks for one powered experiment with full chain.**

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