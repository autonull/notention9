# TODO.23 — The Coordination Paradigm: Development, Usability, Ontology Evolution & Demonstration

**Status:** Active — continuous phase after all code increments (0–10) reach baseline (990 tests, gates G0–G9)
**Premise:** The implementation baseline exists. We are **not done** — and "done" is the wrong frame. This phase establishes a *perpetual improvement cycle* across four interlocking fronts.

**North Star:** Make **"notes as coordination primitives"** as intuitive and universal as email — so any person, group, or community can coordinate needs, offers, and commitments with verifiable trust, offline, without servers, without gatekeepers.

---

## 0. Vision & Stakes

### The Paradigm We Aim to Ubiquitize

Today, coordination is fragmented:
- **Markets** (Craigslist, Upwork) — transactional, trust-poor, fee-taking, online-only.
- **Social feeds** — broadcast, non-actionable, attention-extractive.
- **Group chats** — ephemeral, unsearchable, no commitment tracking.
- **Spreadsheets/CRMs** — powerful but expert-only, server-bound.

**Notention's thesis:** The **note** is the universal primitive. Everyone already writes notes — shopping lists, reminders, meeting notes, "ISO," "for sale," "anyone know a good plumber?" A *request* is a note. An *offer* is a note. An *agreement* is a note thread with verifiable receipts. A *manifest* is a note about needs. A *map* is notes with places.

If notes can **semanticize themselves** (extract structured properties from natural language), **match bidirectionally** (request↔offer with explanations), **commit verifiably** (signed receipt chains), and **sync resiliently** (offline-first, multi-relay, mesh), then **coordination becomes a property of note-taking itself** — not a separate app, platform, or marketplace.

### Why Civilization-Scale

The system's taxonomy is explicitly grounded in coordination science, not marketing:

| Axis | Values | Intellectual Root |
|------|--------|-------------------|
| **Social Form** | communal, authority, equality, market | Fiske's Relational Models |
| **Topology** | 1:1, 1:N, N:M, chain, coalition, hierarchy, mesh | Network/participant structure |
| **Exchange** | goods, labour, knowledge, capital, care, space, access, commitment, status, identity | What moves between people |
| **Stakes** | info, social, economic, legal, safety, existential | What is at risk |
| **Temporality** | one-shot, recurring, open-ended, deadline, ephemeral, generational | Time structure |
| **Heterogeneity** | shared, cross-domain, multilingual, tacit, contested | Diversity of context |
| **Governance** | boundaries, congruence, collective-choice, monitoring, graduated-sanctions, conflict-resolution, recognition, nested-enterprises | Ostrom's Commons Principles |
| **Power / Formality / Dignity** | none→extreme / informal→legalistic / irrelevant→central | Asymmetry, contracts, honour |

**This is not a gig-economy app.** It is infrastructure for the full space of human coordination — from a family sharing childcare (communal, care, generational, high trust) to a village managing a shared well (Ostrom governance, existential stakes) to a disaster response network (mesh topology, safety stakes, ephemeral) to a global open-source project (N:M, knowledge, open-ended, cross-domain).

**Lives at stake:** A diabetic family finding shelter with refrigeration during an evacuation. A neighbourhood coordinating water during a grid failure. A worker finding dignified work without platform extraction. A community governing a shared resource without a state or a corporation. A stranger trusting a commitment because the receipt chain is verifiable offline.

### What "Done" Never Means

The 990 tests and gates G0–G9 prove the *machinery works*. They do **not** prove:
- That it is **learnable** by non-experts.
- That the **ontology covers** the coordination space people actually inhabit.
- That it is **intuitive** — that a first-time user knows what to do.
- That it **helps** — that coordination outcomes measurably improve.

Those are proven only by **demonstration, simulation, and real use** — which reveal gaps we have not yet seen. **The purpose of this phase is to find those gaps and close them.**

---

## 1. The Four Fronts (Concurrent, Interlocking — Not Sequential)

We advance all four fronts **in parallel**. Each feeds the others. No front waits for another to "finish."

```
        ┌──────────────────────────────────────────────────────────────┐
        │                                                              │
        ▼                                                              │
  ┌───────────┐   reveals gaps   ┌───────────┐   reveals gaps          │
  │  FRONT D  │ ───────────────▶ │  FRONT A  │ ───────────────▶        │
  │ DEMONSTRA-│                  │ FUNCTION- │                          │
  │ TION &    │ ◀─────────────── │ ALITY     │                          │
  │ TEACHING  │   new artifacts  │           │                          │
  └───────────┘                  └───────────┘                          │
        ▲                              ▲                                │
        │                              │                                │
        │  relatable movies            │  fixes & additions             │
        │  teach the paradigm          │                                │
        │                              │                                │
  ┌───────────┐   exposes friction ┌───────────┐                        │
  │  FRONT C  │ ───────────────▶   │  FRONT B  │ ───────────────────────┘
  │ ONTOLOGY  │                    │ USABILITY │
  │ EVOLUTION │ ◀───────────────   │ & NOTE    │
  │ (community│   new vocabulary   │ PARADIGM  │
  │  simul.)  │                    │           │
  └───────────┘                    └───────────┘
        │                              │
        └──────────────┬───────────────┘
                       ▼
              ┌─────────────────┐
              │   MEASUREMENT   │
              │ (validates all) │
              └─────────────────┘
```

| Front | Question It Answers | Primary Artifact |
|-------|--------------------|------------------|
| **A. Functionality** | "Does it work, completely and correctly?" | Code + tests |
| **B. Usability** | "Can anyone learn and use it?" | Simplified UI + flows |
| **C. Ontology Evolution** | "Does it cover the coordination space people inhabit?" | Evolved ontology + corpus |
| **D. Demonstration & Teaching** | "Can we show and teach it?" | Scenarios + videos + docs |

**Rule:** Every artifact produced on one front is *input* to another. A video (D) that reveals a confusing flow is a usability fix (B) and possibly a missing feature (A). A community simulation (C) that reveals an unextractable phrase is an ontology patch (C) and maybe a UI hint (B).

---

## 2. FRONT A — Functionality Development

**Goal:** Close functional gaps revealed by demos and simulations. Not "add features" — *complete* and *harden* what the 11 capabilities promise.

### A.1 Known Functional Gaps (from code audit)

| Gap | Location | Priority |
|-----|----------|----------|
| LLM synonym/ontology search is a stub | `ui/src/services/ai/WebLLMProvider.ts` | P1 |
| Agent command execution is a placeholder | `agent/src/core/actionExecutor.ts` | P2 (security-sensitive; keep gated) |
| Transcript/session persistence (browser coordinator) | `agent/src/core/actionExecutor.ts` | P2 |
| Match protocol `metadata` round-trip edge cases | `core/src/matching/matchProtocol.ts` | P1 |

### A.2 Gap-Discovery Engine (runs continuously)

Use the built-in **self-improving loop** to discover functionality gaps from evidence:

```bash
# Discover seams, strategies, tasks, golden cases, ontology drift
pnpm loop discover
# Prioritize by impact (frequency × severity × recoverability × reach)
pnpm loop prioritize --source friction
# Synthesize candidate fixes (T1 compose / T2 LLM-behind-seam / T3 new seam / T4 request)
pnpm loop synthesize
# Evaluate against baseline + golden cases + simulator distribution
pnpm loop evaluate
# Adopt winners behind feature flags with provenance + rollback
pnpm loop adopt
```

**Done-when (per cycle):** Top-priority friction signal is addressed with evidence (deterministic tests + no golden-case regression + measurable outcome improvement).

### A.3 Never-Regress Invariants

Every functional change must keep:
- 990+ deterministic tests green (`pnpm test`).
- Typecheck + lint + purity + fabricated-path + schema + contract gates green (`pnpm verify`).
- Export/import round-trips intact.
- Offline behaviour intact (chaos drills pass).

---

## 3. FRONT B — Usability & The Note Paradigm

**Goal:** Make the system **intuitive and learnable by everyone** by mapping its mental model onto **note-taking** and **email**, using **progressive disclosure**. Do not confront users with a screen of widgets.

### B.1 Design Principles (Non-Negotiable)

| Principle | Meaning | Anti-Pattern to Remove |
|-----------|---------|------------------------|
| **Note paradigm first** | Everything is a note; the primary surface is a list of notes | Abstract "Dashboard / Network / Ontology" tabs as landing |
| **Email mental model** | Inbox (matches/requests to me), Sent (my published notes), Drafts, Contacts | "Network Matches" vs "Local Matches" split without explanation |
| **Progressive disclosure** | Show the 1 primary action + essentials; reveal advanced on demand | Ontology tree, agent caps, metrics all visible at once |
| **One obvious primary action** | "New note" / "Ask" / "Offer" always one tap away | Hidden in menus or modals |
| **Semantic = invisible magic** | User writes natural language; properties/chips appear | Forcing manual property tagging |
| **Coordination = thread** | Request → response → accepted → done, like an email thread | Exposing the 8-state protocol machine as UI |
| **Offline = normal** | Subtle sync indicator; automatic queue/drain | Loud "OFFLINE" banner, manual sync buttons |
| **Identity = account** | npub = your address; devices = logged-in sessions | Separate "Identity Manager" + "Device Manager" surfaces |
| **Evidence, not assertion** | Matches explain *why* in plain language | Opaque scores |

### B.2 Information Architecture Target (Before → After)

| Current Surface | Target Surface (Note Paradigm) |
|-----------------|-------------------------------|
| Dashboard: Stats + Matches + Activity + Quick Actions + Network Matches | **Home/Inbox**: unread matches & incoming requests (primary), sent notes, drafts |
| Network View: Relays + Invites + Members + Private Networks | **Connections**: relay health (subtle), "Invite someone," contact list |
| Ontology Tab: full tree + attrs + enums + import/export | **Labels** (simple tag manager); advanced = "Open Ontology Editor" (opt-in) |
| Agent Tab: capability toggles + plugin list | **Automation**: "Let the assistant help with…" (on/off); advanced = details |
| Metrics Tab: 4 charts + tables | **Insights**: one summary card; "View details" expands |
| Match Protocol: 8 states, receipt chain, export | **Thread view**: Request → Response → Accepted → Done; "View agreement" shows receipts |
| Settings: AITab/DataTab/OntologyTab/MetricsTab/AgentTab | **Settings**: 3 groups — Basics, Connections, Advanced |

### B.3 Progressive Disclosure Rules

1. **Landing = list of notes.** Advanced panels collapsed by default.
2. **Advanced surfaces behind "Advanced" or "Settings."** Never on the primary path.
3. **Just-in-time hints.** Explain a concept the first time it appears (dismissible).
4. **One primary CTA per screen.** Everything else is secondary/tertiary.
5. **No dead ends.** Every error offers a next step.
6. **Default to safe.** Advanced/destructive actions require explicit reveal.

### B.4 Evaluation Method

- **Comprehension probe** (`scripts/comprehension-probe.ts`): after each UI change, measure "what is this screen?" comprehension.
- **Time-to-first-coordination**: from first launch to first accepted match. Target: **< 2 minutes** for a first-time user with a clear task.
- **Stranger test** (`scripts/stranger-test.ts`): 5 unfamiliar users, one task per capability. Record confusion points.
- **Per-screen rubric (1–5)** across 7 dimensions: comprehension, primary-action findability, progressive disclosure, familiar language, note-centricity, error recovery, offline confidence. **Target ≥ 4.**

**Done-when (per surface):** ≥ 4/5 rubric; time-to-first-coordination target met; no P0 stranger-test blocker.

---

## 4. FRONT C — Ontology Evolution via Community Simulation

**Goal:** Use the simulator and corpus pipeline as a **"community laboratory"** to discover what coordination vocabulary real people need, then evolve the ontology to cover it — closing gaps between the taxonomy's theoretical axes and lived coordination.

This front is where the civilization-scale ambition becomes concrete and testable.

### C.1 The Ontology Evolution Loop

```
  Real-world text  ──▶  Corpus ingestion  ──▶  Taxonomy gap analysis
  (corpus/*.md)         (extract terms,         (which axes/values are
                         vocabulary,             missing or under-served?)
                         test cases)
        │                      │                      │
        │                      ▼                      ▼
        │              Generated extraction/match   Gap report
        │              test cases                   (e.g. "care/kinship
        │                      │                    not covered")
        │                      ▼                      │
        │              Ontology audit (E7) ◀──────────┘
        │              (frequency, co-occurrence lift,
        │               operator drift, orphan keys,
        │               missing hierarchies)
        │                      │
        │                      ▼
        │              Ontology patch proposals (E14)
        │              (operator defaults, hierarchies,
        │               new attributes/nodes)
        │                      │
        │                      ▼
        │              Generalization test
        │              (22 match cases + holdout + 200-run simulator distribution)
        │                      │
        │                      ▼
        │              Adopt patch (behind flag) ──▶ Re-run community simulation
        │                      │
        └──────────────────────┘
             (new corpus words from simulation transcripts)
```

### C.2 Concrete Pipeline (exists — wire it into a cycle)

| Stage | Tool / Command | Output |
|-------|----------------|--------|
| **Corpus ingestion** | `pnpm loop corpus` → `optimize/src/corpus/ingest/orchestrator.ts` | Extracted terms, vocabulary, generated test cases, `taxonomyGaps[]` |
| **Taxonomy gap analysis** | `identifyTaxonomyGaps()` → `taxonomyGapAnalyzer.ts` | Missing axes/values (care, mentorship, open-source, legal, crisis, long-term) |
| **Ontology audit (E7)** | `optimize/src/ontology/audit.ts` | Key frequency, co-occurrence lift, operator drift, orphan keys, missing hierarchies |
| **Patch generalization (E14)** | `optimize/src/ontology/patchTest.ts` | Patch results: match F1/precision/recall on 22 cases + holdout + simulator match rate |
| **Ontology experiment** | `optimize/src/experiments/ontologyExperiment.ts` | Flat vs facets+status comparison (success rate, duration, winner) |

### C.3 Community Simulation as Evidence

The simulator is not just for videos — it is a **synthetic community** that exercises the ontology:

| Simulation Mode | What It Reveals | How to Run |
|-----------------|-----------------|-----------|
| **Single domain** (e.g., `learning-community`) | Does ontology extract/match this domain? | `measurementSuite.ts` |
| **Multi-domain mix** (generated scenarios) | Cross-domain contamination, ambiguity | `generateScenario(n, dur)` |
| **Scale sweep** (10 → 100 → 1000 agents) | Performance, match quality at scale | `generateScenario` + fast mode |
| **Adversarial** (sensor poisoning, spam, malformed) | Robustness of extraction/matching | `chaos-drills.test.ts` |
| **Taxonomy coverage sweep** | Which Fiske/Ostrom cells are un- or under-served | Drive scenarios from `loop/taxonomy.json` |

**Key new capability to add (C.3.1):** *Taxonomy-driven scenario generation.* Enumerate the taxonomy axes (Fiske × topology × exchange × stakes × temporality) and auto-generate a minimal scenario per cell. Run the measurement suite. Produce a **coverage map**: which coordination cells match well, which fail. Failures become ontology/capability gaps.

### C.4 Ontology Comprehensiveness Targets

The ontology must be able to express coordination across **all** taxonomy cells, not only market exchange. Current GSS survival domains cover safety/existential; domain scenarios cover market/labour/knowledge. **Under-covered (to address):**
- **Care / kinship** (communal, care, generational, high trust).
- **Commons governance** (Ostrom principles — monitoring, graduated sanctions, conflict resolution).
- **Legal / codified** agreements (formal, legal stakes).
- **Cross-cultural / multilingual** semantics (dignity/face/honour modifiers).
- **Long-term / generational** commitments (generational temporality).

**Done-when (per cycle):** A coverage map over the taxonomy; every cell either passes a baseline scenario or has a documented gap + patch proposal.

### C.5 Corpus Sources (community-derived, privacy-respecting)

- Public-domain coordination texts (mutual-aid manuals, co-op bylaws, disaster-response guides).
- Opt-in, anonymized exports of *test* notes from our own dogfooding.
- Public datasets of requests/offers (e.g., open classifieds dumps) — vocabulary only, never personal data.
- **Never** scrape private communications or re-identify individuals.

---

## 5. FRONT D — Demonstration & Teaching (Movies That Teach)

**Goal:** Produce **relatable, learnable** videos that (a) teach the paradigm, (b) prove the capabilities, and (c) double as regression artifacts. Videos are the *public face* of the work and the *test harness* for usability.

### D.1 What Makes a Demo "Relatable & Learnable"

- **A real human story**, not a feature tour: "Maria's family must evacuate; watch her needs become a match and a route."
- **The note is the hero.** Every video starts and ends with notes.
- **One capability per video**, stated in the first 5 seconds ("In 2 minutes: how natural language becomes a verifiable match").
- **Show the magic, hide the machinery.** Extraction/matching explained in plain language; protocol details in an optional "under the hood" segment.
- **Captions + narration** (accessible, multilingual).
- **Reproducible**: every video is a scripted simulator scenario anyone can re-run.

### D.2 The Demonstration Suite (13 scenarios → 13 videos, 1:1 with capabilities)

Survival vertical + 10 horizontal capabilities. Each is both a *demo* and a *test*.

| # | Scenario | Capability | Story | Duration |
|---|----------|-----------|-------|----------|
| 1 | `semantic-capture` | Semantic note-taking | "I spoke; it became a structured note" | 25s |
| 2 | `bidirectional-match` | Matching | "My request found the right offer — and told me why" | 30s |
| 3 | `verifiable-coordination` | Verifiable commitments | "We agreed; the agreement is provable offline" | 35s |
| 4 | `multi-device-sync` | Multi-device | "My phone and laptop agree; I revoked the lost one" | 30s |
| 5 | `ontology-evolution` | Extensible ontology | "I taught it my community's words" | 25s |
| 6 | `resilient-networking` | Offline-first | "The relay died; nothing was lost" | 30s |
| 7 | `agent-automation` | Agent assistance | "I asked; it browsed and summarized into a note" | 30s |
| 8 | `self-improving-eval` | Self-improvement | "It turned my usage into a new test" | 30s |
| 9 | `accessible-i18n` | Accessible & global | "Arabic, high contrast, keyboard-only — all work" | 25s |
| 10 | `local-telemetry` | Local-first insights | "My metrics stay on my device" | 20s |
| 11 | `family-evacuation` | Survival (manifest+routing) | "The family's needs found shelter, meds, and a safe route" | 35s |
| 12 | `resource-distribution` | Survival (commons) | "The neighbourhood shared water without a server" | 30s |
| 13 | `mesh-relay-failover` | Survival (mesh) | "No internet — the mesh carried the note" | 45s |

*(Scenario specs: see §6. Each must run in fast mode for CI and real-time for recording.)*

### D.3 The Learning Curriculum (Progressive, Not a Dump)

| Tier | Audience | Videos | Outcome |
|------|----------|--------|---------|
| **T1 — First 2 Minutes** | Everyone | 1, 2, 11 | "I get it; I could do this" |
| **T2 — Trust & Durability** | Cautious users | 3, 4, 6, 13 | "It's safe, offline, and provable" |
| **T3 — Power & Extensibility** | Builders | 5, 7, 8 | "I can shape it to my community" |
| **T4 — Inclusion & Operations** | Advocates/Operators | 9, 10, 12 | "It respects people and privacy" |

### D.4 Recording Strategy (Pragmatic)

- **Recording target = purpose-built Simulator Dashboard v2** (controllable, deterministic), *not* the live app. Avoids headless WebGL/navigation flakiness and gives exact views: `editor`, `matches`, `ontology`, `map`, `settings`, `grid`.
- **`window.setCameraFocus(target)`** drives view changes from scenario events.
- **Map layers** rendered via static tiles or Canvas fallback (deterministic in headless).
- **Narration**: `piper` (offline, multilingual TTS); captions via existing ASS/SRT generation.
- **Compression**: `-crf 28 -preset fast`, target < 50 MB/video.

### D.5 Videos as Living Artifacts

Each video is regenerated when the UI changes (D6/D7 loop). A stale video is a bug. CI re-records on merge; a nightly gallery is published.

**Done-when (per video):** Plays standalone; captions + narration; metadata.json; ≥ 4/5 comprehension rubric; scenario re-runnable; linked from README + docs.

---

## 6. Scenario Specifications (All 13)

> Format: `{ agents, events, duration }`. `cameraFocus` targets the Simulator Dashboard v2. All run in fast mode for CI, real-time for recording.

### 1. semantic-capture (Capability 1, 2)
```typescript
agents: [{ role: 'User', count: 1, traits: ['demo'] }]
events: [
  { at: 2, action: 'capture_raw', actorRole: 'User', inputMethod: 'voice', cameraFocus: 'editor',
    content: "Meeting with Sarah tomorrow 2pm about Q4 budget. Bring revenue projections. High priority." },
  { at: 4, action: 'show_extraction', actorRole: 'system', cameraFocus: 'editor' }, // stages + confidence
  { at: 8, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
]
duration: 12
```

### 2. bidirectional-match (Capability 2)
```typescript
agents: [
  { role: 'Requester', count: 1, properties: [job: developer, budget: 5000, remote: true], interests: [developer] },
  { role: 'Offerer', count: 3, properties: [role: developer, rate: 120, skills: react+typescript], interests: [job] },
]
events: [
  { at: 2, action: 'publish_job', actorRole: 'Requester', cameraFocus: 'Requester 1' },
  { at: 4, action: 'publish_offer', actorRole: 'Offerer', cameraFocus: 'Offerer 1' },
  { at: 5, action: 'publish_offer', actorRole: 'Offerer', cameraFocus: 'Offerer 2' },
  { at: 6, action: 'publish_offer', actorRole: 'Offerer', cameraFocus: 'Offerer 3' },
  { at: 8, action: 'camera', actorRole: 'system', cameraFocus: 'dashboard-matches' },
  { at: 10, action: 'accept_match', actorRole: 'Requester', cameraFocus: 'Requester 1' },
]
duration: 14
```

### 3. verifiable-coordination (Capability 3)
```typescript
agents: [{ role: 'Requester', count: 1 }, { role: 'Offerer', count: 1 }]
events: [
  { at: 2, action: 'draft_request', actorRole: 'Requester', cameraFocus: 'Requester 1' },
  { at: 4, action: 'publish_request', actorRole: 'Requester', cameraFocus: 'Requester 1' },
  { at: 6, action: 'match_found', actorRole: 'system', cameraFocus: 'Requester 1' },
  { at: 8, action: 'respond', actorRole: 'Offerer', cameraFocus: 'Offerer 1' },
  { at: 10, action: 'accept', actorRole: 'Requester', cameraFocus: 'Requester 1' },
  { at: 12, action: 'complete', actorRole: 'Offerer', cameraFocus: 'Offerer 1' },
  { at: 14, action: 'export_receipts', actorRole: 'Requester', cameraFocus: 'Requester 1' },
]
duration: 18
```

### 4. multi-device-sync (Capability 4)
```typescript
agents: [{ role: 'User', count: 1, traits: ['demo'] }] // same npub on 2 devices
events: [
  { at: 2, action: 'link_device', actorRole: 'User', cameraFocus: 'connections', inputMethod: 'qr' },
  { at: 4, action: 'capture_note', actorRole: 'User', cameraFocus: 'editor', device: 'phone' },
  { at: 6, action: 'show_sync', actorRole: 'system', cameraFocus: 'editor', device: 'laptop' },
  { at: 8, action: 'revoke_device', actorRole: 'User', cameraFocus: 'connections', device: 'phone' },
]
duration: 12
```

### 5. ontology-evolution (Capability 5)
```typescript
agents: [{ role: 'User', count: 1, traits: ['demo'] }]
events: [
  { at: 2, action: 'open_ontology', actorRole: 'User', cameraFocus: 'ontology' },
  { at: 4, action: 'create_node', actorRole: 'User', cameraFocus: 'ontology',
    content: "plot: { garden-bed, steward, harvest-share }" },
  { at: 6, action: 'add_attributes', actorRole: 'User', cameraFocus: 'ontology' },
  { at: 8, action: 'capture_with_custom', actorRole: 'User', cameraFocus: 'editor',
    content: "plot steward is Ana, garden-bed is north, harvest-share is 30%" },
  { at: 10, action: 'show_extraction', actorRole: 'system', cameraFocus: 'editor' },
]
duration: 12
```

### 6. resilient-networking (Capability 6)
```typescript
agents: [{ role: 'User', count: 1, traits: ['demo'] }]
events: [
  { at: 2, action: 'show_relays', actorRole: 'User', cameraFocus: 'connections' },
  { at: 4, action: 'publish_note', actorRole: 'User', cameraFocus: 'editor' },
  { at: 6, action: 'kill_relay', actorRole: 'system', cameraFocus: 'connections', relay: 1 },
  { at: 8, action: 'publish_note_offline', actorRole: 'User', cameraFocus: 'editor' },
  { at: 10, action: 'restore_relay', actorRole: 'system', cameraFocus: 'connections' },
  { at: 12, action: 'show_flush', actorRole: 'system', cameraFocus: 'insights' },
]
duration: 14
```

### 7. agent-automation (Capability 7)
```typescript
agents: [{ role: 'User', count: 1 }, { role: 'Agent', count: 1, traits: ['browser'] }]
events: [
  { at: 2, action: 'enable_browser_cap', actorRole: 'User', cameraFocus: 'settings' },
  { at: 4, action: 'agent_summarize', actorRole: 'User', cameraFocus: 'editor',
    content: "Summarize https://example.org/mutual-aid-guide" },
  { at: 8, action: 'show_agent_cursor', actorRole: 'system', cameraFocus: 'agent' },
  { at: 12, action: 'show_result_note', actorRole: 'User', cameraFocus: 'editor' },
]
duration: 14
```

### 8. self-improving-eval (Capability 8)
```typescript
agents: [{ role: 'User', count: 1 }, { role: 'Optimizer', count: 1, traits: ['background'] }]
events: [
  { at: 2, action: 'capture_note', actorRole: 'User', cameraFocus: 'editor' },
  { at: 4, action: 'optimizer_mine', actorRole: 'Optimizer', cameraFocus: 'insights' },
  { at: 6, action: 'optimizer_generate_journey', actorRole: 'Optimizer', cameraFocus: 'insights' },
  { at: 8, action: 'optimizer_run_regression', actorRole: 'Optimizer', cameraFocus: 'insights' },
  { at: 10, action: 'show_results', actorRole: 'User', cameraFocus: 'insights' },
]
duration: 12
```

### 9. accessible-i18n (Capability 9)
```typescript
agents: [{ role: 'User', count: 1 }]
events: [
  { at: 2, action: 'switch_language', actorRole: 'User', cameraFocus: 'settings', language: 'ar' },
  { at: 4, action: 'enable_high_contrast', actorRole: 'User', cameraFocus: 'settings' },
  { at: 6, action: 'keyboard_nav', actorRole: 'User', cameraFocus: 'inbox' },
  { at: 8, action: 'screen_reader_announce', actorRole: 'system', cameraFocus: 'inbox' },
]
duration: 10
```

### 10. local-telemetry (Capability 10)
```typescript
agents: [{ role: 'User', count: 1 }]
events: [
  { at: 2, action: 'generate_activity', actorRole: 'User', cameraFocus: 'inbox' },
  { at: 4, action: 'show_sync_health', actorRole: 'system', cameraFocus: 'insights' },
  { at: 6, action: 'show_friction_journal', actorRole: 'system', cameraFocus: 'insights' },
  { at: 8, action: 'show_commitment_lifecycle', actorRole: 'system', cameraFocus: 'insights' },
]
duration: 10
```

### 11. family-evacuation (Capability 11 — survival)
```typescript
agents: [
  { role: 'Family', count: 1, properties: [manifest: infant+elderly+diabetic], interests: [shelter, medical, transport] },
  { role: 'ShelterProvider', count: 2, properties: [shelterType: building, capacity: 10] },
  { role: 'MedicalProvider', count: 1, properties: [capability: insulin-storage] },
  { role: 'TransportProvider', count: 1, properties: [vehicle: van, offRoad: true] },
]
events: [
  { at: 2, action: 'publish_manifest', actorRole: 'Family', cameraFocus: 'manifest' },
  { at: 4, action: 'publish_offer', actorRole: 'ShelterProvider', cameraFocus: 'ShelterProvider 1' },
  { at: 5, action: 'publish_offer', actorRole: 'MedicalProvider', cameraFocus: 'MedicalProvider 1' },
  { at: 6, action: 'publish_offer', actorRole: 'TransportProvider', cameraFocus: 'TransportProvider 1' },
  { at: 8, action: 'camera', actorRole: 'system', cameraFocus: 'map-routing' },
  { at: 11, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
]
duration: 14
```

### 12. resource-distribution (Capability 11 — commons)
```typescript
agents: [
  { role: 'Coordinator', count: 2, interests: [water, food, medical] },
  { role: 'Supplier', count: 4, properties: [resourceType: water|food|medical, quantity: 100+] },
]
events: [
  { at: 2, action: 'publish_job', actorRole: 'Coordinator', cameraFocus: 'Coordinator 1' },
  { at: 3, action: 'publish_job', actorRole: 'Coordinator', cameraFocus: 'Coordinator 2' },
  { at: 5, action: 'publish_offer', actorRole: 'Supplier', cameraFocus: 'Supplier 1' },
  { at: 6, action: 'publish_offer', actorRole: 'Supplier', cameraFocus: 'Supplier 2' },
  { at: 7, action: 'publish_offer', actorRole: 'Supplier', cameraFocus: 'Supplier 3' },
  { at: 8, action: 'publish_offer', actorRole: 'Supplier', cameraFocus: 'Supplier 4' },
  { at: 10, action: 'camera', actorRole: 'system', cameraFocus: 'map-deficit' },
  { at: 12, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
]
duration: 14
```

### 13. mesh-relay-failover (Capability 6, 11)
```typescript
agents: [
  { role: 'UserA', count: 1, interests: [sync] },
  { role: 'UserB', count: 1, interests: [sync] },
  { role: 'BridgeDaemon', count: 1, traits: ['bridge'] },
]
events: [
  { at: 2, action: 'publish_note', actorRole: 'UserA', cameraFocus: 'editor' }, // queued offline
  { at: 4, action: 'bridge_connect', actorRole: 'BridgeDaemon', cameraFocus: 'connections' },
  { at: 6, action: 'relay_reconnect', actorRole: 'system', cameraFocus: 'editor' },
  { at: 8, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
]
duration: 12
```

---

## 7. The Interlock — How the Fronts Feed Each Other

This is the heart of the plan. The fronts are a **virtuous cycle**, run continuously.

| Trigger | Producer → Consumer | Concrete Example |
|---------|--------------------|--------------------|
| Recording a video feels confusing | **D → B** | "Users won't understand 'replaceable event'" → simplify copy |
| Video reveals a missing action | **D → A** | "No way to revoke a device from Connections" → add affordance |
| Simulation transcript uses unknown terms | **C → C/B** | "steward", "harvest-share" not extractable → ontology patch + capture hint |
| Taxonomy coverage sweep finds a failing cell | **C → A/C** | "Commons governance (monitoring) has no vocabulary" → new domain attributes |
| Corpus gap analysis flags "care/kinship missing" | **C → C** | Add care/kinship nodes → re-run simulation → coverage improves |
| Stranger test reveals confusion | **B → A/B** | "Where do I publish?" → make primary CTA obvious + add hint |
| Optimizer discovers a friction signal | **A → A** | "Repeated corrections on date parsing" → new extraction strategy (T1/T2) |
| A usability simplification exposes a missing capability | **B → A** | "Hiding the ontology editor means no way to import" → add import to Advanced |
| New functionality needs demonstrating | **A → D** | New "commons governance" surface → add scenario + video |
| A demo scenario's camera view exposes a UI bug | **D → B/A** | Map layer renders incorrectly → fix |

**Operating rule:** Run one **probe cycle** per week (or per increment):
1. **Probe:** record one scenario video (D) + run one taxonomy cell (C) + one stranger/comprehension probe (B).
2. **Capture:** log findings to `demo-findings/`.
3. **Triage:** classify as functionality (A), usability (B), or ontology (C), with severity.
4. **Fix:** implement the highest-leverage fix(es) on the matching front.
5. **Verify:** re-run deterministic tests, re-record affected video, re-run affected simulation.
6. **Record:** append to the Decision Log.

---

## 8. Milestones (Convergence Points — Not Endpoints)

These are **checkpoints** where all fronts are in a coherent, demonstrable state. After each, the cycle continues.

### M1 — "Understandable" (T1 comprehension)
- **A:** All 13 scenario actions exist and run; no crashes in fast or real-time.
- **B:** Home = Inbox (notes-first); one primary CTA; Key screens ≥ 4/5 rubric; time-to-first-coordination < 2 min.
- **C:** Baseline coverage map over taxonomy; gaps documented.
- **D:** T1 videos (1, 2, 11) recorded, captioned, narrated; embedded in README.
- **Gate:** 5 strangers complete captures + a match without help.

### M2 — "Trustworthy & Durable"
- **A:** Chaos drills green; offline queue zero-loss; receipt chains verify offline.
- **B:** Offline = normal (subtle indicator); thread view for coordination; errors recoverable.
- **C:** Safety/existential cells covered (survival domains); patch tests pass.
- **D:** T2 videos (3, 4, 6, 13) recorded.
- **Gate:** Stranger test on multi-device + receipt export with zero blockers.

### M3 — "Extensible & Self-Improving"
- **A:** Extensible ontology end-to-end; optimizer loop adopts a T1/T2 strategy with evidence.
- **B:** Advanced surfaces behind progressive disclosure; Labels tag manager; Automation toggle.
- **C:** Commons/care/legal cells covered; coverage map ≥ target; corpus→patch cycle demonstrated.
- **D:** T3 videos (5, 7, 8) recorded.
- **Gate:** A user adds a custom ontology node and uses it in a match.

### M4 — "Inclusive & Community-Ready"
- **A:** i18n (6 languages, RTL); a11y (keyboard + screen reader) verified; local-only telemetry.
- **B:** Inclusive by default; dignity/face/honour-aware copy; multilingual onboarding.
- **C:** Multilingual/heterogeneity cells covered; wisdom of the community reflected in ontology.
- **D:** T4 videos (9, 10, 12); full 13-video suite published; curriculum live.
- **Gate:** Blind user completes capture→match→respond→accept; Arabic RTL flow clean.

### M5 — "Proven in the Wild" (Pilot)
- **A:** Stability under real use; no P0 bugs.
- **B:** Onboarding measured; comprehension holds outside lab.
- **C:** Ontology evolves from real vocabulary (opt-in, privacy-respecting).
- **D:** A real mutual-aid group's 90-day story documented (with consent).
- **Gate:** G10 pilot: real coordination for 90 days, zero privacy incidents, measured improvement.

---

## 9. Measurement (Light, Local, Opt-In)

| Front | Metric | Target | Source |
|-------|--------|--------|--------|
| A | Deterministic tests | ≥ 990, all green | `pnpm test` |
| A | Adoption evidence | Outcome improves beyond noise | `loop evaluate` |
| B | Time-to-first-coordination | < 2 min | Comprehension probe / stranger test |
| B | Screen rubric | ≥ 4/5 avg | Per-screen review |
| B | Comprehension | "What is this?" correct | `comprehension-probe.ts` |
| C | Taxonomy coverage | All cells pass or have patch | Coverage sweep |
| C | Match F1 on patch test | No regression, ≥ baseline | `patchTest.ts` |
| C | Simulator match rate | Per-scenario baselines hold | `measurementSuite.ts` |
| D | Video comprehension | ≥ 4/5 rubric | Video review |
| D | Reproducibility | Scenario re-runs deterministically | `pnpm --filter simulator` |

**All local by default; no telemetry endpoint; aggregates are exportable.**

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Scope creep across four fronts | Fixed probe cycle; one highest-leverage fix per cycle; defer list visible |
| "We're done" complacency | Explicit rule: demo exists to find gaps; D6 mandatory; milestones are checkpoints |
| Front starvation (e.g., only videos) | Weekly probe must touch all four fronts; interlock table enforces it |
| Ontology patches overfit to cases | Holdout split + 200-run simulator distribution (E14) |
| Usability regressions | Never-regress invariants; stranger/comprehension probes each cycle |
| Video staleness | CI re-records on merge; stale video = bug |
| Headless recording flakiness | Simulator Dashboard v2 (deterministic) + static map fallback; pin/retry |
| Taxonomy "coverage theater" | Every cell must have a *baseline scenario* that passes, or a documented gap + patch |
| Privacy of corpus/simulation | Vocabulary only; no private data; opt-in exports |
| Solo capacity | Cycle is designed for 1 developer; optional contributors take scoped increments |

---

## 11. Decision Log (Append-Only)

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-13 | Four concurrent fronts (A functionality, B usability, C ontology, D demonstration) — not a linear "demo phase" | System is a civilization-scale platform; progress must be simultaneous and interlocking |
| 2026-11-13 | "Done" reframed: 990 tests = machinery works; learnability/coverage/helpfulness proven by demo+simulation+use | Avoid complacency; the demo phase exists to find gaps |
| 2026-11-13 | Note paradigm + email mental model; progressive disclosure mandatory | Ubiquitize via the universal primitive; don't confront users with widget walls |
| 2026-11-13 | Community simulation drives ontology evolution (corpus → taxonomy gaps → audit → patch → re-simulate) | Ground ontology in lived coordination, not theory alone; taxonomy is Fiske/Ostrom-grounded |
| 2026-11-13 | 13 scenarios ↔ 13 videos ↔ 11 capabilities; videos are living regression artifacts | Every video is also a test; staleness is a bug |
| 2026-11-13 | Recording target = Simulator Dashboard v2 (deterministic), not live app | Avoid headless WebGL/navigation flakiness; exact camera control |
| 2026-11-13 | Mandatory post-demo fix loop (D6) + re-record (D7) | Demonstration must change the system, not just display it |

---

## 12. Immediate Next Actions (First Probe Cycle) — **COMPLETED 2026-11-13**

```bash
# ── FRONT A: establish invariants ──────────────────────────────
pnpm test && pnpm verify            ✅ 990 tests + all gates green

# ── FRONT C: baseline coverage + ontology gap scan ─────────────
pnpm loop corpus                    ✅ 30 files, 1295 terms, 5 taxonomy gaps
pnpm exec tsx optimize/src/ontology/audit.ts        ✅ 130 orphan keys, 12 operator drift, 1 missing hierarchy

# ── FRONT D: first scenario runs (fast mode) ────────────────────
create simulator/src/scenarios/comprehensiveScenarios.ts ✅ 13 scenarios from §6
pnpm --filter @notention/simulator start -- --scenario=semantic-capture ✅
mkdir -p demo-findings && echo "# semantic-capture findings" > demo-findings/semantic-capture.md ✅

# ── FRONT B: one comprehension probe on the home screen ─────────
pnpm probe --headless                ✅ Ran (0% comprehension without human participants)

# ── TRIAGE FINDINGS ─────────────────────────────────────────────
# A (Functionality): 
#   - I18nProvider children not rendering (FIXED: children prop not passed to I18nextProvider)
#   - JSON files transformed by __name polyfill (FIXED: exclude .json in namePolyfillDevPlugin)
#   - E2E tests timeout waiting for [data-ready] (ROOT CAUSE: above two fixes)
# C (Ontology): 
#   - 130 orphan keys (in ontology, never used in quality cases)
#   - 12 keys with operator drift (e.g., role: ontology=[is] observed=[contains])
#   - 10 keys with default operator drift (e.g., role: expected="is" observed="contains" drift=1.00)
#   - 5 taxonomy gaps: mentorship, open-source, legal, crisis, long-term
# B (Usability): 
#   - Comprehension probe needs human participants (0% automated)
#   - Home screen: needs verification as Inbox with one primary CTA

# ── HIGHEST-LEVERAGE FIX APPLIED ────────────────────────────────
# 1. Fixed I18nProvider to render children (ui/src/components/i18n/I18nProvider.tsx)
# 2. Fixed namePolyfillDevPlugin to skip .json files (ui/vite.config.ts)
# 3. Rebuilt UI production build
# Result: All E2E tests pass, verify passes

# Week 3 Additional Fixes (2026-11-13):
# 4. Renamed Dashboard → Inbox, added InboxView with notes-first paradigm and progressive disclosure (ui/src/components/views/InboxView.tsx, ui/src/utils/navigation.ts, ui/src/components/ui/icons.tsx, ui/src/components/MainView.tsx, ui/src/components/contexts/ViewNavigationContext.tsx, ui/src/hooks/useUrlRouting.ts)
# 5. Added baselines for 4 new taxonomy scenarios in measurement suite (simulator/src/scenarios/measurementSuite.test.ts)
# 6. Fixed workspace root detection for eval cases (core/src/eval/caseManifest.ts)
# 7. Ran E14 patch generalization test — all patches non-regressive (3/3 accepted)
```

**Next Probe Cycle (Week 2) — COMPLETED 2026-11-13:**
1. **Front C**: Address top operator drift (role, budget, schedule, deadline) → ontology patches ✅
   - Added `contains` to real operators for role, schedule, frequency, deadline, location, subject
   - Added `less than`, `greater than`, `between`, `equals` to real operators for budget, price
   - All over-broad operator drift resolved (no more "Extra in observed")
2. **Front C**: Taxonomy coverage sweep — enumerate Fiske/Ostrom cells → generate scenario per cell → measure ✅
   - Added 4 new domain scenarios covering identified gaps:
     - `legal-contract`: legal stakes, codified formality
     - `crisis-response`: safety stakes, ephemeral temporality
     - `generational-stewardship`: generational temporality, existential stakes
     - `kinship-care`: communal, care exchange, generational
   - All 4 scenarios run successfully in simulator
3. **Front D**: Run bidirectional-match scenario, record findings ✅
   - Scenario runs successfully with 4 agents, matches found
4. **Front B**: Manual comprehension probe with 3-5 human participants on Home screen ⏳
   - Headless probe runs but requires human participants for meaningful results
5. **Front A**: Implement ontology patches from audit, re-run tests ✅
   - All tests pass (990+), verify passes

**Next Probe Cycle (Week 3) — IN PROGRESS (2026-11-13):**
1. **Front B**: Conduct manual comprehension probe with 3-5 human participants on Home screen; verify Inbox paradigm with one primary CTA ⏳
2. **Front B**: Simplify Home screen to Inbox (notes-first) with progressive disclosure; hide advanced panels ✅
3. **Front C**: Run new taxonomy scenarios through measurement suite; establish baselines for legal-contract, crisis-response, generational-stewardship, kinship-care ✅
4. **Front C**: Address orphan keys (130 keys in ontology never used in quality cases) — either add test coverage or document as intentional ⏳
5. **Front D**: Record semantic-capture and bidirectional-match videos using Simulator Dashboard v2 ⏳
6. **Front A**: Run patch generalization test (E14) on ontology changes; verify no regression on 22 match cases + holdout + 200-run simulator distribution ✅
