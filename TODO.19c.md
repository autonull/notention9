### The Notention Protocol: Pure-TypeScript Architecture

To achieve the "civilization-scale" ambitions of **TODO.18** while adhering to the rigorous constraints of **TODO.17**, we must abandon traditional client-server paradigms. By excluding iOS and Proof-of-Work, and mandating a **100% TypeScript** stack, we transition Notention from a "web app" to a **Local-First Semantic Protocol**.

This architecture guarantees absolute feasibility for a small team (1-3 engineers) within a 12-month window by leveraging battle-tested, composable TypeScript primitives.

---

### 1. The Pure-TypeScript Stack
Every layer of the application, from the cryptographic primitives to the UI, is written in TypeScript. This ensures type safety from the database schema to the pixel on the screen.

| Domain | Technology | Why it ensures feasibility |
| :--- | :--- | :--- |
| **Core Logic & Validation** | **Zod** | Runtime schema validation for the ontology. Prevents malformed data from entering the matching engine. |
| **State Machine (Protocol)** | **XState** | Mathematically guarantees protocol completeness. Invalid state transitions (e.g., `Accepted` $\rightarrow$ `Open`) are rejected at runtime [[21], [24]]. |
| **Local Database & Sync** | **RxDB** | Pure TS, offline-first database. Natively supports **Nostr signaling for WebRTC P2P replication** [[2], [4]]. |
| **Semantic CRDT** | **Automerge** | Handles the merging of complex, nested JSON objects (the "properties" of a Note) without conflict [[12], [18]]. |
| **Cryptography** | **`@noble/curves`** | Pure TS, audited cryptographic primitives (Ed25519, Secp256k1) used by Nostr and Ethereum. |
| **Identity (Auth)** | **WebAuthn / Passkeys** | Via `@simplewebauthn`. Secures keys in the Android/Linux hardware enclave without seed phrases. |
| **Encoding** | **CBOR-X** | Deterministic binary encoding required for consistent cryptographic signing across all devices. |
| **Networking** | **Nostr-Tools** | The universal, partition-tolerant pub/sub bus for asynchronous coordination. |
| **Application Shell** | **Expo (React Native)** | Targets Android and Desktop/Web. Avoids iOS background execution limits. |

---

### 2. Solving the "Killers" (Feasibility Matrix)

#### **A. Sybil Resistance (Without Proof-of-Work)**
Instead of burning battery with Hashcash, we implement a **Web of Trust (WoT) + Invite Tree** model.
*   **The Mechanism:** The app filters incoming network events based on the Nostr social graph. You only automatically process and match against events signed by keys in your **2nd-degree trust network** (people you follow, and people they follow).
*   **Bootstrapping:** For users outside the graph, we use **Invite Trees** (similar to Farcaster/Bluesky). Every new user must be invited by an existing trusted user. If User B spams, User A can revoke the invite, instantly ejecting User B from the trusted network. This is economically and socially resistant to Sybil attacks without requiring tokens or PoW.

#### **B. Protocol Completeness (T4)**
The current "string enum" status field is replaced by an **Event-Sourced State Machine**.
*   **The Mechanism:** The database *never* stores the current status directly. It stores an append-only log of signed events: `[{ type: 'PUBLISH', sig: '...' }, { type: 'MATCH', sig: '...' }]`.
*   **The Engine:** The **XState** machine acts as the "reducer." When an event arrives, XState checks if the transition is valid. If a malicious node sends a `RESPOND` event without a preceding `MATCH` event, XState rejects it. This provides formal verification of the protocol logic in pure TS.

#### **C. Transport Fragmentation (T1)**
Notention is transport-agnostic. The core engine outputs canonical, signed CBOR events.
*   **The Mechanism:** RxDB handles local storage and provides a **Replication API**. We use the `rxdb/plugins/replication-webrtc` plugin, which natively supports **Nostr relays for signaling** to establish P2P connections [[6], [8]]. If WebRTC fails (strict NAT), it falls back to Nostr's async event broadcast.

#### **D. Rich Document CRDT (T3)**
We do not attempt to build a "Notion-like" rich text editor, which is a known research trap.
*   **The Mechanism:** The "Description" of a note is a simple, immutable string or an append-only log. The **Automerge** CRDT is used exclusively for the **Semantic Properties** (budget, skills, location, quantities) [[18]]. Automerge handles the merging of these structured objects flawlessly, ensuring two devices can update a `budget` concurrently without data loss.

---

### 3. The Core Engine Design: How a Match Works

This is the implementation of the **TODO.17** "Center" fixes, powered by the **TODO.18** decentralized architecture.

#### **Step 1: Dimensional Typing & Extraction**
When a user creates a Request, the **Property Extractor** (using local LLMs or regex) outputs a **Zod-validated** object.
```typescript
// The Quantity interface prevents dimensional mismatch errors
interface Quantity {
  value: number;
  numerator: string[]; // e.g., ['USD']
  denominator: string[]; // e.g., ['h'] for rate, [] for budget
}

const NoteSchema = z.object({
  intent: z.enum(['request', 'offer']), // Role: Marker (Excluded from scoring)
  status: z.enum(['draft', 'open', 'matched']), // Role: Marker
  properties: z.record(z.string(), z.union([z.string(), z.number(), QuantitySchema]))
});
```
*   **The Fix:** The `MatchEngine` calculates the score using only `constraint` properties. If it compares `budget` (USD) to `rate` (USD/h), the `numerator/denominator` arrays mismatch, and the engine explicitly returns `incomparable` rather than a silent 0.0.

#### **Step 2: Event Sourcing & Signing**
When the user clicks "Publish," the app does not just update a local DB row.
1.  It generates a `PUBLISH` event containing the Zod-validated payload.
2.  It hashes the payload using **CBOR-X**.
3.  It signs the hash using **`@noble/curves`** (Ed25519).
4.  It appends the event to the local **RxDB** store and pushes it to the **Nostr Network Provider**.

#### **Step 3: P2P Discovery & Matching**
Stranger B's device receives the event via Nostr or WebRTC [[1]].
1.  **Verification:** The device verifies the signature.
2.  **Trust Filter:** It checks if Stranger A is in B's Web of Trust.
3.  **Local Match:** The local **MatchEngine** compares the signed payload against B's local `offer` notes.
4.  **Action:** If B clicks "Respond," B's device generates a `RESPOND` event, signs it, and broadcasts it.
5.  **Resolution:** Both devices receive the `RESPOND` event. XState transitions both notes to `matched`.

---

### 4. The 12-Month Execution Plan

#### **Phase 1: The Semantic Core (Months 1-3)**
*   **Goal:** Prove the "Center" works in isolation.
*   **Tasks:**
    *   Implement the `MatchEngine` with dimensional typing and role-based scoring (TODO.17 Track A & B).
    *   Define the **Zod** schemas for the ontology.
    *   Build the **XState** machine for the Note lifecycle.
    *   **Deliverable:** A CLI tool where two users can pipe notes into the engine and get a verified match.

#### **Phase 2: Local-First Storage & UI (Months 4-6)**
*   **Goal:** A working, offline-first Android app.
*   **Tasks:**
    *   Integrate **RxDB** and **Automerge** for local persistence.
    *   Build the **Expo (React Native)** UI for Android.
    *   Implement **WebAuthn** for key management (Passkeys).
    *   **Deliverable:** A user can create, edit, and view notes offline. Multi-device sync works via local Wi-Fi.

#### **Phase 3: The Decentralized Sync Layer (Months 7-9)**
*   **Goal:** Survive partitions and censorship.
*   **Tasks:**
    *   Implement the **Nostr replication plugin** for RxDB [[2], [6]].
    *   Implement the **Web of Trust** filtering logic.
    *   Handle NAT traversal via WebRTC signaling over Nostr.
    *   **Deliverable:** Two users on different networks (one offline for hours) can sync and match upon reconnection.

#### **Phase 4: Production Polish & A11y (Months 10-12)**
*   **Goal:** "Civilization-Scale" readiness.
*   **Tasks:**
    *   Optimize Android background execution (WorkManager) for reliable sync.
    *   Implement screen reader optimizations (A11y) for the matching dashboard.
    *   Load test the Nostr relay integration with 10k+ simulated nodes.
    *   **Deliverable:** The Definition of Done is met.

---

### 5. The Definition of Done (Refined)

> **A stranger on Device A (Android, offline for 6h) speaks a request. The local LLM extracts semantic properties, and the event is signed and queued. Upon reconnection, the Nostr provider broadcasts the event. A stranger on Device B (Linux Desktop, behind firewall) receives it via Nostr/WebRTC signaling [[6]]. The local MatchEngine verifies the signature, checks the Web of Trust, and compares the dimensional quantities. B clicks "Respond," generating a signed event. Both devices reduce the event log via XState, resulting in a verifiable, cryptographic match visible to both, accessible via screen readers, with zero data loss.**

This plan is not a research proposal; it is an assembly of existing, high-quality TypeScript primitives configured to solve the specific coordination problems identified in your TODOs.

