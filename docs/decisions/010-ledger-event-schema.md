# Decision 010: Ledger Event Schema

**Status:** Proposed
**Date:** 2026-10-31
**Author:** System

## Context

The ledger is an **append-only** record of every evaluation lifecycle event. It enables:
- Full replay of any evaluation run
- Audit trail for compliance
- Debugging: "what happened during run X?"
- Metrics aggregation without re-running

## Schema

```typescript
interface LedgerEvent {
    // Identity
    id: string;                    // ULID
    type: LedgerEventType;
    
    // Correlation
    runId: string;                 // groups events for one evaluation run
    caseId?: string;               // which case (if applicable)
    revisionId?: string;           // which revision (if applicable)
    evaluationId?: string;         // which evaluation (if applicable)
    
    // Actor
    actor: 'system' | 'human' | 'model';
    userId?: string;               // if actor === 'human'
    modelId?: string;              // if actor === 'model'
    
    // Payload (varies by type)
    payload: LedgerPayload;
    
    // Metadata
    timestamp: string;             // ISO timestamp, monotonic within run
    durationMs?: number;           // for timed operations
    hash?: string;                 // content hash of payload for tamper evidence
}

type LedgerEventType =
    // Run lifecycle
    | 'run:started'
    | 'run:completed'
    | 'run:failed'
    
    // Case execution
    | 'case:started'
    | 'case:completed'
    | 'case:failed'
    | 'case:skipped'
    
    // Strategy resolution
    | 'strategy:resolved'
    | 'strategy:rendered'
    
    // Evaluation
    | 'verdict:computed'
    | 'gate:evaluated'
    
    // Revision lifecycle
    | 'revision:created'
    | 'revision:evaluated'
    | 'revision:consented'
    | 'revision:activated'
    | 'revision:rolled-back'
    | 'revision:superseded'
    | 'revision:rejected'
    
    // Human interaction
    | 'consent:requested'
    | 'consent:granted'
    | 'consent:denied';

type LedgerPayload =
    | { type: 'run:started'; config: RunConfig; caseIds: string[] }
    | { type: 'run:completed'; summary: RunSummary }
    | { type: 'run:failed'; error: string }
    | { type: 'case:started'; caseId: string; strategyId: string }
    | { type: 'case:completed'; caseId: string; verdict: Verdict; durationMs: number }
    | { type: 'case:failed'; caseId: string; error: string }
    | { type: 'case:skipped'; caseId: string; reason: string }
    | { type: 'strategy:resolved'; seamRole: SeamRole; strategyId: string; reason: ResolutionReason; params: Record<string, unknown> }
    | { type: 'strategy:rendered'; seamRole: SeamRole; strategyId: string; outputHash: string }
    | { type: 'verdict:computed'; caseId: string; verdict: Verdict; details: VerdictDetail[] }
    | { type: 'gate:evaluated'; gate: 'must-win' | 'eslint' | 'schema'; passed: boolean; details: string }
    | { type: 'revision:created'; revision: Revision }
    | { type: 'revision:evaluated'; revisionId: string; evaluationId: string; verdict: 'pass' | 'fail' | 'inconclusive' }
    | { type: 'revision:consented'; revisionId: string; userId: string }
    | { type: 'revision:activated'; revisionId: string; previousRevisionId?: string }
    | { type: 'revision:rolled-back'; revisionId: string; reason: string; rolledBackToRevisionId?: string }
    | { type: 'revision:superseded'; revisionId: string; supersededByRevisionId: string }
    | { type: 'revision:rejected'; revisionId: string; reason: string }
    | { type: 'consent:requested'; revisionId: string; userId: string }
    | { type: 'consent:granted'; revisionId: string; userId: string }
    | { type: 'consent:denied'; revisionId: string; userId: string; reason: string };
```

## Storage

- **Format**: JSONL (one event per line) at `data/ledger.jsonl`
- **Rotation**: Daily files `data/ledger-YYYY-MM-DD.jsonl` + symlink `ledger.jsonl` → latest
- **Index**: SQLite sidecar `data/ledger.idx` for fast queries (runId, caseId, revisionId, type)
- **Retention**: 90 days default; `pnpm ledger:prune --days 30`

## Replay

```bash
# Reconstruct run state
pnpm ledger:replay --runId <id> > run-state.json

# Audit revision history
pnpm ledger:query --type revision:activated --since 2026-10-01
```

## Consequences

- **Positive**: Complete observability; enables time-travel debugging; tamper-evident
- **Negative**: Storage growth (~1KB/event × 1000 events/day = ~1MB/day); mitigated by rotation/pruning
- **Migration**: New system; replaces corrupt `adoption-ledger.jsonl`