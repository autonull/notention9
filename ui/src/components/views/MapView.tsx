import React from 'react';
import 'leaflet/dist/leaflet.css';

import {useMapView} from '../../hooks/useMapView';
import {MapPinIcon} from '../ui/icons';
import {EmptyState} from '../ui/Primitives';

export function MapView() {
    const {mapContainerRef, hasPoints} = useMapView();

    return (
        <div className="h-full w-full bg-gray-800/50 rounded-lg p-4 flex flex-col gap-4 relative">
            {!hasPoints && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
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
            <div ref={mapContainerRef} className="flex-grow w-full"/>
        </div>
    );
}
