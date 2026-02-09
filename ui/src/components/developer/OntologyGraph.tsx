import React, {useEffect, useRef, useState} from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import {useOntologyView} from '../../hooks/useOntologyView';

interface GraphData {
    nodes: Array<{ id: string; val: number; label: string; group: string }>;
    links: Array<{ source: string; target: string; value: number }>;
}

export function OntologyGraph() {
    const {getGraphData} = useOntologyView();
    const [data, setData] = useState<GraphData>({nodes: [], links: []});
    const fgRef = useRef<any>();

    useEffect(() => {
        // Load initial data
        const graphData = getGraphData();
        setData(graphData);
    }, [getGraphData]);

    return (
        <div className="h-full w-full bg-gray-900 rounded-lg overflow-hidden relative">
            <ForceGraph2D
                ref={fgRef}
                graphData={data}
                nodeLabel="label"
                nodeAutoColorBy="group"
                linkDirectionalParticles="value"
                linkDirectionalParticleSpeed={d => (d as any).value * 0.001}
                width={800} // Dynamic sizing would be better, but fixed for now
                height={600}
                backgroundColor="#111827" // gray-900
            />
            <div className="absolute top-2 right-2 bg-gray-800/80 p-2 rounded text-xs text-gray-300">
                <p>Nodes: {data.nodes.length}</p>
                <p>Links: {data.links.length}</p>
            </div>
        </div>
    );
}
