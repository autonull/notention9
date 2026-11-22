import React, {useCallback, useRef} from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import {useMapView} from '../../hooks/useMapView';
import {MapPinIcon} from '../ui/icons';
import {EmptyState} from '../ui/Primitives';
import {Button} from '../ui/Button';

export function MapView() {
    const {mapContainerRef, hasPoints} = useMapView();
    const mapRef = useRef<L.Map | null>(null);

    const onDropPin = useCallback(async (e: L.LeafletMouseEvent) => {
        const {lat, lng} = e.latlng;
        // Navigate to inbox with location pre-filled via custom event
        window.dispatchEvent(new CustomEvent('drop-pin', {
            detail: {lat, lng}
        }));
    }, []);

    useCallback(() => {
        if (mapRef.current) {
            mapRef.current.on('click', onDropPin);
            return () => mapRef.current?.off('click', onDropPin);
        }
    }, [onDropPin]);

    return (
        <div className="relative flex h-[calc(100dvh-15rem)] min-h-[520px] w-full flex-col gap-3 overflow-hidden rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] p-2">
            {!hasPoints && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--app-bg)]/85 backdrop-blur-sm">
                    <EmptyState
                        icon={MapPinIcon}
                        title="No Location Notes"
                        description={
                            <>
                                Add a location detail to a note to see it here.
                                <br/>
                                Use Add detail in the editor and choose location.
                            </>
                        }
                    />
                </div>
            )}
            <div 
                ref={(el) => {
                    mapContainerRef.current = el;
                    mapRef.current = el ? (mapRef.current || null) : null;
                }} 
                className="min-h-0 flex-grow w-full"
            />
            {hasPoints && (
            <div className="absolute right-3 top-3 z-20">
                <Button
                    variant="primary"
                    size="sm"
                    className="shadow-lg touch-target-48"
                    onClick={() => window.dispatchEvent(new CustomEvent('drop-pin', {detail: {lat: 0, lng: 0}}))}
                    aria-label="Drop a pin to capture a location"
                >
                    <MapPinIcon className="w-5 h-5"/> Drop Pin
                </Button>
            </div>
            )}
        </div>
    );
}
