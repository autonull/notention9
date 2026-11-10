import {useCallback, useEffect, useMemo, useRef} from 'react';
import L from 'leaflet';
import {useNotes} from './useNotes';
import {useView} from './useViewContext';
import {useToast} from './useToast';
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
    const {setActiveView, setSelectedNoteId, setMatchingNoteId, matches} = useView();
    const {addToast} = useToast();
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const markersRef = useRef<L.Marker[]>([]);

    const onSelectNote = useCallback(
        (id: string, type: 'local' | 'match') => {
            if (type === 'local') {
                setActiveView('notes');
                setSelectedNoteId(id);
            } else {
                setMatchingNoteId(id);
                setActiveView('network');
                addToast('Match selected', 'info');
            }
        },
        [setActiveView, setSelectedNoteId, setMatchingNoteId, addToast]
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
                const marker = L.marker([point.lat, point.lng]).addTo(map);

                // Create popup content as DOM (no innerHTML injection)
                const popupDiv = document.createElement('div');
                popupDiv.className = 'font-sans p-1';

                const headerDiv = document.createElement('div');
                headerDiv.className = 'flex items-center gap-2 mb-1';

                const title = document.createElement('h3');
                title.className = 'font-bold text-base';
                title.textContent = point.title || 'Untitled';
                headerDiv.appendChild(title);

                if (point.type === 'match') {
                    const badge = document.createElement('span');
                    badge.className = 'text-xs bg-green-900 text-green-300 px-1 rounded';
                    badge.textContent = 'Match';
                    headerDiv.appendChild(badge);
                }

                popupDiv.appendChild(headerDiv);

                if (point.type === 'local') {
                    const link = document.createElement('a');
                    link.href = '#';
                    link.className = 'text-blue-400 hover:underline';
                    link.textContent = 'View Note →';
                    link.onclick = (e) => {
                        e.preventDefault();
                        onSelectNote(point.id, point.type);
                    };
                    popupDiv.appendChild(link);
                } else {
                    const span = document.createElement('span');
                    span.className = 'text-xs text-gray-400';
                    span.textContent = 'Remote Match';
                    popupDiv.appendChild(span);
                }

                marker.bindPopup(popupDiv);
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
