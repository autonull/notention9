import { useMemo, useRef } from 'react';
import type { Note, SortOrder } from '@notention/core';
import { getTextFromHtml, parseProperties } from '@notention/core';
import { checkConstraint } from '../utils/matching';
import { GeoCoords, haversineDistance, parseGeoFromValues } from '@notention/core';
import { isSpatialKey, isTemporalKey } from '@notention/core';
import { parseDateFromValues } from '@notention/core';

interface NoteMetadata {
  textContent: string;
  lowerTitle: string;
  lowerTags: string[];
  lowerProps: { key: string; values: string[] }[];
  updatedAt: string;
  minDateTimestamp: number | null;
  location: GeoCoords | null;
}

// Helper to get sort metadata
const augmentNote = (note: Note): NoteMetadata => {
  const textContent = getTextFromHtml(note.content).toLowerCase();
  const lowerTitle = note.title.toLowerCase();
  const lowerTags = note.tags.map((t) => t.toLowerCase());
  const lowerProps =
    note.properties?.map((p) => ({
      key: p.key.toLowerCase(),
      values: p.values.map((v) => v.toLowerCase()),
    })) || [];

  // Extract Temporal Data
  let minDateTimestamp: number | null = null;
  const temporalProps = note.properties?.filter(p => isTemporalKey(p.key));
  if (temporalProps && temporalProps.length > 0) {
      const timestamps = temporalProps
          .map(p => parseDateFromValues(p.values)?.getTime())
          .filter((t): t is number => t !== undefined && !isNaN(t));
      if (timestamps.length > 0) {
          minDateTimestamp = Math.min(...timestamps);
      }
  }

  // Extract Spatial Data
  let location: GeoCoords | null = null;
  const spatialProps = note.properties?.filter(p => isSpatialKey(p.key));
  if (spatialProps && spatialProps.length > 0) {
      // Use the first valid location found
      for (const p of spatialProps) {
          const loc = parseGeoFromValues(p.values);
          if (loc) {
              location = loc;
              break;
          }
      }
  }

  return {
    textContent,
    lowerTitle,
    lowerTags,
    lowerProps,
    updatedAt: note.updatedAt,
    minDateTimestamp,
    location
  };
};

export const useSortedFilteredNotes = (
  notes: Note[],
  searchTerm: string,
  sortOrder: SortOrder,
  showTrash: boolean = false,
  userLocation: GeoCoords | null = null
) => {
  const cacheRef = useRef<Record<string, NoteMetadata>>({});

  // Augment notes with searchable metadata, using a cache to avoid expensive DOM operations
  const notesWithMetadata = useMemo(() => {
    // Filter by deletion status before processing metadata
    const activeNotes = notes.filter(n => showTrash ? !!n.deletedAt : !n.deletedAt);

    const cache = cacheRef.current;
    return activeNotes.map((note) => {
      const cached = cache[note.id];
      // Only re-parse if the note has been updated
      if (cached && cached.updatedAt === note.updatedAt) {
        return { ...note, ...cached };
      }

      const metadata = augmentNote(note);
      cache[note.id] = metadata;

      return { ...note, ...metadata };
    });
  }, [notes, showTrash]);

  const filteredNotes = useMemo(() => {
    if (!searchTerm.trim()) {
      return notesWithMetadata; // Return parsed notes (which are already filtered by deletion status)
    }

    // 1. Extract Semantic Constraints from search term
    const constraints = parseProperties(searchTerm);

    // Remove the semantic blocks from the search term to get the remaining text query
    // e.g. "project A [price > 100]" -> "project A "
    let remainingSearch = searchTerm;
    // We can't easily reconstruct the exact string without regex replacement matching the parsed blocks
    // A simple approach is to remove anything matching [...]
    remainingSearch = remainingSearch.replace(/\[[^\]]+\]/g, '').trim();

    const lowerCaseSearchTerm = remainingSearch.toLowerCase();

    // Parse text search parts
    const searchParts: string[] =
      lowerCaseSearchTerm.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

    const textQueries = searchParts
      .filter((p) => !p.startsWith('#') && !p.includes(':'))
      .map((p) => p.replace(/"/g, ''));

    const tagQueries = searchParts
      .filter((p) => p.startsWith('#'))
      .map((p) => p.substring(1));

    // Legacy simple property search (key:value without brackets)
    // We might want to deprecate this or keep it for quick typing "status:active"
    const simplePropQueries = searchParts
      .filter((p) => p.includes(':'))
      .map((p) => {
        const [key, value] = p.split(':', 2);
        return { key, value: value.replace(/"/g, '') };
      });

    return notesWithMetadata.filter((note) => {
      // 1. Check Semantic Constraints
      const semanticMatch = constraints.every(constraint => checkConstraint(constraint, note));
      if (!semanticMatch) return false;

      // 2. Check Text Queries
      const textMatch = textQueries.every(
        (query) =>
          note.lowerTitle.includes(query) || note.textContent.includes(query)
      );

      // 3. Check Tag Queries
      const tagMatch = tagQueries.every((query) =>
        note.lowerTags.some((tag) => tag.includes(query))
      );

      // 4. Check Simple Prop Queries
      const simplePropMatch = simplePropQueries.every((query) =>
        note.lowerProps.some(
          (prop) =>
            prop.key === query.key &&
            prop.values.some((val) => val.includes(query.value))
        )
      );

      return textMatch && tagMatch && simplePropMatch;
    });
  }, [notesWithMetadata, searchTerm]);

  return useMemo(() => {
    // Return sorted original notes
    return [...filteredNotes].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        switch (sortOrder) {
            case 'updatedAt_desc':
                return b.updatedAt.localeCompare(a.updatedAt);
            case 'updatedAt_asc':
                return a.updatedAt.localeCompare(b.updatedAt);
            case 'createdAt_desc':
                return b.createdAt.localeCompare(a.createdAt);
            case 'createdAt_asc':
                return a.createdAt.localeCompare(b.createdAt);
            case 'title_asc':
                return a.title.localeCompare(b.title);
            case 'title_desc':
                return b.title.localeCompare(a.title);
            case 'soonest': {
                // Notes with future dates come first, sorted by nearness to now.
                // Notes with past dates come after future dates? Or just abs diff?
                // Usually "soonest" means upcoming.
                // Let's sort by timestamp ascending.
                // If a has no date, push to end.
                if (a.minDateTimestamp !== null && b.minDateTimestamp !== null) {
                    return a.minDateTimestamp - b.minDateTimestamp;
                }
                if (a.minDateTimestamp !== null) return -1;
                if (b.minDateTimestamp !== null) return 1;
                return b.updatedAt.localeCompare(a.updatedAt); // fallback
            }
            case 'nearest': {
                if (!userLocation) return b.updatedAt.localeCompare(a.updatedAt);
                // Calculate distance
                const distA = a.location ? haversineDistance(userLocation, a.location) : Infinity;
                const distB = b.location ? haversineDistance(userLocation, b.location) : Infinity;

                if (distA !== distB) {
                     return distA - distB;
                }
                return b.updatedAt.localeCompare(a.updatedAt);
            }
            case 'tags': {
                // Sort by tag count desc, then alpha
                const countA = a.tags.length;
                const countB = b.tags.length;
                if (countA !== countB) return countB - countA;
                return a.title.localeCompare(b.title);
            }
            case 'relevance':
                // Fallback for now if not searching
                return b.updatedAt.localeCompare(a.updatedAt);
            default:
                return b.updatedAt.localeCompare(a.updatedAt);
        }
    });
  }, [filteredNotes, sortOrder, userLocation]);
};
