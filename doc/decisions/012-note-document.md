# Decision 012: NoteDocument — Structured Canonical Note Representation

**Status:** Accepted
**Date:** 2026-11-09
**Author:** System

## Context

Historically, Notention used HTML as the canonical note representation:
- `Note.content` = HTML string with inline `<span data-type="property">` elements
- Properties derived by parsing HTML on every save/load (`parseProperties`)
- Double representation: HTML markup + `Property[]` array, synced via string surgery
- Full-content reparse per keystroke in editor
- CRDT/agent paths all begin by parsing HTML

This architecture causes:
1. **Fragile chip UX**: inline atoms (`group:'inline', atom:true`) break selection/move/backspace
2. **Performance**: full HTML reparse on every edit
3. **No progressive disclosure**: no canonical/raw view, no parser debugger
4. **Migration risk**: all persistence paths (CBOR, CRDT, agent) depend on HTML parsing

## Decision

Adopt **NoteDocument** as the single source of truth. HTML becomes export-only.

### Schema

```typescript
// core/src/types/noteDocument.ts
interface NoteDocument {
  version: 1;
  blocks: Block[];           // paragraph | heading | list | quote | code
  propertyRefs: PropertyRef[]; // stable id → inline annotation (not markup)
  properties: Property[];    // deterministic projection from propertyRefs
  title: string;
  tags: string[];
}

interface Block {
  id: string;                // stable ID for CRDT
  type: 'paragraph' | 'heading' | 'list' | 'quote' | 'code';
  level?: number;            // 1-6 for headings
  listType?: 'bullet' | 'ordered';
  content: TextRun[];        // text + marks
}

interface TextRun {
  text: string;
  marks?: Mark[];            // bold, italic, strike, code, link, propertyRef
}

interface Mark {
  type: MarkType;
  attrs?: Record<string, unknown>;
  propertyId?: string;       // for propertyRef marks
}

interface PropertyRef {
  id: string;                // matches Property.key
  anchor: { blockIndex: number; offset: number };
  length: number;
}
```

### Note Type Extension

```typescript
// core/src/types/domain.ts
interface Note {
  // ... existing fields ...
  document?: NoteDocument;   // canonical JSON
  contentHtml?: string;      // export-only (Nostr, clipboard, preview)
}
```

### Adapters (core/src/notes/noteDocumentAdapter.ts)

| Function | Purpose |
|----------|---------|
| `noteDocumentToPM` / `pmToNoteDocument` | ProseMirror JSON ⇄ NoteDocument (lossless) |
| `htmlToNoteDocument` | Legacy HTML import (one-time migration) |
| `noteDocumentToHtml` | Export for Nostr/clipboard/preview |

### Pipelines (core/src/notes/notes.ts)

- `noteToNoteDocument` / `noteDocumentToNote` — legacy compatibility
- `NoteDocumentPipeline` — structured operations (`updateFromPM`, `toPM`, `toHtml`, `upsertProperty`, `removeProperty`, `create`)

## Consequences

### Positive
- **Lossless structured persistence** — JSON is canonical; no parse/serialize loss
- **CRDT-ready** — stable block IDs + propertyRefs enable `y-prosemirror`/`Yjs`
- **Agent-native editing** — agents manipulate `NoteDocument` directly, no HTML parsing
- **Canonical identity** — `PropertyRef.id` stable across edits
- **Real progressive disclosure** — canonical/raw views, parser debugger possible
- **Engine independence** — Tiptap/ProseMirror/Lexical all render `NoteDocument`
- **No per-keystroke reparse** — editor works on structured model

### Negative
- **Migration effort** — existing notes need HTML → NoteDocument import
- **Round-trip tests required** — HTML ⇄ NoteDocument must be lossless for property spans
- **Nostr tag parity** — tags derive from `properties` projection; must verify

## Migration Strategy

1. **Import on load**: `htmlToNoteDocument(note.content, note.properties)` for legacy notes
2. **Persist both**: `document` (canonical) + `contentHtml` (export) + `properties` (compat)
3. **Lazy migration**: notes without `document` get converted on first edit
4. **Validation**: round-trip tests for property span preservation

## Testing

- `noteDocumentAdapter.test.ts` — PM JSON ⇄ NoteDocument round-trip
- `htmlToNoteDocument.test.ts` — property span preservation from HTML
- `noteDocumentToHtml.test.ts` — Nostr tag parity (`properties` → HTML tags)

## Related

- ADR 013: Editor Engine Decision (Tiptap / PM-direct / Lexical)
- E15.1 implementation: `core/src/types/noteDocument.ts`, `core/src/notes/noteDocumentAdapter.ts`