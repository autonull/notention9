import React, {useEffect, useMemo, useRef, useState} from 'react';
import L from 'leaflet';
import {Logger} from '@notention/core';
import {Modal} from '../common/Modal';
import {Button} from '../common/Button';
import {Input} from '../common/Input';
import {LoadingSpinner, SearchIcon} from '../common/icons';

interface MapPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLocationSelect: (location: string) => void;
    initialValue?: string;
}

export function MapPickerModal({
                                   isOpen,
                                   onClose,
                                   onLocationSelect,
                                   initialValue,
                               }: MapPickerModalProps) {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [selectedCoords, setSelectedCoords] = useState<L.LatLng | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const initialLatLng = useMemo(() => {
        if (initialValue) {
            const [lat, lng] = initialValue.split(',').map(parseFloat);
            if (!isNaN(lat) && !isNaN(lng)) {
                return new L.LatLng(lat, lng);
            }
        }
        return null;
    }, [initialValue]);

    useEffect(() => {
        if (isOpen && mapContainerRef.current) {
            if (!mapRef.current) {
                const map = L.map(mapContainerRef.current);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution:
                        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                }).addTo(map);
                mapRef.current = map;

                map.on('click', (e: L.LeafletMouseEvent) => {
                    setSelectedCoords(e.latlng);
                });
            }

            const map = mapRef.current;
            // Use a timeout to ensure the map container is visible and has its final size.
            setTimeout(() => {
                map.invalidateSize();
                const viewCoords = initialLatLng || new L.LatLng(20, 0);
                const zoom = initialLatLng ? 13 : 2;
                map.setView(viewCoords, zoom);

                if (initialLatLng) {
                    setSelectedCoords(initialLatLng);
                } else {
                    setSelectedCoords(null);
                    if (markerRef.current) {
                        markerRef.current.remove();
                        markerRef.current = null;
                    }
                }
            }, 100);
        }
    }, [isOpen, initialLatLng]);

    useEffect(() => {
        const map = mapRef.current;
        if (map && selectedCoords) {
            if (!markerRef.current) {
                markerRef.current = L.marker(selectedCoords).addTo(map);
            } else {
                markerRef.current.setLatLng(selectedCoords);
            }
            map.panTo(selectedCoords);
        }
    }, [selectedCoords]);

    const handleSave = () => {
        if (selectedCoords) {
            onLocationSelect(
                `${selectedCoords.lat.toFixed(6)},${selectedCoords.lng.toFixed(6)}`
            );
        }
        onClose();
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setSearchError(null);

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const {lat, lon} = data[0];
                const coords = new L.LatLng(parseFloat(lat), parseFloat(lon));

                setSelectedCoords(coords);
                mapRef.current?.setView(coords, 13);

                if (!markerRef.current) {
                    markerRef.current = L.marker(coords).addTo(mapRef.current!);
                } else {
                    markerRef.current.setLatLng(coords);
                }
            } else {
                setSearchError('Location not found.');
            }
        } catch (err) {
            setSearchError('Search failed. Please try again.');
            Logger.getInstance().error("Map search failed", err instanceof Error ? err : new Error(String(err)));
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Select a Location"
            className="max-w-4xl h-[80vh]"
        >
            <div className="flex flex-col h-full gap-3">
                <form onSubmit={handleSearch} className="flex gap-2 relative">
                    <div className="flex-grow relative">
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for a place (e.g. London, Times Square)..."
                            className="w-full pl-9"
                        />
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                    </div>
                    <Button type="submit" variant="secondary" disabled={isSearching} className="min-w-[80px]">
                        {isSearching ? <LoadingSpinner className="w-4 h-4"/> : 'Search'}
                    </Button>
                </form>

                {searchError && <p className="text-red-400 text-xs px-1">{searchError}</p>}

                <p className="text-sm text-gray-400 px-1">
                    Click on the map to refine the position.
                </p>

                <div ref={mapContainerRef}
                     className="flex-grow w-full rounded-md bg-gray-900 border border-gray-700 overflow-hidden relative"/>

                <div className="flex justify-end items-center gap-4 mt-2 pt-2 border-t border-gray-800">
                    {selectedCoords && (
                        <p className="text-sm text-gray-300 font-mono bg-gray-700 px-3 py-1.5 rounded-md">
                            {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}
                        </p>
                    )}
                    <Button
                        onClick={onClose}
                        variant="ghost"
                    >
                        Cancel
                    </Button>
                    <Button
                        disabled={!selectedCoords}
                        onClick={handleSave}
                        variant="primary"
                    >
                        Save Location
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
