import React from 'react';
import { SparklesIcon } from '../../common/icons';
import { Button } from '../../common/Button';

interface OntologyGrowthListProps {
    newAttributes: { key: string; type: string }[];
    optimizeOntology: () => void;
}

export function OntologyGrowthList({ newAttributes, optimizeOntology }: OntologyGrowthListProps) {
  return (
    <>
        <div className="bg-gray-800 px-3 py-2 border-t border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-green-500/50 shadow-sm"></span>
                <span className="font-bold text-xs text-gray-300 tracking-wide">ONTOLOGY GROWTH</span>
            </div>
            <Button
                onClick={optimizeOntology}
                size="xs"
                variant="primary"
                icon={SparklesIcon}
                title="Optimize Ontology"
            >
                Optimize
            </Button>
        </div>
        <div className="h-1/3 overflow-y-auto p-2 font-mono text-[10px] space-y-1 bg-gray-900">
            {newAttributes.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-600 italic">No new attributes detected.</div>
            )}
            {newAttributes.map((attr, i) => (
                <div key={i} className="text-green-400 flex items-center gap-2 p-1.5 hover:bg-white/5 rounded transition-colors border border-transparent hover:border-green-500/20">
                    <span>🌱</span>
                    <span className="font-bold">{attr.key}</span>
                    <span className='text-gray-500'>({attr.type})</span>
                </div>
            ))}
        </div>
    </>
  );
}
