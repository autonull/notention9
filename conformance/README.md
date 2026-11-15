# @notention/conformance

**Notention Protocol Conformance & Simulator Regression Test Suite**

This package provides standalone tests for verifying Notention protocol compliance and simulator regression baselines. Extracted from the main codebase as a public conformance artifact (TODO.14 D4).

## Tests Included

### ProtocolTestbed (`test/ProtocolTestbed.test.ts`)
Protocol-level tests verifying:
- Protocol version export
- Key generation for simulator agents (uniqueness, secp256k1 validity)
- Event signing (different agents, deterministic NoteIDs)
- CBOR encoding/decoding for network transport (Nostr relay interop)
- NoteID verification for deduplication
- Event validation (well-formed, malformed, invalid signatures)
- Nostr protocol compliance (NIP-01 serialization, Schnorr signatures)

### SimulatorRegression (`test/SimulatorRegression.test.ts`)
Statistical baseline tests for the regression scenario:
- Structural validity (scenario structure, agent configs, properties, interests, events)
- Statistical baselines (B2.5): match counts within confidence interval
- 30 repetitions in fast mode asserting exactly 1 match per run
- Time-to-first-match measurement
- `match:found` event structure verification
- Zero errors in clean run
- Scenario duration compliance

### Regression Scenario (`src/scenarios/regression.ts`)
Deterministic scenario for CI verification:
- 1 RegressRequester (role: developer, skills: react/typescript, location: Berlin)
- 1 RegressOfferer (job: developer, budget: 500, remote: true, skills: react/typescript, location: Berlin)
- 2 events: publish_job at 1s, publish_offer at 3s
- Duration: 8s, tags: regression, smoke

## Running Tests

### Prerequisites
```bash
# From repo root
pnpm install
pnpm --filter @notention/core build
pnpm --filter @notention/simulator build  # Note: UI build has pre-existing issues
```

### Run All Tests
```bash
pnpm --filter @notention/conformance test
```

### Run Specific Test File
```bash
pnpm --filter @notention/conformance test ProtocolTestbed
pnpm --filter @notention/conformance test SimulatorRegression
```

### Watch Mode
```bash
pnpm --filter @notention/conformance test:watch
```

## Known Issues (Pre-existing)

1. **Simulator UI Build**: The `@notention/simulator` package has JSX syntax errors in its UI components that prevent `pnpm build` from completing. The TypeScript compilation (`tsc`) passes, but the Vite UI build fails.

2. **Core Package Source Imports**: Vitest tests that import from `@notention/core` source (via path aliases) encounter issues with missing runtime files (e.g., `BaseStrategy.js` in source tree).

### Workarounds
- Run tests against built packages: Ensure `@notention/core` is built, and use the built `@notention/simulator` dist (TypeScript only)
- For full test runs, temporarily fix simulator UI build issues or use `tsc` only

## Version

**v0.1.0** - Initial conformance artifact extraction (TODO.14 D4)

## License

MIT