# @notention/optimize

Optimization loop workspace: journey registry, evidence bundles, deterministic findings, and CLI control surface.

## Structure

```
src/
├── index.ts              # Public exports
├── journey.ts            # JourneySpec, Step types + Zod schemas
├── registry.ts           # Journey catalogue (source of NL aliases)
├── steps.ts              # Target → Playwright locator resolver
├── execute.ts            # Step interpreter with auto-wait + timing
├── evidence.ts           # EvidenceBundle + writer
├── finding.ts            # deriveFindings (pure rule table)
├── reporter.ts           # Playwright reporter (assembles bundle)
├── replay.ts             # loadBundle + planReplay
├── policy.ts             # SideEffect, CONSEQUENTIAL, Guardrail
├── cli.ts                # pnpm optimize entry point
├── prompts/
│   ├── evaluate.ts       # Provider-injectable golden set evaluation
│   └── property-extraction.golden.json
└── mcp/
    └── client.ts         # MCP contract test client
```

## Journey Authoring

Journeys are declarative, serializable, and replayable. Registry specs live in
`optimize/src/journeys.ts`; each has a thin Playwright wrapper in
`ui/test/optimize/*.journey.ts` that calls `runJourneyTest(id)`.

Registered (registry-backed, UISG-linked):

| Journey | Intent |
|---------|--------|
| `capture-and-edit` | capture a note and edit its properties |
| `capture-and-edit-keyboard` | same, keyboard only |
| `capture-and-edit-palette` | same, via command and property palettes |
| `golden-path` | first-run request + offer, explained match |
| `publish-gate` | private publish requires confirmation; cancel keeps privacy |
| `ontology-conflict` | conflicting capacity value is detected |

Standalone specs (not registry journeys, not UISG flows):

| Spec | Runs when | Purpose |
|------|-----------|---------|
| `mcp-contract.journey.ts` | `NOTENTION_MCP_URL` is set | MCP tool inventory + policy gating |
| `replay.journey.ts` | invoked directly | replay a recorded bundle |

`knownJourneys.ts` is a thin adapter over the registry; do not add specs there.

### Step Kinds

| Kind | Purpose |
|------|---------|
| `seed` | Write notes/settings to IndexedDB before navigation |
| `navigate` | Hash route change (`#notes/...`) |
| `act` | Click, fill, or press on an accessible target |
| `assertAria` | `expect(locator).toMatchAriaSnapshot()` |
| `assertState` | Semantic state assertion via `window.__NOTENTION__.state()` |
| `assertNoConsoleErrors` | Fail if any console errors occurred |
| `capture` | Screenshot + ariaSnapshot + state snapshot |

### Target Resolution

`act` and `assertAria` accept only:
- `{ role: AriaRole; name: string }` — accessible role + name
- `{ testId: string }` — `data-testid`
- `{ label: string }` — associated label

CSS classes, text fragments, and XPath are **not** representable. The type system enforces this.

## Replay

```bash
pnpm optimize --replay <runId>
```

Re-executes the journey at its recorded version with the same seed.

## Report-Only Semantics

`NOTENTION_REPORT_ONLY=1` (default for optimize runs):
- Blocks all MCP tools with `sideEffect: 'write' | 'consequential'`
- Allows `read` tools
- Browser context is disposable (fresh per journey)
- No writes outside `doc/evidence/` and `getNotentionDir()`

## Locator Check

```bash
pnpm optimize:check
```

Fails if `optimize/` or `ui/test/optimize/` contains `locator('.` or `page.accessibility` (enforces AD-4 + §11.1).