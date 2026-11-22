import React, {useState} from 'react';
import type {NostrEvent, OntologyNode} from '@notention/core';
import {ArrowLeftIcon} from '../ui/icons';
import {IconButton} from '../ui/Button';
import {Input} from '../ui/Input';

const VISIBLE_FILTERS = 6;

interface NetworkFeedHeaderProps {
    matchAgainstTitle?: string;
    onClearMatch: () => void;
    filter: string;
    setFilter: (filter: string) => void;
    sortedEvents: NostrEvent[];
    ontology?: OntologyNode[];
    activeFilterId?: string;
    setActiveFilterId?: (id: string) => void;
}

export function NetworkFeedHeader({
                                      matchAgainstTitle,
                                      onClearMatch,
                                      filter,
                                      setFilter,
                                      sortedEvents,
                                      ontology,
                                      activeFilterId = 'all',
                                      setActiveFilterId
                                  }: NetworkFeedHeaderProps) {
    const [showAllFilters, setShowAllFilters] = useState(false);
    const filterNodes = (ontology ?? []).filter((node, index, nodes) =>
        nodes.findIndex(candidate => candidate.label.trim().toLowerCase() === node.label.trim().toLowerCase()) === index
    );
    const visibleFilters = showAllFilters ? filterNodes : filterNodes.slice(0, VISIBLE_FILTERS);

    return (
        <div className="flex flex-col gap-3 mb-6">
            {matchAgainstTitle ? (
                <div className="flex items-center gap-3 overflow-hidden">
                    <IconButton
                        onClick={onClearMatch}
                        icon={ArrowLeftIcon}
                        title="Back to Feed"
                        variant="ghost"
                        size="md"
                    />
                    <h1 className="text-xl font-bold text-white truncate">
                        Matches for "{matchAgainstTitle}"
                    </h1>
                </div>
            ) : (
                <h1 className="sr-only">Public Feed</h1>
            )}

            <div className="flex flex-wrap items-center gap-2">
                {setActiveFilterId && ontology && (
                    <div
                        className="flex flex-wrap items-center gap-0.5 bg-neutral-900 rounded-lg p-1 border border-neutral-700"
                        role="group"
                        aria-label="Feed filters"
                    >
                        <button
                            onClick={() => setActiveFilterId('all')}
                            className={`whitespace-nowrap px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${activeFilterId === 'all' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}
                        >
                            All
                        </button>
                        {visibleFilters.map(node => (
                            <button
                                key={node.id}
                                onClick={() => setActiveFilterId(node.id)}
                                className={`whitespace-nowrap px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${activeFilterId === node.id ? 'bg-blue-900/50 text-blue-200 shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}
                            >
                                {node.label}
                            </button>
                        ))}
                        {filterNodes.length > VISIBLE_FILTERS && (
                            <button
                                type="button"
                                onClick={() => setShowAllFilters(value => !value)}
                                aria-expanded={showAllFilters}
                                className="whitespace-nowrap px-2 py-1 text-[11px] font-medium rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                            >
                                {showAllFilters ? 'Less' : `+${filterNodes.length - VISIBLE_FILTERS} more`}
                            </button>
                        )}
                    </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                    <Input
                        type="text"
                        placeholder="Filter feed…"
                        aria-label="Filter feed"
                        className="w-48"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                    {sortedEvents.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {[...new Set(sortedEvents.flatMap(e => e.tags.filter((t: string[]) => t[0] === 't').map((t: string[]) => t[1])))]
                                .slice(0, 3)
                                .map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setFilter(filter === tag ? '' : tag)}
                                        className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${filter === tag ? 'bg-blue-900/50 border-blue-500 text-blue-200' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'}`}
                                    >
                                        #{tag}
                                    </button>
                                ))
                            }
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
