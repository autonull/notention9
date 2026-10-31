# Decision 009: Case Manifest Schema

**Status:** Proposed
**Date:** 2026-10-31
**Author:** System

## Context

Evaluation cases (intent + quality) need a manifest that is:
- **Content-addressable**: hash of manifest = case identity
- **Self-describing**: no external dependencies to interpret
- **Extensible**: new case types without schema migration
- **Git-friendly**: one file per case, or one manifest per suite

## Schema

```typescript
interface CaseManifest {
    // Identity (content-addressable)
    version: 1;
    id: string;                    // SHA-256 of canonical JSON (first 16 chars)
    type: 'intent' | 'quality' | 'regression';
    
    // Human-readable
    name: string;
    description: string;
    tags: string[];                // e.g., ['capture', 'date-parsing', 'ambiguous']
    
    // Input (what the user provides)
    input: IntentInput | QualityInput;
    
    // Expected output (what we verify)
    expect: Expectation[];
    
    // Metadata
    author: 'human' | 'model';
    createdAt: string;             // ISO timestamp
    updatedAt: string;             // ISO timestamp
    
    // Constraints (for flakiness control)
    maxDurationMs?: number;
    requiredCapabilities?: string[]; // e.g., ['structured-output']
    deterministic: boolean;        // if false, run N times and aggregate
}

type IntentInput = {
    kind: 'natural-language';
    text: string;
    context?: Record<string, unknown>; // e.g., current note, selected text
};

type QualityInput = {
    kind: 'golden-case';
    // Varies by quality dimension
    matchQuality?: {
        query: string;
        expectedNoteIds: string[];
        minRecall?: number;
        minPrecision?: number;
    };
    extractionQuality?: {
        input: string;
        expectedProps: Array<{ key: string; values: string[] }>;
        minF1?: number;
    };
    explainQuality?: {
        matchId: string;
        expectedExplanationContains: string[];
    };
};

type Expectation =
    | { kind: 'property-extracted'; key: string; values: string[]; minCount?: number }
    | { kind: 'match-recalled'; noteId: string }
    | { kind: 'match-precision'; minPrecision: number }
    | { kind: 'explanation-contains'; substrings: string[] }
    | { kind: 'completion'; success: boolean }
    | { kind: 'schema-valid'; schemaId: string }
    | { kind: 'custom'; evaluator: string; params: Record<string, unknown> };
```

## File Layout

```
eval/
  cases/
    manifest.json          # index: { cases: [{ id, type, path, hash }] }
    intent/
      capture-date-parsing.json
      capture-ambiguous-time.json
    quality/
      match-recall-basic.json
      extraction-f1-contacts.json
    regression/
      issue-123-date-edge-case.json
```

## Hash Guard

- `manifest.json` includes `hash` field for each case file
- CI step: `pnpm eval:verify-manifest` recomputes hashes, fails on mismatch
- Ensures cases cannot drift silently

## Consequences

- **Positive**: Tamper-evident cases; git diff shows intent; evaluator is pure function of (case, strategy)
- **Negative**: Must regenerate manifest on case edit (automated via `pnpm eval:update-manifest`)
- **Migration**: New system; existing golden cases migrated to this format