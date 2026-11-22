import React, {useMemo, useState} from 'react';
import type {OntologyNode} from '@notention/core';
import {ArrowLeftIcon} from '../ui/icons';
import {IconButton, Button} from '../ui/Button';
import {Input} from '../ui/Input';
import {cn} from '../../utils/ui';

const VISIBLE_FILTERS = 6;

interface NetworkFeedHeaderProps {
    matchAgainstTitle?: string;
    onClearMatch: () => void;
    filter: string;
    setFilter: (filter: string) => void;
    ontology?: OntologyNode[];
    activeFilterId?: string;
    setActiveFilterId?: (id: string) => void;
}

/** One filter row: domain chips and one input. Nothing else labels the feed. */
export function NetworkFeedHeader({
                                      matchAgainstTitle,
                                      onClearMatch,
                                      filter,
                                      setFilter,
                                      ontology,
                                      activeFilterId = 'all',
                                      setActiveFilterId
                                  }: NetworkFeedHeaderProps) {
    const [showAllFilters, setShowAllFilters] = useState(false);

    const filterNodes = useMemo(
        () => (ontology ?? []).filter((node, index, nodes) =>
            nodes.findIndex(candidate => candidate.label.trim().toLowerCase() === node.label.trim().toLowerCase()) === index),
        [ontology]
    );
    const visibleFilters = showAllFilters ? filterNodes : filterNodes.slice(0, VISIBLE_FILTERS);
    const showDomains = Boolean(setActiveFilterId && ontology?.length);

    const chipClass = (active: boolean) => cn(
        'h-7 shrink-0 whitespace-nowrap rounded-md border px-2 text-[11px] font-medium transition-colors',
        active
            ? 'border-[var(--app-accent-line)] bg-[var(--app-accent-soft)] text-[var(--app-accent-text)]'
            : 'border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:border-[var(--app-line-strong)] hover:text-[var(--app-text-secondary)]'
    );

    return (
        <div className="flex flex-col gap-2">
            <h1 className="sr-only">Public Feed</h1>

            {matchAgainstTitle && (
                <div className="flex min-w-0 items-center gap-2">
                    <IconButton
                        onClick={onClearMatch}
                        icon={ArrowLeftIcon}
                        title="Back to feed"
                        variant="ghost"
                        size="sm"
                    />
                    <p className="min-w-0 truncate text-[13px] text-[var(--app-text-secondary)]">
                        Matches for “{matchAgainstTitle}”
                    </p>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
                {showDomains && (
                    <div
                        className="flex min-w-0 items-center gap-1 overflow-x-auto"
                        role="group"
                        aria-label="Domains"
                    >
                        <button
                            type="button"
                            onClick={() => setActiveFilterId!('all')}
                            aria-pressed={activeFilterId === 'all'}
                            className={chipClass(activeFilterId === 'all')}
                        >
                            All
                        </button>
                        {visibleFilters.map(node => (
                            <button
                                key={node.id}
                                type="button"
                                onClick={() => setActiveFilterId!(node.id)}
                                aria-pressed={activeFilterId === node.id}
                                className={chipClass(activeFilterId === node.id)}
                            >
                                {node.label}
                            </button>
                        ))}
                        {filterNodes.length > VISIBLE_FILTERS && (
                            <Button
                                type="button"
                                onClick={() => setShowAllFilters(value => !value)}
                                aria-expanded={showAllFilters}
                                variant="ghost"
                                size="xs"
                            >
                                {showAllFilters ? 'Less' : `+${filterNodes.length - VISIBLE_FILTERS}`}
                            </Button>
                        )}
                    </div>
                )}
                <Input
                    type="text"
                    placeholder="Filter feed…"
                    aria-label="Filter feed"
                    className={cn('min-w-0', showDomains ? undefined : 'w-full')}
                    wrapperClassName={showDomains ? 'ml-auto w-44' : undefined}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
        </div>
    );
}
