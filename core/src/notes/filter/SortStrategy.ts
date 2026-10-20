import type { Note } from '../../types/index.js';
import type { NoteMetadata } from './NoteFilter.js';
import { GeoCoords, haversineDistance } from '../../utils/geo.js';

export interface SortStrategy {
  sort(notes: (Note & NoteMetadata)[], userLocation?: GeoCoords | null): (Note & NoteMetadata)[];
}

export class UpdatedAtSortStrategy implements SortStrategy {
  constructor(private readonly ascending: boolean = false) {}

  sort(notes: (Note & NoteMetadata)[]): (Note & NoteMetadata)[] {
    return [...notes].sort((a, b) =>
      this.ascending
        ? a.updatedAt.localeCompare(b.updatedAt)
        : b.updatedAt.localeCompare(a.updatedAt)
    );
  }
}

export class CreatedAtSortStrategy implements SortStrategy {
  constructor(private readonly ascending: boolean = false) {}

  sort(notes: (Note & NoteMetadata)[]): (Note & NoteMetadata)[] {
    return [...notes].sort((a, b) =>
      this.ascending
        ? a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt)
    );
  }
}

export class TitleSortStrategy implements SortStrategy {
  constructor(private readonly ascending: boolean = true) {}

  sort(notes: (Note & NoteMetadata)[]): (Note & NoteMetadata)[] {
    return [...notes].sort((a, b) =>
      this.ascending
        ? (a.title || '').localeCompare(b.title || '')
        : (b.title || '').localeCompare(a.title || '')
    );
  }
}

export class SoonestSortStrategy implements SortStrategy {
  sort(notes: (Note & NoteMetadata)[]): (Note & NoteMetadata)[] {
    return [...notes].sort((a, b) => {
      if (a.minDateTimestamp !== null && b.minDateTimestamp !== null) {
        return a.minDateTimestamp - b.minDateTimestamp;
      }
      if (a.minDateTimestamp !== null) return -1;
      if (b.minDateTimestamp !== null) return 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }
}

export class NearestSortStrategy implements SortStrategy {
  sort(notes: (Note & NoteMetadata)[], userLocation?: GeoCoords | null): (Note & NoteMetadata)[] {
    if (!userLocation) {
      return [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }

    return [...notes].sort((a, b) => {
      const distA = a.location ? haversineDistance(a.location, userLocation) : Infinity;
      const distB = b.location ? haversineDistance(b.location, userLocation) : Infinity;
      if (distA !== distB) return distA - distB;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }
}

export class TagsSortStrategy implements SortStrategy {
  sort(notes: (Note & NoteMetadata)[]): (Note & NoteMetadata)[] {
    return [...notes].sort((a, b) =>
      (b.tags?.length || 0) - (a.tags?.length || 0) ||
      (a.title || '').localeCompare(b.title || '')
    );
  }
}

export class PinnedFirstSortStrategy implements SortStrategy {
  private readonly delegate: SortStrategy;

  constructor(delegate: SortStrategy) {
    this.delegate = delegate;
  }

  sort(notes: (Note & NoteMetadata)[], userLocation?: GeoCoords | null): (Note & NoteMetadata)[] {
    return [...notes].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    }).sort((a, b) => {
      // Only use delegate for non-pinned comparison
      if (a.pinned === b.pinned) {
        const sorted = this.delegate.sort([a, b], userLocation);
        return sorted[0] === a ? -1 : 1;
      }
      return 0;
    });
  }
}