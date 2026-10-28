# Workstream C: Accessibility and Sensory Deprivation Testing

## Objective
Ensure inclusive operation by adding accessibility testing capabilities to the optimization loop.

## Deliverables

1. **Accessibility Snapshot Capture** - Capture full accessibility tree at journey steps
2. **Keyboard-Only Runner** - Execute journeys using only keyboard navigation
3. **Screen-Reader-Only Simulation** - Run journeys with screen reader virtual cursor
4. **Voice-Only Command Path** - Execute commands via speech/voice without visual feedback
5. **Sensory Deprivation Mode** - Test with reduced sensory input (no visual, limited audio)
6. **Accessibility Finding Schema** - Structured findings for a11y violations

## Acceptance Criteria
- [x] Core journeys can run keyboard-only
- [x] Accessibility tree is inspectable at any step
- [x] Missing accessible names are detected automatically
- [ ] Focus order issues are reported
- [ ] Voice-only failures are reproducible

## Implementation Plan

### Phase 1: Accessibility Snapshot Capture (Foundation) ✅
- [x] Add `captureAria` step kind to journey framework
- [x] Integrate with Playwright's `accessibility.snapshot()` API
- [x] Store ARIA snapshots in evidence bundle
- [x] Add ARIA snapshot comparison/assertion capability

### Phase 2: Keyboard-Only Runner ✅
- [x] Add `keyboardOnly` journey execution mode
- [x] Replace click/fill actions with keyboard equivalents (Tab, Enter, Space, Arrow keys)
- [x] Add focus tracking and assertions (`assertFocus`, `assertAccessibleName`, `assertRole`)
- [x] Create keyboard-only variant of `capture-and-edit` journey

### Phase 3: Screen-Reader-Only Simulation
- [ ] Add `screenReaderOnly` execution mode
- [ ] Use Playwright's accessibility tree with virtual cursor navigation
- [ ] Verify accessible names, roles, states at each step
- [ ] Detect missing labels, incorrect roles, broken landmarks

### Phase 4: Voice-Only Command Path
- [ ] Define voice command schema for journey steps
- [ ] Add speech synthesis for feedback (or text-to-speech mock)
- [ ] Create voice-only variant of journeys
- [ ] Test command interpretation without visual confirmation

### Phase 5: Sensory Deprivation Mode
- [ ] Add `sensoryDeprivation` execution mode
- [ ] Disable visual rendering (headless + no screenshots)
- [ ] Limit to audio/text feedback only
- [ ] Verify journeys complete without visual cues

### Phase 6: Accessibility Finding Schema ✅
- [x] Define structured finding types for a11y violations
- [x] Auto-detect common issues: missing labels, focus traps, contrast, landmarks
- [x] Integrate with evidence bundle reporter
- [x] Add a11y findings to CLI `findings` command with `--a11y` and `--json` flags

## Technical Approach

### Journey Step Extensions
```typescript
// New step kinds
{ kind: 'captureAria', label: string }
{ kind: 'assertAria', target: Target, snapshot: string }
{ kind: 'assertFocus', target: Target }
{ kind: 'assertAccessibleName', target: Target, expected: string }

// Execution modes
type ExecutionMode = 'normal' | 'keyboardOnly' | 'screenReaderOnly' | 'voiceOnly' | 'sensoryDeprivation';
```

### Playwright Integration
- `page.accessibility.snapshot()` for tree capture
- `page.keyboard.press()` for keyboard navigation
- `locator.focus()` + `page.keyboard` for screen reader simulation
- Custom accessibility selectors via `page.getByRole()`, `page.getByLabel()`

### Evidence Bundle Extensions
- ARIA snapshots stored as YAML/JSON
- Focus order traces
- Accessible name audit results
- Contrast check results (via axe-core or similar)

## Files to Create/Modify

### Core optimize package
- `optimize/src/journey.ts` - Add new step kinds
- `optimize/src/steps.ts` - Implement accessibility step executors
- `optimize/src/execute.ts` - Add execution mode support
- `optimize/src/evidence.ts` - Extend evidence bundle with a11y data
- `optimize/src/journeys.ts` - Add keyboard/screen-reader/voice variants

### UI test support
- `ui/test/support/accessibility.ts` - A11y helpers for Playwright tests
- `ui/test/optimize/keyboard-only.journey.ts` - Keyboard-only journey test
- `ui/test/optimize/screen-reader.journey.ts` - Screen reader journey test

### CLI
- `cli/src/commands/AccessibilityCommand.ts` - Run a11y audits
- Update optimize CLI to support execution modes

## Dependencies
- `@axe-core/playwright` for automated a11y scanning (optional)
- Existing Playwright setup in `@notention/ui`

## Testing Strategy
- Unit tests for step executors
- Integration tests for each execution mode
- Regression: ensure normal journeys still pass
- Accessibility: run axe-core on captured snapshots