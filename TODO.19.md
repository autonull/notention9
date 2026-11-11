By excluding iOS and other uncooperative proprietary platforms, you eliminate the single largest barrier to "civilization-scale" decentralized applications: the inability to perform reliable background execution, the restrictions on P2P networking (NAT traversal/WebRTC), and the opaque App Store review processes. 

With the open web, Android, and Linux desktop environments as your targets, the critical path outlined in **TODO.18** transitions from a "5–8 year research problem" into a **12–18 month engineering execution plan**. 

Here is the architectural blueprint to achieve the critical path functionality (T1 $\rightarrow$ T5) using battle-tested, local-first, and decentralized primitives.

---

### 1. The Paradigm Shift: Local-First & Event Sourcing
The core realization is that Notention is not a traditional client-server application; it is a **Local-First Semantic Protocol**. 
*   **The Local Device (SQLite) is the Source of Truth:** The app must work perfectly with zero network connectivity.
*   **The Network is a Sync Mechanism:** The network does not hold "state"; it merely transports an append-only log of cryptographically signed events. 

### 2. Executing the Critical Path (T1 $\rightarrow$ T5)

#### **T1: Network Publication (Transport Agnosticism)**
*   **The Problem:** No single transport (Mesh, Nostr, libp2p) solves all coordination scenarios.
*   **The Solution:** Implement a **Transport-Agnostic Interface (TAI)** in the core engine. The matching engine and state machine should never know *how* a message was delivered.
*   **The Stack:** 
    *   **Global/Async:** Use **Nostr** (via NDK) as the primary pub/sub bus. It natively solves censorship resistance, partition tolerance, and offline-first async messaging via relays [[1]].
    *   **Local/Proximity:** Use **Libp2p** (GossipSub) for local mesh networking when internet infrastructure is down.
*   **Implementation:** The core engine generates canonical, signed events. The `NetworkProvider` simply broadcasts these bytes to the configured transport.

#### **T2: Trustworthy Coordination (Identity & Sybil Resistance)**
*   **The Problem:** Key management is the "graveyard of dApps," and Sybil resistance without tokens is difficult.
*   **The Solution:** **Device-Bound Identity & Social Trust.**
*   **The Stack:** 
    *   **Identity:** Use **WebAuthn / Passkeys** to generate and store Ed25519 keypairs in the device’s hardware enclave (TPM on Linux, StrongBox on Android). This removes the burden of seed-phrase management from the user.
    *   **Sybil Resistance:** Implement a **Web of Trust (WoT)** based on Nostr social graphs. Your device only automatically syncs and matches with notes signed by keys in your 2nd-degree network. For public broadcasts, require a lightweight **Hashcash (Proof-of-Work)** stamp to make bot-spam economically unviable without burning mobile batteries.

#### **T3 & T4: Data Integrity & Protocol Completeness**
*   **The Problem:** "Rich document CRDT is unsolved," and the current `status` field lacks transition guarantees.
*   **The Solution:** **Semantic CRDTs + Actor State Machines.**
*   **The Stack:**
    *   **Data Integrity:** You do not need to sync a rich-text editor like Notion. You only need to sync the **structured semantic properties** (the ontology from TODO.17: budget, skills, markers, quantities). **Automerge** is a JSON-like CRDT that handles arbitrarily nested structured data perfectly and merges automatically without conflict [[18], [21]]. The "human-readable description" can simply be an immutable string or an append-only log, sidestepping the "unsolved rich-text" problem entirely.
    *   **Protocol Completeness:** Use **XState** to define the protocol's Finite State Machine (FSM). A state transition (e.g., `open` $\rightarrow$ `matched` $\rightarrow$ `accepted`) is an *event* that must be cryptographically signed by the authorized party. The local database simply reduces these signed events into the current state. Invalid transitions are rejected by the reducer.
    *   **Encoding:** Use **CBOR** with a strict CDDL schema to ensure deterministic hashing before signing.

#### **T5: Production Readiness (Scale, Offline-First, Multi-Device)**
*   **The Problem:** Supporting 10k+ nodes, offline-first, and multi-device sync.
*   **The Solution:** **Local-First Sync Engines.**
*   **The Stack:** Use a Postgres-to-SQLite sync layer like **ElectricSQL** [[1], [3]] or **PowerSync** [[10], [11]]. These engines sync subsets of data (Shapes) to a local SQLite database, resulting in near-zero latency reads and automatic multi-device merge [[12], [15]].
*   **Scale:** 10k+ nodes is trivial because the heavy lifting is done by standard Nostr relays and local SQLite queries. Clients only subscribe to topics (tags) relevant to their current context (e.g., `#skill=React`, `#location=Berlin`).
*   **Multi-Device:** Two devices logged into the same identity simply subscribe to the same event stream. The CRDT and Event Sourcing handle the merge automatically.

#### **T6: Editor & Capture Polish (Mobile-First without iOS)**
*   **The Problem:** Desktop-first capture is a death sentence; coordination happens on mobile.
*   **The Solution:** **Native Android & PWA.**
*   **The Advantage:** By excluding iOS, you can utilize Android’s **WorkManager** and **Foreground Services** to perform true, reliable background syncing and push notifications without Apple's arbitrary limits. 
*   **AI Capture:** Run lightweight local LLMs (e.g., via WebLLM or MediaPipe) to extract semantic properties (`budget`, `skill`, `location`) from natural language voice notes directly on the device, feeding the `PropertyExtractor` defined in TODO.17.

---

### 3. The Execution Reality: How a Match Actually Happens
1.  **Capture:** Stranger A (offline on Android) speaks a request. The local LLM extracts properties. Automerge updates the local state. XState transitions it to `open`. The event is signed and queued.
2.  **Sync:** When connectivity returns, the Nostr provider broadcasts the signed event.
3.  **Discovery:** Stranger B's device receives it. The local SQLite database matches it against B's `offer` using the fixed `MatchEngine` (with dimensional typing and roles from TODO.17).
4.  **Action:** B clicks "Respond." A signed `response` event is generated and broadcast.
5.  **Verification:** Both devices reduce the events. The match is verified via cryptographic receipts, accessible to screen readers (A11y), and synced to B's desktop device via PowerSync/ElectricSQL.

### Summary
By treating Notention as a **Local-First Semantic Protocol** rather than a traditional web app, you leverage existing solutions for the hardest problems:
*   **Automerge** solves Data Integrity (T3).
*   **XState + Event Sourcing** solves Protocol Completeness (T4).
*   **ElectricSQL/PowerSync** solves Multi-Device/Scale (T5).
*   **Nostr + WebAuthn** solves Transport and Trust (T1, T2).

This architecture fulfills the "Civilization-Scale" definition of done in TODO.18 while remaining entirely within the realm of current, open-source engineering capabilities.

