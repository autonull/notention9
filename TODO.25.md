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

---

## 3. Prioritized Roadmap

### Now (highest impact, low/medium effort)
| # | Task | Impact | Effort |
|---|------|--------|--------|
| 1 | W1.1 + W1.3 model matrix (incl. **9B**, **Gemma 4 4B**) | Quality decision | M |
| 2 | W1.2 Gemma wrapper detection | Unlocks Gemma | S |
| 3 | W2.1 friction digest CLI | Turns telemetry into priorities | S |
| 4 | W3.1 "Why this match" panel | Trust | M |
| 5 | W5.1 axe audit + critical fixes | Accessibility | M |
| 6 | W8.2 local eval canary | Prevents regressions | S |

### Next (after Now)
W1.4 retrieval v2 · W1.5 grammar auto-probe · W2.2 latency budget · W2.3 correction chips ·
W4.1 match gate · W6.1 performance budgets · W6.2 offline mode · W7.1 export/import.

### Later (larger/strategic)
W1.6 adaptive routing · W1.7 LoRA · W2.6 onboarding · W4.3 action approval · W5.3–W5.6 ·
W6.3 large workspace · W7.2–W7.4 backup/redaction · W9 docs.

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

---

## 8. Open Questions (need answers before Later items)
1. Primary user: solo knowledge worker, mutual-aid organizer, or agent operator? (shapes W3/W4 priority)
2. Is remote inference ever allowed, or is local-only a hard requirement? (shapes W6.2/W7.4)
3. Should match actions be auto-executed with approval, or always manual? (shapes W4.3)
4. Which locales are actually shipped vs aspirational? (shapes W5.5)
5. Is a 9B default acceptable for the target machine, or must 4B remain default? (shapes W1.3)
