# TODO.2 — Protocol & Productization Design Choices

Status: planning. High-level framing for team discussion with UI/UX specialists.

**Context for the team:** This is a rewrite from the version you knew years ago. Core semantics (notes, properties, ontology, matching) are solid. The UI is a React PWA with a local-first architecture. We're at the point where protocol decisions and product direction need to align before the next build cycle.

---

## NORTH STAR: WHAT ARE WE ACTUALLY BUILDING?

### The Anthropological Frame

**Notes are the atomic unit of human thought externalized.** Every civilization-scale coordination system — money, law, science, governance — began as a way to record, share, and verify claims. Notention's bet: *semantic notes* (structured, matchable, portable) are the next substrate.

**The trap:** "Super-app" usually means "kitchen sink." The antidote: *one coherent metaphor that scales from micro to macro.*

| Scale | Current Metaphor | Risk if We Get It Wrong |
|-------|------------------|-------------------------|
| **Micro** (personal) | "My second brain" | Becomes a cluttered note app |
| **Meso** (team/community) | "Shared workspace" | Becomes a worse Notion/Slack |
| **Macro** (network/civilization) | "Semantic coordination layer" | Becomes vaporware / blockchain delusion |

**The razor:** Every feature must earn its place at *all three scales simultaneously*. If it only works at one, it's a feature, not a primitive.

### The "Quintessential Super-App" Constraints

1. **No platform capture** — User owns keys, data, ontology. Export is trivial. Forking is a right.
2. **No mandatory network** — Works fully offline. Network is opt-in enhancement, not dependency.
3. **No mandatory AI** — Heuristics first. Models are plugins. Consent is granular and revocable.
4. **No fixed schema** — Ontology grows from usage. Standardization emerges, not imposed.
5. **No privileged transport** — Nostr, libp2p, HTTP, mesh — all peers. User chooses.
6. **No central authority** — Not even us. Protocol > product.

### The "Jumping the Shark" Checklist

Before any protocol/product decision, ask:

| Question | Yes → Proceed | No → Cut/Defer |
|----------|---------------|----------------|
| Does this work for a solo user with zero setup? | ✅ | ❌ |
| Does this compose with *existing* notes (no migration)? | ✅ | ❌ |
| Does this reduce cognitive load, or add a new concept? | Reduces | Adds |
| Can a non-technical user explain the *benefit* in one sentence? | ✅ | ❌ |
| Does this create a new dependency (service, key, format)? | No new deps | New dep |
| If the network disappeared tomorrow, is the local value intact? | ✅ | ❌ |
| Does this enable *coordination* or just *communication*? | Coordination | Communication |

---

## PILLAR 1: PROTOCOL — What the network *is*

The protocol spec (README2.md) describes a semantic coordination layer. Current implementation covers ~40%. Key design choices:

### P1. Content-Addressed, Immutable Notes
**Current:** Mutable notes with UUIDs. **Proposed:** Hash-based identity (Blake3 of canonical envelope).
- **Choice A:** Migrate now — breaks all existing links, requires migration tooling
- **Choice B:** Dual-mode — new notes are content-addressed; old notes keep UUIDs; bridge at match time
- **Choice C:** Defer — keep UUIDs, add content hash as property, migrate when signed export lands

**Team question:** How much does mutability hurt the current UX? (Matching uses properties, not IDs)

### P2. Signed Transitions & State Inference
**Current:** `status` property (todo/running/done) is just a string. **Proposed:** Signed transition notes (Accept, Complete, Cancel) that *are* the state change.
- **Choice A:** Transition notes as first-class — every status change = signed event
- **Choice B:** Hybrid — local `status` for speed, transitions only when published/shared
- **Choice C:** Keep `status` property; transitions are a separate "audit log" view

**Team question:** Is the current `status` property sufficient for personal task management, or does the lack of verifiable history block team workflows?

### P3. Sealed Visibility (Private Collaboration)
**Current:** Privacy = `public` | `private` flag; private notes don't publish. **Proposed:** Encrypted envelopes with recipient keys (NIP-17 style or custom).
- **Choice A:** Full NIP-17 (Nostr DMs) — reuse existing chat encryption
- **Choice B:** Custom sealed envelope — more control, not Nostr-bound
- **Choice C:** Defer — "private" stays local-only; sharing = make public

**Team question:** Who needs private sharing? (Solo user? Small team? Public coordination?)

### P4. Economic Primitives (Invoices, Escrow, Receipts)
**Current:** No payment semantics. **Proposed:** Note kinds for invoice/escrow/receipt with state machine.
- **Choice A:** Build on Lightning (LNURL, BOLT12) — real money, real complexity
- **Choice B:** Abstract "value transfer" notes — protocol-agnostic, plug in payment later
- **Choice C:** Skip for now — not a blocker for semantic matching

**Team question:** Is this a differentiator or a distraction?

### P5. Transport Pluralism
**Current:** Nostr (primary), Meshtastic (hardware), Local (in-memory relay). **Proposed:** libp2p, HTTP, CRDT sync.
- **Choice A:** libp2p next — P2P without relays, hard NAT traversal
- **Choice B:** HTTP/WebRTC — easier, more centralizable
- **Choice C:** Polish Nostr + Local first; others when users ask

**Team question:** Does "decentralized" mean "Nostr-compatible" or "transport-agnostic"?

---

## PILLAR 2: PRODUCTIZATION — What the product *feels like*

### Q1. First-Run Experience: Capture vs. Workspace
**Current:** Dashboard with quick capture + sample workspace CTA. Notes is the editor.
- **Choice A:** "Capture-first" — landing = single input, auto-extracts properties, saves to Notes
- **Choice B:** "Workspace-first" — landing = Notes list (empty state → sample workspace)
- **Choice C:** Hybrid — capture widget *inside* Notes empty state; no separate Dashboard view

**Team question:** What's the *one thing* a new user should do in 10 seconds?

### Q2. Semantic Editing: Invisible vs. Visible Structure
**Current:** Properties = chips in prose; add via popup; no bracket syntax visible.
- **Choice A:** Pure prose — properties only inferred/accepted, never manually added
- **Choice B:** Structured canvas — properties as blocks (Notion-style), prose as one block type
- **Choice C:** Current hybrid — chips + prose, popup for manual, inference for assist

**Team question:** Does "nobody writes bracket syntax" mean "nobody *sees* structure" or "structure is a first-class visual object"?

### Q3. Matching as a Background Utility vs. Foreground Feature
**Current:** Dashboard shows one match; Network has "Find matches"; MatchReplies in editor.
- **Choice A:** Ambient — matches appear as subtle hints everywhere (related notes, suggestions)
- **Choice B:** Intentional — "Find matches" is a deliberate action with full results view
- **Choice C:** Both — ambient in Notes/Editor, intentional in Network/Dashboard

**Team question:** Should matching feel like "search" (user initiates) or "serendipity" (system suggests)?

### Q4. Ontology: User's Vocabulary vs. System's Vocabulary
**Current:** Default ontology (identity, work, scheduling, commerce); Gardener learns from usage.
- **Choice A:** User owns ontology — graph editor is primary; learning is suggestions
- **Choice B:** System owns ontology — learning is automatic; graph is read-only visualization
- **Choice C:** Shared — defaults + user additions; learning proposes, user confirms

**Team question:** Is the ontology a *tool* the user shapes, or a *model* the system builds?

### Q5. Network Presence: Opt-In vs. Ambient
**Current:** No Nostr key = Network/Chat show setup prompts. Local relay for demos.
- **Choice A:** "Go public" button — one click generates key, connects to default relays
- **Choice B:** Progressive — key generated on first publish; relays added per-need
- **Choice C:** Local-first forever — network is an advanced feature, hidden by default

**Team question:** Is "decentralized" a user value prop, or an implementation detail?

### Q6. AI: Invisible Assistant vs. Explicit Copilot
**Current:** "Describe it" composer (local heuristic by default); remote LM opt-in with consent.
- **Choice A:** Invisible — extraction happens on save, suggestions appear as chips
- **Choice B:** Explicit — "Ask AI" button, chat sidebar, per-property accept/reject
- **Choice C:** Hybrid — local heuristic always on; remote = explicit "Enhance" action

**Team question:** Should AI feel like "magic that just works" or "a tool I invoke"?

---

## DISCUSSION FORMAT FOR TEAM

For each design choice (P1–P5, Q1–Q6), the team should consider:

| Dimension | Questions |
|-----------|-----------|
| **User value** | What problem does this solve for *who*? |
| **Complexity cost** | Implementation + maintenance + cognitive load |
| **Reversibility** | Can we change our mind in 6 months? |
| **Differentiation** | Does this make us distinct, or just catch up? |
| **Dependencies** | What else must land first? |

**Output we need:** For each, a *direction* (A/B/C/custom) + *rationale* + *blockers*.

---

## GRADUATION CRITERIA FOR TODO.2

A design choice graduates to TODO.2 implementation when:
1. **Direction chosen** (A/B/C/custom with rationale)
2. **Scope defined** (what's in/out for this cycle)
3. **Success metric** (how we measure if it worked)
4. **Owner identified** (who drives it)

---

## NEXT STEP

**Async:** Team reviews P1–P5, Q1–Q6 above. Adds comments/preferences to this doc.

**Sync (30 min):** Walk through each. Decide direction or "needs more research."

**Result:** TODO.2.md updated with 3–5 *concrete, scoped* items, each with owner + success metric.

---

## PARKING LOT (Deferred but Captured)

- IA simplification (H) — downstream of Q1, Q2, Q5
- Export formats (I) — downstream of P1, P2
- Mobile polish (J) — downstream of Q1, Q2
- TypeScript errors (175) — maintenance, not product
- CI/CD — infrastructure, not product
- Meshtastic/libp2p — downstream of P5
- WebLLM model swap — downstream of Q6

---

## APPENDIX A: COMPETITIVE LANDSCAPE & DIFFERENTIATION

| Category | Players | Their Model | Our Wedge |
|----------|---------|-------------|-----------|
| **Personal knowledge** | Obsidian, Logseq, Roam, Tana | Local-first PKM, graph view | *Semantic matching* — notes find each other |
| **Team workspace** | Notion, Coda, Affine | Centralized, schema-first | *Local-first + protocol* — no vendor lock-in |
| **Decentralized social** | Nostr clients (Damus, Amethyst), Bluesky | Protocol-specific, feed-centric | *Semantic layer on any transport* — not just microblogging |
| **Agent/AI tools** | LangChain, AutoGPT, MCP servers | Cloud-first, prompt-centric | *Note-driven skills* — automation as semantic notes |
| **Coordination/protocol** | Urbit, Holochain, IPFS, Ceramic | New stack, high barrier | *Incremental adoption* — works on Nostr/HTTP today |

**Our unique position:** *Semantic notes that match across contexts, owned by the user, portable across transports.* No one else has matching + local-first + transport-agnostic + AI-optional in one package.

---

## APPENDIX B: USER PERSONAS & JOURNEYS

| Persona | Core Need | Current Friction | Success Signal |
|---------|-----------|------------------|----------------|
| **Solo thinker** | Capture → structure → retrieve | "My notes are a graveyard" | Notes resurface when relevant |
| **Independent builder** | Track tasks, ideas, contacts | "Too many tools, none connect" | One workspace for all of it |
| **Small team (2-10)** | Shared context without Slack/Notion | "Sync is manual, context lost" | Matching surfaces cross-person relevance |
| **Community coordinator** | Requests ↔ offers, events, reputation | "Spreadsheets + DMs + memory" | Network discovers matches automatically |
| **Protocol researcher** | Experiment with semantic primitives | "No sandbox, high setup cost" | Simulator + local relay = instant lab |

**Journey map (priority order):**
1. *Solo capture* → quick note with auto-properties → later retrieval
2. *Solo matching* → write request → see local offer match → act
3. *Team shared ontology* → import/extend → shared vocabulary emerges
4. *Network publish* → go public → discover peers → coordinate
5. *Agent automation* → define skill note → watch it execute → refine

---

## APPENDIX C: TECHNICAL ARCHITECTURE — CURRENT STATE & DEBT

### Implemented (Working)
| Layer | Package | Status |
|-------|---------|--------|
| Semantic kernel | `@notention/core` | Notes, properties, ontology, matching, parsing, networks, skills, metaphors |
| Agent server | `@notention/agent` | MCP tools, skill runtime, browser/API execution, persistence |
| PWA | `@notention/ui` | Editor, views (notes, map, timeline, network, chat, settings), maps, encrypted chat |
| CLI | `@notention/cli` | Terminal session, embedded agent, provider config |
| Simulator | `simulator` | Multi-agent scenarios, dashboard, movie recording |

### Known Debt (from TODO.1)
- 175 TypeScript errors (mostly `settings.ontology` narrowing in tests)
- No CI/CD pipeline
- `process` shim in `index.html` (Vite bundle leaks)
- Simulator references in OntologyView (dead code)
- Editor toolbar density (10+ controls)

### Architecture Decisions to Revisit
| Decision | Current | Revisit Trigger |
|----------|---------|-----------------|
| Localforage (IndexedDB) | Persistence | Need sync/CRDT → Dexie or custom |
| Nostr as primary transport | Network | P5 transport pluralism decision |
| WebLLM for local AI | AI provider | Q6 AI direction + model size |
| In-memory relay | Demo/testing | P2/P3 need persistence |
| UUID note IDs | Identity | P1 content-addressing decision |

---

## APPENDIX D: PROTOCOL SPEC STATUS (README2.md Mapping)

| Spec Section | Status | Notes |
|--------------|--------|-------|
| §1 Note Model | ✅ | Properties, tags, privacy, priority, provenance |
| §2 Parsing | ✅ | Bracket syntax, property extraction, aliases |
| §3 Ontology | ✅ | Domains, attributes, enums, learning (Gardener) |
| §4 Matching | ✅ | Request/offer, constraints, scores, explanations |
| §5 Privacy Gates | ✅ | Network gate, private/public, tagged hashes |
| §6 Transports | 🟡 | Nostr ✅, Meshtastic 🟡, Local ✅, libp2p/HTTP ❌ |
| §7 Skills | 🟡 | Declarative skills ✅, note-defined skills 🟡, autonomous 🟡 |
| §8 Tasks | 🟡 | Task execution, approval, retries — partial |
| §9 Metaphors | ✅ | Pattern → visual component mapping |
| §10 Simulator | ✅ | Scenarios, dashboard, recording |
| §11 Canonical CBOR | ❌ | Spec only |
| §12 Content-addressing | ❌ | P1 decision |
| §13 Signed transitions | ❌ | P2 decision |
| §14 Sealed visibility | ❌ | P3 decision |
| §15 Economic primitives | ❌ | P4 decision |
| §16 CRDT sync | ❌ | Research needed |
| §17 Governance/reputation | ❌ | Research needed |

---

## APPENDIX E: RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Protocol overreach** — build specs nobody uses | High | High | North Star checklist; ship product first, spec follows |
| **Nostr dependency** — protocol changes break us | Medium | High | Transport abstraction layer; P5 decision |
| **AI model churn** — WebLLM breaks, remote APIs change | High | Medium | Heuristics-first; provider abstraction; Q6 decision |
| **Matching quality** — false positives/negatives erode trust | Medium | High | Explanations mandatory; confidence thresholds; user feedback loop |
| **Ontology fragmentation** — every user has different schema | Medium | Medium | Default ontology + Gardener alignment; shared vocabularies |
| **Mobile UX gap** — desktop-first design | High | Medium | J mobile polish; responsive design audit |
| **Team bandwidth** — too many parallel tracks | High | High | TODO.2 graduates 3-5 items max; parking lot enforced |
| **Regulatory** — encrypted notes, payments, identity | Low | High | Legal review before P3/P4; no custody of keys |

---

## APPENDIX F: SUCCESS METRICS (OKRs)

### Product Metrics
| Metric | Current | Target (6mo) | Measurement |
|--------|---------|--------------|-------------|
| **Activation** | — | 40% create note day 1 | Analytics (local, opt-in) |
| **Retention (D7)** | — | 25% | Local storage activity |
| **Match action rate** | — | 10% of matches → action | MatchReplies click-through |
| **Publish rate** | — | 5% of notes published | Nostr event count |
| **Ontology growth** | ~50 nodes | 200 nodes/user | `settings.ontology` size |

### Protocol Metrics
| Metric | Current | Target (12mo) |
|--------|---------|---------------|
| **Transports implemented** | 2.5 (Nostr, Local, Meshtastic partial) | 4 |
| **Interop demos** | 0 | 3 (other Nostr clients, libp2p, HTTP) |
| **Signed export format** | 0 | 1 ratified |

### Quality Metrics
| Metric | Current | Target |
|--------|---------|--------|
| **E2E journey pass rate** | 100% (17/17) | 100% |
| **TypeScript errors** | 175 | 0 (new code), <50 (legacy) |
| **Screenshot coverage** | 24 scenes | 30 scenes (add mobile) |
| **Bundle size (UI)** | ~2.1MB | <1.5MB gzipped |

---

## APPENDIX G: ROADMAP HORIZONS

### NOW (TODO.1 ✅ — Done)
- Test harness, E2E journeys, showcase screenshots
- Editor ergonomics (no syntax), basic export/import
- Local relay, publish flow, sample workspace
- Navigation/trash/help correctness

### NEXT (TODO.2 — This Cycle)
*Depends on team decisions from P1–P5, Q1–Q6*

Likely candidates (pick 3-5):
- **P1/P2** Content-addressing + signed transitions (if chosen)
- **Q1/Q2** Notes-as-home + semantic editing refinement
- **Q3** Ambient matching hints in editor/notes
- **Q5** Progressive network onboarding
- **Q6** Invisible AI extraction (local heuristic on save)
- **H** IA simplification (downstream of Q1/Q2/Q5)
- **J** Mobile polish (touch targets, screenshots)

### LATER (TODO.3+)
- **P3** Sealed visibility / private sharing
- **P4** Economic primitives (if differentiated)
- **P5** libp2p / HTTP transport
- **I** Signed/HTML/Markdown export
- **Spec §11-§17** Canonical CBOR, CRDT, governance, reputation
- **Agent autonomy** — pattern prediction, autonomous execution
- **Meshtastic reliability** — hardware-independent testing

---

## APPENDIX H: OPEN RESEARCH QUESTIONS

*Need investigation before committing*

1. **CRDT for notes** — Can Yjs/Automerge handle semantic note structure (properties, ontology refs)? Conflict resolution for matching?
2. **Content-addressing + matching** — If note ID = hash(content), how do matches work when notes evolve? Version vectors?
3. **Ontology alignment at scale** — How to merge divergent ontologies across users without central authority? (Gardener + semantic diff)
4. **Private matching** — Can two parties discover match without revealing note content? (MPC, ZK, or trusted intermediary)
5. **Skill sandboxing** — Browser/API execution: how to make capability flags *enforceable* not just advisory?
6. **Local relay persistence** — SQLite? LMDB? Custom? Must survive restarts for "home relay" use case.
7. **WebLLM model size** — 1B vs 3B vs 7B parameter tradeoffs for in-browser extraction quality vs load time.
8. **Nostr NIP coverage** — Which NIPs are table stakes? (NIP-01, 02, 04, 17, 42, 65, 78?)

---

## APPENDIX I: TEAM CAPACITY & SKILLS

| Area | Current Strength | Gap | Hire/Contract? |
|------|------------------|-----|----------------|
| Core semantics (TS) | Strong | — | — |
| React/PWA | Strong | Mobile polish | — |
| Nostr protocol | Medium | NIP-42, 65, 78 | Contract |
| Cryptography | Medium | Sealed envelopes, ZK | Research |
| AI/ML | Low | WebLLM tuning, prompt eng | Contract |
| UX/UI | External | — | **Hire** (this discussion) |
| DevOps/CI | None | GitHub Actions, releases | Contract |
| Technical writing | Low | Docs, protocol spec | Contract |

---

## APPENDIX J: PRIOR ART & INSPIRATIONS

*Systems we study, not copy*

| System | Insight | Applied? |
|--------|---------|----------|
| **Hypercard** | Cards as programmable objects | Note = card + properties |
| **Newton OS** | Soups (semantic data) + assist | Property extraction = assist |
| **Plan 9** | Everything is a file (protocol) | Note = file + transport |
| **URBIT** | Deterministic, content-addressed | P1 direction |
| **Holochain** | Agent-centric, DHT, validation | Local-first + validation |
| **Tana/Roam** | Supertags = schema in content | Properties = supertags |
| **Notion** | Blocks as structured units | Q2 block vs chip decision |
| **Linear** | Opinionated workflow, fast | Keyboard-first, minimal UI |
| **Signal** | Privacy by default, protocol > app | P3, transport pluralism |
| **Bitcoin/Lightning** | Economic primitives as protocol | P4 abstract value transfer |
| **IPFS/Ceramic** | Content-addressed, streams | P1, P12, P16 |
| **MCP (Anthropic)** | Tool protocol for agents | Agent skills = MCP tools |

---

## APPENDIX K: DECISION LOG (Append-Only)

*Record of team decisions for accountability*

| Date | Decision | Choice | Rationale | Owner |
|------|----------|--------|-----------|-------|
| 2026-10-20 | TODO.1 complete | — | All acceptance criteria met | — |
| — | — | — | — | — |

*Add rows as decisions are made in sync meeting.*