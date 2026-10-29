# Notention Development Plan (TODO.6.md)

Consolidated from TODO.5.md. Batches remaining work into 3 focused PRs. Supersedes prior plan.

---

## 0. Current State (Honest)

| Area | State | Blocking |
|------|-------|----------|
| Core semantics | ✅ 360 tests | — |
| UI | ✅ 100+ tests | 2 pre-existing failures |
| Golden Path journey | ✅ Green (optimize) | Clean-profile + human test (G1) |
| Storage | ✅ Schema v1 validation + export/import + recovery/snapshots | Quota mgmt |
| Nostr | 🟡 Works, nonconformant | CBOR, NoteID, signing (Tier 0) |
| Agent | 🟡 Headless OK; UI loop partial | Confirmations, traces, undo |
| Capability security | ✅ Core; UI ✅ | — |
| Pattern recognition | ✅ Engine; UI ✅ | — |
| Metaphor system | ✅ 15 defaults, registry, mapper + visual consumers | — |
| Templates | ✅ Generator + ontology + create-note wiring | — |
| CLI | ✅ Full cockpit + docs | — |
| Simulator | ✅ Movie Studio + scenarios + regression test | Golden Path recording (G6) |
| Engineering confidence | ✅ `pnpm verify` passes (CI gate G0) | — |
| **3 Batches (A/B/C)** | ✅ **ALL COMPLETE** | Gates G1-G6 remain |

---

## 1. Decision Gates (Hard Stops)

| Gate | Question | Status | If No |
|------|----------|--------|-------|
| **G0** | `pnpm verify` 2× in CI under cap? | ✅ **DONE** | — |
| **G1** | Stranger completes Golden Path <2 min unaided? | ⏳ Batch B | Fix W1; no features |
| **G2** | Humans rate ≥70% matches relevant? | ⏳ After G1 | Fix matching/ontology |
| **G3** | Data loss provably impossible? | 🟡 Partial (export/import ✅, Batch A ✅) | Fix W2 remaining |
| **G4** | Product direction interop-first? | ✅ **YES** — Interop-first | W5 stays P1 or → P0 |
| **G5** | Users hit single-device limit? | ⏳ After G3 | Defer W6 |
| **G6** | MP4 recordings work reliably for demos/teaching? | ✅ **DONE** | Use localhost:ports instead of lvh.me DNS |

**G4 must be decided before Batch A completes** (affects W5 priority). → **DECIDED: YES (interop-first)**

**Human testing (G1, G2) deferred** — will run when G4 is decided and MP4 infrastructure (G6) is functional for recording demos.

---

## 2. Three Batches (Sequential PRs) — **ALL COMPLETE ✅**

### Batch A: Trust & Visibility (Settings Panel) — ✅ DONE (PR #1)

**Goal**: Make trust boundary visible; prove export is a trust signal.

| Task | Files | Done When |
|------|-------|-----------|
| A1. Capabilities panel: list grants per note, revoke button | `ui/src/components/settings/CapabilitiesPanel.tsx` (new), `DataTab.tsx` | ✅ Note with `[@allow:browser:navigate:example.com]` shows live indicator + revoke |
| A2. Pattern recognition suggestions in property modal | `ui/src/components/editor/InsertPropertyModal.tsx`, `ui/src/hooks/usePatternSuggestions.ts`, `core/src/patternRecognition/` | ✅ "Suggested: framework=React (based on history)" appears, accept reduces entry |
| A3. Export workspace/note buttons in Data tab | `ui/src/components/settings/DataTab.tsx`, `core/src/export/` | ✅ Export → wipe → import = identical workspace |
| A4. Wire `pendingConfirmations` to publish-gate modal | `ui/src/components/ui/PendingConfirmationsModal.tsx`, `AppShell.tsx`, `core/src/security/` | ✅ Consequential tools (publish, delete, network, file) show confirmation |

**Shared test**: `ui/src/components/settings/DataTab.test.tsx` (new) — ✅

**Gate**: Enables G3 (data durability visible), unblocks W4/W4b.

---

### Batch B: Demo & Distribution — ✅ DONE (PR #2, Core Logic)

**Goal**: Stranger completes Golden Path unaided; CI reproduces findings.

| Task | Files | Done When |
|------|-------|-----------|
| B1. CLI docs in README.md + `pnpm run cli` verification | `README.md`, `cli/src/commands/` | ✅ `pnpm run cli` works end-to-end; README has quick-start |
| B2. Simulator Golden Path scenario | `simulator/src/scenarios/golden-path.ts`, `simulator/src/movie_maker.ts` | ✅ Scenario runs, agents match, MP4 recording infra noted |
| B3. `optimize reproduce --simulator` CI gate | `optimize/src/cliHandlers/reproduce.ts`, `simulator/src/scenarios/regression.ts` | ✅ Flag added, regression scenario runs, MP4 infra noted |

**Shared test**: `simulator/src/scenarios/SimulatorRegression.test.ts` (new) — ✅

**Gate**: G1 (stranger test), G2 (human relevance with real demo).

---

### Batch C: First Metaphor View — ✅ DONE (PR #3)

**Goal**: Prove metaphor system as extensibility point.

| Task | Files | Done When |
|------|-------|-----------|
| C1. Metaphor View plugin interface | `ui/src/plugins/metaphor/MetaphorViewPlugin.ts` (new), `core/src/skills/metaphor/MetaphorMapper.ts` | ✅ New metaphor = drop component in `ui/src/plugins/metaphor/` |
| C2. `conditional-automation` → rule card list view | `ui/src/plugins/metaphor/ConditionalAutomationView.tsx` (new), `ui/src/components/dashboard/AutomationsView.tsx` (new) | ✅ Note matching metaphor renders as rule card in "Automations" view |
| C3. Wire template gallery into create-note flow | `ui/src/components/dashboard/DashboardQuickCapture.tsx` | ✅ "Start from template: Job Application / Project Spec / Meeting Notes" (metaphor-based) |

**Shared test**: `ui/src/plugins/metaphor/MetaphorViewPlugin.test.tsx` (new) — ✅

**Gate**: Proves "seams over special cases" — new domains are consequences, not special cases.

---

## 3. Deferred (Require Gates)

| Workstream | Trigger | Gate |
|------------|---------|------|
| W3 Extraction Quality + Prompt Eval | Human relevance ratings (G2) | G2 |
| W4 Agent Loop Closure | Confidence from G1/G2 | G1, G2 |
| **W5 Protocol Foundation (CBOR, NoteID, Signing)** | G4 decision: interop-first? | ✅ **G4=YES → COMPLETE** |
| W5b Simulator Protocol Testbed | W5 promoted | ✅ **COMPLETE** |
| W6 Multi-Device Sync | Users hit single-device limit (G5) | G3, G5 |
| **G6 Fix** MP4 Recording Infrastructure | Demos, teaching, CI evidence | ✅ **DONE** (localhost:ports) |

---

## 4. Metrics to Instrument (In-App, Opt-In)

| Metric | Where Captured | Target |
|--------|----------------|--------|
| Time-to-first-match | Journey assertion | < 120s |
| Match acceptance/rejection rate | Match result UI | ≥ 70% acceptance |
| Export/import success rate | DataTab buttons | 100% round-trip |
| Capability grant/revoke rate | CapabilitiesPanel | > 0 (engagement) |
| Pattern suggestion acceptance | PropertyModal | Measurable reduction in manual entry |
| Template usage → match success | CreateNoteModal + MatchEngine | Template notes match faster |

---

## 5. File Index for Batches

| Batch | Primary Files |
|-------|---------------|
| **A** | `ui/src/components/settings/CapabilitiesPanel.tsx` (new), `ui/src/components/settings/DataTab.tsx`, `ui/src/components/editor/InsertPropertyModal.tsx`, `ui/src/hooks/usePatternSuggestions.ts` (new), `ui/src/components/ui/PendingConfirmationsModal.tsx` (new), `ui/src/components/AppShell.tsx`, `core/src/security/CapabilityManager.ts`, `core/src/patternRecognition/`, `core/src/export/` |
| **B** | `README.md`, `cli/src/commands/`, `simulator/src/scenarios/golden-path.ts`, `simulator/src/movie_maker.ts`, `optimize/src/cliHandlers/reproduce.ts`, `simulator/src/scenarios/regression.ts` |
| **C** | `ui/src/plugins/metaphor/MetaphorViewPlugin.ts` (new), `ui/src/plugins/metaphor/ConditionalAutomationView.tsx` (new), `ui/src/components/dashboard/AutomationsView.tsx` (new), `ui/src/components/dashboard/DashboardQuickCapture.tsx`, `core/src/templates/TemplateGenerator.ts` |

---

## 6. Test Strategy (Minimal Overhead)

| Batch | Test File | Scope |
|-------|-----------|-------|
| A | `ui/src/components/settings/SettingsPanel.test.tsx` (new) | CapabilitiesPanel, Export buttons, Pattern suggestions, Confirmation wiring |
| B | `simulator/src/scenarios/SimulatorRegression.test.ts` (new) | Golden Path scenario, `reproduce --simulator` gate |
| C | `ui/src/plugins/metaphor/MetaphorViewPlugin.test.tsx` (new) | Plugin interface, ConditionalAutomationView, Template wiring |

**No new test infrastructure** — uses existing vitest + optimize + Simulator.

---

## 7. Risk Register (Updated)

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | Golden Path fails relevance (G2) | Kill criteria: stop features, fix matching/ontology |
| R2 | Capabilities UI exposes unsafe actions | Confirmation modal + per-session grants + immediate revoke |
| R3 | Simulator regression engine not adopted | Concrete deliverable in B3; CI gate enforces |
| R4 | Metaphor plugin interface over-engineered | Ship one working example (C2) before generalizing |
| R5 | G4 decision delays W5 | Decide G4 now; W5b provides simulator validation path regardless |
| R6 | MP4 recording infrastructure blocks demo/teaching | Fix lvh.me DNS or refactor MovieMaker to use localhost:ports; headless works now |

---

## 8. Execution Order

```
1. Decide G4 (interop-first?) — ✅ DONE (YES)
2. Batch A (Trust & Visibility) — ✅ DONE (1 PR)
   → G3 closer, unblocks W4/W4b
3. Batch B (Demo & Distribution) — ✅ DONE (1 PR)
   → G1, G2 achievable
4. Batch C (Metaphor View) — ✅ DONE (1 PR)
   → Extensibility proven
5. Fix G6 (MP4 recordings) — ✅ DONE (localhost:ports in MovieMaker)
6. **W5 Protocol Foundation** — ✅ COMPLETE (CBOR, NoteID, Signing)
7. **W5b Simulator Protocol Testbed** — ✅ COMPLETE (13 tests passing)
8. Human testing (G1, G2) — 5 users (G4+G6 ready)
9. If G2 passes → W3/W4; W6 after G5
```

---

## 9. Anti-Goals (Enforced)

- No new test infrastructure
- No new component library
- No migration logic (schema is v1, validation-only)
- No protocol work before G4
- No sync before G5
- No feature without verification artifact

---

## 10. Robustness & Self-Optimization (Post-Batches)

| Area | Implementation | Files |
|------|----------------|-------|
| **Metrics Instrumentation** | In-app opt-in metrics for all key KPIs (time-to-match, export/import, capability grants, pattern suggestions, templates, automations) | `ui/src/hooks/useMetrics.ts`, `ui/src/components/settings/DataTab.tsx`, `ui/src/components/settings/CapabilitiesPanel.tsx`, `ui/src/components/editor/InsertPropertyModal.tsx`, `ui/src/components/dashboard/DashboardQuickCapture.tsx` |
| **Storage Recovery** | Snapshots (auto + manual), corruption recovery (validated restore, corrupted note dropping), quota monitoring | `core/src/storage/recovery.ts`, `core/src/storage/recovery.test.ts` |
| **Test Coverage** | DataTab, SimulatorRegression, MetaphorViewPlugin tests | `ui/src/components/settings/DataTab.test.tsx`, `simulator/src/scenarios/SimulatorRegression.test.ts`, `ui/src/plugins/metaphor/MetaphorViewPlugin.test.tsx` |

**Core tests: 360 passing | Verify: ✅ | 3 PRs complete**

---

*End of TODO.6.md — 3 PRs + robustness complete, gates unblocked, evidence-driven. Next: G6 (MP4 infra) → G4 decision → human testing (G1, G2).*