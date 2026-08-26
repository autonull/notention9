# Notention — Decentralized Semantic Network: Complete Specification & Implementation Guide

> **Single source of truth for the DSN Protocol v1.0** — normative definitions, architecture, implementation status, and build guide.
>
> This document **replaces** the need to reference `README2.prompt.md`. It contains the full normative specification plus implementation reality, gaps, and actionable build steps. A new team could build the complete system from this document alone.

---

## 0. Normative Language

Keywords **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, **OPTIONAL** follow RFC 2119.

> **Conformance principle:** Fail closed when validation, authorization, signature verification, or privacy enforcement cannot complete safely.

---

## 1. Core Philosophy (Normative)

| Principle | Requirement |
|---|---|
| **Private by Default** | Local data encrypted at rest. Network publication requires explicit consent. |
| **Single-User Utility First** | System fully useful offline: semantic notebook, knowledge base, task manager, local agent. |
| **Universal Matching** | Peers/objects matched by semantic compatibility and constraint satisfaction, not keywords. |
| **Skills as Translators** | Domain logic = declarative ontology modules + inference rules, not hardcoded screens. |
| **Everything is a Note** | Projects, tasks, products, identities, payments, disputes, attestations, transitions, policies, capabilities = content-addressed Notes. |
| **Zero Gatekeepers** | Participation begins with key generation. No administrator required. |
| **Immutable Notes, Inferred State** | Notes = immutable signed assertions. Lifecycle state inferred from Notes, transitions, predicates. |
| **LM Advisory, Validator Authoritative** | LMs propose structured intent. Deterministic validation + user consent authorize actions. |
| **Transports Interchangeable** | Nostr, mesh, libp2p, HTTP, local storage carry the same canonical Note object. |

---

## 2. Architecture Invariants (Normative)

### 2.1 Four Primitive Semantic Functions

| Function | Meaning | Note `role` Values |
|---|---|---|
| **Fact** | Assertion about reality | `offer`, `service`, `record`, `identity`, `receipt` |
| **Constraint** | Desired condition/requirement | `request`, `search`, `need`, `task requirement` |
| **Attestation** | Signed statement about another object | `endorsement` (trust), `delivery confirmation`, `rating`, `block` |
| **Transition** | Authorized state-changing event | `acceptance`, `payment settlement`, `cancellation`, `arbitration ruling` |

> **Invariant:** Domain workflows are **ontology-driven inferences** over these primitives — not rigid state machines.

### 2.2 No Mutable Notes

> **Rule:** A Note is immutable. Updating, completing, canceling, disputing, or deleting = new signed Note referencing the target via `parents` or `dsn:replaces`.

**Benefits:** Deterministic content addressing, append-only auditability, offline conflict preservation, simple transport sync, no destructive overwrites.

### 2.3 State Is Inference, Not Storage

> **Rule:** Lifecycle state is never a mutable database field. State is inferred from:
1. Explicit signed transition Notes
2. Valid cryptographic settlement proofs
3. Ontology state predicates
4. Heuristic annotations
5. Local user override (lowest precedence)

**Conflict rule:** If two valid explicit transitions conflict → object in `conflict` state until resolved by user action, arbitration, or higher-authority transition.

### 2.4 Skills Are Declarative Ontology Modules

> **Definition:** A Skill is a signed, versioned ontology module containing:
- Classes, property schemas, value constraints
- UI hints, state predicates, transition rules
- Matching heuristics, automation policies

> **Requirement:** Skills MUST be treated as untrusted data unless explicitly trusted by user/implementation.

---

## 3. Architecture Layers (Normative → Implementation)

| Layer | Normative Function | Implementation |
|---|---|---|
| **Natural Language & UI** | Human interaction without raw syntax exposure | `ui/src/components/Editor/`, `ui/src/hooks/usePropertyExtractor.ts`, `core/src/notes/propertyExtractor.ts` |
| **Semantic Ontology Engine** | Canonical translation, inference, matching | `core/src/matching/`, `core/src/ontology/`, `core/src/notes/parsing.ts`, `core/src/utils/matching.ts` |
| **Action Agent** | Optional execution layer (browser/API automation, policy engine) | `agent/src/`, `agent/src/VoltBrowserCoordinator.ts`, `agent/src/core/actionExecutor.ts` |
| **P2P Coordination** | Censorship-resistant publication/discovery | `core/src/network/nostr/`, `core/src/network/mesh/`, `core/src/network/networkGate.ts` |
| **Transport & Persistence** | Carriage and storage | `core/src/notes/notes.ts`, `core/src/utils/encoding.ts`, `ui/src/services/storage.ts` |
| **Identity & Security** | Authorization, privacy, abuse resistance | `core/src/security/CapabilityManager.ts`, `core/src/network/nostr/privacy.ts`, `agent/src/core/Capabilities.ts` |

---

## 4. Unified Note Model (Normative)

### 4.1 Wire Format

```typescript
// Published Note on the wire
interface WireNote {
  id: NoteID;                    // Content-addressed
  body: NoteBody;                // Canonical signed payload
  signatures: SignatureEntry[];  // One or more
  seals?: SealEntry[];           // For encrypted publication
}

// Encrypted publication envelope
interface SealedNote {
  v: 1;
  kind: "sealed";
  alg: "xchacha20poly1305" | string;
  ephk: Uint8Array;              // Ephemeral public key
  recipients: Array<{
    kid: string;                 // Key identifier
    enc_key: Uint8Array;         // Encrypted content key
  }>;
  nonce: Uint8Array;
  ct: Uint8Array;                // Ciphertext (canonical WireNote)
  tag: Uint8Array;               // Auth tag
  hint?: string;                 // Optional policy hint
}
```

**SealedNoteID** = `"seal:" + base64url(SHA-256(canonical_cbor(SealedNote)))`

After decryption, inner `NoteID` used for all semantic reference, matching, workflow.

### 4.2 NoteBody (Canonical Signed Payload)

```typescript
interface NoteBody {
  v: 1;                          // Protocol version (MUST be 1)
  author: PeerID;                // Author identity
  created: number;               // Unix milliseconds UTC
  nonce: Uint8Array;             // 128-bit random, base64url in JSON
  types: string[];               // Ontology class IRIs (≥1 required)
  parents?: string[];            // Causal/replacement NoteIDs
  props: Property[];             // Semantic property objects
  policy?: Policy;               // Visibility, signature, workflow policy
  ext?: Record<string, unknown>; // Additive extensions only
}
```

**MUST NOT include:** transport metadata, local index data, signatures, derived annotations.

### 4.3 NoteID (Content-Addressed)

```
NoteID = "note:" + base64url( SHA-256( canonical_cbor(NoteBody) ) )
```

- Deterministic, content-addressed, transport-independent
- Two Notes with different NoteIDs are distinct even if semantically similar
- Logical replacement/duplication/conflict expressed via `parents`, properties, transitions, inference

### 4.4 Base Semantics (Invariant)

| Behavior | Rule |
|---|---|
| **Immutability** | NoteBody cannot be modified after signing |
| **Versioning** | Updates = new Notes referencing prior Notes |
| **Lifecycle** | Derived from inference, not stored mutably |
| **Visibility** | Controlled by policy and sealing |
| **Extensions** | Additive only; unknown fields MUST NOT invalidate core parsing |
| **Provenance** | Advisory metadata may identify LM generation, import source, agent action |

---

## 5. Property Model (Normative)

### 5.1 Property Object (Canonical Internal Representation)

```typescript
interface Property {
  k: string;                    // Namespaced key (e.g., "dsn:price")
  o: string;                    // Operator code (e.g., "lt")
  v: TypedValue;                // Typed value object
  opt?: PropertyOptions;        // Matching, weighting, tolerance, UI hints
}

interface TypedValue {
  t: "text" | "enum" | "int" | "dec" | "bool" | "time" | "dur" | "geo" | "money" | "qty" | "ref" | "bytes" | "arr";
  // Type-specific fields:
  v?: string;                   // text, enum, int, dec, bool, time, dur, bytes, ref
  cur?: string;                 // money: ISO-4217 or "SAT"
  min?: number;                 // money: integer minor units
  lat?: string; lon?: string; acc?: number;  // geo: decimal strings
  v?: number; u?: string;       // qty: number + unit
  kind?: "note" | "peer" | "did" | "url" | "tx"; v?: string;  // ref
  v?: TypedValue[];             // arr: ordered array
}

interface PropertyOptions {
  optional?: boolean;           // Not counted in required denominator
  weight?: number;              // Optional bonus score weight (default 1.0)
  tolerance?: number;           // For approx (default 10% of magnitude)
  radius_m?: number;            // For near (default 10,000m)
  ui?: UIRenderHint;            // Form/view hints
}
```

### 5.2 Namespaces (Mandatory Qualification)

| Prefix | Meaning | Resolution |
|---|---|---|
| `dsn:` | Core protocol | Defined in this spec |
| `skill:` | Skill-defined | Skill ontology registration |
| `ext:` | Public extensions | Pass-through |
| `local:` | Private local-only | Pass-through |
| Custom IRI | Any absolute IRI | Pass-through; MUST be accepted unless local policy prohibits |

### 5.3 Typed Values — Canonical Forms

| Type | Canonical JSON | Normalization |
|---|---|---|
| Text | `{"t":"text","v":"..."}` | UTF-8, NFC |
| Enum | `{"t":"enum","v":"dsn:category.bicycle"}` | Namespace-qualified term |
| Integer | `{"t":"int","v":123}` | Canonical integer |
| Decimal | `{"t":"dec","v":"1.23"}` | Canonical decimal string (no float) |
| Boolean | `{"t":"bool","v":true}` | Canonical true/false |
| DateTime | `{"t":"time","v":1767225600000}` | Unix milliseconds UTC |
| Duration | `{"t":"dur","v":3600000}` | Integer milliseconds |
| GeoPoint | `{"t":"geo","lat":"37.7749","lon":"-122.4194","acc":50}` | Decimal strings; accuracy optional |
| Money | `{"t":"money","cur":"USD","min":20000}` | ISO-4217 or `SAT`; integer minor units |
| Quantity | `{"t":"qty","v":3,"u":"count"}` | Number + unit |
| Reference | `{"t":"ref","kind":"note","v":"note:..."}` | NoteID, PeerID, DID, URL, or tx ref |
| Bytes | `{"t":"bytes","v":"base64url"}` | Base64url, no padding |
| Array | `{"t":"arr","v":[TypedValue...]}` | Ordered; matching semantics by operator |

> **MUST NOT** use floating-point in canonical encoding. Geo coordinates and decimals are canonical decimal strings.

### 5.4 Operators (Normative)

| Operator | Code | Symbol | Meaning |
|---|---|---|---|
| Equal | `eq` | `is` | Exact typed match |
| Not equal | `ne` | `not` | Exclude value |
| Contains | `inc` | `∋` | Array includes or substring contains |
| Approximate | `approx` | `≈` | Numeric fuzzy match (tolerance) |
| Geo near | `near` | `@` | Geographic distance within radius |
| Less than | `lt` | `<` | Ordered comparison |
| Less or equal | `lte` | `<=` | Ordered comparison |
| Greater than | `gt` | `>` | Ordered comparison |
| Greater or equal | `gte` | `>=` | Ordered comparison |
| Range | `range` | `<>` | Inclusive typed range |
| In set | `in` | `in` | Value is member of set |
| Intersects | `inter` | `∩` | Sets share at least one member |
| Exists | `exists` | `?` | Property presence constraint |

### 5.5 Operator Semantics (Normative)

**For Request Notes:** Properties are constraints unless explicitly marked advisory.

**For Offer Notes:** `eq`, `inc`, `in`, and typed facts are assertions. Constraints are advisory unless used as eligibility rules.

**Positive constraints:** Satisfied if ≥1 matching fact exists. Repeated same key + positive operator = **OR**.

**Negative constraints:** Satisfied only if no contradicting fact exists. Repeated same key + negative operator = **AND**.

**Missing facts:**
- Positive constraint: unsatisfied if fact absent
- Negative constraint: satisfied if fact absent
- `exists:false`: satisfied if property absent
- `exists:true`: unsatisfied if property absent

**Optional constraints:** `opt.optional=true` not counted in required denominator. If satisfied → contributes to optional bonus score.

**Approximation:** Numeric/money: `approx` satisfies if `|actual - requested| ≤ tolerance`. Default tolerance = 10% of requested magnitude unless overridden by `opt.tolerance`.

**Geo near:** `near` requires distance ≤ `opt.radius_m`. Default = 10,000m unless overridden or user policy restricts location.

### 5.6 Human-Facing Shorthand (Diagnostic Only)

```
[price:lt:300 USD]
[category:is:bicycle]
[deadline:before:2026-12-31]
[location:near:me radius=5km]
```

Not normative wire syntax. Lossless diagnostic representation.

---

## 6. Ontology & Inference (Normative)

### 6.1 Ontology Module Structure

```typescript
interface OntologyModule {
  prefixes: Record<string, string>;     // Namespace mappings
  classes: Record<string, ClassDef>;    // Note types (dsn:Offer, dsn:Task, etc.)
  properties: Record<string, PropertyDef>; // Allowed keys, types, cardinality, validation
  statePredicates: StatePredicate[];    // Conditions implying lifecycle states
  transitionRules: TransitionRule[];    // Allowed state changes, actors, guards, required sigs
  uiHints: UIHint[];                    // Forms, views, labels, progressive disclosure
  matchingHints: MatchingHint[];        // Weights, ranking, optional fields
  automationPolicy: AutomationPolicy;   // Agent permissions, confirmation requirements
}
```

> **MUST** be versioned and content-addressed.

### 6.2 Inference Engine

**Inputs:** Local Notes, Received Notes, Trusted ontology modules, Local policy, Current time.

**Output:** Derived Annotations

```typescript
interface DerivedAnnotation {
  target: NoteID;
  key: string;              // IRI
  value: TypedValue;
  rule: string;             // RuleID
  confidence?: number;      // 0.0-1.0
  inferred_at: number;      // timestamp
}
```

> **MUST NOT** be treated as authoritative unless separately attested by a signed Note.

### 6.3 Inference Precedence (Normative Order)

1. Valid explicit transition Notes
2. Valid cryptographic settlement proofs
3. Ontology state predicates
4. Heuristic annotations
5. Local user override

### 6.4 State Predicates (Normative Examples)

| Inferred State | Predicate (all must match) |
|---|---|
| `active` | `[dsn:role:is:offer]`, `[dsn:status:is:active]`, `[dsn:expires:after:now]`, `[dsn:inventory:gt:0]` |
| `sold_out` | `[dsn:role:is:offer]`, `[dsn:inventory:is:0]` |
| `pending` | `[dsn:role:is:transaction]`, `[dsn:agreement:exists:false]` |
| `accepted` | `[dsn:role:is:transaction]`, `[dsn:agreement:is:signed]` |
| `fulfilled` | `[dsn:role:is:transaction]`, `[dsn:delivery:is:confirmed]` |
| `settled` | `[dsn:role:is:payment]`, `[dsn:confirmations:gte:3]` OR `[dsn:lightning_status:is:settled]` |
| `disputed` | `[dsn:role:is:dispute]`, `[dsn:status:is:open]` |
| `suppressed` | Valid tombstone Note references target |

### 6.5 Domain Skills (Normative Registry)

| Skill | Domain | Example Inferred States |
|---|---|---|
| **OFFER** | Catalog, marketplace | `active`, `paused`, `sold_out`, `expired`, `withdrawn` |
| **TRANSACT** | Exchange | `proposed`, `accepted`, `funded`, `fulfilled`, `completed`, `disputed`, `canceled` |
| **PAY** | Payments | `invoice_issued`, `pending`, `confirmed`, `settled`, `failed`, `refunded` |
| **REACT** | Trust & reputation | `endorsed`, `flagged`, `blocked` |
| **CONNECT** | Identity & relationships | `invited`, `mutual`, `revoked` |
| **MESSAGE** | Communications | `sent`, `delivered`, `read`, `archived` |
| **GOVERN** | Disputes & arbitration | `open`, `investigating`, `ruled`, `appealed`, `closed` |
| **COLLABORATE** | Knowledge work | `draft`, `review`, `approved`, `merged` |
| **ORGANIZE** | Groups & events | `proposed`, `scheduled`, `live`, `concluded` |
| **AGENT** | Automation | `proposed`, `authorized`, `running`, `completed`, `failed` |

---

## 7. Canonicalization (Normative — Critical Path)

### 7.1 Canonical Encoding Rules

1. **Definite-length CBOR only**
2. **Map keys sorted bytewise lexicographically**
3. **No duplicate map keys**
4. **No undefined values**
5. **No floating-point values**
6. **Text = UTF-8 Unicode NFC**
7. **Integers = minimal CBOR encoding**
8. **Decimals = canonical strings without exponent**
9. **Arrays preserve order unless field defined as set**
10. **Set-like fields (`types`, `parents`, semantic duplicates) sorted + deduplicated**
11. **Property arrays sorted by:** key → operator → canonical typed value → canonical options

### 7.2 Canonical Field Rules

| Field | Rule |
|---|---|
| `v` | Integer |
| `author` | Text PeerID |
| `created` | Integer Unix milliseconds |
| `nonce` | Byte string |
| `types` | Sorted unique IRIs |
| `parents` | Sorted unique NoteIDs |
| `props` | Sorted canonical Property objects |
| `policy` | Canonical map |
| `ext` | Canonical map; unknown fields preserved |

### 7.3 Hash Target

**Hash input:** Canonical CBOR encoding of **NoteBody only**.

**Excluded from hash:** Signatures, transport metadata, local index annotations, derived inference annotations, UI state, relay timestamps, local encryption wrappers.

---

## 8. Identity, Keys, Delegation (Normative)

### 8.1 Native PeerID

```
peer:<base64url(sha256(compressed secp256k1 pubkey))>
peer:secp256k1:<hash>
peer:ed25519:<hash>
```

Unqualified `peer:<hash>` = secp256k1 for backward compatibility.

### 8.2 Alias Forms

| Alias | Resolution |
|---|---|
| `did:<method>:<id>` | DID resolver |
| `nostr:<npub1…>` | Nostr pubkey or NIP-05 mapping |
| Bitcoin address | BIP-84/BIP-86 derivation proof |
| BOLT-12 offer | Lightning identity binding |
| DNS/HTTPS alias | Signed alias attestation |

Aliases bound by signed alias Notes. Alias bindings revocable.

### 8.3 Key Management (SHOULD Support)

- Key rotation
- Device subkeys
- Agent subkeys
- Hardware secure elements
- Social recovery
- Delegated capabilities
- Revocation

### 8.4 Key Rotation

Rotation Note MUST include:
- `dsn:role=rotation`
- Old PeerID, new PeerID, new public key
- Creation time
- Signature by old key
- Signature by new key (unless recovery procedure)

Rotation Notes form auditable chain.

### 8.5 Social Recovery

Recovery Notes MUST require threshold of guardian signatures. Recovery policy defined by principal before key loss.

Recovery event MUST:
- Reference recovery policy
- Include new key
- Be signed by required guardian threshold
- Be locally rate-limited and user-visible

### 8.6 Delegation (Capability Notes)

```typescript
interface CapabilityNote {
  role: "capability";
  issuer: PeerID;
  subject: PeerID;
  capabilities: string[];      // e.g., "publish.notes", "pay.max:10000 SAT"
  constraints: Record<string, unknown>;
  expiry: number;              // timestamp
  revocationPolicy: RevocationPolicy;
}
```

**Example capabilities:** `publish.notes`, `send.messages`, `pay.max:10000 SAT`, `agent.browser`, `agent.api`, `manage.circle`, `delegate.subkey`

> **Rules:** Delegated keys MUST NOT exceed issuer scope. Delegation Notes MUST be revocable.

---

## 9. Visibility, Encryption, Access Control (Normative)

### 9.1 Visibility Modes

| Mode | Meaning |
|---|---|
| `private` | Encrypted to self/device keys. Not published without explicit consent. |
| `circle` | Encrypted to circle group or member key set. |
| `allowlist` | Accessible only to explicitly authorized keys. |
| `gated` | Access requires token, payment, credential, or proof. |
| `unlisted` | Publicly readable but not indexed or advertised. |
| `public` | Publicly readable and indexable. |

> Visibility metadata is advisory unless enforced cryptographically.

### 9.2 Clear vs Sealed Notes

| Use ClearNote For | Use SealedNote For |
|---|---|
| Public Notes | Private, circle, allowlist, gated content over transport |
| Unlisted Notes | |
| Local encrypted-at-rest storage | |

### 9.3 SealedNote Envelope (Normative)

See Section 4.1 for full structure.

**Algorithm baseline:** `xchacha20poly1305` (XChaCha20-Poly1305 with 192-bit nonce).

**Ciphertext MUST contain** a canonical WireNote.

### 9.4 Circle Keys

A circle MAY use:
- Shared group key
- Per-member encrypted content keys
- Rotating group keys
- External key management services

Circle membership changes SHOULD be signed circle transition Notes.

> **Revocation reality:** Cannot retroactively erase distributed ciphertext. Conforming clients MUST stop granting future access and stop displaying newly received unauthorized content.

### 9.5 Token Gating

```typescript
interface GatePolicy {
  issuer: PeerID;
  proof_type: string;           // payment_receipt, membership, credential, stake, timelock, captcha
  expiry: number;
  condition: unknown;
  key_release_method: string;
}
```

Gate service MUST NOT learn more than necessary to verify the proof.

### 9.6 Revocation

```typescript
interface RevocationNote {
  role: "revocation";
  target: NoteID | CapabilityID | AliasBinding | CircleMembership;
  reason?: string;
}
```

Conforming clients MUST:
- Stop rendering revoked content where possible
- Stop honoring revoked capabilities
- Stop propagating revoked content to new recipients
- Record revocation in local audit logs

---

## 10. Signatures and Integrity (Normative)

### 10.1 Signature Entry

```typescript
interface SignatureEntry {
  alg: "schnorr-secp256k1" | "ed25519" | string;
  signer: PeerID;
  sig: Uint8Array;              // base64url in JSON
  on_behalf?: PeerID;           // Principal if signer is delegated
  cap?: string;                 // Capability NoteID authorizing delegation
  ts?: number;                  // Signature timestamp
}
```

### 10.2 Signing Digest (Normative)

```
body_hash = SHA-256(canonical_cbor(NoteBody))
signing_digest = SHA-256("DSN1" || 0x00 || body_hash)
```

**Signature MUST be computed over `signing_digest`.**

### 10.3 Required Signatures (Normative Minimum)

| Note Type | Minimum Required Signatures |
|---|---|
| Basic Note | Author signature |
| Delegated Note | Delegated signer + valid capability reference |
| Bilateral transition | Author + counterparty signatures, or threshold policy |
| Arbitration ruling | Arbiter or arbiter pool threshold |
| Key rotation | Old key + new key (unless recovery) |
| Circle policy change | Circle admin threshold |
| Payment settlement proof | Payment network proof or authorized signer |

### 10.4 Multisig / Threshold Policies

```typescript
interface SigPolicy {
  threshold: number;
  signers: PeerID[];
  script_ref?: string;          // Bitcoin/Taproot script reference
  timeout?: number;             // timestamp
  fallback?: SigPolicy;
}
```

A Note is authorized if valid signatures satisfy the threshold.

### 10.5 Verification Procedure (Mandatory 10 Steps)

1. Recompute canonical CBOR of NoteBody
2. Recompute NoteID
3. Confirm supplied NoteID matches recomputed ID
4. Recompute signing digest
5. Verify each signature against stated algorithm and signer key
6. Resolve PeerID to public key
7. Validate delegation capabilities if present
8. Validate timestamp freshness and replay policy
9. Validate size limits and schema safety
10. **Reject if any mandatory check fails**

### 10.6 Algorithm Agility

**Mandatory baseline:** `schnorr-secp256k1` over SHA-256.

**Recommended:** `ed25519`.

Implementations MAY support additional algorithms if canonicalized safely. Unknown mandatory algorithms → verification failure (not silent acceptance).

---

## 11. Natural Language Interface & LM Intent Contract (Normative)

### 11.1 Intent Pipeline (8 Steps)

```
User intent
  → LM or form produces IntentDraft
  → Deterministic validation
  → Ambiguity resolution
  → Human-readable preview
  → Risk classification
  → Explicit confirmation
  → Signing and local persistence
  → Optional publication
```

### 11.2 IntentDraft

```typescript
interface IntentDraft {
  source_text?: string;
  proposed_body: NoteBody;
  unresolved: string[];         // Field names
  confidence?: number;
  warnings: string[];
  provenance: {
    model?: string;
    generated_at?: number;
    tool?: string;
  };
}
```

### 11.3 LM Output Rules (Normative)

**System MUST NOT:**
- Accept LM output without deterministic validation
- Execute instructions embedded in remote Notes
- Silently publish, pay, delegate, delete, or automate
- Resolve ambiguous fields by guessing when risk is material
- Render remote content as executable logic

**System MUST:**
- Validate canonical structure
- Validate typed values
- Reject unsafe extensions
- Show human-readable summary
- Label machine-generated proposals
- Require explicit confirmation for risky actions
- Preserve audit metadata

### 11.4 Ambiguity Handling (MUST Trigger One Of)

1. Clarification request
2. User selection from alternatives
3. Explicit user override
4. Draft preservation without publication

**Examples:**

| User Phrase | Ambiguity | Required Handling |
|---|---|---|
| "near me" | Location source | Require location consent or manual place |
| "$200" | Currency | Infer from profile if safe, otherwise ask |
| "soon" | Time | Propose concrete time for confirmation |
| "cheap" | Budget | Propose numeric constraint or ask |
| "pay a peer" | Amount/asset | Require explicit amount and currency |

### 11.5 Risk Classes (Normative)

| Risk Class | Examples | Confirmation Requirement |
|---|---|---|
| Local low risk | Create private task, local note | Optional lightweight confirmation |
| Social | Send message, publish public note | Explicit confirm |
| Financial | Payment, invoice, escrow | Strong confirm + authentication |
| Delegation | Grant agent capability, subkey | Strong confirm + scope display |
| Destructive | Tombstone, block, revoke | Explicit confirm |
| Automated | Agent performs external action | Policy approval + action confirm or dry-run |

### 11.6 Provenance (Advisory)

```json
"ext:dsn:provenance": {
  "lm": true,
  "model": "...",
  "confidence": 0.86
}
```

Not authoritative. MUST NOT bypass validation.

---

## 12. Auto-Generated UI Contract (Normative)

### 12.1 Rendering Rules

| Situation | Required UI Behavior |
|---|---|
| Known Note type | Render ontology-defined view |
| Unknown Note type | Generic read-only structured view |
| Unknown property | Display as read-only labeled field |
| Unsafe value | Render as inert text or hidden until user expands |
| Machine-proposed content | Label as machine-generated |
| Remote media | Do not fetch automatically unless policy permits |
| Remote code | Never execute |
| Extensions | Passive data only unless user explicitly installs trusted renderer |

### 12.2 Form Generation

Forms generated from: Note class, Property schema, Workflow state, Actor role, Visibility policy, Risk class.

**MUST** validate typed input before producing a NoteBody.

### 12.3 Action Exposure

UI actions MUST be derived from authorized transitions.

**MUST NOT expose:**
- Transitions the actor cannot authorize
- Dangerous actions without confirmation
- Private fields the user cannot decrypt
- Deleted/suppressed content except in audit view

### 12.4 Progressive Disclosure

| User Mode | Visible Features |
|---|---|
| Standard | Natural language, chat, cards, forms, simple status |
| Power | Property summaries, ontology labels, Trust Network details |
| Developer | Raw canonical view, parser debugger, transport logs, rule tracer |

Raw syntax optional for debugging/export only.

---

## 13. Semantic Matching (Normative)

### 13.1 Fact and Constraint Roles

| Note Role | Property Treatment |
|---|---|
| `request`, `search`, `need` | Properties are constraints unless marked advisory |
| `offer`, `service`, `record` | Typed properties are facts unless marked eligibility constraints |
| `attestation` | Properties are statements about target |
| `transition` | Properties describe event and authorization |

### 13.2 Matching Evaluation (Normative Algorithm)

Given Request `R` and Offer `O`:

1. Normalize typed values
2. Extract required constraints from `R`
3. Extract optional constraints from `R`
4. Extract facts from `O`
5. Evaluate each constraint
6. Compute base score:

```
base_score = satisfied_required / total_required
```

If no required constraints: `base_score = 1.0`

Optional bonus:
```
optional_bonus = sum(satisfied_optional_weight) / normalization_factor
```

Final score:
```
score = base_score * priority
```

Where `priority` from `dsn:priority`, default `0.5`.

**Recommended priorities:**
| Source | Priority |
|---|---|
| Curated/local | 1.0 |
| Imported/verified | 0.5 |
| Bulk/unverified | 0.2 |

Implementations MAY apply trust adjustments, recency, local preferences AFTER deterministic matching, but MUST NOT present a Note as matching if required constraints fail.

### 13.3 Duplicate Suppression (MUST Occur At)

- NoteID level
- SealedNoteID level
- Logical object level when `dsn:replaces` or `parents` indicates replacement
- Transport-level message IDs where available

A Note received through multiple transports is processed once.

### 13.4 Ranking Policy (Minimum Order)

1. Required constraint satisfaction
2. Priority
3. Trust-adjusted local score
4. Recency
5. Stake or endorsement (if locally trusted)
6. Deterministic NoteID tie-breaker

---

## 14. Emergent Workflows and Transitions (Normative)

### 14.1 Transition Notes

```typescript
interface TransitionNote {
  role: "transition";
  target: NoteID;                    // dsn:target
  to_state: string;                  // dsn:to_state
  from_state?: string;               // dsn:from_state
  reason?: string;                   // dsn:reason
  evidence?: string;                 // dsn:evidence (NoteID or URL)
  guard?: string;                    // dsn:guard (condition reference)
}
```

### 14.2 Transition Authorization (All Required)

1. Signed by authorized actor
2. Target exists or is resolvable
3. Target policy permits transition
4. Guard conditions satisfied
5. Countersignatures present where required
6. Does not violate revocation/suppression state

### 14.3 Transition Guards (Declarative Preconditions)

| Guard | Meaning |
|---|---|
| `payment.settled` | Payment proof valid |
| `counterparty.signed` | Counterparty signature exists |
| `arbiter.selected` | Arbiter identity bound |
| `escrow.funded` | Escrow funding proof exists |
| `quorum.reached` | Required approvals exist |
| `timeout.reached` | Current time exceeds deadline |

### 14.4 State Resolution (Normative Order)

1. Collect all valid transitions for target
2. Discard unauthorized/revoked transitions
3. Order remaining by causal parents then `created`
4. Apply latest valid transition
5. If no valid transition → infer state from predicates
6. If conflicting transitions → mark state `conflict`

### 14.5 Default Workflow Domains (Normative State Tables)

**OFFER**

| State | Inference / Transition |
|---|---|
| `active` | Offer fact exists, status active, not expired, inventory > 0 |
| `paused` | Author transition to paused |
| `sold_out` | Inventory = 0 |
| `expired` | Current time after expiry |
| `withdrawn` | Author tombstone or withdrawal transition |

**TRANSACT**

| State | Inference / Transition |
|---|---|
| `proposed` | Transaction request exists |
| `accepted` | Counterparty + author signatures or agreement transition |
| `funded` | Escrow or payment funding proof |
| `fulfilled` | Delivery confirmation transition |
| `completed` | Recipient acknowledgment or settlement proof |
| `disputed` | Dispute Note references transaction |
| `canceled` | Authorized cancellation transition |

**PAY**

| State | Inference / Transition |
|---|---|
| `invoice_issued` | Invoice Note exists |
| `pending` | Payment broadcast, insufficient confirmation |
| `confirmed` | Required confirmations reached |
| `settled` | Lightning settlement proof or on-chain finality |
| `failed` | Payment network failure proof or timeout |
| `refunded` | Refund transition + refund proof |

**REACT / Trust Network**

| State | Meaning |
|---|---|
| `endorsed` | Positive endorsement (Like) |
| `flagged` | Negative endorsement (Dislike) |
| `blocked` | Block Note by user |

**MESSAGE**

| State | Meaning |
|---|---|
| `sent` | Signed message exists |
| `delivered` | Delivery attestation |
| `read` | Read attestation (if sender requests, recipient permits) |
| `archived` | Local or shared archive transition |

**GOVERN**

| State | Meaning |
|---|---|
| `open` | Dispute created |
| `investigating` | Evidence accepted |
| `ruled` | Arbiter ruling transition |
| `appealed` | Appeal transition |
| `closed` | Final resolution |

**COLLABORATE**

| State | Meaning |
|---|---|
| `draft` | Initial version |
| `review` | Review request |
| `approved` | Approval attestations |
| `merged` | Merge transition |

**ORGANIZE**

| State | Meaning |
|---|---|
| `proposed` | Event/group proposal exists |
| `scheduled` | Time/place constraints satisfied |
| `live` | Event status live |
| `concluded` | End time passed or conclusion transition |

---

## 15. Transports and Minimum Bindings (Normative)

### 15.1 Transport Neutrality

All transports are interchangeable carriers of WireNotes, SealedNotes, and queries.

**A transport binding MUST define:**
- Note carriage
- NoteID preservation
- Duplicate suppression
- Query carriage
- Reply linkage
- Error handling
- Size limits
- Authentication or anonymity properties

### 15.2 Media Types (Mandatory)

| Media Type | Status |
|---|---|
| `application/dsn+cbor` | **Mandatory** for canonical wire exchange |
| `application/dsn+json` | Optional for developer/HTTP-friendly environments |

### 15.3 Nostr Binding

| Item | Requirement |
|---|---|
| Note kind | `35001` |
| Query kind | `35002` |
| Service/capability kind | `35003` |
| Content | base64url-encoded CBOR WireNote or Query |
| Dedupe | By Nostr event ID AND DSN NoteID |
| Reply | Tag `["reply", query_id]` or `["parent", note_id]` |

**Public indexing tags MAY include:**
```
["alt", "dsn1"]
["id", NoteID]
["role", role]
["type", class]
["author", PeerID]
["prop", key, operator, canonical_value]
```

**Private Notes MUST NOT** expose semantic indexing tags.

### 15.4 Mesh / LoRa / Meshtastic Binding

| Item | Requirement |
|---|---|
| Payload | CBOR |
| Topic/channel | `dsn/1` or namespace equivalent |
| Maximum fragment | 256 bytes recommended |
| Fragmentation | Header with `mid`, `seq`, `final` |
| Compression | Optional `zstd`; must be negotiated |
| Dedupe | By NoteID and fragment message ID |

Mesh Notes SHOULD be small. Large objects SHOULD be referenced by hash and retrieved opportunistically.

### 15.5 libp2p Binding

| Item | Requirement |
|---|---|
| Pubsub topic | `/dsn/1/notes`, `/dsn/1/queries` |
| Request protocol | `/dsn/1/req` |
| Methods | `get_note`, `get_refs`, `query`, `advertise` |
| Discovery | DHT/provider records keyed by NoteID or service capability |
| Transport | WebRTC, QUIC, TCP, Tor |
| Dedupe | By NoteID and message ID |

### 15.6 HTTP Binding

| Endpoint | Method | Purpose |
|---|---|---|
| `/dsn/v1/notes` | POST | Publish Note |
| `/dsn/v1/notes/{id}` | GET | Retrieve Note |
| `/dsn/v1/notes/{id}` | HEAD | Existence check |
| `/dsn/v1/query` | POST | Submit query Note |
| `/dsn/v1/services` | GET | Discover services |

**Requirements:**
- Content-Type: `application/dsn+cbor` or `application/dsn+json`
- PUT with NoteID is idempotent
- Responses SHOULD include `ETag` = NoteID
- Webhooks MUST be authenticated and signed

### 15.7 Local-Only Binding

Local-only mode stores Notes in local encrypted database, optionally exposes LAN discovery.

**MUST NOT** leak to external transports when private mode enabled.

---

## 16. Persistence, Sync, and Conflict Handling (Normative)

### 16.1 Core Persistence

Core persistence is **append-only and content-addressed**.

A conforming store MUST:
- Store Notes by NoteID
- Store SealedNotes by SealedNoteID
- Deduplicate identical NoteIDs
- Preserve conflicting versions
- Preserve tombstones
- Maintain outgoing queue
- Preserve causal order where possible
- Encrypt local data at rest

### 16.2 Outbox Queue

Outbound Notes queued until transport availability.

**Queue Rules:**
1. Notes published idempotently
2. Parents SHOULD be published before children when possible
3. Duplicate publication harmless but SHOULD be minimized
4. Failed publication does not mutate Note
5. User may cancel unpublished private drafts

### 16.3 Versioning

An update = new Note with:
```
parents = [previous NoteID]
```
or
```
[dsn:replaces:is:<previous NoteID>]
```

Updating does not erase the previous Note.

### 16.4 Tombstones

Deletion = tombstone Note:
```
[dsn:role:is:tombstone]
[dsn:target:is:<NoteID>]
[dsn:reason:is:<enum?>]
```

**MUST** be honored by conforming UI and matching engines unless local audit mode enabled.

Tombstones do not physically erase distributed data.

### 16.5 Conflict Handling

**Conflict exists when:**
- Two transitions target same object
- Transitions mutually exclusive
- Neither causally supersedes the other
- Both valid under different policies

**Core Rule:** Preserve both branches and mark object as conflicted.

**Resolution MAY use:**
- User choice
- Arbiter ruling
- Ontology priority
- Latest authorized transition
- Stake-weighted governance (where explicitly enabled)

> **Silent overwrite is prohibited.**

### 16.6 Real-Time CRDT Mode (Optional)

**Capability flag:** `sync.realtime`

If supported:
- Peers exchange transition heads
- Union of valid signed operations merged
- Deterministic fold derives current state
- Conflicts preserved and surfaced

If unsupported:
- Peers exchange missing versions
- Branches preserved
- No automatic destructive merge

---

## 17. Trust Network, Reputation, and Governance (Normative)

### 17.1 Endorsement Note (Trust Signal)

> **Wire format:** Uses `attestation` role with `polarity` + `weight`.

```typescript
interface EndorsementNote {
  role: "attestation";
  target: PeerID | NoteID | TransactionID | ServiceID;
  domain: string;               // Skill or context
  polarity: "positive" | "negative" | "neutral";
  weight: number;               // 0.0 - 1.0 (magnitude)
  reason?: string;              // Enum or text
  evidence?: string;            // NoteID or URL
  expires?: number;             // Timestamp
  scope?: string;               // Skill or context
}
```

**UI Labels (Normative):**
- `polarity:positive` + weight > 0 → **Like**
- `polarity:negative` + weight > 0 → **Dislike**
- `polarity:neutral` → **Note** (or hidden)

### 17.2 Trust Graph (Local, Multidimensional)

**Inputs MAY include:**
- Positive: delivery, endorsement, uptime, stake history, collaboration
- Negative: disputes, blocks, fraud reports, slashing, failed fulfillment
- Domain relevance, graph distance, circle membership, recency, revocation status

> **No mandatory global reputation score.** Trust is local and subjective.

### 17.3 Trust Privacy

Negative trust MAY be:
- Private
- Circle-only
- Selectively disclosed
- Public

**Clients MUST support private block Notes.** A private block MUST suppress content locally without requiring public harassment or disclosure.

### 17.4 Governance Workflow

**Governance objects:** Flags, Disputes, Investigations, Arbiter pools, Appeals, Rulings.

**Dispute Note MUST reference:**
- Target transaction, Note, or peer
- Evidence
- Requested outcome
- Proposed or selected arbiter

**Ruling transition MUST reference:**
- Dispute Note
- Outcome
- Escrow release or refund instruction
- Trust annotations (if any)

### 17.5 Sybil Resistance (Local, Composable)

**Signals MAY include:**
- Web-of-trust
- Staking
- Slashing
- Circle endorsement
- Token gating
- Account age
- Payment or proof-of-work rates
- Hardware attestation

> No central authority required.

---

## 18. Economics, Payments, and Escrow (Normative)

### 18.1 Monetary Units (Canonical)

```json
{"t":"money","cur":"SAT","min":1000}
{"t":"money","cur":"BTC","min":100000000}
{"t":"money","cur":"USD","min":20000}
```

`min` = integer minor units. For BTC, minor unit = satoshi.

### 18.2 Invoice Note

```
[dsn:role:is:invoice]
[dsn:target:is:<offer/transaction>]
[dsn:amount:is:<money>]
[dsn:recipient:is:<peer/payment destination>]
[dsn:expires:is:<timestamp>]
[dsn:method:in:btc|lightning|service]
```

Optional: `dsn:bolt12`, `dsn:payment_request`, `dsn:escrow_required:is:true`

### 18.3 Payment Note

```
[dsn:role:is:payment]
[dsn:invoice:is:<Invoice NoteID>]
[dsn:amount:is:<money>]
[dsn:method:is:btc|lightning|psbt|service]
[dsn:proof:is:<txid/preimage/receipt reference>]
[dsn:status:is:broadcast|confirmed|settled|failed]
```

### 18.4 Escrow Note

```
[dsn:role:is:escrow]
[dsn:transaction:is:<Transaction NoteID>]
[dsn:participants:in:<peer list>]
[dsn:arbiter:is:<peer or pool>]
[dsn:amount:is:<money>]
[dsn:conditions:is:<policy reference>]
[dsn:funding:is:<outpoint/script/taproot reference>]
[dsn:timeout:is:<timestamp>]
```

**Release conditions:** Mutual confirmation, arbiter ruling, timeout, multisig threshold, cryptographic proof of delivery.

### 18.5 Receipt Note

```
[dsn:role:is:receipt]
[dsn:payment:is:<Payment NoteID>]
[dsn:confirmations:gte:<n>]
[dsn:settled:is:true]
```

### 18.6 Refund Note

```
[dsn:role:is:refund]
[dsn:payment:is:<Payment NoteID>]
[dsn:amount:is:<money>]
[dsn:reason:is:<enum/text>]
[dsn:authorized_by:is:<peer/arbiter>]
[dsn:proof:is:<tx reference>]
```

### 18.7 Payment State Mapping

| Protocol State | Bitcoin / Lightning Meaning |
|---|---|
| `pending` | Broadcast but unconfirmed |
| `confirmed` | Required on-chain confirmations reached |
| `settled` | Lightning payment settled |
| `failed` | Payment failed or expired |
| `refunded` | Refund transaction or Lightning refund proof exists |

### 18.8 Failure Paths

If payment fails:
1. Mark payment `failed`
2. Notify transaction workflow
3. Release escrow per timeout or ruling
4. Allow dispute if parties disagree
5. Emit trust annotations only with evidence and consent

### 18.9 Service Economics

Services MAY charge peer-to-peer fees for: relay, indexing, storage, arbitration, notarization, automation, gateway access.

**The protocol itself charges no mandatory fee.**

---

## 19. Services, Hardware, and Agents (Normative)

### 19.1 Service Registration

```
[dsn:role:is:service]
[dsn:service:is:relay|indexer|storage|arbiter|notary|automation]
[dsn:endpoint:is:<transport endpoint>]
[dsn:fee:is:<money or rate>]
[dsn:sla:is:<terms reference>]
[dsn:stake:is:<reference>]
[dsn:capabilities:in:<capability list>]
```

Service registrations discoverable and revocable.

### 19.2 Capability Discovery

Peers advertise capabilities via signed capability Notes.

**Core capability flags:**
```
core.note, core.matching
transport.nostr, transport.mesh, transport.libp2p, transport.http
sync.realtime
agent.browser, agent.api
pay.btc, pay.lightning
hardware.secure_element
storage.public
arbitration.service
```

Capability discovery MUST NOT require central coordination.

### 19.3 Hardware Nodes (First-Class Peers)

**Supported classes:** Secure element, Hardware wallet, Edge compute node, LoRa router, Mobile device, Supernode.

**SHOULD support:** Device attestation, delegated session keys, offline signing, secure key storage, physical presence confirmation for high-risk actions.

### 19.4 Universal Action Agent (Optional, Capability-Gated)

**Agent Requirements:**
- Explicit user policy
- Scoped capabilities
- Dry-run mode
- Audit log
- Revocation
- Confirmation for irreversible/financial actions
- Sandboxed execution
- Treat remote content as untrusted data

**Agent actions MUST produce** signed transition or provenance Notes when altering local or network state.

---

## 20. Security, Privacy, and Abuse Mitigation (Normative)

### 20.1 Threat Model (Assume)

- Malicious Notes, malicious ontology modules
- Prompt injection attempts
- Spam and Sybil behavior
- Transport adversarial behavior
- Compromised devices
- Revoked but still-distributed content
- Unsafe automation

### 20.2 Prompt Injection Defense

**All remote Note content = untrusted data.**

Implementations MUST NOT treat remote content as instructions unless:
- User explicitly requests action
- Action within granted capability scope
- Action previewed and confirmed

Language models MUST be isolated from direct execution capabilities.

### 20.3 Rendering Safety

UI renderers MUST:
- Sandbox remote content
- Disable automatic execution
- Sanitize rich text
- Restrict media fetching
- Warn before opening external links
- Render unknown extensions as inert data

### 20.4 Extension Safety

Extensions MUST be additive and inert by default.

An extension MAY define UI/behavior ONLY IF:
- Explicitly installed/trusted by user
- Sandboxed
- Declares required capabilities
- Revocable

Unknown extensions MUST pass through without execution.

### 20.5 Spam and Rate Limiting

Local clients/services MAY apply:
- Trust-weighted rate limits
- Stake-based prioritization
- Micropayment gating
- Proof-of-work
- Circle-only policies
- Content-size limits

**No mandatory global rate limits imposed by protocol.**

### 20.6 Block and Harassment Control

```
[dsn:role:is:block]
[dsn:target:is:<peer/note/circle>]
[dsn:scope:is:<context>]
[dsn:visibility:is:private|circle|public]
```

Blocks MAY be private. Clients MUST allow blocking without public disclosure.

### 20.7 Replay Protection

Uses: Content-addressed NoteIDs, nonces, timestamps, expiry fields, transport duplicate suppression, capability expiry, revocation.

### 20.8 Automation Safety

Agents MUST NOT:
- Exceed delegated scope
- Execute remote instructions silently
- Perform payments above policy limits
- Publish private content without consent
- Modify security policy without strong confirmation

Agents SHOULD support: Dry-run, step-by-step approval, spending limits, time-bound delegation, full audit trails.

### 20.9 Privacy Metadata Minimization

When publishing:
- Public Notes: expose only intended semantic fields
- Unlisted Notes: SHOULD omit discovery tags
- Private Notes: MUST be sealed
- Circle Notes: SHOULD minimize recipient metadata
- Sealed Notes: SHOULD avoid leaking class, author, target unless policy permits

---

## 21. Conformance Profiles (Normative)

### 21.1 Core Profile (MUST)

- NoteBody canonicalization
- NoteID derivation
- secp256k1 identity
- Signature creation and verification
- Typed property model
- Basic request/offer matching
- Local content-addressed store
- Outbox queue
- Tombstones
- Public/private visibility distinction
- LM or guided-form intent pipeline with deterministic validation
- Auto-generated safe UI
- At least one transport binding
- Local encrypted-at-rest storage

### 21.2 Full Profile = Core Plus

- All listed domain Skills relevant to implementation
- Multi-transport aggregation
- Advanced Trust Network
- Disputes and governance Notes
- Payment object linkage
- Capability discovery
- Revocation handling

### 21.3 Infrastructure Profile = Full Plus

- Service registration
- Relay or indexer operation
- DHT/gossip replication
- Public query support
- SLA advertisement
- Abuse throttling

### 21.4 Hardware Profile = Full Plus

- Key delegation
- Hardware signing
- Mesh transport
- Offline-first management
- Device attestation

### 21.5 Agent Profile = Full or Hardware Plus

- Policy engine
- Scoped delegation
- Browser/API automation
- Audit logging
- Dry-run mode
- Real-time feedback

### 21.6 Realtime Profile = Full Plus

- `sync.realtime` capability
- Head exchange
- Deterministic merge/fold
- Conflict surfacing

---

## 22. Conformance Test Framework (Normative)

A conforming implementation MUST pass:

### 22.1 Canonicalization Tests

| Case | Expected Result |
|---|---|
| Reordered properties | Same canonical body and NoteID |
| Unicode NFC variants | Same NoteID after normalization |
| Duplicate semantic fields | Canonical dedupe where specified |
| Float substitution | Reject non-canonical float encoding |
| Extension addition | New NoteID; old Note remains valid |

### 22.2 Signature Tests

| Case | Expected Result |
|---|---|
| Valid author signature | Accepted |
| Modified body | Rejected |
| Unknown algorithm | Rejected |

---

## 🏗️ Architecture Layer Map (Spec → Implementation)

| Layer | Implementation | Status |
|---|---|---|
| Natural Language & UI | `ui/src/components/Editor/`, `ui/src/hooks/usePropertyExtractor.ts`, `core/src/notes/propertyExtractor.ts` | ✅ Complete |
| Semantic Ontology Engine | `core/src/matching/`, `core/src/ontology/`, `core/src/notes/parsing.ts`, `core/src/utils/matching.ts` | ✅ Complete |
| Action Agent | `agent/src/`, `agent/src/VoltBrowserCoordinator.ts`, `agent/src/core/actionExecutor.ts` | ✅ Complete (exceeds spec) |
| P2P Coordination | `core/src/network/nostr/`, `core/src/network/mesh/`, `core/src/network/networkGate.ts` | 🟡 Nostr ✅; Mesh partial |
| Transport & Persistence | `core/src/notes/notes.ts`, `core/src/utils/encoding.ts`, `ui/src/services/storage.ts` | 🟡 Local-first ✅; CBOR/NoteID 🔴 |
| Identity & Security | `core/src/security/CapabilityManager.ts`, `core/src/network/nostr/privacy.ts`, `agent/src/core/Capabilities.ts` | 🟡 Core delegation ✅; PeerID/crypto 🔴 |

---

## 📦 Package Implementation Inventory

### `@notention/core` — Protocol Kernel

| Module | Spec Coverage | Status |
|---|---|---|
| `matching/MatchEngine.ts` | §13 | ✅ Complete |
| `matching/MatchingService.ts` | §13 | ✅ Complete |
| `matching/PropertyIndex.ts` | §13 | ✅ Complete |
| `matching/matchers.ts` | §5.4–5.5, §13.2 | 🟡 Missing 4 operators, optional weighting |
| `notes/parsing.ts` | §5, §5.6 | ✅ Complete (3 parser strategies) |
| `notes/properties.ts` | §5.1 | ✅ Complete |
| `notes/notes.ts` | §4.2, §4.4, §14.5 (intent) | 🟡 UUID not content-addressed; no transition type |
| `notes/conflicts.ts` | §16.5 | ✅ Complete |
| `notes/quantities.ts` | §5.3, §18.1 | 🟡 Types only; not wired to parser/matcher |
| `notes/queryBuilder.ts` | §13, §15.3 | 🟡 Query Note construction only |
| `notes/NoteFilter.ts` | §9.1, §13 | ✅ Privacy/tag filtering |
| `ontology/ontologyService.ts` | §6.1, §6.2, §12.2 | ✅ Complete |
| `ontology/ontologyHelpers.ts` | §6.1, §6.3, §6.4, §14.5 | ✅ Complete |
| `ontology/ontology.default.ts` | §6.5 | ✅ 5 domains, 50+ attributes |
| `ontology/propertyAliases.ts` | §5.2 | ✅ Complete |
| `skills/BaseSkill.ts` | §2.4, §6.5, §19.4 | 🟡 Runtime skill base; not signed/versioned Notes |
| `skills/*Skill.ts` (5 skills) | §6.5, §19.4 | 🟡 5/10 domain skills implemented |
| `skills/skillExecutor/` | §19.4 | ✅ Sandbox execution |
| `skills/skillPatternMatcher.ts` | §11, §19.4 | ✅ Intent→skill matching |
| `skills/skillApprovalManager.ts` | §11.5, §19.4 | ✅ Approval flow |
| `skills/metaphor/` | §12, §6 | ✅ Metaphor→UI mapping |
| `network/nostr/nostr.ts` | §15.3 | 🟡 Publish/subscribe; missing query/service kinds, CBOR |
| `network/nostr/privacy.ts` | §9.2, §9.3 | 🟡 Types; not wired to publish |
| `network/nostr/discovery.ts` | §15.3, §19.1 | 🟡 Service discovery; no registration |
| `network/mesh/` | §15.4 | 🟡 Types; not integrated |
| `network/networkGate.ts` | §15.1, §9.1 | ✅ Multi-transport facade, privacy gate |
| `security/CapabilityManager.ts` | §8.6, §10.4, §19.2, §20.8 | 🟡 Runtime delegation; not Note-based |
| `patternRecognition/` | §6.1 | ✅ Co-occurrence/sequential/matching strategies |
| `tasks/` | §16.2 | 🟡 Queue exists; not transport-aware |
| `config/NoteBasedConfig.ts` | §4, §9 | ✅ Config as Notes |
| `utils/canonicalization.ts` | §7 | 🔴 Not exported/used |
| `utils/encoding.ts` | §7, §10, §15 | ✅ Hex/base64url/CBOR utilities |
| `utils/geo.ts` | §5.3, §5.4 | ✅ Haversine, geo parsing |
| `utils/inference.ts` | §6.2, §6.3 | ✅ `inferState`, derived annotations |
| `utils/validationFramework.ts` | §11.3, §22 | ✅ Schema validation framework |

### `@notention/ui` — PWA

| Feature | Spec Coverage | Status |
|---|---|---|
| Semantic Editor | §11, §12 | ✅ Complete |
| Property Extraction | §5, §11.2 | ✅ Complete |
| Auto-generated Forms | §12.2 | ✅ Complete |
| Ontology Visualizer | §12.4 | ✅ Dev mode |
| Matcher Tester | §13 | ✅ Dev mode |
| Parser Debugger | §5 | ✅ Dev mode |
| Simulator View | §6.1 | ✅ Dev mode |
| Plugin System | §12, §6 | ✅ Complete |
| Metaphor Mapper | §6, §12 | ✅ Complete |
| Network View | §15 | ✅ Nostr/Mesh/Local unified |
| Settings (Identity, Transport, Privacy, Dev) | §8, §9, §15, §12.4 | ✅ Complete |
| Progressive Disclosure (3 modes) | §12.4 | ✅ Complete |
| Dual Mode (Local-First / Server) | §3, §15.7 | ✅ Complete |

### `@notention/agent` — Universal Action Agent

| Capability | Spec Coverage | Status |
|---|---|---|
| `core.note` | §4, §16 | ✅ Via `core/notes` |
| `core.matching` | §13 | ✅ Via `core/matching` |
| `transport.nostr` | §15.3 | ✅ Via `core/network/nostr` |
| `transport.mesh` | §15.4 | 🟡 Types only |
| `transport.http` | §15.6 | 🟡 Server endpoints |
| `agent.browser` | §19.4 | ✅ Playwright via `VoltBrowserCoordinator` |
| `agent.api` | §19.4 | ✅ MCP tool registry |
| `pay.btc` / `pay.lightning` | §18, §19.2 | 🔴 Types only |
| `hardware.secure_element` | §19.3, §20.8 | 🔴 Types only |
| `sync.realtime` | §16.6 | 🔴 Planned |

**Agent Safety (§20.8):** ✅ Dry-run, scoped delegation, audit log, sandboxed execution, confirmation, untrusted remote content

### `@notention/cli` — Agentic TUI

| Feature | Spec Coverage | Status |
|---|---|---|
| Interactive session | §11, §19.4 | ✅ |
| Property extraction (`/extract`) | §5, §11.2 | ✅ |
| Simulation (`/run`) | §6.1 | ✅ |
| Security scan (`/security scan`) | §20 | ✅ |
| Provider switching (`/provider`) | §11 | ✅ |
| Context awareness (`/open`) | §19.4 | ✅ |
| Auto-server startup | §19.4 | ✅ |

### `@notention/simulator` — Multi-Agent Test Lab

| Feature | Spec Coverage | Status |
|---|---|---|
| Movie Studio UI | §6.1 | ✅ Web UI at localhost:3000 |
| Scenario configuration | §6.1, §14.5 | ✅ Gig Economy, Marketplace, custom |
| Live preview | §13, §14 | ✅ Real-time agent screens + logs |
| Video recording | — | ✅ MP4 library |
| CLI scenarios | §6.1 | ✅ Legacy CLI |

---

## 🎯 Conformance Profile Status (Spec §21)

| Profile | Spec Requirements | Implementation Status |
|---|---|---|
| **Core** (§21.1) | 14 requirements | 🟡 **8/14** — Missing: canonical CBOR, content-addressed NoteID, native PeerID, protocol signatures, typed properties, content-addressed store, outbox transport-aware, tombstone Notes, LM validation pipeline |
| **Full** (§21.2) | Core + 7 requirements | 🟡 **Partial** — Missing: all domain skills, multi-transport aggregation, Trust Network, disputes/governance, payment objects, capability discovery, revocation handling |
| **Infrastructure** (§21.3) | Full + 6 requirements | 🔴 **0/6** — Service registration, relay/indexer, DHT/gossip, public query, SLA advertisement, abuse throttling |
| **Hardware** (§21.4) | Full + 5 requirements | 🟡 **1/5** — Mesh transport types; missing: key delegation, hardware signing, offline-first mgmt, device attestation |
| **Agent** (§21.5) | Full/Hardware + 7 requirements | ✅ **7/7** — Policy engine, scoped delegation, browser/API automation, audit logging, dry-run, real-time feedback |
| **Realtime** (§21.6) | Full + 4 requirements | 🔴 **0/4** — `sync.realtime` capability, head exchange, deterministic merge/fold, conflict surfacing |

---

## 🧪 Conformance Test Coverage (Spec §22)

| Category | Spec Cases | Implementation |
|---|---|---|
| **Canonicalization** | Reorder props, NFC variants, dedupe, float reject, extension add | 🔴 **0/5** — No CBOR canonicalization |
| **Signatures** | Valid author, modified body, unknown algorithm | 🟡 **1/3** — Nostr event signing tested; protocol sigs not tested |
| **Matching** | Required/optional constraints, priority, trust, aliases, geo, ranges | ✅ **Complete** — `MatchEngine.test.ts`, `MatchingService.test.ts`, `PropertyIndex.test.ts` |
| **Transport** | Nostr publish/subscribe, mesh fragmentation, HTTP endpoints | 🟡 **Partial** — Nostr integration tests; mesh/HTTP not tested |
| **Skills** | Execution, approval, pattern matching, dynamic skills | ✅ **Complete** — Skill tests exist |
| **Agent Safety** | Dry-run, scope enforcement, audit log, sandbox, confirmation | 🟡 **Partial** — Some tests; not comprehensive |
| **UI Rendering** | Forms, editor, progressive disclosure, metaphors | 🟡 **Component tests only** — No E2E |

---

## 📝 Semantic Syntax: Complete Spec vs. Implementation

### Property Format

| Format | Spec (§5.6) | Implemented | Parser Strategy |
|---|---|---|---|
| Canonical | `[key:op:value]` | ✅ | `ColonFormatStrategy` |
| Symbolic | `[key op value]` | ✅ | `SymbolicFormatStrategy` |
| Word | `[key is value]` | ✅ | `WordFormatStrategy` |

### Operators (Spec §5.4 → Implementation)

| Spec Operator | Code | Symbolic | Word | Implemented | Matcher |
|---|---|---|---|---|---|
| Equal | `eq` | `is` | `is` | ✅ | `evaluateString/Number/Enum` |
| Not equal | `ne` | `not` | `is not` / `not` | ✅ | `evaluateString` (negative) |
| Contains | `inc` | `∋` | `contains` | ✅ | `evaluateString` (partial) |
| Approximate | `approx` | `≈` | — | 🔴 **Missing** | — |
| Geo near | `near` | `@` | `near` / `is near` | ✅ | `evaluateGeo` |
| Less than | `lt` | `<` | `less than` | ✅ | `evaluateNumber` |
| Less or equal | `lte` | `<=` | `less than or equal` | ✅ | `evaluateNumber` |
| Greater than | `gt` | `>` | `greater than` | ✅ | `evaluateNumber` |
| Greater or equal | `gte` | `>=` | `greater than or equal` | ✅ | `evaluateNumber` |
| Range | `range` | `<>` | `between` / `range` | ✅ | `evaluateNumberRange` |
| In set | `in` | `in` | — | 🔴 **Missing** | — |
| Intersects | `inter` | `∩` | — | 🔴 **Missing** | — |
| Exists | `exists` | `?` | — | 🔴 **Missing** | — |

### Typed Values (Spec §5.3 → Implementation)

| Spec Type | Canonical JSON | Implemented | Notes |
|---|---|---|---|
| Text | `{"t":"text","v":"..."}` | 🔴 | Strings only |
| Enum | `{"t":"enum","v":"dsn:..."}` | 🔴 | Strings only |
| Integer | `{"t":"int","v":123}` | 🔴 | Strings only |
| Decimal | `{"t":"dec","v":"1.23"}` | 🔴 | Strings only |
| Boolean | `{"t":"bool","v":true}` | 🔴 | Strings only |
| DateTime | `{"t":"time","v":1767225600000}` | 🔴 | ISO strings in `createdAt` |
| Duration | `{"t":"dur","v":3600000}` | 🔴 | Not implemented |
| GeoPoint | `{"t":"geo","lat":"...","lon":"...","acc":50}` | 🟡 | `parseGeo` in matcher only |
| Money | `{"t":"money","cur":"USD","min":20000}` | 🔴 | `Quantity` type exists |
| Quantity | `{"t":"qty","v":3,"u":"count"}` | 🟡 | `Quantity` type in `quantities.ts` |
| Reference | `{"t":"ref","kind":"note","v":"note:..."}` | 🔴 | Nostr event IDs only |
| Bytes | `{"t":"bytes","v":"base64url"}` | 🔴 | Not implemented |
| Array | `{"t":"arr","v":[...]}` | 🟡 | Multiple values in `Property.values[]` |

**All typed value normalization (§5.3) missing** — parser produces string arrays only.

### Namespaces (Spec §5.2)

| Prefix | Spec | Implemented |
|---|---|---|
| `dsn:` | Core protocol | ✅ Hardcoded in ontology |
| `skill:` | Skill-defined | 🟡 Via skill registration |
| `ext:` | Public extensions | ✅ Pass-through |
| `local:` | Private local-only | ✅ Pass-through |
| Custom IRI | Any absolute IRI | ✅ Pass-through (no validation) |

---

## 🔐 Identity & Security: Complete Map

| Feature | Spec | Implemented | Gap |
|---|---|---|---|
| **Native PeerID** (§8.1) | `peer:<hash>`, alg agility | 🔴 | Uses `nostr:<pubkey>` / `mesh:<nodeid>` |
| **DID aliases** (§8.2) | `did:<method>:<id>` | 🔴 | No resolver |
| **Nostr aliases** (§8.2) | `nostr:<npub>` | ✅ | Used as primary identity |
| **Bitcoin aliases** (§8.2) | BIP-84/86 derivation | 🔴 | — |
| **BOLT-12 aliases** (§8.2) | Lightning identity | 🔴 | — |
| **DNS/HTTPS aliases** (§8.2) | Signed alias attestation | 🔴 | — |
| **Key rotation Notes** (§8.4) | Dual-signed rotation Note | 🔴 | — |
| **Social recovery** (§8.5) | Guardian threshold Notes | 🔴 | — |
| **Delegation as Notes** (§8.6) | CapabilityNote with full fields | 🟡 | Runtime `CapabilityManager` only |
| **SealedNote envelope** (§9.3) | xchacha20poly1305, recipients[] | 🟡 | Types in `privacy.ts`; not wired |
| **Circle keys** (§9.4) | Shared/per-member/rotating | 🔴 | — |
| **Token gating** (§9.5) | GatePolicy with proofs | 🔴 | — |
| **Revocation Notes** (§9.6, §10.4) | Revocation Note, client obligations | 🔴 | Runtime `revoke()` only |
| **Protocol signing digest** (§10.2) | `SHA-256("DSN1"||0x00||body_hash)` | 🔴 | Depends on canonical CBOR |
| **Required signatures per type** (§10.3) | 7 Note types with minimums | 🔴 | — |
| **Multisig/threshold** (§10.4) | SigPolicy with threshold/script | 🔴 | — |
| **Verification procedure** (§10.5) | 10 mandatory steps | 🔴 | — |
| **Algorithm agility** (§10.6) | schnorr-secp256k1 mandatory, ed25519 recommended | 🟡 | secp256k1 via Nostr only |

---

## 🌐 Transport Bindings: Complete Map

| Binding | Spec Requirements | Implemented | Gaps |
|---|---|---|---|
| **Nostr** (§15.3) | Kind 35001/35002/35003, CBOR, dedupe, reply, indexing tags | 🟡 | Kind 35000 used; query/service kinds missing; CBOR missing; NoteID dedupe missing |
| **Mesh/LoRa** (§15.4) | CBOR, topic `dsn/1`, 256B fragments, header, zstd, dedupe | 🟡 | Types only; not integrated |
| **libp2p** (§15.5) | Pubsub topics, request protocol, methods, discovery, transports, dedupe | 🔴 | — |
| **HTTP** (§15.6) | 5 endpoints, CBOR/JSON, idempotent PUT, ETag, signed webhooks | 🟡 | Server partial; client missing; CBOR missing |
| **Local-only** (§15.7) | Encrypted DB, optional LAN, no external leak | ✅ | `localforage` + private mode |

---

## 🔑 Critical Path: What Blocks Everything Else

| Blocker | Spec Section | Depends On | Blocks |
|---|---|---|---|
| **Canonical CBOR encoding** | §7 | — | NoteID (§4.3), Signing digest (§10.2), Content-addressed store (§16.1), Dedupe (§13.3), Transport CBOR (§15.2) |
| **Content-addressed NoteID** | §4.3 | §7 | Note identity, versioning (§16.3), conflict detection (§16.5), transport dedupe (§15.3) |
| **Protocol signing** | §10.2 | §7, §4.3 | Signature verification (§10.5), delegation (§8.6), transition auth (§14.2) |
| **Typed property values** | §5.3 | §7 (canonical form) | Money/geo/datetime matching (§5.4, §13), payment objects (§18) |
| **SealedNote wiring** | §9.3 | §7, §10 | Private/circle/allowlist/gated visibility (§9.1), circle keys (§9.4) |
| **Transition Note type** | §14.1 | §4, §10 | All workflow domains (§14.5), state resolution (§14.4) |
| **Trust/Endorsement Notes** | §17.1 | §4, §10 | Trust Network (§17.2), governance (§17.4), Sybil (§17.5) |
| **Payment Notes** | §18.2–18.6 | §5.3 (money), §10 | Escrow (§18.4), receipts (§18.5), refunds (§18.6) |

---

## 📋 Actionable Gap List (Prioritized by Dependency)

### Tier 0: Foundation (Unblocks Everything)
1. **Deterministic CBOR canonicalization** (`utils/canonicalization.ts` → export + use)
2. **Content-addressed NoteID** (SHA-256 of canonical CBOR NoteBody)
3. **Protocol signing digest + verification** (DSN1 domain separation)

### Tier 1: Core Protocol Completeness
4. **Typed property values** (parser → typed `Property.v`; matcher → typed evaluation)
5. **Missing operators**: `approx`, `in`, `inter`, `exists`
6. **SealedNote publish integration** (wire into `publishNoteToNostr`, `NetworkGate`)
7. **Transition Note type + workflow engine** (authorization, guards, state resolution)
8. **Tombstone Note type** (replace `deletedAt` field)
9. **Native PeerID format** (`peer:<hash>`) + alias resolution framework

### Tier 2: Full Profile Features
10. **Trust Network**: Endorsement Note type (`role:endorsement`, `weight:±`, `domain`), local graph computation
11. **Payment objects**: Invoice, Payment, Escrow, Receipt, Refund Notes + state machine
12. **Service registration** (Note-based) + capability advertisement
13. **Mesh transport integration** (CBOR, fragmentation, `NetworkGate`)
14. **HTTP client binding** (CBOR, endpoints)
15. **Revocation Notes** (for capabilities, aliases, circle membership)

### Tier 3: Advanced / Infrastructure
16. **CRDT real-time sync** (head exchange, deterministic fold)
17. **libp2p transport binding**
18. **Hardware device attestation**
19. **Governance workflow** (disputes, arbiter pools, rulings)
20. **Sybil resistance signals** (local computation)
21. **Extension sandbox** (capability declaration, revocation)

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

## 📚 Key Documentation

| Document | Purpose |
|---|---|
| **This file** | Complete specification + implementation guide |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | High-level architecture & design decisions |
| [`AGENTS.md`](./AGENTS.md) | Coding guidelines for contributors |
| [`core/src/ontology/ontology.default.ts`](./core/src/ontology/ontology.default.ts) | Built-in ontology (5 domains) |
| [`ui/Ontology.md`](./ui/Ontology.md) | Gardener & emergent ontology guide |
| [`cli/README.md`](./cli/README.md) | CLI usage & configuration |
| [`simulator/README.md`](./simulator/README.md) | Simulator & Movie Studio guide |

---

## 🤝 Contributing

1. Read [`AGENTS.md`](./AGENTS.md) for coding guidelines
2. Follow **this specification** (normative sections 0–22)
3. Write tests for new features (vitest + Playwright)
4. Ensure canonicalization passes for any Note changes
5. Update this document when implementation status changes

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

- **Architecture:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **Issues:** GitHub Issues
- **Discussions:** GitHub Discussions

---

*This document is the complete specification and implementation guide for the Decentralized Semantic Network Protocol v1.0. All normative requirements (Sections 0–22) are included inline. Implementation status reflects the Notention codebase as of the current commit. Use the Critical Path and Tiered Gap List to prioritize work toward full conformance.*