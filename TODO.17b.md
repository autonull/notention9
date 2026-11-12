# TODO.17b — Human Evidence & Handoff

**Status:** TODO.17 COMPLETE (2026-11-12). All automated gates green.

| Area | Status |
|------|--------|
| Local matcher + act step | ✅ Working |
| Golden path (capture → match → respond) | ✅ Verified in production build (`pnpm verify` L3) |
| Match quality baseline | ✅ F1 86.4% at product threshold (0.4) |
| Corpus | ✅ 864 notes, 14 domains (civilization-scale breadth) |
| P2 instruments | ✅ Live, honest, empty |

---

## What Remains: P2 Human Evidence (The Only Open Gate)

TODO.17 built the instruments. P2 requires **human sessions** to produce evidence. No code changes needed.

| Item | Instrument | Needs | Artifact | Depends On |
|------|------------|-------|----------|------------|
| **P2a** Comprehension probe | `pnpm probe` | 5 stranger sessions | `doc/evidence/2026-11-comprehension-probe.md` | — |
| **P2c.3** Match relevance | Same session as P2a | 5 sessions | Added to comprehension probe report | P2a |
| **P2b** Dogfood friction | `pnpm loop prioritize --source friction` | Real use sessions | `doc/evidence/2026-11-friction-taxonomy.md` | P2a seeds journal |
| **P2c.4** Time-to-first-match | `pnpm loop latency` | Real sessions | `doc/evidence/2026-11-time-to-first-match.md` | P2a |
| **P2c.5** Failure taxonomy | Journal → `loop/friction.json` | Real sessions | `doc/evidence/2026-11-friction-taxonomy.md` | P2b |

**Facilitator protocol:** `doc/evidence/HUMAN-SESSIONS.md` — exact steps, consent script, classification rubric, thresholds.

**Thresholds (from TODO.17):**
- Comprehension: ≥4/5 state purpose + next action unaided
- Golden-path completion: ≥4/5 complete capture → match → respond unaided
- Time-to-first-match: median < 2 min
- Match relevance: ≥60% "would act on this"

---

## Handoff to Civilization-Scale Work

**Input documents (strategy, not execution plans):**
- TODO.18 — Gap analysis, kill criteria, risk assessment
- TODO.19 — Local-first + Nostr + ElectricSQL/PowerSync
- TODO.19b — Tauri 2.0 + Event Sourcing + NIP-01 (16-week solo-feasible)
- TODO.19c — Pure TS + RxDB + Automerge + Expo (12-month team)

**These are contradictory and unfinalized. Do not execute any.**

---

## Decision Trigger for TODO.18-EXEC

When **one** of these is true, consolidate the best of the above into a single **TODO.18-EXEC**:

| Trigger | Action |
|---------|--------|
| P2 evidence meets thresholds | Draft TODO.18-EXEC with proven matcher + corpus |
| P2 reveals fundamental comprehension/friction failures | Fix locally first; defer network |
| Explicit pivot decision (solo/2-person, no funding) | Ship TODO.17 as "local-first tool with optional Nostr sync" |

**TODO.18-EXEC must have:**
- [ ] **One chosen architecture** (not four)
- [ ] **Team + funding committed** (or explicit solo scope)
- [ ] **Kill criteria as LAW** (time-boxed tracks, non-negotiable)
- [ ] **Protocol spec (TLA+)** before any network code

---

## What TODO.17 Locks In (Frozen — Do Not Revisit)

| Component | Frozen Spec |
|-----------|-------------|
| Matcher semantics | Roles (constraint/fact/marker), dimensional quantities, canonical keys |
| Act step schema | `match:accepted` / `match:withdrawn` ledger events |
| Quantity system | `compareQuantities`, `createCompoundQuantity`, `parseQuantity` |
| Ontology domains | `request`, `offer`, `skill`, `rate`, `budget`, `location` |
| Quality gates | Powered-or-silent, measured>observed, honest-negatives, consent-is-product |

**These are the foundation. Any future work builds on them. If they crack, everything above collapses.**