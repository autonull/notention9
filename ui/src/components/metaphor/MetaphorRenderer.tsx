import React, {useMemo} from 'react';
import {Note, Property, UIMetaphor} from '@notention/core';

interface MetaphorRendererProps {
    note: Note;
    metaphor: UIMetaphor;
}

export function MetaphorRenderer({note, metaphor}: MetaphorRendererProps) {
    const matchedProperties = useMemo(() => metaphor.properties.map((prop) => {
        const propertyMatch = note.properties.find(p =>
            p.key === prop.name ||
            (prop.name === 'condition' && ['if', 'condition'].includes(p.key)) ||
            (prop.name === 'action' && ['then', 'do', 'action'].includes(p.key)) ||
            (prop.name === 'time' && ['when', 'at', 'time'].includes(p.key))
        );
        return {prop, match: propertyMatch};
    }), [note.properties, metaphor.properties]);

    return (
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-3 my-2 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
        <span className="text-xl" role="img" aria-label={metaphor.name}>
          {metaphor.icon}
        </span>
                <h3 className="font-semibold text-blue-300">{metaphor.name}</h3>
            </div>
            <div className="text-sm text-neutral-400 mb-2">{metaphor.description}</div>
            <div className="grid grid-cols-1 gap-2">
                {matchedProperties.map(({prop, match}) => (
                    <MetaphorProperty key={prop.name} label={prop.label} match={match}/>
                ))}
            </div>
        </div>
    );
}

const MetaphorProperty: React.FC<{ label: string; match?: Property }> = ({label, match}) => (
    <div className="flex flex-col bg-neutral-750 p-2 rounded">
 <span className="text-xs text-neutral-400 font-medium">{label}</span>
        <span className={`text-sm ${match ? 'text-white' : 'text-neutral-400 italic'}`}>
      {match ? match.values.join(', ') : '(Not set)'}
    </span>
    </div>
);
