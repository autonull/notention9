# TODO.21 — Phase 1: Nostr Transport + Private Networks

**Role:** Detailed spec for Phase 1. Global principles, technology decisions, and later increments live in `TODO.22.md` (canonical master plan).

**Goal:** Real people coordinate through private Nostr networks. Works offline; no required service; no single point of failure.

**Rule:** No gate stops progress. An unmet criterion triggers focused iteration or a documented fallback — the phase continues.

---

## 1. Scope

### In
- Nostr transport: multi-relay WebSocket client, publish/subscribe, NIP-42 auth, reconnect/backoff.
- Local in-process relay for tests and offline demos.
- Identity: generate/import/export nsec/npub; encrypted at rest; unlock in memory.
- Event envelope + canonical serialization (JCS-JSON) → Nostr event.
- Note events (replaceable kinds), match events, response events, receipts.
- Private network: invite + relay list + optional auth; roster; member revoke.
- Offline outbox: persist before broadcast; drain on reconnect; idempotent IDs.
- UI: network picker, join/create, connection status, composer, match list, respond flow.

### Out (deferred, not abandoned)
- Mesh transport (Increment 5).
- GSS ontology/manifest/routing (Increments 6–7).
- Multi-device linking (Increment 8).
- Global Sybil resistance (private networks first).
- Semantic CRDT (append-only + replaceable events first).
- Formal verification (deterministic tests + receipts first).

---

## 2. Work Items

### 2.1 Event Envelope + Serialization
- `Envelope` fields: `protocolVersion`, `kind`, `tags`, `content`, `created_at`, `pubkey`, `id`, `sig`.
- JCS-JSON canonicalization; deterministic ID = hash of canonical event per Nostr.
- Test vectors for serialization and ID stability.
- **Done when:** identical inputs produce identical IDs; verify signature round-trips.

### 2.2 Identity
- Generate secp256k1 keypair; derive nsec/npub.
- Encrypt nsec at rest with passphrase-derived key; unlock in memory only.
- Export/import nsec/npub; export/import full state.
- **Done when:** lock/unlock; export/import restores identity; wrong passphrase fails safely.

### 2.3 Transport Interface + Local Relay
- `Transport`: `publish(event)`, `subscribe(filters, handler)`, `status()`.
- In-process relay implementation: store, filter, deliver.
- Memory and file-backed storage adapters pass the same suite.
- **Done when:** two clients exchange events via local relay deterministically in tests.

### 2.4 Nostr Relay Client
- WebSocket connect, NIP-42 auth, REQ/EVENT/CLOSE, EOSE.
- Reconnect with exponential backoff; per-relay health.
- Multi-relay publish; dedupe on ingest by event ID.
- **Done when:** two independent clients exchange notes through ≥2 relays in under 5 seconds; reconnect recovers.
- **Fallback:** local-relay-only E2E; Nostr remains optional.

### 2.5 Event Schemas
- `NoteEvent`: replaceable kind + `d` tag = note ID; content = canonical note JSON.
- `MatchEvent`: `e` tags to notes; explanation in content.
- `ResponseEvent`: references match; accept/withdraw.
- `ReceiptEvent`: references response; signed action + timestamp + previous event ID.
- **Done when:** each schema round-trips; filters select correctly; invalid references rejected.

### 2.6 Private Networks
- Invite: relay list + optional NIP-42 token + name; QR and copy.
- Join: validate relays, authenticate, fetch roster.
- Roster: npubs, relay status, pending sync.
- Admin: add/remove relay; revoke member (signed event).
- **Done when:** a user joins in under two minutes; membership changes propagate across clients.
- **Fallback:** manual relay config + static invite.

### 2.7 Offline Outbox
- Persist outbound events before broadcast; mark synced after relay ack or timeout policy.
- Drain on reconnect; dedupe by event ID; preserve order per author.
- UI: pending count; sync status.
- **Done when:** offline → reconnect → queue flushes with zero dupes and zero loss.
- **Fallback:** manual drain; no automatic refresh.

### 2.8 UI Flows
- Network picker; create/join; connection status; relay health.
- Composer publishes note; match list shows remote matches with explanation.
- Respond dialog publishes response; receipt viewer verifies chain.
- **Done when:** capture→publish→match→respond→accept completes in the browser across two instances.

---

## 3. Acceptance (Definition of Done)

- Deterministic tests for serialization, identity, transport, schemas, outbox.
- Two-client E2E over ≥2 relays (or local relay fallback).
- Full match flow with verifiable receipt chain.
- Offline reconnect with zero loss/dupes.
- Private network join in under two minutes.
- Typecheck + lint + purity green.
- Export/import covers identity, notes, ontology, receipts.

---

## 4. Fallbacks (Keep Moving)

| If blocked by | Do this | Outcome preserved |
|---|---|---|
| Relay availability | Local relay + file transport | E2E works; Nostr optional |
| NIP-42 gaps | Static invite + relay allowlist | Private scope works |
| NIP-44 lib issues | NIP-04 fallback behind `Cipher` | Sealed messages work |
| Storage backend limits | Memory + file adapter | Tests and desktop work |
| Browser quota | Export/import + LRU cache | No data loss |
| UI complexity | CLI/scripted E2E first | Protocol proven before polish |

---

## 5. Interfaces (Stable Contracts)

```ts
interface Transport {
  publish(event: SignedEvent): Promise<void>;
  subscribe(filters: Filter[], handler: (e: SignedEvent) => void): () => void;
  status(): TransportStatus;
}

interface Store {
  put(event: SignedEvent): Promise<void>;
  get(id: string): Promise<SignedEvent | undefined>;
  query(filter: Filter): Promise<SignedEvent[]>;
  iterate(): AsyncIterable<SignedEvent>;
}

interface Cipher {
  encrypt(plaintext: string, recipient: string): Promise<string>;
  decrypt(ciphertext: string, sender: string): Promise<string>;
}
```

All third-party libs (`nostr-tools`, crypto, storage) stay behind these interfaces so implementations can be swapped without touching features.

---

## 6. Notes

- Prefer multiple relay implementations (strfry, nostr-rs-relay, local) rather than one.
- Keep event IDs content-addressed so dedupe is exact.
- Treat relay auth as optional capability; never require it for local networks.
- No deadlines; finish when the Definition of Done holds.