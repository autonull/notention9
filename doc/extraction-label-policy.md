# Extraction Label Policy

Single source of truth: `optimize/src/prompts/policy.ts` (operators and scoring) and
`optimize/src/prompts/extractionPrompt.ts` (prompt examples).

Golden and quality annotations must agree with these rules. The ramp case is the
canonical example: `Need a wheelchair ramp installed before Friday, budget 900`
annotates `role contains ["wheelchair ramp"]` and `budget less than ["900 USD"]`
in both the prompt examples and `quality-extract-001`.

## Key selection

| Signal | Key | Operator |
|--------|-----|----------|
| Requested or offered service, helper, or provider | `role` | `contains` (request) / `is` (stated identity) |
| Physical good to buy, donate, or deliver | `item` | `contains` |
| Money ceiling ("budget", "under", "willing to pay") | `budget` | `less than` |
| Fixed or explicit price tag (`$50`, "price is", "free") | `price` | `is` |
| Time window, days, recurrence | `schedule` | `contains` |
| Hard cutoff ("before Friday", "by 3pm") | `deadline` | `before` |
| Field named by the input ("Assignee:", "Jurisdiction:") | that field's key | `is` |

`need` is reserved for recurring or ongoing need (for example a meal train), not
for a one-off service request. `role` covers both the provider and the service
description ("wheelchair ramp", "piano teacher", "mover").

## Operators

Allowed: `is`, `is not`, `contains`, `greater than`, `less than`, `before`,
`after`, `near`, `between`, `has`, `not has`.

Legacy annotations may spell `equals`. Loaders normalize `equals` to `is`; the
prompt and grammar never emit `equals`.

## Scoring

`scoreExtraction` matches actual properties to annotations one-to-one:

- Key must match.
- Operator families must match: assertive (`is`, `contains`, `has`, `before`,
  `after`, `near`) or comparison (`less than`, `greater than`, `between`).
- At least one value pair must agree. Values compare after lowercasing, removing
  currency units (`USD`, `$`), and trimming punctuation. Numeric values compare
  exactly, so `200` does not match `2000`. Text values match on containment, so
  `wheelchair ramp installed` matches `wheelchair ramp`.

Synonym lists in annotations ("mentor", "mentorship", "coding") are alternatives:
one agreeing value satisfies the annotation.

Unmatched actual properties count as false positives. Unmatched annotations count
as false negatives. A case passes when no annotation is missing and no forbidden
property was emitted with the exact annotated operator.

## Few-shot retrieval

`selectFewShot` reads the labelled quality corpus and adds up to three
retrieval-selected examples per input (`--few-shot`, default 3, `0` disables).
The evaluated case is excluded by exact input, and near-duplicate examples are
skipped. The golden gate runs without retrieval so it stays deterministic on a
fresh clone where `data/` is absent.
