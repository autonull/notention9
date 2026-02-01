import { useCallback, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { useNotes } from './useNotes';
import { useView } from './useViewContext';
import { parseGeoFromValues } from '@notention/core';

interface GeoPoint {
  noteId: string;
  noteTitle: string;
  lat: number;
  lng: number;
}

export const useMapView = () => {
  const { notes } = useNotes();
  const { setActiveView, setSelectedNoteId } = useView();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const onSelectNote = useCallback(
    (id: string) => {
      setActiveView('notes');
      setSelectedNoteId(id);
    },
    [setActiveView, setSelectedNoteId]
  );

  const geoPoints = useMemo<GeoPoint[]>(() => {
    return notes.flatMap((note) => {
      // Check for location-related properties
      const locProp = note.properties.find(p => ['location', 'geo', 'place'].includes(p.key) && p.values.length > 0);

      if (!locProp) return [];

      const coords = parseGeoFromValues(locProp.values);
      if (!coords) return [];

      return [{
          noteId: note.id,
          noteTitle: note.title,
          lat: coords.lat,
          lng: coords.lng
      }];
    });
  }, [notes]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([20, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (geoPoints.length > 0) {
      geoPoints.forEach((point) => {
        const marker = L.marker([point.lat, point.lng]).addTo(map);
        const popupContent = `
                    <div class="font-sans">
                        <h3 class="font-bold text-base mb-1">${point.noteTitle || 'Untitled Note'}</h3>
                        <a href="#" id="note-link-${point.noteId}" class="text-blue-400 hover:underline">View Note &rarr;</a>
                    </div>
                `;
        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const link = document.getElementById(`note-link-${point.noteId}`);
          if (link) {
            link.onclick = (e) => {
              e.preventDefault();
              onSelectNote(point.noteId);
            };
          }
        });
        markersRef.current.push(marker);
      });
    }

    // Fit map to markers if there are any
    if (markersRef.current.length > 0) {
      const group = new L.FeatureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.2));
    }
  }, [geoPoints, onSelectNote]);

  return { mapContainerRef, hasPoints: geoPoints.length > 0 };
};
