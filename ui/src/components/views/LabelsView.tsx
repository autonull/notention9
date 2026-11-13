import React from 'react';
import {LabelsTab} from '../settings/LabelsTab';

export function LabelsView() {
    return (
        <div className="h-full overflow-y-auto bg-gray-950 p-4 md:p-8">
            <LabelsTab/>
        </div>
    );
}