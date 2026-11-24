---
---
---
---

# TODO34 — UISG Experimentation Platform
*Build on TODO33 (complete). Turn the graph into a generative UI laboratory.*

---

## 0. Vision

**One graph → infinite variants → automated evaluation → promoted defaults.**

Notention's UI space is a *generative system*. The graph declares intent; templates, strategies, contexts, and themes produce concrete surfaces. We evaluate those surfaces — visually, behaviorally, metrically — and promote the winners. No hand-written component ever drifts again.

---

## Progress Log

| Sub-task | Status | Notes |
|----------|--------|-------|
| A.1 Graph variant schema | ✅ Done | `SurfaceVariant` + `VariantMetrics` on `UisgSurface`; `validate.ts` requires `version: 3`; `UISG_SCHEMA_VERSION=3`; no backward compatibility |
| A.2 Context profiles v2 | ⬜ Pending | Needs `extends`, `strategyOverrides`, `templateVariants`, `featureFlags` + deep-merge resolver |
| A.3 Theme system | ⬜ Pending | Needs `doc/uisg/themes.json`, `themes.ts`, generated CSS vars |
| A.4 Multi-target templates | ⬜ Pending | Templates still React-only; add `target` param |
| A.5 Variant registry CLI | ✅ Done | `uisg variants list/create/promote/archive/diff/export`; `doc/uisg/variants.json`; `variants.ts` |
| B.1–B.5 Evaluation harness | ⬜ Pending | Matrix runner, metrics, decide, A/B report, promotion |
| C.1–C.5 Automation & DX | ⬜ Pending | Visual diff CI, PR bot, graph UI, playground, debugger |
| D.1–D.4 Intelligence | ⬜ Pending | AI generation, DSL, predictive model, feature flags |

**Latest commit:** Phase A.1 + A.5 — variant schema (v3 only), variant registry.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        UISG EXPERIMENTATION PLATFORM                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   GRAPH      │    │  TEMPLATES   │    │  STRATEGIES  │          │
│  │  (source)    │───▶│  (pure fns)  │    │  (registry)  │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              VARIANT RESOLVER (context × theme × target)    │   │
│  │  context profile → strategy override + template variant     │   │
│  │  theme → token map (accent, radius, font, density)          │   │
│  │  target → output format (react, html, flutter, solid…)      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                    │                               │
│                                    ▼                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    GENERATION PIPELINE                       │   │
│  │  uisg optimize --all-contexts --all-themes --target=all     │   │
│  │  → 54 surfaces × 6 contexts × 3 themes × 2 targets = 1944  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                    │                               │
│         ┌──────────────────────────┼──────────────────────────┐   │
│         ▼                          ▼                          ▼   │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐│
│  │  VISUAL     │           │  BEHAVIORAL │           │  METRIC     ││
│  │  REGRESSION │           │  JOURNEYS   │           │  COLLECTION ││
│  │  (pixelmatch)           │  (matrix)   │           │  (bundle,   ││
│  │  + gallery)             │  32×N       │           │  F1, time)  ││
│  └─────────────┘           └─────────────┘           └─────────────┘│
│         │                          │                          │     │
│         └──────────────────────────┼──────────────────────────┘     │
│                                    ▼                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              DECISION ENGINE + PROMOTION                     │   │
│  │  • Auto-promote if all metrics ≥ baseline + visual pass     │   │
│  │  • PR comment with diff + metrics                            │   │
│  │  • Archive losers, tag winners in graph                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phases (Dependency-Ordered)

```
Phase A: Variant Foundation    → Phase B: Evaluation Harness → Phase C: Automation & DX
      │                              │                              │
      A.1 Graph variant schema       B.1 Journey matrix runner      C.1 Visual diff in CI
      A.2 Context profiles v2        B.2 Metric collectors          C.2 PR comment bot
      A.3 Theme system               B.3 Decision engine            C.3 Graph UI editor
      A.4 Multi-target templates     B.4 A/B report generator       C.4 Template playground
      A.5 Variant registry CLI       B.5 Promotion pipeline         C.5 Time-travel debugger
                                       │
                                       ▼
                              Phase D: Intelligence Layer
                                              │
                                              D.1 AI-assisted variant gen
                                              D.2 Composition DSL
                                              D.3 Predictive quality model
                                              D.4 Runtime feature flags
```

**No parallelism needed — each phase ships value independently.**

---

## 3. Phase A — Variant Foundation (Weeks 1-3)

### A.1 Graph Variant Schema
**File:** `optimize/src/uisg/types.ts` (extend `UisgSurface`)

```typescript
interface UisgSurface {
  // ...existing
  variants?: Record<string, SurfaceVariant>;
  defaultVariant?: string;
}

interface SurfaceVariant {
  template?: string;                    // override template shape
  propsSchema?: Record<string, ParamDef>; // additional/override props
  strategyOverrides?: Record<SeamRole, string>; // strategy per context
  description: string;                  // human-readable
  status: 'experimental' | 'candidate' | 'promoted' | 'archived';
  promotedAt?: string;                  // ISO date
  metrics?: VariantMetrics;             // last evaluation snapshot
}
```

**Schema:** v3 is canonical. `version` must equal 3; older graphs are rejected. No migration shim.

### A.2 Context Profiles v2
**File:** `doc/uisg/contexts.json` (extend)

```json
{
  "id": "mobile-dense",
  "extends": "mobile",
  "description": "Mobile viewport, dense density, gesture-first",
  "viewport": "mobile-390",
  "density": "compact",
  "strategyOverrides": {
    "capture": "mobile-capture",
    "elicit": "palette-swipe",
    "layout": "stacked"
  },
  "templateVariants": {
    "item": "dense",
    "panel": "collapsed",
    "editor": "minimal",
    "status": "inline"
  },
  "theme": "default",
  "featureFlags": ["swipe-actions", "haptic-feedback"]
}
```

**Resolver:** `optimize/src/uisg/contexts.ts` — deep merge with inheritance.

### A.3 Theme System
**Files:**
- `doc/uisg/themes.json` — token overrides per brand
- `optimize/src/uisg/themes.ts` — resolver + CSS var generator
- `ui/src/styles/theme.css` — consume generated vars

```json
// doc/uisg/themes.json
{
  "default": { "accent": "#6366f1", "radius": "9px", "font": "Inter" },
  "brand-acme": { "accent": "#FF6B35", "radius": "12px", "font": "Inter" },
  "brand-beta": { "accent": "#00D4AA", "radius": "4px", "font": "JetBrains Mono" },
  "high-contrast": { "accent": "#FFFF00", "radius": "0px", "font": "System" }
}
```

**CLI:** `pnpm uisg optimize --theme=brand-acme` — generates `ui/src/styles/theme-brand-acme.css` + imports.

### A.4 Multi-Target Templates
**File:** `optimize/src/uisg/templates/index.ts`

```typescript
export const targets = {
  react: { extension: '.tsx', builder: tsMorphReact },
  solid: { extension: '.tsx', builder: tsMorphSolid },
  html: { extension: '.html', builder: stringTemplate },
  flutter: { extension: '.dart', builder: dartBuilder },
  json: { extension: '.json', builder: schemaOnly }, // for design tools
};

interface Template {
  shape: string;
  generateComponent(surface, graph, target): string; // target-aware
  generateTest(surface, graph, target): string;
  generatePropsSchema(surface, graph): string; // target-agnostic
}
```

**Migration:** Update 4 existing templates with `target` param (default `'react'`).

### A.5 Variant Registry CLI
**Commands:**
```bash
pnpm uisg variants list [--surface=<id>] [--status=<status>]
pnpm uisg variants create <surfaceId> <variantId> --from=<baseVariant> --patch=<json>
pnpm uisg variants promote <surfaceId> <variantId> --metrics=<json>
pnpm uisg variants archive <surfaceId> <variantId>
pnpm uisg variants diff <surfaceId> <variantA> <variantB>
pnpm uisg variants export <surfaceId> --format=md|json
```

**Storage:** `doc/uisg/variants.json` (git-tracked, append-only log).

---

## 4. Phase B — Evaluation Harness (Weeks 3-5)

### B.1 Journey Matrix Runner
**File:** `optimize/src/uisg/matrix.ts`

```typescript
interface MatrixRun {
  contexts: string[];           // or 'all'
  themes: string[];             // or 'all'
  journeys: string[];           // or 'all'
  viewports: string[];          // ['desktop-1440', 'mobile-390']
  parallelism: number;          // default 4
}

interface MatrixResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  cells: MatrixCell[];
  summary: { passed: number; failed: number; skipped: number };
}

interface MatrixCell {
  context: string;
  theme: string;
  journey: string;
  viewport: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  durationMs: number;
  assertions: AssertionResult[];
  metrics: CellMetrics;
  screenshots: string[];        // paths
  bundlePath: string;
}
```

**CLI:** `pnpm uisg matrix --contexts=all --themes=all --journeys=golden-path,publish-gate --viewports=all`

**Output:** `doc/uisg/matrix-<runId>.json` + HTML report.

### B.2 Metric Collectors
**File:** `optimize/src/uisg/metrics.ts`

```typescript
interface CellMetrics {
  // Bundle
  bundleSizeKb: number;
  chunkCount: number;
  // Runtime
  taskTimeMs: number;           // journey completion
  interactionCount: number;     // clicks, fills, waits
  errorCount: number;           // console errors, failed assertions
  // Quality
  toneViolations: number;       // from lint:tone on generated code
  typeErrors: number;           // from tsc --noEmit
  accessibilityViolations: number; // axe on final state
  // Match quality (if journey involves matching)
  matchF1?: number;
  matchPrecision?: number;
  matchRecall?: number;
}
```

**Collectors:**
- `bundleMetric` — rollup stats
- `runtimeMetric` — journey timestamps
- `qualityMetric` — lint:tone, tsc, axe
- `matchMetric` — eval:match on journey seed data

### B.3 Decision Engine
**File:** `optimize/src/uisg/decide.ts`

```typescript
interface DecisionPolicy {
  // Hard gates (must pass)
  hardGates: {
    zeroTypeErrors: true;
    zeroAccessibilityViolations: true;
    toneViolationsBaseline: number;  // ≤ baseline
    bundleSizeDeltaKb: number;       // ≤ +5kb
  };
  // Soft gates (weighted score)
  softGates: {
    taskTimeMs: { weight: 0.3, target: 3000 };
    interactionCount: { weight: 0.2, target: 10 };
    matchF1: { weight: 0.5, target: 0.8 };
  };
  // Visual
  visualThreshold: 0.99; // pixelmatch similarity
}

function decide(results: MatrixResult, baseline: MatrixResult, policy: DecisionPolicy): Decision {
  // For each variant: PASS/FAIL/REGRESS
  // Auto-promote if PASS on all contexts + visual
  // Flag for review if mixed
}
```

### B.4 A/B Report Generator
**File:** `optimize/src/uisg/report.ts`

```bash
pnpm uisg ab-report --experiment=density-v1 --baseline=main --compare=pr-123
```

**Output:** `doc/uisg/ab-<experiment>.md` with:
- Executive summary (promote/iterate/abandon)
- Metric tables (baseline vs variant, % delta, significance)
- Visual diff gallery (side-by-side screenshots)
- Journey pass/fail matrix
- Bundle size impact
- Recommendation

### B.5 Promotion Pipeline
**Integration:** `scripts/verify.ts` L3

```typescript
// verify.ts additions
run('pnpm uisg matrix --contexts=all --themes=default --journeys=all', 'L3: UISG journey matrix');
run('pnpm uisg decide --matrix=doc/uisg/matrix-latest.json', 'L3: UISG decision gate');
```

**Auto-promotion:** If `decide` returns all `PASS`, update graph:
- `variant.status = 'promoted'`
- `variant.promotedAt = now()`
- `surface.defaultVariant = variantId`
- Commit with message: `chore(uisg): promote <surface>.<variant> (auto)`

---

## 5. Phase C — Automation & Developer Experience (Weeks 5-8)

### C.1 Visual Diff in CI
**File:** `scripts/visual-diff.ts` (Playwright + pixelmatch)

```bash
pnpm uisg visual-diff --baseline=main --compare=HEAD --contexts=all --gallery
```

**Flow:**
1. Build gallery for baseline commit (`pnpm uisg optimize --all-contexts --gallery`)
2. Build gallery for HEAD
3. Screenshot each surface in each context (desktop + mobile)
4. Pixelmatch with threshold 0.99
5. Generate diff report + PR comment

**PR Comment Bot** (GitHub Actions):
```yaml
# .github/workflows/uisg-visual-diff.yml
on: pull_request
jobs:
  visual-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm uisg visual-diff --baseline=origin/main --compare=HEAD
      - uses: actions/github-script@v7
        with:
          script: |
            // Post comment with diff summary + screenshots
```

### C.2 PR Comment Bot (Full)
**File:** `scripts/pr-bot.ts`

Posts on every PR:
- `uisg:check` status
- `uisg optimize` duration
- Visual diff summary (if changed surfaces)
- Journey matrix delta (if matrix ran)
- Bundle size delta
- Link to full HTML report (artifact)

### C.3 Graph UI Editor
**Route:** `?uisg=1&mode=graph`

**Stack:** Cytoscape.js + React + dagre layout

**Features:**
- Visual node/edge editor (drag, connect, delete)
- Live preview pane (renders selected surface in current context)
- Inline property editor (YAML/JSON)
- Variant manager (create, switch, promote)
- Export → patches `doc/uisg/graph.json`
- Undo/redo + history

**Entry point:** `ui/src/dev/GraphEditor.tsx` (lazy-loaded)

### C.4 Template Playground
**Route:** `?uisg=1&mode=template`

**Features:**
- Monaco editor for template AST builder (TypeScript)
- Live preview of generated component
- Hot reload on template change
- Props panel (editable JSON → live component)
- Test generator preview
- Export → writes to `optimize/src/uisg/templates/`

### C.5 Time-Travel Debugger
**Route:** `?uisg=1&flow=<id>&debug=1`

**Features:**
- Step slider (0…N steps)
- Guard state timeline (open/blocked per step)
- Effect log (fired, pending, confirmed)
- State inspector (`window.__UISG_SKELETON__.state()`)
- Click step → jump to that point in journey
- Export trace → JSON for bug reports

---

## 6. Phase D — Intelligence Layer (Weeks 8-12+)

### D.1 AI-Assisted Variant Generation
**Command:**
```bash
pnpm uisg generate --surface=surface.notesview --prompt="
  Dense list view for mobile, swipe actions on items,
  group by status with collapsible sections, dark mode first,
  show match score inline, hide timestamps
" --context=mobile-dense --variant=ai-dense-v1
```

**Implementation:**
- `optimize/src/uisg/ai-generate.ts`
- Uses graph + template + component examples as few-shot context
- LLM produces: variant JSON patch + template override (if needed)
- Human reviews in Graph UI → promote or iterate

### D.2 Composition DSL
**File:** `optimize/src/uisg/compose.ts`

```typescript
// Instead of fixed templates, compose from primitives
const MatchItem = compose(
  Card({ padding: 'md', hover: 'lift', border: 'line' }),
  Header({ score: true, direction: true, author: true }),
  Body({ truncate: 2, markup: true }),
  BadgeRow({ matches: true, conflicts: true, missing: true }),
  Footer({ 
    actions: ['respond', 'connect', 'chat'], 
    explanation: { expandable: true, defaultClosed: true }
  })
);

// Compiles to template AST → generates component
```

**Benefits:**
- Non-template authors can create variants
- Reusable composition blocks across shapes
- Type-safe (Zod schema inferred from composition)

### D.3 Predictive Quality Model
**File:** `optimize/src/uisg/predict.ts`

Train on historical matrix runs:
- Input: graph diff + variant metadata
- Output: predicted metric deltas (task time, F1, bundle size)
- Use: pre-filter variants before expensive matrix run
- Retrain nightly from `doc/uisg/matrix-*.json`

### D.4 Runtime Feature Flags
**File:** `ui/src/hooks/useUisgFlags.ts`

```typescript
interface UisgFlags {
  density: 'compact' | 'comfortable';
  animations: boolean;
  reducedMotion: boolean;
  experimental: string[];      // e.g., ['swipe-actions', 'ai-suggestions']
  theme: string;
  context: string;
}

// DevTools panel at ?uisg=1&mode=flags
// Generated components read via useUisgFlags()
// Flags persist in localStorage, sync via URL params
```

---

## 7. Integration Points (Summary)

| Layer | Files | Commands |
|-------|-------|----------|
| Graph | `doc/uisg/graph.json`, `types.ts` | `uisg variants`, `uisg graph` |
| Contexts | `doc/uisg/contexts.json`, `contexts.ts` | `uisg contexts` |
| Themes | `doc/uisg/themes.json`, `themes.ts` | `uisg optimize --theme` |
| Targets | `templates/index.ts`, 4 templates | `uisg generate --target` |
| Generation | `cli.ts`, `codegen.ts`, `optimize.ts` | `uisg optimize --all-contexts` |
| Visual | `visual-diff.ts`, `gallery` | `uisg visual-diff`, `uisg gallery` |
| Behavioral | `matrix.ts`, `journeyTest` | `uisg matrix` |
| Metrics | `metrics.ts`, `decide.ts` | `uisg decide`, `uisg ab-report` |
| Promotion | `verify.ts`, `promote.ts` | auto in verify |
| DX | `GraphEditor`, `TemplatePlayground`, `Debugger` | `?uisg=1&mode=...` |
| AI | `ai-generate.ts`, `compose.ts` | `uisg generate --prompt` |

---

## 8. Acceptance Criteria (Definition of Done)

### Phase A
- [x] Graph v3 with `variants` loads; v2 rejected
- [ ] 6 context profiles v2 with inheritance work
- [ ] 3 themes generate CSS vars, apply at `?uisg=1&theme=`
- [ ] `uisg generate --target=html|json` works for 1 surface
- [x] `uisg variants` CRUD works, stores in `variants.json`

### Phase B
- [ ] `uisg matrix --contexts=all --themes=all` completes in <10min
- [ ] Metrics collected: bundle, runtime, quality, match
- [ ] `uisg decide` returns PASS/FAIL/REGRESS per variant
- [ ] `uisg ab-report` produces readable markdown + gallery
- [ ] Auto-promotion commits graph update on all-PASS

### Phase C
- [ ] Visual diff runs in CI, posts PR comment with screenshots
- [ ] PR bot posts full UISG status on every PR
- [ ] Graph UI at `?uisg=1&mode=graph` edits + previews live
- [ ] Template Playground at `?uisg=1&mode=template` hot-reloads
- [ ] Debugger at `?uisg=1&flow=X&debug=1` time-travels

### Phase D
- [ ] `uisg generate --prompt` produces valid variant + preview
- [ ] Composition DSL compiles to template, generates component
- [ ] Predictive model predicts task time within 20% MAE
- [ ] Feature flags panel toggles live at `?uisg=1&mode=flags`

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Variant explosion (combinatorial) | High | CI time, storage | Smart filtering: only run matrix on changed surfaces; predictive pre-filter |
| Template target divergence | Medium | Maintenance burden | Shared AST primitives; contract tests per target |
| AI generation quality | Medium | Wasted review time | Few-shot with 20+ examples; human-in-loop; confidence scoring |
| Visual diff flakiness | Medium | False positives | Deterministic rendering (seeded); mask dynamic regions; threshold tuning |
| Graph UI complexity | Low | Scope creep | Start read-only + variant switch; add editing incrementally |

---

## 10. Open Decisions (Record When Made)

| Decision | Options | Default | Revisit |
|----------|---------|---------|---------|
| Visual diff tool | pixelmatch vs playwright visual vs chromatic | pixelmatch (zero deps) | If flaky >5% |
| Matrix parallelism | Fixed N vs dynamic (CI resources) | 4 | When CI scales |
| Promotion policy | Auto vs manual gate | Auto for PASS, manual for mixed | After 10 promotions |
| AI provider | Local (Ollama) vs API (Anthropic) | Local first | If quality insufficient |
| Composition DSL syntax | TS functions vs JSON vs YAML | TS functions (type-safe) | If non-dev authors need it |

---

## 11. Sequencing (No Parallelism Needed)

```
A.1 Graph variants     → A.2 Contexts v2    → A.3 Themes      → A.4 Targets     → A.5 Variant CLI
                                                                           │
                                                                           ▼
B.1 Matrix runner  ← B.2 Metrics      ← B.3 Decide      ← B.4 A/B Report  ← B.5 Promotion
                                                                           │
                                                                           ▼
C.1 Visual diff CI  → C.2 PR Bot       → C.3 Graph UI    → C.4 Template PG → C.5 Debugger
                                                                           │
                                                                           ▼
D.1 AI Generate  ← D.2 Compose DSL  ← D.3 Predict     ← D.4 Feature Flags
```

**Each sub-task ships independently.** Phase A alone enables variant authoring. Phase B enables evaluation. Phase C enables automation. Phase D enables intelligence.

---

## 12. Success Metrics (North Stars)

| Metric | Current | Target (6mo) | Target (12mo) |
|--------|---------|--------------|---------------|
| Surfaces generated from graph | 54 | 54 (all) | 54 + variants |
| Variant count per surface | 0 | 3-5 | 10+ |
| Matrix run time (all contexts) | N/A | <10min | <5min |
| Auto-promotion rate | 0% | 30% | 60% |
| Visual regression catch rate | Manual | 100% | 100% |
| Time to new variant (dev) | Hours | 15min | 5min |
| Bundle size per surface | Varies | ≤5kb delta | ≤2kb delta |
| Tone violations in generated | 0 | 0 | 0 |

---

## 13. First Commit (Today)

```bash
# 1. Extend graph schema with variants
edit optimize/src/uisg/types.ts

# 2. Add migration v2→v3
edit optimize/src/uisg/canonicalize.ts

# 3. Create variant registry CLI stub
edit optimize/src/uisg/cli.ts  # add 'variants' command

# 4. Update TODO34.md with progress
# 5. Commit
git commit -m "feat(uisg): Phase A.1 - variant schema + migration v3"
```

---

*This plan is ambitious but each step is a concrete, shippable increment. The graph is already the source of truth; we're building the laboratory around it.*