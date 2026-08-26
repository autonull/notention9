# 🌐 Decentralized Semantic Network

## Unified, implementation-neutral protocol architecture specification

### Version 1.0 — self-contained normative revision

---

## 0\. 📜 Normative Language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this specification are to be interpreted as described in RFC 2119\.

A conforming implementation MUST fail closed when validation, authorization, signature verification, or privacy enforcement cannot be completed safely.

---

## 1\. 🎯 Core Philosophy

The Decentralized Semantic Network is a peer-to-peer, permissionless semantic environment where **everything is a Note**.

Users interact through natural language, guided forms, and auto-generated interfaces. The underlying semantic syntax is an internal wire format managed by language models, validators, and inference engines. Users are never required to author raw semantic syntax.

### 1.1 Guiding Principles

| Principle | Practical Meaning |
| :---- | :---- |
| 🛡️ **Private by Default** | Local data is encrypted at rest. Network publication requires explicit consent. |
| 🧠 **Single-User Utility First** | The system MUST be fully useful offline as a semantic notebook, personal knowledge base, task manager, and local agent. |
| 🎯 **Universal Matching** | Peers and objects are matched by semantic compatibility and constraint satisfaction, not keyword spam. |
| 🧩 **Skills as Translators** | Domain logic is expressed as declarative ontology modules and inference rules, not hardcoded application screens. |
| 📝 **Everything is a Note** | Projects, tasks, products, identities, payments, disputes, attestations, transitions, policies, and capabilities are uniformly represented as content-addressed Notes. |
| 🚫 **Zero Gatekeepers** | No administrator is required. Participation begins with key generation. |
| ♻️ **Immutable Notes, Inferred State** | Notes are immutable signed assertions. Lifecycle state is inferred from Notes, transitions, and predicates. |
| 🤖 **LM Advisory, Validator Authoritative** | Language models propose structured intent. Deterministic validation and user consent authorize actions. |
| 🧱 **Transports Are Interchangeable** | Nostr, mesh, libp2p, HTTP, local storage, and future bindings carry the same canonical Note object. |

---

## 2\. 🧠 Breakthrough Architecture Invariants

This specification adopts the following simplifying invariants to reduce architectural complexity while preserving full functionality.

### 2.1 Four Primitive Semantic Functions

All higher-level workflows are expressible using four semantic functions:

| Function | Meaning | Examples |
| :---- | :---- | :---- |
| **Fact** | An assertion about reality. | Offer, product, identity, receipt, service registration. |
| **Constraint** | A desired condition or requirement. | Search, request, task requirement, budget limit, deadline. |
| **Attestation** | A signed statement about another object. | Rating, endorsement, block, dispute, delivery confirmation. |
| **Transition** | An authorized state-changing event. | Acceptance, payment settlement, cancellation, delivery confirmation, arbitration ruling. |

Domain workflows are not rigid state machines. They are **ontology-driven inferences** over these primitives.

### 2.2 No Mutable Notes

A Note is immutable. Updating, completing, canceling, disputing, or deleting an object is represented by a new signed Note referencing the target.

Benefits:

- Deterministic content addressing.  
- Append-only auditability.  
- Offline conflict preservation.  
- Simple transport synchronization.  
- No destructive overwrites.

### 2.3 State Is Inference, Not Storage

Lifecycle state is not a mutable database field. State is inferred from:

1. Explicit signed transition Notes.  
2. Ontology predicates.  
3. Attestations.  
4. Time and cryptographic proof.  
5. Local policy.

Explicit authorized transitions override inferred state unless invalid, revoked, or conflicting.

### 2.4 Skills Are Declarative Ontology Modules

A **Skill** is not executable application code. It is a signed, versioned ontology module containing:

- Classes.  
- Property schemas.  
- Value constraints.  
- UI hints.  
- State predicates.  
- Transition rules.  
- Matching heuristics.  
- Automation policies.

Skills may be local, community-published, or vendor-provided. They MUST be treated as untrusted data unless explicitly trusted by the user or implementation.

---

## 3\. 🏗️ Architecture Layers

| Layer | Function | Core Concepts |
| :---- | :---- | :---- |
| 🗣️ **Natural Language & UI** | Human interaction without raw syntax exposure. | Intent capture, structured draft generation, preview, confirmation, auto-generated forms. |
| 🧠 **Semantic Ontology Engine** | Canonical translation, inference, and matching. | Typed properties, fact/constraint evaluation, state predicates, ontology modules. |
| ⚡ **Action Agent** | Optional execution layer. | Browser/API automation, policy engine, scoped delegation, audit logs. |
| 🌐 **P2P Coordination** | Censorship-resistant publication and discovery. | Smart matching, privacy controls, trust graph, service registry. |
| 📡 **Transport & Persistence** | Carriage and storage. | Nostr, mesh, libp2p, HTTP, local-only, content-addressed store, queued broadcast. |
| 🔐 **Identity & Security** | Authorization, privacy, and abuse resistance. | Keys, delegation, rotation, sealing, revocation, sandboxing. |

---

## 4\. 📝 Unified Note Model

### 4.1 Note Envelope

A published Note is transported as a **WireNote**.

WireNote \= {

  id:         NoteID,

  body:       NoteBody,

  signatures: \[Signature\],

  seals:      \[Seal\]?

}

For encrypted publication, the WireNote is wrapped in a **SealedNote** envelope as defined in Section 9\.

### 4.2 Note Body

The NoteBody is the canonical signed payload.

| Field | Type | Required | Description |
| :---- | ----: | ----: | :---- |
| `v` | integer | ✅ | Protocol version. MUST be `1`. |
| `author` | PeerID | ✅ | Author identity. |
| `created` | integer | ✅ | Creation time in Unix milliseconds UTC. |
| `nonce` | bytes | ✅ | 128-bit random value, base64url-encoded in JSON. |
| `types` | array of IRIs | ✅ | Ontology classes. At least one required. |
| `parents` | array of NoteIDs | ❌ | Causal or replacement references. |
| `props` | array of Property | ❌ | Semantic property objects. |
| `policy` | Policy | ❌ | Visibility, signature, and workflow policy metadata. |
| `ext` | map | ❌ | Additive extension fields. |

The NoteBody MUST NOT include transport metadata, local index data, signatures, or derived annotations.

### 4.3 Note ID

NoteID \= "note:" \+ base64url(SHA-256(canonical\_cbor(NoteBody)))

The NoteID is deterministic, content-addressed, and independent of transport.

Two Notes with different NoteIDs are distinct objects even if semantically similar. Logical replacement, duplication, and conflict are expressed through `parents`, properties, transitions, and inference.

### 4.4 Base Semantics

Every Note inherits the following behaviors:

- **Immutability**: The NoteBody cannot be modified after signing.  
- **Versioning**: Updates are new Notes referencing prior Notes.  
- **Lifecycle**: Derived from inference, not stored mutably.  
- **Visibility**: Controlled by policy and sealing.  
- **Extensions**: Additive only. Unknown fields MUST NOT invalidate core parsing.  
- **Provenance**: Optional advisory metadata may identify LM generation, import source, or agent action.

---

## 5\. 🧩 Property Model

Users never type raw property syntax. The property model is the internal canonical representation used by validators, matchers, transports, and inference engines.

### 5.1 Property Object

{

  "k": "dsn:price",

  "o": "lt",

  "v": {

    "t": "money",

    "cur": "USD",

    "min": 30000

  },

  "opt": {

    "optional": false,

    "weight": 1.0

  }

}

| Field | Required | Meaning |
| :---- | ----: | :---- |
| `k` | ✅ | Namespaced property key. |
| `o` | ✅ | Operator code. |
| `v` | ✅ | Typed value. |
| `opt` | ❌ | Matching, weighting, tolerance, and UI hints. |

### 5.2 Namespaces

Property keys and enum values MUST be namespace-qualified.

| Prefix | Meaning |
| :---- | :---- |
| `dsn:` | Core protocol namespace. |
| `skill:` | Skill-defined namespace. |
| `ext:` | Public extension namespace. |
| `local:` | Private local-only namespace. |
| Custom IRIs | Any absolute IRI namespace. |

Unknown namespaces MUST be accepted and passed through unless prohibited by local policy.

### 5.3 Typed Values

All property values MUST be typed.

| Type | Canonical JSON form | Normalization |
| :---- | :---- | :---- |
| Text | `{"t":"text","v":"..."}` | UTF-8, NFC. Case sensitivity determined by operator/options. |
| Enum | `{"t":"enum","v":"dsn:category.bicycle"}` | Namespace-qualified term. |
| Integer | `{"t":"int","v":123}` | Canonical integer. |
| Decimal | `{"t":"dec","v":"1.23"}` | Canonical decimal string. No floating point. |
| Boolean | `{"t":"bool","v":true}` | Canonical true/false. |
| DateTime | `{"t":"time","v":1767225600000}` | Unix milliseconds UTC. |
| Duration | `{"t":"dur","v":3600000}` | Integer milliseconds. |
| GeoPoint | `{"t":"geo","lat":"37.7749","lon":"-122.4194","acc":50}` | Decimal strings; optional accuracy in meters. |
| Money | `{"t":"money","cur":"USD","min":20000}` | ISO-4217 or `SAT`; integer minor units. |
| Quantity | `{"t":"qty","v":3,"u":"count"}` | Number plus unit. |
| Reference | `{"t":"ref","kind":"note","v":"note:..."}` | NoteID, PeerID, DID, URL, or transaction reference. |
| Bytes | `{"t":"bytes","v":"base64url"}` | Base64url, no padding. |
| Array | `{"t":"arr","v":[TypedValue...]}` | Ordered array; matching semantics defined by operator. |

Floating-point values MUST NOT appear in canonical NoteBody encoding. Geo coordinates and decimals are canonical decimal strings.

### 5.4 Operators

| Operator | Code | Symbol | Meaning |
| :---- | ----: | ----: | :---- |
| Equal | `eq` | `is` | Exact typed match. |
| Not equal | `ne` | `not` | Exclude value. |
| Contains | `inc` | `∋` | Array includes or substring contains. |
| Approximate | `approx` | `≈` | Numeric fuzzy match using tolerance. |
| Geo near | `near` | `@` | Geographic distance within radius. |
| Less than | `lt` | `<` | Ordered comparison. |
| Less or equal | `lte` | `<=` | Ordered comparison. |
| Greater than | `gt` | `>` | Ordered comparison. |
| Greater or equal | `gte` | `>=` | Ordered comparison. |
| Range | `range` | `<>` | Inclusive typed range. |
| In set | `in` | `in` | Value is member of set. |
| Intersects | `inter` | `∩` | Sets share at least one member. |
| Exists | `exists` | `?` | Property presence constraint. |

### 5.5 Operator Semantics

For a **Request Note**, properties are constraints unless explicitly marked advisory.

For an **Offer Note**, `eq`, `inc`, `in`, and typed facts are assertions. Constraints in Offers are advisory unless used as eligibility rules.

#### Positive constraints

A positive constraint is satisfied if at least one matching fact exists.

For repeated constraints with the same key and positive operator, semantics are **OR**.

Example:

category is bicycle OR category is scooter

#### Negative constraints

Negative constraints are satisfied only if no contradicting fact exists.

Repeated negative constraints with the same key are **AND**.

Example:

category not adult AND category not weapon

#### Missing facts

- Positive constraint: unsatisfied if fact absent.  
- Negative constraint: satisfied if fact absent.  
- `exists:false`: satisfied if property absent.  
- `exists:true`: unsatisfied if property absent.

#### Optional constraints

A property with `opt.optional=true` is not counted in the required constraint denominator. If satisfied, it contributes to an optional bonus score.

#### Approximation

For numeric or money values:

approx satisfies if |actual \- requested| \<= tolerance

Default tolerance is 10% of requested magnitude unless overridden by `opt.tolerance`.

For geo values, `near` requires distance less than or equal to `opt.radius_m`. Default radius is 10,000 meters unless overridden or user policy restricts location use.

### 5.6 Human-Facing Shorthand

Implementations MAY expose a debug/export shorthand:

\[price:lt:300 USD\]

\[category:is:bicycle\]

\[deadline:before:2026-12-31\]

\[location:near:me radius=5km\]

This shorthand is not normative wire syntax. It is a lossless diagnostic representation.

---

## 6\. 🧮 Ontology and Inference

### 6.1 Ontology Modules

An ontology module is a declarative document defining:

| Component | Purpose |
| :---- | :---- |
| Prefixes | Namespace mappings. |
| Classes | Note types such as `dsn:Offer`, `dsn:Task`, `dsn:Invoice`. |
| Property definitions | Allowed keys, value types, cardinality, validation rules. |
| State predicates | Conditions implying lifecycle states. |
| Transition rules | Allowed state changes, actors, guards, required signatures. |
| UI hints | Forms, views, labels, progressive disclosure. |
| Matching hints | Weights, ranking, optional fields. |
| Automation policy | Agent permissions and confirmation requirements. |

Ontology modules MUST be versioned and content-addressed.

### 6.2 Inference Engine

The inference engine takes:

- Local Notes.  
- Received Notes.  
- Trusted ontology modules.  
- Local policy.  
- Current time.

It produces **derived annotations**:

DerivedAnnotation \= {

  target: NoteID,

  key:   IRI,

  value: TypedValue,

  rule:  RuleID,

  confidence: number?,

  inferred\_at: timestamp

}

Derived annotations are not signed by default. They MUST NOT be treated as authoritative unless separately attested by a signed Note.

### 6.3 Inference Precedence

When determining lifecycle state:

1. Valid explicit transition Notes.  
2. Valid cryptographic settlement proofs.  
3. Ontology state predicates.  
4. Heuristic annotations.  
5. Local user override.

If two explicit transitions conflict, the Note is in a **conflict state** until resolved by user action, arbitration, or a higher-authority transition.

### 6.4 State Predicates

A state predicate is a declarative condition implying a lifecycle state.

| Inferred State | Example Predicate |
| :---- | :---- |
| `active` | `[dsn:role:is:offer]`, `[dsn:status:is:active]`, `[dsn:expires:after:now]`, `[dsn:inventory:gt:0]` |
| `sold_out` | `[dsn:role:is:offer]`, `[dsn:inventory:is:0]` |
| `pending` | `[dsn:role:is:transaction]`, `[dsn:agreement:exists:false]` |
| `accepted` | `[dsn:role:is:transaction]`, `[dsn:agreement:is:signed]` |
| `fulfilled` | `[dsn:role:is:transaction]`, `[dsn:delivery:is:confirmed]` |
| `settled` | `[dsn:role:is:payment]`, `[dsn:confirmations:gte:3]` OR `[dsn:lightning_status:is:settled]` |
| `disputed` | `[dsn:role:is:dispute]`, `[dsn:status:is:open]` |
| `suppressed` | Valid tombstone Note references target. |

### 6.5 Domain Skills

Skills provide domain ontologies and inference templates. They do not impose mandatory global state machines.

| Skill | Domain | Example Inferred States |
| :---- | :---- | :---- |
| 📢 **OFFER** | Catalog, marketplace | active, paused, sold\_out, expired |
| 🤝 **TRANSACT** | Exchange | proposed, accepted, fulfilled, completed, disputed |
| 💸 **PAY** | Payments | invoiced, pending, confirmed, settled, failed, refunded |
| ⭐ **REACT** | Trust and reputation | endorsed, flagged, blocked |
| 🔗 **CONNECT** | Identity and relationships | invited, mutual, revoked |
| 💬 **MESSAGE** | Communications | sent, delivered, read, archived |
| ⚖️ **GOVERN** | Disputes and arbitration | open, investigating, ruled, appealed, closed |
| 📝 **COLLABORATE** | Knowledge work | draft, review, approved, merged |
| 🏛️ **ORGANIZE** | Groups and events | proposed, scheduled, live, concluded |
| 🤖 **AGENT** | Automation | proposed, authorized, running, completed, failed |

---

## 7\. 🧾 Canonicalization

Interoperable NoteIDs and signatures require deterministic canonicalization.

### 7.1 Canonical Encoding

The canonical encoding is deterministic CBOR.

Rules:

1. Use definite-length CBOR only.  
2. Map keys are sorted bytewise lexicographically.  
3. No duplicate map keys.  
4. No undefined values.  
5. No floating-point values.  
6. Text is UTF-8 in Unicode NFC form.  
7. Integers use minimal CBOR integer encoding.  
8. Decimal values are canonical strings without exponent notation.  
9. Arrays preserve order unless the field is defined as a set.  
10. Set-like fields (`types`, `parents`, repeated semantic duplicates where order is not meaningful) are sorted and deduplicated.  
11. Property arrays are sorted by:  
12. key,  
13. operator,  
14. canonical typed value,  
15. canonical options.

### 7.2 Canonical Field Rules

| Field | Rule |
| :---- | :---- |
| `v` | Integer. |
| `author` | Text PeerID. |
| `created` | Integer Unix milliseconds. |
| `nonce` | Byte string. |
| `types` | Sorted unique IRIs. |
| `parents` | Sorted unique NoteIDs. |
| `props` | Sorted canonical Property objects. |
| `policy` | Canonical map. |
| `ext` | Canonical map; unknown fields preserved. |

### 7.3 Hash Target

The hash target is the canonical CBOR encoding of the NoteBody only.

Excluded from hash:

- Signatures.  
- Transport metadata.  
- Local index annotations.  
- Derived inference annotations.  
- UI state.  
- Relay timestamps.  
- Local encryption wrappers.

---

## 8\. 🆔 Identity, Keys, and Delegation

### 8.1 Native PeerID

The native identifier is derived from a public key.

For secp256k1:

peer:\<base64url(sha256(compressed secp256k1 pubkey))\>

For algorithm agility:

peer:secp256k1:\<hash\>

peer:ed25519:\<hash\>

The unqualified `peer:<hash>` form denotes secp256k1 for backward compatibility.

### 8.2 Alias Forms

| Alias | Resolution |
| :---- | :---- |
| `did:<method>:<id>` | DID resolver. |
| `nostr:<npub1…>` | Nostr public key or NIP-05 mapping. |
| Bitcoin address | BIP-84/BIP-86 derivation proof. |
| BOLT-12 offer | Lightning identity binding. |
| DNS/HTTPS alias | Signed alias attestation. |

Aliases are bound by signed alias Notes. Alias bindings are revocable.

### 8.3 Key Management

Implementations SHOULD support:

- Key rotation.  
- Device subkeys.  
- Agent subkeys.  
- Hardware secure elements.  
- Social recovery.  
- Delegated capabilities.  
- Revocation.

### 8.4 Key Rotation

A rotation Note MUST include:

- `dsn:role=rotation`  
- old PeerID  
- new PeerID  
- new public key  
- creation time  
- signature by old key  
- signature by new key, unless recovery procedure applies

Rotation Notes form an auditable chain.

### 8.5 Social Recovery

Recovery Notes MUST require a threshold of guardian signatures. Recovery policies are defined by the principal before loss of key access.

A recovery event MUST:

- Reference the recovery policy.  
- Include the new key.  
- Be signed by the required guardian threshold.  
- Be locally rate-limited and user-visible.

### 8.6 Delegation

Delegation is expressed as a signed capability Note.

CapabilityNote includes:

\- dsn:role=capability

\- issuer

\- subject

\- capabilities

\- constraints

\- expiry

\- revocation policy

Example capabilities:

publish.notes

send.messages

pay.max:10000 SAT

agent.browser

agent.api

manage.circle

delegate.subkey

Delegated keys MUST NOT exceed issuer scope. Delegation Notes MUST be revocable.

---

## 9\. 👁️ Visibility, Encryption, and Access Control

### 9.1 Visibility Modes

| Mode | Meaning |
| :---- | :---- |
| `private` | Encrypted to one or more self/device keys. Not published without explicit consent. |
| `circle` | Encrypted to a circle group or member key set. |
| `allowlist` | Accessible only to explicitly authorized keys. |
| `gated` | Access requires a token, payment, credential, or proof. |
| `unlisted` | Publicly readable but not indexed or advertised. |
| `public` | Publicly readable and indexable. |

Visibility metadata is advisory unless enforced cryptographically.

### 9.2 Clear versus Sealed Notes

A ClearNote MAY be used for:

- Public Notes.  
- Unlisted Notes.  
- Local encrypted-at-rest storage.

A SealedNote MUST be used when publishing private, circle, allowlist, or gated content over a transport.

### 9.3 SealedNote Envelope

SealedNote \= {

  v: 1,

  kind: "sealed",

  alg: "xchacha20poly1305" | ...,

  ephk: ephemeral public key,

  recipients: \[

    {

      kid: key identifier,

      enc\_key: encrypted content key

    }

  \],

  nonce: bytes,

  ct: ciphertext,

  tag: authentication tag,

  hint: optional policy hint

}

The ciphertext MUST contain a canonical WireNote.

SealedNoteID \= "seal:" \+ base64url(SHA-256(canonical\_cbor(SealedNote)))

After decryption, the inner NoteID is used for semantic reference, matching, and workflow.

### 9.4 Circle Keys

A circle MAY use:

- A shared group key.  
- Per-member encrypted content keys.  
- Rotating group keys.  
- External key management services.

Circle membership changes SHOULD be represented by signed circle transition Notes.

When a member is removed, the circle SHOULD rotate its group key. Revocation cannot retroactively erase already-distributed ciphertext, but conforming clients MUST stop granting future access and stop displaying newly received unauthorized content.

### 9.5 Token Gating

A gated Note includes a gate policy:

GatePolicy \= {

  issuer,

  proof\_type,

  expiry,

  condition,

  key\_release\_method

}

Proof types MAY include:

- Payment receipt.  
- Membership attestation.  
- Credential.  
- Stake.  
- Time-lock.  
- CAPTCHA-like service proof.

The gate service MUST NOT learn more than necessary to verify the proof.

### 9.6 Revocation

Revocation is expressed by a signed Note:

dsn:role=revocation

target \= NoteID | CapabilityID | AliasBinding | CircleMembership

reason \= optional

Revocation cannot recall distributed copies. Conforming clients MUST:

- Stop rendering revoked content where possible.  
- Stop honoring revoked capabilities.  
- Stop propagating revoked content to new recipients.  
- Record revocation in local audit logs.

---

## 10\. ✍️ Signatures and Integrity

### 10.1 Signature Entry

{

  "alg": "schnorr-secp256k1",

  "signer": "peer:...",

  "sig": "base64url",

  "on\_behalf": "peer:...",

  "cap": "note:capability...",

  "ts": 1767225600000

}

| Field | Required | Meaning |
| :---- | ----: | :---- |
| `alg` | ✅ | Signature algorithm. |
| `signer` | ✅ | Signing identity. |
| `sig` | ✅ | Signature bytes. |
| `on_behalf` | ❌ | Principal if signer is delegated. |
| `cap` | ❌ | Capability Note authorizing delegation. |
| `ts` | ❌ | Signature timestamp. |

### 10.2 Signing Digest

The signing digest is domain-separated:

body\_hash \= SHA-256(canonical\_cbor(NoteBody))

signing\_digest \= SHA-256("DSN1" || 0x00 || body\_hash)

The signature MUST be computed over `signing_digest`.

### 10.3 Required Signatures

| Note Type | Minimum Required Signatures |
| :---- | :---- |
| Basic Note | Author signature. |
| Delegated Note | Delegated signer signature plus valid capability reference. |
| Bilateral transition | Author and counterparty signatures, or threshold policy. |
| Arbitration ruling | Arbiter or arbiter pool threshold. |
| Key rotation | Old key and new key, unless recovery policy applies. |
| Circle policy change | Circle admin threshold. |
| Payment settlement proof | Payment network proof or authorized signer. |

### 10.4 Multisig and Threshold Policies

A signature policy MAY specify:

SigPolicy \= {

  threshold: integer,

  signers: \[PeerID\],

  script\_ref?: Bitcoin/Taproot script reference,

  timeout?: timestamp,

  fallback?: policy

}

A Note is authorized if valid signatures satisfy the threshold.

### 10.5 Verification Procedure

A verifier MUST:

1. Recompute canonical CBOR of NoteBody.  
2. Recompute NoteID.  
3. Confirm supplied NoteID matches recomputed ID.  
4. Recompute signing digest.  
5. Verify each signature against its stated algorithm and signer key.  
6. Resolve PeerID to public key.  
7. Validate delegation capabilities if present.  
8. Validate timestamp freshness and replay policy.  
9. Validate size limits and schema safety.  
10. Reject if any mandatory check fails.

### 10.6 Algorithm Agility

Mandatory baseline:

- `schnorr-secp256k1` over SHA-256.

Recommended:

- `ed25519`.

Implementations MAY support additional algorithms if canonicalized safely. Unknown mandatory algorithms MUST cause verification failure, not silent acceptance.

---

## 11\. 🗣️ Natural Language Interface and LM Intent Contract

Users do not author raw property syntax. Language models or guided interfaces produce structured drafts that are then validated deterministically.

### 11.1 Intent Pipeline

User intent

  → LM or form produces IntentDraft

  → deterministic validation

  → ambiguity resolution

  → human-readable preview

  → risk classification

  → explicit confirmation

  → signing and local persistence

  → optional publication

### 11.2 IntentDraft

IntentDraft \= {

  source\_text: string?,

  proposed\_body: NoteBody,

  unresolved: \[field\],

  confidence: number?,

  warnings: \[string\],

  provenance: {

    model?: string,

    generated\_at?: timestamp,

    tool?: string

  }

}

### 11.3 LM Output Rules

A language model MUST be treated as advisory and untrusted.

The system MUST NOT:

- Accept LM output without deterministic validation.  
- Execute instructions embedded in remote Notes.  
- Silently publish, pay, delegate, delete, or automate.  
- Resolve ambiguous fields by guessing when risk is material.  
- Render remote content as executable logic.

The system MUST:

- Validate canonical structure.  
- Validate typed values.  
- Reject unsafe extensions.  
- Show a human-readable summary.  
- Label machine-generated proposals.  
- Require explicit confirmation for risky actions.  
- Preserve audit metadata.

### 11.4 Ambiguity Handling

Ambiguity MUST trigger one of:

1. Clarification request.  
2. User selection from alternatives.  
3. Explicit user override.  
4. Draft preservation without publication.

Examples:

| User phrase | Ambiguity | Required handling |
| :---- | :---- | :---- |
| “near me” | Location source | Require location consent or manual place. |
| “$200” | Currency | Infer from profile if safe, otherwise ask. |
| “soon” | Time | Propose concrete time for confirmation. |
| “cheap” | Budget | Propose numeric constraint or ask. |
| “pay a peer” | Amount/asset | Require explicit amount and currency. |

### 11.5 Risk Classes

| Risk Class | Examples | Confirmation Requirement |
| :---- | :---- | :---- |
| Local low risk | Create private task, local note. | Optional lightweight confirmation. |
| Social | Send message, publish public note. | Explicit confirm. |
| Financial | Payment, invoice, escrow. | Strong confirm plus authentication. |
| Delegation | Grant agent capability, subkey. | Strong confirm plus scope display. |
| Destructive | Tombstone, block, revoke. | Explicit confirm. |
| Automated | Agent performs external action. | Policy approval plus action confirm or dry-run. |

### 11.6 Provenance

LM-generated Notes SHOULD include advisory provenance:

ext:dsn:provenance \= {

  "lm": true,

  "model": "...",

  "confidence": 0.86

}

Provenance is not authoritative and MUST NOT bypass validation.

---

## 12\. 🎨 Auto-Generated UI Contract

UI is generated from ontology, Note content, workflow state, actor permissions, and local policy.

### 12.1 Rendering Rules

| Situation | Required UI behavior |
| :---- | :---- |
| Known Note type | Render ontology-defined view. |
| Unknown Note type | Generic read-only structured view. |
| Unknown property | Display as read-only labeled field. |
| Unsafe value | Render as inert text or hidden until user expands. |
| Machine-proposed content | Label as machine-generated. |
| Remote media | Do not fetch automatically unless policy permits. |
| Remote code | Never execute. |
| Extensions | Passive data only unless user explicitly installs trusted renderer. |

### 12.2 Form Generation

Forms are generated from:

- Note class.  
- Property schema.  
- Workflow state.  
- Actor role.  
- Visibility policy.  
- Risk class.

Forms MUST validate typed input before producing a NoteBody.

### 12.3 Action Exposure

UI actions MUST be derived from authorized transitions.

The UI MUST NOT expose:

- Transitions the actor cannot authorize.  
- Dangerous actions without confirmation.  
- Private fields the user cannot decrypt.  
- Deleted or suppressed content except in audit view.

### 12.4 Progressive Disclosure

| User mode | Visible features |
| :---- | :---- |
| Standard | Natural language, chat, cards, forms, simple status. |
| Power | Property summaries, ontology labels, trust details. |
| Developer | Raw canonical view, parser debugger, transport logs, rule tracer. |

Raw syntax is optional for debugging and export only.

---

## 13\. 🎯 Semantic Matching

### 13.1 Fact and Constraint Roles

| Note Role | Property Treatment |
| :---- | :---- |
| `request`, `search`, `need` | Properties are constraints unless marked advisory. |
| `offer`, `service`, `record` | Typed properties are facts unless marked eligibility constraints. |
| `attestation` | Properties are statements about target. |
| `transition` | Properties describe event and authorization. |

### 13.2 Matching Evaluation

Given a Request Note `R` and Offer Note `O`:

1. Normalize typed values.  
2. Extract required constraints from `R`.  
3. Extract optional constraints from `R`.  
4. Extract facts from `O`.  
5. Evaluate each constraint.  
6. Compute base score.

base\_score \= satisfied\_required / total\_required

If no required constraints exist:

base\_score \= 1.0

Optional bonus:

optional\_bonus \= sum(satisfied\_optional\_weight) / normalization\_factor

Final score:

score \= base\_score \* priority

where `priority` is taken from `dsn:priority`, defaulting to `0.5`.

Recommended priority values:

| Source | Priority |
| :---- | ----: |
| Curated/local | 1.0 |
| Imported/verified | 0.5 |
| Bulk/unverified | 0.2 |

Implementations MAY apply trust adjustments, recency adjustments, and local preferences after deterministic matching, but MUST NOT present a Note as matching if required constraints fail.

### 13.3 Duplicate Suppression

Duplicate suppression MUST occur at:

- NoteID level.  
- SealedNoteID level.  
- Logical object level when `dsn:replaces` or `parents` indicates replacement.  
- Transport-level message IDs where available.

A Note received through multiple transports is processed once.

### 13.4 Ranking Policy

Minimum ranking order:

1. Required constraint satisfaction.  
2. Priority.  
3. Trust-adjusted local score.  
4. Recency.  
5. Stake or endorsement, if locally trusted.  
6. Deterministic NoteID tie-breaker.

---

## 14\. 🔄 Emergent Workflows and Transitions

### 14.1 Transition Notes

A transition is an immutable signed Note.

Required properties:

\[dsn:role:is:transition\]

\[dsn:target:is:\<NoteID\>\]

\[dsn:to\_state:is:\<state\>\]

Optional properties:

\[dsn:from\_state:is:\<state\>\]

\[dsn:reason:is:\<enum or text\>\]

\[dsn:evidence:is:\<NoteID or URL\>\]

\[dsn:guard:is:\<condition reference\>\]

### 14.2 Transition Authorization

A transition is valid only if:

1. It is signed by an authorized actor.  
2. The target exists or is resolvable.  
3. The target policy permits the transition.  
4. Guard conditions are satisfied.  
5. Countersignatures are present where required.  
6. It does not violate a revocation or suppression state.

### 14.3 Transition Guards

Guards are declarative preconditions.

Examples:

| Guard | Meaning |
| :---- | :---- |
| `payment.settled` | Payment proof is valid. |
| `counterparty.signed` | Counterparty signature exists. |
| `arbiter.selected` | Arbiter identity is bound. |
| `escrow.funded` | Escrow funding proof exists. |
| `quorum.reached` | Required approvals exist. |
| `timeout.reached` | Current time exceeds deadline. |

### 14.4 State Resolution

State resolution order:

1. Collect all valid transitions for target.  
2. Discard unauthorized or revoked transitions.  
3. Order remaining transitions by causal parents then `created`.  
4. Apply latest valid transition.  
5. If no valid transition exists, infer state from predicates.  
6. If conflicting transitions exist, mark state `conflict`.

### 14.5 Default Workflow Domains

#### OFFER

| State | Inference / Transition |
| :---- | :---- |
| `active` | Offer fact exists, status active, not expired, inventory \> 0\. |
| `paused` | Author transition to paused. |
| `sold_out` | Inventory equals zero. |
| `expired` | Current time after expiry. |
| `withdrawn` | Author tombstone or withdrawal transition. |

#### TRANSACT

| State | Inference / Transition |
| :---- | :---- |
| `proposed` | Transaction request exists. |
| `accepted` | Counterparty and author signatures or agreement transition. |
| `funded` | Escrow or payment funding proof. |
| `fulfilled` | Delivery confirmation transition. |
| `completed` | Recipient acknowledgment or settlement proof. |
| `disputed` | Dispute Note references transaction. |
| `canceled` | Authorized cancellation transition. |

#### PAY

| State | Inference / Transition |
| :---- | :---- |
| `invoice_issued` | Invoice Note exists. |
| `pending` | Payment broadcast but insufficient confirmation. |
| `confirmed` | Required confirmations reached. |
| `settled` | Lightning settlement proof or on-chain finality. |
| `failed` | Payment network failure proof or timeout. |
| `refunded` | Refund transition plus refund proof. |

#### REACT / TRUST

| State | Meaning |
| :---- | :---- |
| `endorsed` | Positive attestation. |
| `flagged` | Negative or caution attestation. |
| `blocked` | Block attestation by user. |

#### MESSAGE

| State | Meaning |
| :---- | :---- |
| `sent` | Signed message exists. |
| `delivered` | Delivery attestation. |
| `read` | Read attestation, if sender requests and recipient permits. |
| `archived` | Local or shared archive transition. |

#### GOVERN

| State | Meaning |
| :---- | :---- |
| `open` | Dispute created. |
| `investigating` | Evidence accepted. |
| `ruled` | Arbiter ruling transition. |
| `appealed` | Appeal transition. |
| `closed` | Final resolution. |

#### COLLABORATE

| State | Meaning |
| :---- | :---- |
| `draft` | Initial version. |
| `review` | Review request. |
| `approved` | Approval attestations. |
| `merged` | Merge transition. |

#### ORGANIZE

| State | Meaning |
| :---- | :---- |
| `proposed` | Event/group proposal exists. |
| `scheduled` | Time/place constraints satisfied. |
| `live` | Event status live. |
| `concluded` | End time passed or conclusion transition. |

---

## 15\. 📡 Transports and Minimum Bindings

### 15.1 Transport Neutrality

All transports are interchangeable carriers of WireNotes, SealedNotes, and queries.

A transport binding MUST define:

- Note carriage.  
- NoteID preservation.  
- Duplicate suppression.  
- Query carriage.  
- Reply linkage.  
- Error handling.  
- Size limits.  
- Authentication or anonymity properties.

### 15.2 Media Types

application/dsn+cbor

application/dsn+json

CBOR is mandatory for canonical wire exchange. JSON is optional for developer and HTTP-friendly environments.

### 15.3 Nostr Binding

| Item | Requirement |
| :---- | :---- |
| Note kind | `35001` |
| Query kind | `35002` |
| Service/capability kind | `35003` |
| Content | base64url-encoded CBOR WireNote or Query. |
| Dedupe | By Nostr event ID and DSN NoteID. |
| Reply | Tag `["reply", query_id]` or `["parent", note_id]`. |

Public indexing tags MAY include:

\["alt", "dsn1"\]

\["id", NoteID\]

\["role", role\]

\["type", class\]

\["author", PeerID\]

\["prop", key, operator, canonical\_value\]

Private Notes MUST NOT expose semantic indexing tags.

### 15.4 Mesh / LoRa / Meshtastic Binding

| Item | Requirement |
| :---- | :---- |
| Payload | CBOR. |
| Topic/channel | `dsn/1` or namespace equivalent. |
| Maximum fragment | 256 bytes recommended. |
| Fragmentation | Header with `mid`, `seq`, `final`. |
| Compression | Optional `zstd`; must be negotiated. |
| Dedupe | By NoteID and fragment message ID. |

Mesh Notes SHOULD be small. Large objects SHOULD be referenced by hash and retrieved opportunistically.

### 15.5 libp2p Binding

| Item | Requirement |
| :---- | :---- |
| Pubsub topic | `/dsn/1/notes`, `/dsn/1/queries` |
| Request protocol | `/dsn/1/req` |
| Methods | `get_note`, `get_refs`, `query`, `advertise` |
| Discovery | DHT/provider records keyed by NoteID or service capability. |
| Transport | WebRTC, QUIC, TCP, Tor. |
| Dedupe | By NoteID and message ID. |

### 15.6 HTTP Binding

| Endpoint | Method | Purpose |
| :---- | :---- | :---- |
| `/dsn/v1/notes` | POST | Publish Note. |
| `/dsn/v1/notes/{id}` | GET | Retrieve Note. |
| `/dsn/v1/notes/{id}` | HEAD | Existence check. |
| `/dsn/v1/query` | POST | Submit query Note. |
| `/dsn/v1/services` | GET | Discover services. |

Requirements:

- Content-Type: `application/dsn+cbor` or `application/dsn+json`.  
- PUT with NoteID is idempotent.  
- Responses SHOULD include `ETag` equal to NoteID.  
- Webhooks MUST be authenticated and signed.

### 15.7 Local-Only Binding

Local-only mode stores Notes in a local encrypted database and optionally exposes LAN discovery.

It MUST NOT leak to external transports when private mode is enabled.

---

## 16\. 💾 Persistence, Sync, and Conflict Handling

### 16.1 Core Persistence

Core persistence is append-only and content-addressed.

A conforming store MUST:

- Store Notes by NoteID.  
- Store SealedNotes by SealedNoteID.  
- Deduplicate identical NoteIDs.  
- Preserve conflicting versions.  
- Preserve tombstones.  
- Maintain outgoing queue.  
- Preserve causal order where possible.  
- Encrypt local data at rest.

### 16.2 Outbox Queue

Outbound Notes are queued until transport availability.

Queue rules:

1. Notes are published idempotently.  
2. Parents SHOULD be published before children when possible.  
3. Duplicate publication is harmless but SHOULD be minimized.  
4. Failed publication does not mutate Note.  
5. User may cancel unpublished private drafts.

### 16.3 Versioning

An update is a new Note with:

parents \= \[previous NoteID\]

or

\[dsn:replaces:is:\<previous NoteID\>\]

Updating does not erase the previous Note.

### 16.4 Tombstones

Deletion is represented by a tombstone Note.

\[dsn:role:is:tombstone\]

\[dsn:target:is:\<NoteID\>\]

\[dsn:reason:is:\<enum?\>\]

Tombstones MUST be honored by conforming UI and matching engines unless local audit mode is enabled.

Tombstones do not physically erase distributed data.

### 16.5 Conflict Handling

A conflict exists when:

- Two transitions target the same object.  
- Transitions are mutually exclusive.  
- Neither transition causally supersedes the other.  
- Both are valid under different policies.

Core conflict rule:

> Preserve both branches and mark the object as conflicted.

Resolution MAY use:

- User choice.  
- Arbiter ruling.  
- Ontology priority.  
- Latest authorized transition.  
- Stake-weighted governance where explicitly enabled.

Silent overwrite is prohibited.

### 16.6 Real-Time CRDT Mode

Real-time collaboration is an optional capability.

Capability flag:

sync.realtime

If supported:

- Peers exchange transition heads.  
- Union of valid signed operations is merged.  
- Deterministic fold derives current state.  
- Conflicts are preserved and surfaced.

If unsupported:

- Peers exchange missing versions.  
- Branches are preserved.  
- No automatic destructive merge occurs.

---

## 17\. 🤝 Trust, Reputation, and Governance

### 17.1 Trust Attestation Note

A trust attestation is a signed Note.

Required properties:

\[dsn:role:is:attestation\]

\[dsn:target:is:\<peer, note, transaction, service\>\]

\[dsn:domain:is:\<domain\>\]

\[dsn:polarity:is:positive|negative|neutral\]

Optional properties:

\[dsn:weight:is:0.0-1.0\]

\[dsn:reason:is:\<enum or text\>\]

\[dsn:evidence:is:\<NoteID or URL\>\]

\[dsn:expires:is:\<timestamp\>\]

\[dsn:scope:is:\<skill or context\>\]

### 17.2 Trust Graph

Trust is multidimensional and local.

Inputs MAY include:

- Positive signals: delivery, endorsement, uptime, stake history, collaboration.  
- Negative signals: disputes, blocks, fraud reports, slashing, failed fulfillment.  
- Domain relevance.  
- Graph distance.  
- Circle membership.  
- Recency.  
- Revocation status.

There is no mandatory global reputation score.

### 17.3 Trust Privacy

Negative trust MAY be:

- Private.  
- Circle-only.  
- Selectively disclosed.  
- Public.

Clients MUST support private block Notes.

A private block MUST suppress content locally without requiring public harassment or public disclosure.

### 17.4 Governance Workflow

Governance objects include:

- Flags.  
- Disputes.  
- Investigations.  
- Arbiter pools.  
- Appeals.  
- Rulings.

A dispute Note MUST reference:

- Target transaction, Note, or peer.  
- Evidence.  
- Requested outcome.  
- Proposed or selected arbiter.

A ruling transition MUST reference:

- Dispute Note.  
- Outcome.  
- Escrow release or refund instruction.  
- Trust annotations, if any.

### 17.5 Sybil Resistance

Sybil resistance is local and composable.

Signals MAY include:

- Web-of-trust.  
- Staking.  
- Slashing.  
- Circle endorsement.  
- Token gating.  
- Account age.  
- Payment or proof-of-work rates.  
- Hardware attestation.

No central authority is required.

---

## 18\. 💰 Economics, Payments, and Escrow

### 18.1 Monetary Units

Canonical money uses:

{"t":"money","cur":"SAT","min":1000}

{"t":"money","cur":"BTC","min":100000000}

{"t":"money","cur":"USD","min":20000}

`min` is integer minor units.

For BTC, minor unit is satoshi.

### 18.2 Invoice Note

\[dsn:role:is:invoice\]

\[dsn:target:is:\<offer/transaction\>\]

\[dsn:amount:is:\<money\>\]

\[dsn:recipient:is:\<peer/payment destination\>\]

\[dsn:expires:is:\<timestamp\>\]

\[dsn:method:in:btc|lightning|service\]

Optional:

\[dsn:bolt12:is:\<offer or invoice\>\]

\[dsn:payment\_request:is:\<reference\>\]

\[dsn:escrow\_required:is:true\]

### 18.3 Payment Note

\[dsn:role:is:payment\]

\[dsn:invoice:is:\<Invoice NoteID\>\]

\[dsn:amount:is:\<money\>\]

\[dsn:method:is:btc|lightning|psbt|service\]

\[dsn:proof:is:\<txid/preimage/receipt reference\>\]

\[dsn:status:is:broadcast|confirmed|settled|failed\]

### 18.4 Escrow Note

\[dsn:role:is:escrow\]

\[dsn:transaction:is:\<Transaction NoteID\>\]

\[dsn:participants:in:\<peer list\>\]

\[dsn:arbiter:is:\<peer or pool\>\]

\[dsn:amount:is:\<money\>\]

\[dsn:conditions:is:\<policy reference\>\]

\[dsn:funding:is:\<outpoint/script/taproot reference\>\]

\[dsn:timeout:is:\<timestamp\>\]

Escrow release conditions:

- Mutual confirmation.  
- Arbiter ruling.  
- Timeout.  
- Multisig threshold.  
- Cryptographic proof of delivery, if supported.

### 18.5 Receipt Note

\[dsn:role:is:receipt\]

\[dsn:payment:is:\<Payment NoteID\>\]

\[dsn:confirmations:gte:\<n\>\]

\[dsn:settled:is:true\]

### 18.6 Refund Note

\[dsn:role:is:refund\]

\[dsn:payment:is:\<Payment NoteID\>\]

\[dsn:amount:is:\<money\>\]

\[dsn:reason:is:\<enum/text\>\]

\[dsn:authorized\_by:is:\<peer/arbiter\>\]

\[dsn:proof:is:\<tx reference\>\]

### 18.7 Payment State Mapping

| Protocol State | Bitcoin / Lightning Meaning |
| :---- | :---- |
| `pending` | Broadcast but unconfirmed. |
| `confirmed` | Required on-chain confirmations reached. |
| `settled` | Lightning payment settled. |
| `failed` | Payment failed or expired. |
| `refunded` | Refund transaction or Lightning refund proof exists. |

### 18.8 Failure Paths

If payment fails:

1. Mark payment `failed`.  
2. Notify transaction workflow.  
3. Release escrow according to timeout or ruling.  
4. Allow dispute if parties disagree.  
5. Emit trust attestations only with evidence and consent.

### 18.9 Service Economics

Services MAY charge peer-to-peer fees for:

- Relay.  
- Indexing.  
- Storage.  
- Arbitration.  
- Notarization.  
- Automation.  
- Gateway access.

The protocol itself charges no mandatory fee.

---

## 19\. 📟 Services, Hardware, and Agents

### 19.1 Service Registration

A service is represented by a signed Note.

\[dsn:role:is:service\]

\[dsn:service:is:relay|indexer|storage|arbiter|notary|automation\]

\[dsn:endpoint:is:\<transport endpoint\>\]

\[dsn:fee:is:\<money or rate\>\]

\[dsn:sla:is:\<terms reference\>\]

\[dsn:stake:is:\<reference\>\]

\[dsn:capabilities:in:\<capability list\>\]

Service registrations are discoverable and revocable.

### 19.2 Capability Discovery

Peers advertise capabilities via signed capability Notes.

Core capability flags:

core.note

core.matching

transport.nostr

transport.mesh

transport.libp2p

transport.http

sync.realtime

agent.browser

agent.api

pay.btc

pay.lightning

hardware.secure\_element

storage.public

arbitration.service

Capability discovery MUST NOT require central coordination.

### 19.3 Hardware Nodes

Hardware nodes are first-class peers.

Supported classes:

- Secure element.  
- Hardware wallet.  
- Edge compute node.  
- LoRa router.  
- Mobile device.  
- Supernode.

Hardware Nodes SHOULD support:

- Device attestation.  
- Delegated session keys.  
- Offline signing.  
- Secure key storage.  
- Physical presence confirmation for high-risk actions.

### 19.4 Universal Action Agent

The Action Agent is optional and capability-gated.

Agent requirements:

- Explicit user policy.  
- Scoped capabilities.  
- Dry-run mode.  
- Audit log.  
- Revocation.  
- Confirmation for irreversible or financial actions.  
- Sandboxed execution.  
- Treat remote content as untrusted data.

Agent actions MUST produce signed transition or provenance Notes when they alter local or network state.

---

## 20\. 🛡️ Security, Privacy, and Abuse Mitigation

### 20.1 Threat Model

The network is permissionless and adversarial. Implementations MUST assume:

- Malicious Notes.  
- Malicious ontology modules.  
- Prompt injection attempts.  
- Spam and Sybil behavior.  
- Transport adversarial behavior.  
- Compromised devices.  
- Revoked but still-distributed content.  
- Unsafe automation.

### 20.2 Prompt Injection Defense

All remote Note content is untrusted data.

Implementations MUST NOT treat remote content as instructions unless:

- The user explicitly requests an action.  
- The action is within granted capability scope.  
- The action is previewed and confirmed.

Language models MUST be isolated from direct execution capabilities.

### 20.3 Rendering Safety

UI renderers MUST:

- Sandbox remote content.  
- Disable automatic execution.  
- Sanitize rich text.  
- Restrict media fetching.  
- Warn before opening external links.  
- Render unknown extensions as inert data.

### 20.4 Extension Safety

Extensions MUST be additive and inert by default.

An extension MAY define UI or behavior only if:

- It is explicitly installed/trusted by the user.  
- It is sandboxed.  
- It declares required capabilities.  
- It is revocable.

Unknown extensions MUST pass through without execution.

### 20.5 Spam and Rate Limiting

Local clients and services MAY apply:

- Trust-weighted rate limits.  
- Stake-based prioritization.  
- Micropayment gating.  
- Proof-of-work.  
- Circle-only policies.  
- Content-size limits.

Mandatory global rate limits are not imposed by the protocol.

### 20.6 Block and Harassment Control

A block Note suppresses target content locally.

\[dsn:role:is:block\]

\[dsn:target:is:\<peer/note/circle\>\]

\[dsn:scope:is:\<context\>\]

\[dsn:visibility:is:private|circle|public\]

Blocks MAY be private. Clients MUST allow blocking without public disclosure.

### 20.7 Replay Protection

Replay protection uses:

- Content-addressed NoteIDs.  
- Nonces.  
- Timestamps.  
- Expiry fields.  
- Transport duplicate suppression.  
- Capability expiry.  
- Revocation.

### 20.8 Automation Safety

Agents MUST NOT:

- Exceed delegated scope.  
- Execute remote instructions silently.  
- Perform payments above policy limits.  
- Publish private content without consent.  
- Modify security policy without strong confirmation.

Agents SHOULD support:

- Dry-run.  
- Step-by-step approval.  
- Spending limits.  
- Time-bound delegation.  
- Full audit trails.

### 20.9 Privacy Metadata Minimization

When publishing:

- Public Notes expose only intended semantic fields.  
- Unlisted Notes SHOULD omit discovery tags.  
- Private Notes MUST be sealed.  
- Circle Notes SHOULD minimize recipient metadata.  
- Sealed Notes SHOULD avoid leaking class, author, or target unless policy permits.

---

## 21\. 📊 Conformance Profiles

### 21.1 Core Profile

A Core implementation MUST support:

- NoteBody canonicalization.  
- NoteID derivation.  
- secp256k1 identity.  
- Signature creation and verification.  
- Typed property model.  
- Basic request/offer matching.  
- Local content-addressed store.  
- Outbox queue.  
- Tombstones.  
- Public/private visibility distinction.  
- LM or guided-form intent pipeline with deterministic validation.  
- Auto-generated safe UI.  
- At least one transport binding.  
- Local encrypted-at-rest storage.

### 21.2 Full Profile

Full \= Core plus:

- All listed domain Skills relevant to the implementation.  
- Multi-transport aggregation.  
- Advanced trust graph.  
- Disputes and governance Notes.  
- Payment object linkage.  
- Capability discovery.  
- Revocation handling.

### 21.3 Infrastructure Profile

Full plus:

- Service registration.  
- Relay or indexer operation.  
- DHT/gossip replication.  
- Public query support.  
- SLA advertisement.  
- Abuse throttling.

### 21.4 Hardware Profile

Full plus:

- Key delegation.  
- Hardware signing.  
- Mesh transport.  
- Offline-first management.  
- Device attestation.

### 21.5 Agent Profile

Full or Hardware plus:

- Policy engine.  
- Scoped delegation.  
- Browser/API automation.  
- Audit logging.  
- Dry-run mode.  
- Real-time feedback.

### 21.6 Realtime Profile

Full plus:

- `sync.realtime` capability.  
- Head exchange.  
- Deterministic merge/fold.  
- Conflict surfacing.

---

## 22\. 🧪 Conformance Test Framework

A conforming implementation MUST pass the following behavioral test categories.

### 22.1 Canonicalization Tests

| Case | Expected Result |
| :---- | :---- |
| Reordered properties | Same canonical body and NoteID. |
| Unicode NFC variants | Same NoteID after normalization. |
| Duplicate semantic fields | Canonical dedupe where specified. |
| Float substitution | Reject non-canonical float encoding. |
| Extension addition | New NoteID; old Note remains valid. |

### 22.2 Signature Tests

| Case | Expected Result |
| :---- | :---- |
| Valid author signature | Accepted. |
| Modified body | Rejected. |
| Unknown algorithm | Rejected. |
| Delegated signer without capability | Rejected. |
| Expired capability | Rejected. |
| Threshold multisig below threshold | Rejected. |

### 22.3 Matching Tests

| Case | Expected Result |
| :---- | :---- |
| Required constraint missing | Not matched. |
| Optional constraint missing | Match allowed with lower bonus. |
| Repeated positive constraints | OR semantics. |
| Repeated negative constraints | AND semantics. |
| Money currency mismatch | Not matched. |
| Geo radius satisfied | Matched. |
| Approx tolerance satisfied | Matched. |

### 22.4 Workflow Tests

| Case | Expected Result |
| :---- | :---- |
| Unauthorized transition | Ignored. |
| Valid transition | State updated. |
| Conflicting simultaneous transitions | Conflict state preserved. |
| Tombstone by author | Target suppressed. |
| Arbiter ruling | Escrow/path updated per ruling. |
| Expired invoice | State inferred expired. |

### 22.5 Transport Tests

| Case | Expected Result |
| :---- | :---- |
| Same Note over two transports | Deduplicated. |
| Fragmented mesh Note | Reassembled and validated. |
| Nostr semantic tags on sealed Note | Forbidden. |
| HTTP GET by NoteID | Returns canonical object. |
| Private mode enabled | No external transport leakage. |

### 22.6 Security Tests

| Case | Expected Result |
| :---- | :---- |
| Remote Note contains instruction-like text | No execution. |
| Unknown extension with script-like field | Rendered inert or hidden. |
| LM hallucinated invalid type | Validator rejects. |
| Payment without confirmation | Blocked. |
| Agent beyond scope | Blocked and logged. |
| Revoked capability used | Rejected. |

---

## 23\. 🧭 Reference Core Ontology

The following core terms are normative for interoperability.

### 23.1 Core Roles

dsn:offer

dsn:request

dsn:search

dsn:attestation

dsn:transition

dsn:tombstone

dsn:policy

dsn:service

dsn:capability

dsn:rotation

dsn:delegation

dsn:revocation

dsn:block

dsn:invoice

dsn:payment

dsn:escrow

dsn:receipt

dsn:refund

dsn:dispute

dsn:message

dsn:circle

### 23.2 Core Properties

dsn:role

dsn:type

dsn:status

dsn:state

dsn:target

dsn:source

dsn:parent

dsn:replaces

dsn:priority

dsn:visibility

dsn:circle

dsn:expires

dsn:deadline

dsn:start

dsn:end

dsn:time

dsn:location

dsn:geo

dsn:price

dsn:amount

dsn:currency

dsn:inventory

dsn:quantity

dsn:unit

dsn:category

dsn:tags

dsn:participant

dsn:counterparty

dsn:recipient

dsn:sender

dsn:arbiter

dsn:agreement

dsn:delivery

dsn:confirmations

dsn:lightning\_status

dsn:rating

dsn:endorsement

dsn:polarity

dsn:domain

dsn:weight

dsn:reason

dsn:evidence

dsn:relationship

dsn:delivery\_status

dsn:review\_status

dsn:event\_status

dsn:quorum

dsn:capability

dsn:scope

dsn:proof

dsn:method

dsn:fee

dsn:sla

dsn:stake

dsn:endpoint

### 23.3 Core States

active

paused

inactive

expired

withdrawn

proposed

accepted

funded

fulfilled

completed

disputed

canceled

pending

confirmed

settled

failed

refunded

open

investigating

ruled

appealed

closed

draft

review

approved

merged

scheduled

live

concluded

conflict

suppressed

---

## 24\. 🧑‍💻 Implementer Seed

A minimal correct implementation can be built in this order:

1. Implement deterministic CBOR canonicalization of NoteBody.  
2. Implement NoteID derivation.  
3. Implement secp256k1 keypair and PeerID.  
4. Implement signing digest and signature verification.  
5. Implement typed property model and operator evaluation.  
6. Implement local encrypted content-addressed store.  
7. Implement request/offer matching with required/optional constraints.  
8. Implement natural-language or guided-form intent pipeline with validation and confirmation.  
9. Implement auto-generated safe UI for unknown types.  
10. Implement immutable transitions and tombstones.  
11. Implement one transport binding with dedupe.  
12. Implement private/public visibility and sealed Notes.  
13. Implement trust attestations and local block Notes.  
14. Implement payment object linkage without requiring full custodial logic.  
15. Add optional Skills, agents, mesh, CRDT, and hardware support as capability-gated extensions.

---

## 25\. ✅ Final Architectural Guarantees

A conforming Decentralized Semantic Network implementation guarantees:

- Users need not author raw semantic syntax.  
- Notes are immutable, signed, and content-addressed.  
- State is inferred from signed facts, constraints, attestations, and transitions.  
- Workflows are emergent but deterministic under ontology rules.  
- Transports are interchangeable.  
- Private data is sealed and private by default.  
- Extensions cannot break core validation.  
- Unknown content is handled safely.  
- Automation is delegated, scoped, auditable, and revocable.  
- Independent implementations can produce stable NoteIDs, verify signatures, match Notes, and preserve conflicts without central coordination.

Below is a simplification review: observations and decision questions you can use to cut the spec down aggressively. The goal is to isolate the smallest useful protocol and move everything else to optional, application-layer, or future-phase status.

---

## 1\. High-level simplification observations

### 1.1 The current spec is too complete to be simple

The revised specification is functionally complete, but it has become heavy because it tries to normalize many advanced concerns at once:

- encrypted circles,  
- token gates,  
- multisig,  
- delegation,  
- key rotation,  
- social recovery,  
- payments,  
- escrow,  
- disputes,  
- reputation,  
- services,  
- hardware,  
- agents,  
- mesh,  
- CRDT sync,  
- conformance profiles,  
- ontology modules,  
- workflow inference.

Most of these are not needed for a first useful implementation.

### 1.2 The protocol should probably be separated from the product experience

The current spec mixes:

- wire protocol,  
- local storage,  
- LLM interaction,  
- UI generation,  
- governance,  
- payments,  
- agent automation,  
- hardware policy.

A much simpler spec would define only:

> A signed, content-addressed semantic Note that can be stored locally and published over one transport.

Everything else can be an application built on top.

### 1.3 The smallest useful core may be much smaller than the current spec

A minimal useful system could be:

1. User creates a Note.  
2. Note is structured by LLM or form.  
3. Note is validated.  
4. Note is stored locally.  
5. Note can be published publicly if user confirms.  
6. Other Notes can be matched against it locally.  
7. User can suppress/delete/update Notes by creating new Notes.

That alone gives:

- semantic notebook,  
- local knowledge base,  
- simple marketplace/request matching,  
- public P2P discovery.

Almost every other feature can be deferred.

---

## 2\. Strategic scope questions

These questions determine how much can be cut.

### 2.1 What is the minimum viable product?

Possible answers:

1. **Local semantic notebook only.**  
2. **Local notebook plus public P2P publishing.**  
3. **Local notebook plus private sharing.**  
4. **Marketplace/request matching network.**  
5. **Full decentralized coordination protocol.**

Simplification recommendation:

> Choose option 2 for version 1\.

If you choose option 2, you can cut:

- private encrypted sharing,  
- circles,  
- token gates,  
- escrow,  
- disputes,  
- reputation,  
- agents,  
- hardware,  
- CRDT,  
- service registry.

### 2.2 Is this a protocol spec or a product architecture spec?

If it is a protocol spec, remove or demote:

- LLM behavior,  
- UI generation,  
- agent automation,  
- hardware UX,  
- governance processes.

If it is a product architecture spec, those can remain, but they should not be normative protocol requirements.

Question:

> Should conformance be based only on Note syntax, signatures, storage, and transport, not on LLM/UI behavior?

Recommended answer:

> Yes.

### 2.3 Is natural-language/LLM support a protocol requirement or a UI convenience?

The current spec makes LLM intent translation feel mandatory.

That creates unnecessary burden.

Simpler:

> The protocol is LLM-independent. Natural language is one optional way to produce a valid Note.

Question:

> Can we remove LLM requirements from the core protocol and make them optional application guidance?

Recommended answer:

> Yes.

### 2.4 Is private person-to-person sharing required for phase 1?

Private sharing introduces major complexity:

- SealedNote envelopes,  
- recipient keys,  
- circle keys,  
- revocation,  
- key rotation,  
- token gates,  
- metadata minimization.

If phase 1 only needs:

- private local Notes,  
- public published Notes,

then encrypted sharing can be deferred.

Question:

> Can “private by default” mean “locally encrypted and not published without consent,” rather than “end-to-end encrypted sharing”?

Recommended answer for maximal simplification:

> Yes.

### 2.5 Are payments part of the core protocol or an application layer?

Payments currently add:

- invoices,  
- payment Notes,  
- receipts,  
- refunds,  
- escrow,  
- multisig,  
- Lightning states,  
- PSBTs,  
- dispute linkage.

That is a large subsystem.

Simpler:

> Payments are just references to external payment URIs or application-level Notes.

Question:

> Can version 1 remove payment settlement, escrow, and refund logic entirely?

Recommended answer:

> Yes, unless payments are the primary reason the network exists.

### 2.6 Are trust, reputation, and governance required immediately?

Trust and governance currently add:

- attestations,  
- domain trust scores,  
- blocks,  
- flags,  
- disputes,  
- arbitration,  
- appeals,  
- Sybil resistance,  
- staking/slashing.

For a first implementation, local blocking may be enough.

Question:

> Can trust be reduced to local block/flag Notes and deferred reputation scoring?

Recommended answer:

> Yes.

### 2.7 Are agents, browser automation, hardware nodes, and services phase 1?

Probably not.

They introduce:

- capability delegation,  
- policy engines,  
- audit logs,  
- device attestation,  
- service registration,  
- SLAs,  
- fees,  
- automation safety.

Question:

> Can all agent, hardware, and service functionality be moved to a future phase or optional extension document?

Recommended answer:

> Yes.

---

## 3\. Note model simplification observations

The current NoteBody is:

v, author, created, nonce, types, parents, props, policy, ext

That may be too much.

### 3.1 Candidate minimal NoteBody

A radically simpler NoteBody could be:

{

  "v": 1,

  "author": "peer:...",

  "created": 1767225600000,

  "props": \[\]

}

Everything else can be expressed as properties.

That means:

- type is a property,  
- status is a property,  
- target references are properties,  
- replacements are properties,  
- tags are properties,  
- visibility intent is a property,  
- tombstones are properties.

This is elegant and reduces special cases.

Question:

> Can we remove top-level `types`, `parents`, `policy`, `ext`, and `nonce`, and put all semantic meaning in `props`?

Recommended answer:

> Yes, unless there is a strong interoperability reason for top-level fields.

### 3.2 Is `nonce` necessary?

The nonce prevents identical Notes from having identical IDs.

But content addressing usually wants identical content to have identical IDs.

If a user creates the same exact Note twice, deduplication may be desirable.

If they need distinct instances, they can add:

- a timestamp,  
- an instance ID,  
- a local UUID property.

Question:

> Can we remove `nonce` and rely on content-addressed deduplication?

Recommended answer:

> Yes.

### 3.3 Are top-level `types` necessary?

`types` overlaps with:

\[dsn:type:is:offer\]

\[dsn:role:is:offer\]

Having both top-level types and property-based roles is redundant.

Question:

> Can type/class be expressed only as a property?

Recommended answer:

> Yes.

### 3.4 Are top-level `parents` necessary?

Versioning and causal references can be properties:

\[dsn:replaces:is:note:...\]

\[dsn:target:is:note:...\]

\[dsn:parent:is:note:...\]

Removing top-level `parents` simplifies canonicalization and validation.

Question:

> Can all references be ordinary properties?

Recommended answer:

> Yes.

### 3.5 Is top-level `policy` necessary?

Policy currently overlaps with visibility properties and encryption envelopes.

For a simplified version:

- local privacy is storage-layer,  
- public publication is user consent,  
- encrypted sharing is deferred.

Therefore top-level `policy` may be unnecessary.

Question:

> Can policy be removed from the NoteBody and treated as application/storage behavior?

Recommended answer:

> Yes for phase 1\.

### 3.6 Is top-level `ext` necessary?

Extensions can be expressed as properties using namespaces:

\[ext:foo:is:bar\]

\[skill:custom:is:value\]

Top-level `ext` duplicates the property system.

Question:

> Can we remove top-level `ext` and use namespaced properties only?

Recommended answer:

> Yes.

### 3.7 Should the protocol distinguish “role” and “type”?

Current spec has many roles:

offer, request, attestation, transition, policy, service, capability, tombstone, rotation, delegation, invoice, payment, escrow, receipt, dispute, message, block

That is too many protocol-level categories.

Simpler:

> Every Note just has properties. The application interprets them.

Minimum useful properties may be:

type

status

target

replaces

Question:

> Can we collapse roles/types/states into ordinary properties?

Recommended answer:

> Yes.

---

## 4\. Property model simplification observations

### 4.1 The TypedValue envelope may be too heavy

Current typed value:

{

  "t": "money",

  "cur": "USD",

  "min": 30000

}

This is precise but verbose.

Simpler alternatives:

1. Use plain JSON scalars and rely on key naming.  
2. Use a smaller set of types.  
3. Move rich typing to ontology/app layer.

Question:

> Can property values be limited to string, integer, boolean, array, and object?

Recommended answer for simplicity:

> Yes, at least for version 1\.

### 4.2 Are decimal, quantity, geo, duration, bytes, enum, and reference types required?

Probably not for first release.

Possible cuts:

- Decimal: use integer minor units or string.  
- Quantity: use integer plus unit property.  
- Geo: defer unless location matching is essential.  
- Duration: use integer milliseconds.  
- Bytes: defer unless attachments are essential.  
- Enum: use string.  
- Reference: use string NoteID/PeerID.

Question:

> Which value types are truly required for the first useful matcher?

Likely minimal set:

string

integer

boolean

array

object

Maybe also:

timestamp integer

money integer minor units

### 4.3 Can money be simplified?

Instead of a special money type:

{"t":"money","cur":"USD","min":20000}

Use properties:

\[price:is:20000\]

\[price\_currency:is:USD\]

Or:

\[price\_sats:is:20000\]

Question:

> Can money be represented as integer minor units plus a currency property?

Recommended answer:

> Yes.

### 4.4 Can time be simplified?

Use one convention:

Unix milliseconds integer

No special DateTime object.

Example:

\[deadline:gt:1767225600000\]

Question:

> Can all times be plain integer Unix milliseconds?

Recommended answer:

> Yes.

### 4.5 Can geo be deferred?

Geo introduces:

- latitude/longitude precision,  
- radius,  
- units,  
- location privacy,  
- “near me” consent.

If location matching is not essential, remove it.

Question:

> Is geographic matching required for the first version?

If not:

> Remove geo and `near`.

If yes:

> Keep only one simple geo operator and defer fuzzy location.

### 4.6 Are many operators redundant?

Current operators include:

eq, ne, inc, approx, near, lt, lte, gt, gte, range, in, inter, exists

Many can be expressed using others.

Minimal operator set:

eq

ne

lt

lte

gt

gte

contains

in

Can be removed:

- `range`: use two constraints, `gte` and `lte`.  
- `approx`: defer fuzzy matching.  
- `near`: defer geo.  
- `inter`: defer set intersection.  
- `exists`: use `eq`/`ne` against known values or app-level validation.

Question:

> Can we reduce operators to equality, inequality, comparisons, containment, and set membership?

Recommended answer:

> Yes.

### 4.7 Is fuzzy/approximate matching essential?

Approximate matching creates ambiguity:

- What is the default tolerance?  
- Is it percentage or absolute?  
- Does it apply to money?  
- How does it interact with units?

For simplicity:

> Use exact and comparison operators. Let the application propose adjusted constraints.

Question:

> Can fuzzy matching be moved to application logic rather than protocol semantics?

Recommended answer:

> Yes.

---

## 5\. Matching simplification observations

### 5.1 Matching scoring is over-specified

Current model has:

- required constraints,  
- optional constraints,  
- weights,  
- priority,  
- trust adjustment,  
- recency,  
- deterministic tie-breakers.

For phase 1, a simpler model is enough:

score \= satisfied\_required\_constraints / total\_required\_constraints

If score \= 1.0, it is a full match.

Optional ranking can be local implementation choice.

Question:

> Can we remove optional weights, priority, trust ranking, and Jaccard overlap from the core?

Recommended answer:

> Yes.

### 5.2 Is priority needed?

Priority values like:

curated \= 1.0

imported \= 0.5

bulk \= 0.2

are application policy, not protocol necessity.

Question:

> Can priority be a local UI concern instead of a protocol field?

Recommended answer:

> Yes.

### 5.3 Is semantic overlap/recommendation needed?

Jaccard overlap and clustering are useful but not essential.

They can be removed without harming core matching.

Question:

> Can recommendation/clustering be deferred?

Recommended answer:

> Yes.

### 5.4 Can matching be just filtering?

Simplest possible matcher:

> A Note matches if all required constraints are satisfied.

No score needed initially.

Question:

> Is boolean matching sufficient for version 1?

Recommended answer:

> Yes.

---

## 6\. Canonicalization simplification observations

### 6.1 CBOR may be unnecessary complexity

CBOR is compact and good for constrained transports, but it increases implementation burden.

If the main transport is Nostr/HTTP/local JSON, canonical JSON may be easier.

Question:

> Is binary/mesh transport required for phase 1?

If no:

> Use canonical JSON.

If yes:

> Keep CBOR, but consider making it the only advanced requirement.

### 6.2 Canonical JSON may be enough

A simpler canonicalization rule:

- UTF-8 NFC.  
- No duplicate keys.  
- Object keys sorted lexicographically.  
- No floating-point numbers.  
- Integers as JSON integers.  
- Timestamps as integer milliseconds.  
- Base64url for binary where needed.

This is much easier for many implementers.

Question:

> Can canonical JSON replace canonical CBOR for the core protocol?

Recommended answer:

> Yes, unless mesh/low-bandwidth is a phase 1 priority.

### 6.3 Can canonicalization be simplified by removing special fields?

If NoteBody becomes:

{

  "v": 1,

  "author": "peer:...",

  "created": 123,

  "props": \[\]

}

canonicalization becomes dramatically simpler.

Question:

> Should we minimize the number of canonical top-level fields?

Recommended answer:

> Yes.

---

## 7\. Identity simplification observations

### 7.1 Aliases are mostly optional

Current spec supports:

- DIDs,  
- Nostr npub,  
- Bitcoin addresses,  
- BOLT-12,  
- DNS aliases.

For a minimal protocol, only one native identity is needed.

Question:

> Can aliases be removed from core and treated as application-level bindings?

Recommended answer:

> Yes.

### 7.2 Key rotation may not be needed initially

Key rotation adds:

- rotation Notes,  
- old/new signatures,  
- alias rebinding,  
- recovery.

For an early system, users can create a new identity.

Question:

> Can key rotation be deferred until identity continuity becomes essential?

Recommended answer:

> Yes.

### 7.3 Social recovery is likely too obscure for phase 1

Social recovery is valuable but complex.

It can be deferred.

Question:

> Can social recovery be removed from the core spec?

Recommended answer:

> Yes.

### 7.4 Delegation is probably phase 2

Delegation is mainly needed for:

- agents,  
- devices,  
- services,  
- automation.

If those are deferred, delegation can be deferred.

Question:

> Can delegation be removed until agents/services are added?

Recommended answer:

> Yes.

---

## 8\. Signature simplification observations

### 8.1 Algorithm agility can be sacrificed

Supporting multiple algorithms increases validation complexity.

For simplicity:

> Use one mandatory algorithm.

Question:

> Can we mandate only one signature algorithm and remove algorithm agility?

Recommended answer:

> Yes.

Possible choice:

- `secp256k1 Schnorr`, if Bitcoin alignment matters.  
- `ed25519`, if implementation simplicity matters more.

Question:

> Is Bitcoin compatibility more important than signature simplicity?

If yes:

> secp256k1.

If no:

> ed25519 may be simpler.

### 8.2 Multisig can be removed from core

Multisig is mainly useful for:

- escrow,  
- governance,  
- shared circles,  
- hardware policies.

If those are cut, multisig can be cut.

Question:

> Can multisig be deferred?

Recommended answer:

> Yes.

### 8.3 Countersignatures can be represented as separate Notes

Instead of making one Note support multiple signatures, use:

Note A: offer/request

Note B: acceptance referencing Note A

Note C: confirmation referencing Note A/B

This preserves immutable event semantics without complicating signature envelopes.

Question:

> Can bilateral workflows be expressed as linked Notes rather than multisigned Notes?

Recommended answer:

> Yes.

### 8.4 Signature envelope can be minimal

Instead of:

{

  "alg": "...",

  "signer": "...",

  "sig": "...",

  "on\_behalf": "...",

  "cap": "...",

  "ts": ...

}

Use:

{

  "sig": "base64url"

}

Because:

- author is in NoteBody,  
- algorithm is fixed,  
- delegation is removed,  
- timestamp is in NoteBody.

Question:

> Can the signature envelope be reduced to a single signature string?

Recommended answer:

> Yes for phase 1\.

---

## 9\. Privacy and visibility simplification observations

### 9.1 The current visibility model is too large

It includes:

- private,  
- circle,  
- allowlist,  
- gated,  
- unlisted,  
- public.

For phase 1, only two states may be needed:

local/private

public

Question:

> Can visibility be reduced to “not published” and “published”?

Recommended answer:

> Yes.

### 9.2 SealedNote may be premature

SealedNote introduces:

- content keys,  
- recipient encryption,  
- ephemeral keys,  
- separate seal IDs,  
- inner/outer NoteIDs.

This is one of the most complex parts of the spec.

Question:

> Can SealedNote be removed until private sharing is required?

Recommended answer:

> Yes.

### 9.3 Circles and token gates can be deferred

Circles and token gates are useful but not essential.

They add:

- group key management,  
- revocation,  
- gate proofs,  
- access services,  
- metadata concerns.

Question:

> Can circles and token gates be moved to a future private-sharing extension?

Recommended answer:

> Yes.

### 9.4 Private by default can be a local storage guarantee

Simpler principle:

> Notes are stored encrypted locally and are never published without explicit user confirmation.

That satisfies “private by default” without requiring encrypted P2P.

Question:

> Is local-only privacy sufficient for phase 1?

Recommended answer:

> Likely yes.

---

## 10\. Transport simplification observations

### 10.1 Multiple transport bindings are unnecessary for phase 1

Current spec defines:

- Nostr,  
- LoRa/Meshtastic,  
- libp2p,  
- HTTP,  
- local-only.

A first implementation only needs one network transport.

Question:

> Can we choose one primary transport and make others optional extensions?

Recommended answer:

> Yes.

### 10.2 Nostr is probably the simplest network binding

Nostr gives:

- relays,  
- censorship resistance,  
- simple event format,  
- public discovery,  
- existing infrastructure.

Question:

> Can Nostr be the only mandatory network transport for phase 1?

Recommended answer:

> Yes, if public publishing is required.

### 10.3 Local-only may be the true core

The simplest version may not require any network transport.

Phase 1 could be:

> Local semantic database with optional export/import and optional Nostr publishing.

Question:

> Should local-only be the mandatory baseline, with network transport optional?

Recommended answer:

> Yes.

### 10.4 Query protocol may be unnecessary

Instead of a special query Note kind, clients can:

- fetch Notes by tag,  
- fetch Notes by author,  
- perform local matching,  
- use relay search.

Question:

> Can queries be application-level rather than protocol-level?

Recommended answer:

> Yes.

### 10.5 Service registry can be removed

Relay/indexer/storage/arbitration registration is service infrastructure.

It is not needed for basic Notes.

Question:

> Can service registration be removed from core?

Recommended answer:

> Yes.

---

## 11\. Persistence and sync simplification observations

### 11.1 CRDT can be removed

Real-time CRDT sync adds major complexity.

For phase 1:

- append-only Notes,  
- deduplication,  
- replacement references,  
- tombstones,

are enough.

Question:

> Can real-time CRDT be deferred indefinitely?

Recommended answer:

> Yes.

### 11.2 Conflict handling can be simplified

Instead of a full conflict-resolution model:

- preserve all versions,  
- show latest by `created`,  
- allow user to choose,  
- do not silently overwrite.

Question:

> Can conflict handling be reduced to “preserve branches and show conflict”?

Recommended answer:

> Yes.

### 11.3 Tombstones can be ordinary Notes

A tombstone does not need a special protocol role.

It can be:

\[type:is:tombstone\]

\[target:is:note:...\]

or:

\[type:is:status\]

\[target:is:note:...\]

\[status:is:deleted\]

Question:

> Can deletion be expressed as a normal referenced Note?

Recommended answer:

> Yes.

### 11.4 Versioning can be a property

Instead of special version chains:

\[replaces:is:note:...\]

Question:

> Can versioning be just another property reference?

Recommended answer:

> Yes.

---

## 12\. Workflow and inference simplification observations

### 12.1 Domain workflow tables are probably unnecessary

The spec defines workflow states for:

- offer,  
- transaction,  
- payment,  
- message,  
- governance,  
- collaboration,  
- organization.

These are application domains.

The protocol can simply allow:

\[type:is:...\]

\[status:is:...\]

\[target:is:...\]

Question:

> Can domain workflows be moved out of the protocol and into application ontologies?

Recommended answer:

> Yes.

### 12.2 State inference can be extremely simple

Minimal inference rule:

> The current state is the most recent valid Note that asserts a status for the target.

No large predicate engine is required.

Question:

> Can inference be reduced to “latest signed status assertion wins”?

Recommended answer:

> Yes.

### 12.3 Skills can be UI/schema modules, not protocol objects

Skills can be:

- prompt templates,  
- form schemas,  
- local validators,  
- UI layouts.

They do not need to be signed network ontology modules in phase 1\.

Question:

> Can Skills be moved from protocol-level ontology modules to application-level plugins?

Recommended answer:

> Yes.

### 12.4 Ontology modules can be deferred

Formal ontology modules are elegant but heavy.

For a simple spec:

- use a few conventional keys,  
- allow unknown keys,  
- let applications define meaning.

Question:

> Can the protocol be ontology-agnostic while still supporting ontology-driven apps?

Recommended answer:

> Yes.

---

## 13\. Trust and governance simplification observations

### 13.1 Reputation scoring can be removed

Trust scoring is local and subjective.

It does not need protocol normalization.

Question:

> Can reputation scoring be implementation-defined and removed from core?

Recommended answer:

> Yes.

### 13.2 Attestations can be ordinary Notes

A rating or endorsement can be:

\[type:is:reaction\]

\[target:is:peer:...\]

\[value:is:positive\]

No special attestation schema is required.

Question:

> Can attestations be represented as generic Notes?

Recommended answer:

> Yes.

### 13.3 Governance can be deferred

Disputes, arbitration, appeals, rulings, and slashing are complex.

They are only necessary if the protocol tries to support commerce or governance directly.

Question:

> Can governance be moved to an optional future module?

Recommended answer:

> Yes.

### 13.4 Blocks can be local-only

A block can be a private local Note:

\[type:is:block\]

\[target:is:peer:...\]

It does not need to be published.

Question:

> Can blocking be purely local behavior?

Recommended answer:

> Yes.

---

## 14\. Payment simplification observations

### 14.1 Payment objects are a large separate system

Current payment system includes:

- invoice,  
- payment,  
- escrow,  
- receipt,  
- refund,  
- dispute,  
- settlement proofs.

This may be unnecessary.

Question:

> Can payments be removed from the core protocol?

Recommended answer:

> Yes, unless the main use case is commerce.

### 14.2 Payments can be external links

If a payment reference is needed, use a property:

\[payment\_request:is:lightning:...\]

\[payment\_uri:is:bitcoin:...\]

The protocol does not need to understand settlement.

Question:

> Can payment support be reduced to opaque URI/reference properties?

Recommended answer:

> Yes.

### 14.3 Escrow is definitely phase 2+

Escrow requires:

- multisig or Taproot,  
- arbiter selection,  
- timeout logic,  
- dispute handling,  
- refund paths.

Question:

> Can escrow be removed entirely from version 1?

Recommended answer:

> Yes.

### 14.4 Bitcoin/Lightning identity can be deferred

BIP-84/BIP-86/BOLT-12 support is only needed if payments are core.

Question:

> Can Bitcoin/Lightning identifiers be removed unless payments are retained?

Recommended answer:

> Yes.

---

## 15\. Agent, hardware, and service simplification observations

### 15.1 Universal Action Agent should not be core

Agents require:

- delegation,  
- policy engine,  
- audit logs,  
- sandboxing,  
- dry-run,  
- capability revocation.

This is too much for a simple protocol.

Question:

> Can agents be moved entirely out of the core spec?

Recommended answer:

> Yes.

### 15.2 Browser automation should be removed from the main spec

Browser automation is an application feature.

Question:

> Can browser automation be described only as a future optional extension?

Recommended answer:

> Yes.

### 15.3 Hardware nodes can be deferred

Hardware support adds:

- secure element attestation,  
- device keys,  
- offline signing,  
- delegated session keys.

Question:

> Can hardware profiles be removed from phase 1?

Recommended answer:

> Yes.

### 15.4 Service registration can be removed

Relay/indexer/storage/arbitration service registration is infrastructure.

Question:

> Can service registration be moved to operator documentation rather than protocol?

Recommended answer:

> Yes.

---

## 16\. Conformance simplification observations

### 16.1 Too many conformance profiles

Current profiles:

- Core,  
- Full,  
- Infrastructure,  
- Hardware,  
- Agent,  
- Realtime.

This is too much.

Question:

> Can conformance be reduced to one profile: “Core”?

Recommended answer:

> Yes.

### 16.2 Conformance should avoid LLM/UI requirements

Testing LLM behavior is hard and implementation-specific.

Question:

> Can conformance focus only on deterministic protocol behavior?

Recommended answer:

> Yes.

### 16.3 Test framework can be shortened

Instead of many test categories, use a minimal checklist:

1. Canonicalization stability.  
2. NoteID derivation.  
3. Signature verification.  
4. Duplicate suppression.  
5. Local persistence.  
6. Publication consent.  
7. Basic matching.  
8. Tombstone handling.

Question:

> Can conformance vectors be reduced to a few mandatory behavior checks?

Recommended answer:

> Yes.

---

## 17\. Security simplification observations

### 17.1 Keep essential security rules, remove exotic cases

Essential rules:

- Validate all Notes.  
- Treat remote content as untrusted.  
- Do not execute remote instructions.  
- Require confirmation for publication and destructive actions.  
- Sandboxed rendering.  
- Reject invalid signatures.  
- Deduplicate by NoteID.

Question:

> Can the security section be shortened to core threat mitigations only?

Recommended answer:

> Yes.

### 17.2 Remove agent security if agents are removed

If agents are not core, agent safety can be moved to future extension.

Question:

> Can automation safety be removed from core?

Recommended answer:

> Yes.

### 17.3 Remove hardware security if hardware is removed

Hardware attestation and secure elements can be deferred.

Question:

> Can hardware security requirements be removed from phase 1?

Recommended answer:

> Yes.

---

## 18\. Redundancy observations

The following items overlap and can probably be merged or removed.

| Redundancy | Simplification |
| :---- | :---- |
| `types` field and `type`/`role` properties | Keep only properties. |
| `parents` field and `replaces`/`target` properties | Keep only properties. |
| `policy` field and visibility properties | Remove policy field. |
| `ext` field and namespaced properties | Remove ext field. |
| SealedNote and visibility policy | Remove sealed notes if private sharing is deferred. |
| Multisig and escrow | Remove both if payments are deferred. |
| Trust attestation schema and generic Notes | Use generic Notes. |
| Capability discovery and service registration | Remove both from core. |
| Workflow domains and state predicates | Move to application ontologies. |
| Conformance profiles and capability flags | Reduce to one Core profile. |
| Canonical CBOR and JSON-LD/HTTP bindings | Choose one canonical encoding. |
| Alias bindings and transport identities | Remove aliases from core. |
| Agent capabilities and delegation | Remove both from core. |

---

## 19\. Aggressive cut list

If the goal is maximum simplification, consider removing these entirely from the core spec.

### Remove completely

1. CBOR if not needed for mesh.  
2. JSON-LD.  
3. HTTP binding.  
4. libp2p binding.  
5. LoRa/Meshtastic binding.  
6. Query protocol.  
7. Service registry.  
8. Network registry.  
9. CRDT sync.  
10. Real-time collaboration.  
11. Multisig.  
12. Threshold signature policies.  
13. Delegation.  
14. Capability Notes.  
15. Key rotation.  
16. Social recovery.  
17. DID aliases.  
18. Nostr aliases.  
19. Bitcoin address aliases.  
20. BOLT-12 aliases.  
21. SealedNote envelopes.  
22. Circle keys.  
23. Token gates.  
24. Allowlists.  
25. Trust scoring.  
26. Reputation graph.  
27. Governance.  
28. Arbitration.  
29. Disputes.  
30. Escrow.  
31. Invoices.  
32. Payment settlement proofs.  
33. Refunds.  
34. Receipts.  
35. Hardware profiles.  
36. Device attestation.  
37. Agent automation.  
38. Browser automation.  
39. Service economics.  
40. Staking/slashing.

That leaves a much smaller core.

---

## 20\. Candidate minimal core after cuts

A radically simplified specification could be organized around only these parts:

### 20.1 Identity

PeerID \= "peer:" \+ base64url(sha256(pubkey))

One key type.

### 20.2 Note

{

  "v": 1,

  "author": "peer:...",

  "created": 1767225600000,

  "props": \[\]

}

### 20.3 NoteID

NoteID \= "note:" \+ base64url(hash(canonical NoteBody))

### 20.4 Signature

sig \= sign(hash(canonical NoteBody))

One signature algorithm.

### 20.5 Wire format

{

  "id": "note:...",

  "body": {},

  "sig": "..."

}

### 20.6 Properties

Simplified property:

{

  "k": "price",

  "o": "lt",

  "v": 300

}

Minimal operators:

eq, ne, lt, lte, gt, gte, contains, in

### 20.7 Local storage

- Store by NoteID.  
- Deduplicate.  
- Encrypt at rest.  
- Preserve versions.  
- Support tombstones.  
- Require consent to publish.

### 20.8 Optional transport

One transport, likely Nostr:

- Publish WireNote as event content.  
- Tag NoteID and author.  
- Deduplicate by NoteID.

### 20.9 Matching

match \= all required constraints satisfied

score \= satisfied / total

No trust ranking, no fuzzy matching, no optional weights.

### 20.10 Updates and deletion

Use ordinary Notes:

\[replaces:is:note:...\]

\[type:is:tombstone\]

\[target:is:note:...\]

No mutable Notes.

---

## 21\. Recommended default answers for maximum simplification

If you want the leanest possible revision, use these defaults:

| Question | Recommended default |
| :---- | :---- |
| Is LLM required by the protocol? | No. |
| Is auto-generated UI part of protocol conformance? | No. |
| Is private P2P sharing required? | No. |
| Are circles required? | No. |
| Are token gates required? | No. |
| Are payments required? | No. |
| Is escrow required? | No. |
| Is reputation required? | No. |
| Is governance required? | No. |
| Are agents required? | No. |
| Is hardware support required? | No. |
| Is CRDT sync required? | No. |
| Are multiple transports required? | No. |
| Is CBOR required? | Only if mesh/binary is required. |
| Is algorithm agility required? | No. |
| Is multisig required? | No. |
| Is delegation required? | No. |
| Is key rotation required? | No. |
| Are DIDs/aliases required? | No. |
| Are domain workflow state machines required? | No. |
| Are formal ontology modules required? | No. |
| Are multiple conformance profiles required? | No. |

---

## 22\. Most important questions to resolve before revising

If you answer these, the revised spec can become much shorter.

1. **Is phase 1 a local-first semantic Note system with optional public publishing?**  
2. **Is end-to-end encrypted sharing required in phase 1?**  
3. **Are payments required in phase 1?**  
4. **Is reputation or governance required in phase 1?**  
5. **Is agent automation required in phase 1?**  
6. **Is mesh/low-bandwidth binary transport required in phase 1?**  
7. **Is Nostr acceptable as the only network transport?**  
8. **Can the protocol be LLM-independent?**  
9. **Can all semantics be expressed as properties instead of special fields?**  
10. **Can we use one signature algorithm and one simple signature envelope?**  
11. **Can matching be boolean or simple ratio scoring only?**  
12. **Can workflows be reduced to referenced status Notes?**  
13. **Can Skills be application-layer plugins rather than protocol objects?**  
14. **Can conformance be reduced to one Core profile?**  
15. **Can the spec be rewritten around a 5-part kernel: Identity, Note, Property, Signature, Transport?**

---

## 23\. Suggested revision direction

The next revision could be structured as:

1. **Core Protocol**  
     
   - Identity.  
   - Note.  
   - Canonicalization.  
   - Signature.  
   - Property model.  
   - Matching.  
   - Local storage.  
   - One transport.

   

2. **Application Guidance**  
     
   - LLM intent pipeline.  
   - UI generation.  
   - Safety confirmations.  
   - Domain Skills.  
   - Workflow conventions.

   

3. **Future Extensions**  
     
   - Private sharing.  
   - Payments.  
   - Reputation.  
   - Governance.  
   - Agents.  
   - Hardware.  
   - CRDT.  
   - Mesh.  
   - Multisig.  
   - Service registry.

That separation would make the spec much simpler while preserving the original vision.  

----

Here is the condensed decision matrix. I have grouped the original 15 questions into **4 core architectural decisions**. 

For each, I have provided a **Recommended Choice** (biased toward the maximum simplification you outlined) and an **Alternative Choice** (if you want to retain specific capabilities), along with a clear mapping to the original questions.

---

### 🎯 Decision 1: MVP Scope & Boundaries
**Question:** What is the operational boundary of Phase 1?  
* **Recommended (Lean):** Local-first semantic notebook with *optional public publishing only*. Private P2P sharing, payments, agents, and governance are explicitly deferred to future extensions.  
* **Alternative (Expanded):** Include basic end-to-end encrypted sharing (SealedNotes) or basic payment references (URIs), but still defer complex escrow/governance.  
* **Maps to original questions:** 1, 2, 3, 4, 5

### 🧩 Decision 2: Data Model & Semantics
**Question:** How minimal should the Note and Property model be?  
* **Recommended (Ultra-Minimal):**  
  - LLM is an *optional application UI tool*, not a protocol requirement.  
  - All semantics (type, status, replaces, target) are expressed as flat `props`.  
  - Remove top-level `types`, `parents`, `policy`, `nonce`, and `ext` fields.  
  - "Skills" and workflows are purely application-layer plugins/schemas.  
* **Alternative (Structured):** Keep top-level `types` and `parents` for easier indexing, and retain a basic `TypedValue` envelope (e.g., `{"t":"int", "v":10}`) for strict canonicalization.  
* **Maps to original questions:** 8, 9, 12, 13, 15

### 🔐 Decision 3: Cryptography & Identity
**Question:** How strict is the identity and signature model?  
* **Recommended (Single-Track):** One mandatory signature algorithm (e.g., `secp256k1` Schnorr or `ed25519`), a minimal signature envelope (just the `sig` string, since `author` and `created` are in the body), and a single "Core" conformance profile. No multisig, delegation, or key rotation in V1.  
* **Alternative (Flexible):** Support algorithm agility (e.g., an `alg` field) and basic key rotation Notes to future-proof identity, at the cost of validation complexity.  
* **Maps to original questions:** 10, 14

### 📡 Decision 4: Transport & Matching
**Question:** What are the transport and matching rules?  
* **Recommended (Simple):**  
  - **Transport:** Local-only is the mandatory baseline. Nostr is the *only* optional network transport binding.  
  - **Matching:** Boolean (all required constraints satisfied) or simple ratio scoring (`satisfied / total`). No fuzzy matching, trust weighting, or Jaccard overlap in the core.  
  - **Encoding:** Canonical JSON (easier to implement) unless low-bandwidth mesh is an immediate requirement.  
* **Alternative (Robust):** Require Canonical CBOR for mesh/low-bandwidth readiness, and include basic `approx` (fuzzy) or `near` (geo) operators in the core matching engine.  
* **Maps to original questions:** 6, 7, 11

---

### 🚀 How to Proceed

You can simply reply with your choices for each decision (e.g., **"1. Recommended, 2. Recommended, 3. Alternative, 4. Recommended"**), or specify any tweaks (e.g., *"Use ed25519 for Decision 3, and keep Canonical JSON for Decision 4"*). 

Once you confirm, I will immediately generate the complete, aggressively simplified **Version 1.1 Minimal Core Specification** based exactly on your selections.

----

1. Alternative, but Lean can be an intermediate step if helpful
2. LLM **must** be optional.  Notes/Property/Ontology probably need to be structured to anticipate complete functionality.
3. Single-track, but allowing for future upgrade to Flexible
4. Simple, but anticipating future upgrade to Robust

Fully align with the Notention codebase as the starting point.  This means that where Notention already implements non-Lean functionality, don't backtrack unless ultimately beneficial.

