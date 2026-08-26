# Notention — Decentralized Semantic Network Implementation Specification

> **Implementation of the Decentralized Semantic Network (DSN) Protocol v1.0**
>
> This document describes the **actual Notention codebase** — mapping the normative protocol specification (`README2.prompt.md`) to implemented modules, runtime behavior, and known gaps. All gaps and divergences are inferrable by comparing this document to the source code.

---

## 📜 Normative Reference

**Protocol Specification:** [`README2.prompt.md`](./README2.prompt.md) — DSN Protocol v1.0 (Sections 1–22)

This implementation targets the **Core Profile** (§21.1) with partial **Full** and **Agent** profiles. The specification is the source of truth; this document describes the implementation.

---

## 🏗️ Architecture: Protocol Layers → Implementation

| Protocol Layer (§3) | Implementation Modules | Status |
|---|---|---|
| **Natural Language & UI** | `ui/src/components/Editor/`, `ui/src/hooks/usePropertyExtractor.ts`, `core/src/notes/propertyExtractor.ts` | ✅ Complete |
| **Semantic Ontology Engine** | `core/src/matching/`, `core/src/ontology/`, `core/src/notes/parsing.ts`, `core/src/notes/properties.ts` | ✅ Complete |
| **Action Agent** | `agent/src/`, `agent/src/VoltBrowserCoordinator.ts`, `agent/src/core/actionExecutor.ts` | ✅ Complete (VoltAgent + Playwright + MCP) |
| **P2P Coordination** | `core/src/network/nostr/`, `core/src/network/mesh/`, `core/src/network/networkGate.ts` | ✅ Nostr + Meshtastic |
| **Transport & Persistence** | `core/src/notes/notes.ts`, `core/src/utils/encoding.ts`, `ui/src/services/storage.ts` | 🟡 Local-first; CBOR canonicalization WIP |
| **Identity & Security** | `core/src/security/CapabilityManager.ts`, `core/src/network/nostr/privacy.ts`, `agent/src/core/Capabilities.ts` | ✅ Core; hardware attestation WIP |

---

## 📦 Package Structure

### `@notention/core` — Protocol Kernel

**Location:** `/core` | **Exports:** `core/src/index.ts`

Transport-agnostic kernel. Zero UI dependencies. Runs in browser, Node, or edge.

#### Implemented Modules

| Module | Purpose | Key Types/Functions |
|---|---|---|
| `matching/MatchEngine.ts` | Request↔offer constraint satisfaction with alias resolution | `calculateMatchScore(request, offer) → MatchResult` |
| `matching/MatchingService.ts` | High-level matching with priority/trust weighting | `match(notes, query) → MatchResult[]` |
| `matching/PropertyIndex.ts` | Inverted index for fast semantic lookup | `index(notes)`, `query(properties)` |
| `matching/matchers.ts` | Typed evaluators: number, range, geo, date, string, enum | `PropertyMatchers.evaluateNumber/Geo/Date/String/Enum` |
| `notes/parsing.ts` | Canonical + symbolic property parser (3 strategies) | `parseProperties(text, ontology?) → Property[]` |
| `notes/properties.ts` | Property equality, indefinite operator detection | `arePropertiesEqual`, `isIndefiniteProperty` |
| `notes/notes.ts` | Note CRUD pipeline, intent inference (Real/Imaginary) | `NotePipeline`, `inferNoteIntent`, `createNote` |
| `notes/conflicts.ts` | Conflict detection & branch preservation | `detectConflicts`, `mergeBranches` |
| `notes/quantities.ts` | Structured quantity parsing (price, rate, duration) | `parseQuantity`, `Quantity` type |
| `notes/queryBuilder.ts` | Query Note construction from constraints | `buildQueryNote` |
| `notes/NoteFilter.ts` | Privacy-aware filtering | `filterByPrivacy`, `filterByTags` |
| `ontology/ontologyService.ts` | Dynamic schema access, widget metadata, usage tracking | `OntologyService` class |
| `ontology/ontologyHelpers.ts` | Attribute lookup, canonical keys, aliases, state predicates | `findAttributeDef`, `getCanonicalKey`, `getAliases` |
| `ontology/ontology.default.ts` | Built-in ontology: 5 domains, 50+ attributes | `DEFAULT_ONTOLOGY: OntologyNode[]` |
| `ontology/propertyAliases.ts` | Key alias resolution (e.g., `loc` → `location`) | `resolveAlias` |
| `skills/BaseSkill.ts` | Abstract skill base with ontology-aware mapping | `execute(properties) → Promise<any>` |
| `skills/IndeedSkill.ts` | Job search via Indeed API | `execute` → job listings as Notes |
| `skills/CraigslistSkill.ts` | Classifieds search | `execute` → listings as Notes |
| `skills/GitHubSkill.ts` | GitHub search (repos, issues, users) | `execute` → repos/issues as Notes |
| `skills/ReminderSkill.ts` | Local reminders/notifications | `execute` → scheduled Notes |
| `skills/SkillRegistry.ts` | Skill registration & discovery | `register`, `get`, `getAll` |
| `skills/skillExecutor/` | Sandbox execution: legacy, base, resultTransformer | `executeSkill(skillId, properties)` |
| `skills/skillPatternMatcher.ts` | Intent → skill matching | `matchSkill(intent, skills)` |
| `skills/skillApprovalManager.ts` | User approval flow for skill execution | `requestApproval`, `isApproved` |
| `skills/metaphor/MetaphorMapper.ts` | Note pattern → UI metaphor mapping | `mapNoteToMetaphor(note)` |
| `skills/metaphor/MetaphorRegistry.ts` | Metaphor plugin registration | `registerMetaphor`, `getMetaphor` |
| `network/nostr/nostr.ts` | Nostr transport: Kind 1/35000, NIP-07, NodeSigner | `publishNoteToNostr`, `convertEventToNote` |
| `network/nostr/privacy.ts` | SealedNote envelope, privacy tags | `getPrivacyTags`, `sealNote`, `unsealNote` |
| `network/nostr/discovery.ts` | Service discovery, capability queries | `discoverServices`, `queryNotes` |
| `network/mesh/` | Meshtastic/LoRa: CBOR, fragmentation, topic `dsn/1` | `MeshTransport` (planned integration) |
| `network/networkGate.ts` | Unified multi-transport facade, privacy enforcement | `NetworkGate.canTransmit` |
| `security/CapabilityManager.ts` | Delegation, scoping, revocation, capability tokens | `grant`, `revoke`, `verify` |
| `patternRecognition/` | Co-occurrence, sequential, matching strategies | `PatternRecognitionService` |
| `tasks/` | Background task queue with persistence | `TaskQueue`, `Task` types |
| `config/NoteBasedConfig.ts` | Configuration stored as Notes | `NoteBasedConfig` |
| `config/features.ts` | Feature flags | `FeatureFlags` |
| `utils/canonicalization.ts` | Deterministic CBOR (internal, not exported) | `canonicalize`, `noteId` (WIP) |
| `utils/encoding.ts` | Hex/base64url/CBOR utilities | `hexToBytes`, `bytesToBase64url` |
| `utils/geo.ts` | Haversine distance, geo parsing | `haversineDistance`, `parseGeo` |
| `utils/inference.ts` | State inference from predicates | `inferState(note, ontology)` |
| `utils/validationFramework.ts` | Schema validation | `ValidationFramework` |

#### Conformance Status (§21)

| Profile | Status | Gaps |
|---|---|---|
| **Core** | 🟡 Partial | Canonical CBOR + NoteID derivation (§4.3, §7); SealedNote encryption (§9.3); Transition workflow engine (§14) |
| **Full** | 🟡 Partial | Payment objects (§18), disputes (§17.4), advanced trust graph (§17.2) |
| **Infrastructure** | 🟡 Partial | Relay/indexer service registration (§19.1) |
| **Hardware** | 🟡 Partial | Meshtastic transport works; device attestation WIP |
| **Agent** | ✅ Complete | Via `@notention/agent` |
| **Realtime** | 🔴 Planned | CRDT sync (§16.6) |

---

### `@notention/ui` — Progressive Web App

**Location:** `/ui` | **Stack:** React 18, Vite, TailwindCSS, Tiptap

Offline-first PWA. Syncs when online. Progressive disclosure via settings.

#### Implemented Features

| Feature | Implementation | Protocol Ref |
|---|---|---|
| **Semantic Editor** | `components/Editor/EditorManager.tsx` — Tiptap, inline `[key:op:value]` parsing | §11, §12 |
| **Property Extraction** | `hooks/usePropertyExtractor.ts` → `core/notes/propertyExtractor.ts` | §5, §11.2 |
| **Auto-generated Forms** | `components/Forms/` — driven by `OntologyService.getWidgetMetadata` | §12.2 |
| **Ontology Visualizer** | `components/OntologyGraph/` — force graph (dev mode) | §12.4 |
| **Matcher Tester** | `components/MatcherTester/` — live request/offer scoring (dev mode) | §13 |
| **Parser Debugger** | `components/ParserDebugger/` — real-time parse tree (dev mode) | §5 |
| **Simulator View** | `components/SimulatorView.tsx` — spawn agents, run cycles | §6.1 |
| **Plugin System** | `plugins/PluginSystem.ts` — metaphor-driven UI extensions | §12, §6 |
| **Metaphor Mapper** | `core/skills/metaphor/MetaphorMapper.ts` — pattern → UI metaphor | §6 |
| **Network View** | `components/NetworkView/` — unified feed across Nostr/Mesh/Local | §15 |
| **Settings** | `components/Settings/` — identity, transport, privacy, dev mode | §9, §8 |

#### Progressive Disclosure (§12.4)

| Mode | Entry Point | Visible Features |
|---|---|---|
| **Standard** | Default | Natural language, cards, forms, simple status |
| **Power** | `Settings → Advanced` | Property summaries, ontology labels, trust details |
| **Developer** | `Settings → Developer Mode` | Raw canonical view, parser debugger, transport logs, rule tracer, simulator |

#### Dual Mode Operation

| Mode | Transport | Storage | Agent |
|---|---|---|---|
| **Local-First (PWA)** | None (private mode) | `localforage` (encrypted) | Embedded (WASM) or remote |
| **Server Mode** | Nostr relays, Meshtastic | Local + remote sync | Remote `@notention/agent` via WebSocket |

---

### `@notention/agent` — Universal Action Agent

**Location:** `/agent` | **Stack:** VoltAgent, Playwright, MCP SDK, Express, WebSocket

Optional, capability-gated orchestration layer.

#### Capabilities (§19.2)

| Capability | Implementation |
|---|---|
| `core.note` | Note CRUD via `core/notes/notes.ts` |
| `core.matching` | Semantic search via `core/matching/MatchingService.ts` |
| `transport.nostr` | Publish/subscribe via `core/network/nostr/` |
| `transport.mesh` | Meshtastic via `core/network/mesh/` |
| `transport.http` | REST endpoints in `agent/src/server/` |
| `agent.browser` | `VoltBrowserCoordinator.ts` + Playwright |
| `agent.api` | MCP tool registry (`agent/src/server/McpToolRegistry.ts`) |
| `pay.btc` / `pay.lightning` | Payment skills (types only, execution WIP) |
| `hardware.secure_element` | Delegated signing (types only) |
| `sync.realtime` | CRDT heads (planned) |

#### Architecture

```
VOLTAGENT CORE
  Bootstrap → ConfigManager → PluginManager → McpServer
       │              │               │
  ┌────▼────┐   ┌──────▼──────┐  ┌────▼────┐
  │CorePlug │   │Intelligence │  │BatchPlug│
  │• Notes  │   │• LLM extract│  │• Batched│
  │• Match  │   │• Plan       │  │  ops    │
  │• Network│   └─────────────┘  └─────────┘
  └────┬────┘
       │
  ┌────▼────────────────────────────────────┐
  │         SKILL REGISTRY & EXECUTOR        │
  │  • DynamicSkill (Note-defined)          │
  │  • ConfigSkill                          │
  │  • CraigslistSkill  • GitHubSkill       │
  │  • IndeedSkill      • ReminderSkill     │
  └────────────────────┬────────────────────┘
                       │
              ┌────────▼────────┐
              │ VOLT BROWSER    │
              │ COORDINATOR     │
              │ (Playwright)    │
              └─────────────────┘
```

#### Safety (§20.8)

- **Dry-run mode**: All mutating actions previewable
- **Scoped delegation**: `CapabilityManager` enforces `pay.max`, `agent.browser`, etc.
- **Audit log**: Every action produces signed transition/provenance Note
- **Sandboxed execution**: Playwright contexts isolated per task
- **Remote content = untrusted data**: Never executed as instructions

#### Agent Skills

| Skill | Domain | Implements |
|---|---|---|
| `DynamicSkill` | Generic | Note-defined skills via `NoteSkillLoader` |
| `ConfigSkill` | Config | Read/write `NoteBasedConfig` |
| `CraigslistSkill` | Classifieds | Search → Offer Notes |
| `GitHubSkill` | Code | Search repos/issues → Notes |
| `IndeedSkill` | Jobs | Search jobs → Offer Notes |
| `ReminderSkill` | Scheduling | Create reminder Notes |

---

### `@notention/cli` — Agentic Text UI

**Location:** `/cli` | **Stack:** Ink (React for CLI), TypeScript

Terminal interface for power users and automation.

#### Commands

```bash
notention                    # Start interactive session
notention /extract "text"    # Extract semantic properties
notention /run gig-economy   # Run simulation scenario
notention /security scan     # Scan notes for secrets
notention /provider openai   # Switch LLM provider
```

#### Features

- **Context awareness**: `/open <note-id>` focuses agent on a note
- **Auto-server**: Starts embedded agent if none running
- **Rich output**: Markdown, colors, tables via Ink
- **Persistent history**: `~/.notention_cli_history`
- **Tab autocomplete**: Slash commands, note IDs, skill names

---

### `@notention/simulator` — Multi-Agent Test Lab

**Location:** `/simulator`

Validates matching logic, ontology convergence, emergent behavior.

#### Movie Studio UI

```bash
npm run build -w simulator
npm start -w simulator -- --ui-server  # http://localhost:3000
```

| Feature | Description |
|---|---|
| **Studio** | Configure scenarios (Gig Economy, Marketplace) or generate random agents |
| **Live Preview** | Real-time multi-agent dashboard with agent screens + system logs |
| **Movie Library** | Auto-record MP4, preview/download/manage recordings |

#### CLI (Legacy)

```bash
npm start -w simulator -- --scenario=gig-economy
npm start -w simulator -- --movie --scenario=gig-economy
npm start -w simulator -- --generate=10 --duration=60
```

#### Simulation Model

- Agents hold Note templates (Offers, Requests, Profiles)
- Each cycle: agents publish → network delivers → local matching → logging
- Metrics: match rate, constraint satisfaction, vocabulary divergence
- **Convergence test**: Agents using `cost` vs `price` → low match → Gardener suggests alias

---

## 🔧 Developer Workflow

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- For Meshtastic: Meshtastic device + WebSerial (browser) or serial (Node)

### Install & Build

```bash
pnpm install          # Install all workspaces
pnpm run build        # Build everything (tsc)
pnpm run test         # Run all tests (vitest)
```

### Development Modes

```bash
pnpm run dev:local      # UI only (local-first, no agent)
pnpm run dev:server     # Full stack (UI + Agent server)
pnpm run agent          # Agent only
pnpm run cli            # CLI
npm run build -w simulator && npm start -w simulator -- --ui-server
```

### Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `VITE_ENABLE_AGENT` | Enable agent integration in UI | `true` |
| `VITE_LLM_SOURCE` | `remote` \| `local` \| `none` | `remote` |
| `LLM_PROVIDER` | `openai` \| `ollama` \| `gemini` | `ollama` |
| `LLM_API_KEY` | API key for remote provider | — |
| `LLM_MODEL` | Model identifier | `gpt-4o` / `llama3.1` |
| `NOSTR_RELAYS` | Comma-separated relay URLs | `wss://relay.damus.io,wss://nos.lol` |
| `MESHTASTIC_PORT` | Serial port for Meshtastic (Node) | `/dev/ttyUSB0` |

---

## 📝 Semantic Syntax: Implemented vs. Spec

### Property Format (Implemented)

```
Canonical:    [key:operator:value]        # e.g., [price:is:100]
Symbolic:     [key operator value]        # e.g., [price < 100]
Word:         [key is value]              # e.g., [price is 100]
```

**Parsed by:** `core/src/notes/parsing.ts` — `PropertyBlockParser` with 3 strategies:
1. `ColonFormatStrategy` — `[key:op:value]` or `[key:value]` (defaults to `is`)
2. `SymbolicFormatStrategy` — `[key < value]`, `[key > value]`, `[key ≈ value]`, etc.
3. `WordFormatStrategy` — `[key is value]`, `[key contains value]`, `[key before value]`

### Implemented Operators (from `SYMBOL_TO_OP` + `WORD_OP` regex)

| Operator | Canonical Code | Symbolic | Word Format | Matcher |
|---|---|---|---|---|
| Exact match | `is` | `=` `:` | `is` | `evaluateString`/`evaluateNumber`/`evaluateEnum` |
| Not equal | `is not` | `!=` | `not` | `evaluateString` (negative) |
| Less than | `less than` | `<` | `less than` | `evaluateNumber` |
| Greater than | `greater than` | `>` | `greater than` | `evaluateNumber` |
| Less or equal | `less than or equal` | `<=` | `less than or equal` | `evaluateNumber` |
| Greater or equal | `greater than or equal` | `>=` | `greater than or equal` | `evaluateNumber` |
| Range | `between` `range` | — | `between` | `evaluateNumberRange` |
| Contains | `contains` | `∋` | `contains` | `evaluateString` (partial) |
| Excludes | `excludes` | — | — | `evaluateString` (negative partial) |
| Geo near | `is near` `near` | `≈` | `near` | `evaluateGeo` |
| Date before | `is before` `before` | — | `before` | `evaluateDate` |
| Date after | `is after` `after` | — | `after` | `evaluateDate` |

### Spec Operators NOT Yet Implemented

| Spec Operator (§5.4) | Code | Status |
|---|---|---|
| Approximate | `approx` | 🔴 Missing |
| In set | `in` | 🔴 Missing |
| Intersects | `inter` | 🔴 Missing |
| Exists | `exists` | 🔴 Missing |

### Namespaces (Implemented)

| Prefix | Use Case | Resolution |
|---|---|---|
| `dsn:` | Core protocol | Hardcoded in `ontology.default.ts` |
| `skill:` | Skill-defined | Via skill ontology registration |
| `ext:` | Public extensions | Pass-through |
| `local:` | Private local-only | Pass-through |
| Custom IRI | Any absolute IRI | Pass-through (no validation) |

**Alias resolution:** `core/src/ontology/propertyAliases.ts` — `resolveAlias(key)` maps common synonyms (e.g., `loc` → `location`, `cost` → `price`). Canonical keys from ontology via `getCanonicalKey`.

### Note Types (Implemented)

The built-in ontology (`core/src/ontology/domains/`) defines:

| Domain | Node Types | Key Attributes |
|---|---|---|
| **Entity** | `Person`, `Organization`, `Place` | `name`, `role`, `location`, `contact` |
| **Communication** | `Message`, `Conversation` | `recipient`, `subject`, `thread` |
| **Event** | `Meeting`, `Conference`, `Appointment` | `time`, `location`, `attendees`, `duration` |
| **Work** | `Job`, `Project`, `Task`, `FreelanceGig` | `title`, `skills`, `budget`, `deadline`, `status` |
| **Commerce** | `Product`, `Service`, `Listing` | `price`, `currency`, `category`, `condition`, `inventory` |

**Note intent inference** (`core/src/notes/notes.ts:10-33`):
- Explicit: `[intent:is:request]` → Imaginary, `[intent:is:offer]` → Real
- Heuristic: Any indefinite operator (`<`, `>`, `contains`, `near`) → Imaginary
- Default: All definite `is` → Real

---

## 🔐 Identity & Security

### PeerID (Implemented)

```
nostr:<hex_pubkey>           # Nostr pubkey (used as PeerID)
mesh:<node_id>               # Meshtastic node ID
peer:<base64url_sha256>      # Generic (not yet used)
```

**No DID resolver, BOLT-12, or Bitcoin address aliases implemented.** Spec §8.2 is aspirational.

### Key Management

| Feature | Status |
|---|---|
| NIP-07 browser signer | ✅ `BrowserSigner` |
| Node signer (hex privkey) | ✅ `NodeSigner` |
| Key rotation Notes | 🔴 Types only |
| Device subkeys | 🔴 Types only |
| Hardware secure element | 🔴 Types only |
| Social recovery | 🔴 Types only |

### Delegation (Partial)

`core/src/security/CapabilityManager.ts` implements:
- Capability tokens: `publish.notes`, `send.messages`, `pay.max:<amount>`, `agent.browser`
- Scoping: `constraints` object per capability
- Expiry: timestamp-based
- Revocation: `revoke(capabilityId)`
- Verification: `verify(capability, action)`

**Missing:** Capability Note format (§8.6), delegation chaining, threshold policies (§10.4).

### Visibility & Sealing

| Mode | Implementation |
|---|---|
| `private` | Local-only, encrypted at rest via `localforage` + `crypto.subtle` |
| `protected` | Nostr: published with `property` tags but no `prop:` index tags |
| `public` | Nostr: published with `prop:` index tags for discovery |

**SealedNote envelope** (`core/src/network/nostr/privacy.ts`):
- Algorithm: `xchacha20poly1305` (via `@noble/ciphers`)
- Recipients: array of `{ kid, enc_key }`
- Not yet integrated into UI publish flow

---

## 🌐 Transport Bindings

### Nostr (Implemented)

| Item | Value |
|---|---|
| Note kind | `35000` (`KIND_SEMANTIC_NOTE`) or `1` (text-only) |
| Query kind | Not implemented |
| Service kind | Not implemented |
| Content | Plain text (markdown) |
| Properties | `["property", key, operator, value]` tags |
| Index tags (public) | `["t", `prop:${key}`]` |
| Private Notes | No `property` tags; `privacy: 'private'` blocks publish via `NetworkGate` |
| Signer | NIP-07 (browser) or hex privkey (Node) |

**Gaps vs Spec (§15.3):**
- Query kind `35002` not implemented
- Service kind `35003` not implemented
- CBOR WireNote payload not used (plain JSON in content)
- Dedupe by NoteID not implemented (uses Nostr event ID)

### Meshtastic (Partial)

| Item | Value |
|---|---|
| Payload | CBOR (planned) |
| Topic | `dsn/1` |
| Max fragment | 256 bytes |
| Fragmentation | Header: `mid`, `seq`, `final` (planned) |
| Compression | zstd (planned) |

**Status:** Mesh transport types exist; integration with `NetworkGate` incomplete.

### HTTP (Partial)

| Endpoint | Method | Status |
|---|---|---|
| `/dsn/v1/notes` | POST | 🟡 Server exists in `agent/src/server/` |
| `/dsn/v1/notes/{id}` | GET | 🔴 Not implemented |
| `/dsn/v1/query` | POST | 🔴 Not implemented |
| `/dsn/v1/services` | GET | 🔴 Not implemented |

**Content-Type:** Not enforced; JSON only.

---

## 🧪 Testing & Conformance

### Test Structure

```
/core/src/tests/              # Unit: matching, parsing, ontology, quantities
/core/src/tests/integration/  # Golden path: GoldenPath.test.ts
/agent/src/tests/             # Skills, server, tool registry
/ui/src/tests/                # Components, integration
/cli/src/tests/               # CLI commands
/simulator/src/tests/         # Scenario tests
/e2e/                         # Playwright (planned)
```

### Run Tests

```bash
pnpm run test                          # All workspaces
pnpm run test -w @notention/core       # Core only
pnpm run test -w @notention/agent      # Agent only
pnpm run test -w @notention/ui         # UI only
```

### Conformance Test Coverage (§22)

| Category | Spec Coverage | Implementation |
|---|---|---|
| Canonicalization | Reorder, NFC, dedupe, float reject, extension | 🔴 No CBOR canonicalization tests |
| Signatures | Valid, modified body, unknown alg | 🟡 Nostr event signing tested; protocol sigs not tested |
| Matching | Required/optional constraints, priority, trust | ✅ `MatchEngine.test.ts`, `MatchingService.test.ts` |
| Transport | Nostr publish/subscribe, mesh fragmentation | 🟡 Nostr integration tested; mesh not tested |
| Skills | Execution, approval, pattern matching | ✅ Skill tests exist |
| Agent safety | Dry-run, scope enforcement, audit log | 🟡 Partial |
| UI rendering | Forms, editor, progressive disclosure | 🟡 Component tests only |

---

## 🗺️ Implementation Gap Analysis

### Critical Path to Core Profile (§21.1)

| Spec Requirement | Implementation | Gap |
|---|---|---|
| NoteBody canonicalization | `notes.ts` types only | Deterministic CBOR + sorting rules (§7) |
| NoteID derivation | UUID (`crypto.randomUUID()`) | Content-addressed SHA-256(CBOR) (§4.3) |
| secp256k1 identity | Nostr pubkey only | Native `peer:` ID (§8.1) |
| Signature creation/verification | Nostr event signing | Protocol signing digest (§10.2) |
| Typed property model | String values only | Typed values (§5.3): money, geo, datetime, etc. |
| Basic request/offer matching | ✅ Complete | — |
| Local content-addressed store | `localforage` by UUID | Content-addressed by NoteID |
| Outbox queue | `tasks/` queue | Not transport-aware |
| Tombstones | `deletedAt` field | Tombstone Note type (§16.4) |
| Public/private distinction | ✅ `privacy` field | — |
| LM intent pipeline | Property extraction only | Validation, preview, confirmation (§11) |
| Auto-generated safe UI | ✅ Forms, metaphors | — |
| At least one transport | ✅ Nostr | — |
| Local encrypted-at-rest | ✅ `localforage` + Web Crypto | — |

### Spec Features Not Implemented

| Feature | Spec Section | Notes |
|---|---|---|
| SealedNote encryption | §9.3 | Types exist; not wired to publish |
| Transition Notes & guards | §14 | Types only; no workflow engine |
| Payment objects (Invoice, Payment, Escrow) | §18 | Types in `quantities.ts`; no execution |
| Trust attestations & graph | §17 | Types only |
| Dispute & governance Notes | §17.4 | Types only |
| Service registration | §19.1 | Discovery exists; registration not implemented |
| Capability discovery | §19.2 | `CapabilityManager` exists; no network advertisement |
| CRDT real-time sync | §16.6 | Planned |
| LM output validation | §11.3 | Extraction only; no deterministic validation |
| Ambiguity handling | §11.4 | Not implemented |
| Risk classes & confirmation | §11.5 | Not implemented |
| Provenance metadata | §11.6 | Partial in `source` field |
| Extension safety | §20.4 | Pass-through only; no sandbox |

---

## 📚 Key Documentation

| Document | Purpose |
|---|---|
| [`README2.prompt.md`](./README2.prompt.md) | Normative protocol specification (DSN v1.0) |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | High-level architecture & design decisions |
| [`AGENTS.md`](./AGENTS.md) | Coding guidelines for contributors |
| [`core/src/ontology/ontology.default.ts`](./core/src/ontology/ontology.default.ts) | Built-in ontology (5 domains) |
| [`ui/Ontology.md`](./ui/Ontology.md) | Gardener & emergent ontology guide |
| [`cli/README.md`](./cli/README.md) | CLI usage & configuration |
| [`simulator/README.md`](./simulator/README.md) | Simulator & Movie Studio guide |

---

## 🤝 Contributing

1. Read [`AGENTS.md`](./AGENTS.md) for coding guidelines
2. Follow the protocol specification in `README2.prompt.md`
3. Write tests for new features (vitest + Playwright)
4. Ensure canonicalization passes for any Note changes
5. Update relevant documentation

### Code Style

- TypeScript strict mode
- ESLint + Prettier (config in each workspace)
- Functional style; avoid classes unless necessary
- No mocks in tests — test real objects
- Self-documenting code; minimal comments

---

## 📄 License

MIT — See [`LICENSE`](./LICENSE) (to be added)

---

## 🔗 Links

- **Protocol Spec:** [`README2.prompt.md`](./README2.prompt.md)
- **Architecture:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **Issues:** GitHub Issues
- **Discussions:** GitHub Discussions

---

*Notention implements a subset of the Decentralized Semantic Network Protocol v1.0. The specification is the source of truth; this document describes the current implementation state. All gaps are marked inline for traceability.*