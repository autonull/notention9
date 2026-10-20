# TODO.2 Pre-Read: The Super-App That Doesn't Suck

**Meeting:** Protocol & Productization Design Review · 30 min sync
**Prep:** 10 min read this → 10 min skim `TODO.2.md` → bring 3 opinions
**Audience:** Product, Engineering, Design, Research, Leadership

---

## 🎯 The Plot

We have a **working semantic kernel** + **polished PWA** (17 E2E journeys ✅, 24 showcase screenshots ✅). The foundation holds.

Now: **11 design choices** decide whether Notention becomes

| ✅ The Quintessential Super-App | ❌ A Kitchen Sink |
|--------------------------------|-------------------|
| One metaphor: micro → meso → macro | Features piled up, no center |
| Protocol > product | Product > protocol |
| "This is how notes should work" | "Cool matching, nice note app" |

This meeting picks **3–5 for next cycle (TODO.2)**. Rest = parking lot.

---

## 🗺️ Choose Your Adventure

*Read your lane, then skim the rest in `TODO.2.md`.*

| Role | Start Here | Why |
|------|------------|-----|
| **Product / UX / Design** | **Q1–Q6** (Productization) | First-run, editing feel, matching UX, ontology, network onboarding, AI personality |
| **Engineering / Protocol** | **P1–P5** (Protocol) | Content-addressing, signed transitions, sealed envelopes, economic primitives, transports |
| **Leadership / Strategy** | **North Star** (below) | Differentiation, risk, roadmap, team capacity |
| **Research / Crypto / AI** | **Appendix H** (Open Questions) | CRDTs, private matching, sandboxing, model sizing, NIP coverage |
| **Talent / Community** | **Self-Recruiting** | Hiring *through* the protocol — the ultimate dogfood test |
| **Dev Team** | **Dogfooding Menu** | 15 workflows the team runs daily — sprint planning, code review, bug triage, releases, hiring... all as request/offer matching |

---

## ⭐ North Star (60-Second Version)

**Notes = atomic unit of human thought externalized.** Money, law, science, governance all started as ways to record/verify claims. Our bet: *semantic notes* are the next substrate.

**Every feature must work at all three scales:**

| Scale | Win | Fail |
|-------|-----|------|
| **Micro** (solo) | "My second brain" | Cluttered note app |
| **Meso** (team) | "Shared workspace" | Worse Notion |
| **Macro** (network) | "Semantic coordination layer" | Blockchain vaporware |

**6 Non-Negotiables:** No platform capture · No mandatory network · No mandatory AI · No fixed schema · No privileged transport · No central authority

**Shark Test** (fails → cut): Solo zero-setup? ✅ Composes with existing notes? ✅ Reduces cognitive load? ✅ Explainable in one sentence? ✅ Zero new deps? ✅ Works offline? ✅ Enables coordination (not just chat)? ✅

---

## 📋 The 11 Choices (One-Liners)

**Protocol (P1–P5):**
- **P1** Content-addressed notes? (Migrate / Dual-mode / Defer)
- **P2** Signed transitions = state? (First-class / Hybrid / Keep `status`)
- **P3** Sealed private sharing? (NIP-17 / Custom / Defer)
- **P4** Economic primitives? (Lightning / Abstract / Skip)
- **P5** Next transport? (libp2p / HTTP / Polish Nostr+Local)

**Product (Q1–Q6):**
- **Q1** First run: capture-first / workspace-first / hybrid?
- **Q2** Structure: invisible prose / Notion blocks / chips+prose (current)?
- **Q3** Matching: ambient hints / intentional search / both?
- **Q4** Ontology: user-owned / system-owned / shared?
- **Q5** Network: "Go public" button / progressive / hidden?
- **Q6** AI: invisible magic / explicit copilot / hybrid?

**Meta (Dogfooding → Priority):**
- **15 workflows** (sprint planning, code review, bug triage, releases, hiring...) all map to P2, P3, Q3, Q5, Q6 — see [Dogfooding Menu in `TODO.2.md`](#)

---

## 🎪 What Happens in the Sync

| Minute | Activity |
|--------|----------|
| 0–5 | North Star on screen. Shark test = shared vocabulary. |
| 5–20 | Rapid fire: P1→P5, Q1→Q6. Direction + 1-sentence rationale. Park "needs research." |
| 20–28 | Graduate 3–5 to TODO.2. Scope + success metric + owner each. |
| 28–30 | Log to Appendix K. Next checkpoint date. |

---

## 📝 Your Homework (10 Min)

1. **Read your lane above** (2 min)
2. **Pick 3 you'd greenlight** for TODO.2 (3 min)
3. **Flag 1–2 to park** as "needs research" (2 min)
4. **Bring one "shark test failure"** — an idea that seemed good but fails the checklist (3 min)
5. **Optional:** Drop a comment in `TODO.2.md` before the meeting

---

## 🤔 The Real Question

> **What's the one coherent metaphor that makes a solo user, a 5-person team, and a 50,000-person network all feel like they're using the *same tool* — just at different zoom levels?**

If you have an intuition, bring it. If not, bring your skepticism.

---

**See you there.** `TODO.2.md` has the full appendices (competitive landscape, personas, architecture, spec status, risks, OKRs, roadmap, research questions, team capacity, prior art, decision log).

— The Protocol & Product Team