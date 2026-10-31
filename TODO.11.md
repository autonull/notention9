# Notention — Implementation Considerations

**Source:** Review of `TODO.9.md`, revision 2  
**Purpose:** Collect technical recommendations, architectural considerations, risks, and proposed acceptance criteria for future implementation planning.

---

## 1. Highest-priority recommendations

### 1.1 Establish independent evaluation of improvements

**Recommendation:** Ensure that the system generating an improvement cannot control the criteria used to judge whether that improvement succeeds.

Implementation considerations:
- Maintain a human-authored collection of representative user tasks.
- Keep evaluation cases separate from the synthesis process.
- Include real-world examples and observed user problems.
- Validate generated test scenarios against independent data sources.
- Preserve baseline results so new candidates can be compared with existing behavior.
- Record evaluation inputs, outputs, versions, and decisions for reproducibility.

**Potential acceptance criteria:**
- Every adopted candidate has an independently evaluated baseline comparison.
- The synthesis process cannot modify protected evaluation cases.
- Evaluation results can be reproduced from a recorded run.
- Rejected candidates retain their evaluation history.

### 1.2 Expand human usability validation

**Recommendation:** Treat human validation as a necessary stage of product development, not an optional final check.

Implementation considerations:
- Recruit users unfamiliar with Notention.
- Observe task completion without assistance.
- Record hesitation, confusion, errors, and abandoned workflows.
- Compare alternative UI strategies with actual users.
- Collect qualitative feedback alongside quantitative measurements.

**Initial validation targets from the roadmap:**
- A new user completes the Golden Path in under two minutes without assistance.
- At least 70% of matches are rated relevant, using feedback from five users.

These should be treated as initial experiment targets, not sufficient evidence of universal usability.

### 1.3 Validate the architecture with a second workflow

**Recommendation:** Demonstrate that the discovery, synthesis, evaluation, and adoption machinery works across more than one workflow before expanding its abstractions.

Implementation considerations:
- Select a workflow structurally different from the existing examples.
- Identify which discovery and synthesis mechanisms can be reused.
- Record workflow-specific exceptions.
- Measure the amount of manual intervention required.
- Avoid introducing generalized abstractions until multiple workflows demonstrate the need.

**Success criterion:** A second workflow can pass through the improvement pipeline without extensive workflow-specific engineering.

---

## 2. Strengthen the evaluation framework

### 2.1 Evaluate outcomes, not just interaction speed

A faster interface is not necessarily a better interface.

Evaluate multiple dimensions:

| Metric | Purpose |
|---|---|
| Time to intent (TTI) | How quickly users express an intention |
| Interaction steps | Effort required to complete a task |
| Completion rate | Whether users achieve the intended outcome |
| Error rate | Frequency of mistakes |
| Correction rate | How often users must repair their input |
| Match relevance | Whether suggested matches are useful |
| First-attempt success | Whether the initial attempt works |
| User preference | Which interaction users choose |
| User satisfaction | Whether the overall experience is useful |

**Recommendation:** Establish a multi-objective evaluation model.

Do not allow one metric, particularly speed, to dominate all adoption decisions.

Consider:
- Minimum acceptable quality thresholds.
- Weighted evaluation criteria.
- Different metric weights for different workflows.
- Explicit trade-off reporting.
- Confidence intervals where sample sizes permit meaningful statistical analysis.

### 2.2 Maintain separate evaluator layers

The fast in-process evaluator and browser-based evaluator should serve different purposes.

**In-process evaluator:**
- Test extraction logic.
- Test matching logic.
- Validate schemas.
- Run large numbers of deterministic experiments.
- Compare candidates quickly.

**Playwright evaluator:**
- Test actual rendering.
- Validate browser interactions.
- Verify keyboard and accessibility behavior.
- Test navigation and complete user journeys.
- Detect integration failures.

**Recommendation:** Preserve both layers rather than treating the fast evaluator as a complete replacement for browser testing.

### 2.3 Improve experiment reliability

Consider implementing:
- Repeated runs across multiple configurations.
- Seeded test data.
- Consistent evaluation environments.
- Explicit baseline comparisons.
- Regression detection.
- Statistical significance reporting where appropriate.
- Separate reporting for automated and human evaluations.

**Potential acceptance criterion:** Every candidate receives a reproducible evaluation report identifying improvements, regressions, uncertainty, and test coverage.

---

## 3. Protect the self-improvement mechanism

### 3.1 Enforce safe boundaries for generated code

Generated UI strategies and components should operate within predefined interfaces and permissions.

Recommended restrictions:
- No unrestricted filesystem access.
- No unrestricted network access.
- No arbitrary code evaluation.
- No direct access to sensitive storage or security modules.
- No ability to bypass application invariants.
- Strict TypeScript and runtime validation.
- Explicit component and interface contracts.

Additional safeguards:
- Accessibility assertions.
- Keyboard interaction tests.
- Input validation.
- Security scanning.
- Provenance records.
- Feature flags.
- Versioned candidate artifacts.
- One-step rollback.

### 3.2 Use progressive autonomy

Maintain the distinction between different levels of system autonomy.

| Level | Capability | Recommended governance |
|---|---|---|
| S1 | Configure existing components | Automated |
| S2 | Generate new implementations of existing interaction patterns | Automated testing and controlled adoption |
| S3 | Propose genuinely new interaction interfaces | Human review |
| S4 | Generate broader development specifications | Human-directed |

**Recommendation:** Keep autonomy proportional to the potential impact of a change.

Do not allow an automatically generated implementation to silently redefine core application behavior.

### 3.3 Preserve provenance and auditability

For each generated or adopted candidate, record:
- Source code and component versions.
- Discovery results.
- Original problem or opportunity.
- Generation method and model version.
- Evaluation results.
- Adoption decision.
- Approval information where applicable.
- Deployment and rollback history.

This makes experimentation traceable and helps diagnose regressions.

---

## 4. Improve the ontology

### 4.1 Broaden beyond economic exchanges

The existing ontology should be tested against scenarios that do not resemble conventional marketplaces.

Important domains to explore:
- Family relationships.
- Caregiving.
- Community relationships.
- Social obligations.
- Volunteering.
- Education and knowledge exchange.
- Access and resource sharing.
- Informal assistance.
- Recurring responsibilities.
- Legal and contractual commitments.

**Recommendation:** Establish an ontology coverage experiment using representative scenarios from these domains.

The objective is to identify missing concepts, relationships, and lifecycle states before committing to broader abstractions.

### 4.2 Model relationships and lifecycle explicitly

Explore whether the ontology should distinguish:
- Needs.
- Offers.
- Requests.
- Proposals.
- Matches.
- Agreements.
- Commitments.
- Fulfillment.
- Cancellation.
- Expiration.

Consider explicit lifecycle transitions, for example:

`open → matched → committed → done`

With alternative outcomes such as:

`lapsed` or `cancelled`

Ensure that these transitions are validated by deterministic application logic.

### 4.3 Compare flat attributes with structured facets

The roadmap proposes experimenting with two approaches:

**Flat attributes:** Simple properties such as budget, location, and deadline.

**Structured facets:** Grouped properties with status, relationships, and lifecycle semantics.

Recommendation:
- Benchmark both approaches.
- Measure extraction accuracy.
- Evaluate query and matching complexity.
- Examine how well each handles incomplete information.
- Test schema evolution and backward compatibility.

Avoid adopting additional ontology complexity without demonstrating its practical value.

### 4.4 Prefer inference over unnecessary data entry

Where appropriate, infer information from context rather than asking users to complete every field.

However:
- Distinguish inferred values from confirmed values.
- Track confidence and provenance.
- Ask users to confirm consequential assumptions.
- Provide clear correction mechanisms.
- Never silently convert uncertain inference into a binding commitment.

---

## 5. Optimize ontology, UI, and prompts together

These three dimensions should be evaluated as a connected system.

### 5.1 Ontology

What information and relationships can be represented?

### 5.2 UI configuration

How do users express and interact with that information?

### 5.3 Prompt strategy

How does natural language become structured, validated information?

**Recommendation:** Introduce experiments that vary all three dimensions rather than optimizing them independently.

Examples:
- A revised ontology may require different extraction questions.
- A conversational interface may eliminate unnecessary form fields.
- A new relationship type may require a different matching strategy.

The evaluation engine should be able to identify these interactions.

### 5.4 Maintain multiple prompt strategies

Consider a portfolio including:
- Zero-shot extraction.
- Few-shot extraction.
- Schema-constrained extraction.
- Clarification prompts.
- Repair prompts.
- Multi-stage extraction.

Select strategies according to task requirements, confidence, and measured performance.

Maintain deterministic validation after model output.

---

## 6. Develop adaptive UI strategy profiles

Rather than imposing one interface on every situation, maintain a portfolio of strategies.

Potential profiles:

| Profile | Design objective |
|---|---|
| Beginner | Guided entry and explanation |
| Power | Dense controls and reduced interaction steps |
| Mobile | Touch-friendly layouts |
| Hiring | Support hiring-related workflows |
| Care | Support care-related needs and commitments |

Implementation considerations:
- Maintain strategy configurations per interface boundary.
- Support user-level overrides.
- Develop contextual strategy selection.
- Record why a strategy was selected.
- Measure performance separately by profile.
- Allow users to retain their preferred interface.

**Recommendation:** Treat profiles as hypotheses that require validation rather than fixed assumptions about user categories.

---

## 7. Improve model independence and offline operation

Maintain separation between AI inference and deterministic application behavior.

Recommended architecture:

1. Local model for preferred inference where capabilities permit.
2. Remote model as a configurable fallback.
3. Deterministic rules for tasks that do not require inference.

Implementation considerations:
- Define a provider-independent inference interface.
- Probe model capabilities before selecting a provider.
- Validate model outputs against application schemas.
- Keep state transitions deterministic.
- Provide useful degraded behavior when no model is available.
- Test the full workflow without internet connectivity.
- Record which provider and model generated each result.

**Recommendation:** Make offline operation an explicit, tested capability rather than simply an architectural aspiration.

---

## 8. Improve coverage and discovery

Because human situations are effectively unbounded, coverage should be approached through representative sampling.

Consider maintaining scenario dimensions such as:

| Dimension | Examples |
|---|---|
| Social form | Communal, authority, equality, market |
| Topology | One-to-one, one-to-many, network |
| Exchange | Goods, labor, knowledge, care, access |
| Stakes | Social, economic, legal, safety |
| Temporality | One-shot, recurring, deadline, open-ended |
| Heterogeneity | Shared, multilingual, contested, cross-domain |

**Recommendation:** Track discovery rate.

Useful measurements:
- New problem classes discovered.
- New ontology gaps identified.
- New interaction patterns required.
- Previously unsupported workflows enabled.
- Reusable capabilities discovered.
- Manual intervention needed per new workflow.

This provides a more realistic measure of progress than claiming to cover every possible human situation.

---

## 9. Improve adoption and rollback

The adoption mechanism should be treated as a controlled deployment system.

Recommended capabilities:
- Baseline preservation.
- Candidate versioning.
- Feature-flagged rollout.
- Comparison against existing behavior.
- Explicit adoption policies.
- Human approval for higher-risk changes.
- Automatic rollback on defined regression thresholds.
- Complete decision history.

Consider staged adoption:

1. Generate candidate.
2. Run static and security checks.
3. Run deterministic evaluation.
4. Run browser integration tests.
5. Obtain human approval where required.
6. Deploy to a limited audience or feature flag.
7. Measure actual outcomes.
8. Expand adoption or roll back.

**Recommendation:** Separate passing automated tests from demonstrating real-world value. Both should be required for significant product changes.

---

## 10. Recommended implementation priorities

The following ordering is a proposed planning sequence, not an assertion about the existing TODO status.

### Priority 1 — Validate the foundation

- [ ] Establish independent evaluation datasets.
- [ ] Preserve baseline measurements.
- [ ] Validate the Golden Path with unfamiliar users.
- [ ] Validate match relevance with human feedback.
- [ ] Demonstrate the improvement loop on a second workflow.
- [ ] Document gaps between in-process and browser evaluation.

### Priority 2 — Strengthen reliability

- [ ] Expand accessibility and keyboard assertions.
- [ ] Improve security checks for generated code.
- [ ] Verify provenance and audit records.
- [ ] Test rollback and feature-flag behavior.
- [ ] Test degraded and offline operation.
- [ ] Establish regression thresholds.

### Priority 3 — Expand representational capability

- [ ] Test care and non-market scenarios.
- [ ] Evaluate ontology facet structures.
- [ ] Model commitment lifecycle transitions.
- [ ] Improve confidence and provenance for inferred information.
- [ ] Evaluate prompt and ontology interactions.

### Priority 4 — Improve adaptation

- [ ] Validate UI strategy profiles.
- [ ] Add user-level strategy overrides.
- [ ] Compare different interaction strategies with users.
- [ ] Introduce contextual strategy selection.
- [ ] Measure outcomes by workflow and profile.

### Priority 5 — Expand autonomous discovery

- [ ] Measure ontology discovery rate.
- [ ] Improve automated identification of missing capabilities.
- [ ] Expand S2 strategy synthesis.
- [ ] Establish human-review processes for S3.
- [ ] Improve automated prioritization of discovered opportunities.

---

## 11. Suggested engineering principles

These principles should guide implementation decisions.

1. **Evidence before adoption:** Generated improvements must demonstrate value against independent criteria.
2. **Human outcomes over internal metrics:** Product success is determined by user outcomes, not pipeline activity.
3. **Deterministic boundaries:** AI may interpret and propose; application logic validates and controls consequential state changes.
4. **Reversible experimentation:** Every significant automated change must be traceable and reversible.
5. **Progressive autonomy:** Increase autonomy only when demonstrated reliability justifies it.
6. **Representational breadth:** Avoid designing the ontology exclusively around economic exchanges.
7. **Independent evaluation:** The generator must not control its own ground truth.
8. **Modularity without premature abstraction:** Generalize capabilities when multiple workflows establish a genuine need.
9. **Provider independence:** Core functionality should not depend on one AI provider.
10. **Human validation:** Automated success is not proof of usability.

---

## 12. Strategic questions for implementation planning

These questions should be resolved as the work evolves.

1. What minimum human validation is required before a candidate can be adopted automatically?
2. Which changes always require human approval?
3. How should evaluation metrics be weighted when speed, accuracy, and satisfaction conflict?
4. What is the minimum ontology needed to support non-market relationships?
5. How should uncertain or inferred information be presented to users?
6. How will the system detect that its evaluation scenarios no longer represent real user needs?
7. What evidence is sufficient to generalize a capability across workflows?
8. How should profile selection balance user preference and contextual optimization?
9. What is the acceptable level of degradation when operating offline?
10. What evidence would demonstrate that the system is becoming more useful over successive improvement cycles?

---

## 13. Recommended definition of success

The ultimate measure of Notention's self-improvement system should not be the number of candidates generated, components discovered, or tests executed.

It should be whether successive versions help people accomplish real intentions more reliably and with less effort.

A successful improvement cycle should demonstrate:

- A real problem or opportunity was identified.
- A candidate improvement was generated.
- The candidate was evaluated independently.
- Regressions and trade-offs were measured.
- The change was adopted safely.
- Human outcomes improved.
- The result can be reproduced and reversed if necessary.

**Central implementation principle: Build a system that can improve itself, but make real-world usefulness the authority that determines whether an improvement is actually an improvement.**

