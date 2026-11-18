# TODO.26 — Next Phase: Depth & Breadth Across All Layers

> **Baseline**: TODO.25.md complete (W1–W12 done). Gates: core 934, UI 42 files, optimize 127, simulator 116, space/task-first/axe all pass. Match quality F1 0.803 (22/22). **Blocked**: W11.7 stranger test (needs human). **Open questions** (5) gate strategic Later work.

---

## 1. Completed Foundation (from TODO.25)

| Layer | Status |
|-------|--------|
| **Extraction quality** | Adaptive routing (2B/4B/9B), BM25 few-shot, grammar-gating auto-probe, golden gate 10/10 |
| **Match engine** | Cross-key matching, comma-separated value handling, CANONICAL mappings extended, F1 0.803 |
| **UI/UX** | W11 audit→cleanup→convergence complete; space utilization, task-first, accessibility all pass |
| **Data ownership** | Export/import (JSON/MD/CSV), encrypted backup, schema migration v0, PII redaction |
| **Observability** | Friction digest, match digest, LLM call telemetry, A/B→decisions pipeline |
| **Documentation** | Quickstart, model selection guide, 3 ADRs, eval how-to |
| **Simulator** | 38 scenario baselines calibrated, single-fork CI, 116 tests pass |

---

## 2. Workstreams for This Phase

### W1 — LM Extraction & Model Depth
**Goal**: Push extraction quality toward 0.85+ F1; support more models; reduce latency.

- [ ] **W1.1 Fetch & validate gated models**. Qwen 3.5 9B, Gemma 4 4B (need HF token). Add to matrix.
- [ ] **W1.2 CoT scratchpad (W1.8 from TODO.25)**. Flag-gated chain-of-thought before grammar; measure on 9B.
- [ ] **W1.3 Structured-output reliability**. JSON repair success rate → 99%+; schema validation before grammar.
- [ ] **W1.4 Domain adaptation**. Lightweight LoRA/QLoRA on 864 notes + synthetic if quality plateaus < 0.85.
- [ ] **W1.5 Prompt optimization loop automation**. `pnpm loop run` in CI nightly; auto-adopt verified improvements.

### W2 — Ontology Evolution
**Goal**: Ontology covers real capture patterns; extensible by users; drives better extraction/matching.

- [ ] **W2.1 Ontology coverage audit**. Map `data/eval/cases/` property usage → ontology keys; find gaps.
- [ ] **W2.2 User-defined keys**. Allow custom properties in capture; persist in note; include in match.
- [ ] **W2.3 Cross-key inference rules**. `need: "weekend coding mentor"` → `schedule: weekends`, `frequency: weekly`, `role: mentor`.
- [ ] **W2.4 Ontology versioning & migration**. Schema for ontology changes; auto-migrate note properties.
- [ ] **W2.5 Multi-modal property extraction** (image→properties). Parked in TODO.25 — now feasible with local vision models.

### W3 — Protocol & Network Layer
**Goal**: Reliable, private, decentralized sync & discovery; works offline-first.

- [ ] **W3.1 Nostr relay redundancy**. Multi-relay publish/subscribe; automatic failover; relay health scoring.
- [ ] **W3.2 Private groups / encrypted DMs**. NIP-17 / NIP-44 integration; invite-only match pools.
- [ ] **W3.3 Sync protocol v1**. Conflict-free note merge (CRDT or operational transform); version vectors.
- [ ] **W3.4 Relay discovery & bootstrap**. Well-known relays; user-added; latency-based selection.
- [ ] **W3.5 Bandwidth/usage budgets**. Mobile-friendly: batch sync, compress, delta-only, WiFi-only mode.

### W4 — Match & Action Usefulness
**Goal**: Matches lead to completed actions; user trusts the system.

- [ ] **W4.1 Match explanation UI**. "Why this match?" — show constraint coverage, key mappings, score breakdown.
- [ ] **W4.2 Action approval flow**. Preview → approve → execute → audit trail; undo window.
- [ ] **W4.3 Match feedback loop**. Accept/dismiss → re-rank → update few-shot corpus → retrain prompt.
- [ ] **W4.4 Scheduled/recurring matches**. "Notify me when a weekend coding mentor appears."
- [ ] **W4.5 Match quality canary in CI**. `pnpm optimize eval:match` on every PR; fail if mean F1 < 0.75.

### W5 — UI/UX Polish & Power Features
**Goal**: Calm surface; progressive disclosure of power; keyboard-first; accessible.

- [ ] **W5.1 Command palette v2**. Fuzzy search all actions; keybindings shown; extensible by plugins.
- [ ] **W5.2 Keyboard shortcuts manager**. View/edit/export shortcuts; conflict detection; vim/emacs modes.
- [ ] **W5.3 Reduced-motion & high-contrast polish**. Complete WCAG 2.2 AA; `prefers-reduced-motion` respected everywhere.
- [ ] **W5.4 Mobile PWA**. Installable; offline capture queue; background sync; push for match notifications.
- [ ] **W5.5 Theming & density**. User-controlled: compact/comfortable, light/dark/auto, accent color.

### W6 — Developer Experience & Extensibility
**Goal**: Easy to contribute, extend, and build on.

- [ ] **W6.1 Plugin API (v1)**. Register: commands, views, property extractors, match filters, UI panels.
- [ ] **W6.2 Type-safe config schema**. Zod/Valibot for all settings; auto-generate Settings UI; migration.
- [ ] **W6.3 CI/CD hardening**. Flake detection; perf regression benchmarks (strobe); visual regression (playwright).
- [ ] **W6.4 Local-first eval harness**. `pnpm eval:local` runs golden+quality+match without network.

### W7 — Hardening & Reliability
**Goal**: Production-ready for daily driver use.

- [ ] **W7.1 Error boundary & recovery**. Graceful degradation when LLM/storage/network fails; user-visible status.
- [ ] **W7.2 Data integrity verification**. Periodic checksum; auto-repair from backup; corruption alerts.
- [ ] **W7.3 Startup performance**. < 2s to interactive on cold start (desktop); < 3s mobile.
- [ ] **W7.4 Memory/leak soak test**. 24h automated run; alert on > 10% growth.

---

## 3. Now / Next / Later

### Now (start immediately, no open questions)
| # | Task | Area | Acceptance |
|---|------|------|------------|
| 1 | Fetch Qwen 9B / Gemma 4B with HF token | W1.1 | Models in `models/`, matrix run |
| 2 | Ontology coverage audit script | W2.1 | Report: gaps, unused keys, frequency |
| 3 | Match explanation UI (read-only) | W4.1 | "Why matched" panel in Inbox match preview |
| 4 | Command palette v2 core | W5.1 | Fuzzy search all verbs, keybindings visible |
| 5 | Multi-relay publish with failover | W3.1 | 3 relays configured, auto-failover test passes |

### Next (after Now items land)
| # | Task | Area | Depends on |
|---|------|------|------------|
| 6 | CoT scratchpad flag | W1.2 | W1.1 (9B model) |
| 7 | User-defined properties | W2.2 | W2.1 (audit) |
| 8 | Private groups (NIP-17/44) | W3.2 | W3.1 (multi-relay) |
| 9 | Match feedback → few-shot | W4.3 | W4.1 (explanation UI) |
| 10 | Plugin API v1 design | W6.1 | W5.1 (command palette) |

### Later (strategic, need decisions)
| # | Task | Area | Open Question |
|---|------|------|---------------|
| 11 | Multi-modal (image→properties) | W2.5 | Primary user persona (Q1) |
| 12 | Server-side llama.cpp batching | W1 | Throughput constraint (Q5) |
| 13 | Encrypted DMs / private match pools | W3.2 | Remote inference policy (Q2) |
| 14 | Auto-execute match actions | W4.2 | Manual vs auto approval (Q3) |
| 15 | Full i18n ship (6 locales + RTL) | W5 | Shipped locales list (Q4) |

---

## 4. Open Questions (must resolve for Later)

1. **Primary user**: solo knowledge worker / mutual-aid organizer / agent operator? → shapes W2.5, W3.2, W4.4 priority
2. **Remote inference**: ever allowed, or local-only hard requirement? → shapes W3.2, W1.1 (9B viability)
3. **Match actions**: auto-execute with approval, or always manual? → shapes W4.2, W4.4
4. **Shipped locales**: which 6 locales + RTL `ar` actually ship? → shapes W5.3, W5.5
5. **9B default**: acceptable for target machine, or must 4B remain default? → shapes W1.1, W1.2, W5.3 (mobile)

---

## 5. Definition of Done (per task)

- [ ] Code compiles (`pnpm build`)
- [ ] All tests pass (`pnpm test && pnpm test:ui`)
- [ ] Gates pass (`pnpm taxonomy:coverage`, `pnpm eval:verify-manifest`, `pnpm space:audit`)
- [ ] Evidence attached (screenshots, benchmarks, eval reports)
- [ ] TODO.26.md updated (checkbox, progress log entry)

---

## 6. Commands Reference

```bash
# Quality gates
pnpm test && pnpm test:ui
pnpm taxonomy:coverage
pnpm eval:verify-manifest
pnpm space:audit

# Extraction quality
pnpm prompts:eval matrix --models "models/qwen-9b.gguf,models/gemma-4b.gguf"
pnpm prompts:eval eval --provider llamacpp --quality
pnpm loop run --dry --output data/loop/runs

# Match quality
pnpm optimize eval:match

# Ontology
pnpm ontology:audit  # to be created in W2.1

# Network
pnpm simulator test --filter "multi-relay"

# UI
pnpm test:ui -- --run
pnpm strobe bench ui/bench.ts  # perf regression
```

---

## 7. Progress Log

### 2026-11-18 — TODO.26 created
- Baseline: TODO.25 complete (W1–W12). All gates pass. Match F1 0.803.
- Blocked: W11.7 stranger test (human).
- 5 open questions gate Later work.
- 7 workstreams defined (W1–W7), 5 Now items ready to start.