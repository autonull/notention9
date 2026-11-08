# Decision 008: Revision Schema

**Status:** Proposed
**Date:** 2026-10-31
**Author:** System

## Context

A "revision" is an immutable, versioned record of a strategy change proposal that can be evaluated, consented, activated, and rolled back. The schema must support:
- Human-authored (T4) and model-synthesized (T1/T2) strategies
- Full provenance chain
- Evaluation results linkage
- Consent tracking
- Activation state machine

## Schema

```typescript
interface Revision {
    // Identity
    id: string;                    // ULID: rev_<timestamp>_<random>
    seamRole: SeamRole;            // 'capture' | 'elicit' | 'match' | 'layout' | ...
    
    // Strategy definition (inline, self-contained)
    strategy: StrategyArtifact;    // see strategy.ts:StrategyArtifact
    
    // Provenance
    author: 'human' | 'model';
    model?: string;                // if author === 'model'
    promptHash?: string;           // if model-authored
    parentRevisionId?: string;     // for iterative improvements
    
    // Evaluation linkage
    evaluationId?: string;         // links to eval/runs/<id>/verdict.json
    verdict?: 'pass' | 'fail' | 'inconclusive'; // cached for quick filtering
    
    // Consent & activation
    status: RevisionStatus;
    consentedBy?: string;          // userId who consented
    consentedAt?: string;          // ISO timestamp
    activatedAt?: string;          // ISO timestamp
    rolledBackAt?: string;         // ISO timestamp
    rollbackReason?: string;
    
    // Metadata
    createdAt: string;             // ISO timestamp
    updatedAt: string;             // ISO timestamp
    tags?: string[];               // e.g., ['t1-synthesis', 'capture-optimization']
}

type RevisionStatus =
    | 'draft'                      // created, not yet evaluated
    | 'evaluating'                 // evaluation in progress
    | 'evaluated'                  // evaluation complete, verdict recorded
    | 'awaiting-consent'           // passed evaluation, needs human consent
    | 'consented'                  // human approved, not yet active
    | 'active'                     // currently live for users
    | 'rolled-back'                // was active, now reverted
    | 'superseded'                 // replaced by newer revision
    | 'rejected';                  // failed evaluation or human rejected
```

## State Machine

```
draft → evaluating → evaluated → awaiting-consent → consented → active
                    ↓                    ↓              ↓
                  failed              rejected      rolled-back
                    ↓                                           ↓
                 rejected ────────────────────────────────→ superseded
```

## Storage

- Primary: `RevisionStore` (in-memory + JSONL persistence at `data/revisions.jsonl`)
- Index: by `seamRole`, `status`, `author`, `evaluationId`
- Each revision is immutable after creation; status transitions create new ledger events

## Consequences

- **Positive**: Complete audit trail; enables rollback; supports both human and model authors
- **Negative**: `StrategyArtifact` duplication per revision (mitigated by content-addressable storage if needed)
- **Migration**: None — new system