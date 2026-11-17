# Architecture Decision Records (ADRs)

Index of major architectural decisions. Each ADR is immutable once accepted.

---

## Accepted

| ID | Title | Date | Status |
|----|-------|------|--------|
| [007](007-resolution-spine.md) | Resolution Spine | 2026-10-15 | Accepted |
| [008](008-revision-schema.md) | Revision Schema | 2026-10-18 | Accepted |
| [009](009-case-manifest-schema.md) | Case Manifest Schema | 2026-10-20 | Accepted |
| [010](010-ledger-event-schema.md) | Ledger Event Schema | 2026-10-22 | Accepted |
| [011](011-causality-definition.md) | Causality Definition | 2026-10-25 | Accepted |
| [012](012-note-document.md) | Note Document Model | 2026-10-28 | Accepted |
| [013](013-editor-engine.md) | Editor Engine | 2026-11-01 | Accepted |
| [014](014-golden-path.md) | Golden Path Definition | 2026-11-05 | Accepted |
| [015](015-telemetry-handoff.md) | Telemetry Handoff | 2026-11-08 | Accepted |
| [016](016-time-to-first-match.md) | Time-to-First-Match | 2026-11-11 | Accepted |
| [017](017-dual-prompt.md) | Dual Prompt Architecture | 2026-11-14 | Accepted |
| [018](018-grammar-gating.md) | Grammar Gating with Auto-Probe | 2026-11-14 | Accepted |
| [019](019-local-first-telemetry.md) | Local-First Telemetry | 2026-11-14 | Accepted |

---

## Template

```markdown
# ADR XXX: Title

**Status:** Proposed | Accepted | Superseded
**Date:** YYYY-MM-DD
**Related:** ADR-YYY, Issue #ZZZ

## Context

What problem are we solving? What constraints exist?

## Decision

What did we decide? Be specific.

## Consequences

### Positive
- Benefit 1
- Benefit 2

### Negative
- Tradeoff 1
- Tradeoff 2

### Neutral
- Implementation detail

## Verification

How will we know this works?
- Test X
- Metric Y
```

---

## Creating a New ADR

```bash
# Next number
NEXT=$(ls doc/decisions/*.md | wc -l | awk '{print $1+7}')
cat > doc/decisions/$(printf "%03d" $NEXT)-short-title.md <<'EOF'
# ADR XXX: Title

**Status:** Proposed
**Date:** $(date +%Y-%m-%d)
**Related:** 

## Context

## Decision

## Consequences

## Verification
EOF
```

---

*Maintained per TODO.25 W9.3*