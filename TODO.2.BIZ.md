# TODO.2.BIZ — Strategic & Business Concerns (Exploratory)

**Status:** Parking lot for post-TODO.2. These are *governance/business* questions, not *design* decisions.

> **Rule:** If it doesn't affect the protocol spec or product UX directly, it lives here. TODO.2.md stays focused on P1–P5, Q1–Q6.
>
> **Principle:** *No assumptions about final structure.* Every option stays open with trade-offs documented. We decide later.

---

## 1. GOVERNANCE MODEL — WHO DECIDES?

*All models compatible with "Protocol > Product" and "No Platform Capture."*

| Model | How Protocol Changes Decided | How Product Decisions Made | Legal Form | Trade-offs |
|-------|------------------------------|----------------------------|------------|------------|
| **BDFL / Benevolent Dictator** | One person final say | Product lead decides | Individual / LLC | Fast, clear; single point of failure; succession risk |
| **Core Team Consensus** | Rough consensus (like IETF/Nostr) | Team discussion + RFC | Unincorporated association / Foundation | Legitimate, distributed; slow; "who's core?" ambiguity |
| **Token-Weighted / DAO** | On-chain voting (1 token = 1 vote) | Proposal + vote | DAO (Wyoming LLC, Cayman Foundation, etc.) | Aligned incentives; plutocracy risk; regulatory grey; complexity |
| **Multi-Sig / Council** | N-of-M signatures (e.g., 3/5) | Council vote | Foundation / Association | Accountable; small group capture risk; legal clarity |
| **Federated / Modular** | Each module has maintainer; protocol = interfaces | Independent per module | Network of entities | Scales; fragmentation risk; coordination overhead |
| **Hybrid** | Protocol = consensus; Product = team; Treasury = multi-sig | Mixed | Foundation + operating company | Best of both; complex governance docs |

**Key constraint from protocol:** *User owns keys, data, ontology. Export trivial. Forking is a right.* Any governance model must preserve exit rights.

**Decision trigger:** Before first breaking protocol change or external funding.

---

## 2. LEGAL ENTITY — WHAT HOLDS THE ASSETS?

| Structure | Jurisdiction Options | IP Ownership | Liability | Tax | Best For |
|-----------|---------------------|--------------|-----------|-----|----------|
| **No entity** (individuals) | — | Contributors individually | Personal | Personal | Pre-revenue, small team |
| **Non-profit Foundation** | US 501(c)(3), EU Stichting, Swiss Stiftung, Cayman Foundation | Foundation holds | Limited | Tax-exempt (mission income) | Public goods, grants, protocol stewardship |
| **For-profit LLC/C-Corp** | US (DE), UK, SG, EE, etc. | Company holds | Limited | Corporate tax | VC funding, commercial services |
| **DAOLLC / DAO LLC** | WY (US), Marshall Islands, Cayman, BVI | DAO holds (via smart contract) | Limited | Pass-through / uncertain | Native token, on-chain governance |
| **Association / Verein** | DE (e.V.), CH (Verein), FR (Association 1901) | Association holds | Limited | Tax-exempt (if non-profit) | Member-owned, democratic |
| **Cooperative** | US (co-op corp), UK (Co-op), EU (SCE) | Members own | Limited | Varies | Worker/user ownership |
| **Open Source Foundation** (Linux, Apache, Eclipse) | Hosted project | Foundation holds | Foundation | Foundation | Large ecosystem, neutral governance |
| **Dual Structure** (Foundation + OpCo) | Foundation (protocol) + Corp (services) | Split | Split | Split | Protocol neutrality + commercial sustainability |

**IP strategy options:**
- **CLA (Contributor License Agreement)** — Contributor retains copyright, grants broad license to entity
- **DCO (Developer Certificate of Origin)** — No copyright transfer, just provenance (Linux model)
- **Copyright assignment** — Entity owns all (GNU model)
- **No agreement** — Implicit license (risky for commercial use)

**Decision trigger:** Before accepting grants, revenue, or hiring employees.

---

## 3. FUNDING & SUSTAINABILITY — HOW TO PAY FOR IT?

*North Star constraint: **No platform capture** → users pay for *service*, not *access*. Protocol stays free.*

| Model | Mechanism | Pros | Cons | Compatible Structures |
|-------|-----------|------|------|----------------------|
| **Grants** | NLnet, EF, OSSTF, NGI, RFP, etc. | Non-dilutive, mission-aligned | Episodic, reporting, no recurring | All |
| **Corporate Sponsorship** | Companies fund development | Recurring, strategic alignment | Influence risk, brand dependency | All |
| **Managed Services** | Hosted relay, agent, indexer, analytics | User pays for convenience; protocol free | Centralization creep; ops burden | OpCo, LLC, Corp |
| **Enterprise Support/SLA** | Support contracts, custom features | Recurring revenue, deep feedback | Sales motion, not product work | OpCo, Corp |
| **Training/Certification** | Courses, exams, badges | High margin, ecosystem growth | Small market, maintenance | Foundation, Corp |
| **Donations** | GitHub Sponsors, OpenCollective, Polar.sh | Community signal, no strings | Unreliable, small | All |
| **Protocol Fees** | % of value transfer (if P4) | Sustainable at scale | **Violates "no platform capture"** | ❌ Excluded |
| **Native Token** | Inflation/fees → treasury | Aligns network incentives | **Regulatory, complexity, distraction** | ❌ Explicitly deferred per P4 |
| **Equity Investment** | VC / angels → shares | Capital for growth | Exit pressure, control loss | Corp, LLC |
| **Revenue Share** | % of commercial apps on protocol | Aligned with ecosystem | Complex tracking, small early | Foundation + Corp |

**Sustainability principle:** *Diversify. No single source >50%. Protocol development funded by grants + sponsorships. Commercial services fund team growth.*

**Decision trigger:** When runway <12 months or team >5 FTE.

---

## 4. ECONOMIC PRIMITIVES — WHAT IF P4 CHANGES?

> **Current P4 stance:** Abstract value transfer notes only. No native token. Payments = Lightning/fiat/stablecoin/user choice.

| If P4 Evolves To... | Implications | Required Reviews |
|---------------------|--------------|------------------|
| **Lightning-native invoices/escrow** | Real money flows. Regulatory (money transmission?). User custody. | Legal (FinCEN, state MTLs), Tax, Banking partners |
| **Stablecoin integration** | Fiat-pegged. Custody? Audit? | Legal (stablecoin regs), Audit, Banking |
| **Native utility token** | **Major pivot.** Securities law (Howey), tax, exchange listing, market making, liquidity. | Full legal + regulatory + tax + comms review. Community vote. |
| **Reputation-bonded relay** | Stake = slashing for bad behavior. Not money. | Game theory audit, smart contract audit |
| **Compute credits** | Pay for agent execution (CPU/GPU). Market-based. | Pricing model, anti-abuse, settlement |

**Gate:** Any move beyond "abstract notes" → full TODO.2.BIZ review + legal opinion + community consensus. Not in TODO.2 scope.

---

## 5. COMMUNITY & ECOSYSTEM — HOW DOES IT GROW?

*Growth principle: **Protocol utility → developer adoption → app ecosystem → user adoption.** No growth hacks.*

| Lever | Current | Target (12mo) | Metrics | Compatible With |
|-------|---------|---------------|---------|-----------------|
| **Core contributors** | 1-2 | 5+ | Active PRs, review load | All |
| **App builders** | 0 | 3+ apps | Apps on protocol, users | All |
| **Relay operators** | 1 local | 10+ public | Uptime, geographic spread | All |
| **Nostr client interop** | Basic | Full (profile/feed/DM) | Compatibility matrix | All |
| **Research partnerships** | 0 | 2 (CRDT, private matching) | Papers, code, grants | Foundation, Univ |
| **Documentation** | Spec + code | Tutorials, cookbook, API ref | Time-to-first-app | All |
| **Education** | 0 | Workshops, course | Graduates building | Foundation, Corp |
| **Conferences** | 0 | 2 talks/year | Leads, credibility | All |
| **Hackathons** | 0 | 1-2/year | Prototypes, recruits | All |

**Anti-goals:** No airdrops, no referral programs, no fake metrics, no paid shilling.

---

## 6. BRAND & NARRATIVE — WHAT DO WE CALL THIS?

| Asset | Current | Options | Decision Needed |
|-------|---------|---------|-----------------|
| **Name** | Notention | Keep / Rename | Trademark search first |
| **Tagline (technical)** | "Semantic coordination layer" | Keep / Iterate | Test with devs |
| **Tagline (human)** | — | "Notes that match" / "Describe what you want" / "Stop searching. Start matching." | User testing |
| **Visual identity** | Tailwind defaults | Professional design / Community contest / Keep minimal | Budget dependent |
| **Website** | netention.org (placeholder) | Rebuild in Notention (dogfood) / Pro design | Post-TODO.2 |
| **Demo** | Screenshots | 2-min video / Interactive sandbox | Pre-launch |
| **Manifesto** | README + ARCHITECTURE | 1-pager / Video / Comic | Pre-launch |

**Narrative arcs (test all):**
1. **For users:** "Stop searching. Start matching."
2. **For developers:** "Build coordination, not CRUD."
3. **For protocol nerds:** "Local-first, transport-agnostic, AI-optional."
4. **For teams:** "Shared context without Slack/Notion."
5. **For sovereign individuals:** "Your keys. Your data. Your rules."

---

## 7. PARTNERSHIP STRATEGY — WHO TO WORK WITH?

*Principle: **Build the thing first. Partnerships accelerate, don't validate.***

| Partner Type | Targets | Value We Give | Value We Get | Status |
|--------------|---------|---------------|--------------|--------|
| **Nostr relays** | Major public relays | Semantic content + users | Distribution, discovery | 🟡 Exploring |
| **Nostr clients** | Damus, Amethyst, Primal, etc. | Semantic layer SDK | User base, feedback | 🟡 Research |
| **Mesh hardware** | Meshtastic, LoRa, Sidewalk | Offline transport | Real-world test, hardware | 🟡 Hardware needed |
| **CRDT/Sync research** | Yjs, Automerge, Ink & Switch, Braid | Real-world data, use cases | Sync engine, expertise | 🟡 Grant? |
| **Local AI** | WebLLM, Ollama, LM Studio, Apple MLX | In-browser extraction testbed | Model optimization, feedback | 🟡 Explore |
| **Academic** | PL, HCI, DistSys, Crypto labs | Papers, students, validation | Credibility, talent pipeline | 🟡 Explore |
| **Enterprise pilot** | 1-2 small teams (dev, research) | Real feedback, case study | Revenue?, validation | ❌ Too early |
| **Wallet/Identity** | NIP-07 signers, Passkeys, DID | Seamless auth | User onboarding | 🟡 Watch |

---

## 8. COMPLIANCE & REGULATORY — WHAT COULD BLOCK US?

| Area | Risk Level | Why It Matters | Mitigation / Trigger |
|------|------------|----------------|----------------------|
| **Encryption export (EAR/ITAR)** | Low | Open source, standard libs (libsodium, noble) | Public domain crypto; no restricted algos; monitor |
| **Data privacy (GDPR, CCPA)** | Low | Local-first = user = controller. No central processor. | Document architecture; DPA if OpCo processes |
| **Financial regulation** | Medium | If P4 → real payments | Abstract notes only. No custody. Legal review before P3/P4. |
| **Identity/KYC/AML** | Low | Nostr keys = pseudonymous identity | No KYC in protocol. Client choice. |
| **Content liability (CSAM, illegal)** | Medium | User content on relays | Protocol = transport. No moderation. Client = user choice. Relay = operator choice. |
| **Securities law** | Low (now) | If token ever | **Explicitly no token.** Document. Legal review if changes. |
| **Consumer protection** | Low | Free software, no warranty | MIT/AGPL license disclaimer. |
| **Accessibility law (ADA, EAA)** | Medium | Public-facing product | WCAG 2.1 AA target. Audit pre-v1.0. |
| **Employment law** | N/A (now) | When hiring | Entity required. Jurisdiction choice. |

**Legal review triggers:** P3 (sealed visibility), P4 (payments), hiring, revenue, grants >$50k.

---

## 9. SECURITY ASSURANCE — HOW TO VERIFY?

| Layer | Current | Target | Methods | Trigger |
|-------|---------|--------|---------|---------|
| **Core (matching, parsing, ontology)** | Unit tests | Property-based testing + formal spec | QuickCheck, TLA+, Coq? | Pre-v1.0 |
| **Nostr integration** | Integration tests | NIP compliance matrix + fuzzing | Automated NIP test suite | Ongoing |
| **Encryption (chat, sealed P3)** | NIP-17 / libsodium | Third-party audit | Cure53, Trail of Bits, etc. | Before P3 ship |
| **Agent sandbox** | Capability flags (advisory) | Enforceable (WASM, Firecracker, gVisor) | Escape attempts, bounty | Before autonomous skills |
| **Supply chain** | pnpm, dependabot | SBOM, signed releases, reproducible builds | Sigstore, SLSA L3 | Pre-v1.0 |
| **Penetration test** | None | Annual + pre-major | External firm | Pre-v1.0, annually |
| **Bug bounty** | None | Program (Immunefi, HackerOne) | Scope, rewards, triage | Post-v1.0 |

---

## 10. ACCESSIBILITY (a11y) — INCLUSIVE BY DEFAULT

| Standard | Current | Target | Effort | Blocker? |
|----------|---------|--------|--------|----------|
| **WCAG 2.1 AA** | Partial (semantic HTML, contrast) | Full audit + remediation | Medium | No |
| **Keyboard navigation** | Command palette, shortcuts | All workflows | Low | No |
| **Screen reader (NVDA, VoiceOver, JAWS)** | Basic ARIA | Full test + fix | Medium | No |
| **Color blindness** | Tailwind palette | Tested palettes (simulate) | Low | No |
| **Motion reduction** | `prefers-reduced-motion` | Verified all animations | Low | No |
| **Voice input** | netjs had it; current: no | Q6 / Mobile polish | Medium | No |
| **High contrast / custom themes** | Dark only | User themes | Medium | No |

**Timeline:** Post-TODO.2, pre-v1.0. Not a blocker for protocol decisions.

---

## 11. INTERNATIONALIZATION (i18n) — GLOBAL FROM DAY ONE?

| Aspect | Current | Options | Decision |
|--------|---------|---------|----------|
| **UI strings** | English only | next-intl / i18next / FormatJS / custom | Framework choice |
| **Ontology labels** | English only | Translatable properties (key + locale map) | Protocol-level |
| **Date/number formats** | date-fns (locale-aware) | User preference in settings | Product |
| **RTL support** | No | CSS logical properties + test | Product |
| **Font fallback** | System fonts | Noto Sans variable (all scripts) | Product |
| **Input methods** | Keyboard | IME, voice, handwriting | Mobile/Q6 |

**Principle:** *Protocol = language-agnostic. Product = localized. Ontology = user-defined.*

---

## 12. MIGRATION & UPGRADE POLICY — NEVER BREAK USERS

| Scenario | Policy Options | Chosen? |
|----------|----------------|---------|
| **Protocol breaking change** | Versioned envelopes. Dual-support (6-12mo). Migration tooling. Auto-migrate on load. | 🟡 Draft |
| **Ontology evolution** | Gardener suggests; user confirms. No forced migration. Versioned ontology. | 🟡 Draft |
| **Storage schema** | localforage keys versioned. Auto-migrate on load. Backup before migrate. | 🟡 Draft |
| **Transport deprecation** | 12mo notice. Fallback to Local. Document migration path. | 🟡 Draft |
| **AI provider change** | Pluggable interface. No data migration. Fallback to heuristic. | 🟡 Draft |
| **Key rotation** | NIP-07 signer / manual export-import. Protocol doesn't manage keys. | 🟡 Draft |
| **Entity/structure change** | Fork-friendly. Export = full state. No lock-in. | ✅ Core principle |

---

## 13. RELEASE & VERSIONING — PREDICTABLE CADENCE

| Artifact | Scheme | Cadence | Criteria |
|----------|--------|---------|----------|
| **Core (@notention/core)** | SemVer | Minor = feature; Patch = fix; Major = breaking | E2E pass + typecheck + screenshots |
| **Agent** | SemVer | Aligned with core | Core compatibility |
| **UI (PWA)** | Date-based (YY.MM) | Monthly | E2E pass + screenshots |
| **CLI** | SemVer | Aligned with core | Core compatibility |
| **Simulator** | SemVer | Independent | Scenario tests |
| **Protocol spec (README2)** | Spec version (v1, v2) | Frozen per major release | Core major = spec major |

**Release checklist:** All journeys pass + typecheck clean + screenshots updated + CHANGELOG.md + git tag + GitHub Release + npm publish.

---

## 14. DECISION FRAMEWORK — HOW WE CHOOSE LATER

*When a business decision blocks a protocol decision, use this framework:*

| Step | Action |
|------|--------|
| 1. **Isolate** | What specific TODO.2 decision is blocked? |
| 2. **Enumerate** | List 3+ viable options with trade-offs (like Section 1-2 above) |
| 3. **Score** | Rate each on: Mission alignment, Legal risk, Speed, Cost, Reversibility, Community trust |
| 4. **Consult** | Legal counsel (if regulatory), Core team (if technical), Community (if values) |
| 5. **Decide** | Consensus / BDFL / Vote (per governance model) |
| 6. **Document** | Append to Decision Log (Section 15) with rationale |
| 7. **Communicate** | Public summary (no secrets) |

---

## 15. DECISION LOG (Business) — APPEND-ONLY

| Date | Decision | Options Considered | Rationale | Owner |
|------|----------|-------------------|-----------|-------|
| — | — | — | — | — |

*Separate from protocol/product decision log (TODO.2.md Appendix K).*

---

## RELATIONSHIP TO TODO.2.md — PROMOTION TRIGGERS

| If TODO.2 decides... | Then TODO.2.BIZ Promotes... |
|----------------------|----------------------------|
| **P1** Content-addressing | Migration policy (Sec 12), Versioning (Sec 13) |
| **P2** Signed transitions | Legal review: electronic signatures, evidence law (Sec 8) |
| **P3** Sealed visibility | Encryption export review, GDPR DPA (Sec 8) |
| **P4** Economic primitives | **Full Sec 3-4 review** (token, regulation, tax, custody) |
| **P5** libp2p transport | Partnership with Protocol Labs? (Sec 7) |
| **Q5** Progressive network | Nostr relay partnerships (Sec 7) |
| **Self-Recruiting** | Contributor agreements, IP strategy (Sec 2) |
| **Dogfooding 30-day test** | Entity needed for contracts/employment (Sec 2) |

---

## OPEN QUESTIONS FOR LATER

1. **Mission lock:** How to legally bind "Protocol > Product" and "No Platform Capture" beyond social consensus?
2. **Treasury:** If grants/revenue > $100k, who holds keys? Multi-sig? Foundation? Corp?
3. **Succession:** What happens if lead maintainer disappears? (Code escrow? Foundation?)
4. **Patent defense:** Join OIN? Defensive publications? Monitor?
5. **Trademark:** Register "Notention"? Who holds? Enforcement policy?
6. **Audit funding:** Who pays for security audits? Grants? Sponsorships? Treasury?
7. **Ecosystem fund:** If surplus, grant to app builders? Relay operators? Researchers?
8. **Exit options:** Acquisition offer? Merger? Wind-down? Community fork rights?

---

## NEXT STEPS

1. **TODO.2 sync** → Protocol/product decisions (P1–P5, Q1–Q6)
2. **Post-TODO.2** → Founder/leadership review this doc; pick 2-3 to resolve
3. **Pre-entity** → Legal counsel on structure options (Sec 2) + IP strategy
4. **Pre-v1.0** → Security audit (Sec 9), Accessibility audit (Sec 10), Entity formation
5. **Post-v1.0** → Sustainability model (Sec 3), Partnerships (Sec 7), Ecosystem fund

---

*This document is the "everything else" bucket. It exists so TODO.2.md can stay pure. When a business question blocks a protocol decision, promote the specific section. All structures, all options, all trade-offs — open until decided.*