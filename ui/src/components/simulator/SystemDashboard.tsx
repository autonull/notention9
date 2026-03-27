import React from 'react';
import { SystemEventsLog, Log } from './dashboard/SystemEventsLog';
import { OntologyGrowthList } from './dashboard/OntologyGrowthList';

interface SystemDashboardProps {
    logs: Log[];
    optimizeOntology: () => void;
    newAttributes: { key: string; type: string }[];
}

export function SystemDashboard({
    logs,
    optimizeOntology,
    newAttributes
}: SystemDashboardProps) {
  return (
    <div className="col-span-1 h-full overflow-hidden flex flex-col bg-gray-900 border border-gray-700 rounded-lg shadow-sm">
         <SystemEventsLog logs={logs} />
         <OntologyGrowthList newAttributes={newAttributes} optimizeOntology={optimizeOntology} />
    </div>
  );
};
