# Design: Simulator & Optimizer-Driven UI/UX & Ontology Suggestions

## Vision
Enable the simulator and optimizer to:
1. **Propose UI/UX improvements** based on automated evaluation metrics
2. **Propose ontology changes** based on matching relevance analysis
3. **Test alternative UI implementations** (A/B testing via simulator)
4. **Test alternative ontology versions** (evolution via simulator scenarios)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIMULATOR (Agent Runtime)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Scenario A  │  │ Scenario B  │  │ Scenario C  │  ...       │
│  │ (Ontology v1│  │ (Ontology v2│  │ (UI Variant │            │
│  │  UI v1)     │  │  UI v1)     │  │  Ontology v1)            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
└─────────┼────────────────┼────────────────┼────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     METRICS COLLECTOR                           │
│  • match-relevance    • time-to-first-match                     │
│  • agent-engagement   • dashboard-clarity                       │
│  • template-usage     • property-entry-reduction                │
│  • confirmation-clarity • notification-timeliness               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OPTIMIZER (Analysis Engine)                │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ UI/UX Suggester  │  │ Ontology Suggester│                   │
│  │ • Component props │  │ • Property keys  │                    │
│  │ • Flow changes   │  │ • Operators      │                    │
│  │ • New components │  │ • Hierarchies    │                    │
│  │ • A/B variants   │  │ • Constraints    │                    │
│  └────────┬─────────┘  └────────┬─────────┘                    │
└───────────┼──────────────────────┼──────────────────────────────┘
            │                      │
            ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUGGESTION STORE                             │
│  • Versioned suggestions with evidence                          │
│  • Human review queue                                           │
│  • Auto-apply for low-risk changes                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. UI/UX Suggestion System

### 2.1 Metric-to-Suggestion Mapping

```typescript
interface UISuggestion {
  id: string;
  type: 'component-prop' | 'flow-change' | 'new-component' | 'variant' | 'removal';
  severity: 'critical' | 'major' | 'minor' | 'experimental';
  evidence: MetricEvidence[];
  targetComponent: string;
  proposedChange: UIChangeProposal;
  estimatedImpact: ImpactEstimate;
  testScenario: string;
  status: 'proposed' | 'reviewed' | 'approved' | 'rejected' | 'implemented' | 'tested';
}
```

### 2.2 Suggestion Rules (Configurable)

| Metric Pattern | Suggestion Type | Example |
|----------------|----------------|---------|
| `match-relevance < 0.7` + `template-usage < 0.3` | New template component | "Add domain-specific template gallery" |
| `dashboard-clarity < 0.7` + `agent-count > 15` | Flow change | "Add agent grouping/filtering sidebar" |
| `time-to-first-match > 30s` | Component prop | "Add pre-fetch indicator to match cards" |
| `confirmation-clarity < 0.8` | Flow change | "Simplify publish gate: single confirmation" |
| `property-entry-reduction < 0.3` | Component prop | "Enhance autocomplete with ontology hints" |
| `template-usage < 0.2` | New component | "Add template preview modal" |

### 2.3 A/B Testing Framework

```typescript
interface ABTestConfig {
  name: string;
  control: UIConfiguration;
  variant: UIConfiguration;
  scenario: string;
  metrics: string[];
  minimumEffectSize: number;
  confidence: number;
}

interface UIConfiguration {
  components: Record<string, ComponentConfig>;
  flows: Record<string, FlowConfig>;
  theme?: ThemeConfig;
}

interface ComponentConfig {
  props: Record<string, unknown>;
  variant?: string;  // e.g., 'compact', 'detailed', 'minimal'
  enabled: boolean;
}
```

---

## 3. Ontology Suggestion System

### 3.1 Analysis Dimensions

```typescript
interface OntologySuggestion {
  id: string;
  type: 'add-property' | 'modify-property' | 'remove-property' | 'add-hierarchy' | 'modify-operator' | 'add-constraint';
  severity: 'critical' | 'major' | 'minor' | 'experimental';
  evidence: OntologyEvidence[];
  targetNode: string;
  proposedChange: OntologyChangeProposal;
  estimatedImpact: ImpactEstimate;
  testScenarios: string[];
  status: 'proposed' | 'reviewed' | 'approved' | 'rejected' | 'implemented' | 'tested';
}
```

### 3.2 Suggestion Rules

| Evidence Pattern | Suggestion Type | Example |
|-----------------|----------------|---------|
| Property key appears in >80% of notes but not in ontology | Add property | "Add 'priority' property (used in 85% notes)" |
| Operator 'contains' used 90% for 'skills' | Modify operator | "Change 'skills' default operator to 'contains'" |
| Two properties always co-occur (correlation >0.9) | Add hierarchy | "Group 'framework' + 'language' under 'tech-stack'" |
| Property never matched in any scenario | Remove property | "Remove deprecated 'legacy-id' property" |
| Match relevance < 0.5 for specific domain | Add constraint | "Add 'seniority' enum constraint for hiring domain" |
| New domain scenario has no matching properties | Add hierarchy | "Add 'research-area' hierarchy for academic domain" |

### 3.3 Ontology Versioning

```typescript
interface OntologyVersion {
  version: string;  // semver
  baseVersion: string;
  changes: OntologyChange[];
  testResults: Record<string, ScenarioResult>;
  approvedBy?: string;
  approvedAt?: Date;
}

interface OntologyChange {
  type: 'add' | 'modify' | 'remove';
  path: string;  // e.g., 'properties.skills.operators'
  before?: unknown;
  after?: unknown;
  reason: string;
  evidence: string[];
}
```

---

## 4. Flexible Testing Infrastructure

### 4.1 Pluggable UI System

```typescript
// Core UI adapter interface
interface UIAdapter {
  id: string;
  name: string;
  version: string;
  render(component: string, props: Record<string, unknown>): HTMLElement;
  registerComponent(name: string, component: ComponentConstructor): void;
  getComponent(name: string): ComponentConstructor | null;
}

// Registry for multiple UI implementations
class UIRegistry {
  private adapters = new Map<string, UIAdapter>();
  private activeAdapter: string = 'default';

  register(adapter: UIAdapter): void { ... }
  setActive(id: string): void { ... }
  getActive(): UIAdapter { ... }
  getAll(): UIAdapter[] { ... }
}

// Usage in simulator
const uiRegistry = new UIRegistry();
uiRegistry.register(new ReactUIAdapter('default', ReactComponents));
uiRegistry.register(new ReactUIAdapter('compact', CompactComponents));
uiRegistry.register(new ReactUIAdapter('experimental', ExperimentalComponents));
```

### 4.2 Pluggable Ontology System

```typescript
// Core ontology adapter interface
interface OntologyAdapter {
  id: string;
  name: string;
  version: string;
  getRootNodes(): OntologyNode[];
  getNode(path: string): OntologyNode | null;
  match(properties: Property[], interests: Property[]): MatchResult[];
  validate(note: Note): ValidationResult;
}

// Registry for multiple ontology versions
class OntologyRegistry {
  private adapters = new Map<string, OntologyAdapter>();
  private activeAdapter: string = 'default';

  register(adapter: OntologyAdapter): void { ... }
  setActive(id: string): void { ... }
  getActive(): OntologyAdapter { ... }
  getAll(): OntologyAdapter[] { ... }
}
```

### 4.3 Scenario-Based Testing Matrix

```typescript
interface TestMatrix {
  id: string;
  name: string;
  uiVariants: string[];  // UI adapter IDs
  ontologyVariants: string[];  // Ontology adapter IDs
  scenarios: string[];  // Scenario names
  metrics: string[];
  repetitions: number;
}

// Example matrix
const comprehensiveMatrix: TestMatrix = {
  id: 'comprehensive-2026-q4',
  name: 'Q4 2026 Comprehensive Test',
  uiVariants: ['default', 'compact', 'experimental'],
  ontologyVariants: ['v1.0', 'v1.1-hiring', 'v1.2-research'],
  scenarios: ['freelance-marketplace', 'hiring-pipeline', 'cofounder-matching', 'learning-community'],
  metrics: ['match-relevance', 'time-to-first-match', 'agent-engagement', 'dashboard-clarity'],
  repetitions: 3,
};
```

---

## 5. Implementation Plan

### Phase 1: Foundation (Current - Week 1-2)
- [x] Domain scenarios covering 10+ use cases
- [x] UX evaluator with 10 metrics
- [x] Scenario-based evaluation CLI
- [ ] **Add UIAdapter interface to core**
- [ ] **Add OntologyAdapter interface to core**
- [ ] **Create UIRegistry and OntologyRegistry**

### Phase 2: Suggestion Engine (Week 3-4)
- [ ] Implement `UISuggester` class in optimizer
- [ ] Implement `OntologySuggester` class in optimizer
- [ ] Add suggestion store (JSON file → later DB)
- [ ] Connect suggestions to evaluation results

### Phase 3: A/B Testing Framework (Week 5-6)
- [ ] Implement `ABTestRunner` in simulator
- [ ] Add test matrix configuration
- [ ] Generate comparison reports
- [ ] Statistical significance testing

### Phase 4: Integration & Automation (Week 7-8)
- [ ] CI pipeline for nightly matrix runs
- [ ] Auto-suggestion PR generation
- [ ] Human review dashboard
- [ ] Rollback mechanism for failed suggestions

---

## 6. File Structure Additions

```
core/src/
├── ui/
│   ├── UIAdapter.ts          # Interface
│   ├── UIRegistry.ts         # Registry
│   └── index.ts
├── ontology/
│   ├── OntologyAdapter.ts    # Interface
│   ├── OntologyRegistry.ts   # Registry
│   ├── OntologyVersion.ts    # Versioning
│   └── index.ts
└── suggestions/
    ├── UISuggestion.ts
    ├── OntologySuggestion.ts
    ├── SuggestionStore.ts
    └── index.ts

optimizer/src/
├── suggestion/
│   ├── UISuggester.ts
│   ├── OntologySuggester.ts
│   ├── SuggestionEngine.ts
│   └── index.ts
├── abtest/
│   ├── ABTestRunner.ts
│   ├── TestMatrix.ts
│   ├── StatisticalTest.ts
│   └── index.ts
└── cliHandlers/
    └── suggest.ts            # CLI for suggestions

simulator/src/
├── testing/
│   ├── MatrixRunner.ts
│   ├── VariantManager.ts
│   └── index.ts
└── scenarios/
    └── matrixScenarios.ts    # Matrix-specific scenarios
```

---

## 7. Configuration Examples

### 7.1 UI Variant Configuration

```json
// config/ui-variants/compact.json
{
  "id": "compact",
  "name": "Compact UI",
  "base": "default",
  "components": {
    "MatchCard": {
      "variant": "compact",
      "props": { "showExplanation": false, "maxTags": 3 }
    },
    "Dashboard": {
      "variant": "compact",
      "props": { "density": "high", "groupBy": "role" }
    },
    "NoteEditor": {
      "variant": "compact",
      "props": { "inlineProperties": true }
    }
  }
}
```

### 7.2 Ontology Variant Configuration

```json
// config/ontology-variants/hiring-v1.1.json
{
  "id": "hiring-v1.1",
  "name": "Hiring-Optimized Ontology",
  "base": "v1.0",
  "changes": [
    {
      "type": "add",
      "path": "properties.seniority",
      "after": {
        "key": "seniority",
        "type": "enum",
        "values": ["junior", "mid", "senior", "staff", "principal"],
        "operators": ["is", "greater than", "less than"]
      },
      "reason": "Hiring scenarios need seniority matching"
    },
    {
      "type": "modify",
      "path": "properties.skills.operators",
      "before": ["contains", "is"],
      "after": ["contains", "is", "includes-all", "includes-any"],
      "reason": "Better multi-skill matching for job requirements"
    }
  ]
}
```

---

## 8. CLI Commands

```bash
# Run UX evaluation (already implemented)
pnpm optimize ux-evaluate

# Generate UI suggestions from evaluation
pnpm optimize suggest ui --from-report ./ux-evaluation-report.json

# Generate ontology suggestions from evaluation
pnpm optimize suggest ontology --from-report ./ux-evaluation-report.json

# Run A/B test matrix
pnpm simulator test-matrix --matrix config/test-matrices/comprehensive.json

# Compare UI variants
pnpm simulator compare --ui default,compact --ontology v1.0 --scenario freelance-marketplace

# Compare ontology variants
pnpm simulator compare --ontology v1.0,hiring-v1.1 --ui default --scenario hiring-pipeline

# Apply approved suggestion
pnpm optimize apply-suggestion --id ui-sugg-001

# List pending suggestions
pnpm optimize suggestions --status proposed
```

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Suggestion precision (human approval rate) | > 70% |
| Suggestion recall (issues caught) | > 80% |
| A/B test statistical power | > 80% at 5% significance |
| Time from detection to suggestion | < 5 min |
| Time from approval to deployment | < 1 hour |
| Ontology version compatibility | 100% backward compatible |

---

## 10. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Suggestion noise overwhelms humans | Severity filtering, batch review, auto-apply for low-risk |
| Ontology changes break existing notes | Versioned ontology, migration scripts, backward compatibility |
| UI variants fragment codebase | Component composition over inheritance, shared design tokens |
| Matrix tests too slow | Parallel execution, selective scenario sampling, caching |
| False positives from metrics | Multi-metric confirmation, human-in-the-loop validation |