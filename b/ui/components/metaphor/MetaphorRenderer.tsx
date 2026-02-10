import React from 'react';
import { Note } from '@notention/core';
import { UIMetaphor } from '@notention/core';

interface MetaphorRendererProps {
  note: Note;
  metaphor: UIMetaphor;
}

export const MetaphorRenderer: React.FC<MetaphorRendererProps> = ({ note, metaphor }) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 my-2 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl" role="img" aria-label={metaphor.name}>
          {metaphor.icon}
        </span>
        <h3 className="font-semibold text-blue-300">{metaphor.name}</h3>
      </div>

      <div className="text-sm text-gray-400 mb-2">
        {metaphor.description}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {metaphor.properties.map((prop) => {
          const propertyMatch = note.properties.find(
            p => p.key === prop.name ||
            (prop.name === 'condition' && (p.key === 'if' || p.key === 'condition')) ||
            (prop.name === 'action' && (p.key === 'then' || p.key === 'do' || p.key === 'action')) ||
            (prop.name === 'time' && (p.key === 'when' || p.key === 'at' || p.key === 'time'))
          );

          return (
            <div key={prop.name} className="flex flex-col bg-gray-750 p-2 rounded">
              <span className="text-xs text-gray-500 uppercase font-medium">{prop.label}</span>
              <span className={`text-sm ${propertyMatch ? 'text-white' : 'text-gray-600 italic'}`}>
                {propertyMatch ? propertyMatch.values.join(', ') : '(Not set)'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
