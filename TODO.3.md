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
| **Views to Add** | Graph (+ Analytics), Wiki, Self (Templates = Ontology view) |
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

// PropertyOptions extensions
interface PropertyOptions {
  // ...existing
  affinity?: {
    bipolar: boolean;        // true = -1..+1, false = 0..1
    targetType: "note" | "tag" | "peer" | "ontology_class";
  };
  readonly?: boolean;        // computed/derived; editor shows but no edit
  arity?: { min: number; max: number };  // soft constraints: UI hints only
  numeric?: {                  // for number/quantity unification
    unit?: string;             // "count", "USD", "m", "kg", etc.
    precision?: number;        // 0 = integer, >0 = decimal places
    min?: number; max?: number; // soft range for slider
  };
  selectOptions?: string[];    // for select/enum UI
}
```

**Property Type Changes:**
- Merge `integer` into `number` with `precision: 0`
- `quantity` = `number` + `unit` (kept separate for unit handling)
- Add `boolean`, `duration`, `select` as new types
- Add `url`, `markdown`, `timepoint`, `timerange` as display-only types (no matching)

**Tasks:**
- [ ] Add `affinity` to `TypedValue` union in `properties.ts`
- [ ] Add affinity parser in `parsing.ts` (syntax: `[tag:affinity:0.8]` or `[peer:affinity:-0.5]`)
- [ ] Add affinity matcher in `matching/matchers.ts` (cosine similarity for tag vectors, direct compare for peer affinity)
- [ ] Add affinity to ontology property types (`ontology.default.ts`: `dsn:affinity`)
- [ ] Update canonicalization for affinity type
- [ ] Add `boolean`, `duration`, `select` to `PropertyType` union
- [ ] Add `url`, `markdown`, `timepoint`, `timerange` as display-only types
- [ ] Merge `integer` → `number` with `precision: 0` in inference/parser
- [ ] Add `PropertyOptions.readonly`, `arity`, `numeric`, `selectOptions`
- [ ] Update UnifiedSelector to render readonly, arity hints, numeric slider, select dropdown
- [ ] Tests: affinity parsing, matching, serialization; new types; readonly/arity UI

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
- Strength/affinity slider for affinity properties (-1..+1 bipolar)
- Boolean toggle for boolean properties
- Duration picker for duration properties
- Select dropdown for select properties (uses `selectOptions`)
- Numeric slider for number/quantity (uses `numeric.unit`, `numeric.precision`, `numeric.min/max`)
- Enum pills for enum properties
- Date/time picker for temporal
- Map picker for geo
- URL input for url properties
- Markdown editor for markdown properties
- Readonly indicator (lock icon, no edit controls)
- Arity hints: required badge (min>0), max chips warning (max set)
- Multi-select with chips

**Tasks:**
- [ ] Refactor `PropertyPopup` → `UnifiedSelector` component
- [ ] Add tree/hierarchy mode (collapsible ontology tree)
- [ ] Add affinity slider (-1..+1 bipolar, 0..1 unipolar)
- [ ] Add boolean toggle, duration picker, select dropdown
- [ ] Add numeric slider with unit/precision/min/max
- [ ] Add URL input, markdown editor
- [ ] Add readonly indicator, arity hints
- [ ] Add "recent values" and "suggested values" sections
- [ ] Keyboard navigation (arrow keys, enter, escape)
- [ ] Tests: all property types, keyboard, hierarchy, readonly, arity

### 2.3 Niche Selectors (Register but Hidden by Default)

| Selector | Matches | Use Case |
|----------|---------|----------|
| `NeedSelector` | `dsn:need`, `dsn:requirement`, `modality:desired` | Composing requests; shows compatible offer types |
| `IdentitySelector` | `dsn:peer`, `dsn:identity`, `kind:ref:peer` | Picking people; shows trust/endorsement |
| `EmotionSelector` | `dsn:feeling`, `dsn:mood`, `type:affinity` | Visual emoji/scale for subjective affinity |
| `LocationSelector` | `dsn:location`, `type:geo` | Map-based place picker |
| `TemplateSelector` | `dsn:template`, `role:template` | One-click template instantiation |
| `TimeRangeSelector` | `type:timerange`, `type:timepoint` | Visual timeline picker for scheduling |
| `MarkdownSelector` | `type:markdown` | Rich text editor with live preview |

**Tasks:**
- [ ] Implement each selector as separate component
- [ ] Register with appropriate `matches()` predicates
- [ ] Add to Settings → "Advanced Selectors" toggle (off by default)
- [ ] Tests: each selector matches correct properties

---

## 📦 Phase 3: New Views (Week 3-5)

*Four new views. Each is a standalone route + sidebar entry.*

### 3.1 Graph View (`ui/src/components/views/GraphView.tsx`)

**Spec:** Unified exploration + analytics view.
- Force-directed graph (d3-force or react-force-graph)
- Nodes = notes (filterable by tag, type, date, modality)
- Edges = matches (solid), references/parents (dashed), ontology links (dotted)
- Click node → detail panel; double-click → open in Editor
- Filters: modality, tag, date range, match score threshold
- Layout modes: force, hierarchical (by ontology), temporal, geographic
- **Analytics Panel (collapsible sidebar):** Tag frequency, match rates, affinity distribution, modality balance, property type distribution, top matchers
- Export: PNG, SVG, GraphML

**Shared Dependency:** `core/src/graph/NoteGraphService.ts` — single source for:
- Backlink index (incremental, updated on note change)
- Edge computation (matches, references, ontology, affinity)
- Layout algorithms (force, hierarchical, temporal, geographic)
- Graph queries (neighbors, paths, clusters, centrality)
- Analytics aggregations (for panel)

**Tasks:**
- [ ] Create `NoteGraphService` in core: incremental index, edge types, layout algorithms, analytics
- [ ] Create `GraphView` component with route `/graph`
- [ ] Add to sidebar navigation (icon: git-branch)
- [ ] Implement force-directed layout with Web Worker for large graphs
- [ ] Add filter toolbar (modality chips, tag multi-select, date range, score slider)
- [ ] Add layout mode selector
- [ ] Add node detail panel (side drawer) — **also serves as analytics panel when no node selected**
- [ ] Add "Open in Editor" action
- [ ] Performance: virtualize >500 nodes; canvas rendering
- [ ] Tests: rendering, filtering, layout modes, analytics panel, performance

### 3.2 Wiki View (`ui/src/components/views/WikiView.tsx`)

**Spec:** Interlinked note browser (read-optimized). **Architected to share NoteGraphService with Graph View; can merge later as Graph View "wiki layout mode".**
- Three-pane layout (resizable): Left (search + tag filter + backlinks), Center (rendered content + property chips), Right (outgoing links + incoming backlinks + graph minimap)
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
- [ ] **Architect for future merge:** Wiki components import from shared `GraphComponents`; layout mode switchable
- [ ] Tests: link parsing, backlink index, navigation

### 3.3 Self View (`ui/src/components/views/SelfView.tsx`)

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
- [ ] Arity constraints: missing required (min>0) = unsatisfied constraint; excess over max = ignored (soft)
- [ ] Read-only properties: included in matching if present; never user-editable
- [ ] Tests: end-to-end matching with affinity + focus + modality + arity + readonly

### 4.2 Editor Integration

**Tasks:**
- [ ] PropertyPopup → UnifiedSelector (Phase 2.2)
- [ ] Add modality chip in editor (shows Actual/Desired)
- [ ] Add affinity slider for affinity properties (-1..+1 bipolar)
- [ ] Add readonly display (chips with lock icon, no edit)
- [ ] Add arity hints (required badge, max chips warning)
- [ ] Add numeric slider for number/quantity with unit + precision
- [ ] Add select dropdown for select properties
- [ ] Add "Convert to Desired/Actual" action in editor menu
- [ ] Tests: editor with new property types, modality toggle, readonly, arity, numeric, select

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

## 📦 Phase 4.5: Mobile Polish (Week 6-7)

*Separate phase: desktop-first views → mobile-responsive + touch + PWA.*

**Tasks:**
- [ ] Bottom navigation bar (replaces sidebar on <640px): Notes, Graph, Wiki, Self, + (capture)
- [ ] Touch targets: 48dp minimum; swipe gestures (swipe back, swipe between views)
- [ ] Responsive layouts: Graph View (touch pan/zoom), Wiki View (collapsible panes), Self View (tabbed mobile)
- [ ] PWA install prompt, offline indicator, sync status badge
- [ ] Voice input: Web Speech API in Editor/Composer; fallback to WebLLM Whisper (offline)
- [ ] Global hotkey system: configurable shortcuts (new note, quick capture, find matches, toggle views, publish)
- [ ] Accessibility: ARIA labels, focus management, screen reader support, high contrast mode
- [ ] Tests: mobile viewports, touch interactions, PWA install, voice/hotkeys, a11y audit

---

## 📦 Phase 5: Stretch (Post-TODO.3)

*Not in immediate plan but designed for:*

| Feature | Dependency |
|---------|------------|
| Sealed visibility (P3) | Phase 1 affinity + focus for trust scoring |
| Signed transitions (P2) | Phase 1 modality for transition typing |
| Content-addressed notes (P1) | Independent; enables dedupe in Graph view |
| WebRTC transport (Netention) | Direct browser P2P (text/audio/video/file); signaling via Nostr/mesh |
| Agent autonomy | Phase 1 focus + affinity for intent prediction |
| CRDT sync | Phase 3 Wiki view backlink index structure |
| Anonymous scope | Cryptographic anonymity guarantees (ZK, mixnets) |
| Multiple identities/personas | If circles + subkeys prove insufficient |
| Advanced property types (sketch, timeseries, tagcloud, object ref) | User demand; plugin-extensible |

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
├── 3.1 Graph View (+ Analytics Panel) ← NoteGraphService
├── 3.2 Wiki View ← NoteGraphService (architected for future merge as Graph layout mode)
└── 3.3 Self View

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
- [ ] New property types: boolean, duration, select, url, markdown, timepoint, timerange parse/display
- [ ] Numeric unification: integer → number (precision=0); quantity = number+unit
- [ ] PropertyOptions: readonly (editor shows, no edit), arity (UI hints), numeric (slider/unit), selectOptions (dropdown)
- [ ] All Phase 1 tests pass (`pnpm test --filter=core`)

### Phase 2 Complete When:
- [ ] Selector registry loads, matches, falls back to unified
- [ ] Unified selector handles all property types + hierarchy + affinity
- [ ] Niche selectors register and activate for correct properties
- [ ] Advanced Selectors toggle works in Settings
- [ ] All Phase 2 tests pass (`pnpm test --filter=ui`)

### Phase 3 Complete When:
- [ ] Graph View: renders 1000 notes @ 60fps, filters work, export works, analytics panel shows tag freq/match rates/affinity dist/modality balance
- [ ] Wiki View: wiki-links parse/render, backlinks accurate, navigation works, three-pane layout responsive
- [ ] Self View: key/circle/focus/reputation/capability/transport all functional
- [ ] All three views accessible from sidebar, responsive on mobile
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
| 1: Data Model | 10 | Low-Medium (core types, new property system, matcher updates) |
| 2: Selectors | 6 | Medium (editor refactor, plugin API, 7 niche selectors) |
| 3: Views | 12 | Medium-High (Graph perf, Wiki complexity) |
| 4: Integration | 5 | Low (wiring existing pieces) |
| 4.5: Mobile Polish | 8 | Medium (touch, PWA, voice, hotkeys, a11y) |
| **Total** | **~41 days** | **~8-9 weeks solo** |

**Parallelization:** Phase 3 views (Graph, Wiki, Self) independent — can split across 2-3 devs. Mobile Polish can start after Graph View desktop works.

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
4. **Property type simplification**: `integer` merged into `number` (precision=0). `quantity` = `number` + `unit` (kept separate for unit handling). New types: `boolean`, `duration`, `select`, `url`, `markdown`, `timepoint`, `timerange` (display-only).
5. **Arity = soft constraints only**. `PropertyOptions.arity.min/max` → UI hints (required badge, max warning). Matcher: missing required = unsatisfied; excess = ignored. No hard validation.
6. **Read-only = property option**. `PropertyOptions.readonly=true` → editor shows chips with lock icon, no edit. Matcher can still use.
7. **Graph View = exploration + analytics**. Analytics panel (collapsible sidebar) replaces separate Trends View. Shows tag freq, match rates, affinity dist, modality balance, property types, top matchers.
8. **Wiki View architected for merge**. Components shared with Graph View; can become Graph View "wiki layout mode" later. `NoteGraphService` provides backlinks, minimap.
9. **Graph View performance** is the highest technical risk. Use Web Worker + canvas from day 1. `NoteGraphService` shared with Wiki — build first.
10. **Self View** touches security-critical code (keys, circles). Review by 2nd pair of eyes. Tabs modular for future extraction.
11. **Templates** in Ontology View (Templates tab) + Editor "New from Template" picker. Same registry.
12. **Multiple identities skipped**. Circles + subkeys cover persona contexts.
13. **Anonymous scope deferred**. Requires crypto guarantees (ZK, mixnets).
14. **Plugin/skill systems kept separate but consistent**: Agent skills (MCP), UI plugins (metaphors), note-defined skills — three registries with shared base interface.
15. **Voice input**: Web Speech API (online) + WebLLM Whisper (offline) in Editor/Composer. Phase 4.5.
16. **Global hotkeys**: Configurable shortcuts for capture, matching, views, publish. Phase 4.5.
17. **Mobile Polish = separate Phase 4.5**: Bottom nav, touch targets, swipe gestures, PWA install, offline sync UI, a11y.
18. **Migration** must be idempotent and reversible (backup first).

---

## 🔗 Related Documents

- `TODO.2.md` — Design decisions (P1-P5, Q1-Q6) and Netention Appendix L
- `README.md` — Current architecture and capabilities
- `README2.md` — Protocol spec (normative)
- `ARCHITECTURE.md` — Data flow and metaphors
- `AGENTS.md` — Coding conventions

---

*Generated from TODO.2.md decisions + Netention concept salvage. Ready for implementation.*