The sandbox has network access — I can audit the actual codebase directly. Let me pull the key documents and manifests first.
# Notention — Revised Master Plan (proposed `TODO.19d.md`)

**Supersedes:** TODO.19 / 19b / 19c (all three violate the new constraints). **Freezes:** TODO.17 semantics. **Re-scopes:** TODO.18.
**Basis:** full audit of the monorepo (2,262 files: `core`, `ui`, `agent`, `cli`, `simulator`, `optimize`, `packages/conformance`, `eval`, `corpus`, `scripts`), README2 normative spec, and current source state.

---

## 1. What the audit actually found (ground truth, not plan-fiction)

**Assets that already exist and de-risk everything:**

| Asset | Location | State |
|---|---|---|
| Property roles (`constraint\|fact\|marker`), `quantity`, `provenance`, `confidence` | `core/src/types/domain.ts` | ✅ implemented |
| Matcher: markers skipped, aliases removed, priority factor, required-only denominator | `core/src/matching/MatchEngine.ts` | ✅ mostly per TODO.17 |
| CBOR wire encode/decode, schnorr signing, `PROTOCOL_VERSION = 1` | `core/src/network/nostr/protocol.ts` (cbor-x + nostr-tools + @noble/hashes) | ✅ |
| Transport seam: `NetworkProvider`, registry, gate, Nostr + Meshtastic providers (webserial/http/proxy) | `core/src/network/*` | ✅ |
| **A TypeScript Nostr relay** | `core/src/network/nostr/relay.ts`, `agent/src/relay/start.ts` | ✅ |
| Conformance suite + deterministic regression scenario (30×, exactly 1 match) | `packages/conformance` | ✅ with known build issues |
| Storage abstraction + migrations + recovery; IndexedDB adapter | `core/src/storage/*`, UI localforage | 🟡 KV, not event-sourced |
| Capability-gated agent (README2: Agent profile 7/7), policy, audit | `agent/*`, `core/src/security/CapabilityManager.ts` | ✅ |
| Simulator, golden-path E2E, stranger-test, a11y journey, demo diagnostic | `simulator/*`, `ui/test/*`, `scripts/*` | 🟡 simulator Vite build broken |

**Two residual scoring defects I verified in `MatchEngine.ts` (must close TODO.17 honestly):**

1. **Denominator still wrong for missing constraints.** `requiredConstraintCount` is incremented only inside the loop over *evaluated* results — a required constraint with no counterpart on the offer never enters the denominator. A request with 3 required constraints where the offer satisfies 1 and lacks 2 scores **1.0 instead of 0.33**. README2 §13.2 requires `satisfied_required / total_required` over *all* required constraints of the request.
2. **Conflicts subtract instead of zeroing.** `totalScore += r.compatibility` adds −1 for conflicts; §13.2 defines base score as *satisfied/total* (a conflict is an unsatisfied constraint → contributes 0), and a note with any failed required constraint MUST NOT be presented as a match. Also reconcile the priority default (`?? 1.0` in code vs `0.5` in §13.2) — pick the spec, document it.

**Known debt (from TODO.17 + conformance README):** ~319 UI type errors, simulator UI Vite build failure, `check-demo-match.ts` still documents the *broken* expectation in its header, canonicalization tests 0/5, typed values (§5.3) mostly unimplemented, `better-sqlite3` (native) declared at root, 818 Playwright frame PNGs committed under `movies/`.

---

## 2. The three constraints, applied without mercy

**Interpretation (normative for this plan):** *All product code we write or maintain is TypeScript running on Node ≥ 22 and Chromium-class runtimes (desktop browsers, Android Chrome/WebView). Every runtime dependency must be pure JS/TS — no native Node modules, no required WASM, no Rust/Go/Kotlin/Swift toolchains. Dev tooling (tsc, vitest, esbuild, Playwright) is exempt: it is tooling, not product.*

This kills specific items in the existing TODO.19x drafts:

| Rejected | Where proposed | Why | Replacement (pure TS) |
|---|---|---|---|
| Tauri 2.0 shell + "background Rust worker" | 19b | Rust toolchain | Node agent (exists) + browser UI; Android PWA + optional Termux agent |
| Automerge | 19, 19b, 19c | Rust→WASM core | **Not needed**: spec §2.2/§16 already mandates immutable versions + preserved branches. Optional realtime drafts → Yjs (pure JS) |
| SQLite (`better-sqlite3`, `sqlite3`, `sql.js`) | 19, 19b; root dep today | native / WASM | IndexedDB (browser, exists) + append-only JSONL segments + in-memory index (Node `fs`) |
| Hashcash / NIP-13 PoW | 19, 19b | **explicitly forbidden** | Local WoT inbox + signed, revocable invite tree + per-peer quotas (§4 below) |
| RxDB + premium replication plugins | 19c | licensing + heavy abstraction over a store we already have | Extend `core/src/storage` to the §16 event store directly |
| Expo / React Native | 19c | native build chain | Installable PWA; Tiptap/React 19 stack already mobile-capable |
| NDK, js-libp2p as critical path | 19, 18 | fragmentation risk, weight | `nostr-tools` (already in repo); libp2p binding stays *optional, unimplemented* per §15.5 |
| Ed25519 as the signing path | 19c | breaks Nostr relay interop | **schnorr/secp256k1 mandatory** (nostr-tools, §10.6); ed25519 via `@noble/curves` as optional agility only |
| "XState = formal verification" | 19c | overclaim | Guarded transition tables + exhaustive small-scope model checking + fast-check model-based tests, honestly labeled |
| TLA+ | 18 | non-TS | The conformance package *is* the executable spec; add a TS reference reducer + state-space explorer |
| iOS background execution, App Stores | 18 | **excluded by decree** | Android PWA + Web Push (self-hosted via agent), Termux daemon; desktop Linux/Windows/macOS via Node + Chromium; no store distribution |

**Platform matrix (v1):** Linux desktop ✅ · Windows desktop ✅ · macOS desktop ✅ (cooperative: runs Node/Chromium) · Android ✅ (PWA; Web Serial n/a, Web Bluetooth ✅; Termux agent for true background) · iOS ❌ · Safari-first paths ❌ · app stores ❌.

---

## 3. Architecture decisions (each one feasible with what exists)

**D1 — Event-sourced, content-addressed store (spec §16, finally implemented).**
NoteID = SHA-256 over **canonical CBOR** of the NoteBody (§7): sorted keys, definite lengths, NFC, integers/decimal-strings only (no floats), dedupe. cbor-x is *not* canonical by default → hand-roll a ~200-line deterministic encoder in `core/src/canonical/` with the five §22.1 test vectors. This single module unblocks NoteID, signing digest (§10.2), mesh dedupe, and cross-transport identity. Store: browser IndexedDB object stores (`events` by NoteID, `heads`, `outbox`); Node append-only JSONL segments + fsync + compaction. Encryption at rest: XChaCha20-Poly1305 via `@noble/ciphers` (spec §9.3 already names it).

**D2 — Immutable versions + head pointers, never relay-replaceable history.**
Publish each version as an immutable Nostr event (spec kind 35001); optionally an addressable *head pointer* for discovery. Relays may keep only the latest pointer; **local stores keep every version**. Updates = new Note with `parents` (§16.3); deletion = tombstone Note (§16.4). This corrects 19b's "addressable events replace the old one" data-loss trap.

**D3 — Conflicts are branches, not merges.**
Two concurrent children of one parent → both preserved, object marked conflicted, UI shows both with a resolve action producing a two-parent version (§16.5, silent overwrite prohibited). **No CRDT on the critical path.** Optional Realtime profile (§21.6, already optional in the spec): Yjs + y-prosemirror + y-indexeddb bound to the existing Tiptap editor, scoped to *drafts only*.

**D4 — Protocol completeness = typed transition Notes + deterministic fold.**
`status` becomes derived state (§2.3): a pure TS reducer folds signed transition Notes (§14) through a guarded transition table (hand-rolled typed table or XState v5 — both pure TS). Verification strategy, honestly named: (a) exhaustive BFS of the reachable state space at small scope in a TS model checker, (b) `fast-check` model-based tests against a reference model, (c) runtime guards + invariants, (d) conformance vectors in `packages/conformance`. Every message carries mandatory `protocolVersion` (constant already exists) with automated compat tests.

**D5 — Identity & keys, no graveyard.**
Mandatory: schnorr secp256k1 (nostr-tools). Native `peer:` PeerID = alg-prefixed hash of pubkey (§8.1) — trivial. Backup: BIP39 via `@scure/bip39` (audited, pure TS). Daily unlock: WebAuthn PRF passkey wrapping the vault key where available, passphrase + `@noble/hashes` scrypt fallback. Rotation, social recovery (guardian threshold), device subkeys, delegation, revocation = **signed Notes with verification logic** (§8.4–8.6, §9.6) — data structures + folds, no new crypto. `CapabilityManager` (exists) becomes the runtime enforcement of CapabilityNotes.

**D6 — Sybil resistance without PoW: local policy, not global consensus.**
The spec already says trust is local and subjective (§17.2). Normative default: auto-sync/auto-match only within follows + decaying 2-hop WoT; everything else lands in a quarantined, opt-in firehose that is never auto-matched. Growth via **signed InviteNotes** (inviter spends a bounded invite budget; invite tree is auditable; revocation ejects subtrees locally), endorsement/block Notes (§17.1, §17.3), per-peer rate/storage quotas enforced by each client and by our TS relay. No tokens, no hashing, no global reputation. Remove "proof-of-work" from the §17.5 signal list. This is the honest reframing: we don't *solve* Sybil globally (nobody does without cost); we make Sybils **irrelevant to any given user's inbox** — which is all the product needs.

**D7 — Transports: Nostr first, mesh second, HTTP third, libp2p never-on-critical-path.**
Keep the existing `NetworkProvider` seam. Nostr: align kinds/tags to §15.3, dedupe by NoteID (not event id), outbox with idempotent publish (§16.2), relay federation (our own TS relay is the test harness and the self-host story). Meshtastic: finish §15.4 fragmentation (`mid/seq/final`, ≤256 B, CBOR, hash-referenced large objects); add `@meshtastic/transport-web-bluetooth` (pure TS) for Android; Web Serial for desktop; HTTP to `meshtasticd` already supported. HTTP binding (§15.6) via the agent's express server gives LAN sync and **file-bundle export/import (sneakernet)** — the fully offline partition story with zero research risk.

**D8 — Matching: freeze TODO.17, close the two residual defects, finish typing.**
Fix denominator + conflict semantics (§1 above); make `check-demo-match.ts` an *asserting* CI gate (exit 0, score ≥ 0.99 on the demo pair, explanation names every satisfied/conflicted/missing constraint). Land §5.3 typed values in dependency order: `money`, `qty`, `dur`, `time` first (demo + rates need them), then the rest; wire `Property.quantity` through extraction with a regression test; add missing operators `approx`, `in`, `exists`, `inter` with vectors. Incomparable dimensions always explicit, never silent.

**D9 — AI is optional seasoning, never load-bearing.**
Deterministic extraction (LocalProvider heuristics, exists) is the conforming path. Remote OpenAI-compatible APIs optional (providers exist in `cli` and `agent`). WebLLM/transformers.js: WASM → **experimental flag, default off, outside conformance**. LM output must pass the §11 IntentDraft Zod contract; ambiguity → clarification (module exists); provenance recorded (`Property.provenance` exists).

**D10 — Scale claims, honest.**
Replace "10k+ nodes" with measured gates: 1,000 in-process simulated agents (simulator exists) with partition/churn/reorder scenarios, `PropertyIndex` + NoteID dedupe, relay federation across ≥3 self-hosted relays. "Civilization-scale" means *a federating protocol with no central point of failure*, not a benchmark theater number.

---

## 4. Execution plan (gates are law; every gate is a command)

**P0 — Repo truth (1–2 wk).** Zero type errors across workspaces; fix simulator Vite build; `pnpm verify` + conformance suite green in CI; update `check-demo-match.ts` header/expectations; audit root `better-sqlite3` (no runtime workspace declares it — remove or quarantine to dev-only); evict `movies/` frames from git history going forward (release artifacts, not source). Add `scripts/check-purity.ts`: CI fails if any runtime dependency is outside the pure-TS allowlist.
*Gate:* `pnpm typecheck && pnpm verify && pnpm --filter @notention/conformance test` all green; purity check green.

**P1 — Finish the Center (2–3 wk).** D8 fixes + typed values (money/qty/dur/time) + operators; respond/act step produces a durable linked response Note visible from both sides; golden-path E2E (`ui/test/journeys/golden-demo.spec.ts`) and `stranger-test` pass unaided.
*Gate:* demo pair scores ≥0.99 with full explanation; missing-constraint and conflict regression tests pin §13.2; stranger completes the loop <2 min.

**P2 — Protocol kernel (4–6 wk).** D1 canonical CBOR + NoteID + §10.2 digest + §10.5 ten-step verification; D2 versioning/parents/tombstones/outbox; §22.1 vectors 5/5; PeerID; store migration with recovery tests (harness exists).
*Gate:* conformance canonicalization + signature suites green; two stores converging on identical NoteIDs across browser/Node; kill criterion: if canonical encoding isn't vector-stable in 3 weeks, freeze the encoding as JCS-JSON (RFC 8785, pure TS) and amend §7 — do not stall.

**P3 — Networked loop (4–6 wk).** Nostr binding per §15.3 + head pointers + NoteID dedupe; relay federation; HTTP binding + export/import bundles; Meshtastic fragmentation + Web Bluetooth; privacy gate enforced on every provider.
*Gate:* simulator partition scenario — A offline 6 h, B behind firewall, both converge with verifiable receipts; mesh round-trip of a ≤256 B-fragmented note between two radios (hardware-in-loop, documented).

**P4 — Trust & keys (5–8 wk).** D5 + D6: WoT inbox, Invite/Endorsement/Block/Rotation/Recovery/Revocation Notes, SealedNote wiring (`privacy.ts` types exist, unwired), circle keys, passkey unlock + BIP39 backup + device subkeys.
*Gate:* scripted sybil flood (10k fake identities in simulator) never reaches a default inbox; key-compromise drill: rotate → old key revoked → history verifies; recovery drill with 2-of-3 guardians.

**P5 — Production (6–10 wk).** Android PWA (install, Web Push via agent, offline multi-device), Termux agent guide; a11y audit (axe-core + existing keyboard journeys) and i18n catalogs; 1k-agent scale benchmark; security checklist (§20) incl. prompt-injection and rendering safety (DOMPurify exists); docs + conformance profile badges updated in README2.
*Gate:* the Definition of Done below, on real devices, cold-start, unaided.

**Optional parallel tracks (never block a gate):** Yjs realtime drafts (Realtime profile) · payments data objects (§18 notes-as-data only; escrow/governance deferred; no chain, no token) · libp2p binding · WebLLM experiments.

**Effort (honest, with P1a mostly done):** solo **7–10 months** to networked v1; 3-person team **4–6 months**. Compare TODO.18's 5–8 years: the difference is not optimism — it is deleting PoW, iOS, native shells, CRDT research, and global consensus from the requirement set.

---

## 5. Spec amendments to README2 (small, surgical)

1. §17.5: strike "proof-of-work" from signals; add InviteNote tree + local quotas as the reference mechanism.
2. §15.5: mark libp2p binding *optional, not required for any profile*; elevate §15.6 HTTP + file-bundle exchange to the conforming offline path.
3. §13.2: pin priority default (0.5) and state explicitly: denominator = all required constraints; failed/conflicted/missing required → not a match.
4. §16.6: name Yjs as the reference realtime implementation; Automerge removed everywhere.
5. §21: add a **Platform Profile** (Node ≥22 + Chromium/Android; no native/WASM runtime deps) enforced by `check-purity.ts`.
6. §10.6: keep schnorr mandatory; ed25519 optional agility only (fixes 19c's interop break).

## 6. Definition of Done (TODO.18, restated feasibly)

> A stranger on an Android phone (PWA, offline 6 h, optionally a Meshtastic radio or a Termux agent) captures a request. A stranger on a Linux laptop (browser + Node agent, behind NAT) receives it via Nostr relay, HTTP bundle, or mesh; the matcher explains the match; both act through guarded transition Notes and see the accepted state with signed receipts. All versions preserved, conflicts surfaced, keys rotatable and recoverable, inbox Sybil-quarantined without PoW, accessible to a blind user, in their language — **and every line of product code that makes this true is TypeScript.**

**What this plan deliberately does not promise:** global Sybil immunity, rich-text CRDT merging, iOS, formal proofs, or a 10k-node benchmark. It promises a federating, local-first coordination protocol that a small team can actually ship — which is what the codebase, at 8/14 Core conformance with the matcher already repaired, is genuinely one disciplined year away from.
