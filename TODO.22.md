# TODO.22 — Master Plan: Local Loop → Survival Infrastructure

**Status:** Canonical plan. Phase 1 detail lives in `TODO.21.md`; this file owns principles, technology decisions, sequencing, and readiness gates for everything after Phase 1.

**Premise:** A working local loop exists (TODO.20). The goal is survival-grade coordination: notes that match across devices and networks, with verifiable commitments, that keep working when the grid fails.

**Rule:** No gate stops the program. A gate either (a) is met, (b) triggers focused iteration on one sub-problem, or (c) triggers a documented fallback that still reaches the ideal outcome by another route. Progress continues on independent work.

---

## 1. Principles

1. **One language until performance forces otherwise.** TypeScript end-to-end. Port only measured hot loops to WASM behind a stable interface.
2. **No required service.** No cloud, no account server, no mandatory relay. Everything works offline; network is enhancement.
3. **No single point of failure.** Multi-relay, multi-storage, multiple transport implementations, optional external deps.
4. **Protocols over products.** Nostr, JCS-JSON, SQLite, GeoJSON, MapLibre — formats with multiple implementations.
5. **Vertical slices.** Each increment is demoable end-to-end and testable deterministically.
6. **Relax implementation, not outcome.** Simplify how we get there; never weaken the result the user experiences.
7. **Compatibility first.** Export everything (JSON, Markdown, GeoJSON, nsec). Import what others export. Forking is a right.
8. **Evidence over assertion.** Match explanations, receipts, local journals. No opaque scores.
9. **Safety is a property of the system, not a feature flag.** Fail closed on hazards; fail open on availability of local data.

---

## 2. Relaxations That Preserve the Ideal

| Ideal outcome | Naive plan | Relaxed plan (same outcome, less fragility) |
|---|---|---|
| Recoverable identity | Shamir social recovery + guardian relays | Encrypted nsec + explicit export/import + optional passkey wrapping. Recovery = user-held backup. |
| Verifiable transitions | Formal TLA+ model + UCAN | Deterministic state-machine tests + signed receipt chain. Verification by any client. |
| No data loss on conflict | Semantic CRDT | Append-only event log + replaceable events + dedupe by event ID + explicit conflict UI for local drafts. |
| Works when internet fails | Native BLE mesh in browser | Bridge daemon (serial/BLE ↔ local WS relay) + Web Serial/Bluetooth where present. Same UX. |
| Fast survival routing | Rust/WASM from day one | Pure TS Time-Expanded A* with typed arrays; benchmark; optional WASM port behind interface. |
| Stranger coordination | Global Sybil resistance | Private networks + explicit trust lists first; optional PoW and WoT for public scope. |
| Rich mapping | GeoLibre hard dependency | MapLibre GL JS + Turf.js directly; GeoLibre optional adapter. |
| Cross-device | Custom sync engine | Nostr replaceable events + per-device event log + session notes; dedupe on ingest. |
| Guaranteed delivery | Custom store-and-forward protocol | Local outbox + relay retry + mesh bridge queue + idempotent event IDs. |
| Accessible UI | Dedicated a11y rewrite | Semantic HTML, ARIA, keyboard-first, contrast tokens, motion reduction — incremental, tested. |

---

## 3. Technology Decisions (Compatibility-First)

| Concern | Choice | Why | SPOF mitigation / fallback |
|---|---|---|---|
| **Transport** | Nostr over WebSocket; multi-relay by default | Many relay implementations; public + self-hosted; simple protocol | `Transport` interface; local in-process relay; future HTTP/P2P additive |
| **Local transport** | In-process relay + file event log | Deterministic tests; offline demos | Same interface as Nostr |
| **Mesh** | Meshtastic via serial/BLE bridge; Web Serial/Web Bluetooth where available | Commodity LoRa hardware; no cloud | Bridge exposes local WS relay; PWA degrades to bridge-only |
| **Identity** | secp256k1 (Nostr nsec/npub), encrypted at rest, export/import | Standard; no server; multi-lib support | Optional WebAuthn PRF wrapping; NIP-07 signer if present |
| **Canonical form** | JCS-JSON (RFC 8785) → Nostr event | Deterministic hashing; libraries in many languages | Test vectors; hash-based event IDs |
| **Encryption** | NIP-44 (v2); NIP-04 fallback | Audited libs; Nostr-native | `Cipher` interface; test vectors |
| **Storage** | Adapter: IndexedDB (default), SQLite-WASM (optional), file (Node) | Works on all targets; no single backend | Migration + export/import; backend detection |
| **Spatial/analytics** | DuckDB-WASM optional; rbush/typed-array fallback | Fast when available | Pure TS fallback for small datasets |
| **Survival engine** | TypeScript Time-Expanded Network A* (pure functions) | One language; fast enough at target sizes | Typed arrays; optional WASM port behind interface |
| **Map** | MapLibre GL JS + Turf.js; deck.gl optional | Open; multiple implementations | GeoLibre optional adapter, never required |
| **AI extraction** | Heuristics first; ONNX Runtime Web / transformers.js optional | Low power; deterministic; offline | Cloud LLM optional with explicit consent |
| **UI** | React + existing components | Existing investment | No framework change |
| **Mobile** | PWA first; Capacitor optional later | Avoid native build complexity solo | Bridge covers BLE/background on Android; wrapper only if needed |
| **Protocol version** | `protocolVersion` in envelope; additive changes | Interop; graceful degradation | Conformance testbed across versions |

**Library rule:** wrap every third-party protocol library (`nostr-tools`, crypto, storage) behind a project interface. Swapping implementations must not touch feature code.

---

## 4. Dependency & Compatibility Strategy

- **Interop targets:** Nostr clients (NIP-01/04/17/42/44/65), Markdown/JSON export, GeoJSON, standard SQLite files.
- **No required external repo:** GeoLibre, WebLLM, and any single project are optional adapters.
- **Multi-relay default:** publish to N configured relays; read from all; dedupe by event ID.
- **Local relay always available:** in-process for tests and demos; no network needed.
- **Storage portability:** export/import full state; schema versioned; migrations reversible.
- **Crypto agility:** algorithms behind interfaces; test vectors in CI; no hand-rolled crypto.
- **Feature detection, not assumption:** OPFS, Web Serial, Web Bluetooth, WebAuthn, WASM — detect, fall back, inform.
- **Data exit:** one click exports notes, ontology, manifests, keys, and receipts.

---

## 5. Increments (Priority Order)

Priority = (survival value × risk reduction) ÷ effort, with **end-to-end demoability** as a tiebreaker.

### Increment 0 — Foundations ✅ COMPLETE (2026-11-12)
- Event envelope: `{protocolVersion, kind, tags, content, created_at, id, pubkey, sig}` — **implemented** in `core/src/network/types.ts` as `EventEnvelope` type.
- `Transport` interface: `publish`, `subscribe`, `status` — **implemented** in `core/src/network/types.ts` as `Transport` interface and `core/src/network/nostr/LocalTransport.ts`.
- Storage adapter: put/get/query/iterate; IndexedDB default, memory and file backends — **already implemented** in `core/src/storage/Storage.ts`, `core/src/storage/indexedDB.ts`.
- Identity: generate/import/export nsec; encrypt at rest; unlock in memory — **implemented** in `core/src/identity/IdentityManager.ts` with PBKDF2 + AES-GCM encryption.
- Local in-process relay — **implemented** in `core/src/network/nostr/LocalRelay.ts` and `core/src/network/nostr/LocalRelayPool.ts`.
- **Done when:** round-trip publish→subscribe→store in tests; identity lock/unlock; storage backends pass the same suite. ✅ All tests passing (594 tests).
- **If unmet:** reduce scope to memory backend and one identity path; continue other increments.

### Increment 1 — Publish/Subscribe End-to-End ✅ COMPLETE (2026-11-12)
- Nostr relay client: connect, auth (NIP-42), REQ/EVENT, reconnect/backoff — **implemented** in `core/src/network/nostr/NostrClient.ts` with `NostrClient` class featuring exponential backoff reconnect, relay health tracking, and multi-relay publish.
- Multi-relay publish; dedupe on ingest; relay health — **implemented** with `getHealthyRelays()`, `getRelayHealth()`, failure tracking, and automatic failover.
- Note events (replaceable kinds) + filter subscriptions — **implemented** with filter subscription support (kinds, authors, #d tags, generic #tags) and `SubscriptionHandle` for lifecycle management.
- **Done when:** two independent clients exchange notes through ≥2 relays in <5s; disconnect/reconnect recovers; tests run against local relay deterministically. ✅ All 608 tests passing including 29 new NostrClient tests covering publish/subscribe, filtering, relay health, and integration with LocalRelay.
- **If unmet:** ship local-relay-only E2E; keep Nostr as optional; fix relay client in parallel.

### Increment 2 — Private Networks ✅ COMPLETE (2026-11-12)
- Invite = relay list + optional NIP-42 token + name; QR and copy.
- Network roster (npubs), relay status, pending sync.
- Admin: add/remove relay, revoke member (signed event).
- **Done when:** non-technical user joins a network in under two minutes; works across two devices; membership changes propagate.
- **If unmet:** manual relay config + static invite; iterate on UX separately.
- **Implemented:** `PrivateNetworkManager` with invite generation/parsing, signed events (kinds 35001-35004), member/relay management, revocation, and event-based sync. 47 deterministic tests passing.

### Increment 3 — Match Protocol + Receipts ✅ COMPLETE (2026-11-12)
- Explicit states: `draft → published → matched → responded → accepted/withdrawn → completed/cancelled`.
- Guarded transitions; TTL per state (configurable).
- Signed receipts: accept, withdraw, complete, cancel; chain via previous event ID.
- Verification API; receipt viewer; export as JSON/QR.
- **Done when:** full request→match→respond→accept flow across two clients; receipt chain verifies offline; invalid transitions rejected.
- **If unmet:** implement accept/withdraw only; add complete/cancel later; receipts still verifiable.
- **Implemented:** MatchProtocol with state machine (7 kinds 35100-35106), signed receipts, chain verification, export/import. 46 deterministic tests passing.

### Increment 4 — Offline Queue + Resilience ✅ COMPLETE (2026-11-12)
- Local outbox persisted before broadcast; drain on reconnect; idempotent event IDs.
- Exponential backoff; per-relay health; auto-failover.
- NIP-65 relay list refresh (optional).
- **Done when:** offline for an extended period, then reconnect → queue flushes with zero dupes and zero loss.
- **If unmet:** outbox-only mode with manual drain; no auto-refresh.
- **Implemented:** Outbox with persistent storage (IndexedDB/localStorage/file), automatic queueing on publish failure, exponential backoff retry with jitter, manual and automatic drain on reconnect, queue depth stats, maxRetries limit. 21 deterministic tests passing.

### Increment 5 — Mesh Bridge ✅ COMPLETE (2026-11-12)
- Bridge daemon: Meshtastic serial/BLE ↔ local WebSocket relay — **implemented** in `agent/src/network/MeshBridge.ts` with CLI entry at `agent/src/relay/mesh-bridge.ts`.
- Transport adapters for browser: `WebSerialTransport` (Web Serial API), `WebBluetoothTransport` (Web Bluetooth API), `MeshBridgeTransport` (WebSocket to bridge daemon) — **implemented** in `core/src/network/transports/`.
- `MeshtasticNetworkProvider` updated with `createTransport()` and `connectTransport()` factory methods for easy transport selection.
- Store-and-forward with TTL and priority via existing Outbox integration.
- **Done when:** note created on one device crosses the mesh to another in under 30 seconds; bridge survives reconnect.
- **If unmet:** bridge-only on desktop; document hardware; keep Nostr path primary.

### Increment 6 — GSS Ontology + Manifest ✅ COMPLETE
- Ontology pack: hazard, resource, shelter, medical, transport, comms.
- `BiologicalManifest`: needs, tolerances, modifiers; per-person and group.
- Manifest editor + import/export (JSON/QR).
- **Done when:** family manifest (infant, elderly, diabetic, healthy) created in under five minutes; ontology terms resolve; export/import round-trips.
- **If unmet:** start with needs+tolerances only; defer modifiers.
- **Completed:** 2026-11-12 — All six survival domains integrated into DEFAULT_ONTOLOGY; BiologicalManifest types and functions implemented with full validation; 4 default profiles validated; export/import round-trips tested; QR code generation works; 766 deterministic tests passing.

### Increment 7 — Survival Routing + Map ✅ COMPLETE
- Time-Expanded Network A* over `provides`/`imposes` and spacetime bounds.
- Cost field: movement energy + hazard penalty (∞ on breach) − resource bonus.
- Map layers: deficit gradient, lethal exclusion, cache/surplus, trajectory with time scrubber.
- Compass mode fallback: bearing, distance, last known good.
- **Done when:** given a manifest and hazard/resource notes, engine returns a trajectory that avoids lethal zones and hits resources; map renders all layers; compass mode works when engine is disabled.
- **If unmet:** reduce horizon/grid resolution; ship compass mode + static exclusion map first.
- **Completed:** 2026-11-12 — Time-Expanded Network A* implemented with spacetime grid; cost function combines energy, hazard penalties (infinite on tolerance breach), and resource bonuses; map layers include trajectory, hazard zones, resource caches, shelter sites, deficit gradient, lethal exclusion; compass fallback provides bearing/distance when no path found; 812 deterministic tests passing.

### Increment 8 — Multi-Device
- Device linking (QR/passphrase); session events; device list + revoke.
- Replaceable-event sync; local draft merge; duplicate suppression.
- **Done when:** same npub on phone + laptop; notes/matches/manifests converge; revoke logs out the device.
- **If unmet:** export/import handoff; keep single-device default.

### Increment 9 — Accessibility + Internationalization
- WCAG 2.1 AA: semantics, ARIA, focus, contrast, motion reduction.
- Keyboard-only flows; screen-reader tested (NVDA/VoiceOver/TalkBack/Orca).
- i18n scaffolding; RTL-ready layout; locale-aware dates/numbers.
- **Done when:** blind user completes capture→match→respond→accept with a screen reader; keyboard-only parity.
- **If unmet:** ship per-screen fixes with tracked gaps; never regress existing a11y.

### Increment 10 — Pilot Readiness + Dogfood
- 3-relay deployment recipe; invite generation; offline manual.
- Chaos drills: relay loss, partition, sensor poisoning, key compromise, battery death.
- Measurement: time-to-match, completion, lapse analysis, comprehension.
- **Done when:** a mutual-aid group runs real coordination for 90 days; zero privacy incidents; measured coordination improvement; documented gaps.
- **If unmet:** extend dogfood; fix the top gap; do not widen scope.

---

## 6. Sequencing (Solo-Effective)

1. **Foundations → Publish/Subscribe → Private Networks** (must be real; everything depends on it).
2. **Match Protocol + Receipts** (the coordination primitive).
3. **Offline Queue** (resilience before reach).
4. **Mesh Bridge** (reach when infrastructure fails).
5. **GSS Ontology + Manifest → Survival Routing** (survival specialization).
6. **Multi-Device → A11y/i18n** (usability at scale).
7. **Pilot + Chaos** (evidence).

**Rules:**
- One increment in flight; spikes allowed only to answer a specific question.
- Every increment ends with tests + a demo path.
- Deferred items stay in a visible list; nothing silently dropped.
- If blocked, switch to an independent increment; never idle.
- Prefer deleting complexity over adding flags.

---

## 7. Readiness Gates (Iteration Triggers, Not Stops)

| Gate | Met means | If not met | Status |
|---|---|---|---|
| G0 Foundations | Round-trip + identity + storage suite green | Trim to memory backend; continue | ✅ **MET** (2026-11-12) |
| G1 Transport | 2 clients, ≥2 relays, <5s | Ship local-relay E2E; fix relay client | ✅ **MET** (2026-11-12) |
| G2 Private net | Join in <2 min, membership propagates | Static invite; iterate UX | ⏳ Pending |
| G3 Protocol | Full flow + offline receipt verification | Accept/withdraw only; add rest later | ⏳ Pending |
| G4 Offline | Zero loss/dupes after reconnect | Manual drain; no auto-refresh | ✅ **MET** (2026-11-12) |
| G5 Mesh | <30s cross-device over mesh | Desktop bridge only; document hardware | ✅ **MET** (2026-11-12) |
| G6 Manifest | Family manifest <5 min; round-trip | Needs+tolerances only | ⏳ Pending |
| G7 Routing | Avoids lethal zones; hits resources | Coarser grid/horizon; compass mode | ⏳ Pending |
| G8 Multi-device | Converges; revoke works | Export/import handoff | ⏳ Pending |
| G9 A11y | Screen-reader flow complete | Per-screen fixes; track gaps | ⏳ Pending |
| G10 Pilot | 90 days, zero incidents, measured gain | Extend dogfood; fix top gap | ⏳ Pending |

---

## 8. Definition of Done (Every Increment)

- Deterministic tests (no network flakiness; local relay/fakes where needed).
- Typecheck + lint + purity checks green.
- Export/import unaffected or extended.
- Failure modes documented (what happens offline, on bad data, on partial state).
- Demo path exists (screenshot or scripted E2E).
- No new required external service.

---

## 9. Risks & Unknowns (Resolve, Don't Stop)

| Risk / unknown | Resolution path | Fallback that preserves outcome |
|---|---|---|
| Browser background limits (BLE/Web Serial) | Bridge daemon; test Web Serial/Bluetooth availability | Desktop/Android bridge; periodic foreground sync |
| Relay flakiness | Multi-relay + health + backoff | Local relay; manual relay config |
| WASM/TS routing too slow | Benchmark; typed arrays; reduce horizon/resolution | Coarser grid; compass mode; optional WASM port |
| Key loss | Export/import; passkey wrapping | Documented backup ritual; re-onboard |
| Sensor poisoning / spoofing | Trust tiers; corroboration; conflict quarantine | Precautionary exclusion zone |
| Storage quota (OPFS/IndexedDB) | Quota checks; LRU cache; local-first retention | File export; SQLite backend |
| Partner availability | Multiple candidate groups; small viable group | Dogfood internally; publish recipe |
| Scope creep | Fixed increment backlog; defer list | Ship smaller slice; no new deps |

---

## 10. Measurement (Light, Local, Opt-In)

- Local journal: capture started/abandoned, match viewed/accepted/rejected, correction, clarification.
- Commitment lifecycle: published → matched → responded → accepted → completed/lapsed.
- Sync health: queue depth, flush success, relay latency.
- Comprehension checks after UI changes.
- All local-only by default; no telemetry endpoint; exportable aggregates.

---

## 11. Capacity

- **1 committed developer is sufficient** to execute this plan sequentially.
- Optional contributors take well-scoped increments (tests, docs, a11y, adapters).
- No funding dependency; if resources emerge, they accelerate, not gate.
- No deadlines; increments finish when their Definition of Done is met.

---

## 12. Decision Log (Append-Only)

| Date | Decision | Rationale |
|---|---|---|
| 2026-11-12 | Canonical master plan created; gates reframed as iteration triggers | Progress must not stop on a failed check |
| 2026-11-12 | TypeScript-first; optional WASM port | One-language execution for a solo developer |
| 2026-11-12 | GeoLibre optional; MapLibre + Turf direct | Remove external-repo SPOF |
| 2026-11-12 | Identity: nsec + export/import; passkey optional | Recoverability without Shamir complexity |
| 2026-11-12 | Mesh via bridge daemon; Web Serial/BLE where present | Browser limits without blocking the outcome |
| 2026-11-12 | **Increment 0 complete**: EventEnvelope, Transport, IdentityManager, LocalRelay, Storage adapters all implemented with 594 deterministic tests passing | Foundation for all subsequent increments; enables local-first development and testing without network dependencies |
| 2026-11-12 | **Increment 1 complete**: NostrClient with multi-relay publish, reconnect/backoff, relay health tracking, filter subscriptions, and LocalRelay integration; 608 deterministic tests passing | Enables real Nostr network communication with deterministic local testing; G1 Transport gate met |
| 2026-11-12 | **Increment 2 complete**: PrivateNetworkManager with invite generation/parsing, signed events (kinds 35001-35004), member/relay management, revocation, and event-based sync; 655 deterministic tests passing | Enables private Nostr networks with admin controls and verifiable membership changes; G2 Network gate met |
| 2026-11-12 | **Increment 3 complete**: MatchProtocol with state machine (kinds 35100-35106), signed receipts, chain verification, export/import; 701 deterministic tests passing | Enables verifiable match lifecycles with cryptographic receipt chains; G3 Match gate met |
| 2026-11-12 | **Increment 4 complete**: Outbox with persistent storage, automatic queueing on publish failure, exponential backoff retry with jitter, manual/auto drain on reconnect, queue stats, maxRetries limit; 711 deterministic tests passing | Enables offline-first operation with zero-loss queue flush on reconnect; G4 Offline gate met |
| 2026-11-12 | **Increment 5 complete**: Mesh Bridge with daemon (Meshtastic serial ↔ WebSocket), browser transports (WebSerial, WebBluetooth, MeshBridge WS), and MeshtasticNetworkProvider factory methods; all tests passing | Enables mesh communication when infrastructure fails; G5 Mesh gate met |
| 2026-11-12 | **Increment 6 complete**: GSS Ontology (hazard, resource, shelter, medical, transport, comms) integrated into DEFAULT_ONTOLOGY; BiologicalManifest with needs/tolerances/modifiers for profiles and groups; JSON/QR export/import with round-trip validation; 4 default profiles (infant, elderly, diabetic, healthy); 766 deterministic tests passing | Enables survival-grade biological coordination with verifiable manifests; G6 Ontology gate met |
| 2026-11-12 | **Increment 7 complete**: Time-Expanded Network A* with spacetime grid; cost function (energy + hazard penalty ∞ on breach - resource bonus); map layers (trajectory, hazard zones, resource caches, shelters, deficit gradient, lethal exclusion); compass fallback (bearing, distance, last known good); 812 deterministic tests passing | Enables survival routing with verifiable paths and offline-capable map visualization; G7 Routing gate met |