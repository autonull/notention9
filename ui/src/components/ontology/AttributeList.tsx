import React from 'react';
import type {OntologyAttribute} from '@notention/core';

interface AttributeListProps {
    attributes: Record<string, OntologyAttribute>;
    usageStats?: Map<string, number>;
}

export function AttributeList({attributes, usageStats}: AttributeListProps) {
    return (
        <div className="ml-8 mb-2 border-l-2 border-[var(--app-line)] pl-4" role="list" aria-label="Attributes">
            {Object.entries(attributes).map(([key, attr]) => {
                const attrCount = usageStats?.get(key) || 0;
                const hasAliases = attr.aliases && attr.aliases.length > 0;

                return (
                    <div key={key} role="listitem" className="text-sm text-[var(--app-muted)] py-1 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <span className="text-[var(--app-accent-text)] font-mono">{key}</span>
                            <span className="text-xs text-[var(--app-muted)]">({attr.type})</span>
                            {attrCount > 0 && (
                                <span className="text-xs bg-[var(--app-raised)] px-1 rounded text-[var(--app-text-secondary)]">{attrCount} uses</span>
                            )}
                        </div>
                        {hasAliases && (
                            <div className="text-xs text-[var(--app-muted)] pl-2 flex gap-1 items-center">
                                <span className="italic">Aliases:</span>
                                {attr.aliases?.map(alias => (
                                    <span key={alias} className="bg-[var(--app-raised)] px-1 rounded text-[var(--app-muted)] font-mono text-xs">
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
