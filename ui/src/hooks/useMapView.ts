import {useCallback, useEffect, useMemo, useRef} from 'react';
import L from 'leaflet';
import {useNotes} from './useNotes';
import {useView} from './useViewContext';
import {convertEventToNote, parseGeoFromValues} from '@notention/core';

interface GeoPoint {
    id: string;
    title: string;
    lat: number;
    lng: number;
    type: 'local' | 'match';
}

export function useMapView() {
    const {notes} = useNotes();
    const {setActiveView, setSelectedNoteId, matches} = useView();
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const markersRef = useRef<L.Marker[]>([]);

    const onSelectNote = useCallback(
        (id: string, type: 'local' | 'match') => {
            if (type === 'local') {
                setActiveView('notes');
                setSelectedNoteId(id);
            } else {
                // For now, maybe just toast or log?
                // Ideally we open a "Match Detail" view or show more info in popup.
                console.log('Selected match:', id);
            }
        },
        [setActiveView, setSelectedNoteId]
    );

    const geoPoints = useMemo<GeoPoint[]>(() => {
        const points: GeoPoint[] = [];

        // 1. Local Notes
        notes.forEach((note) => {
            const locProp = note.properties.find(p => ['location', 'geo', 'place'].includes(p.key) && p.values.length > 0);
            if (locProp) {
                const coords = parseGeoFromValues(locProp.values);
                if (coords) {
                    points.push({
                        id: note.id,
                        title: note.title,
                        lat: coords.lat,
                        lng: coords.lng,
                        type: 'local'
                    });
                }
            }
        });

        // 2. Matches
        matches.forEach((match) => {
            // Match event needs to be converted to Note or inspected directly
            // MatchResult has 'event' (NostrEvent)
            try {
                const note = convertEventToNote(match.event);
                const locProp = note.properties.find(p => ['location', 'geo', 'place'].includes(p.key) && p.values.length > 0);
                if (locProp) {
                    const coords = parseGeoFromValues(locProp.values);
                    if (coords) {
                        points.push({
                            id: note.id, // Using Note ID (d-tag or event id)
                            title: `Match: ${match.score.toFixed(2)}`, // Matches might not have titles
                            lat: coords.lat,
                            lng: coords.lng,
                            type: 'match'
                        });
                    }
                }
            } catch (e) {
                // Ignore parsing errors
            }
        });

        return points;
    }, [notes, matches]);

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
                // Determine icon color/style based on type
                // Leaflet default is blue.
                // We can use a custom icon or CSS filter.
                // Simple hack: CSS filter hue-rotate for 'match'

                const marker = L.marker([point.lat, point.lng]).addTo(map);

                // Add class for styling matches differently?
                // Leaflet markers are tricky to style without custom Icon objects.
                // Let's stick to default for now, but customize popup content.

                const typeLabel = point.type === 'match' ? '<span class="text-xs bg-green-900 text-green-300 px-1 rounded">Match</span>' : '';

                const popupContent = `
                    <div class="font-sans">
                        <div class="flex items-center gap-2 mb-1">
                            <h3 class="font-bold text-base">${point.title || 'Untitled'}</h3>
                            ${typeLabel}
                        </div>
                        ${point.type === 'local'
                            ? `<a href="#" id="note-link-${point.id}" class="text-blue-400 hover:underline">View Note &rarr;</a>`
                            : `<span class="text-xs text-gray-400">Remote Match</span>`
                        }
                    </div>
                `;
                marker.bindPopup(popupContent);

                if (point.type === 'local') {
                    marker.on('popupopen', () => {
                        const link = document.getElementById(`note-link-${point.id}`);
                        if (link) {
                            link.onclick = (e) => {
                                e.preventDefault();
                                onSelectNote(point.id, point.type);
                            };
                        }
                    });
                }
                markersRef.current.push(marker);
            });
        }

        // Fit map to markers if there are any
        if (markersRef.current.length > 0) {
            const group = new L.FeatureGroup(markersRef.current);
            map.fitBounds(group.getBounds().pad(0.2));
        }
    }, [geoPoints, onSelectNote]);

    return {mapContainerRef, hasPoints: geoPoints.length > 0};
};
