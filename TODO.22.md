# TODO.22 — From Local Loop to Survival Infrastructure
## The No-Fucking-Around Plan

**Premise:** TODO.20 delivered a working local loop (capture → match → act on one device). TODO.21 will deliver Nostr transport + private networks (real people coordinating). This plan covers **TODO.22 → TODO.25**: the path from "private networks work" to **"survival infrastructure that functions when the grid fails."**

**Constraint:** Every phase must pass its kill criterion. If a phase fails, we stop, diagnose, and fix — we do not proceed. No "we'll fix it later." No "good enough for now." Lives depend on this working.

---

## Phase Overview

| Phase | Focus | Duration (2-person) | Kill Criterion |
|-------|-------|---------------------|----------------|
| **TODO.21** | Nostr Transport + Private Networks | 6-8 wks | 2 users, 1 week, zero data loss, real coordination |
| **TODO.22** | Trust + Attestation + Mesh Hardening | 8-10 wks | Key rotation works; signed receipts verified by stranger; Meshtastic background sync 24h |
| **TODO.23** | GSS Ontology + Manifest + Survival Routing | 10-12 wks | BiologicalManifest → route avoids lethal zones; finds resources; compass mode works |
| **TODO.24** | Multi-Device + Offline-First Hardening | 6-8 wks | Phone + laptop same identity; 72h offline; 500 notes <2s; blind user completes flow |
| **TODO.25** | Pilot Deployment + Chaos Hardening | 8-12 wks | Mutual-aid group uses it 90 days; zero privacy incidents; measurable coordination improvement |

**Total: ~38-50 weeks (9-12 months) with 2-person team.** Solo: 18-24 months.

---

## TODO.22 — Trust, Attestation, Mesh Hardening
**Goal:** Make coordination *trustworthy* and *work offline on mesh*.

### 22.1 Identity & Key Management (Weeks 1-3)
**Kill Criterion:** User rotates key after compromise; all notes, matches, capabilities migrate without data loss.

| Task | Spec |
|------|------|
| **Nostr key derivation** | BIP39/HD path `m/44'/1237'/0'/0/0` (Nostr = coin 1237); seed phrase optional |
| **Passkey/WebAuthn backup** | `credentialId` → encrypt nsec; recovery via platform authenticator |
| **Encrypted shards (social recovery)** | Shamir secret sharing (k-of-n); shards encrypted to guardian pubkeys; stored on relays (kind 10000) |
| **Key rotation protocol** | New keypair → sign rotation event (kind 30004) → publish to all relays → old key signs delegation to new (UCAN-style) → clients auto-migrate follows |
| **Revocation** | Kind 30005 event; clients reject events from revoked key after grace period |

### 22.2 Attestation System (Weeks 2-4)
**Kill Criterion:** Stranger verifies match acceptance receipt without trusting any server.

| Task | Spec |
|------|------|
| **Receipt kinds** | `AcceptReceipt` (kind 30006), `WithdrawReceipt` (30007), `CompleteReceipt` (30008), `CancelReceipt` (30009) |
| **Receipt content** | `{matchId, action, timestamp, prevEventId, signerPubkey, signature}` |
| **Verification API** | `verifyReceipt(receipt, expectedSigner)` → `{valid, signer, timestamp}` |
| **Receipt chaining** | Each transition references prev event; full chain = verifiable history |
| **UI: Receipt viewer** | Shows chain, verifies each link, exports as JSON/QR for offline verification |

### 22.3 Web of Trust + Trust Tiers (Weeks 3-5)
**Kill Criterion:** Sybil attack costs >$1000 (PoW + WoT combined); tier displayed in match explanation.

| Task | Spec |
|------|------|
| **Tier 1: Systemic** | Hardcoded pubkeys (USGS, NOAA, official relays) — weight 1.0 |
| **Tier 2: Verified Mesh** | Nostr pubkeys with ≥30 days uptime + valid NIP-65 + PoW stamp (difficulty 24) — weight 0.8 |
| **Tier 3: Anonymous** | New keys, no WoT — weight 0.2; requires 3+ corroborating Tier 2+ for elevation |
| **WoT graph** | Follows (kind 3) + attestations → compute trust score per pubkey; cache in SQLite |
| **Match explanation integration** | Show counterparty tier + trust score; "This match relies on Tier 3 data — verify independently" |

### 22.4 Meshtastic Hardening (Weeks 4-7)
**Kill Criterion:** Background relay works 24h on Android; note syncs between 2 devices over mesh in <30s.

| Task | Spec |
|------|------|
| **Android foreground service** | `WorkManager` + `ForegroundService` for persistent BLE connection; `PARTIAL_WAKE_LOCK` |
| **Store-and-forward** | Local SQLite queue on device; priority queue (urgent > normal > low); TTL per message |
| **Packet fragmentation** | Chunk large events (>200 bytes) across multiple Meshtastic packets; reassemble on receive |
| **Relay discovery** | Meshtastic `NeighborInfo` → auto-connect to best hop; fallback to broadcast |
| **Nostr ↔ Mesh bridge** | Local relay (Android) subscribes to Nostr; publishes to mesh; mesh events → Nostr |
| **Battery budget** | Target: <5% battery/hour idle; <15%/hour active sync; configurable sync intervals |

### 22.5 Private Network UX Hardening (Weeks 5-8)
**Kill Criterion:** Non-technical user creates/joins private network in <2 min; works offline.

| Task | Spec |
|------|------|
| **Invite format** | `nostr+invite://relay1,relay2?auth=<nip42_token>&name=FamilyNet` + QR |
| **Network dashboard** | Members list (npubs), relay status, pending sync count, last seen |
| **Admin controls** | Revoke member (publish kind 30010), rotate auth token, add/remove relays |
| **Offline indicator** | "Sync pending: 3 notes" badge; auto-sync on reconnect; conflict resolution UI |

---

## TODO.23 — GSS Ontology + Manifest + Survival Routing
**Goal:** The "Survival GPS" view — BiologicalManifest → optimal spacetime trajectory.

### 23.1 GSS Ontology Pack (Weeks 1-3)
**Kill Criterion:** Ontology covers hazards, resources, shelter, medical, transport, comms; Gardener proposes zero noise keys on synthetic test.

| Domain | Keys (examples) |
|--------|-----------------|
| **Hazard** | `radiation_mSv`, `toxic_ppm`, `fire_risk`, `flood_depth_m`, `pathogen_level`, `structural_damage` |
| **Resource** | `water_liters_stock`, `water_liters_per_hr`, `calories_stock`, `calories_per_hr`, `medical_supply_units`, `fuel_liters`, `power_watts` |
| **Shelter** | `capacity_people`, `insulation_r_value`, `elevation_m`, `defensible`, `heating_type` |
| **Medical** | `trauma_kit_level`, `antibiotic_types`, `insulin_units`, `dialysis_available`, `oxygen_lpm` |
| **Transport** | `vehicle_type`, `fuel_type`, `capacity_people`, `offroad_capable`, `range_km` |
| **Comms** | `radio_type`, `frequency_mhz`, `power_watts`, `mesh_node`, `satellite_link` |

### 23.2 BiologicalManifest Editor (Weeks 2-4)
**Kill Criterion:** User creates manifest for family of 4 (infant, elderly, diabetic, healthy) in <5 min; exports as QR.

| Field | UI |
|-------|----|
| **Base needs** | `water_liters_per_day`, `calories_per_day`, `medication_units_per_day`, `oxygen_lpm` |
| **Tolerances** | `temp_c: [-10, 35]`, `radiation_mSv: [0, 10]`, `altitude_m: [0, 3000]`, `air_quality_aqi: [0, 100]` |
| **Modifiers** | `exertion_multiplier`, `altitude_adjustment`, `temperature_adjustment`, `stress_multiplier` |
| **Per-person profiles** | Multiple manifests per identity; group manifest = aggregate + worst-case tolerances |

### 23.3 Survival Routing Engine (Weeks 3-8)
**Kill Criterion:** Given manifest + SpimeDB (NObjects with provides/imposes/@spacetime), engine returns trajectory avoiding lethal zones, hitting resources, within time horizon.

| Component | Implementation |
|-----------|----------------|
| **Time-Expanded Network (TEN)** | Discretize time into 1-hour slices (configurable); nodes = (location, time); edges = movement/wait |
| **Cost function** | `cost = movement_energy + hazard_penalty - resource_bonus`; hazard_penalty = ∞ if breach |
| **Algorithm** | 4D A* on TEN (Rust → WASM); heuristic = straight-line distance / max_speed |
| **Output** | `GeoJSON.LineString` with timestamps; `deficits` at each step; `breaches` avoided; `surplus` acquired |
| **Compass Mode** | If WASM engine fails: barometer + compass + cached manuals + last known good trajectory |

### 23.4 GeoLibre Integration (Weeks 4-8)
**Kill Criterion:** Map shows "Thirst Layer" (water deficit gradient), "Lethal Exclusion Zones" (red polygons), "Cache Layer" (surplus markers); time slider scrubs trajectory.

| Layer | Query |
|-------|-------|
| **Deficit Gradient** | DuckDB: `SELECT * FROM nobjects WHERE provides.water_liters_per_hr > 0` → interpolate distance/deficit |
| **Exclusion Zones** | `SELECT * FROM nobjects WHERE imposes.radiation_mSv > manifest.tolerances.radiation_mSv[1]` → buffer → polygon |
| **Trajectory** | Render WASM engine output as animated line with time scrubber |
| **Compass Overlay** | If engine down: bearing to next waypoint + distance + hazard warning |

---

## TODO.24 — Multi-Device + Offline-First Hardening
**Goal:** Same identity on phone + laptop; 72h offline; accessible.

### 24.1 Multi-Device Sync (Weeks 1-3)
**Kill Criterion:** Phone + laptop same npub; notes/matches/manifests sync in <5s; conflict resolved.

| Task | Spec |
|------|------|
| **Device linking** | QR code (nsec encrypted to device pubkey) OR passphrase entry |
| **Session sync** | Nostr kind 30011 (session state); each device publishes on change; others apply |
| **Conflict resolution** | Last-write-wins for replaceable events (kinds 30000-39999); CRDT for local-only drafts |
| **Device list + revoke** | UI shows linked devices; revoke = publish kind 30012 → other devices logout |

### 24.2 Offline-First Hardening (Weeks 2-5)
**Kill Criterion:** 72h offline → reconnect → zero data loss, zero dupes, matches complete.

| Task | Spec |
|------|------|
| **SQLite schema v2** | `events(id, kind, pubkey, content, tags, sig, created_at, synced, device_id, version)` |
| **Conflict-free sync** | Deterministic event ID = SHA256(serialized_event); UNIQUE constraint; dedup on ingest |
| **Background sync** | Service Worker (Web) / WorkManager (Android) / BackgroundTasks (iOS) — configurable interval |
| **Sync priority** | Urgent (matches, receipts) > Normal (notes) > Low (ontology, settings) |
| **Storage quota** | OPFS quota management; LRU eviction for cached remote notes; local notes never evicted |

### 24.3 Accessibility (Weeks 3-6)
**Kill Criterion:** Blind user completes capture → match → respond → accept flow with screen reader.

| Requirement | Implementation |
|-------------|----------------|
| **WCAG 2.1 AA** | Semantic HTML, ARIA labels, focus management, contrast ratios, focus visible |
| **Screen reader** | NVDA (Windows), VoiceOver (iOS/macOS), TalkBack (Android), Orca (Linux) |
| **Keyboard navigation** | All workflows: Tab/Shift+Tab, Enter/Space, Escape, Arrow keys |
| **Motion reduction** | `prefers-reduced-motion` respected; animations disabled |
| **High contrast** | User-selectable themes (system, light, dark, high-contrast) |

---

## TODO.25 — Pilot Deployment + Chaos Hardening
**Goal:** Real mutual-aid group uses it 90 days; measurable improvement; zero incidents.

### 25.1 Partner Onboarding (Weeks 1-2)
**Kill Criterion:** Group of 20+ people onboarded; each creates manifest; network runs.

| Task | Spec |
|------|------|
| **Partner criteria** | Existing mutual-aid/community group; weekly coordination needs; willing to test |
| **Deployment** | 3 relays (VPS + Tor hidden service + local Meshtastic gateway); invite links generated |
| **Training** | 2-hour workshop: capture, manifest, matching, mesh, compass mode |
| **Support channel** | Dedicated Nostr DM group + weekly check-in call |

### 25.2 Measurement (Weeks 2-10)
**Kill Criterion:** Coordination cost ↓ (hours from need → match); failed cooperation recovered; dignity-preserving access ↑.

| Metric | Instrument |
|--------|------------|
| **Time to match** | Friction journal: `capture_started` → `match_accepted` timestamp diff |
| **Completion rate** | Commitment lifecycle: `open` → `matched` → `accepted` → `completed` |
| **Lapse/cancel analysis** | Correlate with match explanation completeness (TODO.science E5/E6) |
| **Mesh resilience** | Inject partition (disable relay) → measure sync recovery time |
| **User comprehension** | Monthly E10-style think-aloud: "What changed? How undo? What convinced/scared you?" |

### 25.3 Chaos Engineering (Weeks 4-10)
**Kill Criterion:** System survives all chaos scenarios without data loss or safety breach.

| Scenario | Method | Pass Condition |
|----------|--------|----------------|
| **Relay failure** | Kill 2/3 relays | Mesh sync continues; notes propagate via remaining |
| **GPS spoofing** | Fake location broadcast | Manifest tolerances trigger exclusion; user warned |
| **Sensor poisoning** | Inject fake `water_liters_per_hr: 1000` | Tier 3 weight → requires 3x corroboration; not acted on alone |
| **Battery death** | Phone dies mid-sync | On recharge: queue flushes; no dupes; receipts valid |
| **Mesh partition** | Two groups isolated 4h | Local coordination works; merge on reconnect clean |
| **Key compromise** | Simulated nsec leak | Rotation protocol migrates all data; old key revoked |

### 25.4 Hardening & Release (Weeks 8-12)
**Kill Criterion:** Zero critical bugs; all chaos scenarios pass; partner renews.

| Task | Spec |
|------|------|
| **Bug triage** | Critical (safety/data loss) → immediate; High → 48h; Medium → 1 week |
| **Security audit** | Third-party (Cure53/Trail of Bits) on crypto, mesh, WASM engine |
| **Documentation** | User manual (offline-first); developer docs; protocol spec v1.0 |
| **Release artifacts** | Signed APK, PWA manifest, Docker relay images, Meshtastic firmware config |
| **Handoff** | Partner owns relay keys; community maintains; Notention team = upstream only |

---

## Architecture Decisions (Locked — No Revisiting)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | **Primary transport** | Nostr (relays) + Meshtastic (mesh) | Proven, decentralized, hardware exists |
| 2 | **Identity** | Nostr secp256k1 + BIP39/HD + Passkey backup + Shamir recovery | Standard, recoverable, no seed phrase UX |
| 3 | **Canonical form** | JCS-JSON → Nostr event (kind 30000-39999) | Deterministic hashing; Nostr native |
| 4 | **Encryption** | NIP-44 (v2) for DMs; NIP-17 for sealed envelopes | Audited, forward secrecy |
| 5 | **Local DB** | SQLite (OPFS/Web) / SQLite (Native) | ACID, indexes, WASM portable |
| 6 | **Survival engine** | Rust → WASM (Time-Expanded Network A*) | Performance; memory safety; browser + native |
| 7 | **AI/Extraction** | ONNX Runtime Web (MobileBERT) + heuristics | <50MB; CPU/NPU; deterministic; no WebGPU |
| 8 | **UI Framework** | React + MapLibre + Deck.gl (GeoLibre) | Existing investment; performant mapping |
| 9 | **Mobile wrapper** | Capacitor (Android/iOS) | Native BLE, background, notifications |
| 10 | **Protocol versioning** | `protocolVersion` in every event; 12mo dual-support | Interop; no forced upgrades |

---

## Risk Register (Honest)

| Risk | Likelihood | Impact | Mitigation | Kill If |
|------|------------|--------|------------|---------|
| **Meshtastic background fails on Android** | High | Fatal | Capacitor + native plugin; test on 5 devices; fallback to periodic foreground sync | Phase 22.4 kill criterion fails |
| **WASM engine too slow on low-end phones** | Medium | High | Time-slice granularity configurable; compass mode fallback; profile on $100 phone | Phase 23.3 kill criterion fails |
| **Key rotation loses data** | Low | Fatal | Exhaustive test: 1000 rotations; property-based testing; formal spec | Phase 22.1 kill criterion fails |
| **Partner group drops out** | Medium | High | Recruit 2 groups; minimal viable group = 10 people | Phase 25.1 kill criterion fails |
| **Regulatory blocks mesh/encryption** | Low | Fatal | Legal review pre-phase; design for "receive only" mode | Legal sign-off fails |
| **Scope creep** | Certain | Fatal | **Kill criteria are law.** No new features until current phase passes. | Any phase adds scope |
| **Team burnout** | High | Fatal | 4-day weeks; mandatory 2-week break between phases; no heroics | Velocity drops >30% |

---

## Success Metrics (Non-Negotiable)

| Metric | TODO.21 | TODO.22 | TODO.23 | TODO.24 | TODO.25 |
|--------|---------|---------|---------|---------|---------|
| **Sync latency (P95)** | <2s | <2s | <2s | <2s | <2s |
| **Offline queue success** | 100% | 100% | 100% | 100% (72h) | 100% |
| **Receipt verification** | N/A | 100% | 100% | 100% | 100% |
| **Key rotation success** | N/A | 100% | 100% | 100% | 100% |
| **Mesh sync (2 devices)** | N/A | <30s | <30s | <30s | <30s |
| **Survival route compute** | N/A | N/A | <5s | <5s | <5s |
| **Compass mode fallback** | N/A | N/A | Works | Works | Works |
| **Multi-device sync** | N/A | N/A | N/A | <5s | <5s |
| **Accessibility (WCAG)** | N/A | N/A | N/A | AA | AA |
| **Partner coordination improvement** | N/A | N/A | N/A | N/A | Measured ↑ |
| **Zero privacy incidents** | Required | Required | Required | Required | Required |

---

## Team & Capacity (Realistic)

| Role | TODO.21 | TODO.22 | TODO.23 | TODO.24 | TODO.25 |
|------|---------|---------|---------|---------|---------|
| **Core (Rust/WASM, crypto, mesh)** | 1 | 1 | 1 | 0.5 | 0.5 |
| **Protocol (Nostr, events, attestation)** | 1 | 1 | 0.5 | 0.5 | 0.5 |
| **UI/UX (React, MapLibre, a11y)** | 0.5 | 0.5 | 1 | 1 | 0.5 |
| **Mobile (Capacitor, Android, iOS)** | 0 | 0.5 | 0.5 | 1 | 0.5 |
| **DevOps (relays, CI, chaos)** | 0.5 | 0.5 | 0.5 | 0.5 | 1 |
| **Partner liaison / testing** | 0 | 0 | 0 | 0 | 1 |
| **Total FTE** | **3** | **3.5** | **3.5** | **3.5** | **4** |

**Funding requirement:** ~$800k-1.2M for 12 months (4 FTE + infrastructure + audit + hardware).

---

## Decision: Proceed or Stop?

**This plan only works if:**

1. **You commit to the kill criteria.** No "we'll fix it in the next phase." If a phase fails, you stop and fix it.
2. **You fund it properly.** 3-4 FTE for 12 months. Grants (NLnet, EF, NGI) + sponsorships. No VC.
3. **You accept the architecture locks.** No revisiting transport, identity, canonical form, engine language.
4. **You recruit the team.** Core (Rust/WASM), Protocol (Nostr), UI (React/MapLibre), Mobile (Capacitor), DevOps.
5. **You partner with a real community.** Not "users" — partners who *need* this and will tell you when it fails.

**If any of the above is "no" or "maybe later" → STOP. Do not start TODO.21.**

The world doesn't need another half-finished coordination app. It needs infrastructure that works when the grid fails.

---

## Append-Only Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-12 | TODO.22-TODO.25 plan created | Local loop done; next phase must bridge to survival infrastructure |
| — | — | — |

*Add rows only when a kill criterion forces a pivot or a hard decision is made.*