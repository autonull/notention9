# The Grilling Process: Iterative Ambiguity Resolution

## Overview

A structured method for converging on implementation decisions through targeted questioning. Applicable to any ambiguously specified system given context material (specs, legacy code, user research, etc.).

## Core Insight

**Ambiguity is multidimensional.** A single "design decision" often contains 5-10 independent sub-decisions. Grilling exposes each dimension separately.

---

## When to Use

| Situation | Example |
|-----------|---------|
| New project with high-level vision but no implementation plan | "Build a semantic note-taking app" |
| Legacy system rewrite with unclear migration path | "Rewrite netjs in modern stack" |
| Feature area with competing design directions | "How should matching work?" |
| Implementation reveals hidden complexity | "Graph view doesn't scale to 5000 nodes" |
| Team disagreement on approach | "Aliases vs single field for role" |

---

## Process

### Phase 0: Context Loading
**Input:** Context material (README, specs, legacy code, user research, competitor analysis)
**Output:** 
- List of explicit decisions already made
- List of implicit assumptions
- Decision dependency map (what blocks what)
- Ambiguity inventory (what's underspecified)

**Questions to ask:**
- What is the north star / core metaphor?
- What constraints are non-negotiable?
- What prior art exists?
- What's the current architecture?

---

### Phase 1: Broad Grill (Direction Decisions)
**Scope:** High-level architectural/product choices
**Format:** Multiple choice with rationale
**Output:** Decision log entries with owners

**Question template:**
```
Header: [Short label]
Question: [Decision needed]
Options:
  - A: [Path] — [Tradeoff]
  - B: [Path] — [Tradeoff]
  - C: [Path] — [Tradeoff]
```

**Examples:**
- "Content addressing: migrate now / dual-mode / defer?"
- "First-run UX: capture-first / workspace-first / hybrid?"
- "Sync strategy: CRDT / event sourcing / central server?"

---

### Phase 2: Salvage Grill (Prior Art Adaptation)
**Scope:** Legacy system / competitor features worth adapting
**Format:** "How to adapt X into new architecture?"
**Output:** Adaptation decisions with mapping

**For each candidate feature:**
1. What problem did it solve in the old system?
2. Does that problem exist in the new system?
3. If yes: how to adapt (not port) into new architecture?
4. If no: discard

---

### Phase 3: Convergence Grills (Implementation-Level)
**Scope:** Concrete ambiguities blocking implementation
**Format:** Specific scenarios with concrete options
**Output:** Unambiguous implementation specs

**Question design principles:**
1. **One dimension per question** — not "how does matching work?" but "when desired note has constraint X and actual has fact Y, how is score computed?"
2. **Mutually exclusive, exhaustive options** — each = distinct implementation path
3. **Scenario-based** — "User types 'I need a bike under $500'. What persists?"
4. **Include tradeoffs** — complexity, user impact, future flexibility
5. **Force commitment** — no "both" unless genuine hybrid with clear boundaries

**Progression pattern:**
- Round 1: Core data model
- Round 2: Key algorithms
- Round 3: UI/UX flows
- Round 4: Edge cases & integration

---

### Phase 4: Verification Grill (End-to-End)
**Scope:** Full flow validation
**Format:** "Walk me through X scenario"
**Output:** Consistency check, remaining gaps

**Scenarios to test:**
- New user first capture → match → action
- Power user creating complex query
- Offline → online sync
- Multi-user collaboration flow
- Error/recovery paths

---

## Question Design Checklist

| Principle | ✓ |
|-----------|---|
| One dimension per question | |
| Options mutually exclusive & exhaustive | |
| Scenario-based when possible | |
| Tradeoffs explicit in descriptions | |
| No "both" unless genuine hybrid | |
| Header ≤ 30 chars | |
| Options ≤ 4 | |

---

## Decision Log Format

```markdown
| Date | Decision | Choice | Rationale | Phase | Reversible? |
|------|----------|--------|-----------|-------|-------------|
| 2026-10-20 | Typing system | Affinity replaces `type` | Unified Focus/Note model | 3 | Hard |
| 2026-10-20 | Role field | `role` not `modality` | Shorter; clearer | 3 | Medium |
| 2026-10-20 | Capture inference | Constraint ops = desired | Clear rule, no ontology dep | 3 | Easy |
```

**Fields:**
- **Reversible?** — Easy/Medium/Hard (informs future re-grilling)

---

## Artifacts Produced

| Artifact | Purpose |
|----------|---------|
| Decision Log | Append-only audit trail |
| Decision Dependency Graph | What blocks what |
| Rejected Alternatives | Prevents re-litigation |
| Open Questions Parking Lot | Deferred but captured |
| Updated Spec | Living document |

---

## Re-Grilling Protocol

### When to Re-Grill

| Trigger | Action |
|---------|--------|
| Implementation reveals new ambiguity | Targeted grill (1-2 questions) |
| User feedback contradicts assumption | Re-grill affected decisions only |
| Scope change (Phase 5 → Phase 1) | Full convergence grill on new scope |
| New team member onboards | Walk decision log; grill open questions |

### How to Re-Grill

1. **Identify the specific ambiguity** (one dimension)
2. **Write 1 focused question** with 3-4 options
3. **Get answer** (stakeholder, team, user proxy)
4. **Update spec + append to decision log**
5. **Update dependency graph** if new blocks emerge

**Don't re-grill the whole spec.** Only the ambiguous slice.

---

## Non-Determinism Warning

**Running this process again with different framings or answerers produces different valid architectures.**

The grilling reveals the **decision space**; answers choose a **path**. The artifact is the **decision log**, not the spec.

**Implication:** Two teams grilling the same README will produce different but equally valid architectures. Neither is "wrong."

---

## Tool Support (Minimal Viable)

| Tool | Purpose |
|------|---------|
| Structured question format (JSON) | Consistent question shape |
| Decision log (append-only) | Audit trail |
| Dependency visualization | See what blocks what |
| "Show decisions affecting X" query | Impact analysis |
| Re-grill scenario generator | Prompt for edge cases |

---

## Quick Start: Grilling a New Spec

```
1. READ context material (README, specs, legacy)
2. LIST explicit decisions + implicit assumptions
3. MAP dependencies (A blocks B)
4. INVENTORY ambiguities (what's underspecified?)
5. PRIORITIZE: what blocks implementation NOW?
6. GRILL top 3-5 ambiguities (Phase 3 format)
7. LOG decisions
8. UPDATE spec
9. REPEAT until implementation can start
```

---

## Example: Grilling a New README

**Context:** `README.md` describes "AI-powered semantic search for personal notes"

**Phase 0 outputs:**
- Explicit: local-first, semantic search, AI optional
- Implicit: single user, no sync, no collaboration
- Ambiguities: indexing strategy, AI model, query syntax, result ranking, privacy

**Phase 3 questions:**
1. "Indexing: full-text + embeddings hybrid / embeddings-only / full-text only?"
2. "AI model: local (WebLLM) / remote API / user choice?"
3. "Query syntax: natural language / structured / both?"
4. "Ranking: BM25 / vector similarity / hybrid / learned?"

**Result:** 4 decisions → implementation can start.

---

*This process is itself a product of grilling. It evolves with use.*