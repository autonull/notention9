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
| **Views to Add** | Graph (explore connections), Self (identity hub) |
| **Contextual Actions** | Keep current (command palette + editor toolbar) |

---

## 📦 Phase 1: Data Model Extensions

*Foundation for everything else. No UI changes yet.*

### 1.1 Affinity Property Type + Modular Property Extractor (`core/src/notes/properties.ts`, `core/src/notes/propertyExtractor.ts`, `core/src/ontology/propertyTypes.ts`)

```typescript
// New typed value
interface AffinityValue {
  t: "affinity";
  v: number;        // -1.0 .. +1.0 (bipolar)
  target: string;   // tag IRI, ontology class IRI, or PeerID this affinity applies to
}

// PropertyOptions extensions
interface PropertyOptions {
  // ...existing
  affinity?: {
    bipolar: boolean;        // true = -1..+1, false = 0..1
    targetType: "tag" | "ontology_class" | "peer";
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

**KEY INSIGHT: Affinity IS the typing system.**
- **Focus profile** = set of affinities to tags/classes/peers (user's "type")
- **Note** = set of affinities to tags/classes (note's "type")
- **No separate `type` property needed** — affinity replaces it
- **Inheritance via tag hierarchy**: affinity to parent tag → implied affinity to children

**Property Type Changes:**
- Merge `integer` into `number` with `precision: 0`
- `quantity` = `number` + `unit` (kept separate for unit handling)
- Add `boolean`, `duration`, `select` as new types
- Add `url`, `markdown`, `timepoint`, `timerange` as display-only types (no matching)
- **Remove `type` property from ontology** — use affinity instead

**Tasks:**
- [ ] Add `affinity` to `TypedValue` union in `properties.ts`
- [ ] Add affinity parser in `parsing.ts` (syntax: `[tag:affinity:0.8]` or `[peer:affinity:-0.5]`)
- [ ] Add affinity matcher in `matching/matchers.ts` (cosine similarity for tag vectors, direct compare for peer/class affinity)
- [ ] Add affinity to ontology property types (`ontology.default.ts`: `dsn:affinity`)
- [ ] Update canonicalization for affinity type
- [ ] Add `boolean`, `duration`, `select` to `PropertyType` union
- [ ] Add `url`, `markdown`, `timepoint`, `timerange` as display-only types
- [ ] Merge `integer` → `number` with `precision: 0` in inference/parser
- [ ] Add `PropertyOptions.readonly`, `arity`, `numeric`, `selectOptions`
- [ ] Update UnifiedSelector to render readonly, arity hints, numeric slider, select dropdown
- [ ] **Modular property extractor: `PropertyExtractorStrategy` interface; register strategies (Heuristic, LLM-local, LLM-remote, Hybrid); Settings → Extraction Strategy dropdown (Heuristic / WebLLM / Remote API / Hybrid); Heuristic = default**
- [ ] **Remove `type` property from ontology; migrate existing `type:is:X` → `affinity:X` with strength 1.0**
- [ ] Tests: affinity parsing, matching, serialization; new types; readonly/arity UI; extractor strategy swap; affinity-as-type

### 1.2 Focus Profile Note (`core/src/notes/notes.ts`, `core/src/ontology/ontology.default.ts`)

```typescript
// New note type
interface FocusNote {
  type: "focus";
  role: "profile";
  author: PeerID;
  affinities: Property[];  // tag/class/peer affinities (user's "type") — EXPLICIT ONLY
  updated: number;
}
```

**Key Decision:** Focus = explicit user-set affinities only (tag/class/peer). **Peer sliders from circle members; shared within circle: full matrix visibility**. No filters. Implicit trust (peer-graph) is separate concept (Phase 5). No "Propagate Affinities" action. Affinity property type used for both Focus (user type) and Notes (note type).

**Tasks:**
- [ ] Add `focus` note type to ontology (domain: `identity`, class: `FocusProfile`)
- [ ] Add focus note CRUD in `notes.ts` (get/set user focus profile)
- [ ] Auto-create empty focus profile on first run
- [ ] Add focus-aware matching weight adjustment in `MatchingService.ts` (uses explicit affinities only)
- [ ] Persist focus note in local storage (separate from regular notes)
- [ ] Tests: focus note creation, matching integration

### 1.3 Real/Imaginary Role (`core/src/ontology/ontology.default.ts`, `core/src/notes/parsing.ts`)

**Terminology:** Internal = `actual` / `desired` (stable, binary). **Single field: `role`**. UI labels = configurable (default: "Is" / "Could"). No aliases.

```typescript
// Ontology update
const roleProperty = {
  key: "dsn:role",
  type: "enum",
  enum: ["actual", "desired"],
  default: "actual",
  uiLabels: { actual: "Is", desired: "Could" }  // overridable
};
```

**Tasks:**
- [ ] Add `dsn:role` property to default ontology with configurable `uiLabels`
- [ ] Update parser to recognize `role` shorthand (`[role:is:desired]`)
- [ ] Update matcher: reads `role` (actual/desired)
- [ ] Add UI label config in Settings → Terminology (preset: Is/Could, Fact/Intent, Actual/Desired, custom)
- [ ] Add role to note filter and query builder
- [ ] Tests: role parsing, matching, filtering, label config

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

## 📦 Phase 2: Selector Registry & Default Selector

*Extensible tag/property selector system. General-purpose default + niche selectors.*

### 2.1 Selector Registry (`ui/src/components/Editor/PropertySelectorRegistry.tsx`)

```typescript
interface PropertySelector {
  id: string;
  label: string;
  description: string;
  matches: (propertyKey: string, propertyDef: PropertyDef) => boolean;
  render: (props: SelectorProps) => React.ReactNode;
  priority: number;
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

**Matching logic:** Simple heuristic on `propertyDef` — checks `type`, `ui.widget`, key patterns. **Exact rules defined in implementation with test-driven development; start simple.** Registry picks highest priority match. Fallback = UnifiedSelector.

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
| `NeedSelector` | `dsn:need`, `dsn:requirement`, `role:desired` | Composing requests; shows compatible offer types |
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

## 📦 Phase 3: New Views

*Two new views. Each is a standalone route + sidebar entry.*

### 3.1 Graph View (`ui/src/components/views/GraphView.tsx`)

**Spec:** **Explore connections** — see how notes relate (matches, refs, ontology); filter; find clusters.
- Force-directed graph (d3-force or react-force-graph)
- Nodes = notes (filterable by tag, type, date, role)
- Edges = matches (solid), references/parents (dashed), ontology links (dotted), **affinities (properties referring to other objects/tags)**
- Click node → detail panel; double-click → open in Editor
- Filters: role, tag, date range, match score threshold
- Layout modes: force, hierarchical (by ontology), temporal, geographic
- Export: PNG, SVG, GraphML
- **No analytics panel** (Trends removed). Detail panel shows node properties + edges.

**Shared Dependency:** `core/src/graph/NoteGraphService.ts` — single source for:
- Backlink index (incremental, updated on note change)
- Edge computation:
  - **Matches**: desired↔actual pairs with satisfied constraints
  - **References/Parents**: explicit note links
  - **Ontology**: tag/class hierarchy links
  - **Affinities**: shared tag/class affinity → edge weighted by min(affinity_A, affinity_B); threshold 0.1
- Layout algorithms (force, hierarchical, temporal, geographic)
- Graph queries (neighbors, paths, clusters, centrality)

**Tasks:**
- [ ] Create `NoteGraphService` in core: incremental index, edge types, layout algorithms
- [ ] Create `GraphView` component with route `/graph`
- [ ] Add to sidebar navigation (icon: git-branch)
- [ ] Implement force-directed layout (simple efficient system first; swap to graph lib later)
- [ ] Add filter toolbar (role chips, tag multi-select, date range, score slider, **edge type toggles: matches/refs/ontology/affinities**)
- [ ] Add layout mode selector
- [ ] Add node detail panel (side drawer) — shows node properties + connected edges
- [ ] Add "Open in Editor" action
- [ ] Performance: canvas rendering; viewport culling; Web Worker for layout
- [ ] Tests: rendering, filtering, layout modes, performance

### 3.2 Wiki View — **REMOVED**

**Decision:** Notes view + Graph view cover interlinked browsing. Wiki View redundant. `[[wiki-link]]` syntax support can be added to Editor/Notes view if needed later.

**Shared Dependency:** `NoteGraphService` still provides backlink index for Graph View and potential future use.

**Tasks:** None for Wiki View. Backlink index built in `NoteGraphService` serves Graph View.

### 3.3 Self View (`ui/src/components/views/SelfView.tsx`)

**Spec:** **Identity Hub** — replaces avatar menu depth. Settings = app config (theme, AI, dev). Self = identity (Keys, Circles, Focus, Transport). **Reputation/Capabilities tabs hidden until Phase 5** (endorsements, delegations not yet implemented).
- Modular tabs (architected for future extraction to Settings/Trust/Agent/Network views).

| Tab | Content | Status | Future Extraction Target |
|-----|---------|--------|--------------------------|
| **Keys** | Nostr/Mesh/local keys, rotation, backup, NIP-07 | **Phase 3** | Settings → Identity |
| **Circles** | Create, manage members, circle keys, rotation | **Phase 3** | Settings → Circles |
| **Focus** | Visual affinity editor (tag cloud + peer sliders) | **Phase 3** | Dedicated Focus View |
| **Transport** | Relay/mesh status, sync indicators | **Phase 3** | Network View |
| **Reputation** | Endorsements given/received, blocks, trust graph | **Phase 5** | Trust View |
| **Capabilities** | Delegations granted/received, scope, expiry | **Phase 5** | Agent View |

**Tasks:**
- [ ] Create `SelfView` component with route `/self` (modular tab components)
- [ ] Add to sidebar (icon: user) — replaces avatar menu depth
- [ ] Key management UI (generate, rotate, backup, NIP-07 connect) — **Nostr secp256k1 primary; Mesh/Local as secondary tabs; extensible KeyProvider interface for future**
- [ ] Circle manager (create, invite, revoke, key rotation) — **Invites via Nostr DM (encrypted sealed event); admin-only rotation (simplest); non-admin modes later**
- [ ] Focus Profile editor (visual tag affinity cloud + peer affinity sliders)
- [ ] Transport status panel (live connection indicators)
- [ ] Encrypted export/import (age or libsodium)
- [ ] **Reputation/Capabilities tabs: hidden (conditional render until Phase 5)**
- [ ] Tests: key ops, circle ops, focus editing, export/import

---

## 📦 Phase 4: Integration & Polish

### 4.1 Matching Integration

**Tasks:**
- [ ] Wire affinity matching into `MatchingService` (affinity similarity scores for note-to-note affinity properties) — **BACKGROUND RELEVANCE ONLY**: affinities provide weak background signal; primary matching = satisfied properties (constraints vs facts)
- [ ] Wire focus profile into matching weights (focus tags boost matching) — **KEPT SEPARATE: Focus affinities are a separate signal; matching shows both scores; no automatic combination**
- [ ] Wire role into match explanations ("Desired X matches Actual Y")
- [ ] Add affinity to match result explanations
- [ ] Arity constraints: missing required (min>0) = unsatisfied constraint; excess over max = ignored (soft)
- [ ] Read-only properties: included in matching if present; never user-editable
- [ ] Tests: end-to-end matching with affinity + focus + role + arity + readonly

### 4.2 Editor Integration

**Tasks:**
- [ ] PropertyPopup → UnifiedSelector (Phase 2.2)
- [ ] Add role chip in editor (shows Actual/Desired)
- [ ] Add affinity slider for affinity properties (-1..+1 bipolar)
- [ ] Add readonly display (chips with lock icon, no edit)
- [ ] Add arity hints (required badge, max chips warning)
- [ ] Add numeric slider for number/quantity with unit + precision
- [ ] Add select dropdown for select properties
- [ ] Add "Convert to Desired/Actual" action in editor menu
- [ ] Tests: editor with new property types, role toggle, readonly, arity, numeric, select

### 4.3 Settings Integration

**Tasks:**
- [ ] Settings → "Advanced Selectors" toggle (enables niche selectors)
- [ ] Settings → "Terminology": preset labels (Is/Could, Fact/Intent, Actual/Desired, custom)
- [ ] Settings → Focus Profile editor link (opens Self View → Focus tab)
- [ ] Settings → Graph/Self view toggles
- [ ] Settings → "Extraction Strategy": dropdown (Heuristic / WebLLM / Remote API / Hybrid)
- [ ] Tests: settings persist, affect UI correctly

### 4.4 Backward Compat (No Migration)

**Tasks:**
- [ ] Backward compat: `request`/`offer` work as aliases for `role:desired`/`role:actual`
- [ ] Backward compat: `type` property still parses but deprecated; new code uses affinity
- [ ] Tests: legacy notes still match, parse, display correctly

---

## 📦 Phase 4.5: Mobile Polish

*Separate phase: desktop-first views → mobile-responsive + touch + PWA.*

**Tasks:**
- [ ] Bottom navigation bar (replaces sidebar on <640px): Notes, Graph, Self, **+ (action menu: Quick Capture / New from Template / Scan QR / Voice Note)**
- [ ] Touch targets: 48dp minimum; swipe gestures (swipe back, swipe between views)
- [ ] Responsive layouts: Graph View (touch pan/zoom), Self View (tabbed mobile)
- [ ] PWA install prompt, offline indicator, sync status badge
- [ ] Voice input: Editor mic button (Web Speech API + WebLLM Whisper fallback)
- [ ] Global hotkey system: configurable shortcuts (new note, quick capture, find matches, toggle views, publish)
- [ ] Accessibility: ARIA labels, focus management, screen reader support, high contrast mode
- [ ] Tests: mobile viewports, touch interactions, PWA install, voice/hotkeys, a11y audit

---

## 📦 Phase 5: Stretch (Post-TODO.3)

*Not in immediate plan but designed for:*

| Feature | Dependency |
|---------|------------|
| Sealed visibility (P3) | Phase 1 affinity + focus for trust scoring |
| Signed transitions (P2) | Phase 1 role for transition typing |
| Content-addressed notes (P1) | Independent; enables dedupe in Graph view |
| WebRTC transport (Netention) | Direct browser P2P (text/audio/video/file); signaling via Nostr/mesh |
| Agent autonomy | Phase 1 focus + affinity for intent prediction |
| CRDT sync | Phase 3 Graph view NoteGraphService structure |
| Anonymous scope | Cryptographic anonymity guarantees (ZK, mixnets) |
| Multiple identities/personas | If circles + subkeys prove insufficient |
| Advanced property types (sketch, timeseries, tagcloud, object ref) | User demand; plugin-extensible |
| Implicit trust (peer-graph affinity propagation) | Phase 5; builds on circle-shared peer affinities |
| Template marketplace / sharing | Ontology-as-template system; share ontology modules |

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
├── 3.1 Graph View (explore connections) ← NoteGraphService
├── 3.2 Wiki View — REMOVED
└── 3.3 Self View (identity hub)

Phase 4 (Integration)
├── 4.1 Matching Integration ← Phase 1
├── 4.2 Editor Integration ← Phase 2
├── 4.3 Settings Integration ← Phase 1,2,3
└── 4.4 Migration ← Phase 1,3

Core Infrastructure (Phase 3 enabler):
└── NoteGraphService (core/src/graph/) ← builds once, serves Graph + future views
```

---

## ✅ Acceptance Criteria (Definition of Done)

### Phase 1 Complete When:
- [ ] Affinity properties parse, match, serialize, canonicalize
- [ ] Focus note creates, persists, influences matching weights
- [ ] Role property works: notes tagged `desired`/`actual`, matcher respects it
- [ ] Tag hierarchy: child tags match parent constraints
- [ ] New property types: boolean, duration, select, url, markdown, timepoint, timerange parse/display
- [ ] Numeric unification: integer → number (precision=0); quantity = number+unit
- [ ] PropertyOptions: readonly (editor shows, no edit), arity (UI hints), numeric (slider/unit), selectOptions (dropdown)
- [ ] Backward compat: `request`/`offer` aliases work; `type` property parses but deprecated
- [ ] All Phase 1 tests pass (`pnpm test --filter=core`)

### Phase 2 Complete When:
- [ ] Selector registry loads, matches, falls back to unified
- [ ] Unified selector handles all property types + hierarchy + affinity
- [ ] Niche selectors register and activate for correct properties (test-driven matching rules)
- [ ] Advanced Selectors toggle works in Settings
- [ ] All Phase 2 tests pass (`pnpm test --filter=ui`)

### Phase 3 Complete When:
- [ ] Graph View: renders 1000 notes @ 60fps, filters work, export works, detail panel shows node properties + edges
- [ ] Self View: key/circle/focus/transport all functional (reputation/capabilities hidden)
- [ ] Both views accessible from sidebar, responsive on mobile
- [ ] All Phase 3 tests pass (`pnpm test --filter=ui`)

### Phase 4 Complete When:
- [ ] Matching uses affinity + focus + role in scores/explanations
- [ ] Editor uses unified selector, shows role, edits affinity
- [ ] Settings controls terminology, selectors, view visibility, extraction strategy
- [ ] Backward compat: legacy notes parse, match, display
- [ ] Full E2E test suite passes (`pnpm run test:e2e`)
- [ ] Screenshots updated (`pnpm run screenshots`)

---

## 📊 Phase Order & Dependencies

| Phase | Scope | Risk |
|-------|-------|------|
| 1: Data Model | Affinity, Focus, Role, Hierarchy, Property system | Low-Medium |
| 2: Selectors | Registry, Unified Selector, 7 niche selectors | Medium |
| 3: Views | Graph, Self (parallel) | Medium-High |
| 4: Integration | Matching, Editor, Settings, Backward compat | Low |
| 4.5: Mobile Polish | Bottom nav, touch, PWA, voice, hotkeys, a11y | Medium |

**Parallelization:** Phase 3 views (Graph, Self) independent — can split across devs. Mobile Polish can start after Graph View desktop works.

---

## 🧪 Test Strategy

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Core (types, matching, ontology, graph) | vitest | 90%+ |
| UI Components | vitest + React Testing Library | 80%+ |
| E2E Journeys | Playwright | 10 critical paths |
| Visual Regression | Playwright + pixelmatch | Graph, Self, Editor |
| Performance | Custom benchmarks | Graph 1000 nodes < 100ms layout |

**Critical Test Cases:**
- Affinity: parsing, matching, serialization (no implicit)
- Role: matching (actual/desired), label config, capture inference
- NoteGraphService: incremental index, edge types (matches, refs, ontology, affinities), layout algorithms
- Graph View: filter/layout sync, detail panel, performance
- Self View: 4 visible tabs (keys, circles, focus, transport) functional, export/import roundtrip

---

## 📝 Notes for Implementers

1. **Affinity = bipolar** (-1..+1) is the key differentiator from simple weight. Enables trust network (Phase 5).
2. **Affinity = typing system**. Focus = explicit user-set affinities to tags/classes/peers (set in Self View → Focus tab: tag/class affinity cloud + **peer sliders from circle members, shared within circle: full matrix visibility**). Notes carry affinities as their "type". Implicit trust (peer-graph) is separate concept (Phase 5). No "Propagate Affinities" action. No separate `type` property — affinity replaces it. Inheritance via tag hierarchy: affinity to parent → implied to children.
3. **Role = binary** (`actual`/`desired`). **Single field: `role`** (not `modality`). Internal stable, UI labels configurable (default "Is"/"Could"). Legacy `request`/`offer` = aliases. No "hypothetical" — planning uses `desired` with `priority` or `status:planning`.
4. **Capture flow**: Quick capture runs property extractor. **Desired inferred by presence of constraint operators** (`lt`, `gt`, `range`, `near`, `approx`) on extracted properties. Equality (`eq`, `is`, `inc`) = actual. Extractor uses ontology to map language → property keys. If constraint operators found → role=desired, else actual. Editor has "Convert to Desired/Actual" action. **Extractor strategy configurable in Settings (Heuristic/WebLLM/Remote/Hybrid); Heuristic default**.
5. **Property type simplification**: `integer` merged into `number` (precision=0). `quantity` = `number` + `unit` (kept separate for unit handling). New types: `boolean`, `duration`, `select`, `url`, `markdown`, `timepoint`, `timerange` (display-only).
6. **Arity = soft constraints only**. `PropertyOptions.arity.min/max` → UI hints (required badge, max warning). Matcher: missing required = unsatisfied; excess = ignored. No hard validation.
7. **Read-only = property option**. `PropertyOptions.readonly=true` → editor shows chips with lock icon, no edit. Matcher can still use.
8. **Graph View = explore connections**. Shows all notes; edges = matches (only when desired+actual pairs exist), references/parents, ontology links, **affinities (properties referring to other objects/tags)**. Filter; find clusters. No analytics panel, no matchmaking, no creation from graph. Detail panel shows node properties + connected edges.
9. **Wiki View removed**. Notes + Graph cover interlinked browsing. `[[wiki-link]]` syntax can be added to Editor later if needed.
10. **Graph View performance** is the highest technical risk. Use Web Worker + canvas from day 1. `NoteGraphService` built first.
11. **Self View** = identity hub (Keys, Circles, Focus, Transport — Reputation/Capabilities hidden until Phase 5). Settings = app config (theme, AI, dev). Review by 2nd pair of eyes.
12. **Templates removed** — subsumed by Ontology system. Ontology classes = templates; instantiation = new note with class affinities.
13. **Ontology = evolvable, fluid, modular**. No fixed "right" ontology. Simulator = tool for developers to experiment. System designed for ontological change: add/remove domains, classes, properties without breaking existing notes. Affinity + hierarchy enable gradual evolution.
13. **Multiple identities skipped**. Circles + subkeys cover persona contexts.
14. **Anonymous scope deferred**. Requires crypto guarantees (ZK, mixnets).
15. **Plugin/skill systems kept separate but consistent**: Agent skills (MCP), UI plugins (metaphors), note-defined skills — three registries with shared base interface.
16. **Voice input**: Editor mic button only (Web Speech API + WebLLM Whisper fallback). Phase 4.5.
17. **Global hotkeys**: Configurable shortcuts for capture, matching, views, publish. Phase 4.5.
18. **Mobile Polish = separate Phase 4.5**: Bottom nav (Notes, Graph, Self, +), action menu (+ = Quick Capture / New from Template / Scan QR / Voice Note), touch targets, swipe gestures, PWA install, offline sync UI, a11y.
19. **Migration** must be idempotent and reversible (backup first).

---

## 🔗 Related Documents

- `TODO.2.md` — Design decisions (P1-P5, Q1-Q6) and Netention Appendix L
- `README.md` — Current architecture and capabilities
- `README2.md` — Protocol spec (normative)
- `ARCHITECTURE.md` — Data flow and metaphors
- `AGENTS.md` — Coding conventions

---

*Generated from TODO.2.md decisions + Netention concept salvage. Ready for implementation.*

---

## 📜 Process Note: Iterative Grilling Method

**This plan was derived through an iterative "grilling" process:**

1. **Initial broad grill** (P1-P5, Q1-Q6 from TODO.2.md) → protocol/product direction decisions
2. **Netention concept salvage** (Appendix L) → Focus, nobject, Real/Imaginary, Tag Selectors, Views, Actions
3. **Targeted grills** on specific ambiguities:
   - Affinity bipolar vs unipolar, implicit vs explicit
   - Modality binary vs ternary, terminology, capture inference
   - Views: Graph analytics, Wiki merge, Self vs Settings
   - Mobile: bottom nav, voice, hotkeys
   - Property types: simplification, arity, readonly
   - Plugin systems: unify vs separate
4. **Convergence grills** to catch implementation-level ambiguities:
   - Capture flow concrete example
   - Affinity boost mechanics
   - Focus peer sources
   - Selector matching logic
   - Graph scale virtualization
   - Extractor updates for new types
   - Migration conflict resolution

**Key insight:** This process is **non-deterministic**. Running it again with different question framing, different emphasis, or different "user" answers would produce a **different but equally valid architecture**. The grilling reveals the decision space; the answers choose a path through it.

**Reproducibility:** To re-derive or audit decisions, re-run the grills in `TODO.2.md` and this file's question history. Each answer is a commitment that narrows the space.

**When to re-grill:** When implementation reveals new ambiguities, when user feedback contradicts assumptions, or when Phase 5 stretch goals become Phase 1 priorities.