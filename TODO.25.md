# TODO.25 — Post-TODO.24 Roadmap: Quality, Usability, Usefulness

> **How to use this plan**: Work top-down within a workstream; each task has a goal, acceptance
> criteria, and commands. Pick from **Now** first. Update the checkboxes and the Progress Log as
> tasks land. This plan is evidence-driven: prefer changes justified by the friction journal,
> the golden/quality gates, or the comprehension probe.

---

## 1. Corrections & Facts (read first)

### Model availability (corrected)
- **There is no Qwen 3.5 7B or 14B.** Sizes are `0.8B → 2B → 4B → 9B`.
- **Qwen 3.5 9B** is the next step up. Q4_K_M ≈ 5.5–6 GB.
- **Gemma 4 4B** is a candidate alternative. Q4_K_M ≈ 2.5–3 GB.
- Gemma smaller variants: **unconfirmed — verify before planning around them** (`1B`/`2B` may or may not exist).
- `node-llama-cpp` already ships `Gemma4ChatWrapper` and `GemmaChatWrapper`, so Gemma integration is a small code change plus validation.

### Hardware envelope
- **RTX 3080, 10 GB VRAM, CUDA** (verified). Practical ceiling for this machine:
  - 9B Q4_K_M ≈ 5.5–6 GB → fits with room for 4k context.
  - 14B Q4_K_M ≈ 8–9 GB → borderline; do not adopt as default.
  - 4B and below → comfortable.
- Keep a **CPU fallback path** (`LLAMA_GPU_LAYERS=0`) green; it is the portable gate.

### Existing assets to leverage (do not rebuild)
| Asset | Location | Use |
|-------|----------|-----|
| Golden gate (10 deterministic cases) | `optimize/src/prompts/property-extraction.golden.json` | Regression canary |
| Quality set (60 extraction + 22 match) | `data/eval/cases/manifest.json` | Quality + match gates |
| E13 prompt ablation | `pnpm prompts:eval ablation` | Prompt variant comparison |
| E2 capture A/B test | `optimize/src/optimizer/e2CaptureTest.ts` | Capture-parameter experiments |
| Optimizer loop (6 steps) | `pnpm loop run` | Auto prompt adoption |
| Friction journal + digest | `core/src/telemetry/*`, `ui/src/hooks/useFrictionRecorder.ts` | Usability evidence |
| Comprehension probe | `pnpm probe` | Stranger comprehension |
| Stranger test (<2 min golden path) | `pnpm stranger-test` | Time-to-value KPI |
| i18n (6 locales incl. RTL `ar`) | `ui/src/i18n/locales/*.json` | Localization |
| E2E journeys (12 specs) | `ui/test/journeys/*` | Flow regressions |
| Verdict engines (McNemar/Bayes/LLM/human) | `core/src/eval/verdictEngines/*` | Experiment statistics |

---

## 2. Workstreams

### W1 — Extraction Quality & Model Matrix
**Goal**: Pick the best model this machine can run, and raise quality F1 from 0.742 toward 0.80+.

- [ ] **W1.1 Verify + fetch candidate models.** Confirm 9B and Gemma 4 4B GGUF availability and exact filenames; record Q4 size and license.
  - Acceptance: `models/` contains 9B (and Gemma 4 4B if adopted); a `models/MANIFEST.md` lists params, quant, size, license, source.
- [ ] **W1.2 Add Gemma chat-wrapper detection.** Extend `resolveChatWrapperKind()` in `optimize/src/llm/llamaCppBridge.ts` to detect `gemma-4` → `Gemma4ChatWrapper`, `gemma` → `GemmaChatWrapper`; return `supportsGrammar` from an actual capability probe, not an assumption.
  - Acceptance: unit test for detection; golden gate runs on Gemma 4 4B.
- [ ] **W1.3 Run the full model matrix.** For each candidate: golden 10, quality 60 (3-shot), mean latency, peak VRAM, pass count.
  - Matrix: Qwen 0.8B / 2B / 4B / **9B**, Llama 3.2 3B, Gemma 4 4B (+ smaller Gemma if confirmed).
  - Acceptance: results table in this file; a recommended default model with justification; **no regression** on golden 10/10.
  - Command: `LLAMA_MODEL_PATH=... pnpm prompts:eval eval --provider llamacpp --quality`.
- [ ] **W1.4 Few-shot retrieval v2.** Replace/augment token-cosine in `optimize/src/prompts/fewShot.ts` with (a) BM25 and (b) key-coverage scoring (prefer examples that cover the ontology keys the input likely needs). Keep deterministic tie-breaks.
  - Acceptance: quality F1 ↑ at equal `--few-shot 3`; golden gate unchanged.
- [ ] **W1.5 Grammar-gating auto-probe.** Try constrained grammar; on repeated parse failure fall back to unconstrained + JSON repair. Record which mode each model used.
  - Acceptance: no model regresses on golden; one log line states resolved mode.
- [ ] **W1.6 Adaptive model routing (ensemble-lite).** Route short/simple notes to 2B, long/governance notes to 4B/9B; measure blended F1 vs latency.
  - Acceptance: blended quality F1 ≥ best single model, latency p95 within budget.
- [ ] **W1.7 (Optional) LoRA fine-tune** on 864 notes + synthetic. High effort; only if W1.3–W1.6 plateau below 0.80.
- [ ] **W1.8 (Optional) Chain-of-thought scratchpad** behind a flag; measure whether grammar + CoT helps 9B.

### W2 — Capture Usability (time-to-value, abandonment, corrections)
**Goal**: A stranger captures a useful structured note fast; abandonment and correction rates fall.

- [ ] **W2.1 Capture funnel from friction journal.** Aggregate `capture_started → capture_abandoned`, `correction`, `need_expressed` per seam; render a ranked digest.
  - Acceptance: `pnpm friction:digest` prints top seams by half-life-weighted friction; used to pick W2.2–W2.4.
- [ ] **W2.2 Progressive extraction with latency budget.** Show heuristic properties immediately, refine with LLM; target **first properties < 300 ms**, LLM refinement < 800 ms p50.
  - Acceptance: measured p50/p95 in a repeatable script; skeleton/loading state present.
- [ ] **W2.3 Correction-rate reduction.** Track edits to extracted properties; add one-tap "suggested fix" chips for the top error kinds (`price`↔`budget`, `schedule`↔`frequency`, missing `student/vehicle/format/audience`).
  - Acceptance: correction rate on quality corpus ↓; UI test covers accept/reject.
- [ ] **W2.4 Keyboard-first capture + paste-anywhere.** `N` new note, `Cmd/Ctrl+V` anywhere opens capture with paste; `Cmd/Ctrl+Enter` saves.
  - Acceptance: journey test completes capture with keyboard only.
- [ ] **W2.5 Draft autosave + undo/redo.** Never lose a note; revert extraction edits independently of text.
  - Acceptance: reload restores draft; undo restores pre-extraction state.
- [ ] **W2.6 First-run onboarding checklist.** Three steps: capture → see match → take action. Dismissible; detected from real state, not flags alone.
  - Acceptance: fresh profile shows checklist; disappears when steps complete.

### W3 — Trust & Explainability
**Goal**: Users understand *why* a property or match appeared, and can correct it.

- [ ] **W3.1 "Why this match" panel.** Show constraint→fact evaluation, score, and reasons (already computed in core; surface in UI).
  - Acceptance: every match row opens an explanation with contributing constraints; probe participants find it unaided.
- [ ] **W3.2 Property provenance.** Highlight the source text span for each extracted property; clicking a chip focuses the span.
  - Acceptance: every LLM-extracted property maps to a span or is marked "inferred".
- [ ] **W3.3 Calibrated confidence display.** Show confidence from the scorer, calibrated against the quality set (report ECE); avoid false precision.
  - Acceptance: ECE reported in metrics; UI uses buckets (high/medium/low), not raw floats.
- [ ] **W3.4 Feedback controls.** Accept / correct / reject on properties and matches, wired to `recordFriction`.
  - Acceptance: events appear in the journal; digest reflects them.

### W4 — Match & Action Usefulness
**Goal**: Matching produces actionable, relevant results, not just scores.

- [ ] **W4.1 Match quality gate.** Add the 22 `match` cases to an eval command and a pass threshold.
  - Acceptance: `pnpm prompts:eval match` (or equivalent) reports precision/recall/relevance; threshold documented.
- [ ] **W4.2 Ranking + dedupe.** Improve ordering (recency, distance, constraint coverage) and collapse near-duplicate offers.
  - Acceptance: top-5 relevance ↑ on match set; no duplicate clusters in top-5.
- [ ] **W4.3 Action/skill approval UX.** Clear "what will happen" preview, capability scope, and one-tap approve/deny; audit trail entry.
  - Acceptance: agent action cannot run without an approval record; UI shows scope.
- [ ] **W4.4 Digest / notification loop.** Optional daily or on-demand digest of new matches and pending actions; respects quiet hours.
  - Acceptance: opt-in only; digest is local-first and exportable.

### W5 — Accessibility & Internationalization
**Goal**: WCAG 2.2 AA and a fully usable UI in all shipped locales, keyboard-only and screen reader included.

- [ ] **W5.1 Axe audit + fixes.** Run `axe-core` across main views; fix serious/critical issues (labels, roles, contrast).
  - Acceptance: zero serious/critical axe violations on Inbox, Notes, Actions, Settings.
- [ ] **W5.2 Keyboard navigation & focus management.** Visible focus ring, logical tab order, focus trap in modals/dialogs, Esc closes.
  - Acceptance: can complete capture→match→action without a mouse; automated focus test.
- [ ] **W5.3 Screen reader semantics.** Live regions for match/notifications, `aria-live` for async extraction, table/list semantics.
  - Acceptance: NVDA/VoiceOver smoke script documented; no unlabeled interactive controls.
- [ ] **W5.4 Reduced motion & high contrast.** Honor `prefers-reduced-motion` and `prefers-contrast`; no essential info conveyed by color alone.
  - Acceptance: toggles verified in UI; screenshots in `doc/screenshot/`.
- [ ] **W5.5 i18n completeness + RTL audit.** Verify all 6 locales (`en,es,fr,de,zh,ar`) have keys; audit RTL (`ar`) layout, icons, and numbers.
  - Acceptance: missing-key check = 0; RTL screenshots reviewed.
- [ ] **W5.6 Responsive/mobile pass.** Bottom nav, touch targets ≥ 44px, no horizontal scroll at 360px.
  - Acceptance: mobile journey test passes.

### W6 — Performance & Reliability
**Goal**: Fast, stable, and honest when things fail or go offline.

- [ ] **W6.1 Performance budgets.** Define and measure: TTI < 2.5 s, INP < 200 ms, extraction p95 < 800 ms, bundle budget.
  - Acceptance: `pnpm perf:budget` (new) fails on regression; numbers in metrics.
- [ ] **W6.2 Offline / local-only mode.** First-class toggle: no network inference, clear status, queued sync when back online.
  - Acceptance: app fully usable offline; `ConnectivityBanner` states are correct.
- [ ] **W6.3 Large workspace.** Test 10k notes: load, search, sidebar virtualization.
  - Acceptance: no jank > 100 ms; memory stable over 10 min.
- [ ] **W6.4 Error states & degraded mode.** Every async path has loading / empty / error / retry; LLM failure falls back to heuristics with a visible note.
  - Acceptance: fault-injection test covers extraction, transport, and storage failures.
- [ ] **W6.5 Leak & long-session check.** Memory/CPU over a 30-min session; no listener leaks.

### W7 — Data Ownership & Portability
**Goal**: Users can get their data out, back it up, and move between devices safely.

- [ ] **W7.1 Export/import round-trip.** JSON + Markdown export; import restores notes, properties, tags, and revisions.
  - Acceptance: round-trip test is lossless for a seeded workspace (extend `export-import.spec.ts`).
- [ ] **W7.2 Encrypted local backup.** One-click backup with a user passphrase; documented restore.
  - Acceptance: backup restores on a clean profile.
- [ ] **W7.3 Schema/version migration.** Versioned workspace format with forward-migration and a dry-run check.
  - Acceptance: old fixture migrates; migration is idempotent.
- [ ] **W7.4 Privacy redaction.** Before any remote inference/transport, strip or mask detected PII (email/phone/SSN) with a visible indicator.
  - Acceptance: redaction test on PII fixtures; user override is explicit.

### W8 — Observability & Measurement Loop
**Goal**: Every usability/quality claim is backed by a repeatable measurement.

- [ ] **W8.1 Friction digest CLI + dashboard.** `pnpm friction:digest [--days N] [--json]` over the journal using `digestPipeline`; surface top signals in Settings → Metrics.
  - Acceptance: deterministic digest on fixture events; dashboard reads live journal.
- [ ] **W8.2 Local eval canary.** One command runs golden + quality + match + taxonomy and writes a report; **no CI/provider dependency** (per user preference).
  - Acceptance: `pnpm eval:canary` exits non-zero on regression; artifact written under `data/`.
- [ ] **W8.3 LLM call telemetry.** Record model, tokens, latency, mode (grammar/unconstrained) per call; aggregate p50/p95.
  - Acceptance: report shows cost/latency per model.
- [ ] **W8.4 Wire A/B results to decisions.** E2 capture A/B + E13 ablation outputs feed the optimizer loop's adopt step.
  - Acceptance: `decision.md` cites the experiment artifact.

### W9 — Documentation & Onboarding
**Goal**: A new contributor or user can succeed without tribal knowledge.

- [ ] **W9.1 Quickstart.** 10-minute path: install, choose a model, capture, match, export.
- [ ] **W9.2 Model selection guide.** VRAM table (0.8B→9B, Llama, Gemma), quant, expected F1, latency.
- [ ] **W9.3 Decision records.** One ADR per major choice (dual prompt, grammar gating, local-first telemetry).
- [ ] **W9.4 Eval how-to.** Golden vs quality vs match sets; how to add a case; how to read F1/ECE.

### W10 — UI/UX Simplification (progressive disclosure)
**Goal**: A calmer, more intuitive interface with **no loss of functionality**, reached in small,
independently revertible steps. Every view stays reachable by route, shortcut, and command palette.

#### Verified audit findings (current code)
| # | Finding | Evidence | Impact |
|---|---------|----------|--------|
| 1 | **11 top-level destinations** (Inbox, Notes, Map, Timeline, Network, Chat, Actions, Responses, Labels, Trash, Settings) | `ui/src/utils/navigation.ts` | Choice overload; cramped header/mobile nav |
| 2 | Navigation is rendered **three times** (desktop header, sidebar, mobile bottom nav) from one config | `layout/Header.tsx`, `sidebar/index.tsx`, `layout/MobileBottomNav.tsx` | Visual noise; three surfaces to keep consistent |
| 3 | **Dashboard and Inbox "Advanced" duplicate** local match, stats, recent activity, automations | `dashboard/DashboardView.tsx` vs `views/InboxView.tsx` (`AdvancedPanels`) | Redundant widgets, two mental models |
| 4 | **Settings has 9 flat tabs**, with unused/duplicate `OntologyTab`/`AgentTab` present in source | `views/SettingsView.tsx`, `settings/` | Hard to find a setting |
| 5 | **Latent runtime bug**: `require('@notention/core')` inside a React effect | `views/InboxView.tsx:227` | Advanced → Local Match breaks in browser (ESM has no `require`) |
| 6 | Advanced-panel navigation is a **no-op** (`onNavigate={(id) => {}}`) | `views/InboxView.tsx` | Dead click affordance |
| 7 | Editor property UI is spread across `ContextPanel`, `EditorSidebar`, `PropertyForm`, `EnhancedPropertyForm`, `InsertPropertyModal`, `ExtractionReview` | `ui/src/components/editor/` | Overlapping entry points; harder to learn |
| 8 | Inbox Local Match "Accept"/"Dismiss" buttons have **no handlers**; cards were not clickable | `views/InboxView.tsx` | Dead controls; trust erosion |

#### Principles
1. **Progressive disclosure, not removal** — hide behind "More"/"Advanced", never delete a capability.
2. **One primary action per screen**; secondary actions collapse.
3. **Single source of truth** — navigation and settings grouping derive from config, not duplicated JSX.
4. **Reversible** — each phase is a small commit with a flag or a clean revert; no big-bang rewrite.
5. **Evidence-gated** — each phase must keep e2e journeys, visual snapshots, axe, and `stranger-test` green.

#### Execution protocol (important)
- **This plan is currently documentation-only.** No further UI code changes are made until a
  phase is explicitly approved.
- One phase per change set; one commit; one reviewer-visible diff. Do **not** bundle phases.
- Before a phase: write the rollback line and the verification commands into its PR description.
- After a phase: attach evidence (screenshot diff, journey result, axe report) and tick the box.
- If a phase would drop a capability, stop and extend the "More"/"Advanced" surface instead.

#### Consolidation proposals
| Area | Now | Proposed |
|------|-----|----------|
| Top nav | 11 peers | **3 primary** (Inbox, Notes, Actions) + **More** overflow (Map, Timeline, Network, Chat, Responses, Labels, Trash) + Settings as an icon |
| Mobile nav | 11 scrolling tabs | 4 tabs (Inbox, Notes, Actions, More-sheet) + central capture button |
| Overview | Dashboard + Inbox Advanced | **One Overview** surface; Dashboard becomes an optional tab/section inside Inbox; delete duplicate panels |
| Settings | 9 flat tabs | **4 groups** (General, AI & Automation, Network & Identity, Data & Metrics) with collapsible sections; drop unused tabs |
| Editor properties | 6 overlapping components | **One progressive form**: inline simple fields → "More details" expands advanced fields/modal |
| Empty states | Mixed variants | One consistent `EmptyState` pattern (title, one CTA, one hint) |

#### Information architecture (before → after)

```
BEFORE (11 peers, triplicated)                 AFTER (3 primary + More)
┌───────────────────────────────┐              ┌───────────────────────────────┐
│ Inbox Notes Map Timeline      │              │ [+ New]  Search  Inbox Notes  │
│ Network Chat Actions Responses│              │          Actions   ⋯ More  ⚙  │
│ Labels Trash            ⚙     │              └───────────────────────────────┘
└───────────────────────────────┘                 ⋯ More: Map · Timeline ·
Sidebar list + header nav + mobile nav            Network · Chat · Responses ·
(each re-renders the same set)                     Labels · Trash
```

```
SETTINGS BEFORE (9 flat)          SETTINGS AFTER (4 groups, collapsible)
AI · Automation · Labels ·        General (Profile, Labels)
Network · Nostr · Data ·          AI & Automation (AI, Automation)
Metrics · Profile · Revisions     Network & Identity (Networks, Nostr)
                                  Data & Metrics (Data, Metrics, Revisions)
```

#### Widget consolidation ledger (source → destination)
| Widget / component | Today | Destination |
|--------------------|-------|-------------|
| `DashboardView` (stats, activity, quick actions) | `dashboard` route | **Overview** section/tab inside Inbox |
| `LocalMatchPanel` (Inbox duplicate) | `InboxView` Advanced | **Delete**; use `DashboardLocalMatch` |
| `StatsPanel` (Inbox duplicate) | `InboxView` Advanced | **Delete**; use `StatsGrid` |
| `RecentActivityPanel` (Inbox duplicate) | `InboxView` Advanced | **Delete**; use `RecentActivity` |
| `AutomationsPanel` (Inbox duplicate) | `InboxView` Advanced | **Delete**; use `AutomationsView` |
| `Header` nav cluster | `layout/Header.tsx` | Primary nav only + `MoreMenu` |
| `MobileBottomNav` (11 tabs) | `layout/MobileBottomNav.tsx` | 4 tabs + `MoreSheet` |
| `OntologyTab`, `AgentTab` | `settings/` | Remove or fold into `AITab`/`LabelsTab` |
| `PropertyForm`, `EnhancedPropertyForm`, `InsertPropertyModal` | `editor/` | One `PropertyEditor` with `advanced` disclosure |
| `ContextPanel`, `EditorSidebar` | `editor/` | One inspector panel; sidebar optional |

#### Phased rollout (each phase = one PR-sized commit)

- [~] **W10.0 Guardrails (no visual change).**
  - [x] Fix the `require()` bug in `InboxView` → static `MatchEngine` import. *(shipped)*
  - [x] Wire dead `onNavigate` handlers; Local Match cards and Recent Activity now open the note. *(shipped)*
  - [ ] Add `ui/src/tests/visual/*` snapshots for Inbox, Notes, Settings, mobile nav.
  - [ ] Add a reachability test: every `View` id is reachable via palette + shortcut.
  - [ ] Add axe baseline (may fail; record and triage).
  - Acceptance: no visible change; all 12 journeys green; snapshots committed.
  - Note: the two shipped fixes are the only code changes so far; the rest are pending approval.

- [ ] **W10.1 Navigation consolidation.**
  - Introduce `PRIMARY_NAV` + `SECONDARY_NAV` in `utils/navigation.ts`; render primary in header, rest in a `More` menu.
  - Mobile: 4 tabs + More sheet; keep all shortcuts (`Alt+1..0`) working.
  - Acceptance: every view reachable in ≤2 clicks; e2e navigation + shortcuts green; mobile nav no horizontal scroll at 360px.

- [ ] **W10.2 Overview merge.**
  - Move Dashboard content into Inbox as an "Overview" section (or tab); delete duplicate `LocalMatchPanel`/`StatsPanel`/`RecentActivityPanel`/`AutomationsPanel`.
  - Keep Dashboard route as an alias for one release (redirect) to avoid broken links.
  - Acceptance: no duplicated widgets; journeys updated; no broken routes.

- [ ] **W10.3 Settings grouping.**
  - Group 9 tabs into 4; nested collapsible sections; remove unused tabs.
  - Acceptance: every existing setting reachable; keyboardable; axe clean for Settings.

- [ ] **W10.4 Editor consolidation (higher risk).**
  - Unify property entry into one progressive form; keep power-user modal as "More details".
  - Acceptance: create/edit/remove property journeys green; no data loss on round-trip.

#### Reachability invariant (automated)
A UI test asserts that for every entry in `[...NAV_ITEMS, SETTINGS_VIEW]`:
- the view renders when `activeView` is set, and
- the view is reachable from the palette and its shortcut.
This is the guard that "no functionality is sacrificed".

#### Per-phase verification checklist
Run before ticking any W10 box:
1. `pnpm --filter @notention/ui build` — bundles clean.
2. `pnpm test:ui` — batched unit tests pass.
3. `pnpm exec playwright test` journeys — navigation, capture, match, settings, export/import.
4. Visual snapshots — only intended diffs.
5. Reachability test — every `View` id renders and is reachable.
6. Axe — no new serious/critical issues.
7. `pnpm stranger-test` — golden path still < 2 min unaided.
8. Screenshot pair (before/after) attached to the change.

#### Risk register
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| A view becomes unreachable | Medium | Reachability test + keep palette + shortcuts |
| Mobile nav cramped/broken | Medium | 360px viewport check; More sheet |
| Duplicate widgets deleted prematurely | Medium | W10.2 only after W10.1 stable; keep alias route |
| Editor regression / data loss | High | W10.4 last; round-trip tests; no schema change |
| User preference for old layout | Low | `settings.uiSimplified` toggle for one release |
| Scope creep into redesign | Medium | Phases are additive-only; no restyling in W10.1 |

#### Rollback
Each phase ships independently. Revert the single commit to restore the previous layout; no
data migrations are involved. W10.1 may also sit behind `settings.uiSimplified` (default on) so a
user can switch back for one release.

---

## 3. Prioritized Roadmap

### Now (highest impact, low/medium effort)
| # | Task | Impact | Effort |
|---|------|--------|--------|
| 1 | **W10.0 UI guardrails** (bug fixes + snapshots + reachability test) | Safe base for UI change | S |
| 2 | **W10.1 navigation consolidation** (3 primary + More) | Biggest UX clarity win | M |
| 3 | W1.1 + W1.3 model matrix (incl. **9B**, **Gemma 4 4B**) | Quality decision | M |
| 4 | W1.2 Gemma wrapper detection | Unlocks Gemma | S |
| 5 | W2.1 friction digest CLI | Turns telemetry into priorities | S |
| 6 | W3.1 "Why this match" panel | Trust | M |
| 7 | W5.1 axe audit + critical fixes | Accessibility | M |
| 8 | W8.2 local eval canary | Prevents regressions | S |

### Next (after Now)
W10.2 Overview merge (Dashboard → Inbox) · W1.4 retrieval v2 · W1.5 grammar auto-probe ·
W2.2 latency budget · W2.3 correction chips · W4.1 match gate · W6.1 performance budgets ·
W6.2 offline mode · W7.1 export/import.

### Later (larger/strategic)
W10.3 Settings grouping · W10.4 Editor consolidation · W1.6 adaptive routing · W1.7 LoRA ·
W2.6 onboarding · W4.3 action approval · W5.3–W5.6 · W6.3 large workspace ·
W7.2–W7.4 backup/redaction · W9 docs.

### Parked (do not start yet)
- WebLLM GPU CI (user declined CI; SwiftShader lacks adapters).
- Multi-modal (image→properties) — needs ontology extension.
- Server-side llama.cpp batching — only if throughput becomes a constraint.

---

## 4. Measurement Loop (use this to justify work)

```
friction journal ──► friction:digest ──► ranked seams ──► pick UX task
        ▲                                                   │
        │                                                   ▼
   user actions ◄── ship change ◄── eval:canary + probe ◄── implement
```

- **Usability KPIs**: stranger golden path < 2 min unaided; capture abandonment ↓; correction rate ↓; match accept rate ↑.
- **Quality KPIs**: golden 10/10; quality F1 ≥ 0.75 (stretch 0.80); match relevance ↑.
- **Performance KPIs**: TTI < 2.5 s; INP < 200 ms; extraction p95 < 800 ms.
- **Accessibility KPIs**: zero serious/critical axe issues; keyboard-only journey passes.

---

## 5. Definition of Done (per task)

A task is done only when all hold:
1. Code + types clean (`tsc --noEmit` for touched packages).
2. Relevant tests added/updated and passing (`pnpm test`, `pnpm test:ui` as applicable).
3. Golden gate still 10/10; quality F1 not regressed.
4. `pnpm taxonomy:coverage` still 24/24.
5. Docs/plan updated (checkbox + one-line Progress Log entry).
6. If UX-facing: an eval artifact (digest/probe/axe/screenshot) is attached.

---

## 6. Commands Reference

```bash
# Model matrix
LLAMA_MODEL_PATH=/path/to/Qwen3.5-9B-Q4_K_M.gguf pnpm prompts:eval eval --provider llamacpp --quality
LLAMA_MODEL_PATH=/path/to/gemma-4-4b-Q4_K_M.gguf  pnpm prompts:eval eval --provider llamacpp --quality
LLAMA_GPU_LAYERS=0 pnpm prompts:eval eval --provider llamacpp        # CPU fallback gate

# Prompt experiments
pnpm prompts:eval ablation --provider llama-cpp-embedded --quality-limit 10
pnpm prompts:eval compare --limit 60 --few-shot 3

# Optimizer loop
pnpm loop run --dry --output data/loop/runs
pnpm loop run --output data/loop/runs

# Usability evidence (to be added in W2.1/W8.1)
pnpm friction:digest --days 14
pnpm probe --headless
pnpm stranger-test

# Gates
pnpm test && pnpm test:ui
pnpm taxonomy:coverage
pnpm eval:verify-manifest
```

---

## 7. Progress Log

### 2026-11-15 — Plan revised
- Corrected model sizes: Qwen 3.5 is `0.8B/2B/4B/9B` (no 7B/14B); Gemma 4 4B added; smaller Gemma unconfirmed.
- Recorded hardware: RTX 3080 10 GB → 9B Q4 practical ceiling.
- Verified `node-llama-cpp` exposes `Gemma4ChatWrapper`/`GemmaChatWrapper`.
- Reframed plan around four measured loops: model matrix, friction digest, eval canary, accessibility audit.
- Added workstreams W1–W9, Now/Next/Later roadmap, per-task acceptance criteria, DoD.

### 2026-11-15 — UI/UX simplification added (W10)
- Audited current UI: 11 top-level destinations, triplicated navigation, Dashboard/Inbox duplicate panels, 9 flat settings tabs.
- Found latent bugs: `require('@notention/core')` in `InboxView` effect; no-op `onNavigate` handlers.
- Added W10 with 5 phased, revertible steps and a reachability invariant to guarantee no functionality loss.
- W10.0 (guardrails, no visual change) and W10.1 (navigation consolidation) promoted to Now.

### 2026-11-15 — W10.0 partial (safe bug fixes shipped); plan-only thereafter
- Fixed `require('@notention/core')` in `InboxView` (ESM runtime error) → static `MatchEngine` import.
- Wired Advanced-panel navigation: Local Match request/offer cards and Recent Activity are now clickable and open the note.
- Added audit finding #8: Inbox Local Match "Accept"/"Dismiss" were dead controls (resolved by W10.2 Overview merge).
- UI production build passes (`pnpm --filter @notention/ui build`, 16 s).
- **Per user direction, this session is plan-only after these two fixes; no further code changes.**
- Added execution protocol, before/after IA, widget consolidation ledger, per-phase verification checklist, and risk register.
- Remaining W10.0: visual snapshots, reachability test, axe baseline (await approval).

---

## 8. Open Questions (need answers before Later items)
1. Primary user: solo knowledge worker, mutual-aid organizer, or agent operator? (shapes W3/W4 priority)
2. Is remote inference ever allowed, or is local-only a hard requirement? (shapes W6.2/W7.4)
3. Should match actions be auto-executed with approval, or always manual? (shapes W4.3)
4. Which locales are actually shipped vs aspirational? (shapes W5.5)
5. Is a 9B default acceptable for the target machine, or must 4B remain default? (shapes W1.3)
