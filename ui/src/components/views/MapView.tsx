import React from 'react';
import 'leaflet/dist/leaflet.css';

import {useMapView} from '../../hooks/useMapView';
import {MapPinIcon} from '../common/icons';
import {EmptyState} from '../common/EmptyState';

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
                                Add location properties to your notes to see them here.
                                <br/>
                                Try: <code className="bg-gray-800 px-1 py-0.5 rounded text-blue-300">[location:is:New
                                York]</code>
                            </>
                        }
                    />
                </div>
            )}
            <div ref={mapContainerRef} className="flex-grow w-full"/>
        </div>
    );
}
