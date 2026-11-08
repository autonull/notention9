# Decision 007: Resolution Spine Architecture

**Status:** Proposed
**Date:** 2026-10-31
**Author:** System

## Context

The current `ProfileRegistry.resolveStrategy(userId, seamRole, strategyRegistry)` returns a `Strategy` object directly. However, the evaluation/improvement pipeline needs:
- **Provenance**: *why* was this strategy chosen? (override, experiment, policy, default)
- **Parameters**: resolved default props + user overrides + experiment config
- **Traceability**: ability to replay a resolution decision

Two architectural options exist:

### Option A: Extend ProfileRegistry (Recommended)
Add a new return type `ResolvedStrategy` that wraps the `Strategy` with metadata, while keeping the resolution pipeline inside `ProfileRegistry`.

```typescript
interface ResolvedStrategy<P extends object = Record<string, unknown>> {
    strategy: Strategy<P>;
    reason: ResolutionReason;
    resolvedParams: P;
    resolvedAt: string;
    userId: string;
    seamRole: SeamRole;
}

type ResolutionReason =
    | { kind: 'override'; strategyId: string }
    | { kind: 'experiment'; experimentId: string; variantId: string }
    | { kind: 'manual-profile'; profileId: string }
    | { kind: 'policy'; policyId: string; ruleId: string }
    | { kind: 'default-profile'; profileId: string }
    | { kind: 'fallback'; seamId: string };
```

### Option B: Direct RevisionStore → Renderer
Bypass `ProfileRegistry` entirely. `RevisionStore` holds the active revision for each seam role; renderer reads directly. Simpler but loses:
- Experiment assignments
- Policy-based auto-selection
- User overrides system

## Decision

**Choose Option A: Extend ProfileRegistry.**

Rationale:
1. Existing pipeline (overrides → experiment → manual → policy → default → fallback) is correct and battle-tested
2. `ResolvedStrategy` is a pure additive wrapper — zero breaking changes to consumers
3. Keeps single resolution authority; renderer stays dumb
4. Enables `RevisionStore` to record *which* `ResolvedStrategy` was active for a revision

## Implementation Plan

1. Add `ResolvedStrategy` type to `core/src/ui/profileTypes.ts`
2. Add `resolveStrategyWithMeta(userId, seamRole, strategyRegistry): ResolvedStrategy` to `ProfileRegistry`
3. Keep existing `resolveStrategy` for backward compatibility (delegates to new method)
4. Update `useStrategyResolver` hook to return `ResolvedStrategy`
5. Add unit tests for each `ResolutionReason` kind (5-layer precedence)

## Consequences

- **Positive**: Single source of truth for resolution logic; full traceability; enables revision ledger
- **Negative**: Slightly larger return object; consumers must migrate to `ResolvedStrategy` for metadata
- **Migration**: `useStrategyResolver` can return `ResolvedStrategy` immediately; UI components access `.strategy` for rendering