# TODO.18 — Post-TODO.17: The Civilization-Scale Gaps

> **Premise:** TODO.17 delivers a **local loop with a working center and human evidence**. It does **not** deliver a usable, networked, trustworthy product. This document captures exactly what remains, without sugarcoating, because the problem we're solving — **decentralized coordination without trusted intermediaries** — is civilization-scale. Half-measures don't compound.

---

## 🎯 The Gap Statement (No Euphemisms)

| TODO.17 Delivers | Reality | TODO.18 Requires |
|------------------|---------|------------------|
| Local matcher + act step | Works on one laptop | **Networked publication** that survives partition, censorship, and churn |
| Human evidence (corpus, comprehension, friction) | Lab conditions | **Trustworthy coordination** that withstands sybil, eclipse, and key compromise |
| Match-quality baseline (P3.1) | Synthetic metric | **Production readiness** at 10k+ nodes, offline-first, multi-device |
| Benchmark on product semantics | Single-machine CI | **Protocol completeness** with formal verification, not wishful thinking |

**TODO.17 stops at "the loop works locally." TODO.18 starts at "the loop works between strangers who don't trust each other."**

---

## 📦 Gap Categories — Brutally Honest

### 1. Network Publication (Transport & Discovery)
*Deferred in TODO.17: "Not before the loop works locally"*

#### The Hard Truth
**No existing transport solves this.** Not meshtastic, not nostr, not libp2p. Each fails differently:

| Transport | Works For | Fails At | Why It's Not Enough |
|-----------|-----------|----------|---------------------|
| **Meshtastic** | Low-bandwidth, local mesh, hobbyist | Store-and-forward at scale, routing, encryption key rotation | No background service on mobile, no relay incentives, 30-byte packets, no TTL management |
| **Nostr** | Broadcast, public notes, simple relays | Private coordination, spam resistance, relay discovery | No guaranteed delivery, relays are centralized choke points, NIP-65 is advisory, no incentive model |
| **libp2p** | General P2P, DHT, pubsub | NAT traversal at scale, mobile battery, protocol complexity | DHT doesn't work on mobile, pubsub floods, no economic sustainability |

**The synthesis problem:** You need *all three* because users have different threat models and connectivity. A mesh-only user in a protest needs meshtastic. A remote worker needs nostr. A server operator needs libp2p. **Abstraction leaks** — you cannot paper over 30-byte packets vs 1MB relays vs DHT routing with a single `NetworkProvider` interface.

#### What It Actually Takes
- **Unified routing layer** that speaks mesh packets, nostr events, and libp2p streams
- **Economic incentives** for relay operators (or accept centralized relays = trusted intermediaries)
- **Background execution** on iOS/Android (service workers die, native daemons need permissions)
- **Store-and-forward** with TTL, priority, and encryption — implemented *per transport*
- **Capability advertisement** over each transport with gossip convergence proofs

**Kill criterion:** A note created on Device A (meshtastic-only, offline 6h) appears on Device B (nostr-only, behind corporate firewall) within 30s of both coming online, with cryptographic proof of integrity and no user intervention.

**Civilization-scale implication:** If this doesn't work, **decentralized coordination is a myth**. People will default to Discord/Slack/Email because "it just works." The network *is* the product.

---

### 2. Trustworthy Coordination (Crypto, Identity, Attestation)
*Deferred in TODO.17: "Full protocol §14 transition semantics — future"*

#### The Hard Truth
**Key management is the graveyard of decentralized apps.** Every project that tried "users hold keys" failed at scale. The UX options are all bad:

| Approach | UX Reality | Security Reality |
|----------|------------|------------------|
| **Raw seed phrase** | Users lose it, screenshot it, paste it in phishing sites | Single point of failure, no rotation |
| **BIP39 + Passphrase** | Users forget passphrase = funds/notes gone | Better but still no recovery |
| **Social Recovery (Vitalik's)** | Requires trusted guardians who... have keys | Guardian collusion = total compromise |
| **Passkeys/WebAuthn** | Tied to platform (Apple/Google/Microsoft) | Platform can revoke; not truly self-sovereign |
| **MPC/Threshold** | Complex, requires multiple devices online | Best security, worst UX, no standard |

**We have no good answer.** The industry has been stuck here for 15 years.

#### What It Actually Takes
- **Identity layer** with: key derivation (BIP39/HD), rotation protocol, revocation, backup (encrypted shards), social recovery (threshold)
- **Attestation system**: Every `match:accepted` produces a signed receipt. Counterparty verifies. Receipts are *the* coordination primitive — without them, "I agreed" is he-said-she-said.
- **Capability tokens (UCAN/OCAP)**: Not "permissions" — *delegatable, attenuatable, revocable* authority. Current `CapabilitiesPanel` is theater.
- **Sybil resistance**: Without it, matcher is gamed. Options: proof-of-work (burns battery), proof-of-stake (centralizes), web-of-trust (doesn't scale), invite-only (not open).

**Kill criterion:** A user rotates their key after compromise; all their notes, matches, and capabilities migrate without data loss. A stranger verifies a match acceptance receipt without trusting any server.

**Civilization-scale implication:** Without trustworthy identity and attestation, **coordination reduces to reputation on centralized platforms**. The "web of trust" failed. We need something new or we accept trusted intermediaries.

---

### 3. Data Integrity (CRDT, Canonical Encoding, Schema Evolution)
*Deferred in TODO.17: "E15.4 (CRDT / canonical CBOR / agent-native doc) — future"*

#### The Hard Truth
**Rich document CRDT is an unsolved research problem.** 

| What Exists | What We Need | Gap |
|-------------|--------------|-----|
| **Yjs/Automerge** — plain text, JSON maps | **Typed schema**: content (rich text) + properties (typed, with units) + tags + ontology refs + capability grants | No CRDT handles "this property is a `rate: USD/hr` that must dimensionally match that other property" |
| **RGA/Peritext** — rich text | **Semantic merge**: "user A changed rate from 50 to 60 USD/hr; user B changed duration from 2w to 3w" → derive new budget | Requires *domain-aware* merge, not character-level |
| **CBOR/MessagePack** — encoding | **Canonical CBOR**: deterministic map sorting, tag 55799, schema version negotiation | No standard for "this CBOR blob is a NoteDocument v3" |

**Schema evolution is the killer.** Ontology changes. Properties get deprecated. Units get redefined. A note from 2024 must be readable in 2030. **No existing system does this for typed, semantic data.**

#### What It Actually Takes
- **Domain-aware CRDT**: Merge understands `rate`, `budget`, `duration` as dimensional quantities. `budget ÷ duration = rate` is an invariant the CRDT must preserve.
- **Canonical encoding**: Deterministic CBOR with schema version tag. Every note self-describes its schema.
- **Migration layer**: Automatic, verified migration from vN → vN+1. Rollback on failure. User consent for breaking changes.
- **Conflict UI**: Not "pick one" — "user A changed rate, user B changed duration; here's the derived budget; confirm?"

**Kill criterion:** Two devices edit the same note offline for 30 days. On sync: no data loss, dimensional invariants hold, user resolves semantic conflicts in <30s.

**Civilization-scale implication:** Without semantic merge, **collaborative knowledge building is impossible**. Every fork is a permanent schism. Wikipedia works because of central servers. We need the decentralized equivalent.

---

### 4. Protocol Completeness (State Machines, Guarded Transitions, Formal Verification)
*Deferred in TODO.17: "Full protocol §14 transition semantics — P1b implements shape locally"*

#### The Hard Truth
**Current `status` field is a string enum with zero guarantees.** Any code can write any string. No transition validity. No attestation. No TTL.

| Current State | Required State |
|---------------|----------------|
| `status: "open" \| "available" \| "todo" \| "done"` (free text) | **Formal state machine**: `draft` → `published` → `matched` → `responded` → `accepted`/`withdrawn` → `completed`/`cancelled`/`expired` |
| No transition guards | **Guarded transitions**: `published` → `matched` only via matcher; `matched` → `accepted` only by requester; `accepted` → `completed` only by both parties |
| Ledger events unsigned | **Attested transitions**: Every transition produces a signed attestation with timestamp, parties, prev/next state |
| No TTL | **Time-bounded states**: `matched` expires after 72h (configurable); `responded` expires after 24h |

#### What It Actually Takes
- **Protocol specification** (not code comments): Formal state machine, message formats, transition rules
- **Model checking** (TLA+/Alloy): Verify no invalid states reachable, no deadlocks, liveness properties
- **Reference implementation** in Rust/Go (not TypeScript): The protocol *is* the spec; TS is one client
- **Versioned protocol negotiation**: `protocolVersion` in every message; graceful degradation

**Kill criterion:** TLA+ model verifies: (1) no invalid state reachable, (2) every `published` note eventually reaches `matched` ∨ `expired`, (3) no double-spend on `accepted`.

**Civilization-scale implication:** Without formal protocol, **interoperability is accidental**. Every client speaks a different dialect. The network fragments. We rebuild the Tower of Babel.

---

### 5. Production Readiness (Scale, Offline-First, Multi-Device, A11y)
*Deferred in TODO.17: "Scale, polish, 'more views' — not until the five steps work"*

#### The Hard Truth
**This is not "polish." This is 80% of the engineering.**

| Requirement | Why It's Hard | Effort |
|-------------|---------------|--------|
| **Background sync (iOS/Android)** | iOS kills background tasks in 30s; Android Doze mode; no unified API | 6-12 months native per platform |
| **Offline-first UX** | Optimistic UI + conflict queue + sync status + "you're offline" indicators without annoyance | 3-6 months |
| **Multi-device session** | Device linking (QR/phrase), session sync, device list, revoke compromised device | 3-6 months |
| **10k+ notes performance** | Virtualized lists, indexed search (meilisearch/sqlite-fts), lazy loading, memory pressure | 2-4 months |
| **Accessibility (WCAG 2.1 AA)** | Screen readers, keyboard nav, focus management, contrast, motion reduction | 2-3 months dedicated |
| **Internationalization** | RTL, pluralization, date/number formatting, font fallback, locale-aware sorting | 2-3 months |
| **Settings migration** | Schema versioning, auto-migrate, backup/restore, rollback | Ongoing |

**No solo developer does this.** It requires a team with mobile, backend, frontend, a11y, i18n expertise.

#### What It Actually Takes
- **Team**: 3+ engineers (mobile, core, frontend) + 1 designer + 1 a11y specialist
- **CI/CD**: Device farm (BrowserStack/Sauce Labs), automated a11y testing, performance budgets
- **Telemetry**: Opt-in, privacy-preserving, actionable (not "engagement" — "sync success rate," "conflict resolution time")
- **Release process**: Staged rollout, feature flags, instant rollback

**Kill criterion:** App works on phone + laptop simultaneously; 10k notes load in <2s; works offline for 72h; blind user completes capture→match→respond flow.

**Civilization-scale implication:** If it's not accessible, **it excludes the vulnerable**. If it doesn't work offline, **it fails in disasters/censorship**. If it doesn't scale, **it stays a toy**.

---

### 6. Editor & Capture Polish (Mobile-First, Rich Properties, AI)
*Deferred in TODO.17: "Editor engine swap — ADR 013 stands: stay Tiptap 3.x. Not revisited"*

#### The Hard Truth
**Desktop-first capture is a death sentence.** Most coordination happens mobile.

| Gap | Why It Matters |
|-----|----------------|
| **Touch-optimized capture** | Thumb zones, swipe gestures, voice input, camera OCR for "scan business card → offer" |
| **Inline property editing** | Modal blocks context; need inline "tap rate → picker → USD/hr" |
| **Type-specific widgets** | Date picker, location map, duration picker, rate calculator (budget ÷ duration) |
| **Parameterized templates** | "Freelance dev template" with slots: rate, duration, skills, location |
| **AI-assisted capture (local-first)** | On-device LLM (WebLLM/MLC) for extraction; cloud fallback with consent |

---

## 🔗 Dependency Graph — Critical Path

```
TODO.17 (Local Loop)
    │
    ├─► T1: Network Publication (MESH + NOSTR + LIBP2P)
    │       │
    │       ▼
    │   T2: Trustworthy Coordination (KEYS + ATTESTATION + SYBIL)
    │       │         │
    │       ▼         ▼
    │   T3: Data Integrity    T4: Protocol Completeness
    │   (CRDT + CBOR)         (TLA+ + State Machine)
    │       │         │
    │       └────┬────┘
    │            ▼
    │   T5: Production Readiness (MOBILE + OFFLINE + SCALE + A11y)
    │            │
    │            ▼
    └─────► T6: Editor & Capture Polish (MOBILE-FIRST + AI)
```

**Critical path:** T1 → T2 → T3/T4 → T5. T6 parallelizes after T1.

**Total estimated effort (solo):** 5-8 years.  
**Total estimated effort (3-person team):** 18-24 months.  
**Total estimated effort (dedicated 6-person team):** 12-15 months.

---

## 📋 Suggested TODO.18 Structure (With Kill Criteria)

| Track | Scope | Kill Criterion (Non-Negotiable) | Solo Feasibility |
|-------|-------|----------------------------------|------------------|
| **T1** | Meshtastic + Nostr + libp2p transport end-to-end | Note syncs between 2 devices over ALL transports within 30s; background relay works 24h | Low (native mobile bg) |
| **T2** | Signing + attestation + identity + sybil resistance | Key rotation without data loss; match receipt verifiable by stranger; sybil attack costs >$1000 | Medium (crypto UX hard) |
| **T3** | CRDT + canonical CBOR + schema migration | 30-day offline concurrent edits merge; dimensional invariants hold; v2024 note reads in v2030 | Low (research problem) |
| **T4** | Protocol state machine + TLA+ verification | Model checker proves: no invalid states, liveness, no double-accept | Medium (formal methods) |
| **T5** | Background sync + offline-first + multi-device + a11y | Blind user completes flow; 10k notes <2s; 72h offline; phone+laptop sync | Very Low (team required) |
| **T6** | Mobile capture + rich widgets + templates + local AI | Capture→match <30s on mobile; voice→structured note works | Medium (design heavy) |

---

## ⚠️ Honest Risk Assessment — The Killers

| Risk | Likelihood | Impact | Mitigation | Solo Viable? |
|------|------------|--------|------------|--------------|
| **Transport fragmentation** | Certain | Fatal | Abstract `NetworkProvider`; accept leaky abstraction; prioritize ONE transport first | No |
| **CRTD for typed semantic data** | High | Fatal | Adopt Automerge + custom merge hooks; accept constraints; schema-first design | No |
| **Key management UX** | Certain | Fatal | Outsource to Passkeys + BIP39 shards; no custom crypto; accept platform dependence | Maybe |
| **Protocol ossification** | High | Fatal | Version every message; mandatory `protocolVersion`; automated compat tests | Yes |
| **Scope creep** | Certain | Fatal | Time-box each track; kill criteria are LAW; no "just one more feature" | Discipline |
| **iOS background execution** | Certain | Fatal | Accept: no true background on iOS without Apple blessing; use push notifications + app clips | No |
| **Sybil resistance without token** | High | High | Proof-of-work (burns mobile battery); web-of-trust (doesn't scale); invite codes (not open) | No |
| **Funding / sustainability** | Certain | Fatal | No VC (misaligned); grants (NGI, NLnet, Ethereum Foundation); protocol revenue (relay fees?) | Unknown |

---

## 🎯 Definition of Done for TODO.18 (Civilization-Scale)

> **A stranger on Device A (phone, meshtastic, offline 6h) captures a request. A stranger on Device B (laptop, nostr, behind firewall) receives it, matches it, responds, and both see the accepted match with verifiable receipts — all offline-capable, multi-device, with no data loss on conflict, accessible to a blind user, in their language, with keys they can rotate if compromised.**

**Until then: prototype, not infrastructure.**

---

## 📎 What TODO.17 Locks In (Frozen — Do Not Revisit)

- Matcher semantics: roles (constraint/fact/marker), dimensional quantities, canonical keys — **frozen**
- Act step schema: `match:accepted`/`match:withdrawn` ledger events — **frozen**
- Quantity system: `compareQuantities`, `createCompoundQuantity`, `parseQuantity` — **frozen**
- Ontology domains: `request`, `offer`, `skill`, `rate`, `budget`, `location` — **frozen**
- Quality gates: powered-or-silent, measured>observed, honest-negatives, consent-is-product — **frozen**

**These are the foundation. TODO.18 builds on them. If they crack, everything above collapses.**

---

## 💰 The Civilization-Scale Stakes

### Why This Matters Beyond This Project

| If We Succeed | If We Fail |
|---------------|------------|
| **Coordination without permission** — anyone can find anyone for anything, no platform gatekeeper | **Platforms win** — Discord, LinkedIn, Upwork, Fiverr capture all coordination value |
| **Resilient communication** — works in disasters, censorship, regime change | **Fragile communication** — one cable cut, one subpoena, one policy change kills it |
| **User-owned identity & reputation** — your matches, your skills, your network — portable | **Platform-owned identity** — your reputation is hostage to ToS changes |
| **Economic agency** — direct value exchange, no 20-30% platform tax | **Extractive intermediaries** — rent-seekers between every transaction |
| **Collective intelligence** — semantic merge enables building knowledge together | **Fragmented knowledge** — every fork a schism; no cumulative progress |

**This is not an app. This is infrastructure for human coordination at scale.**

The internet gave us *communication* (TCP/IP, HTTP, Email).  
We need *coordination* (discovery + matching + commitment + settlement).

**TODO.17 builds the matching engine. TODO.18 builds the coordination infrastructure.**

---

## 🧭 Decision Framework: Should We Continue?

### Continue IF:
- [ ] You can recruit a **dedicated team of 3+** for 18+ months
- [ ] You have **funding** (grants, protocol revenue, aligned investors — not VC)
- [ ] You accept **narrowing scope**: ONE transport first (nostr), defer mesh/libp2p
- [ ] You adopt **existing CRDT** (Automerge) + accept constraints
- [ ] You outsource **key management** to Passkeys/BIP39 — no custom crypto
- [ ] You write the **protocol spec first** (TLA+) — code follows

### Pivot IF:
- [ ] Solo or 2-person team → **Ship TODO.17 as "local-first coordination tool with optional sync"**
- [ ] No funding → **Open source the matcher + act step; let others build network layer**
- [ ] Key management unsolved → **Integrate with existing identity (Nostr keys, DID, Passkeys)**
- [ ] CRDT too hard → **Accept last-writer-wins + manual conflict resolution; ship anyway**

### Stop IF:
- [ ] The matcher doesn't generalize beyond the demo corpus
- [ ] Humans can't comprehend the capture→match→respond loop
- [ ] The friction taxonomy reveals fundamental UX flaws, not fixable bugs

---

## 📝 Next Actions (After TODO.17 Complete)

1. **Write the protocol spec** (TLA+) — before any network code
2. **Choose ONE transport** — nostr (easiest), meshtastic (hardest), libp2p (most flexible)
3. **Apply for funding** — NGI Zero, NLnet, Ethereum Foundation, Filecoin Grants
4. **Recruit** — 1 mobile engineer, 1 cryptographer, 1 formal methods person
5. **Set up governance** — non-profit foundation or protocol DAO (not C-corp)

---

*Created: 2026-11-10*  
*Status: Brutally honest draft — review after TODO.17 P1b complete*  
*Classification: Infrastructure — not application*

---

> **"The best time to plant a tree was 20 years ago. The second best time is now. But don't plant a seedling and call it a forest."**  
> — *TODO.18 is the forest plan. TODO.17 is the seedling. Both are necessary. Neither is sufficient.*