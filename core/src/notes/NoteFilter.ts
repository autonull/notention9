import type { Note, SortOrder, OntologyNode } from '../types/index.js';
import { GeoCoords, haversineDistance, parseGeoFromValues } from '../utils/geo.js';
import { parseProperties } from './parsing.js';
import { getCanonicalKey } from '../ontology/ontologyHelpers.js';
import { MatchEngine } from '../matching/MatchEngine.js';
import { isSpatialKey, isTemporalKey } from './properties.js';
import { parseDateFromValues } from '../utils/dateParsing.js';
import { getTextFromHtml } from '../utils/html.js';

export interface NoteMetadata {
    textContent: string;
    lowerTitle: string;
    lowerTags: string[];
    lowerProps: { key: string; values: string[] }[];
    updatedAt: string;
    minDateTimestamp: number | null;
    location: GeoCoords | null;
}

export const augmentNote = (note: Note): NoteMetadata => {
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
    if (temporalProps?.length) {
        const timestamps = temporalProps
            .map(p => parseDateFromValues(p.values)?.getTime())
            .filter((t): t is number => t !== undefined && !isNaN(t));
        if (timestamps.length) minDateTimestamp = Math.min(...timestamps);
    }

    // Extract Spatial Data
    let location: GeoCoords | null = null;
    const spatialProps = note.properties?.filter(p => isSpatialKey(p.key));
    if (spatialProps?.length) {
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

export class NoteFilter {
    private engine: MatchEngine;
    private ontology: OntologyNode[];

    constructor(ontology: OntologyNode[]) {
        this.ontology = ontology;
        this.engine = new MatchEngine(ontology);
    }

    filterAndSort(
        notes: Note[],
        searchTerm: string,
        sortOrder: SortOrder,
        showTrash: boolean = false,
        userLocation?: GeoCoords | null,
        cache: Record<string, NoteMetadata> = {}
    ): Note[] {
        // 1. Basic filter (trash) and augmentation
        const activeNotes = notes.filter(n => showTrash ? !!n.deletedAt : !n.deletedAt);

        const notesWithMetadata = activeNotes.map(note => {
            if (cache[note.id]?.updatedAt === note.updatedAt) {
                return { ...note, ...cache[note.id] };
            }
            const metadata = augmentNote(note);
            cache[note.id] = metadata;
            return { ...note, ...metadata };
        });

        // 2. Search
        let filtered = notesWithMetadata;
        if (searchTerm.trim()) {
            filtered = this.applySearch(notesWithMetadata, searchTerm);
        }

        // 3. Sort
        return this.applySort(filtered, sortOrder, userLocation);
    }

    private applySearch(notes: (Note & NoteMetadata)[], searchTerm: string): (Note & NoteMetadata)[] {
        const constraints = parseProperties(searchTerm, this.ontology);
        const remainingSearch = searchTerm.replace(/\[[^\]]+\]/g, '').trim().toLowerCase();
        const searchParts = remainingSearch.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

        const textQueries = searchParts.filter(p => !p.startsWith('#') && !p.includes(':')).map(p => p.replace(/"/g, ''));
        const tagQueries = searchParts.filter(p => p.startsWith('#')).map(p => p.substring(1));
        const simplePropQueries = searchParts.filter(p => p.includes(':')).map(p => {
            const [key, value] = p.split(':', 2);
            return { key, value: value.replace(/"/g, '') };
        });

        return notes.filter(note => {
            // Semantic match
            if (constraints.length > 0 && this.engine.calculateMatchScore({ properties: constraints } as Note, note).score <= 0) {
                return false;
            }

            const textMatch = textQueries.every(q => note.lowerTitle.includes(q) || note.textContent.includes(q));
            const tagMatch = tagQueries.every(q => note.lowerTags.some(t => t.includes(q)));
            const simplePropMatch = simplePropQueries.every(q => {
                const canonicalQueryKey = getCanonicalKey(q.key, this.ontology);
                return note.properties.some(p =>
                    getCanonicalKey(p.key, this.ontology) === canonicalQueryKey &&
                    p.values.some(v => v.toLowerCase().includes(q.value))
                );
            });

            return textMatch && tagMatch && simplePropMatch;
        });
    }

    private applySort(notes: (Note & NoteMetadata)[], sortOrder: SortOrder, userLocation?: GeoCoords | null): (Note & NoteMetadata)[] {
        return [...notes].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;

            switch (sortOrder) {
                case 'updatedAt_desc': return b.updatedAt.localeCompare(a.updatedAt);
                case 'updatedAt_asc': return a.updatedAt.localeCompare(b.updatedAt);
                case 'createdAt_desc': return b.createdAt.localeCompare(a.createdAt);
                case 'createdAt_asc': return a.createdAt.localeCompare(b.createdAt);
                case 'title_asc': return (a.title || '').localeCompare(b.title || '');
                case 'title_desc': return (b.title || '').localeCompare(a.title || '');
                case 'soonest':
                    if (a.minDateTimestamp !== null && b.minDateTimestamp !== null) return a.minDateTimestamp - b.minDateTimestamp;
                    return a.minDateTimestamp !== null ? -1 : (b.minDateTimestamp !== null ? 1 : b.updatedAt.localeCompare(a.updatedAt));
                case 'nearest':
                    if (!userLocation) return b.updatedAt.localeCompare(a.updatedAt);
                    const distA = a.location ? haversineDistance(a.location, userLocation) : Infinity;
                    const distB = b.location ? haversineDistance(b.location, userLocation) : Infinity;
                    return distA !== distB ? distA - distB : b.updatedAt.localeCompare(a.updatedAt);
                case 'tags':
                    return (b.tags?.length || 0) - (a.tags?.length || 0) || (a.title || '').localeCompare(b.title || '');
                default: return b.updatedAt.localeCompare(a.updatedAt);
            }
        });
    }
}
