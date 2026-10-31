# Decision 011: Causality Definition

**Status:** Proposed
**Date:** 2026-10-31
**Author:** System

## Context

"Causality" is the core claim of the evaluation system: **a specific strategy change caused a measurable outcome difference**. We need a precise, testable definition that survives scrutiny.

## Definition

> **Causality**: A strategy revision *R* causes outcome *O* for case *C* iff:
> 1. *R* is the only difference between two otherwise identical evaluation runs
> 2. *O* is measured deterministically from the strategy's rendered output
> 3. The difference in *O* exceeds the pre-registered Minimum Detectable Effect (MDE)
> 4. The p-value of the difference < 0.05 (two-tailed, paired test)

In formal notation:
```
Causes(R, O, C) ≡
  ∃ run₁, run₂:
    run₁.case = run₂.case = C ∧
    run₁.strategy = baseline(C) ∧
    run₂.strategy = R ∧
    run₁.config = run₂.config ∧
    Δ = O(run₂) - O(run₁) ∧
    |Δ| > MDE(C, O) ∧
    p(Δ) < 0.05
```

## Key Principles

1. **Paired Design**: Same case, same seed, same context — only strategy differs
2. **Deterministic Output**: `O` must be a pure function of rendered output (no LLM judges in the causal path)
3. **Pre-registered MDE**: Each case declares its MDE per metric in the manifest
4. **No Cherry-picking**: All cases in the suite run; verdict aggregates per pre-registered rule

## Test: `causality.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { evaluateCausality } from './causality.js';

describe('Causality Definition', () => {
    it('detects true causal improvement', () => {
        const baseline = { completion: 0.60, extractionF1: 0.55 };
        const candidate = { completion: 0.75, extractionF1: 0.70 };
        const mde = { completion: 0.10, extractionF1: 0.10 };
        
        const result = evaluateCausality(baseline, candidate, mde, 30); // n=30 paired runs
        
        expect(result.causesOutcome).toBe(true);
        expect(result.metrics.completion.pValue).toBeLessThan(0.05);
        expect(result.metrics.extractionF1.pValue).toBeLessThan(0.05);
    });

    it('rejects noise as causality', () => {
        const baseline = { completion: 0.60 };
        const candidate = { completion: 0.62 }; // below MDE of 0.10
        const mde = { completion: 0.10 };
        
        const result = evaluateCausality(baseline, candidate, mde, 30);
        
        expect(result.causesOutcome).toBe(false);
        expect(result.reason).toBe('below-mde');
    });

    it('requires paired design', () => {
        // Unpaired comparison must fail
        const baseline = { completion: [0.60, 0.61, 0.59] };
        const candidate = { completion: [0.75, 0.76, 0.74] };
        // Different seeds, different contexts — not paired
        // evaluateCausality must reject or require paired input
    });
});
```

## What This Excludes

- ❌ "User preference" as causal metric (subjective, not deterministic output)
- ❌ Cross-case aggregation without paired design
- ❌ Post-hoc metric selection
- ❌ LLM-as-judge in the causal path (allowed as *secondary* qualitative signal only)

## Consequences

- **Positive**: Unambiguous, statistically sound, defensible in review
- **Negative**: Requires paired runs (2x compute); MDE must be set per case upfront
- **Implementation**: `evaluateCausality` in `core/src/eval/causality.ts`; used by `verdict.ts`