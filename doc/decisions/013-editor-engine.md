# Decision 013: Editor Engine — Tiptap 3.x (Stay)

**Status:** Accepted
**Date:** 2026-11-09
**Author:** System

## Context

After E15.1 (NoteDocument) and E15.2 (mark-based chips), we must decide the editor engine:

| Option | Description |
|--------|-------------|
| **Tiptap 3.x** | Current: React wrapper around ProseMirror; NodeView for chips; 12 files import `@tiptap/*` |
| **ProseMirror-direct** | Drop Tiptap; use PM core + custom React glue; full control over NodeView/MarkView |
| **Lexical** | Meta's editor; different architecture (no ProseMirror); would require full rewrite |

## Decision

**Stay with Tiptap 3.x** for the following reasons:

### 1. React 19 Compatibility ✅ Verified
- Tiptap 3.33 peer dep: `react ^17 || ^18 || ^19`
- Fast Refresh works with `@vitejs/plugin-react@5` (already configured)
- No breaking changes in upgrade from React 18 → 19

### 2. NoteDocument Alignment ✅ Complete
- E15.1/15.2 moved properties to **marks** (`PropertyMark` extension)
- Tiptap's `Mark` API maps 1:1 to `NoteDocument.propertyRefs`
- No NodeView complexity for chips anymore (marks use `ReactNodeViewRenderer`)

### 3. Bundle Size Acceptable
| Metric | Value |
|--------|-------|
| UI main chunk | ~2.2 MB (gz: ~660 KB) |
| Vendor chunk (includes Tiptap) | ~6.9 MB (gz: ~2.4 MB) |
| Tiptap-specific | ~300 KB gzipped |

Switching to PM-direct saves ~150 KB gz but adds 2-3 weeks of custom React glue work.

### 4. Feature Coverage
| Feature | Tiptap 3.x | PM-direct | Lexical |
|---------|------------|-----------|---------|
| Mark-based annotations | ✅ | ✅ (custom) | ⚠️ Different model |
| Bubble menu | ✅ | Custom | ✅ |
| Slash commands | ✅ | Custom | ✅ |
| Collaborative (Yjs) | ✅ `y-prosemirror` | ✅ `y-prosemirror` | ✅ `y-lexical` |
| React 19 | ✅ | ✅ | ✅ |
| Migration effort | 0 | 2-3 weeks | 4-6 weeks |

### 5. Current Code Investment
- 12 files use `@tiptap/*` (extensions, toolbar, bubble menu, hooks)
- PropertyMark, GhostTextExtension, mention configs all Tiptap-native
- Rewriting to PM-direct duplicates Tiptap's abstraction layer

## Measured Data (E15.3 Gate)

### Suggestion Authoring
- Property insertion: modal → `setMark('propertyMark', {...})` — works reliably
- Slash commands: `/` trigger → mention suggestions — functional
- Pattern/learned suggestions: integrated via `useOntologySuggestions` + `usePatternSuggestions`

### NodeView/Plugin Complexity
- **Before E15.2**: `PropertyExtension` (Node, `group:'inline', atom:true`) — fragile selection
- **After E15.2**: `PropertyMark` (Mark) + `PropertyChip` (ReactNodeViewRenderer) — stable
- No custom ProseMirror plugin code needed; Tiptap handles mark rendering

### Bundle Size
- Production build: main 2.2 MB, vendor 6.9 MB
- Tiptap contributes ~300 KB gzipped (starter-kit, extensions, bubble-menu, mention)
- No significant bloat from Tiptap itself

### React 19 Behavior
- Dev server: Fast Refresh works (HMR preserves editor state)
- Production preview: mounts without errors
- No `useSyncExternalStore` warnings
- Concurrent features compatible

## Rejected Alternatives

### ProseMirror-direct
| Pros | Cons |
|------|------|
| -150 KB bundle | 2-3 weeks custom React glue |
| Full control | Re-implement bubble menu, mentions, slash commands |
| No wrapper layer | Selection/IME/undo edge cases on us |
| | `y-prosemirror` integration same as Tiptap |

**Verdict**: Not worth the maintenance burden for marginal bundle savings.

### Lexical
| Pros | Cons |
|------|------|
| Modern architecture | 4-6 week full rewrite |
| React-native | Different mental model (no ProseMirror) |
| Good collab story | `y-lexical` less mature than `y-prosemirror` |
| | Property mark model doesn't map cleanly |

**Verdict**: Too invasive; blocks E2/E13 experiments.

## Consequences

### Positive
- **Zero migration** — existing editor code works
- **Focus on E15.4/E2** — CRDT/agent editing and experiment unblocked
- **Tiptap 3.x maintained** — active releases, React 19 support confirmed

### Negative
- **Vendor bundle size** — Tiptap + ProseMirror in vendor chunk (~2.4 MB gz)
- **Abstraction layer** — Tiptap adds indirection for advanced PM use cases
- **Vendor lock-in** — but ProseMirror API stable; can eject if needed

## Implementation Notes

- Keep `PropertyMark` as mark (not node) — aligns with NoteDocument
- Use `ReactNodeViewRenderer` for chip UI — stable selection/undo
- Monitor Tiptap 3.x releases for React 19 edge cases
- Eject to PM-direct only if: bundle size becomes critical blocker, or Tiptap blocks PM feature needed

## Related

- ADR 012: NoteDocument Schema
- E15.2 implementation: `ui/src/components/editor/PropertyMark.ts`, `usePropertyInsertion.ts`
- Next: E15.4 CRDT (`y-prosemirror`/Yjs), canonical CBOR, agent-native edits