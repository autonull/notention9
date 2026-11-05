# TODO.science — The Scientific Program: Measured Coordination for Human-Scale Cooperation

**Companion to:** TODO.14.md (development plan). This file is the *why* and the *how-to-know*; TODO.14 is the *what to build*.
**Audience:** The developer(s), future collaborators, and any community evaluating whether Notention deserves their trust.
**Date:** 2026-11-05.

---

## 0. Abstract

Notention is a local-first, peer-to-peer network where free-form notes — personal memory, requests, offers — carry structured semantic properties, and where matching is computed locally against an emergent, user-editable ontology. The past two weeks of work (TODO.12 phases 0–5, TODO.13 generalization) built an *evaluation substrate*: hash-guarded benchmarks, a pure verdict engine with minimum-detectable-effect floors, an append-only ledger, and a consent-gated revision store. This document argues that this substrate is not merely engineering hygiene — it is the embryo of a genuine scientific instrument for one question:

> **Can a decentralized, user-owned coordination network demonstrably make human cooperation cheaper, safer, and more dignified — and can it improve itself without betraying the people it serves?**

Most coordination software cannot answer this question because it cannot measure anything (no benchmark, no baseline, no power, no consent) and because its incentives forbid honesty (platforms optimize engagement, not matched needs). Notention's unusual position: it is a *small* system with a *complete* measurement stack. Small is what makes it science rather than theater.

---

## 1. What can legitimately be studied here

### 1.1 The object of study

- **Ontologies as shared mental models.** The ontology is the community's implicit agreement about what properties matter (`[budget]`, `[skill]`, `[deadline]`, `[seniority]`). It drifts. It can be measured (see §5-E7), contested, forked, and merged. This is empirical semantics, not metaphysics.
- **Matching as judgment.** Every match is a claim: "these two notes describe complementary intent." The score is a *hypothesis*; acceptance/rejection/correction are *observations*. The gap between them is calibration (§5-E4, E6).
- **Capture as cognitive labor.** Writing a note with structured properties costs effort. Abandonment, correction, and time-to-capture measure the friction price of semantics. Lowering it without lowering extraction fidelity is a human-factors result (§5-E2).
- **Consent as a governance primitive.** Revisions deliver changes to a live product with evidence and rollback. Whether users understand, trust, and exercise that gate is itself a finding (§5-E10).
- **Coordination outcomes in the wild.** Commitment lifecycle (open → matched → committed → done/lapsed/cancelled) turns the network into a natural field study in completion dynamics (§5-E5, E9).

### 1.2 What this is NOT

Not clinical trials. Not controlled market research. Not behavioral science claiming population validity from n=1 local workspaces. The program is **mechanism science + in-situ observational measurement**, honestly bounded (§8). Population claims require pilot deployments (§9); until then, all claims are local, labeled, and reversible.

---

## 2. The measurement science (and its hard limits)

### 2.1 Evidence classes — the order of honesty

The repo already encodes this (`VerdictResult.evidenceClass`): `measured > observed > hypothesized > asserted`. This ordering is the whole game. Discipline:

| Class | Definition | Example | May be used for |
|-------|-----------|---------|-----------------|
| measured | Controlled comparison, powered, reproducible | Paired completion on 10 intent cases ×3 reps, MDE-gated | Auto-propose revision; \"reproducibly better on benchmark\" |
| observed | Real user behavior, aggregates only | Journal counts of `capture_abandoned` this week | Prioritize work; \"occurs N times/week locally\" |
| hypothesized | Simulation/estimation | Simulator match relevance | Generate hypotheses; **never** auto-deliver |
| asserted | Claim without evidence | \"The ontology covers need\" | Rejected at the gate |

**Violation #1 in the current codebase** was exactly a class confusion: the optimizer treated browser-completed UI captures (hypothesized, n=2) as decision-grade. TODO.14 Phase B fixes the power; this document explains why power is not optional (§3).

### 2.2 Calibration — the truthfulness of the instruments

Every estimator in the stack must be checked against the thing it estimates:

1. **LLM/extraction judge vs. labeled cases** (`core/src/eval/calibration.ts`, ECE ≤ 0.1 target, TODO.12 4.7). Procedure: hold out 20% of the 60 quality cases; report ECE per key family; if ECE > 0.1, the judge is a prior, not a measurement. Recalibrate (temperature/threshold) or route those cases to human labeling.
2. **Simulator match-score vs. human relevance judgments.** Procedure (§5-E1): take 50 real (local, opt-in) note pairs with known outcomes; compute simulator score distribution; report AUROC and the score threshold that maximizes F1 against observed acceptance. Today `0.5` is a magic number in `constants.ts`.
3. **Friction journal vs. felt experience.** The 7 instrumented kinds (capture_started, capture_abandoned, correction, match_viewed, match_rejected, match_accepted, clarification_requested) are behavioral proxies. Validate against short post-hoc prompts (\"Did that match fail you? y/n\") on a random 5% sample. If behavioral and subjective misalign, weight subjective.
4. **Evidence half-life.** 30-day half-life decay on evidence classes (TODO.12 4b.5) prevents stale wins from justifying new changes. Review the decay constant against E5 completion-time distributions before adopting.

### 2.3 Goodhart pressure — the predictable failure mode

Once an optimizer targets a metric, the metric stops measuring what it measured. Specific defenses:

- **Holdout audit** (10 search + 11 validation + 9 holdout intent cases, split enforced by reader guard). The winner is never tuned against holdout; holdout is read **once**, post-verdict, as the final honesty check. If the winner regresses on holdout, the result is `inconclusive`, full stop.
- **Primary + guardrail pairing.** `completion` is primary; `steps`, `corrections`, `timeToCapture` are guardrails. A param that raises completion by adding clicks is a reject.
- **Journal as independent check.** If the optimizer\"improves\" capture but journal shows `capture_abandoned` *rising*, the optimizer is wrong by definition. This is the loop\"s immune system.
- **Evidence decay + re-verification.** Active revisions are re-measured quarterly; decay promotes rollback candidates automatically.

### 2.4 Power and MDE — why n=2 was not a verdict

McNemar on paired binary outcomes with n_discordant small has enormous Type-II error; 2 cases × 1 repetition cannot detect any plausible effect (completion flip probability per case ≈ 0.3–0.5; need ≥ 10 concordant discordant pairs minimum). The optimizer must **refuse to run** below power, or the ledger fills with noise that *feels* like knowledge. This is the single most important scientific lesson the codebase already learned and must now enforce in tooling (TODO.14 B1.3).

---

## 3. Simulated populations as experimental subjects — validity threats

The simulator spawns in-process Nostr agents that publish pre-scripted notes and match by property overlap. It is a *wind tunnel*, not a city. Threats to validity, in severity order:

| Threat | Description | Mitigation | Claim ceiling |
|--------|-------------|------------|---------------|
| No UI behavior | Agents never click, scroll, hesitate, misunderstand | Never use simulator for capture/effort claims; use `ui/eval` harness for UI | Mechanism only |
| Proxy relevance | Overlap score ≠ felt relevance | Calibrate vs. acceptance (§2.2-2) | Ranking tendency |
| Fixed scripts | Events fire from static templates at fixed `at` times | Add stochastic scheduling; distribution over ≥200 runs | Distributions, not instances |
| No congestion | Relay, transport, and human latency are absent | §5-E9 degradation runs | Robustness bounds |
| Non-representative domains | 10 domain scenarios hand-authored | Partner-authored scenarios (§9 pilot) | \"These domains\", not \"all domains\" |
| No social dynamics | No reciprocation, reputation, norms, trust | Commitment lifecycle + attestations model part of this | In-protocol dynamics |

**Legitimate simulator claims:** \"Ontology v2 matched 34% more note pairs than v1 on scenario library S (seeded, distribution over 200 runs, 95% CI).\" **Illegitimate:** \"Users will find matches 34% of the time.\" The first is science; the second is fraud.

---

## 4. The research questions, stated as hypotheses

**RQ1 — Ontology drift is measurable and steerable.** H1: emergent property co-occurrence deviates from ontology-declared structure within N weeks of active use; corrective patches improve held-out matching without reducing recall.

**RQ2 — Semantic capture can be nearly free.** H2: with tuned capture params (autoFocus, placeholder, initial operator), median time-to-captured-note falls ≥ 30% vs. incumbent with no loss in required-key coverage (10-case × 3-rep paired).

**RQ3 — Small models of intent suffice locally.** H3: local/none LLM extraction achieves ECE ≤ 0.1 on non-market families; where it fails, the failure is *structured* (enum/date keys), not random — hence routable to correction flow.

**RQ4 — Human consent scales trust, not friction.** H4: presenting evidence + rollback with a revision raises acceptance vs. silent delivery, at no measurable increase in decline-and-abandon rates (within-subject, Settings UX).

**RQ5 — Coordination loops complete.** H5: commitment lifecycle (open→committed→done) shows ≥ X% completion in matched pairs; lapse/cancel correlates with match *explanation* opacity, not with match score (Spearman ρ < −0.3 between explanation completeness and lapse rate).

**RQ6 — Mesh degrades gracefully.** H6: under 20% packet loss / 500 ms RTT, time-to-first-match degrades < 2× and zero integrity failures occur (signature/validity checks — ProtocolTestbed).

**RQ7 — Friction evidence beats intuition.** H7: top-3 friction kinds predict which capture-flow fixes move journal metrics; engineer gut-rank Spearman ρ < 0.5 vs. friction-rank. (If ρ ≥ 0.5, delete this research question and stop.)

**RQ8 — Synthetic proposals, human selection, measured delivery.** H8: the full suggestion→revision→re-simulation chain yields ≥ 40% adopted-and-verified suggestions vs. < 10% for unmeasured delivery — i.e., evidence improves engineering judgment.

**RQ9 — Extraction prompts are a measurable, revisable artifact.** H9: a versioned prompt revision (`property-extraction@vN`) improves extraction F1 / ECE on the held-out quality set vs. v1 by ≥ 10 points with no regression on any key family — delivered as an ordinary revision, not a code deploy.

**RQ10 — Ontology patches generalize out-of-sample.** H10: an ontology revision (operator default change, key deprecation, hierarchy addition derived from co-occurrence) improves match F1 on held-out quality cases and on holdout intent cases, with recall not degrading — the opposite of overfitting a local note corpus.

**RQ11 — The Gardener earns its keep.** H11: `Gardener.evolveOntology` proposals filtered by a precision gate (≥ 50% of proposals match human-labeled latent keys on a synthetic ground-truth corpus) add real coverage; unfiltered, they add ontology bloat (noise keys) that degrades matching. Measures the LLM-integration surface end-to-end.

---

## 5. Experiment catalog

Format: **Hypothesis / Procedure / Metrics / Controls / Readout**. All runs write bundles to `~/.notention/runs/`; all report evidence classes; all pre-registered against a fixed commit hash.

### E1. Simulator relevance calibration (2 days)
- **H2.2 (§2.2):** overlap score proxies acceptance poorly at threshold 0.5.
- **Procedure:** Local (opt-in) dump or corpus-ingested notes → 100 pairs labeled by 2 independent annotators (accept/reject) → sweep thresholds 0.1–0.9 → ROC/PR curve; pick operating point; update `SIMULATION_CONFIG.eventMatchThreshold`; record in ledger + ADR.
- **Metrics:** AUROC, AUPRC, F1-optimal threshold, inter-annotator κ (report; if κ < 0.6, the task is ill-defined — stop and re-interview users).
- **Controls:** annotator blinding; pair randomization; held-out 20%.
- **Class:** measured (if labels are human), else hypothesized.

### E2. Capture-flow parameter A/B (1 week)
- **H2:** RQ2.
- **Procedure:** `ui/eval` harness, seedSnapshot, clock/RNG freeze; arms = {incumbent params, candidate A: autoFocus+placeholder, candidate B: initialOp=enum-hint}. 10 validation intent cases × 3 reps, completion + timeToCapture + corrections. MDE gate before run; holdout read once.
- **Metrics:** paired McNemar (primary), Wilcoxon on timeToCapture (secondary), corrections (guardrail).
- **Controls:** same browser, same viewport, frozen storage snapshot; order counterbalanced.
- **Class:** measured.

### E3. Friction→fix→remeasure, the field loop (ongoing, 4 weeks)
- **H7/RQ7.**
- **Procedure:** Week 1: baseline journal counts (7 kinds). Week 2: top friction kind → one targeted capture-seam change → revision via TODO.14 Phase C path. Weeks 3–4: re-measure same weekday mix; compare half-life-weighted counts.
- **Metrics:** per-kind rate delta; 95% CI; no PII; aggregate only; minimum 30 events per kind else `insufficient-n`.
- **Controls:** no other capture-seam changes during window (change log pinned); weekend bias checked.
- **Class:** observed.

### E4. LLM-judge calibration & selective deferral (2 days)
- **H3/RQ3.**
- **Procedure:** 60 quality cases; judge = configured provider + local heuristic fallback; reliability diagram, ECE per family (extraction/match/enum/date); route ECE > 0.1 families to `needs_human_label` in CaseStore.
- **Metrics:** ECE, Brier, coverage-by-deferral curve.
- **Class:** measured.

### E5. Time-to-first-match distribution (3 days)
- **RQ5 (leading indicator).**
- **Procedure:** `--fast` simulator (TODO.14 B2.2), 200 seeded runs across 6 scenarios incl. gig-economy; record time-to-first-match, matches/min, unmatched rate; report distribution + per-domain breakdown.
- **Metrics:** median, IQR, P95; per scenario.
- **Controls:** virtual clock; seeded RNG; fixed relay admit list.
- **Class:** hypothesized (simulated), useful for CI-pinned regression only.

### E6. Correction-flow closure (the D1 candidate, 1 week)
- **H8 (delivery side).**
- **Procedure:** Instrument correction → re-extraction. Detect systematic corrections on `budget` (or top corrected key) → candidate: adjust extraction prompt or key normalization → E2-style powered eval → if improved, consent → revision → confirm via simulator re-run AND journal trend (E3).
- **Metrics:** correction rate on targeted key; completion; journal delta.
- **Class:** measured (eval) → observed (field). The complete evidence chain — this is the demo.

### E7. Ontology drift & co-occurrence audit (3 days)
- **H1/RQ1.**
- **Procedure:** Over local notes (opt-in) and corpus-ingested test cases: compute key frequency, pairwise co-occurrence lift, operator-distribution per key; diff against `ontology.json`; emit: orphan keys, unused-by-match keys, over-broad operator defaults, missing hierarchies (agglomerative clustering ≥ 3 keys co-occurring > 0.9).
- **Metrics:** # orphans, # drift candidates, # hierarchy candidates; human review acceptance rate.
- **Class:** observed/hypothesized; suggestions only — never auto-apply (Settings → Suggestions, TODO.14 C3.4).

### E8. Optimizer sample-efficiency: halving vs grid (2 days)
- **Validates Phase-5 mechanics.**
- **Procedure:** Replay Phase-5 candidate set; simulate halving (25/50/100% budget) on E2's powered setup; compare regret at equal budget vs. full grid; measure correlation between slice-ranking and full-eval ranking (Kendall τ).
- **Metrics:** simple/cumulative regret, τ, wall-clock.
- **Decision rule:** if τ < 0.6, successive halving is unsound here — switch SearchSpace to successive-halving-with-replication or Bayesian (R1 registry already supports). Document.
- **Class:** measured (methodological).

### E9. Mesh degradation bench (3 days)
- **H6/RQ6.**
- **Procedure:** Inject loss/RTT/duplication on the WebSocket relay (toxiproxy or in-process proxy) at 0/5/10/20% loss × 50/200/500 ms RTT; scenario: gig-economy; each config × 20 runs; monitor: delivery rate, match latency, signature verification failures, event ordering anomalies.
- **Metrics:** delivery %, p50/p95 match latency, # invalid events (must stay 0).
- **Class:** measured (robustness).

### E10. Consent comprehension (within-subject, 1 week + moderated sessions)
- **H4/RQ4.**
- **Procedure:** 8–12 think-aloud sessions (friends/colleagues acceptable for v0 — label as such): show Settings → Revisions with a pending revision (params JSON + reason + verdict + rollback); ask: \"What will change? How would you undo? What evidence convinces/scares you?\" Score comprehension 0–2 per item; collect acceptance/rejection + reasons.
- **Metrics:** comprehension score, accept rate, time-to-decision, verbal themes.
- **Success:** ≥ 80% correctly state what changes + how to roll back. Below that, the consent UI needs redesign before any autonomous delivery ships. **This gate is mandatory before enabling any auto-apply, ever.**
- **Class:** observed (small-n qualitative) — directional, not population.

### E11. Benchmark fairness audit (2 days)
- **Non-market coverage.**
- **Procedure:** Stratify 60 quality cases by domain family; report counts, per-family F1 baseline, and any family with zero passing candidates after Phase B. If any family is systematically failed, the benchmark measures the market, not humanity — add cases or descope claims.
- **Class:** measured (benchmark health).

### E12. Reproducibility drill (1 day)
- **The meta-experiment.**
- **Procedure:** On a clean clone, at a pinned commit, run: quality runner, E2 candidate eval, simulator regression suite — two independent machines; diff all bundles byte-wise (hashes exclude timestamps by content-addressing). Report mismatches; fix determinism leaks (timers, ports, glob order, map iteration).
- **Success:** byte-identical manifests, zero port-dependent outcomes.
- **Class:** measured (release gate).

---

## 5.1 The three optimization surfaces — first-class research objects

The program optimizes exactly three things. They are not the same problem wearing one framework — they differ in *state*, *delivery mechanism*, *evaluation cost*, and *blast radius*. Conflating them is how goodharting creeps in. Each gets its own hypothesis, instrument, and delivery path; all three ride the same revision + consent machinery.

| Aspect | What is optimized | Delivery mechanism | Evaluation instrument (cost) | Blast radius |
|---|---|---|---|---|
| **UI/UX** | Strategy-seam params (`ParamSpec`: autoFocus, placeholder, initial operator, match-preview rendering, etc.) | Revision with `ParamPatch` → `applyPendingRevisionParams()` | `ui/eval` browser harness, intent cases (seconds/case) | Render layer only; rollback = status flip |
| **Ontology** | Keys, operators, defaults, enums, hierarchies | Ontology revision (data) via Suggestions queue → consent | Quality cases in-process (ms/case) + holdout/simulator re-check (minutes) | Global semantic interpretation of all notes |
| **LM prompts** | `PromptDefinition` versions (`property-extraction@vN`, gardener prompts) | Prompt revision (id + version pointer) → agent registry lookup | Quality cases in-process (ms/case) + E4 calibration | Extraction fidelity everywhere the agent runs |

**Current state, honestly:**
- UI: instrumented (ParamSpecs, candidate cache, halving — broken but present); power is the blocker (n=2).
- Ontology: **only an audit exists** (E7 proposes drift detection). No revision path delivers ontology changes, no held-out evaluation of ontology patches, no deprecation workflow. The `Gardener` (`ui/src/services/gardener.ts`) emits `analyzeOntology` proposals that are *shown nowhere and measured never*.
- Prompts: a registry exists (`core/src/prompts/registry.ts`, versioned by `id@version`, consumed by `agent/src/intelligence/LlmPropertyExtractor.ts` via `getPrompt('property-extraction', '1')`) — but the only registered prompt (`"property-extraction@1"`) is a hardcoded, pre-ontology prompt naming stale keys (\"intent (task, reminder, purchase)\") that do not match the shipped ontology. There is no golden-set gate in CI (`optimize/src/prompts/evaluate.ts` + `property-extraction.golden.json` exist but are wired to nothing), no prompt A/B, no version bump protocol.

**Research program per surface (each is a repeatable cycle: hypothesize → measure → consent → deliver → re-measure):**

### S-UI — UI/UX parameter optimization
Covered by E2 (capture seam) and extensible to match/elicit/layout seams. Additional rules: every wired param is either *causally traced* to a render path (B1.6 in TODO.14) or removed; match-preview params (`showScore`, `showDetails`, `compactMode`) are evaluated on *comprehension* (E10-style think-aloud), not completion — they are display, not action. **Non-goal:** optimizing what users see purely for engagement. Primary+guardrail pairing (§2.3) applies.

### S-ONT — Ontology optimization
- **Loop 1 (detection, E7)**: co-occurrence lift, orphan keys, operator misuse, dead keys, missing hierarchies — from local notes (opt-in) + corpus.
- **Loop 2 (proposal)**: Suggestions queue entries carry *aggregate evidence only*; human reviews; approved entries become ontology revisions (never auto-applied; ontology revisions never auto-activate — TODO.12 policy).
- **Loop 3 (verification)**: held-out quality cases + simulator distributions before/after; a patch that improves in-sample F1 but degrades holdout is rejected and journaled — ontology patches must *generalize* (RQ10).
- **Deprecation workflow**: keys with zero match utility across ≥ 2 evaluation cycles get a `deprecated` status (warn, don't delete — deletion breaks stored notes); reactivation is one revision away.
- **Guardrail**: ontology size vs. match F1 must not trade complexity for marginal gains — track \"F1 per active key\" as a parsimony metric (Occam gate in reviews).

### S-PROMPT — LM prompt optimization
- **Golden gate first**: wire `optimize/src/prompts/property-extraction.golden.json` + `evaluate.ts` into CI (`pnpm prompts:eval`); every prompt version in the registry has a manifest hash; a version that regresses any golden family blocks merge — same discipline as code.
- **Prompt revisions via the registry**: candidates are new `PromptDefinition` versions registered alongside v1; the agent resolves by pointer, so activation/rollback is a revision status flip, identical to param revisions (S-UI machinery reused). No code deploy per prompt change.
- **Ablation battery (E13)**: enumerate variants — few-shot additions, ontology-embedded key list (generated from the *current* ontology, not hardcoded), structured-output schema constraint (JSON mode / Zod-validated), instruction ordering, extraction-then-normalize two-step vs one-shot; measure F1/ECE on the 60 quality cases (in-process, ms) — this is the *cheapest* optimization surface in the program and should be the first to produce a consented revision.
- **Failure-family routing (E4 + correctionFlow)**: where ECE is high (dates, enums, geo), route to deterministic post-processors; measure residual vs. LLM-fixed. Prompts should shrink as code absorbs the learnable residue — the prompt is the *last* resort for structure.
- **Gardener loop (E16)**: synthetic corpus with planted latent hierarchy (e.g., 5 keys under `tech-stack` with known ground truth) → does `evolveOntology` recover it? Measure proposal precision/recall; tune gardener prompt like any other; the gardener is a prompt-optimization target, not an oracle.
- **Anti-drift rule**: the extraction prompt embeds a *generated* ontology digest (keys + allowed operators + value types), regenerated at build time from the active ontology revision — the prompt and the data never disagree again (this is the direct fix for the stale v1 prompt).

### E13. Prompt ablation & revision cycle (S-PROMPT; 2 days)
- **H9/RQ9.**
- **Procedure:** Generate 4–6 variants of `property-extraction` (few-shot × 0/2; ontology-embedded vs static; one-shot vs two-step; schema-constrained vs free-text). Evaluate each on 60 quality cases ×3 repetitions, seeded LLM or local heuristic fallback; McNemar vs incumbent; ECE per family. Winner becomes `property-extraction@2`; register; `pnpm prompts:eval` gates CI; deliver as a prompt revision with the verdict attached; re-measure after 2 weeks of corrections.
- **Metrics:** F1 (per family), ECE, token cost/note (guardrail — prompt bloat is a real cost), latency.
- **Class:** measured.

### E14. Ontology patch generalization test (S-ONT; 2 days)
- **H10/RQ10.**
- **Procedure:** From E7 audit, take the top 2 proposals (likely: operator default change for one key; one hierarchy merge). Encode as ontology revision; evaluate match F1 on: (a) 22 match quality cases, (b) holdout split, (c) 200-run simulator distribution vs. incumbent ontology. Accept only if (a) and (b) both non-regressive and (c) shows ≥ 5% match-rate lift; else journal and reject.
- **Metrics:** match F1 (a,b), CI on simulator lift, side effects (unmatched rate).
- **Class:** measured + hypothesized (simulator leg).

### E15. Gardener proposal precision (S-PROMPT→S-ONT bridge; 2 days)
- **H11/RQ11.**
- **Procedure:** Synthetic corpus: 300 generated notes over a planted 3-level hierarchy with known latent keys; run `evolveOntology` at current prompt; score proposals (precision/recall vs planted keys) across 5 runs; then improved gardener prompt (via E13 ablation method); re-score.
- **Metrics:** proposal P/R, # noise keys, downstream match-F1 impact of applying proposals (before/after E4-calibrated eval).
- **Guardrail:** proposals that degrade F1 are rejected automatically in CI; the gardener is not allowed to ship its own optimistic bias.
- **Class:** measured (synthetic ground truth).

### E16. Prompt golden-gate deployment (S-PROMPT; 1 day, prerequisite of E13)
- **Procedure:** Wire `pnpm prompts:eval` (uses `optimize/src/prompts/evaluate.ts` + `property-extraction.golden.json`): load registry, evaluate all registered versions against golden families, exit non-zero on any regression > floor (per-family), print family-level table. Add to `pnpm verify` + CI.
- **Failure output:** human-readable family/key diff — the PR review artifact for prompt changes.
- **Class:** measured (release gate).

### E17. Cross-surface interference audit (1 day)
- **Why:** the three surfaces interact — an ontology patch changes the *correct* extraction, which invalidates the *current* prompt's ontology-embedded digest, which changes capture UX friction. Optimizing one in isolation has misled every prior attempt.
- **Procedure:** Fix the 6-variant prompt set from E13; apply 2 ontology revisions from E14 one at a time; re-run E13 battery; report prompt×ontology interaction (F1 delta matrix). Then pick capture params (E2) that hold under the *new* ontology+prompt pair, not the incumbent.
- **Metrics:** F1 delta matrix (prompt × ontology), ECE drift, capture completion under E2 harness with winning combination.
- **Decision rule:** ship order is always prompt → ontology → UI params, each gated by the previous step's verdict; never batch two unmeasured changes — attribution requires single-variable steps (cf. §6 step discipline).
- **Class:** measured.

---

## 6. Procedure discipline

Every experiment above follows the same protocol:

1. **Pre-register** in a dated markdown (`doc/evidence/prereg-<id>.md`): hypothesis, metric, decision rule, commit hash. Deviations are recorded, never edited in place.
2. **Freeze inputs**: case manifest hash, scenario seed, RNG seed, browser profile hash, clock offset.
3. **Power check before run**; abort if underpowered; log the abort.
4. **Run blind**; analysis script written before unblinding where feasible.
5. **Report in full**: positive, negative, and null results to `doc/evidence/`; ledger entry; one-paragraph \"what we may claim.\"
6. **Replicate**: E12 drill quarterly; failures block releases.
7. **Human gate**: anything user-facing ships as a revision via consent (E10 gate applies).

---

## 7. Ethics, consent, and the politics of measurement

This program instruments humans. Rules, non-negotiable:

- **Local-only by default.** The journal never leaves disk. There is no aggregate telemetry endpoint and never will be without explicit, per-install, revocable consent.
- **No ranking of persons.** The system computes *semantic compatibility of notes*; it does not score people's worth, need severity, or deservingness. Any feature that sorts *people* by computed priority is rejected at design review — match confidence is not rationing.
- **Explanation or nothing.** A match the user cannot understand is a manipulation; every match ships with its reasons (satisfied/conflicted/missing constraints). `assertState`/explanation events exist precisely for this.
- **Right to exit.** Export all notes/keys/ontology at any time (Nostr events are portable by design); delete = delete locally; relay is forgettable.
- **Opt-out of the study, keep the tool.** Journal can be disabled (`VITE_FRICTION=off`) without losing notes/matching; document it.
- **Community governance for pilots** (§9): a pilot deployment in a mutual-aid or disaster-response group is governed by the group's own consent process — who is measured, what is shared with the network, what is never shared (e.g., medical needs: role-scoped encryption, or local-only).
- **No dark patterns**: consent UI must not nudge; \"decline\" is equal-weight to \"accept\"; rollback is one click and always works.
- **Attestation honesty.** Signed attestations (endorsements) are provenance, not tar; display them as claims with issuer, never as reputation scores (yet — see §9.4).

---

## 8. What this program may and may not claim

| May claim | May not claim |
|---|---|
| \"X is reproducibly better on this benchmark\" | \"Users are better off\" (until a pilot shows it) |
| \"This friction occurs N times/week locally\" | \"Fixing it will help\" (until E3 shows it) |
| \"Candidate revision improved completion 25% ± 10\" | \"The system learns autonomously\" (human consent is load-bearing) |
| \"Ontology v2 matches more pairs in simulation\" | \"The ontology understands human need\" |
| \"Zero invalid events under 20% packet loss\" | \"Survives a disaster\" (a mesh under real disaster conditions is a different claim — §9) |
| \"F1 rose on labeled cases\" | \"The ontology covers humanity\" |

Every claim in public writing about Notention should be traceable to a ledger ID. If it isn't, it doesn't ship.

---

## 9. The anthropological and civilizational question

### 9.1 The need

Civilizations coordinate at scales beyond any individual's comprehension — and the tooling for *local*, *human-scale* coordination has been systematically dismantled. Guilds dissolved; unions thinned; mutual aid survives but with 1990s technology; disaster response relies on spreadsheets, radio, and improvisation; care networks (aging parents, disabled neighbors, single parents) coordinate via group chats and prayer. The vacuum is filled by platforms whose business model is *attention extraction*, or by nothing. Both fail the vulnerable first.

Technical infrastructures are not neutral here. Nostr, Meshtastic, CRDTs, local-first software, and emergent ontologies are *coordination infrastructure* — as load-bearing as roads. Decentralized pub/sub + signed events + portable identity is a claim about who owns cooperation, not merely how bytes move.

### 9.2 What "tangible benefit" means — decomposed

Not vibes. Four measurable channels:

1. **Coordination cost ↓**: hours from need-expression → matched provider. (E1/E5/E9; target: from days to same-day for local requests in pilot.)
2. **Failed cooperation recovered**: # of lapsed/cancelled commitments that a *better-explained* or *better-scoped* match would have rescued (E6-style explanation completeness analysis). This is the single most human metric on offer: the ramp installed before Friday.
3. **Dignity-preserving access**: # of non-market needs satisfied (care, repair, tutoring, rides, labor) without passing through a platform gate, paywall, or algorithmic rationing. The benchmark's ≥40% non-market quality cases exist to keep this channel honest — measure it, report it, defend it.
4. **Resilience under infrastructure failure**: % of coordination continued during relay/internet outage via mesh (E9 + a live drill with Meshtastic radios — one real emergency-ish scenario, fully consented, tabletop if needed).

If a pilot shows none of these moving, the technology has not earned the word \"benefit\" and the roadmap bends back to measurement (per TODO.14 kill criteria).

### 9.3 The legitimacy conditions — what makes this different from a platform

A coordination system for the vulnerable is legitimate only if:

- **Sovereign**: keys are identity; data is local; exit is free (Nostr portability).
- **Transparent**: matching is explainable property logic, not a recommender oracle; the ontology is readable by anyone and editable by its community.
- **Reversible**: every automated change (revisions) ships with consent + rollback; every feature flag can be flipped back.
- **Plural**: ontology is per-community, forkable, mergeable — not standardized by a central authority (standardization without consent is colonial in the exact, technical sense).
- **Bounded**: no engagement optimization, no dark patterns, no extraction. Notention's incentives must be structurally aligned with *completed commitments*, not *time in app*. Success = the app helped you leave it.

These are not marketing pillars; they are audit criteria for every design review. If a feature violates one, it does not ship — no matter how measurable its effect on other metrics.

### 9.4 The civilizational frame, honestly bounded

Grand claims (\"survival GPS\", GSS.md's VitalSpime) are directionally coherent: as climate, politics, and infrastructure grow volatile, coordination without gatekeepers becomes *survival-relevant* infrastructure. But honesty demands sequence:

1. **Now**: a trustworthy instrument for local, opt-in cooperation in 1–3 communities that already practice mutual aid — we build *with* them, not for them; they own their ontology, their relay, their norms; we bring measurement and rollback discipline; they bring legitimacy.
2. **Next**: mesh-first operation validated in real (tabletop then drill) conditions — because in the scenarios that matter (grid down, networks partitioned), the internet-scale stack is a liability, not a feature.
3. **Only then**: the \"as ubiquitous as GPS\" framing — and even then, with geodetic humility: no software routes anyone to safety; it routes *information about survival conditions*, and humans decide. The system informs; it never orders.

The civilizational stake is real precisely because it is not rhetoric. A decentralized network that lets neighbors install a wheelchair ramp, find insulin, or pool tractors — with math they can inspect and data they own — is a genuine counter-infrastructure to the platform economy. That is the scale of what is being built. It is also exactly why the measurement program in this document exists: **trust cannot be claimed into existence; it can only be earned in transactions of evidence.**

### 9.5 Pilot protocol (the first real deployment, 2026 Q1 target)

- **Partner**: one mutual-aid group or community land trust (existing social capital; no recruitment cold).
- **Scope**: rides, tool lending, meal delivery, skill-shares — nothing medical/legal without their explicit opt-in and counsel review.
- **Governance**: group names an owner; they can pull the plug any day; they keep all aggregates; we publish only consented summaries.
- **Measurement**: E3 field loop + E5 distributions + E9 drill + completion rates; 90 days; monthly review with the group (we present, they decide).
- **Deliverables**: a published case study with their name attached only with written permission; otherwise anonymous (\"one urban mutual-aid group, 2026\").
- **Exit criteria**: if benefits don't move, we say so — and either fix the tool or stop. No survivorship reporting.

### 9.6 What success looks like at year 1

- One pilot community reporting measurable coordination-cost reduction, in their voice.
- A public benchmark + conformance suite that any fork can adopt (E12 reproducibility) — the \"npm test for coordination software.\"
- The first revision delivered to real users **after** E10 comprehension gate — and rolled back at least once on their request, demonstrating consent works.
- Zero privacy incidents; zero deceptive UI; zero auto-applied changes without consent.
- A journal article or public essay: *\"Measured cooperation: running controlled experiments inside a living local-first network\"* — with the null results prominent.

---

## 10. Implications — if this works, and if it doesn't

**If it works**: a template exists for evidence-gated, consent-first improvement of any social software — applicable to cooperative platforms, mesh networks, civic tech. The niche (local, sovereign, measured) is empty by construction, because platforms cannot enter it without abandoning extraction. Science and ethics converge here: the same transparency that makes it publishable makes it trustworthy.

**If it fails**: the failure modes are known (underpowered verdicts, metric Goodharting, synthetic-human conflation, consent theater) and each has a kill criterion in TODO.14. Failing honestly is still a contribution — it tells the field which instruments lie.

**Either way**, the immediate obligation is the same: finish TODO.14 Phase A, close the loop in Phase B–C, and let the first real revision teach us what we don't yet know. The instrument is built. Time to measure.

---

## Appendix A — Traceability

| Claim/section | Repo artifact |
|---|---|
| Evidence classes | `core/src/eval/verdict.ts`, `VerdictResult.evidenceClass` (TODO.13 S6) |
| Verdict engine/MDE | `core/src/eval/verdict.ts`, `core/src/telemetry/constants.ts` |
| Quality benchmark | `eval/cases/{intent,quality}/`, `eval/cases/manifest.json` (`pnpm eval:verify-manifest`) |
| Calibration | `core/src/eval/calibration.ts` (ECE ≤ 0.1, TODO.12 4.7) |
| Correction flow | `core/src/eval/correctionFlow.ts` (TODO.12 4.8) |
| Commitment lifecycle | `core/src/eval/commitmentLifecycle.ts` (TODO.12 4.10) |
| Friction journal | `core/src/telemetry/journal.ts` + 7 capture points (TODO.12 4b) |
| Revisions / consent | `core/src/telemetry/revisionStore.ts`, `ui/src/components/settings/RevisionsTab.tsx` |
| Simulator | `simulator/src/{scenario,agent,movie_maker}.ts`, `src/scenarios/*` |
| Optimizer | `optimize/src/optimizer/` (cache, candidates, evaluation, verdicts) |
| ui/eval harness | `ui/eval/{harness,seedSnapshot,intentRunner}.ts` |
| Protocol conformance | `simulator/src/scenarios/ProtocolTestbed.test.ts` |
| Prompt registry + extractor | `core/src/prompts/{registry,propertyExtraction}.ts`, `agent/src/intelligence/LlmPropertyExtractor.ts` |
| Prompt golden gate (unwired) | `optimize/src/prompts/evaluate.ts`, `optimize/src/prompts/property-extraction.golden.json` |
| Gardener (ontology evolution, unmeasured) | `ui/src/services/gardener.ts`, `optimize/src/experiments/ontologyExperiment.ts` |
| Development plan | `TODO.14.md` |
