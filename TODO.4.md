# Notention Self-Comprehensive UI/UX Optimization Architecture

## Final Development Plan

This is the complete, self-contained development plan for turning Notention into an ideal self-comprehensive optimization architecture: a system in which UX problems can be discovered, reproduced, diagnosed, prioritized, fixed, verified, and documented through natural language, including speech, while preserving safety, privacy, accessibility, and regression resistance.

This plan excludes time estimates.

---

# 1. Purpose

The purpose of this plan is to create a sustainable optimization loop for Notention’s UI/UX in which:

- Human operators can direct the process through natural language or speech.
- AI agents explore, test, measure, and improve the product.
- Tests resist brittleness by asserting semantic intent rather than fragile DOM structure.
- LM prompts are treated as first-class product components and optimized alongside the UI.
- Accessibility, privacy, permissions, and data integrity remain core constraints.
- The system can grow from report-only auditing into assisted implementation and eventually supervised self-improvement.

The final architecture should make it possible to say:

> “Audit the publishing workflow for private notes, identify friction, reproduce it, propose the smallest safe fix, verify it, and document the result.”

or:

> “Test whether the property extraction prompt handles noisy speech correctly and improve the UI if the prompt cannot be made reliable.”

and have the system safely execute that request with evidence, guardrails, and verification.

---

# 2. Guiding Principles

## 2.1 Intent over selectors

Tests and automation should express user goals, not brittle UI details.

Examples:

- “Create a note and attach a location property.”
- “Publish a private note only to approved relays.”
- “Resolve an ontology conflict without losing original data.”
- “Recover from invalid property input without data loss.”

UI locators may be used when necessary, but the primary assertion target should be semantic state, user intent, accessibility tree, and observable system behavior.

## 2.2 Evidence over opinion

Every UX finding must be backed by reproducible evidence:

- Traces.
- Screenshots.
- Accessibility snapshots.
- Console errors.
- Network logs.
- Semantic state dumps.
- Prompt traces.
- Speech transcript logs.
- Simulator event logs.
- Regression test results.

AI opinions are useful for analysis but insufficient without evidence.

## 2.3 Prompts are part of the UI

In an AI-assisted product, a prompt failure is often experienced by the user as a UI failure.

Therefore:

- Prompt changes must be versioned.
- Prompt behavior must be tested.
- Prompt confidence must influence UI presentation.
- Prompt regressions must be treated as UX regressions.

## 2.4 Speech is a first-class interface

The optimization process and the product itself should support natural language and speech control.

Speech-first operation requires:

- Accessible names.
- Predictable focus.
- Clear confirmation states.
- Non-destructive defaults.
- Recovery from misunderstood commands.
- Explicit consent for consequential actions.

## 2.5 Safety before speed

Any action that can publish data, delete data, modify identity, change permissions, or affect external systems must be protected by:

- Explicit confirmation.
- Bounded agent permissions.
- Disposable test data.
- Isolated environments.
- Audit trails.
- Rollback paths.

## 2.6 Small, verifiable change

Agents should prefer the smallest coherent change that resolves a verified problem.

Large speculative redesigns should be separated from confirmed defect fixes and only pursued after evidence supports them.

## 2.7 Human judgment remains authoritative

Automated agents can detect friction, inconsistency, and broken behavior. Humans remain necessary for validating whether an experience is genuinely clearer, more trustworthy, and more useful.

---

# 3. Target End State

The ideal final state is a self-comprehensive optimization architecture with the following capabilities.

## 3.1 Natural-language control

A human can control the optimization process through chat, terminal, or voice.

Example commands:

- “Audit the note capture workflow.”
- “Find where users get stuck when adding semantic properties.”
- “Reproduce the publishing permission issue.”
- “Compare the current extraction prompt with the candidate prompt.”
- “Create a fix for the ontology conflict screen and verify it.”
- “Run accessibility checks in screen-reader-only mode.”
- “Show me evidence before changing anything.”

## 3.2 Evidence-backed UX findings

The system produces structured findings containing:

- Location.
- User journey.
- Reproduction steps.
- Severity.
- Confidence.
- Evidence bundle.
- Affected component or prompt.
- Proposed verification method.

## 3.3 Brittle-resistant testing

Tests are based on:

- User intent.
- Semantic state.
- Accessibility tree.
- MCP-level operations.
- Stable component contracts.
- Replayable scenarios.

UI changes that preserve behavior should not unnecessarily break tests.

## 3.4 Prompt and UI co-optimization

The system evaluates whether a problem should be solved by:

- Improving the prompt.
- Improving the UI.
- Adding clarification.
- Changing confidence thresholds.
- Providing better defaults.
- Reducing required input.
- Making the system ask fewer questions.

## 3.5 Bounded implementation agents

Implementation agents may propose or apply small changes only after:

- A finding has been verified.
- Reproduction exists.
- Scope is bounded.
- Regression tests are added.
- Safety review passes.
- Independent verification confirms the improvement.

## 3.6 Continuous learning

Every fix becomes part of the permanent evaluation system:

- New regression test.
- New journey.
- New prompt evaluation.
- New simulator scenario.
- New accessibility check.
- New UX metric.
- New decision record.

---

# 4. Architecture Overview

The architecture is organized into seven planes.

---

## 4.1 Control Plane

The Control Plane receives natural language or speech commands and translates them into bounded operations.

### Responsibilities

- Speech capture.
- Transcript normalization.
- Intent recognition.
- Command validation.
- Permission gating.
- Confirmation requests.
- Progress reporting.
- Result summarization.

### Supported modalities

- Text chat inside Notention.
- Terminal commands.
- Voice input.
- CI-triggered automation.
- API invocation through MCP.

### Command categories

1. **Audit**
   - “Audit the capture workflow.”
   - “Inspect the publish confirmation experience.”

2. **Reproduce**
   - “Reproduce the property validation failure.”
   - “Show how the ontology conflict appears.”

3. **Diagnose**
   - “Explain why extraction fails for this note.”
   - “Identify where the user has to backtrack.”

4. **Improve**
   - “Propose a smaller interaction for adding a property.”
   - “Improve the error message for invalid constraints.”

5. **Verify**
   - “Run the regression tests for this change.”
   - “Compare before and after behavior.”

6. **Govern**
   - “Show what the agent changed.”
   - “List all findings awaiting review.”
   - “Block publishing actions in test mode.”

---

## 4.2 Agent Plane

The Agent Plane contains bounded specialized agents coordinated by a Director.

### Director Agent

The Director receives high-level natural language goals and decomposes them into safe tasks.

Responsibilities:

- Interpret user intent.
- Select the appropriate workflow.
- Assign subagents.
- Enforce scope limits.
- Consolidate evidence.
- Request human approval when required.

### Audit Agent

Responsibilities:

- Explore the app.
- Run journeys.
- Gather evidence.
- Detect friction.
- Produce findings.
- Avoid modifying application code.

### Prompt Evaluation Agent

Responsibilities:

- Inventory prompts.
- Run prompt experiments.
- Compare prompt variants.
- Detect hallucination, overconfidence, or schema violations.
- Recommend prompt or UI changes.

### Implementation Agent

Responsibilities:

- Make the smallest coherent fix.
- Add regression coverage.
- Update documentation.
- Produce a reviewable change.
- Never exceed the approved scope.

### Verification Agent

Responsibilities:

- Independently verify the fix.
- Re-run journeys.
- Compare metrics.
- Check accessibility.
- Check prompt behavior.
- Confirm no regression.

### Human Feedback Agent

Responsibilities:

- Ingest usability observations.
- Convert human observations into findings.
- Compare human friction with automated friction.
- Prioritize changes that matter to real users.

---

## 4.3 Tool Plane

The Tool Plane exposes capabilities through MCP or equivalent tool interfaces.

The key principle is that agents should operate through controlled tools, not unrestricted system access.

### Notention domain tools

Examples:

- Create note.
- Update note.
- Add property.
- Remove property.
- Infer properties.
- Search notes.
- Inspect ontology.
- Resolve conflict.
- Inspect privacy state.
- Request publish preview.

### Browser tools

Examples:

- Navigate to view.
- Perform intent-based action.
- Focus element.
- Press key.
- Speak command.
- Capture screenshot.
- Capture accessibility tree.
- Capture console errors.
- Start trace.
- Query semantic state.

### Evaluation tools

Examples:

- Run journey.
- Run accessibility scan.
- Run prompt evaluation.
- Run simulator scenario.
- Run visual comparison.
- Run metric comparison.
- Generate evidence bundle.

### Repository tools

Examples:

- Create branch.
- Create patch.
- Run tests.
- Generate change summary.
- Request review.
- Attach evidence.

### Safety tools

Examples:

- Request confirmation.
- Check permission level.
- Enforce sandbox mode.
- Block external publishing.
- Record audit event.
- Halt agent execution.

---

## 4.4 Application Plane

The Application Plane is the actual Notention system under optimization.

### Components

- Core semantic kernel.
- Agent runtime.
- MCP server.
- React UI.
- CLI.
- Simulator.
- Local relay or test network.
- Prompt library.
- Ontology and matching system.

### Required development hooks

The application should expose controlled development-only hooks.

#### Semantic state introspection

A stable development interface, such as:

```ts
window.__NOTENTION_STATE__
```

or an equivalent debug bridge, should expose:

- Current route.
- Active note.
- Property draft state.
- Validation errors.
- Ontology suggestions.
- Confidence scores.
- Privacy state.
- Publish readiness.
- Pending confirmations.
- Accessibility-relevant modal state.

This allows tests to verify semantic truth instead of relying only on visual output.

#### Prompt trace introspection

The UI and agent should expose:

- Prompt name.
- Prompt version.
- Input context.
- Output.
- Confidence.
- Parse result.
- Whether the user accepted or rejected the result.

#### Action trace introspection

The app should record:

- Command source.
- Intent.
- Tool calls.
- State changes.
- Validation failures.
- Confirmation events.
- Recovery events.

---

## 4.5 Evidence Plane

The Evidence Plane stores reproducible artifacts.

### Evidence bundle contents

Each finding should include:

- Journey name.
- Scenario ID.
- Steps taken.
- Screenshots.
- Trace file.
- Accessibility snapshot.
- Console logs.
- Network logs.
- Semantic state snapshot.
- Prompt trace.
- Speech transcript, if applicable.
- Metric snapshot.
- Severity.
- Confidence.
- Suggested next action.

### Evidence requirements

Evidence must be:

- Replayable.
- Timestamped.
- Linked to code revision.
- Linked to prompt version.
- Linked to test scenario.
- Searchable.
- Reviewable by humans.

---

## 4.6 Knowledge Plane

The Knowledge Plane turns evidence into durable understanding.

### Artifacts

- UX findings backlog.
- Journey registry.
- Prompt registry.
- Metric baselines.
- Decision records.
- Regression tests.
- Accessibility requirements.
- Safety requirements.
- Known failure patterns.
- Successful improvement patterns.

### Finding schema

A structured finding should contain:

```json
{
  "id": "finding-id",
  "title": "Property extraction requires unnecessary manual correction",
  "journey": "capture-and-edit",
  "location": "ui/src/components/editor/ExtractionReview.tsx",
  "severity": "high",
  "confidence": "medium",
  "evidence": ["trace", "screenshot", "prompt-log", "state-dump"],
  "reproduction": "journey-spec or scenario-id",
  "affected_layer": ["ui", "prompt", "core"],
  "user_impact": "User must correct inferred property manually",
  "proposed_fix": "Improve prompt context and add one-click correction",
  "verification": "Run capture journey with noisy speech transcript"
}
```

---

## 4.7 Guardrail Plane

The Guardrail Plane ensures the system remains safe.

### Core guardrails

- Report-only mode by default.
- Isolated test application.
- Disposable synthetic data.
- No production secrets.
- No real publishing unless explicitly enabled.
- No unrestricted external network access.
- No concurrent edits to shared components without coordination.
- Human approval for destructive or consequential actions.
- Full audit log.
- Agent capability scoping.
- Automatic halt on safety violation.

---

# 5. Core Design Objectives

The plan must satisfy all of the following objectives.

---

## 5.1 Optimize Notention’s UI/UX ergonomics

Improve:

- Learnability.
- Predictability.
- Error recovery.
- Clarity of system state.
- Navigation orientation.
- Property editing efficiency.
- Publishing safety.
- Ontology conflict resolution.
- Search explainability.
- Accessibility.

---

## 5.2 Make the process fully controllable through natural language

The optimization process itself must be operable by natural language commands.

This includes:

- Starting audits.
- Selecting journeys.
- Reproducing issues.
- Comparing variants.
- Requesting fixes.
- Running verification.
- Explaining failures.
- Producing reports.

Speech support should be treated as a first-class extension of natural language control.

---

## 5.3 Optimize LM prompts as product components

Prompts must be:

- Inventoried.
- Versioned.
- Evaluated.
- Traced.
- Compared.
- Regression-tested.
- Connected to UI behavior.

Prompt optimization should not be separated from UX optimization.

---

## 5.4 Avoid brittle tests

The system should avoid overdependence on:

- CSS selectors.
- Exact text strings.
- Pixel-perfect layout.
- Internal DOM hierarchy.
- Fragile timing.
- Unstable generated IDs.

Instead, prefer:

- Intent-level assertions.
- Accessible roles and names.
- Semantic state checks.
- MCP state checks.
- Stable test IDs where needed.
- Replayable scenarios.
- Contract tests.
- Behavioral snapshots.

---

## 5.5 Support safe self-improvement

The architecture should allow agents to propose and verify improvements while preserving human oversight.

Self-improvement must be:

- Scoped.
- Evidence-based.
- Reversible.
- Auditable.
- Tested.
- Reviewable.

---

# 6. User Journeys to Cover

The optimization architecture should cover the following core journeys.

---

## 6.1 Capture and editing

Goals:

- Create a note quickly.
- Add semantic properties.
- Review inferred properties.
- Correct bad suggestions.
- Recover from invalid input.
- Save safely.
- Reopen and verify persistence.

Key UX concerns:

- Is capture fast?
- Is the editor’s state obvious?
- Are inferred suggestions understandable?
- Can the user reject or edit suggestions easily?
- Are validation errors clear?
- Is unsaved work protected?

Relevant components:

- Editor.
- Extraction review.
- Property blocks.
- Property value input.
- Save state indicators.
- Validation messages.

---

## 6.2 Search and discovery

Goals:

- Find relevant notes.
- Refine search.
- Understand why results match.
- Recover from empty results.
- Move from result to note without losing context.

Key UX concerns:

- Are results explainable?
- Can filters be understood?
- Is empty state helpful?
- Are matches semantically meaningful?
- Can the user refine without starting over?

---

## 6.3 Navigation and exploration

Goals:

- Move between dashboard, notes, map, network, settings, chat, and other views.
- Preserve context.
- Maintain orientation.
- Return to previous state safely.
- Understand where they are.

Key UX concerns:

- Is current view obvious?
- Are navigation actions reversible?
- Is focus preserved?
- Are deep links stable?
- Does the user lose work when moving views?

---

## 6.4 Ontology refinement

Goals:

- Understand inferred properties.
- Review conflicts.
- Accept, reject, merge, or correct suggestions.
- Preserve data integrity.
- Avoid accidental ontology corruption.

Key UX concerns:

- Are conflicts understandable?
- Is the consequence of each action clear?
- Can the user undo?
- Are suggestions explainable?
- Are dangerous merges prevented?

---

## 6.5 Publishing and agent actions

Goals:

- Review permissions.
- Understand audience.
- Preview disclosure.
- Confirm consequential action.
- Recover from failure.
- Understand what was published.

Key UX concerns:

- Is private versus public obvious?
- Are relay targets clear?
- Are consequences explicit?
- Is confirmation calm and clear?
- Can the user abort safely?
- Is failure recoverable?

---

## 6.6 Natural language and speech operation

Goals:

- Issue commands by speech or text.
- Confirm dangerous actions.
- Receive clear feedback.
- Recover from misunderstood commands.
- Operate without visual attention when possible.

Key UX concerns:

- Is the system listening state clear?
- Is transcript visible?
- Is interpreted intent clear?
- Can the user cancel?
- Are confirmations accessible?
- Are errors understandable?

---

# 7. Layered Testing Strategy

The architecture uses complementary layers rather than one monolithic test system.

---

## 7.1 Intent-level journey tests

These are the highest-level tests.

They describe user goals and verify final semantic state.

Example intent:

```text
Journey: Add a property to a note using natural language.
Given a note exists.
When the user requests: "Add location Berlin".
Then the note has a location property with value Berlin.
And no unrelated properties are modified.
And the user receives clear confirmation.
```

Journey tests should be resilient to UI refactors as long as intent is preserved.

---

## 7.2 Playwright end-to-end ergonomics tests

Playwright is used to test real interaction behavior.

Coverage includes:

- Keyboard operation.
- Pointer operation.
- Focus management.
- Modal behavior.
- Validation errors.
- Persistence.
- Responsive layout.
- Recovery states.
- Accessibility snapshots.
- Console errors.
- Network isolation.

Playwright should assert against:

- Accessibility tree.
- Semantic state hooks.
- Visible user feedback.
- Stable roles and names.
- Minimal stable test IDs.

---

## 7.3 Component-level ergonomics with Storybook

Storybook should be introduced selectively, not universally.

Priority components:

- Property block.
- Enhanced property value input.
- Operator dropdown.
- Property palette.
- Extraction review.
- Ontology conflicts.
- Privacy confirmation modal.
- Empty states.
- Error states.
- Loading states.
- Disabled states.
- Focus states.

Component tests should cover:

- Empty.
- Populated.
- Invalid.
- Loading.
- Error.
- Disabled.
- Focused.
- Keyboard-only.
- Screen-reader-only.
- High contrast.
- Reduced motion.

---

## 7.4 Simulator-based complex behavior tests

The simulator is used for scenarios that are difficult to reproduce through simple UI tests.

Coverage includes:

- Concurrent agent actions.
- Multi-agent semantic updates.
- Ontology conflict emergence.
- Permission denial.
- Partial failure.
- Network delay.
- Conflicting suggestions.
- Rapid event bursts.
- Privacy gate behavior under pressure.

The simulator should produce:

- Event logs.
- Scenario recordings.
- UI state snapshots.
- Reproducible replay files.
- Visual evidence where useful.

---

## 7.5 Accessibility testing

Accessibility is a core constraint, not an add-on.

Automated checks should include:

- Accessible names.
- Roles.
- Focus order.
- Contrast.
- Target size.
- Heading structure.
- Landmarks.
- Error association.
- Keyboard traps.
- Motion sensitivity.
- Zoom and reflow.

Manual and agent-assisted checks should include:

- Keyboard-only journeys.
- Screen-reader-only journeys.
- Voice-only journeys.
- Sensory deprivation mode.
- Reduced-motion verification.
- High-contrast verification.

---

## 7.6 Prompt evaluation tests

Prompt tests verify that language-model behavior remains reliable.

Prompt evaluation should test:

- Schema correctness.
- Semantic correctness.
- Confidence calibration.
- Refusal behavior.
- Hallucination rate.
- Sensitivity to noisy speech.
- Ambiguity handling.
- Privacy leakage.
- Overwriting user intent.
- Recovery from malformed output.

Prompt tests must be linked to UI behavior.

For example:

- Low confidence should trigger clarification.
- High confidence may allow silent application with undo.
- Ambiguous output should not silently overwrite user data.
- Invalid output should fail safely.

---

## 7.7 Speech and natural language chaos tests

Speech input is messy. The system must be tested against realistic messiness.

Test transcript categories:

- Clean commands.
- Noisy transcripts.
- Self-corrections.
- Ambiguous references.
- Missing entities.
- Multiple intents in one phrase.
- Accidental destructive commands.
- Multilingual or mixed-language input where relevant.
- Background noise transcription errors.
- Interrupted speech.

Example:

```text
"Create a note about the gig economy and link it to... wait, link it to the mesh project instead."
```

The system should:

- Interpret the corrected intent.
- Avoid applying the abandoned intent.
- Ask for clarification only when necessary.
- Show what it understood.
- Allow cancellation.

---

## 7.8 Visual regression tests

Visual regression should be used carefully.

Use it for:

- Layout stability.
- Critical components.
- Responsive breakpoints.
- Dark mode.
- High contrast mode.
- Empty states.
- Error states.
- Modal positioning.
- Focus visibility.

Avoid making visual pixel-perfection a primary success metric.

---

## 7.9 Safety and permission tests

Safety tests verify that consequential actions cannot happen accidentally.

Coverage includes:

- Publishing private content.
- Changing identity.
- Deleting notes.
- Merging ontology entities.
- Granting agent permissions.
- External actions.
- Relay selection.
- Disclosure preview accuracy.
- Confirmation cancellation.
- Failure recovery.

A critical rule:

> A natural language command alone must never be sufficient to complete a consequential action without explicit confirmation.

---

# 8. Metric System

Metrics guide prioritization. They are not the final goal.

---

## 8.1 Task success metrics

- Task completion rate.
- Task failure rate.
- Recovery success rate.
- Abandonment rate.
- Need for human intervention.

---

## 8.2 Interaction efficiency metrics

- Number of required actions.
- Number of unnecessary actions.
- Number of backtracking steps.
- Number of corrections.
- Number of clarification prompts.
- Tool-call depth required to complete a goal.

---

## 8.3 Semantic friction metrics

Semantic friction measures how often the user and system fail to understand each other.

Metrics:

- Number of disambiguation steps.
- Number of rejected suggestions.
- Number of manual corrections.
- Number of repeated attempts.
- Number of misunderstood natural language commands.
- Number of prompt outputs requiring user repair.

---

## 8.4 Prompt quality metrics

- Valid schema output rate.
- Correct property extraction rate.
- Correct entity linking rate.
- Hallucination rate.
- Overconfidence rate.
- Underconfidence rate.
- Refusal appropriateness.
- User acceptance rate.
- User correction rate.

---

## 8.5 Cognitive load proxy metrics

These estimate how difficult the interface is to understand.

Proxies:

- Agent tool-call depth.
- Agent planning steps.
- Agent retries.
- User hesitations in manual sessions.
- Cursor wandering in observational data.
- Repeated inspection of the same element.
- Frequent opening of help or explanation panels.

If an intelligent agent struggles to achieve a simple goal, the interface likely imposes unnecessary cognitive load.

---

## 8.6 Accessibility metrics

- Keyboard-only completion rate.
- Screen-reader-only completion rate.
- Voice-only completion rate.
- Number of inaccessible controls.
- Number of focus traps.
- Number of missing accessible names.
- Number of contrast violations.
- Number of motion-related issues.

---

## 8.7 Safety metrics

- Number of blocked unsafe actions.
- Number of permission violations.
- Number of accidental publish attempts.
- Number of confirmation cancellations.
- Number of unsafe suggestions produced by agents.
- Number of audit log anomalies.

---

## 8.8 Stability metrics

- Test flake rate.
- Regression rate.
- Number of brittle locator failures.
- Number of false positives.
- Number of false negatives.
- Number of broken journeys after refactor.

---

# 9. Natural Language and Speech Control Design

The system should be controllable through natural language at every level.

---

## 9.1 Command model

Natural language commands should be mapped to structured intents.

Example:

```text
User says:
"Audit the publish flow for private notes."

System interprets:
{
  "action": "audit",
  "journey": "publishing",
  "constraints": {
    "privacy": "private"
  },
  "mode": "report-only"
}
```

---

## 9.2 Speech pipeline

The speech pipeline should include:

1. Audio capture.
2. Speech-to-text transcription.
3. Transcript normalization.
4. Intent parsing.
5. Confidence scoring.
6. Permission check.
7. Confirmation if needed.
8. Execution.
9. Visible and spoken feedback.
10. Error recovery.

---

## 9.3 Confirmation rules

The system must distinguish between safe and consequential actions.

### Safe actions

Examples:

- Run audit.
- Show findings.
- Compare metrics.
- Open view.
- Search notes.

These may proceed without destructive confirmation.

### Consequential actions

Examples:

- Publish.
- Delete.
- Merge ontology entities.
- Change identity.
- Grant permissions.
- Modify shared configuration.
- Apply code changes.
- Execute external actions.

These require explicit confirmation.

Confirmation should include:

- What will happen.
- What data is affected.
- Who can see it.
- How to cancel.
- Whether the action can be undone.

---

## 9.4 Misunderstanding recovery

When the system is uncertain, it should say:

> “I heard X. Did you mean Y?”

Not:

> Silently execute a guessed action.

Uncertain commands should default to:

- Report-only.
- Preview.
- Dry run.
- Explanation.
- Request for clarification.

---

## 9.5 Voice-first accessibility

Voice-first operation must not depend on visual feedback alone.

The system should provide:

- Spoken confirmation.
- Visible transcript.
- Clear listening indicator.
- Clear cancellation phrase.
- Repeatable last response.
- Non-visual navigation cues.
- Focus state announcement.

---

# 10. Prompt Optimization Architecture

Prompt optimization is not a separate AI project. It is part of UX ergonomics.

---

## 10.1 Prompt inventory

Create a registry of all prompts used by Notention.

Likely categories:

- Note summarization.
- Property extraction.
- Entity linking.
- Ontology suggestion.
- Conflict explanation.
- Search explanation.
- Chat assistance.
- Agent planning.
- Tool selection.
- Error explanation.
- Permission recommendation.

Each prompt entry should include:

- Prompt ID.
- Version.
- Purpose.
- Input schema.
- Output schema.
- Owner.
- Evaluation suite.
- Known failure modes.
- UI surface where it appears.
- Confidence policy.

---

## 10.2 Prompt tracing

Every prompt execution should produce a trace.

Trace contents:

- Prompt ID.
- Prompt version.
- Input data.
- Context selected.
- Model used.
- Output.
- Parsed result.
- Confidence.
- Acceptance state.
- User correction.
- Associated UI state.
- Related journey.

Privacy note:

Prompt traces must respect privacy rules and avoid leaking sensitive data into logs unless explicitly permitted.

---

## 10.3 Golden evaluation sets

Create curated evaluation sets for each prompt family.

Categories:

- Clean typed input.
- Noisy speech input.
- Ambiguous input.
- Conflicting input.
- Multilingual input where supported.
- Privacy-sensitive input.
- Invalid input.
- Adversarial input.
- Edge-case ontology structures.
- Missing context.

Each golden case should include:

- Input.
- Expected output.
- Acceptable alternatives.
- Forbidden outputs.
- Expected UI behavior.
- Expected confidence behavior.

---

## 10.4 Prompt experiments

Prompt changes should be tested as experiments.

Experiment contents:

- Baseline prompt.
- Candidate prompt.
- Evaluation set.
- Metrics.
- Side effects.
- UI impact.
- Recommendation.

A prompt change should not be accepted based only on linguistic quality. It must improve the full user journey.

---

## 10.5 Prompt-UI decision policy

When a prompt produces a result, the UI should respond according to confidence and risk.

### High confidence, low risk

- Apply silently.
- Show subtle confirmation.
- Provide undo.

### Medium confidence, low risk

- Show suggestion.
- Allow one-click acceptance.
- Allow easy dismissal.

### Low confidence, high risk

- Ask for clarification.
- Prevent silent application.
- Show explanation.
- Preserve original state.

### Invalid output

- Fail safely.
- Show helpful error.
- Do not corrupt data.
- Offer manual correction.

---

## 10.6 Prompt regression tests

Prompt changes must trigger:

- Golden set evaluation.
- Journey tests.
- Accessibility checks where UI changes.
- Privacy checks.
- Safety checks.
- Semantic state verification.

A prompt regression is a product regression.

---

# 11. Brittle-Resistant Testing Model

The system must remain stable as the UI evolves.

---

## 11.1 Primary assertion layers

Assertions should be ordered by durability:

1. Semantic state.
2. User intent completion.
3. Accessibility tree.
4. Component contracts.
5. Visible feedback.
6. Stable test IDs.
7. Visual appearance.

Visual appearance should be the least privileged assertion layer except where layout is the actual risk.

---

## 11.2 Stable UI contracts

Critical UI elements should expose stable contracts.

Examples:

- Primary save action.
- Publish confirmation.
- Property editor entry point.
- Search input.
- Error banner.
- Modal dialog.
- Accessibility landmarks.

These contracts should be preserved even when visual design changes.

---

## 11.3 Self-healing locators

If locators must be used, the system may propose repairs, but repairs must be reviewed.

A locator repair is acceptable only if:

- The semantic assertion still passes.
- The accessibility role is unchanged.
- The user intent is unchanged.
- No safety boundary is weakened.

Locator repair should never silently change the meaning of a test.

---

## 11.4 Contract tests for MCP tools

MCP tools should have contract tests verifying:

- Input schema.
- Output schema.
- Permission behavior.
- Error behavior.
- Idempotency where expected.
- Safety boundaries.

This protects both UI and agent workflows.

---

# 12. Generative and Adaptive UI Strategy

Notention may eventually use AI to adapt the interface to the user’s current intent.

This should be introduced carefully.

---

## 12.1 Stable anchors

Core interface elements must remain stable.

Stable anchors include:

- Primary navigation.
- Save action.
- Publish action.
- Search entry.
- Settings access.
- Help access.
- Confirmation dialogs.

These should not be dynamically repositioned.

---

## 12.2 Adaptive slots

Certain regions may adapt dynamically.

Examples:

- Property input helper.
- Suggestion panel.
- Explanation panel.
- Conflict resolution helper.
- Empty-state guidance.
- Search refinement helper.

Adaptive slots should:

- Be clearly bounded.
- Preserve layout stability.
- Avoid surprising the user.
- Provide manual fallback.
- Log what changed and why.

---

## 12.3 Just-in-time simplification

If the user struggles with a complex form, the system may offer a simpler natural-language path.

Example:

- User hesitates on constraint editor.
- System offers: “Describe what you want in plain language.”
- User speaks or types intent.
- System converts intent into structured constraint.
- User reviews result.

---

## 12.4 Confidence-driven presentation

The UI should use prompt confidence to decide how much to ask.

Goal:

- Reduce unnecessary questions.
- Prevent dangerous silent actions.
- Make corrections easy.
- Preserve trust.

---

## 12.5 Testing adaptive UI

Adaptive UI must be tested for:

- Stability.
- Predictability.
- Accessibility.
- Undoability.
- Explanation quality.
- Muscle-memory preservation.
- Failure recovery.

A dynamic UI is only acceptable if it remains understandable.

---

# 13. Simulator Integration

The simulator should become a core source of complex UX evidence.

---

## 13.1 Simulator scenario classes

Create scenario families for:

- Single-user capture.
- Multi-agent note creation.
- Concurrent property edits.
- Ontology conflict emergence.
- Permission denial.
- Network instability.
- Delayed relay synchronization.
- Privacy-sensitive publishing.
- Search under semantic ambiguity.
- Agent-initiated actions.

---

## 13.2 Simulator outputs

Each scenario should produce:

- Event log.
- Final semantic state.
- UI trace.
- Accessibility snapshots.
- Errors.
- Warnings.
- Metric snapshot.
- Recording or replay artifact.

---

## 13.3 Simulator-to-journey bridge

Important simulator discoveries should become journey tests.

Example:

If the simulator reveals that concurrent ontology edits create confusing conflict UI, the system should generate:

- A reproduction scenario.
- A journey test.
- A finding.
- A recommended UI or core fix.

---

# 14. Human Validation Loop

Automated systems cannot fully replace human judgment.

---

## 14.1 Human usability sessions

Use human sessions for:

- Major interaction changes.
- New mental models.
- Publishing and privacy changes.
- Ontology conflict resolution changes.
- Speech interaction patterns.
- Trust and safety perception.

Observe:

- Hesitation.
- Misunderstanding.
- Wrong assumptions.
- Recovery behavior.
- Emotional friction.
- Trust signals.
- Abandonment.

---

## 14.2 Observational friction mapping

Human session data should be converted into structured findings.

Signals:

- Cursor wandering.
- Repeated clicks.
- Long pauses.
- Backtracking.
- Error recovery.
- Verbal confusion.
- Request for help.
- Incorrect mental model statements.

AI may analyze this data, but human review should confirm priority.

---

## 14.3 Human-to-agent feedback loop

Human observations should feed the agent system.

Example:

> “Users did not understand why the publish button was disabled.”

The system should then:

- Inspect publish state.
- Check disabled-button explanation.
- Run related journeys.
- Propose an explanation improvement.
- Verify with accessibility and state tests.

---

# 15. Safety and Governance Model

Safety is a first-class architecture requirement.

---

## 15.1 Agent permission levels

Define levels:

### Level 0: Read-only

- Inspect UI.
- Read logs.
- View state.
- Produce findings.

### Level 1: Test-only

- Run journeys.
- Use synthetic data.
- Capture evidence.
- Operate sandbox app.

### Level 2: Proposal-only

- Propose patches.
- Propose prompt changes.
- Propose test additions.
- Cannot merge.

### Level 3: Supervised implementation

- Apply changes in isolated branch.
- Run tests.
- Request review.
- Requires human approval.

### Level 4: Trusted automation

- Apply narrowly scoped changes automatically.
- Still requires guardrails.
- Still requires audit log.
- Still reversible.

The system should begin at low levels and expand only after evidence supports trust.

---

## 15.2 Consequential action policy

Consequential actions require:

- Explicit confirmation.
- Clear preview.
- Reversible path where possible.
- Audit record.
- Safe failure mode.

Examples:

- Publishing.
- Deleting.
- Merging.
- Identity changes.
- Permission grants.
- External messages.
- Code merges.

---

## 15.3 Isolation requirements

The optimization environment should use:

- Separate test app instance.
- Disposable synthetic workspace.
- Disposable identities.
- Local relay or sandbox network.
- No production credentials.
- No real external publishing by default.
- Restricted filesystem access.
- Restricted repository access.
- Scoped branch permissions.

---

## 15.4 Auditability

Every agent action should be logged.

Audit log should include:

- Actor.
- Intent.
- Command source.
- Tools used.
- Data touched.
- Files changed.
- Tests run.
- Evidence produced.
- Approvals.
- Rejections.
- Final outcome.

---

# 16. Development Workstreams

The plan is organized into workstreams rather than isolated tasks.

---

## Workstream A: Baseline UX Evaluation Harness

### Objective

Create a minimal but reliable audit harness.

### Deliverables

- MCP connection to Notention domain tools.
- Playwright browser control wrapper.
- Evidence capture system.
- Synthetic data seeding.
- Report-only audit runner.
- First core journey: capture → semantic editing → save → reopen.

### Acceptance criteria

- The harness can seed a workspace.
- It can run the journey.
- It can capture screenshots.
- It can capture accessibility tree.
- It can capture semantic state.
- It can produce a structured report.
- It does not modify application code.

---

## Workstream B: Intent-Based Journey Framework

### Objective

Make tests resilient and semantic.

### Deliverables

- Journey definition format.
- Intent-to-action mapping.
- Semantic assertions.
- Stable state inspection.
- Recovery checks.
- Journey registry.

### Acceptance criteria

- Journeys express user goals.
- Journeys survive reasonable UI refactors.
- Failures produce evidence.
- Semantic state is verified.
- Journeys are reusable across audits.

---

## Workstream C: Accessibility and Sensory Deprivation Testing

### Objective

Ensure inclusive operation.

### Deliverables

- Accessibility snapshot capture.
- Keyboard-only runner.
- Screen-reader-only simulation.
- Voice-only command path.
- Sensory deprivation mode.
- Accessibility finding schema.

### Acceptance criteria

- Core journeys can run keyboard-only.
- Accessibility tree is inspectable.
- Missing accessible names are detected.
- Focus order issues are reported.
- Voice-only failures are reproducible.

---

## Workstream D: Prompt Optimization Lab

### Objective

Treat prompts as testable product components.

### Deliverables

- Prompt registry.
- Prompt tracing.
- Golden evaluation sets.
- Prompt experiment runner.
- Prompt regression suite.
- Prompt-UI confidence policy.

### Acceptance criteria

- Every major prompt has an ID and version.
- Prompt changes can be evaluated automatically.
- Prompt failures are linked to UI behavior.
- Low-confidence outputs trigger safe UI treatment.
- Prompt regressions block unsafe changes.

---

## Workstream E: Speech and Natural Language Control

### Objective

Make the optimization process controllable by natural language and speech.

### Deliverables

- Command intent schema.
- Natural language parser.
- Speech transcript pipeline.
- Confirmation flow.
- Command audit log.
- Spoken and visible feedback.

### Acceptance criteria

- A user can start an audit by speech or text.
- The system confirms interpreted intent.
- Consequential actions require confirmation.
- Misunderstood commands fail safely.
- Commands are logged and replayable.

---

## Workstream F: Component Ergonomics Workbench

### Objective

Improve complex reusable components in isolation.

### Deliverables

- Storybook or equivalent component workbench.
- States for priority components.
- Component accessibility tests.
- Component interaction tests.
- Component documentation.

### Priority components

- Property block.
- Property value input.
- Operator dropdown.
- Extraction review.
- Ontology conflicts.
- Privacy confirmation modal.
- Empty states.
- Error banners.

### Acceptance criteria

- Components can be tested in all major states.
- Accessibility violations are caught early.
- Component changes are verified before E2E impact.
- Documentation reflects actual behavior.

---

## Workstream G: Simulator-to-UX Evidence Pipeline

### Objective

Use the simulator to expose complex behavior and UI consequences.

### Deliverables

- Scenario runner integration.
- UI observation during simulation.
- Event-to-finding conversion.
- Replay artifacts.
- Complex behavior metrics.

### Acceptance criteria

- Simulator can run multi-agent scenarios.
- UI state can be inspected during scenarios.
- Conflicts and failures produce evidence.
- Important discoveries become journey tests.
- Simulator results are reviewable.

---

## Workstream H: Bounded Implementation Pipeline

### Objective

Allow agents to make safe improvements.

### Deliverables

- Patch proposal format.
- Isolated branch or worktree workflow.
- Regression test requirement.
- Verification agent review.
- Human approval gate.
- Rollback mechanism.

### Acceptance criteria

- Agents cannot edit outside approved scope.
- Every patch includes tests.
- Verification is independent.
- Failed verification blocks merge.
- All changes are auditable.

---

## Workstream I: App-as-IDE Control Loop

### Objective

Allow Notention itself to direct parts of its optimization process.

### Deliverables

- Chat-based director interface.
- Natural language command execution.
- Evidence display inside the app.
- Proposal review UI.
- Approval and rejection flows.
- Audit history view.

### Acceptance criteria

- A user can request an audit from within Notention.
- Findings appear in a reviewable format.
- Evidence is accessible.
- Destructive actions require confirmation.
- The loop remains safe and auditable.

---

## Workstream J: Continuous Knowledge System

### Objective

Ensure the system learns from every cycle.

### Deliverables

- Findings database.
- Decision records.
- Metric baselines.
- Regression suite growth.
- Prompt evaluation growth.
- Journey registry growth.

### Acceptance criteria

- Every accepted fix adds verification.
- Findings are searchable.
- Metrics can be compared across versions.
- Past decisions are discoverable.
- The backlog remains structured.

---

# 17. Core Workflow Loop

The full optimization cycle should follow this loop.

---

## 17.1 Command

A human or scheduled system issues a natural language goal.

Example:

> “Audit property editing for noisy speech input.”

---

## 17.2 Interpretation

The Director converts the request into a bounded plan.

Example:

- Select journey: capture and editing.
- Use noisy speech transcript set.
- Run report-only audit.
- Capture prompt traces.
- Capture accessibility state.
- Compare semantic outcomes.

---

## 17.3 Scenario setup

The system creates a reproducible environment.

- Synthetic workspace.
- Seeded notes.
- Test identity.
- Isolated relay.
- Prompt versions pinned.
- App version pinned.

---

## 17.4 Exploration

Agents execute the journey.

They may use:

- Browser actions.
- MCP domain tools.
- Semantic state inspection.
- Accessibility inspection.
- Prompt tracing.
- Screenshot capture.

---

## 17.5 Evidence collection

The system stores:

- Trace.
- Screenshots.
- Accessibility tree.
- Semantic state.
- Prompt logs.
- Errors.
- Metrics.

---

## 17.6 Finding generation

The audit agent produces structured findings.

Each finding includes:

- Location.
- Evidence.
- Severity.
- Confidence.
- Reproduction.
- Proposed verification.

---

## 17.7 Prioritization

The Director or human selects the next improvement based on:

- Safety impact.
- Accessibility impact.
- Frequency.
- Severity.
- Confidence.
- Scope.
- Regression risk.

---

## 17.8 Implementation

If approved, the implementation agent makes the smallest coherent change.

Possible changes:

- UI adjustment.
- Prompt adjustment.
- Validation improvement.
- Error message improvement.
- Accessibility fix.
- State explanation improvement.
- New test.

---

## 17.9 Verification

The verification agent independently checks:

- Original issue is reproduced before fix.
- Fix resolves issue.
- No regressions.
- Accessibility unchanged or improved.
- Prompt behavior unchanged or improved.
- Safety boundaries intact.

---

## 17.10 Comparison

The system compares before and after:

- Completion rate.
- Action count.
- Error rate.
- Semantic friction.
- Prompt correction rate.
- Accessibility barriers.
- Safety events.

---

## 17.11 Documentation

The system records:

- What was found.
- Why it mattered.
- What changed.
- How it was verified.
- What remains uncertain.

---

## 17.12 Learning

The improvement becomes permanent infrastructure:

- New regression test.
- New journey.
- New prompt eval.
- New simulator scenario.
- New metric.
- New decision record.

---

# 18. Implementation Stages

These stages define progression without time estimates.

---

## Stage 1: Report-Only Baseline

### Goal

Establish a safe evidence loop.

### Work

- Connect MCP tools.
- Connect Playwright tools.
- Seed synthetic data.
- Run one core journey.
- Capture evidence.
- Produce findings without code changes.

### Exit criteria

- One journey can be audited reproducibly.
- Evidence is structured.
- Semantic state is inspectable.
- No unsafe actions occur.

---

## Stage 2: Journey Expansion

### Goal

Cover core product workflows.

### Work

- Add capture and editing journeys.
- Add search journeys.
- Add navigation journeys.
- Add ontology refinement journeys.
- Add publishing safety journeys.
- Add accessibility checks.

### Exit criteria

- Core journeys are replayable.
- Accessibility snapshots are captured.
- Failures are evidence-backed.
- Metrics are comparable.

---

## Stage 3: Prompt and Speech Integration

### Goal

Bring LM behavior and natural language control into the loop.

### Work

- Build prompt registry.
- Add prompt tracing.
- Create golden prompt evaluation sets.
- Add noisy speech transcript tests.
- Add natural language command parser.
- Add confirmation flows.

### Exit criteria

- Prompt changes can be evaluated.
- Speech-like input can be tested.
- Natural language commands can trigger audits.
- Consequential actions are gated.

---

## Stage 4: Bounded Improvement

### Goal

Allow agents to propose and verify fixes.

### Work

- Create patch proposal workflow.
- Isolate branches.
- Require regression tests.
- Add independent verification.
- Add human approval.

### Exit criteria

- Agents can propose safe fixes.
- Fixes include tests.
- Verification is independent.
- Rollback is possible.

---

## Stage 5: App-as-IDE Loop

### Goal

Allow the process to be controlled from within Notention.

### Work

- Add director chat interface.
- Show findings in-app.
- Show evidence in-app.
- Add approval controls.
- Add audit history.

### Exit criteria

- Natural language commands can be issued inside Notention.
- Findings are reviewable inside Notention.
- Evidence is attached.
- Safety controls are enforced.

---

## Stage 6: Adaptive UI and Continuous Learning

### Goal

Enable adaptive, self-improving behavior under strict governance.

### Work

- Introduce adaptive UI slots.
- Add confidence-driven presentation.
- Expand simulator scenarios.
- Expand prompt experiments.
- Expand human feedback ingestion.
- Refine metrics.

### Exit criteria

- Adaptive UI remains stable and accessible.
- Prompt and UI changes are co-verified.
- Human feedback directly informs backlog.
- The system preserves safety and reversibility.

---

# 19. Definition of Complete

The architecture is complete when the following conditions are true.

---

## 19.1 Natural language control works

A user can say:

> “Audit the publish workflow for private notes.”

and the system can:

- Interpret the request.
- Run the audit.
- Produce evidence.
- Explain findings.
- Recommend action.

---

## 19.2 Speech control works safely

A user can issue a speech command and the system can:

- Show transcript.
- Confirm intent.
- Execute safely.
- Require confirmation for consequential actions.
- Recover from misunderstanding.

---

## 19.3 Tests are brittle-resistant

Journey tests continue to pass after reasonable UI refactors if:

- User intent is preserved.
- Semantic state is correct.
- Accessibility is preserved.
- Safety boundaries are preserved.

---

## 19.4 Prompt optimization is integrated

Prompt changes are:

- Versioned.
- Traced.
- Evaluated.
- Linked to UI behavior.
- Regression-tested.
- Reviewed like code changes.

---

## 19.5 Evidence is standard

No finding is accepted without:

- Reproduction.
- Evidence bundle.
- Severity.
- Confidence.
- Verification path.

---

## 19.6 Safety is enforced

The system prevents:

- Accidental publishing.
- Unauthorized external actions.
- Unsafe agent edits.
- Data corruption.
- Silent destructive operations.
- Permission bypass.

---

## 19.7 Accessibility is continuous

Every major journey is testable:

- Keyboard-only.
- Screen-reader-only.
- Voice-only.
- Reduced-motion.
- High-contrast.
- Responsive layouts.

---

## 19.8 Human feedback is integrated

Human observations can be converted into:

- Findings.
- Metrics.
- Tests.
- Design decisions.
- Prompt changes.

---

## 19.9 The system learns

Every accepted improvement produces:

- Regression coverage.
- Documentation.
- Metric comparison.
- Reusable knowledge.

---

# 20. Risk Register and Mitigations

---

## Risk 1: AI hallucinates UX findings

### Impact

Wasted work, false priorities, unstable product.

### Mitigation

- Require reproduction.
- Require evidence bundle.
- Use deterministic journey tests.
- Use independent verification.
- Keep audit agent report-only initially.

---

## Risk 2: Tests become brittle again

### Impact

Maintenance burden, false confidence, resistance to refactoring.

### Mitigation

- Assert semantic state first.
- Use intent-level journeys.
- Use accessibility tree.
- Minimize selector dependence.
- Review locator changes carefully.

---

## Risk 3: Prompt changes silently degrade UX

### Impact

Users experience worse extraction, matching, or explanation without obvious UI bug.

### Mitigation

- Prompt registry.
- Prompt tracing.
- Golden evaluation sets.
- Prompt regression suite.
- Prompt-UI confidence policy.

---

## Risk 4: Speech commands cause unsafe actions

### Impact

Accidental publishing, deletion, or permission changes.

### Mitigation

- Consequential action confirmation.
- Dry-run mode.
- Explicit preview.
- Command audit log.
- Default safe interpretation.

---

## Risk 5: Adaptive UI destroys muscle memory

### Impact

Users feel disoriented.

### Mitigation

- Stable anchors.
- Limited adaptive slots.
- Explanation of changes.
- Manual fallback.
- User preference controls.

---

## Risk 6: Agents overstep scope

### Impact

Unintended code changes, broken builds, security issues.

### Mitigation

- Bounded agent roles.
- Scoped permissions.
- Isolated branches.
- Human approval.
- Audit logs.
- Automatic halt.

---

## Risk 7: Metrics become vanity metrics

### Impact

Optimizing numbers without improving experience.

### Mitigation

- Pair metrics with evidence.
- Include human validation.
- Track recovery and clarity, not only speed.
- Separate observed defects from speculative ideas.

---

# 21. Final Architecture Summary

The final self-comprehensive optimization architecture consists of:

1. **A natural language and speech control plane**  
   Allows the entire process to be directed conversationally.

2. **A bounded agent system**  
   Separates audit, prompt evaluation, implementation, verification, and human feedback.

3. **An MCP-based tool plane**  
   Provides safe access to Notention, browser automation, evaluation, repository, and safety systems.

4. **A semantic observation layer**  
   Exposes application state, prompt traces, and action traces for evidence-based analysis.

5. **A layered testing system**  
   Combines intent journeys, Playwright, Storybook, simulator, accessibility, prompt evaluation, speech chaos tests, visual checks, and safety tests.

6. **A prompt optimization lab**  
   Treats prompts as versioned, testable product components connected to UI behavior.

7. **A safety and governance plane**  
   Enforces permissions, confirmations, isolation, auditability, and rollback.

8. **A knowledge plane**  
   Converts every finding and fix into durable regression coverage and product understanding.

9. **A human validation loop**  
   Ensures real users confirm that the experience has actually improved.

10. **A continuous learning cycle**  
   Ensures every improvement makes future improvement easier, safer, and more reliable.

---

# 22. Final Statement of Intent

The ideal Notention optimization architecture is not merely a test suite.

It is a self-reinforcing product intelligence system in which:

- Users can speak their intent.
- Agents safely investigate.
- Evidence replaces speculation.
- Prompts and interface evolve together.
- Accessibility is continuously verified.
- Safety remains non-negotiable.
- Every improvement becomes permanent protection.
- Humans remain the final judges of quality.

When complete, the system should make it natural to say:

> “Improve this workflow, prove it is better, and teach the product not to regress.”

and have Notention safely do exactly that.

