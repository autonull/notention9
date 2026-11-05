/**
 * @notention/conformance - Protocol conformance and simulator regression test suite
 * 
 * This package provides standalone tests for verifying Notention protocol compliance
 * and simulator regression baselines.
 * 
 * Tests included:
 * - ProtocolTestbed: Protocol-level tests (key generation, signing, CBOR, NIP-01)
 * - SimulatorRegression: Statistical baseline tests for the regression scenario
 * 
 * Usage:
 * ```bash
 * # Run all conformance tests
 * pnpm --filter @notention/conformance test
 * 
 * # Run specific test file
 * pnpm --filter @notention/conformance test ProtocolTestbed
 * ```
 */

// Re-export scenarios for use in custom test suites
export { RegressionScenario } from './scenarios/regression.js';
export type { Scenario, AgentConfig, Property, EventConfig } from '@notention/simulator';