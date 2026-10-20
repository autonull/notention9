# TODO.3 — Netention Adaptation: Immediate Implementation Plan

**Status:** Ready for implementation. Derived from TODO.2.md decisions + Netention (netjs) concept salvage.

**Core Principle:** Adapt Netention's semantic richness into Notention's modern architecture. Not a port — a salvage operation.

---

## 🎯 Decisions Summary (from Grill)

| Area | Decision |
|------|----------|
| **Focus/ADC** | Persistent user profile note (`type: focus`, `role: profile`) |
| **Variable Strength** | New `Affinity` property type: bipolar -1..+1 (enables like/dislike, trust) |
| **Real vs Imaginary** | Core metaphor: `Is` (actual) vs `Should be` (desired). Replace `request/offer` terminology. |
| **Tag Selectors** | General-purpose default + extensible selector registry for niche domains |
| **Views to Add** | Graph, Trends, Wiki, Self (Templates = Ontology view) |
| **Contextual Actions** | Keep current (command palette + editor toolbar) |

---

## 📦 Phase 1: Data Model Extensions (Week 1-2)

*Foundation for everything else. No UI changes yet.*

### 1.1 Affinity Property Type (`core/src/notes/properties.ts`, `core/src/ontology/propertyTypes.ts`)

```typescript
// New typed value
interface AffinityValue {
  t: "affinity";
  v: number;        // -1.0 .. +1.0 (bipolar)
  target: string;   // NoteID, tag IRI, or PeerID this affinity applies to
}

// PropertyOptions extension
interface PropertyOptions {
  // ...existing
  affinity?: {
    bipolar: boolean;        // true = -1..+1, false = 0..1
    targetType: "note" | "tag" | "peer" | "ontology_class";
  };
}
```

**Tasks:**
- [ ] Add `affinity` to `TypedValue` union in `properties.ts`
- [ ] Add affinity parser in `parsing.ts` (syntax: `[tag:affinity:0.8]` or `[peer:affinity:-0.5]`)
- [ ] Add affinity matcher in `matching/matchers.ts` (cosine similarity for tag vectors, direct compare for peer affinity)
- [ ] Add affinity to ontology property types (`ontology.default.ts`: `dsn:affinity`)
- [ ] Update canonicalization for affinity type
- [ ] Tests: affinity parsing, matching, serialization

### 1.2 Focus Profile Note (`core/src/notes/notes.ts`, `core/src/ontology/ontology.default.ts`)

```typescript
// New note type
interface FocusNote {
  type: "focus";
  role: "profile";
  author: PeerID;
  affinities: Property[];  // tag affinities, peer affinities, domain weights (EXPLICIT)
  implicitAffinities?: Property[];  // derived from peer affinities (IMPLICIT, separate)
  filters: Property[];     // active filters (e.g., [domain:is:work], [priority:gte:0.7])
  updated: number;
}
```

**Tasks:**
- [ ] Add `focus` note type to ontology (domain: `identity`, class: `FocusProfile`)
- [ ] Add focus note CRUD in `notes.ts` (get/set user focus profile)
- [ ] Add focus-aware matching weight adjustment in `MatchingService.ts` (uses explicit affinities only)
- [ ] Add `implicitAffinities` computation: traverse peer affinities → tag affinities (PageRank-style, depth 2, decay 0.5)
- [ ] Add contextual action "Propagate Affinities" → preview implicit boosts → user confirms to merge into explicit
- [ ] Persist focus note in local storage (separate from regular notes)
- [ ] Tests: focus note creation, matching integration, implicit computation, propagation action

### 1.3 Real/Imaginary Modality (`core/src/ontology/ontology.default.ts`, `core/src/notes/parsing.ts`)

**Terminology:** Internal = `actual` / `desired` (stable, binary). UI labels = configurable (default: "Is" / "Could"). Legacy `request`/`offer` = aliases.

```typescript
// Ontology update
const modalityProperty = {
  key: "dsn:modality",
  type: "enum",
  enum: ["actual", "desired"],
  default: "actual",
  aliases: { "request": "desired", "offer": "actual" },
  uiLabels: { actual: "Is", desired: "Could" }  // overridable
};
```

**Migration:** Dual-mode matcher reads `modality` OR legacy `role`; both work during transition. No big-bang.

**Tasks:**
- [ ] Add `dsn:modality` property to default ontology with configurable `uiLabels`
- [ ] Update parser to recognize `modality` shorthand (`[modality:is:desired]`)
- [ ] Update matcher: dual-mode — reads `modality` first, falls back to `role` (`request`/`offer`)
- [ ] Add UI label config in Settings → Terminology (preset: Is/Could, Fact/Intent, Actual/Desired, custom)
- [ ] Add modality to note filter and query builder
- [ ] Tests: modality parsing, dual-mode matching, filtering, label config

### 1.4 Tag Hierarchy / Extend (`core/src/ontology/ontologyService.ts`)

Netention's `extend` array → super-tag inheritance. Notention has flat ontology.

**Tasks:**
- [ ] Add `extend: string[]` to `ClassDef` and `PropertyDef` in ontology types
- [ ] Implement hierarchy resolution in `ontologyService.ts` (getAllParents, getAllChildren)
- [ ] Update matcher: tag match respects hierarchy (child matches parent constraint)
- [ ] Update property alias resolution to walk hierarchy
- [ ] Add hierarchy validation (no cycles)
- [ ] Tests: hierarchy resolution, matching with inheritance

---

## 📦 Phase 2: Selector Registry & Default Selector (Week 2-3)

*Extensible tag/property selector system. General-purpose default + niche selectors.*

### 2.1 Selector Registry (`ui/src/components/Editor/PropertySelectorRegistry.tsx`)

```typescript
interface PropertySelector {
  id: string;
  label: string;
  description: string;
  matches: (propertyKey: string, ontology: Ontology) => boolean;  // when to show this selector
  render: (props: SelectorProps) => React.ReactNode;
  priority: number;  // higher = more specific
}

interface SelectorProps {
  propertyKey: string;
  propertyDef: PropertyDef;
  currentValue: Property[];
  onChange: (values: Property[]) => void;
  ontology: Ontology;
  note: Note;
}
```

**Tasks:**
- [ ] Create `PropertySelectorRegistry` context/provider
- [ ] Register built-in selectors (see 2.2-2.5)
- [ ] Modify `PropertyPopup` to use registry: find matching selector, fallback to default
- [ ] Add selector API for plugins/skills to register custom selectors
- [ ] Tests: registry matching, fallback, plugin registration

### 2.2 Default: Unified Selector (General Purpose)

**Current `PropertyPopup` enhanced:**
- Tree view for hierarchical properties (uses `extend`)
- Search/filter across all values
- Strength/affinity slider for affinity properties
- Enum pills for enum properties
- Date/time picker for temporal
- Map picker for geo
- Multi-select with chips

**Tasks:**
- [ ] Refactor `PropertyPopup` → `UnifiedSelector` component
- [ ] Add tree/hierarchy mode (collapsible ontology tree)
- [ ] Add affinity slider (-1..+1 bipolar, 0..1 unipolar)
- [ ] Add "recent values" and "suggested values" sections
- [ ] Keyboard navigation (arrow keys, enter, escape)
- [ ] Tests: all property types, keyboard, hierarchy

### 2.3 Niche Selectors (Register but Hidden by Default)

| Selector | Matches | Use Case |
|----------|---------|----------|
| `NeedSelector` | `dsn:need`, `dsn:requirement`, `modality:desired` | Composing requests; shows compatible offer types |
| `IdentitySelector` | `dsn:peer`, `dsn:identity`, `kind:ref:peer` | Picking people; shows trust/endorsement |
| `EmotionSelector` | `dsn:feeling`, `dsn:mood`, `type:affinity` | Visual emoji/scale for subjective affinity |
| `LocationSelector` | `dsn:location`, `type:geo` | Map-based place picker |
| `TemplateSelector` | `dsn:template`, `role:template` | One-click template instantiation |

**Tasks:**
- [ ] Implement each selector as separate component
- [ ] Register with appropriate `matches()` predicates
- [ ] Add to Settings → "Advanced Selectors" toggle (off by default)
- [ ] Tests: each selector matches correct properties

---

## 📦 Phase 3: New Views (Week 3-5)

*Four new views. Each is a standalone route + sidebar entry.*

### 3.1 Graph View (`ui/src/components/views/GraphView.tsx`)

**Spec:**
- Force-directed graph (d3-force or react-force-graph)
- Nodes = notes (filterable by tag, type, date, modality)
- Edges = matches (solid), references/parents (dashed), ontology links (dotted)
- Click node → detail panel; double-click → open in Editor
- Filters: modality, tag, date range, match score threshold
- Layout modes: force, hierarchical (by ontology), temporal, geographic
- Export: PNG, SVG, GraphML

**Shared Dependency:** `core/src/graph/NoteGraphService.ts` — single source for:
- Backlink index (incremental, updated on note change)
- Edge computation (matches, references, ontology, affinity)
- Layout algorithms (force, hierarchical, temporal, geographic)
- Graph queries (neighbors, paths, clusters, centrality)

**Tasks:**
- [ ] Create `NoteGraphService` in core: incremental index, edge types, layout algorithms
- [ ] Create `GraphView` component with route `/graph`
- [ ] Add to sidebar navigation (icon: git-branch)
- [ ] Implement force-directed layout with Web Worker for large graphs
- [ ] Add filter toolbar (modality chips, tag multi-select, date range, score slider)
- [ ] Add layout mode selector
- [ ] Add node detail panel (side drawer)
- [ ] Add "Open in Editor" action
- [ ] Performance: virtualize >500 nodes; canvas rendering
- [ ] Tests: rendering, filtering, layout modes, performance

### 3.2 Trends/Analytics View (`ui/src/components/views/TrendsView.tsx`)

**Spec:**
- Tag frequency over time (area chart)
- Match rate trends (line chart: matches/day, success rate)
- Activity heatmap (calendar view: notes created, matches found, notes published)
- Ontology growth (new classes, properties, aliases over time)
- Modality balance (actual vs desired ratio)
- Affinity distribution (histogram of affinity values)
- Top matchers (which notes match most often)
- Time range picker (7d, 30d, 90d, 1y, all)

**Tasks:**
- [ ] Create `TrendsView` component with route `/trends`
- [ ] Add to sidebar (icon: trending-up)
- [ ] Implement analytics engine (`core/src/analytics/trends.ts`) — computes aggregations from local notes
- [ ] Use recharts or chart.js for visualizations
- [ ] Add time range picker + modality filter
- [ ] Add "Export CSV" for each chart
- [ ] Tests: analytics calculations, chart rendering, time filtering

### 3.3 Wiki View (`ui/src/components/views/WikiView.tsx`)

**Spec:**
- Interlinked note browser (like Obsidian/Roam graph but read-optimized)
- Left: search + tag filter + backlinks panel
- Center: rendered note content (rich text + property chips)
- Right: outgoing links + incoming backlinks + graph minimap
- `[[wiki-link]]` syntax support in notes (parser + renderer)
- Click link → navigate; Ctrl+click → open in new pane
- "Random note" button for serendipity
- Keyboard navigation (j/k, enter, backspace)

**Shared Dependency:** Consumes `NoteGraphService` for backlink index, outgoing links, graph minimap.

**Tasks:**
- [ ] Create `WikiView` component with route `/wiki`
- [ ] Add to sidebar (icon: book-open)
- [ ] Add wiki-link parser (`[[note title]]` → NoteID lookup)
- [ ] Add wiki-link renderer (hover preview, click navigation)
- [ ] Implement three-pane layout (resizable)
- [ ] Add graph minimap (uses `NoteGraphService.getNeighborhood()`)
- [ ] Tests: link parsing, backlink index, navigation

### 3.4 Self View (`ui/src/components/views/SelfView.tsx`)

**Spec:** Single "My Identity" hub with modular tabs (architected for future extraction).

| Tab | Content | Future Extraction Target |
|-----|---------|--------------------------|
| **Keys** | Nostr/Mesh/local keys, rotation, backup, NIP-07 | Settings → Identity |
| **Circles** | Create, manage members, circle keys, rotation | Settings → Circles |
| **Focus** | Visual affinity editor (tag cloud + peer sliders) | Dedicated Focus View |
| **Reputation** | Endorsements given/received, blocks, trust graph | Trust View |
| **Capabilities** | Delegations granted/received, scope, expiry | Agent View |
| **Transport** | Relay/mesh status, sync indicators | Network View |

**Tasks:**
- [ ] Create `SelfView` component with route `/self` (modular tab components)
- [ ] Add to sidebar (icon: user) — replaces avatar menu depth
- [ ] Key management UI (generate, rotate, backup, NIP-07 connect)
- [ ] Circle manager (create, invite, revoke, key rotation)
- [ ] Focus Profile editor (visual tag affinity cloud + peer affinity list)
- [ ] Reputation dashboard (endorsement graph, blocks list)
- [ ] Capability delegation UI (grant/revoke, scope, expiry)
- [ ] Transport status panel (live connection indicators)
- [ ] Encrypted export/import (age or libsodium)
- [ ] Tests: key ops, circle ops, focus editing, export/import

---

## 📦 Phase 4: Integration & Polish (Week 5-6)

### 4.1 Matching Integration

**Tasks:**
- [ ] Wire affinity matching into `MatchingService` (affinity similarity scores)
- [ ] Wire focus profile into matching weights (focus tags boost matching)
- [ ] Wire modality into match explanations ("Desired X matches Actual Y")
- [ ] Add affinity to match result explanations
- [ ] Tests: end-to-end matching with affinity + focus + modality

### 4.2 Editor Integration

**Tasks:**
- [ ] PropertyPopup → UnifiedSelector (Phase 2.2)
- [ ] Add modality chip in editor (shows Actual/Desired/Hypothetical)
- [ ] Add affinity slider for affinity properties
- [ ] Add "Convert to Desired/Actual" action in editor menu
- [ ] Tests: editor with new property types, modality toggle

### 4.3 Settings Integration

**Tasks:**
- [ ] Settings → "Advanced Selectors" toggle (enables niche selectors)
- [ ] Settings → "Terminology": preset labels (Is/Could, Fact/Intent, Actual/Desired, custom)
- [ ] Settings → Focus Profile editor link (opens Self View → Focus tab)
- [ ] Settings → Graph/Trends/Wiki/Self view toggles
- [ ] **Ontology View → Add "Templates" tab:** user-friendly template gallery (one-click instantiate)
- [ ] **Editor → "New from Template" picker** (reads same template registry)
- [ ] Tests: settings persist, affect UI correctly

### 4.4 Migration & Backward Compat

**Tasks:**
- [ ] Migration script: existing `request`/`offer` notes → add `modality` property
- [ ] Migration: existing tags → check hierarchy, add `extend` where obvious
- [ ] Backward compat: `request`/`offer` still work as aliases
- [ ] Tests: migration runs cleanly, old notes still match

---

## 📦 Phase 5: Stretch (Post-TODO.3)

*Not in immediate plan but designed for:*

| Feature | Dependency |
|---------|------------|
| Sealed visibility (P3) | Phase 1 affinity + focus for trust scoring |
| Signed transitions (P2) | Phase 1 modality for transition typing |
| Content-addressed notes (P1) | Independent; enables dedupe in Graph view |
| WebRTC transport (Netention) | Phase 3 Self View transport status |
| Agent autonomy | Phase 1 focus + affinity for intent prediction |
| CRDT sync | Phase 3 Wiki view backlink index structure |

---

## 🔧 Technical Dependencies Map

```
Phase 1 (Data Model)
├── 1.1 Affinity Type ──────────────────┐
├── 1.2 Focus Profile Note ─────────────┤
├── 1.3 Real/Imaginary Modality ────────┼──→ Phase 4.1 Matching Integration
├── 1.4 Tag Hierarchy ──────────────────┘

Phase 2 (Selectors)
├── 2.1 Selector Registry ──────────────┐
├── 2.2 Unified Selector ───────────────┼──→ Phase 4.2 Editor Integration
├── 2.3 Niche Selectors ────────────────┘

Phase 3 (Views) — Independent, can parallelize
├── 3.1 Graph View ← NoteGraphService
├── 3.2 Trends View
├── 3.3 Wiki View ← NoteGraphService
└── 3.4 Self View

Phase 4 (Integration)
├── 4.1 Matching Integration ← Phase 1
├── 4.2 Editor Integration ← Phase 2
├── 4.3 Settings Integration ← Phase 1,2,3
└── 4.4 Migration ← Phase 1,3

Core Infrastructure (Phase 3 enabler):
└── NoteGraphService (core/src/graph/) ← builds once, serves Graph + Wiki + future views
```

---

## ✅ Acceptance Criteria (Definition of Done)

### Phase 1 Complete When:
- [ ] Affinity properties parse, match, serialize, canonicalize
- [ ] Focus note creates, persists, influences matching weights
- [ ] Modality property works: notes tagged `desired`/`actual`, matcher respects it
- [ ] Tag hierarchy: child tags match parent constraints
- [ ] All Phase 1 tests pass (`pnpm test --filter=core`)

### Phase 2 Complete When:
- [ ] Selector registry loads, matches, falls back to unified
- [ ] Unified selector handles all property types + hierarchy + affinity
- [ ] Niche selectors register and activate for correct properties
- [ ] Advanced Selectors toggle works in Settings
- [ ] All Phase 2 tests pass (`pnpm test --filter=ui`)

### Phase 3 Complete When:
- [ ] Graph View: renders 1000 notes @ 60fps, filters work, export works
- [ ] Trends View: charts render, time filtering works, CSV export works
- [ ] Wiki View: wiki-links parse/render, backlinks accurate, navigation works
- [ ] Self View: key/circle/focus/reputation/capability/transport all functional
- [ ] All four views accessible from sidebar, responsive on mobile
- [ ] All Phase 3 tests pass (`pnpm test --filter=ui`)

### Phase 4 Complete When:
- [ ] Matching uses affinity + focus + modality in scores/explanations
- [ ] Editor uses unified selector, shows modality, edits affinity
- [ ] Settings controls terminology, selectors, view visibility
- [ ] Migration runs on existing workspace without data loss
- [ ] Full E2E test suite passes (`pnpm run test:e2e`)
- [ ] Screenshots updated (`pnpm run screenshots`)

---

## 📊 Effort Estimate

| Phase | Dev Days | Risk |
|-------|----------|------|
| 1: Data Model | 8 | Low (core types, well-tested patterns) |
| 2: Selectors | 5 | Medium (editor refactor, plugin API) |
| 3: Views | 15 | Medium-High (Graph perf, Wiki complexity) |
| 4: Integration | 5 | Low (wiring existing pieces) |
| **Total** | **~33 days** | **~6-7 weeks solo** |

**Parallelization:** Phase 3 views are independent — can split across 2-3 devs.

---

## 🧪 Test Strategy

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Core (types, matching, ontology, graph) | vitest | 90%+ |
| UI Components | vitest + React Testing Library | 80%+ |
| E2E Journeys | Playwright | 10 critical paths |
| Visual Regression | Playwright + pixelmatch | All 4 new views + editor |
| Performance | Custom benchmarks | Graph 1000 nodes < 100ms layout |

**Critical Test Cases:**
- Affinity: parsing, matching, serialization, implicit computation, propagation action
- Modality: dual-mode matching (modality + legacy role), label config
- NoteGraphService: incremental index, edge types, layout algorithms, backlinks
- Graph/Wiki Views: shared service consumption, filter/layout sync
- Self View: each tab functional, export/import roundtrip

---

## 📝 Notes for Implementers

1. **Affinity = bipolar** (-1..+1) is the key differentiator from simple weight. Enables trust network (Phase 5).
2. **Implicit vs Explicit affinity** are separate. Implicit = computed from peer affinities (depth 2, decay 0.5). User must explicitly invoke "Propagate Affinities" to promote implicit → explicit. No silent inference.
3. **Modality = binary** (`actual`/`desired`). Internal stable, UI labels configurable (default "Is"/"Could"). Legacy `request`/`offer` = aliases, dual-mode matcher. No "hypothetical" — planning uses `desired` with `priority` or `status:planning`.
4. **Graph View performance** is the highest technical risk. Use Web Worker + canvas from day 1. `NoteGraphService` is shared with Wiki View — build it first.
5. **Wiki View backlinks** need incremental index — don't recompute on every render. `NoteGraphService` provides this.
6. **Self View** touches security-critical code (keys, circles). Review by 2nd pair of eyes. Tabs are modular components for future extraction.
7. **Templates** live in Ontology View (Templates tab) + Editor "New from Template" picker. Same template registry.
8. **Migration** must be idempotent and reversible (backup first).

---

## 🔗 Related Documents

- `TODO.2.md` — Design decisions (P1-P5, Q1-Q6) and Netention Appendix L
- `README.md` — Current architecture and capabilities
- `README2.md` — Protocol spec (normative)
- `ARCHITECTURE.md` — Data flow and metaphors
- `AGENTS.md` — Coding conventions

---

*Generated from TODO.2.md decisions + Netention concept salvage. Ready for implementation.*