import React from 'react';
import type {OntologyAttribute} from '@notention/core';

interface AttributeListProps {
    attributes: Record<string, OntologyAttribute>;
    usageStats?: Map<string, number>;
}

export function AttributeList({attributes, usageStats}: AttributeListProps) {
    return (
        <div className="ml-8 mb-2 border-l-2 border-gray-700 pl-4">
            {Object.entries(attributes).map(([key, attr]) => {
                const attrCount = usageStats?.get(key) || 0;
                const hasAliases = attr.aliases && attr.aliases.length > 0;

                return (
                    <div key={key} className="text-sm text-gray-400 py-1 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <span className="text-purple-400 font-mono">{key}</span>
                            <span className="text-xs text-gray-600">({attr.type})</span>
                            {attrCount > 0 && (
                                <span className="text-xs bg-gray-800 px-1 rounded text-gray-300">{attrCount} uses</span>
                            )}
                        </div>
                        {hasAliases && (
                            <div className="text-xs text-gray-500 pl-2 flex gap-1 items-center">
                                <span className="italic">Aliases:</span>
                                {attr.aliases?.map(alias => (
                                    <span key={alias} className="bg-gray-800/50 px-1 rounded text-gray-400 font-mono text-[10px]">
                                        {alias}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
