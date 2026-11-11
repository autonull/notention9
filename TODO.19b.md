### TODO.19: The Execution Blueprint (Absolute Feasibility Specification)

**Status:** ACTIVE MASTER PLAN
**Supersedes:** TODO.18 (Research Phase)
**Objective:** Deliver the "Civilization-Scale" coordination loop in **<6 months** by ruthlessly eliminating research-grade complexity in favor of battle-tested, composable protocols.

---

#### 1. The Architectural Pivot
To ensure absolute feasibility, we must shift the paradigm from **"Building a Decentralized Network"** to **"Building a Local-First Protocol on Existing Rails."**

*   **Ditch Custom P2P Routing:** We will not build custom mesh networking or NAT traversal (libp2p). We standardize 100% on **Nostr** as the decentralized transport layer. It already solves censorship resistance, offline queueing, and pub/sub discovery.
*   **Ditch CRDTs for Structured Data:** We will not use Automerge for the high-velocity semantic matching data (Request/Offer notes). We use **Event Sourcing with Addressable Events**. Automerge is reserved *strictly* for the final, unstructured "Match Contract" text.
*   **Ditch Centralized Sync Layers:** We will not use ElectricSQL or PowerSync (which require a central Postgres instance). The local **SQLite** database is the absolute source of truth, synchronized via a lightweight event reducer.
*   **Target Stack:** **Tauri 2.0** (Rust backend, Web frontend) for Desktop (Linux/Win/Mac) and **Android**. (iOS is excluded to bypass background execution restrictions).

---

#### 2. Core Specifications & Implementation

##### **A. The Semantic Core (Frozen from TODO.17)**
The matching engine is the product's soul. It remains exactly as specified in TODO.17, now fully integrated into the local storage layer.
*   **Property Roles:** `constraint` | `fact` | `marker`. (e.g., `intent` and `status` are markers, not constraints).
*   **Dimensional Math:** Strict unit-aware comparison (`compareQuantities`). `800 USD` vs `50 USD/h` must resolve to "Incomparable" or derive a rate via `createCompoundQuantity`.
*   **Canonical Keys:** The ontology enforces one key per concept (e.g., `rate`), eliminating alias lookups in the matcher.

##### **B. Identity & Trust (The "Graveyard" Solution)**
*   **Key Management:** Standard **BIP39 Seed Phrase** generation.
*   **Local Unlock:** Use **WebAuthn / Passkeys** to encrypt the local SQLite database key. This removes the burden of typing seed phrases on mobile devices while keeping keys secure in the hardware enclave.
*   **Sybil Resistance:** Leverage **Nostr Web-of-Trust (NIP-02)**. By default, clients only sync and match with notes signed by keys in the user's 2-hop social graph. Public discovery requires **NIP-13 Proof-of-Work** to prevent spam.

##### **C. Transport & Sync (The Nostr Standard)**
Instead of a custom network provider, we map Notention concepts directly to Nostr NIPs:
*   **Single-Author Notes (Requests/Offers):** Mapped to **NIP-01 Addressable Events** (formerly NIP-33) [[10]].
    *   *Kind:* Custom (e.g., `30079`).
    *   *Identifier (`d` tag):* The Note UUID.
    *   *Content:* CBOR-encoded semantic properties.
    *   *Tags:* Indexable filters (e.g., `['t', 'skill:react']`, `['p', 'budget:800-1200']`).
    *   *Update Mechanism:* Publishing a new event with the same `d` tag automatically replaces the old one on relays. This provides **Last-Writer-Wins (LWW)** state management without complex CRDTs [[12]].
*   **The Handshake (Contracts):** When two parties match, they create a shared **Automerge** document. This document is synced via **NIP-44 (Versioned Encrypted Direct Messages)**.

##### **D. The Local Vault (Storage)**
*   **Database:** SQLite (via `sqlite3` or `sql.js`).
*   **Architecture:** Event Sourcing. The app stores the raw signed events in an `events` table and maintains a `notes` materialized view (the reduced state).
*   **Sync Engine:** A background Rust worker (via Tauri) that subscribes to relevant Nostr tags, verifies signatures, and pipes valid events into the SQLite reducer.

---

#### 3. The 16-Week Execution Roadmap

| Phase | Focus | Key Deliverables | Feasibility Check |
| :--- | :--- | :--- | :--- |
| **1 (Wk 1-4)** | **Core & Vault** | - Implement TODO.17 Matcher (Roles, Dimensions).<br>- Build SQLite Event Store & Reducer.<br>- Implement BIP39 + Passkey encryption. | **High.** Pure TypeScript/Rust logic. No network dependencies. |
| **2 (Wk 5-8)** | **Transport** | - Map Notes to Nostr Addressable Events (NIP-01).<br>- Build the Sync Engine (Relay connection + Tag subscription).<br>- Implement Local-First UI updates. | **High.** Using `nostr-tools` / `NDK`. Relays handle the heavy lifting. |
| **3 (Wk 9-12)** | **Handshake** | - Implement the "Act Step" (Respond/Accept).<br>- Integrate Automerge for the shared Contract doc.<br>- Sync Automerge via NIP-44 Encrypted DMs. | **Medium.** Automerge is complex, but scoped *only* to the final contract text. |
| **4 (Wk 13-16)** | **Polish & Capture** | - Tauri 2.0 Android build with background sync.<br>- `PropertyExtractor` (Regex + optional WASM NLP).<br>- Accessibility (A11y) audit. | **High.** Standard UI/UX work. Tauri 2.0 stable supports Android natively [[8]]. |

---

#### 4. Risk Mitigation (Killing the "Killers")

| TODO.18 Risk | The Feasibility Solution |
| :--- | :--- |
| **Transport Fragmentation** | **Solved.** We do not abstract multiple transports. We use **Nostr** exclusively. It is censorship-resistant and partition-tolerant. |
| **CRDT for Semantic Data** | **Bypassed.** We use **Event Sourcing** (Addressable Events) for structured data. CRDTs (Automerge) are only used for unstructured text agreements. |
| **Key Management UX** | **Solved.** **Passkeys** handle the daily unlock UX. BIP39 is only for backup/recovery. |
| **Protocol Ossification** | **Solved.** Versioning is handled by the Nostr Event `kind` and a mandatory `v` tag in the content payload. |
| **iOS Background Execution** | **Solved.** **Excluded iOS.** Tauri 2.0 on Android allows robust background services and foreground notifications. |
| **Sybil Resistance** | **Solved.** **Web-of-Trust** (Nostr Contact Lists) + **Proof-of-Work** (NIP-13) for public posts. |

### Summary
This specification transforms Notention from a "research project" into a **shipping product**. By treating the local SQLite database as the source of truth and Nostr as a dumb, reliable event bus, we achieve the "Civilization-Scale" definition of done: **A stranger on Device A captures a request; a stranger on Device B receives it, matches it, and responds—all offline-capable, multi-device, and verifiable.**

