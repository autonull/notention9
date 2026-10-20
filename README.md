# Notention

Notention is a semantic matching network for free-form notes with structured intent.

Everything is a note: memory, queries, and an interface to automation.

- private thinking tool
- embeddable semantic engine
- decentralized coordination without platform gatekeepers


## 🎯 Why?

| Common problem | Notention's move |
| :--- | :--- |
| Notes are expressive but not queryable | Structure lives inside the prose as semantic properties |
| Databases are queryable but rigid | The ontology grows from real usage and remains editable |
| Search matches keywords, not meaning | Constraints are evaluated against facts, with scores and reasons |
| Automation is opaque and over-permissioned | Actions are note-driven, capability-gated, and approval-oriented |
| Platforms own identity and reach | Local-first workspace; keys are identity; transports are interchangeable |

## 🧩 Architecture

```
                 ┌─────────────────────────────────┐
                 │ Note                            │
                 │ text · properties · tags        │
                 │ provenance · privacy · priority │
                 └───────────────┬─────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
   🧠 Understand            🎯 Match               ⚡ Act
   parse · normalize        request ↔ offer        skills · agent
   ontology · inference     score · explain        browser · API
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 ▼
                        🌐 Share (optional)
                   local · Nostr · mesh transports
```

A note contains rich text, semantic properties, tags, provenance, privacy, and priority. Properties are first-class: they can be written inline, parsed back out, normalized through aliases, validated against the ontology, and matched without losing the original prose.

The semantic model rests on four primitives:

| Primitive | Meaning | Typical use |
| :--- | :--- | :--- |
| **Fact** | An assertion about reality | Offer, record, identity |
| **Constraint** | A desired condition or requirement | Request, search, need |
| **Attestation** | A signed statement about another object | Endorsement, block, delivery proof |
| **Transition** | An authorized state-changing event | Acceptance, settlement, cancellation |

The practical distinction is between the **real** and the **imaginary**: definite statements describe what is, while comparative or open-ended properties describe what is wanted. Matching evaluates the second against the first.

## ✨ Capabilities

### 📝 Semantic editor

- Inline properties in canonical, symbolic, or word form, with aliases resolved to canonical ontology keys.
- Property extraction from rich text and plain text; explicit properties take precedence over inferred ones.
- Ontology-aware validation of types, operators, ranges, enums, dates, and coordinates.
- Property suggestions, smart input, command palette, templates, quick capture, and keyboard-driven navigation.
- Notes remain readable prose; the semantic layer is additive, not a separate database view.

### 🔎 Matching

- Treats request properties as constraints and offer properties as facts.
- Handles strings, numbers, dates, enums, and geographic proximity, including alias-aware comparison.
- Supports forward and reverse matching, so two notes can satisfy each other's requirements.
- Returns scores, satisfied constraints, conflicts, missing properties, and human-readable explanations.
- Weighs results by priority and offers semantic-overlap scoring for related-note discovery.
- Filters and sorts by text, tags, properties, dates, and location through a reusable note filter.

### 🧬 Ontology

- A nested vocabulary of domains, note types, properties, value types, valid operators, aliases, enum options, and UI hints.
- Built-in coverage for identity, communication, scheduling, work, and commerce, with room for custom domains.
- The Gardener infers attributes and types from note usage, aligns free text to the ontology, and suggests merges or pruning.
- AI is optional: use a remote model, an in-browser model, or the deterministic local heuristic provider.
- Manual graph editing, learning suggestions, conflict detection, usage statistics, query building, and ontology-generated templates.

### 🗂️ User interface

- Notes, dashboard and quick capture, map, timeline, network, chat, and settings views.
- Search and sort across text, tags, properties, dates, distance, relevance, and recency.
- Geographic notes appear on a map; temporal notes appear on a calendar with location-radius filtering.
- Nostr direct messages use encrypted events, with the same identity used for publishing.
- Configuration can itself be note-based: semantic notes can drive theme, developer mode, AI settings, and capabilities.

### 🤖 Agent automation

- An optional agent server exposes MCP tools over SSE and a WebSocket bridge for the UI.
- Built-in tools cover note creation, update, deletion, search, batch operations, capability inspection, and LLM-assisted semantic extraction.
- Skills are declarative translators: they recognize semantic patterns, export notes to browser or API actions, and import results back as notes.
- Browser automation runs through Playwright with guards for localhost access; API actions are explicit and inspectable.
- Capability flags describe intended browser, file, and API access; browser execution checks its flag at runtime. Skills can require approval, and note-based permission parsing exists for network actions.
- Config notes and note-defined skills let users extend behavior without rebuilding the application.
- Pattern recognition can predict needs, and the autonomous task executor adds confidence thresholds, authorization, retries, and approval states.

### 🌐 Networks

| Transport | Role |
| :--- | :--- |
| **Local** | Full workspace and matching with no network at all |
| **Nostr** | Public semantic notes, discovery, subscriptions, profiles, and encrypted chat |
| **Meshtastic** | Compact CBOR notes and discovery over LoRa mesh, via WebSerial or an agent proxy |

A shared network registry coordinates providers. The network gate enforces privacy-by-default: private notes require explicit confirmation before transmission, and publication can expose semantic tags at different privacy levels. Transports are interchangeable in principle; the current implementations differ in maturity.

### 🧪 Simulator

- Experiment and evolve Ontologies
- Runs multi-agent scenarios to observe matching, publishing, and emergent coordination.
- Provides a live dashboard with agent screens and system logs side by side.
- Supports predefined and generated scenarios, plus recorded movie output for review and demonstration.
- Uses the same core matching semantics as the application.

### 🧑‍💻 Developer surfaces

- Typed core with explicit note, property, ontology, match, skill, task, and network contracts.
- Ontology-driven forms, templates, suggestions, and visual metadata.
- Metaphor system for mapping semantic patterns to specialized visual components.
- Plugin hooks for UI metaphors and agent tools, with registries for skills and network providers.
- Scenario manager and deterministic test environment for semantic and multi-agent behavior.

## 🧱 System design

The core does not require the UI, the agent, or a network; each is an optional layer.

| Layer | Responsibility | Package |
| :--- | :--- | :--- |
| **Semantic kernel** | Note model, parsing, ontology, inference, matching, privacy gates, transports, skills, tasks | `@notention/core` |
| **Action agent** | MCP server, tool plugins, skill execution, browser/API actions, persistence | `@notention/agent` |
| **Local-first PWA** | Editor, views, maps, timelines, network feed, chat, settings | `@notention/ui` |
| **Terminal cockpit** | Interactive agent session, context management, extraction, security scan, embedded server | `@notention/cli` |
| **Simulation lab** | Multi-agent scenarios, live dashboard, recording | `simulator` |

The dependency direction is deliberate: the core knows nothing about React or the agent; the UI can run without the agent; the agent can run headless; the CLI can start an embedded agent when none is available.

## 🔍 Status

| Area | State |
| :--- | :--- |
| Semantic notes, parsing, ontology, aliases, matching, filtering | ✅ Working and tested |
| Local-first UI, maps, timelines, network feed, encrypted chat | ✅ Working |
| Nostr publishing and discovery | ✅ Working |
| MCP agent tools, reference skills, browser capability checks | ✅ Working |
| Simulator and multi-agent scenarios | ✅ Working |
| Meshtastic transport | 🧪 Works with hardware; setup and range are practical constraints |
| Browser/API skill execution | 🧪 Browser actions are capability-gated; API actions are explicit; reference adapters demonstrate the pattern |
| Note-defined skills, autonomous tasks, pattern predictions | 🧪 Emerging |
| Canonical CBOR, content-addressed note identity, sealed envelopes, transition/payment/trust notes, libp2p/HTTP bindings, CRDT sync | 🧭 Specified, not yet complete |

Not every idea in the protocol specification is implemented. The workspace is usable now; the deeper coordination protocol is a direction, not a claim. `README2.md` records both the normative design and the current gaps.

## 🔐 Privacy, trust, and boundaries

- **Private by default.** New notes start private, and the network gate blocks unconfirmed transmission of non-public notes.
- **Private is not invisible.** Private publication hashes semantic tags, but the note body is still published. Treat publication as publication and review content before sharing.
- **Local-first, not encrypted-at-rest by default.** The workspace persists locally; local storage encryption is not provided by default.
- **Keys are identity.** Nostr uses a local key or a NIP-07 browser signer. There is no central account or administrator.
- **Agent access is scoped.** Browser and file capabilities are off unless enabled, and browser execution checks its flag at runtime. Note-based permission parsing and skill approvals exist as additional hooks.
- **Remote content is untrusted.** Treat fetched content as data, not instructions. Review automated actions before granting broad capability.

## 🚀 Quick start

Node.js 20 or newer and pnpm are expected. Install dependencies once, then choose a mode.

| Goal | Command |
| :--- | :--- |
| Install the workspace | `pnpm install` |
| UI only, local-first | `pnpm run dev:local` |
| UI plus agent | `pnpm run dev:server` |
| Agent only | `pnpm run agent` |
| Terminal session | `pnpm run cli` |
| Build everything | `pnpm run build` |
| Run tests | `pnpm test` |
| Simulator | `pnpm run build -w simulator` then `pnpm start -w simulator -- --ui-server` |

The UI is a PWA and can be installed; the terminal prints the addresses it binds. The CLI can start an embedded agent automatically when it cannot find one.

Environment switches:

| Variable | Effect |
| :--- | :--- |
| `VITE_ENABLE_AGENT` | Enable or disable the UI's agent bridge |
| `VITE_LLM_SOURCE` | Choose `browser`, `server`, or `none` for the UI |
| `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` | Configure the CLI provider |
| `NOSTR_RELAYS` | Override the default relay set |
| `MESHTASTIC_PORT` | Select the serial device for mesh transport |

## 📚 Library usage

`@notention/core` is the library surface. It is ESM, ships type declarations, and avoids React and browser-only assumptions where it can. The package root is the supported entry point. The core does not impose a persistence layer: bring your own store, or use the conventions in the UI and agent packages.

| Package | Use it for | Notes |
| :--- | :--- | :--- |
| `@notention/core` | Notes, parsing, ontology, matching, networks, skills, tasks | Primary library; build it before external consumption |
| `@notention/agent` | Embedding the MCP/WebSocket agent server | Workspace package; requires TypeScript tooling or bundling |
| `@notention/ui` | Reference PWA and UI patterns | Application package, not a general component library |
| `@notention/cli` | Scriptable terminal workflows | Includes an embedded agent mode |
| `simulator` | Multi-agent experiments and demos | Depends on the core and a browser for recording |

A typical integration follows the same shape as the application: parse or construct notes, normalize against an ontology, match request notes to offer notes, then persist the results yourself. Keep the kernel deterministic and push side effects to the edges.

## 🛠️ Extending the system

| Goal | Extension point | Starting place |
| :--- | :--- | :--- |
| Add vocabulary or note types | Ontology domain modules and aliases | `core/src/ontology` |
| Add a data source or workflow | Skill with patterns, exported actions, and an importer | `core/src/skills`, `agent/src/skills` |
| Define automation in a note | Skill definition note with trigger properties and an action payload | `agent/src/skills/NoteSkillLoader.ts` |
| Add a transport | `NetworkProvider` plus registry registration | `core/src/network` |
| Add an agent tool | `AgentPlugin` plus the MCP tool registry | `agent/src/server` |
| Add a visual language | Metaphor definition and matching rules | `core/src/skills/metaphor`, `ui/src/plugins` |
| Add a workspace view | View component and routing | `ui/src/components/views` |
| Add a CLI capability | Slash command module and tool adapter | `cli/src/commands`, `cli/src/tools` |

The seams are intentional. A new domain should not require a new matching engine; a new transport should not require changes to note semantics; a new skill should not require changes to the ontology core.

## 🧭 Possibilities

The specification points beyond a notebook toward a semantic coordination layer: immutable content-addressed notes, signed attestations and transitions, sealed visibility, payment and escrow objects, service discovery, and synchronization across heterogeneous transports.

| Frontier | Why it matters |
| :--- | :--- |
| Content-addressed, immutable notes | Deterministic identity, deduplication, auditability, conflict preservation |
| Signed transitions and state inference | Workflows that emerge from evidence instead of mutable status fields |
| Attestations and a local trust graph | Reputation and governance without a central scorekeeper |
| Sealed visibility | Private collaboration over public or untrusted carriers |
| Economic primitives | Invoices, escrow, receipts, and refunds as portable notes |
| Real-time and offline sync | Branches, merges, and conflict surfacing across devices |
| More transports | HTTP, libp2p, mesh, and future bindings carrying the same objects |
| Capability-scoped agents and hardware | Automation that can be delegated, audited, and revoked |

The interesting work is not only adding features, but keeping the semantics small enough that all of these remain consequences of the same note model.

## 🗺️ Repository map

| Path | Contents |
| :--- | :--- |
| `core/` | Semantic kernel: notes, ontology, matching, networks, skills, tasks, metaphors |
| `agent/` | MCP server, tool plugins, skill runtime, browser/API execution, persistence |
| `ui/` | React PWA: editor, views, maps, timeline, network feed, chat, settings |
| `cli/` | Terminal interface, provider configuration, context, tools, embedded server |
| `simulator/` | Multi-agent scenarios, dashboard, movie studio, recording |
| `doc/` | Ontology notes and use-case research |
| `scripts/` | Development orchestration |
| `ARCHITECTURE.md` | Design decisions, data flow, and metaphors |
| `README2.md` | Protocol specification plus implementation status and gaps |
| `AGENTS.md` | Coding conventions for contributors |

## 🤝 Contributing

- Read `AGENTS.md` and `ARCHITECTURE.md` before changing semantics.
- Prefer extending a seam over adding a special case: ontology, skill, transport, plugin, or view.
- Keep the core deterministic, typed, and free of UI assumptions.
- Add focused tests for behavior, especially matching, parsing, ontology evolution, and authorization.
- Separate what is implemented from what is specified, and update the status documentation when that line moves.
- Run `pnpm test` and `pnpm run build` before submitting changes.

Good starting points are new ontology domains, reference skills, transport bindings, UI views, simulator scenarios, and the protocol gaps listed in `README2.md`.

## 📖 Further reading

| Document | Why read it |
| :--- | :--- |
| `ARCHITECTURE.md` | The short architectural story: matching, parsing, networks, data flow |
| `README2.md` | The full protocol design, conformance profiles, and honest implementation inventory |
| `doc/ontology/` | Ontology reference material |
| `cli/README.md` | Terminal usage, commands, and provider setup |
| `simulator/README.md` | Scenario authoring, dashboard, and recording |
| `AGENTS.md` | Project coding standards and review expectations |
