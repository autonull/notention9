import type { Note, GeoCoords } from '@notention/core';
import { getTextFromHtml } from '../../utils/html';
import { isSpatialKey, isTemporalKey, parseDateFromValues, parseGeoFromValues } from '@notention/core';

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
