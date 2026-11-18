# TODO.26 — Next Phase: Depth & Breadth at ≤4B, Local-First

> **Baseline**: TODO.25 complete (W1–W12). Gates green: core 934, UI 42 files, optimize 127,
> simulator 116, space/task-first/axe all pass. Extraction golden 10/10, quality 39/70 (2B),
> match F1 0.803 (22/22). **Blocked**: W11.7 stranger test (needs a human).
>
> **Constraints for this phase**
> - Every task is local-first; no remote services, no CI, no GitHub automation.
> - Model cap: **≤4B** (Qwen 3.5 0.8B/2B/4B, Llama 3.2 3B). 9B is out of scope.
> - Each task must attach a reproducible command + artifact (eval JSON, screenshot, report).
> - Small, revertible commits; update this file's checkboxes and Progress Log as tasks land.

---

## 1. Deferred (explicitly out of scope — do not start)

| Item | Why deferred | Revisit trigger |
|------|--------------|-----------------|
| Models above 4B (Qwen 9B, larger Gemma) | Economy + VRAM ceiling; 4B is the worthy challenge | 4B plateaus < 0.85 F1 *and* hardware changes |
| LoRA / QLoRA fine-tune | High effort, gated model downloads | Structured-output + prompt work plateaus < 0.85 |
| Plugin API | Needs stable internal registries first | Command palette v2 + action registry land |
| CI / GitHub Actions | User declined all GitHub automation | Never (local `pnpm verify` is the gate) |
| Multi-modal (image→properties) | Needs ontology extension + vision model | A ≤4B vision model fits the VRAM budget |
| 24h soak test | 30-min leak check already green | A leak escapes the 30-min check |
| WebLLM GPU CI, server-side batching | Parked in TODO.25 | Downloaded by real usage |

---

## 2. Guiding principles

1. **Local-first, single machine.** No network dependency for golden path.
2. **Evidence-gated.** A task is done only when its gate command + artifact are committed.
3. **Human gates stay human.** W11.7 and subjective verdicts are never self-certified.
4. **No new native deps** without `pnpm check:purity`; no fabricated paths (`pnpm lint:fabricated`).
5. **Fast feedback first.** Test-suite runtime is a first-class defect class.

---

## 3. Workstreams

### W1 — Extraction quality at ≤4B
**Goal**: Highest achievable F1 with 0.8B/2B/4B; golden 10/10; quality ≥ 65/70.

- [ ] **W1.1 Fix the Qwen 3.5 4B regression.** It currently falls back to deterministic
  extraction (golden 3/10). Diagnose: grammar/chat-wrapper mismatch vs prompt mismatch vs
  context length. Acceptance: golden ≥ 9/10, quality pass ≥ 50/70, no fallback in logs.
  Command: `LLAMA_MODEL_PATH=models/Qwen_Qwen3.5-4B-Q4_K_M.gguf pnpm prompts:eval eval --provider llamacpp`.
- [ ] **W1.2 Structured-output reliability.** JSON repair + schema validation *before* grammar
  retry; log repair rate. Acceptance: repair success ≥ 99% on quality corpus; zero silent drops.
- [ ] **W1.3 CoT scratchpad, flag-gated.** Measure CoT on 2B and 4B only (no 9B); keep the flag
  off by default unless it wins on quality at equal latency. Acceptance: A/B table committed.
- [ ] **W1.4 Few-shot corpus v3 + prompt loop.** Expand retrieval corpus with domain-holdout
  cases; run `pnpm loop run` manually after each prompt change. Acceptance: quality F1 ↑,
  golden unchanged; loop report archived under `data/loop/runs/`.
- [ ] **W1.5 Latency budget on 4B.** Progressive extraction: first properties < 300 ms,
  LLM refinement p50 < 800 ms, p95 < 1500 ms. Acceptance: `pnpm perf:budget` report.
- [ ] **W1.6 Quality corpus expansion (60 → 100 cases).** Balance across gig, freelance,
  events, knowledge, governance; add holdout split. Acceptance: manifest verified; per-domain
  F1 table in `doc/EVAL_HOWTO.md`.

### W2 — Ontology & local knowledge graph
**Goal**: The ontology describes real captures; notes connect to each other locally.

- [ ] **W2.1 Ontology coverage audit.** `pnpm ontology:audit` (new): property usage across
  `data/eval/cases/` + fixtures vs ontology keys → gaps, unused keys, coverage %. This is the
  evidence that steers W2.2–W2.4. Acceptance: deterministic JSON + Markdown report.
- [ ] **W2.2 User-defined properties.** Capture an unknown key → persist on the note → include
  in matching and in the ontology view. Acceptance: round-trip test; match test with custom key.
- [ ] **W2.3 Cross-key inference rules.** Extend `REQUEST_TO_OFFER_KEY_MAP` with inference:
  `need:"weekend coding mentor"` → `schedule: weekends`, `frequency: weekly`, `role: mentor`.
  Acceptance: 10 new match cases; no regression on the 22 existing.
- [ ] **W2.4 Related notes & backlinks (local).** "See also" panel on a note using shared
  ontology keys, tags, and `CoOccurrenceAnalyzer`/`GraphDataBuilder`. Read-only, no server.
  Acceptance: deterministic fixture test; screenshot before/after; no O(n²) scans (indexed).
- [ ] **W2.5 Ontology versioning & note migration.** Version the ontology document; migrate
  stored notes when keys are renamed/merged. Acceptance: fixture migration + idempotent re-run.

### W3 — Protocol, sync & network
**Goal**: Reliable local/relay sync and discovery; private by default.

- [ ] **W3.1 Multi-relay publish with failover.** Publish to N configured relays, score health
  (connect latency, publish success), auto-failover, surface state in `RelayStatusBanner`.
  Acceptance: 3-relay simulator scenario (one dead) → publish succeeds; state visible.
- [ ] **W3.2 Sync protocol v1 (multi-device notes).** Version vectors + deterministic merge;
  conflict policy per open question Q7. Acceptance: two-client simulator scenario with
  concurrent edits converges; conflict audit trail.
- [ ] **W3.3 Relay discovery & bootstrap.** Well-known relay lists + user-added + latency
  selection; no hardcoded single relay. Acceptance: discovery test with seeded candidates.
- [ ] **W3.4 Bandwidth & battery budgets.** Delta-only sync, compression, batching, WiFi-only
  mode. Acceptance: payload size report (bytes/note) before/after.
- [ ] **W3.5 Private groups / encrypted DMs (NIP-17/44).** Deferred to Later pending Q2/Q9.
  Acceptance: private pool test; no plaintext metadata leakage.

### W4 — Match & actions
**Goal**: Users trust matches and can act on them safely.

- [ ] **W4.1 Match explanation UI ("Why this match?").** Read-only panel: covered/missing
  constraints, cross-key mappings used, score breakdown, offer excerpt. Data already exists in
  `MatchEngine`. Acceptance: UI test + screenshot; no new inference calls.
- [ ] **W4.2 Match feedback loop.** Accept/dismiss → re-rank future matches + append to the
  few-shot corpus (no retraining). Acceptance: before/after relevance on the match set.
- [ ] **W4.3 Action approval & audit.** Preview "what will happen" + capability scope →
  approve/deny → audit entry → undo window. Acceptance: an action cannot execute without an
  approval record; audit is exportable.
- [ ] **W4.4 Scheduled / recurring matches.** "Notify me when a weekend coding mentor appears";
  respects quiet hours and the local digest. Acceptance: virtual-clock test; no duplicate alerts.
- [x] **W4.5 Match canary in `pnpm verify`.** Gate: mean F1 ≥ 0.75 and zero case regressions.
  Local only (no CI). Implemented as `pnpm eval:match --pass-threshold 0.75` in the L1 lane.
  Verified: exits 0 at F1 0.803, exits 1 when the threshold is raised above the observed score.

### W5 — UI/UX, accessibility & i18n
**Goal**: Calm surface, keyboard-first, accessible in every shipped locale.

- [ ] **W5.1 Command palette v2.** Fuzzy search over actions *and* notes (`#tag`, `key:value`),
  keybindings shown per command, recent/frequent section, max 100 rows. Acceptance: keyboard-only
  journey test; palette open < 50 ms on 10k notes.
- [ ] **W5.2 Keyboard shortcuts manager.** View/edit/export shortcuts, conflict detection,
  reset-to-default. Acceptance: persisted overrides; conflict warning test.
- [ ] **W5.3 i18n completeness audit.** 6 locales + RTL `ar`: missing keys, orphan keys,
  pseudo-locale expansion test; fix layout leaks in RTL. Acceptance: `pnpm i18n:audit` report 0 gaps.
- [ ] **W5.4 Screen-reader smoke script.** Documented NVDA/VoiceOver checklist per view;
  live regions for async extraction/match; no unlabeled controls. Acceptance: checklist + axe green.
- [ ] **W5.5 Theming & density.** Compact/comfortable density, light/dark/auto, accent color;
  respects `prefers-reduced-motion` and `prefers-color-scheme`. Acceptance: screenshot matrix
  (2 densities × 3 themes) + contrast check.
- [ ] **W5.6 Mobile PWA install.** Installable manifest, offline capture queue, background
  sync on reconnect. Acceptance: Lighthouse installability + offline capture test (no push).

### W6 — Security, data & reliability
**Goal**: Data survives loss, theft, and bugs; failures are visible and recoverable.

- [ ] **W6.1 Encryption at rest + auto-lock.** Encrypt IndexedDB/local storage with a key from
  OS keychain or user passphrase (per Q6); idle auto-lock with explicit unlock. Acceptance:
  raw-storage inspection shows no plaintext notes; unlock flow test.
- [ ] **W6.2 Scheduled backup + restore verification.** Auto-backup on interval/change with
  rotation; `pnpm restore:verify` restores a backup into a scratch profile and diffs note counts,
  properties, tags, revisions. Acceptance: green restore report; failure alerts in UI.
- [ ] **W6.3 Retention policies.** Trash auto-purge (default 30 d), revision pruning (50/note),
  backup rotation (7). Acceptance: virtual-clock tests; dry-run CLI (`pnpm retention:run --dry`).
- [ ] **W6.4 Import interop (Markdown).** Import Obsidian-style frontmatter/tags + body into
  notes; complete the round-trip with `markdownExport`. Acceptance: lossless fixture round-trip +
  documented lossy edges (attachments, aliases).
- [ ] **W6.5 Error boundaries & degraded mode.** Offline/LLM-timeout/storage-full paths show
  status and retry; no dead ends. Acceptance: fault-injection tests; state visible in UI.
- [ ] **W6.6 Data integrity.** Per-store checksums on write, detect corruption at startup,
  auto-repair from the newest valid backup. Acceptance: corruption fixture → repaired + reported.
- [x] **W6.7 Test-infra hardening.** (a) ✅ migrate deprecated `poolOptions` to Vitest 5
  top-level (`ui`: `maxWorkers: 1` + `isolate: false`; `simulator`: default parallel forks);
  (b) ✅ relay binds ephemeral `port: 0` and reports the bound port (`url` getter +
  `start()`; 5 new tests); (c) ✅ test helpers return the bound URL, no fixed 100 ms sleep;
  (d) ✅ the calibration suite ran on every `pnpm test` (doubling work) — now gated behind
  `CALIBRATE=1` / `pnpm sim:calibrate`. Measurement file: 968 s → 485 s; full simulator
  suite 483 s (`78 passed | 38 skipped`, was ~21 min). Two concurrent relay-using suites
  both pass. Remaining (follow-up): the measurement file is still ~8 min; further reduction
  needs a per-scenario budget audit (agent-readiness waits), not more parallelism.
- [ ] **W6.8 Startup performance.** Cold start to interactive < 2 s desktop / < 3 s mobile;
  measure with the strobe harness. Acceptance: timed report before/after.

### W7 — Developer experience & docs (local only)
**Goal**: A contributor can build, test, and extend without tribal knowledge.

- [ ] **W7.1 Type-safe config schema.** Zod/Valibot for all settings; generate the Settings UI
  from the schema; migrate stored settings. Acceptance: unknown key is a type error; migration test.
- [ ] **W7.2 Local eval harness.** `pnpm eval:local` runs golden + quality + match offline,
  prints one table, writes artifacts. Acceptance: one command, no network, < 5 min for golden+match.
- [ ] **W7.3 Architecture & contributor guide refresh.** `ARCHITECTURE.md` is stale (GSS/GeoLibre
  vs the current packages); document packages, data flow, and the local-first constraints. Also fix
  the workspace manifest drift: `pnpm-workspace.yaml` lists `packages/conformance`, but the package
  lives at `conformance/` (its `node_modules` symlinks are stale).
  Acceptance: doc review checklist; no references to removed systems; workspace install clean.
- [ ] **W7.4 ADR refresh.** New ADRs: encryption-at-rest, sync-v1 merge policy, ≤4B quality
  strategy; update the index in `doc/decisions/README.md`.

---

## 4. Prioritization

Score = **impact** (trust, value, risk reduction) × **confidence** ÷ **effort**, with data-loss,
security, and feedback-speed risks weighted up. Now items are independent of the open questions.

### Now (start immediately)
| # | Task | Why now |
|---|------|---------|
| 1 | **W1.1** Fix 4B regression | The stated cap is 4B; today 4B fails golden 3/10 → the cap is unusable |
| 2 | **W6.7** Test-infra hardening | 16–21 min feedback blocks every other task; two live defects found |
| 3 | **W6.1** Encryption at rest + auto-lock | Largest unmitigated risk: notes are plaintext on disk |
| 4 | **W2.1** Ontology coverage audit | Cheap, deterministic evidence that steers W2.2/W2.4 and W1.6 |
| 5 | **W4.1** Match explanation UI | Trust win on data that already exists; no inference cost |

### Next (after the Now items land)
| # | Task | Depends on |
|---|------|------------|
| 6 | **W1.2** Structured-output reliability | W1.1 diagnosis |
| 7 | **W2.4** Related notes & backlinks | W2.1 audit |
| 8 | **W3.1** Multi-relay failover | — |
| 9 | **W5.1** Command palette v2 | — |
| 10 | **W4.2** Match feedback loop | W4.1 (needs the explanation data model) |
| 11 | **W6.2** Auto-backup + restore verification | W6.1 key management |

### Later (needs decisions or larger effort)
| # | Task | Gate |
|---|------|------|
| 12 | **W3.2** Sync v1 | Q7 (merge policy) |
| 13 | **W3.5** Private groups NIP-17/44 | Q2 / Q9 (remote policy) |
| 14 | **W4.3** Action approval flow | Q3 (auto vs manual) |
| 15 | **W5.3–W5.6** i18n, a11y script, theming, PWA | Q4 (shipped locales) |
| 16 | **W6.3–W6.6** Retention, import, error states, integrity | Q8 (retention defaults) |
| 17 | **W7.1–W7.4** DX, docs, ADRs | — |

---

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation (task) |
|------|-----------|--------|-------------------|
| Local data loss / theft (plaintext) | High | Severe | W6.1, W6.2, W6.6 |
| 4B quality ceiling stalls the cap | Medium | High | W1.1–W1.6 with holdout corpus |
| Sync conflicts corrupt notes | Medium | Severe | W3.2 version vectors + audit trail, W6.2 restore |
| Slow suite hides regressions | High | Medium | W6.7 runtime budget + canaries (W4.5) |
| Ontology drift vs real captures | Medium | Medium | W2.1 audit → W2.2/W2.5 |
| Match distrust | Medium | High | W4.1 explanation, W4.2 feedback |

---

## 6. Open Questions

**Resolved by this phase's constraints**
- ~~9B default acceptable?~~ → **No**: 4B is the cap.
- ~~Remote inference allowed?~~ → **Local-first**; remote stays opt-in and PII-redacted only.

**Open (gate Later work)**
1. **Primary user**: solo knowledge worker / mutual-aid organizer / agent operator? → W4.4, W5.6.
2. **Remote provider**: keep opt-in redacted inference, or remove it for local-only clarity? → W3.5, W6.1.
3. **Match actions**: auto-execute with approval, or always manual? → W4.3.
4. **Shipped locales**: which of the 6 + RTL `ar` actually ship? → W5.3, W5.5.
5. **Encryption at rest key source**: OS keychain, per-session passphrase, or both? → W6.1.
6. **Sync merge policy**: last-write-wins with an audit trail, or full CRDT? → W3.2.
7. **Retention defaults**: trash 30 d, revisions 50/note, backups 7? → W6.3.

---

## 7. Definition of Done (per task)

- [ ] Code compiles (`pnpm build`) and typechecks
- [ ] `pnpm test && pnpm test:ui` pass
- [ ] `pnpm taxonomy:coverage` + `pnpm eval:verify-manifest` pass
- [ ] Evidence artifact committed (eval JSON / screenshot / report)
- [ ] Docs updated when behavior or defaults change
- [ ] This file updated (checkbox + Progress Log entry)

---

## 8. Commands

```bash
# Build & tests (local only; no CI)
pnpm build && pnpm test && pnpm test:ui

# Gates
pnpm verify
pnpm taxonomy:coverage
pnpm eval:verify-manifest
pnpm space:audit

# Extraction quality (≤4B)
pnpm prompts:eval matrix --models models/Qwen_Qwen3.5-0.8B-Q4_K_M.gguf,models/Qwen_Qwen3.5-2B-Q4_K_M.gguf,models/Qwen_Qwen3.5-4B-Q4_K_M.gguf
pnpm prompts:eval eval --provider llamacpp --quality
pnpm loop run --output data/loop/runs          # manual prompt loop

# Match quality (exit code 1 when below the gate)
pnpm eval:match --pass-threshold 0.75
pnpm match-relevance

# Ontology (new in W2.1)
pnpm ontology:audit

# Data & security (new in W6)
pnpm restore:verify
pnpm retention:run --dry

# Simulator (calibration is opt-in; default run skips it)
pnpm --filter @notention/simulator test
pnpm sim:calibrate
```

---

## 9. Progress Log

### 2026-11-18 — W6.7 test-infra + W4.5 match canary
- **W6.7 (a)** Migrated deprecated Vitest `poolOptions`: `ui` → `maxWorkers: 1` (isolation kept —
  `isolate: false` leaks module state across files and fails 30+ tests); `simulator` → default
  parallel forks. No more config warnings.
- **W6.7 (b)** `NostrRelay` now supports `port: 0` (ephemeral): `url` is a getter and `start()`
  resolves with the bound port. Fixed the `options.port ?? bound` bug that produced `ws://…:0`.
  5 new tests in `core/src/network/nostr/relay.test.ts`.
- **W6.7 (c)** Simulator/conformance relay helpers return the bound URL and await the real
  `listening` event instead of sleeping 100 ms. Test files are parallel-safe.
- **W6.7 (d)** The "Baseline Calibration" suite was running on every test run (it was not
  skipped), doubling the simulator work. Now gated by `CALIBRATE=1` (`pnpm sim:calibrate`).
  Measurement file: 968 s → 485 s; full simulator suite 483 s (`78 passed | 38 skipped`).
  Two concurrent relay-using suites pass.
- **W4.5** Match canary wired into `pnpm verify` (`pnpm eval:match --pass-threshold 0.75`).
- **CLI parser fix (found by W4.5)**: `--pass-threshold` (and every kebab-case option read as
  camelCase, e.g. `--allow-draft`) was silently ignored. Replaced the ad-hoc parser with
  `node:util` `parseArgs` seeded from each command's `options`; kebab and camel keys are both
  exposed, numbers are coerced only for numeric options. Verified: gate passes at 0.75, fails
  above the observed score.

### 2026-11-18 — TODO.26 revised (constraints applied)
- **Cap at 4B**: removed 9B/Gemma fetch; W1 reframed as the ≤4B quality challenge; 4B regression
  is now the top Now item.
- **Fully deferred**: Plugin API, LoRA, CI/GitHub automation, multi-modal, 24 h soak — recorded in
  §1 with revisit triggers.
- **Added missing areas**:
  - Local knowledge graph: related notes & backlinks (W2.4), ontology versioning (W2.5).
  - Security: encryption at rest + auto-lock (W6.1); auto-backup + restore verification (W6.2);
    retention policies (W6.3); import interop (W6.4); data integrity (W6.6).
  - Quality: 4B regression (W1.1), structured-output reliability (W1.2), corpus 60→100 (W1.6).
  - UX: command palette v2 + shortcuts manager, i18n completeness audit, screen-reader script,
    theming/density, PWA install (W5.1–W5.6).
  - DX: type-safe config, local eval harness, stale architecture doc, ADR refresh (W7).
- **Discovered defects** (Now #2): Vitest v5 ignores deprecated `poolOptions.forks.singleFork` in
  `simulator/vitest.config.ts`; `NostrRelay` builds `ws://…:0` when given `port: 0` because of
  `options.port ?? bound`. Suite takes 16–21 min.
- **Prioritization**: Now = 4B fix → test-infra → encryption → ontology audit → match explanation.
- **Open questions** reduced from 5 to 7 (2 resolved by constraints, 4 added: key source, merge
  policy, retention defaults, remote provider disposition).
