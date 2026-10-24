import type { Note, SortOrder, OntologyNode } from '../../types/index.js';
import { GeoCoords, haversineDistance, parseGeoFromValues } from '../../utils/geo.js';
import { parseProperties } from '../parsing/index.js';
import { getCanonicalKey } from '../../ontology/ontologyCore.js';
import { MatchEngine } from '../../matching/MatchEngine.js';
import { isSpatialKey, isTemporalKey } from '../properties.js';
import { parseDateFromValues } from '../../utils/dateParsing.js';
import { getTextFromHtml } from '../../utils/html.js';
import { SearchStrategy, CompositeSearchStrategy, SemanticSearchStrategy, TextSearchStrategy, TagSearchStrategy, PropertySearchStrategy } from './SearchStrategy.js';
import { SortStrategy, UpdatedAtSortStrategy, CreatedAtSortStrategy, TitleSortStrategy, SoonestSortStrategy, NearestSortStrategy, TagsSortStrategy, PinnedFirstSortStrategy } from './SortStrategy.js';

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
    private readonly engine: MatchEngine;
    private readonly ontology: OntologyNode[];
    private readonly searchStrategy: SearchStrategy;
    private readonly sortStrategies: Map<SortOrder, SortStrategy>;

    constructor(ontology: OntologyNode[]) {
        this.ontology = ontology;
        this.engine = new MatchEngine(ontology);

        this.searchStrategy = new CompositeSearchStrategy([
            new SemanticSearchStrategy(this.engine),
            new TextSearchStrategy(),
            new TagSearchStrategy(),
            new PropertySearchStrategy(),
        ]);

        this.sortStrategies = new Map<SortOrder, SortStrategy>([
            ['updatedAt_desc', new PinnedFirstSortStrategy(new UpdatedAtSortStrategy(false))],
            ['updatedAt_asc', new PinnedFirstSortStrategy(new UpdatedAtSortStrategy(true))],
            ['createdAt_desc', new PinnedFirstSortStrategy(new CreatedAtSortStrategy(false))],
            ['createdAt_asc', new PinnedFirstSortStrategy(new CreatedAtSortStrategy(true))],
            ['title_asc', new PinnedFirstSortStrategy(new TitleSortStrategy(true))],
            ['title_desc', new PinnedFirstSortStrategy(new TitleSortStrategy(false))],
            ['soonest', new PinnedFirstSortStrategy(new SoonestSortStrategy())],
            ['nearest', new PinnedFirstSortStrategy(new NearestSortStrategy())],
            ['tags', new PinnedFirstSortStrategy(new TagsSortStrategy())],
        ]);
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
            filtered = this.searchStrategy.search(notesWithMetadata, searchTerm, this.ontology);
        }

        // 3. Sort
        const sortStrategy = this.sortStrategies.get(sortOrder) ?? this.sortStrategies.get('updatedAt_desc')!;
        return sortStrategy.sort(filtered, userLocation);
    }
}