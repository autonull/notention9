# TODO.20 — Canonical Specification & Onramp Plan

**Status:** Draft. Replaces TODO.19/19b/19c/19d. **Source of truth:** `README.md` + code. README2.md is deprecated (risks contradiction).

---

## 1. What We Have (Ground Truth)

| Asset | Location | State |
|-------|----------|-------|
| Property roles (`constraint`/`fact`/`marker`), `quantity`, `provenance`, `confidence` | `core/src/types/domain.ts` | ✅ |
| Matcher: markers skipped, aliases removed, priority factor, required-only denominator | `core/src/matching/MatchEngine.ts` | ✅ (2 bugs: denominator, conflict semantics) |
| CBOR wire encode/decode, schnorr signing, `PROTOCOL_VERSION = 1` | `core/src/network/nostr/protocol.ts` | ✅ (cbor-x + nostr-tools + @noble/hashes) |
| Transport seam: `NetworkProvider`, registry, gate, Nostr + Meshtastic providers | `core/src/network/*` | ✅ |
| **TypeScript Nostr relay** | `core/src/network/nostr/relay.ts`, `agent/src/relay/start.ts` | ✅ |
| Conformance suite + deterministic regression scenario | `packages/conformance` | 🟡 build issues |
| Storage abstraction + migrations + recovery; IndexedDB adapter | `core/src/storage/*`, UI localforage | 🟡 KV, not event-sourced |
| Capability-gated agent, policy, audit | `agent/*`, `core/src/security/CapabilityManager.ts` | ✅ |
| Simulator, golden-path E2E, stranger-test, a11y journey | `simulator/*`, `ui/test/*`, `scripts/*` | 🟡 simulator Vite build broken |
| `better-sqlite3` (native) at root | `package.json` | ⚠️ must be dev-only or removed |
| 818 Playwright frame PNGs in `movies/` | git history | ⚠️ evict from history |

---

## 2. Two MatchEngine Bugs (Must Close Before Any Network Code)

**Bug 1 — Denominator wrong for missing constraints** (`MatchEngine.ts:13-19, 48-73`)
- `requiredConstraintCount` incremented only inside loop over *evaluated* results
- A required constraint with no counterpart on the offer never enters denominator
- Request with 3 required constraints, offer satisfies 1, lacks 2 → scores **1.0 instead of 0.33**
- Spec (§13.2): `satisfied_required / total_required` over **all** required constraints of the request

**Bug 2 — Conflicts subtract instead of zeroing** (`MatchEngine.ts:66-68`)
- `totalScore += r.compatibility` adds −1 for conflicts
- Spec: base score = `satisfied/total`; conflict = unsatisfied constraint → contributes 0
- A note with any failed required constraint MUST NOT be presented as a match

**Priority default** — Code: `request.priority ?? 1.0` (line 22). Spec §13.2: 0.5. **Decision: priority default = 1.0** (code wins, update spec).

---

## 3. Constraints (Non-Negotiable)

| Constraint | Rationale |
|------------|-----------|
| **Pure TS/JS runtime** — no native modules, no required WASM, no Rust/Go/Kotlin/Swift toolchains in product code | Dev tooling (tsc, vitest, esbuild, Playwright) exempt |
| **Platform matrix v1:** Linux/Win/macOS desktop ✅ · Android ✅ (PWA + Termux agent) · iOS ❌ · Safari-first ❌ · App Stores ❌ | Background execution, Web Serial, P2P restrictions |
| **Nostr-first transport** — mesh second, HTTP third, libp2p never on critical path | Existing relay + providers; avoids fragmentation |
| **schnorr/secp256k1 mandatory** (nostr-tools); ed25519 optional agility only | Nostr interop; `@noble/curves` for ed25519 if needed |
| **Event-sourced, content-addressed store** — NoteID = SHA-256(canonical CBOR NoteBody) | Spec §4.3, §7, §16; unblocks dedupe, signing, sync |
| **Immutable versions + head pointers** — never relay-replaceable history | Spec §2.2, §16.3; corrects 19b's addressable-event data-loss trap |
| **Conflicts are branches, not merges** — no CRDT on critical path | Spec §16.5; Yjs optional for drafts only (§21.6) |
| **Trust is local, subjective** — WoT inbox + signed InviteNotes (optional, low priority) + per-peer quotas | Spec §17.2, §17.5; no PoW, no global reputation |
| **AI optional seasoning** — deterministic extraction (LocalProvider) is conforming path | Spec §11; WebLLM/transformers.js = experimental flag, default off |

---

## 4. Architecture Decisions (D1–D10)

### D1 — Canonical CBOR + NoteID + Signing Digest (Tier 0)
- Hand-roll ~200-line deterministic encoder in `core/src/canonical/` (cbor-x not canonical by default)
- Five §22.1 test vectors in conformance
- Unblocks: NoteID, signing digest (§10.2), mesh dedupe, cross-transport identity
- **Kill criterion:** if not vector-stable in 3 weeks → freeze as JCS-JSON (RFC 8785, pure TS) and amend spec

### D2 — Event-Sourced Store (Tier 0 → Tier 1)
- Browser: IndexedDB object stores (`events` by NoteID, `heads`, `outbox`)
- Node: append-only JSONL segments + fsync + compaction
- Encryption at rest: XChaCha20-Poly1305 via `@noble/ciphers` (spec §9.3)

### D3 — Versioning & Conflicts
- Update = new Note with `parents` = [previous NoteID]
- Deletion = tombstone Note (`role:tombstone`, `target:<NoteID>`)
- Conflicts: preserve both branches, mark conflicted, UI shows both, resolve → two-parent version
- Silent overwrite prohibited

### D4 — Protocol Kernel (Typed Transitions + Deterministic Fold)
- `status` = derived state (spec §2.3)
- Pure TS reducer folds signed transition Notes (§14) through guarded transition table
- Verification: (a) exhaustive BFS of reachable state space at small scope, (b) `fast-check` model-based tests, (c) runtime guards + invariants, (d) conformance vectors

### D5 — Identity & Keys
- Mandatory: schnorr secp256k1 (nostr-tools), PeerID = `peer:<hash>` (spec §8.1)
- Backup: BIP39 via `@scure/bip39`
- Daily unlock: WebAuthn PRF passkey wrapping vault key, passphrase + scrypt fallback
- Rotation, social recovery (guardian threshold), device subkeys, delegation, revocation = signed Notes with verification logic (spec §8.4–8.6, §9.6)
- `CapabilityManager` (exists) → runtime enforcement of CapabilityNotes

### D6 — Sybil Resistance: Local Policy, Not Global Consensus
- Default: auto-sync/auto-match only within follows + decaying 2-hop WoT
- Everything else → quarantined, opt-in firehose (never auto-matched)
- Growth via **signed InviteNotes** (inviter spends bounded invite budget; invite tree auditable; revocation ejects subtrees locally) — **optional, low priority**
- Endorsement/Block Notes (§17.1, §17.3), per-peer rate/storage quotas
- Remove "proof-of-work" from §17.5 signals

### D7 — Transports
- **Nostr:** align kinds/tags to §15.3 (kind 35001/35002/35003), dedupe by NoteID, outbox with idempotent publish, relay federation (our TS relay = test harness + self-host)
- **Meshtastic:** finish §15.4 fragmentation (`mid/seq/final`, ≤256B, CBOR, hash-referenced large objects); `@meshtastic/transport-web-bluetooth` for Android; Web Serial for desktop
- **HTTP binding** (§15.6) via agent's express server → LAN sync + **file-bundle export/import (sneakernet)** = fully offline partition story
- libp2p: optional, unimplemented, not on critical path

### D8 — Matching: Freeze TODO.17 + Close 2 Bugs + Finish Typing
- Fix denominator + conflict semantics (Bug 1, Bug 2)
- `check-demo-match.ts` → asserting CI gate (exit 0, score ≥ 0.99 on demo pair, explanation names every satisfied/conflicted/missing constraint)
- Land §5.3 typed values: `money`, `qty`, `dur`, `time` first (demo + rates), then rest
- Wire `Property.quantity` through extraction with regression test
- Add missing operators: `approx`, `in`, `exists`, `inter` with vectors
- Incomparable dimensions always explicit, never silent

### D9 — AI Optional
- Deterministic extraction (LocalProvider heuristics) = conforming path
- Remote OpenAI-compatible APIs optional (providers exist in `cli` and `agent`)
- WebLLM/transformers.js: WASM → experimental flag, default off, outside conformance
- LM output must pass §11 IntentDraft Zod contract; ambiguity → clarification; provenance recorded

### D10 — Scale Claims: Honest
- Replace "10k+ nodes" with measured gates: 1,000 in-process simulated agents (simulator exists) with partition/churn/reorder, `PropertyIndex` + NoteID dedupe, relay federation across ≥3 self-hosted relays
- "Civilization-scale" = federating protocol with no central point of failure

---

## 5. Execution Plan (Gates Are Law)

### P0 — Repo Truth (1–2 wk)
- Zero type errors across workspaces
- Fix simulator Vite build
- `pnpm verify` + conformance suite green in CI
- Update `check-demo-match.ts` header/expectations (remove broken expectation)
- Audit root `better-sqlite3` → remove or quarantine to dev-only
- Evict `movies/` frames from git history going forward
- Add `scripts/check-purity.ts`: CI fails if any runtime dependency outside pure-TS allowlist
- **Gate:** `pnpm typecheck && pnpm verify && pnpm --filter @notention/conformance test` all green; purity check green

### P1 — Finish the Center (2–3 wk)
- D8 fixes (Bug 1, Bug 2) + typed values (money/qty/dur/time) + missing operators
- Respond/act step produces durable linked response Note visible from both sides
- Golden-path E2E (`ui/test/journeys/golden-demo.spec.ts`) and `stranger-test` pass unaided
- **Gate:** demo pair scores ≥ 0.99 with full explanation; missing-constraint and conflict regression tests pin §13.2; stranger completes loop < 2 min

### P2 — Protocol Kernel (4–6 wk)
- D1 canonical CBOR + NoteID + §10.2 digest + §10.5 ten-step verification
- D2 versioning/parents/tombstones/outbox
- §22.1 vectors 5/5
- PeerID; store migration with recovery tests
- **Gate:** conformance canonicalization + signature suites green; two stores converging on identical NoteIDs across browser/Node

### P3 — Networked Loop (4–6 wk)
- Nostr binding per §15.3 + head pointers + NoteID dedupe
- Relay federation
- HTTP binding + export/import bundles
- Meshtastic fragmentation + Web Bluetooth
- Privacy gate enforced on every provider
- **Gate:** simulator partition scenario — A offline 6h, B behind firewall, both converge with verifiable receipts; mesh round-trip of ≤256B-fragmented note between two radios (hardware-in-loop, documented)

### P4 — Trust & Keys (5–8 wk)
- D5 + D6: WoT inbox, Invite/Endorsement/Block/Rotation/Recovery/Revocation Notes, SealedNote wiring (`privacy.ts` types exist, unwired), circle keys
- Passkey unlock + BIP39 backup + device subkeys
- **Gate:** scripted sybil flood (10k fake identities in simulator) never reaches default inbox; key-compromise drill: rotate → old key revoked → history verifies; recovery drill with 2-of-3 guardians

### P5 — Production (6–10 wk)
- Android PWA (install, Web Push via agent, offline multi-device), Termux agent guide
- a11y audit (axe-core + existing keyboard journeys) and i18n catalogs
- 1k-agent scale benchmark
- Security checklist (§20) incl. prompt-injection and rendering safety (DOMPurify exists)
- Docs + conformance profile badges updated in README.md
- **Gate:** Definition of Done on real devices, cold-start, unaided

---

## 6. Spec Amendments (Tracked in This Plan, Not README2.md)

1. §13.2: priority default = **1.0**; denominator = all required constraints; failed/conflicted/missing required → not a match
2. §17.5: strike "proof-of-work"; InviteNote tree + local quotas = reference mechanism (optional, low priority)
3. §15.5: libp2p binding → optional, not required for any profile
4. §15.6: HTTP + file-bundle exchange → conforming offline path
5. §16.6: Yjs as reference realtime implementation; Automerge removed everywhere
6. §21: add **Platform Profile** (Node ≥22 + Chromium/Android; no native/WASM runtime deps) enforced by `check-purity.ts`
7. §10.6: schnorr mandatory; ed25519 optional agility only

---

## 7. Definition of Done

> A stranger on an Android phone (PWA, offline 6h, optionally a Meshtastic radio or a Termux agent) captures a request. A stranger on a Linux laptop (browser + Node agent, behind NAT) receives it via Nostr relay, HTTP bundle, or mesh; the matcher explains the match; both act through guarded transition Notes and see the accepted state with signed receipts. All versions preserved, conflicts surfaced, keys rotatable and recoverable, inbox Sybil-quarantined without PoW, accessible to a blind user, in their language — **and every line of product code that makes this true is TypeScript.**

**What this plan does not promise:** global Sybil immunity, rich-text CRDT merging, iOS, formal proofs, 10k-node benchmark.

---

## 8. Remaining Design Choices (Grill)

### Q1: Canonical CBOR encoder — hand-roll vs. JCS-JSON fallback?
- **Option A (recommended):** Hand-roll ~200-line deterministic CBOR encoder in `core/src/canonical/` with 5 §22.1 vectors. Keeps binary efficiency for mesh. 3-week kill criterion → JCS-JSON.
- **Option B:** Skip CBOR, use JCS-JSON (RFC 8785) from day 1. Simpler, pure TS, but larger payloads on mesh (no CBOR compression).
- **My lean:** Option A with kill criterion. Mesh payload size matters.

### Q2: Event store — IndexedDB + JSONL segments vs. sqlite-wasm?
- **Option A (recommended):** IndexedDB (browser) + append-only JSONL + fsync (Node). Pure TS, no WASM, matches existing storage abstraction.
- **Option B:** `sql.js` (sqlite-wasm) everywhere. Single codebase, but WASM bundle size + async initialization + no IndexedDB durability guarantees on browser.
- **My lean:** Option A. Simpler, no WASM, leverages existing `core/src/storage/*`.

### Q3: Transition table — hand-rolled typed table vs. XState v5?
- **Option A (recommended):** Hand-rolled guarded transition table in pure TS. ~100 lines, zero deps, trivially model-checkable, matches existing `CapabilityManager` pattern.
- **Option B:** XState v5. Formal modeling, visualizer, but adds ~50kB and learning curve.
- **My lean:** Option A. The conformance package *is* the executable spec; hand-rolled table is honest.

### Q4: SealedNote wiring — when?
- **Option A (recommended):** P2 (Protocol Kernel). Types exist in `privacy.ts`; needs canonical CBOR + signing first.
- **Option B:** P3 (Networked Loop). Delay until transport integration.
- **My lean:** Option A. Private/circle visibility is core to spec (§9.1) and unblocks trust UX.

### Q5: InviteNote tree — implement in P4 or defer to post-v1?
- **Option A:** P4 (Trust & Keys). Complete §17.5 reference mechanism.
- **Option B (recommended):** Defer to post-v1. WoT inbox + per-peer quotas + block Notes cover 90% of Sybil resistance. Invite tree adds complexity (budget tracking, revocation cascade, UI) for marginal gain at v1.
- **My lean:** Option B. Mark optional, low priority in spec.

### Q6: Meshtastic Web Bluetooth — P3 or later?
- **Option A (recommended):** P3. `@meshtastic/transport-web-bluetooth` is pure TS; Android PWA needs it for true offline mesh.
- **Option B:** Defer. Web Serial (desktop) + HTTP-to-meshtasticd covers LAN + desktop.
- **My lean:** Option A. Android is a first-class platform; Web Bluetooth is the only mesh path there.

### Q7: Simulator Vite build — fix or replace?
- **Option A (recommended):** Fix existing simulator. It's the only multi-agent scenario runner.
- **Option B:** Replace with vitest-based scenario runner (no Vite, no UI). Simpler CI.
- **My lean:** Option A if fix < 2 days; Option B otherwise. The Movie Studio UI is nice but not critical path.

### Q8: `better-sqlite3` at root — remove or dev-only?
- **Option A (recommended):** Remove from root `package.json`. No runtime workspace declares it. If needed for a dev script, add to that workspace's `devDependencies`.
- **Option B:** Move to `devDependencies` at root with comment.
- **My lean:** Option A. Cleaner purity check.

### Q9: Conformance package — fix build or integrate into core tests?
- **Option A (recommended):** Fix build issues. It's the executable spec; separate package enforces boundary.
- **Option B:** Fold into `core` tests. Simpler build, but loses "conformance suite as standalone verifier" property.
- **My lean:** Option A. The spec demands a conformance suite.

### Q10: Priority default = 1.0 — update all docs/tests?
- **Yes.** Code has `?? 1.0`. Spec §13.2 says 0.5. Decision: code wins. Update `check-demo-match.ts` expectations, any test fixtures, and spec reference in this plan.

---

## 9. Immediate Next Steps (Start Here)

1. **P0.1** — Run `pnpm typecheck` → catalog all errors
2. **P0.2** — Fix simulator Vite build (or decide Option B in Q7)
3. **P0.3** — Write `scripts/check-purity.ts` with explicit allowlist
4. **P0.4** — Remove `better-sqlite3` from root / quarantine
5. **P0.5** — Update `check-demo-match.ts` header (remove broken expectation)
6. **P1.1** — Fix MatchEngine Bug 1 (denominator)
7. **P1.2** — Fix MatchEngine Bug 2 (conflict semantics)
8. **P1.3** — Add regression tests for both bugs
9. **P1.4** — Run `check-demo-match.ts` → must exit 0, score ≥ 0.99

---

## 10. Dependency Graph (Critical Path)

```
P0 (Repo Truth)
  └─→ P1 (Center: MatchEngine fixes + typed values)
        └─→ P2 (Protocol Kernel: canonical CBOR + NoteID + signing + store)
              ├─→ P3 (Networked Loop: Nostr + HTTP + Mesh)
              └─→ P4 (Trust & Keys: WoT + Invite* + SealedNote + keys)
                    └─→ P5 (Production: Android PWA + a11y + scale + docs)
```

**No parallel tracks block gates.** Optional tracks (Yjs realtime, payments, libp2p, WebLLM) never block a gate.

---

*End of TODO.20.md. This is the execution specification. README2.md is deprecated.*