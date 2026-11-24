# UI/UX Space Graph

Planning layer over notention's seam/strategy, journey, and optimize-loop systems.
Method: `scripts/melt_ui.skill.md`. The application code remains authoritative;
when graph and code disagree, code wins and the graph is stale.

## Files

- `graph.json` — intents, capabilities, flows, steps, surfaces, predicates, effects, edges.
- `metrics.json` — friction, loop latency, probe, eval, drift, journey failures.
- `priority.json` — ranked candidates with reasons, hard constraints, Pareto front.
- `selection.json` — last selection request, result, and conflict set.
- `contexts.json` — actor/expertise/device/connectivity/locale profiles for experiments.
- `decisions.jsonl` — lifecycle transitions and adoption decisions.
- `findings.jsonl` — open/fixed/verified findings with stable IDs.
- `runs.jsonl` — run records whose `bundlePath` resolves to real evidence.
- `runs.unresolved.jsonl` — quarantined records whose evidence is gone.
- `regressions.json` — seeded regression catalogue, one per analyzer family.
- `manifests/` — compiled flow manifests with content hashes.
- `variants/` — experiment designs for seam alternatives.
- `analysis-2026-11-23.md` — findings from the 2026-11-23 session.

## Commands

```bash
pnpm uisg validate                        # schema, references, reachability
pnpm uisg analyze --strict                # findings; non-zero on high severity
pnpm uisg check                           # gate: findings, sync, seeds, run paths, round-trip
pnpm uisg query --type flow               # filter by type/status/text/seam/journey/source
pnpm uisg to-journey flow.capture-and-edit --out /tmp/opencode/capture.json
pnpm uisg to-journey flow.publish-gate --conditions cancelled --emit-test
pnpm uisg run flow.capture-and-edit-palette  # compile, emit, build, run, record
pnpm uisg compare <bundleA> <bundleB>     # diff evidence (run dirs or bundle.json)
pnpm uisg inventory                       # coverage: journeys, seams, variants, top priority
pnpm uisg scan                            # scan codebase for surfaces/routes/seams/journeys
pnpm uisg sync                            # propose repairs; never writes
pnpm uisg metrics --days 7                # ingest metrics -> metrics.json
pnpm uisg rank                            # (impact*confidence)/effort -> priority.json
pnpm uisg select capture --context default # constraints -> selection.json + conflicts
pnpm uisg contexts --list                 # context profiles
pnpm uisg adopt <flowId> --baseline <run> --variant <run> --hypothesis <text> --metric <name> --actor <name>
pnpm uisg canonicalize --check-roundtrip  # stable hash; unknown-field policy is explicit
pnpm uisg regressions                     # apply seeded damage; every expected finding fires
pnpm uisg diff <baseline> <variant> --semantic
pnpm uisg findings                        # list; --mark-fixed/--verify update status
pnpm uisg runs                            # recent records; --repair relocates or quarantines
```

Playwright resolves `@notention/optimize` through `dist`; `uisg run` rebuilds
it automatically (`--no-build` skips). Journey edits outside `uisg run` need
`pnpm --filter @notention/optimize build` first.

## Conventions

- Stable IDs: `<type>.<domain>.<name>`; never derive from array position.
- Ground every implemented node: `source` paths, `seam`/`strategy`/`skill` IDs,
  `component`/`route`/`configKey`, or a registered `journey` ID.
- Step targets quote journey `Target` shapes (role+name, label, testId).
- Branches: one flow per path (`JourneySpec` steps are linear); connect with
  `alternative` edges and `next` conditions.
- Proposals carry status `planned`/`idea` and explicit `confidence`.
- No colors, pixels, or theme CSS; tokens and kit primitives decide appearance.
- Lifecycle changes go through `transitionLifecycle` so `decisions.jsonl` records
  actor, reason, evidence, and impact.
- Canonicalization preserves unknown fields by default; `strip` and `error` are
  explicit options, never silent.

## Status

2026-11-24: 142 nodes / 114 edges; 110 implemented, 23 planned, 4 candidate,
1 partial, 1 rejected, 3 removed. Six registered journeys all linked and
live-verified: `capture-and-edit`, `capture-and-edit-keyboard`,
`capture-and-edit-palette` (5.8 s), `golden-path` v2, `publish-gate`,
`ontology-conflict` v2. Seams covered 8/8; 7 strategies; 59 surfaces (3 removed).
`uisg check` is green: 0 findings, 0 sync warnings, 10/10 seeded regressions,
0 unresolved run records, round-trip PASS.

Known gaps: the skeleton generator and the 2 themes × 2 viewports matrix are
not built; `experiments.jsonl` stays empty until real runs exist. `seams`
scans 5 of 8 because only strategy-backed seams appear in code configs; the
other three are modeled from journeys.
