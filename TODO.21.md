# TODO.21 — Nostr Transport + Private Network Usability

**Goal:** Ship a working Nostr transport so real people can coordinate in private networks (implicit trust) → the bridge to stranger coordination.

**Philosophy:** No shortcuts. No "mock transport." No "protocol later." Every piece must be production-grade for the scope it covers.

---

## 1. Scope & Non-Goals

### In Scope (Private Network MVP)
- **Nostr transport** — publish/subscribe via relays, NIP-01 events, NIP-65 relay lists
- **Identity** — Nostr keypair (secp256k1), nsec/npub, stored encrypted at rest
- **Event schema** — Canonical JCS-JSON → Nostr event (kind 30000-39999 parameterized replaceable)
- **Match protocol** — Minimal state machine: `published` → `matched` → `responded` → `accepted`/`withdrawn`
- **Attestation** — Signed receipts for `accepted`/`withdrawn`; verifiable by any party
- **Private network UX** — Relay set configured per network; invite code = relay list + optional auth
- **Offline queue** — Local-first: write to SQLite, broadcast when online; dedup on reconnect
- **Basic UI** — Network picker, connection status, note list, match view, respond flow

### Out of Scope (Explicit Deferred)
- Meshtastic / libp2p transports
- Sybil resistance (PoW, WoT, invite trees)
- Rich-text CRDT / semantic merge
- Multi-device sync (same identity on phone + laptop)
- Key rotation / revocation / social recovery
- Formal TLA+ verification (protocol is simple enough to review by inspection)
- iOS background execution (PWA + service worker; accept limitations)
- 10k-note scale (target: 500 notes, 50 concurrent users per network)

---

## 2. Architecture Decisions (Locked)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Transport | **Nostr only** | Single transport eliminates abstraction leaks; relays are commodity infrastructure |
| 2 | Event kind | **30000-39999 (parameterized replaceable)** | Standard Nostr; enables relay-side filtering; replaceable = latest state wins |
| 3 | Canonical form | **JCS-JSON** | Already in core; deterministic hashing for signatures |
| 4 | Identity storage | **Encrypted nsec in localForage (Web) / SQLite (Native)** | Passphrase-derived key (PBKDF2); no seed phrases in v1 |
| 5 | Relay discovery | **NIP-65 relay list (kind 10002)** | User publishes their relay list; others fetch it |
| 6 | Private network | **Invite = relay list URL + optional NIP-42 auth** | Simple, standard, works with any Nostr relay |
| 7 | Match protocol | **Explicit state machine in code + signed transitions** | Verifiable receipts; no "status string" anarchy |
| 8 | Offline queue | **SQLite (opfs) + background sync** | Local-first; survives browser restart; dedup by event ID |
| 9 | Encryption | **NIP-04 (legacy) + NIP-44 (v2)** | NIP-44 for new; NIP-04 for compat; both use secp255k1 shared secret |
| 10 | UI framework | **Existing React/Tiptap stack** | No rewrite; extend current components |

---

## 3. Execution Plan (Phased, Gates Are Law)

### Phase 0: Foundation (1-2 weeks)
**Gate:** `pnpm typecheck && pnpm test && pnpm verify` green

1. **Nostr crypto primitives** (`core/src/nostr/`)
   - `keypair.ts` — generate/import/export nsec/npub; sign/verify (secp256k1 via @noble/secp256k1)
   - `nip44.ts` — encrypt/decrypt (audited impl, no custom crypto)
   - `event.ts` — build Nostr event (kind, tags, content, sig); verify signature
   - `relay.ts` — WebSocket client: connect, auth (NIP-42), sub, publish, reconnect/backoff

2. **Identity manager** (`core/src/identity/`)
   - `loadOrCreateIdentity(passphrase)` → `{npub, encryptedNsec}`
   - `unlockIdentity(encryptedNsec, passphrase)` → keypair (in memory only)
   - `rotateIdentity(oldPassphrase, newPassphrase)` — re-encrypt nsec

3. **Local event store** (`core/src/store/`)
   - SQLite schema: `events(id, kind, pubkey, content, tags, sig, created_at, synced)`
   - Indexes: `pubkey+kind`, `created_at`, `synced`
   - `appendEvent()`, `getUnsynced()`, `markSynced(ids)`, `getByFilter(filter)`

### Phase 1: Transport + Publish/Subscribe (2-3 weeks)
**Gate:** End-to-end: create note → publishes to relay → appears on second client

1. **NetworkProvider implementation** (`core/src/network/NostrProvider.ts`)
   - `publish(event)` → sign → write local → broadcast to relays → await ack
   - `subscribe(filter, handler)` → NIP-01 REQ → handler(event) per event
   - `fetchRelayList(pubkey)` → kind 10002 → parse relay URLs
   - Connection state machine: `disconnected` → `connecting` → `connected` → `authenticating` → `ready`

2. **Event schema** (`core/src/protocol/`)
   - `NoteEvent` — kind 30000 + `d` tag = note ID; content = JCS-JSON note
   - `MatchEvent` — kind 30001 + `d` tag = match ID; `e` tags = note refs; content = match proof
   - `ResponseEvent` — kind 30002; `e` tag = match ID; content = response (accept/withdraw)
   - `ReceiptEvent` — kind 30003; `e` tag = response ID; content = signed receipt

3. **Matcher integration** (`core/src/matching/`)
   - Subscribe to `kind:30000` from followed pubkeys (NIP-65 relay list)
   - Run local `MatchEngine` on received notes
   - Publish `MatchEvent` (kind 30001) when score > threshold

### Phase 2: Match Protocol + Attestation (2-3 weeks)
**Gate:** A → publishes request; B → sees match → responds → A sees accepted + verifiable receipt

1. **State machine** (`core/src/protocol/stateMachine.ts`)
   ```
   Request: draft → published → matched → responded → accepted/withdrawn → completed/cancelled
   Offer:   draft → published → matched → responded → accepted/withdrawn → completed/cancelled
   ```
   - Guards: only requester can `accept`; only matched party can `respond`
   - TTL: `matched` expires 72h; `responded` expires 24h (configurable)
   - Every transition = signed event + local store append

2. **Receipts** (`core/src/protocol/receipts.ts`)
   - `AcceptReceipt` — signed by requester over `{matchId, responseId, timestamp, action: "accept"}`
   - `WithdrawReceipt` — signed by responder over `{matchId, responseId, timestamp, action: "withdraw"}`
   - Verification: `verifyReceipt(receipt, requesterPubkey)` → boolean

3. **Private network UX** (`ui/src/features/network/`)
   - `NetworkPicker` — list configured networks; "Join Network" → paste invite URL
   - `InviteGenerator` — "Create Private Network" → spins up 2-3 relays (Docker) or uses public relays + NIP-42 auth
   - Invite format: `nostr+invite://<relay1>,<relay2>?auth=<nip42-challenge>` (QR + copy)

### Phase 3: Offline-First + Polish (2-3 weeks)
**Gate:** Kill browser → reopen → queue flushes → match completes

1. **Offline queue** (`core/src/network/OfflineQueue.ts`)
   - Persist outbound events to SQLite before broadcast
   - On reconnect: drain queue → dedup by event ID → broadcast
   - UI indicator: "X pending" badge; sync progress

2. **Connection resilience**
   - Exponential backoff (1s, 2s, 4s, 8s, max 60s)
   - Relay health tracking: latency, success rate, auto-failover
   - NIP-65 relay list auto-refresh (every 5 min)

3. **UI flows** (`ui/src/`)
   - Note composer → publishes via NostrProvider
   - Match list → shows remote matches with explanation
   - Respond dialog → publishes ResponseEvent → shows receipt
   - Network status: connected relays, pending count, last sync

### Phase 4: Dogfood + Hardening (2 weeks)
**Gate:** 2+ people use it for real coordination for 1 week; zero data loss

1. **Private network deployment**
   - Docker Compose: 3x strfry relays + nginx + Let's Encrypt
   - Invite generator creates auth tokens (NIP-42)
   - Document: "Run your own in 5 minutes"

2. **Stress & edge cases**
   - 500 notes, 50 users, 3 relays — measure latency, memory
   - Network partition: offline 1h → reconnect → verify no dupes, no loss
   - Conflicting edits: same note edited on 2 devices → last-write-wins (replaceable event)
   - Malformed events: relay sends garbage → client handles gracefully

3. **Observability**
   - Structured logs: `event_published`, `event_received`, `match_found`, `receipt_verified`
   - Local metrics: sync latency, queue depth, match precision/recall

---

## 4. Definition of Done (Per Phase)

| Phase | Must Pass |
|-------|-----------|
| 0 | `pnpm test` — crypto roundtrip, identity lock/unlock, event store CRUD |
| 1 | `pnpm test:e2e` — Client A publishes → Client B receives (2 relays, 1 network) |
| 2 | `pnpm test:e2e` — Full match: request → match → respond → accept → receipt verified |
| 3 | `pnpm test:e2e` — Offline 10 min → online → queue flushes → match completes |
| 4 | **Dogfood:** 2 users, 1 week, real coordination tasks; postmortem = zero critical bugs |

---

## 5. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Nostr relay flakiness | High | Medium | Multi-relay publish; health tracking; user-visible status |
| NIP-44 impl bugs | Low | High | Use audited `@noble/nip44`; test vectors from spec |
| Event dedup failure | Medium | High | Deterministic event ID (sha256 of serialized event); SQLite UNIQUE constraint |
| Private network invite UX | Medium | Medium | QR code + copy-paste; test with non-technical users |
| Browser SQLite (OPFS) limits | Low | Medium | Fallback to IndexedDB; test Safari/Firefox/Chrome |
| Scope creep | Certain | Fatal | **Kill criteria are law.** No "nice to have" in Phases 0-3. |

---

## 6. Team & Timeline (No Shortcuts)

| Role | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|------|---------|---------|---------|---------|---------|
| Core (crypto, store, transport) | 1 dev | 1 dev | 0.5 dev | 0.5 dev | 0.5 dev |
| Protocol (events, state machine, receipts) | 0.5 dev | 1 dev | 1 dev | 0.5 dev | 0.5 dev |
| UI (network picker, composer, match view) | 0 | 0.5 dev | 1 dev | 1 dev | 0.5 dev |
| DevOps (relay deploy, invite gen) | 0 | 0.5 dev | 0.5 dev | 0.5 dev | 1 dev |
| **Total** | **1.5 dev** | **3 dev** | **3 dev** | **2.5 dev** | **2.5 dev** |

**Solo estimate:** 10-14 weeks (2.5-3.5 months)  
**2-person team:** 6-8 weeks  
**3-person team:** 4-6 weeks

---

## 7. Success Metrics (Post-Launch)

| Metric | Target |
|--------|--------|
| Time to first match (cold start) | < 30 seconds |
| Sync latency (P95) | < 2 seconds |
| Offline queue flush success rate | 100% |
| Receipt verification success rate | 100% |
| User-reported "it just works" | ≥ 4/5 |
| Zero data loss in dogfood | Required |

---

## 8. Next Steps After TODO.21 → See TODO.22.md

| Phase | Focus | Trigger |
|-------|-------|---------|
| **TODO.22** | Trust + Attestation + Mesh Hardening | Private networks work; need key rotation, receipts, WoT, 24h mesh |
| **TODO.23** | GSS Ontology + Manifest + Survival Routing | Trust works; need survival specialization |
| **TODO.24** | Multi-Device + Offline-First Hardening | Survival routing works; need phone+laptop, 72h offline, a11y |
| **TODO.25** | Pilot Deployment + Chaos Hardening | All above work; need real community, 90 days, measurable improvement |

**Total path: ~38-50 weeks (2-person team).** Solo: 18-24 months.
**Architecture locked.** Kill criteria are law. No scope creep.

---

**This plan delivers: Real people, private networks, implicit trust, working coordination. No theater. No mocks. No "later."**