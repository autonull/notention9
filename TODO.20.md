# TODO.20 — Usable Networked v1 (Canonical Plan)

**Status:** Active execution plan. Supersedes TODO.19/19b/19c/19d.
**Spec source of truth:** `README.md` + code. README2.md is **deprecated** (drifts from code).
**Strategy:** usability first, protocol purity second — a working two-stranger match early, canonical identity added additively.

---

## 0. Start Here (Fresh Session)

**Read order:** `AGENTS.md` → this file (§1–§5) → `ARCHITECTURE.md`. `README2.md` is deprecated; do not treat it as spec.

**Current state (2026-11-12):** `pnpm typecheck` green (0 errors) · `pnpm verify` L1–L3 green · `check-demo-match.ts` scores 1.0 · conformance fails only due to 29 stale gitignored build artifacts in `simulator/src`.

**First commands (P0):**
```bash
git clean -Xf simulator/src                        # remove stale *.js/*.d.ts/*.map
pnpm --filter @notention/conformance test           # must pass after clean
pnpm exec tsx scripts/check-demo-match.ts           # expect score 1, exit 0
```

**Guardrails:**
- Pure TS/JS runtime only; no native or WASM runtime deps (dev tooling exempt).
- Do not edit `README2.md`; record spec changes in this file §6.
- Priority default is **1.0**; do not reintroduce 0.5.
- Do not rewrite git history; remove `movies/` from the index only.
- Use `pnpm`; never commit secrets or plaintext keys.
- No P2 human sessions are required to start or to pass any P0–P5 gate.

**"Started" means:** P0 gate green (§5).

---

## 1. Verified Ground Truth (audited 2026-11-12)

| Asset | Location | State |
|---|---|---|
| Property roles (`constraint`/`fact`/`marker`), quantity, provenance | `core/src/types/domain.ts` | ✅ |
| Matcher | `core/src/matching/MatchEngine.ts` | ✅ except 2 defects (§2) |
| Nostr CBOR encode/decode, schnorr signing, `PROTOCOL_VERSION=1` | `core/src/network/nostr/protocol.ts` | ✅ |
| Transport seam, registry, gate, Nostr + Meshtastic providers | `core/src/network/*` | ✅ |
| TypeScript Nostr relay | `core/src/network/nostr/relay.ts`, `agent/src/relay/start.ts` | ✅ |
| Publish path (`finalizeEvent`) + subscribe + relay status hooks | `ui/src/hooks/usePublish.ts`, `useNetworkData.ts` | ✅ |
| Act step: response + withdrawal notes | `core/src/notes/notes.ts:215` | ✅ |
| Browser storage: localforage (IndexedDB) + file-per-key Node | `core/src/storage/*`, `ui/src/hooks/useLocalForage.ts` | 🟡 KV, not event-sourced |
| Simulator, golden-path E2E, stranger-test, a11y journey | `simulator/*`, `ui/test/*`, `scripts/*` | 🟡 stray build artifacts |
| Capability-gated agent, policy, audit | `agent/*`, `core/src/security/CapabilityManager.ts` | ✅ |

**Previously-claimed gaps that are already closed (do not re-plan):**
- ✅ `pnpm typecheck` passes with **0 errors** (the "319 UI errors" claim was stale).
- ✅ `check-demo-match.ts` scores **1.0** and the demo match displays. Only its stale header comment is wrong.
- ✅ `pnpm verify` L1–L3 green; golden-path and act-step journeys pass.
- ✅ Conformance failure is 29 **gitignored** `*.js/*.d.ts/*.map` files left in `simulator/src` that confuse Vite — not a build rewrite.

**Real debt:**
- 2 MatchEngine defects (§2).
- Naive `canonicalize()` (`core/src/utils/common.ts:41`) — `JSON.stringify`, not canonical. Replace, do not duplicate.
- Root `better-sqlite3` (native) in `package.json`; no runtime workspace declares it.
- 818 Playwright frame PNGs tracked under `movies/`.
- Manual, plaintext identity (keys only via Settings → Nostr; `privkey` stored in settings).
- **E15 editor hook bug** — auto-skips 6 editor scenes plus 2 editor-dependent scenes (`editor.scene.ts`, `matching.scene.ts:22`, `notes.scene.ts:12`). Editor screenshots cannot be generated.
- **Screenshot pipeline is destructive and serial** — `reset-screenshot.mjs` wipes the gallery before a run that can fail; per-scene `.json` sidecars were wrongly tracked; `workers: 1`.
- **Test timeouts treated as knobs** — a stale placeholder selector in `modals.scene.ts` timed out at 45s and silently killed the rest of the run.

---

## 2. Two MatchEngine Defects (P1, before network work)

**Bug 1 — Denominator excludes missing constraints.** `findMatches` returns nothing when the offer lacks a key (`MatchEngine.ts:34-35`), so `requiredConstraintCount` never counts it. Request with 3 required constraints, 1 satisfied, 2 absent → **1.0 instead of 0.33**.
Fix: denominator = all required constraints of the request; missing required → unsatisfied.

**Bug 2 — Conflicts subtract instead of zeroing.** `totalScore += r.compatibility` adds −1 (`MatchEngine.ts:66-68`). With 5 constraints, 4 satisfied + 1 conflict → 0.6 → displayed. Any failed required constraint MUST NOT present as a match.
Fix: failed/conflicted required → contributes 0; any failed required → `score = 0`.

**Priority default = 1.0** (code wins; amend spec; remove the 0.5 reference).

---

## 3. Invariants (Non-Negotiable)

| Invariant | Notes |
|---|---|
| Pure TS/JS runtime | No native modules, no required WASM, no Rust/Go/Kotlin/Swift in product code. Dev tooling exempt. |
| Platforms | Linux/Win/macOS desktop ✅ · Android ✅ (PWA + optional Termux) · iOS ❌ · app stores ❌ |
| Nostr-first transport | Mesh second, HTTP third, libp2p never on critical path. |
| schnorr/secp256k1 mandatory | `nostr-tools`; ed25519 optional agility only. |
| Content-addressed identity | `NoteID = SHA-256(JCS(NoteBody))` (see D1). |
| Immutable versions + head pointers | Updates = new Note with `parents`; deletion = tombstone. |
| Conflicts are branches | No CRDT on critical path; Yjs optional for drafts only. |
| Trust is local | Follow-allowlist for v1; WoT/invites/rotation/recovery post-v1. |
| AI optional | Deterministic extraction is the conforming path; LM experimental, default off. |

### 3.1 Testing & Tooling Standards (Normative)

- **Selectors:** select by semantic, unambiguous hooks — `getByRole`, `getByLabel`, `getByTestId`. Never exact-match a `placeholder` or a raw CSS/text target when a role or label can express intent. If a widget lacks the right semantics (e.g. the command-palette input), **add** the ARIA role/label to the component — this fixes accessibility and test stability at once.
- **Screenshots are output, not baselines:** `doc/screenshot/manifest.json` + `README.md` are canonical. Per-scene `*.json` sidecars are transient and MUST NOT be tracked.
- **Atomic generation:** generate into `doc/screenshot/.tmp` and swap on success. Never delete the live gallery before a run that can fail.
- **Timeouts are failures:** a timeout means a selector or state is wrong. Fix the cause; do not raise the timeout.
- **Moderate parallelism:**
  - Showcase screenshots: `--workers=4`, keep `fullyParallel: false` (file-level parallelism; scenes are independent).
  - Journeys/optimize: `--workers=2` max (shared relay + exact-count assertions).
  - Shared `launchOptions.localStorageFile` must be made per-worker (or removed) before raising worker counts.
  - Vitest: keep per-workspace; optional `pnpm -r --workspace-concurrency=4 test`.

---

## 4. Architecture Decisions

### D1 — Canonical identity = JCS-JSON (RFC 8785), CBOR only on the wire
- `NoteID = "note:" + base64url(SHA-256(JCS(NoteBody)))` using a mature pure-TS JCS library.
- Keep `cbor-x` **only** for transport payloads (already in `protocol.ts`).
- Replace the naive `canonicalize()` in `core/src/utils/common.ts` with the single canonical module; delete the old path.
- **Why:** removes the hand-rolled CBOR encoder and its 3-week kill-criterion gamble. Canonical identity and wire encoding are decoupled.

### D2 — Event store = KV event log + in-memory index
- Reuse the existing storage: browser localforage (IndexedDB), Node file-per-key.
- Add `keys(prefix)`/`iterate()` to `StorageAdapter`; store one event per key (`ev:<noteId>`), one `heads` record, one `outbox` record.
- In-memory index (by id, author, type, key) rebuilt on boot; persisted index optional later.
- Migrate to a dedicated IndexedDB object store **only if profiling demands**. No up-front schema.
- Encryption at rest via XChaCha20-Poly1305 (`@noble/ciphers`) once identity is encrypted.

### D3 — Versioning & conflicts
- Update = new Note with `parents = [prev]`. Deletion = tombstone Note.
- Two concurrent children → both preserved, object marked conflicted, UI resolves → two-parent version.
- Silent overwrite prohibited.

### D4 — Identity onboarding = load-or-create (configurable, testable)
- `IdentityService.loadOrCreate()`: return stored key, else generate (schnorr) when `autoGenerateIdentity` (default **true**), persist, show one-time backup prompt.
- Store the key **encrypted** (passphrase/WebAuthn-wrapped) — never plaintext `nsec` in settings by default.
- Config seam: `autoGenerateIdentity: boolean`; env override `NOTENTION_PRIVKEY` for e2e.
- **Testing:** `seed()` pre-writes a fixed `settings.nostr.privkey` → auto-gen never fires → deterministic. No mocks.

### D5 — Transitions: one response Note, derived state
- Ship the existing response/withdrawal notes linked by `parents`; derive state from notes.
- Full guarded transition tables (§14) are post-v1; a single accept/decline closes the loop.

### D6 — Trust: explicit follow-allowlist for v1
- Auto-sync/auto-match only notes from followed peers; everything else quarantined, never auto-matched.
- Endorsement/Block Notes and per-peer quotas next. WoT 2-hop, invite tree, rotation, recovery = post-v1 (invite tree optional, low priority).
- No PoW anywhere.

### D7 — Transports
- **Nostr:** wire publish/subscribe → matcher → response across two clients; dedupe by event id first, NoteID later; relay federation (our TS relay is the harness).
- **Mesh:** finish fragmentation (`mid/seq/final`, ≤256B, CBOR, hash-referenced large objects); Web Bluetooth for Android; Web Serial desktop. Post-v1 unless time allows.
- **HTTP:** file-bundle export/import (sneakernet) = fully offline partition story. Post-v1.
- libp2p: optional, unimplemented.

### D8 — Matching: fix §2, land typed values, add operators
- Fix both defects; add regression tests pinning §13.2.
- Typed values in order: `money`, `qty`, `dur`, `time`, then rest.
- Operators: `approx`, `in`, `exists`, `inter`.
- Incomparable dimensions explicit, never silent. `check-demo-match.ts` becomes an asserting CI gate.

### D9 — Scale: measured, honest
- 1,000 in-process simulated agents with partition/churn/reorder; relay federation across ≥3 self-hosted relays.
- "Civilization-scale" = federating, no central point of failure — not a benchmark number.

---

## 5. Execution Plan (usability-first; gates are law)

### P0 — Repo truth (days)
- `git clean -Xf simulator/src` + guard `tsc` output to `dist/` (no emit into `src/`).
- Fix `check-demo-match.ts` header (now scores 1.0).
- Remove root `better-sqlite3` (+ `@types/better-sqlite3`).
- `git rm -r --cached movies/` + gitignore (no history rewrite).
- Add `scripts/check-purity.ts` with explicit pure-TS allowlist; wire into CI.
- Assert PWA service worker caches the app shell.
- **Screenshot pipeline:** atomic `.tmp` + swap; stop tracking `*.json` sidecars; commit `manifest.json`/`README.md`; `--workers=4`; shared `localStorageFile` removed (tests seed IndexedDB).
- **Selector standard (§3.1):** command-palette input is now a semantic `combobox`; no placeholder selectors remain.
- **Gate:** `pnpm typecheck && pnpm verify && pnpm --filter @notention/conformance test` green; purity green; full `pnpm screenshots` completes (16 passed, only E15 skips).

### P1 — Networked loop (2–3 wk)
- **P1.0 (blocking) — E15 editor unblock:** diagnose the React hook bug behind the 8 auto-skipped scenes (`editor.scene.ts`, `matching.scene.ts:22`, `notes.scene.ts:12`); fix and remove `test.skip(...E15...)` only after the scene passes. Gate: **0 E15 skips**, editor screenshots generated.
- Wire publish → relay → subscribe → matcher → response across **two clients**.
- Follow-allowlist filter (D6 MVP).
- Visible relay status + outbox on failure (no silent drops).
- **Gate:** Playwright two-client journey against the local TS relay: A publishes request, B receives, sees explained match, responds; both see accepted state.

### P2 — Identity + offline UX (2 wk)
- D4 load-or-create identity, encrypted at rest, one-time backup prompt.
- First-run "what this is / do this next" screen (closes the old P2 comprehension gap).
- Outbox status surface; PWA install/offline verified.
- **Gate:** a brand-new user, no settings, publishes and receives unaided; offline capture queues and flushes on reconnect.

### P3 — Canonical identity (2 wk, additive)
- D1 JCS + NoteID + signing digest; replace naive `canonicalize()`.
- Dedupe by NoteID; §10.5 verification steps.
- **Gate:** two stores converge on identical NoteIDs across browser/Node; conformance canonicalization + signature suites green.

### P4 — Event store + versions/conflicts (3–4 wk)
- D2 KV event log + index; D3 parents/tombstones/conflict branches.
- **Gate:** conflict regression pins; preserved branches surfaced in UI; history verifies after key rotation.

### P5 — Hardening & production (4–6 wk)
- Trust notes (endorsement/block), key rotation + recovery drill, circle keys/sealed notes.
- Android PWA + Web Push; a11y audit (axe + keyboard journeys); i18n.
- 1k-agent scale benchmark; security checklist (§20) incl. prompt-injection/rendering safety.
- **Gate:** Definition of Done on real devices, cold-start, unaided.

**Optional, never blocking a gate:** mesh binding, HTTP bundles, Yjs realtime drafts, payments data objects, libp2p, WebLLM, invite tree.

---

## 6. Spec Amendments (tracked here, not README2.md)

1. Canonical identity = **JCS-JSON** (§7, §4.3); CBOR is transport-only (§15).
2. Priority default = **1.0**; denominator = all required constraints; failed/conflicted/missing required → not a match (§13.2).
3. Remove proof-of-work from trust signals; follow-allowlist + quotas are the v1 mechanism (§17.5).
4. libp2p optional, never required (§15.5).
5. Yjs is the reference realtime implementation; Automerge removed (§16.6).
6. Add Platform Profile (Node ≥22 + Chromium/Android; pure-TS runtime) enforced by `check-purity.ts` (§21).
7. schnorr mandatory; ed25519 optional agility (§10.6).

---

## 7. Definition of Done

> A stranger on an Android phone (PWA, offline 6h) captures a request. A stranger on a Linux laptop (browser + Node agent, behind NAT) receives it via Nostr relay, the matcher explains the match, both act through linked response notes and see the accepted state with signed receipts. Versions preserved, conflicts surfaced, keys rotatable and recoverable, inbox allowlisted without PoW, accessible to a blind user, in their language — **and every line of product code is TypeScript.**

**Not promised:** global Sybil immunity, rich-text CRDT merging, iOS, formal proofs, 10k-node benchmark.

---

## 8. Resolved Design Decisions (record)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Canonical form | **JCS-JSON** | Mature pure-TS libs; removes hand-rolled CBOR risk |
| 2 | Phase order | **Usability-first** | Usable two-stranger loop at P1, not P4 |
| 3 | Event store | **KV + in-memory index** | Reuses localforage/file-per-key; no new schema |
| 4 | Identity | **Auto-generate, configurable, encrypted** | `load-or-create`; tests pre-seed fixed key |
| 5 | `movies/` | **Delete from HEAD + gitignore** | No destructive history rewrite |
| 6 | Priority default | **1.0** | Code wins; amend spec |
| 7 | Invite tree | **Deferred, optional** | Follow-allowlist covers v1 |

---

## 9. Immediate Next Steps

1. `git clean -Xf simulator/src`; guard `tsc` outDir → confirm `pnpm --filter @notention/conformance test` passes.
2. Fix `check-demo-match.ts` header comment.
3. Remove root `better-sqlite3` / `@types/better-sqlite3`.
4. `git rm -r --cached movies/` + add to `.gitignore`.
5. Write `scripts/check-purity.ts` (allowlist; fail on native/WASM runtime deps).
6. Screenshot pipeline: atomic `.tmp`+swap, untrack sidecars, `--workers=4` (done), shared `localStorageFile` removed (done).
7. P1.0: diagnose + fix E15 editor hook bug; remove the 8 `test.skip` guards.
8. P1.1–P1.2: fix MatchEngine denominator + conflict semantics; add regression tests.
9. P1.3: Playwright two-client relay journey.

---

*End of TODO.20.md. Canonical plan. README2.md deprecated.*