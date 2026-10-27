import React, {useCallback, useMemo, useRef, useState} from 'react';
import {cn} from '../../utils/ui';
import {SearchIcon, XCircleIcon, ChevronDownIcon, SettingsIcon} from '../ui/icons';
import {Button} from './Button';

export interface SearchFilter {
    key: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'boolean';
    options?: {label: string; value: string}[];
    placeholder?: string;
}

export interface SearchResult<T> {
    item: T;
    score: number;
    highlights: Record<string, [number, number][]>;
}

export interface UseSmartSearchOptions<T> {
    items: T[];
    searchFields: (keyof T | string)[];
    filters?: SearchFilter[];
    fuzzySearch?: boolean;
    minQueryLength?: number;
    maxResults?: number;
    onSearch?: (query: string, filters: Record<string, unknown>) => void;
}

function fuzzyMatch(query: string, text: string): {score: number; indices: [number, number][]} | null {
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    if (!q) return {score: 1, indices: []};

    let score = 0;
    const indices: [number, number][] = [];
    let queryIdx = 0;
    let lastMatchIdx = -1;
    let consecutiveMatches = 0;

    for (let i = 0; i < t.length && queryIdx < q.length; i++) {
        if (t[i] === q[queryIdx]) {
            const isStartOfWord = i === 0 || !/[a-z0-9]/.test(t[i - 1]);
            const isConsecutive = i === lastMatchIdx + 1;

            let matchScore = 1;
            if (isStartOfWord) matchScore += 2;
            if (isConsecutive) {
                consecutiveMatches++;
                matchScore += consecutiveMatches * 0.5;
            } else {
                consecutiveMatches = 0;
            }

            score += matchScore;
            indices.push([i, i]);
            lastMatchIdx = i;
            queryIdx++;
        }
    }

    if (queryIdx < q.length) return null;

    const lengthBonus = t.length > 0 ? Math.min(10 / t.length, 1) : 0;
    score += lengthBonus;

    return {score, indices};
}

function getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((acc, part) => (acc as Record<string, unknown>)?.[part], obj);
}

export function useSmartSearch<T extends Record<string, unknown>>({
    items,
    searchFields,
    filters = [],
    fuzzySearch = true,
    minQueryLength = 1,
    maxResults = 100,
    onSearch,
}: UseSmartSearchOptions<T>) {
    const [query, setQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({});
    const [isExpanded, setIsExpanded] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const filteredItems = useMemo(() => {
        let result = items;

        if (Object.keys(activeFilters).length > 0) {
            result = result.filter(item => {
                return Object.entries(activeFilters).every(([key, value]) => {
                    if (value === '' || value === null || value === undefined) return true;
                    const itemValue = getNestedValue(item, key);
                    if (itemValue === undefined) return false;
                    if (Array.isArray(itemValue)) {
                        return itemValue.some(v => String(v).toLowerCase().includes(String(value).toLowerCase()));
                    }
                    return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
                });
            });
        }

        if (!query || query.length < minQueryLength) {
            onSearch?.(query, activeFilters);
            return result.slice(0, maxResults).map(item => ({
                item,
                score: 1,
                highlights: {} as Record<string, [number, number][]>,
            }));
        }

        const q = query.toLowerCase();
        const scored = result
            .map(item => {
                let bestScore = 0;
                const highlights: Record<string, [number, number][]> = {};

                for (const field of searchFields) {
                    const fieldValue = getNestedValue(item, String(field));
                    if (fieldValue === undefined || fieldValue === null) continue;

                    const searchText = Array.isArray(fieldValue)
                        ? fieldValue.join(' ')
                        : String(fieldValue);

                    if (fuzzySearch) {
                        const match = fuzzyMatch(query, searchText);
                        if (match) {
                            if (match.score > bestScore) {
                                bestScore = match.score;
                                highlights[String(field)] = match.indices;
                            }
                        }
                    } else if (searchText.toLowerCase().includes(q)) {
                        const indices: [number, number][] = [];
                        let idx = searchText.toLowerCase().indexOf(q);
                        while (idx !== -1) {
                            indices.push([idx, idx + q.length - 1]);
                            idx = searchText.toLowerCase().indexOf(q, idx + 1);
                        }
                        if (indices.length > 0) {
                            bestScore = Math.max(bestScore, indices.length);
                            highlights[String(field)] = indices;
                        }
                    }
                }

                return bestScore > 0 ? {item, score: bestScore, highlights} : null;
            })
            .filter((r): r is SearchResult<T> => r !== null)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);

        onSearch?.(query, activeFilters);
        return scored;
    }, [items, query, activeFilters, searchFields, fuzzySearch, minQueryLength, maxResults, onSearch]);

    const handleQueryChange = useCallback((newQuery: string) => {
        setQuery(newQuery);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            onSearch?.(newQuery, activeFilters);
        }, 150);
    }, [activeFilters, onSearch]);

    const handleFilterChange = useCallback((key: string, value: unknown) => {
        setActiveFilters(prev => {
            const next = {...prev};
            if (value === '' || value === null || value === undefined) {
                delete next[key];
            } else {
                next[key] = value;
            }
            return next;
        });
    }, []);

    const clearFilters = useCallback(() => {
        setActiveFilters({});
    }, []);

    const clearAll = useCallback(() => {
        setQuery('');
        setActiveFilters({});
    }, []);

    const hasActiveFilters = Object.keys(activeFilters).length > 0;

    return {
        query,
        setQuery: handleQueryChange,
        activeFilters,
        setFilter: handleFilterChange,
        clearFilters,
        clearAll,
        filteredItems,
        hasActiveFilters,
        isExpanded,
        setIsExpanded,
        resultCount: filteredItems.length,
    };
}

export function highlightText(text: string, indices: [number, number][]): React.ReactNode {
    if (!indices.length) return text;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    for (const [start, end] of indices) {
        if (start > lastIndex) {
            parts.push(text.slice(lastIndex, start));
        }
        parts.push(
            <mark key={start} className="bg-yellow-500/30 text-yellow-100 px-0.5 rounded">
                {text.slice(start, end + 1)}
            </mark>
        );
        lastIndex = end + 1;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts;
}

export interface SmartSearchProps<T> {
    query: string;
    onQueryChange: (query: string) => void;
    placeholder?: string;
    filters?: SearchFilter[];
    activeFilters?: Record<string, unknown>;
    onFilterChange?: (key: string, value: unknown) => void;
    onClearFilters?: () => void;
    hasActiveFilters?: boolean;
    className?: string;
    showFilterToggle?: boolean;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    filterCount?: number;
    recentSearches?: string[];
    onRecentSearch?: (query: string) => void;
    autoFocus?: boolean;
}

export function SmartSearch<T>({
    query,
    onQueryChange,
    placeholder = 'Search...',
    filters = [],
    activeFilters = {},
    onFilterChange,
    onClearFilters,
    hasActiveFilters = false,
    className = '',
    showFilterToggle = true,
    isExpanded = false,
    onToggleExpand,
    filterCount = 0,
    recentSearches = [],
    onRecentSearch,
    autoFocus = false,
}: SmartSearchProps<T>) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [showRecent, setShowRecent] = useState(false);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (showRecent) {
                setShowRecent(false);
            } else {
                onQueryChange('');
                inputRef.current?.blur();
            }
        }
    };

    return (
        <div className={cn('relative', className)}>
            <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                    ref={inputRef}
                    type="text"
                    className={cn(
                        'w-full bg-gray-900/50 border border-gray-700/50 rounded-xl',
                        'text-white placeholder-gray-600',
                        'focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20',
                        'transition-all duration-150',
                        'pl-10 pr-12 py-2.5 text-sm',
                        hasActiveFilters && 'border-blue-500/30 bg-blue-500/5'
                    )}
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => recentSearches.length > 0 && setShowRecent(true)}
                    onBlur={() => setTimeout(() => setShowRecent(false), 200)}
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Search"
                    aria-autocomplete="list"
                    aria-controls={recentSearches.length > 0 && showRecent ? 'recent-searches' : undefined}
                    aria-activedescendant={showRecent ? 'recent-0' : undefined}
                />
                {query && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white"
                        onClick={() => onQueryChange('')}
                        aria-label="Clear search"
                    >
                        <XCircleIcon className="w-5 h-5"/>
                    </Button>
                )}
                {showFilterToggle && filters.length > 0 && onToggleExpand && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn('absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white', isExpanded && 'text-blue-400')}
                        onClick={onToggleExpand}
                        aria-label={isExpanded ? 'Hide filters' : 'Show filters'}
                        aria-expanded={isExpanded}
                    >
                        <SettingsIcon className={cn('w-5 h-5', isExpanded && 'rotate-180')} />
                    </Button>
                )}
            </div>

            {isExpanded && filters.length > 0 && (
                <div className="mt-3 p-3 bg-gray-900/50 border border-gray-700/50 rounded-xl animate-slide-in-down">
                    <div className="flex flex-wrap gap-3 mb-3">
                        {filters.map(filter => (
                            <div key={filter.key} className="flex-1 min-w-[140px]">
                                <label className="block text-xs font-medium text-gray-400 mb-1">{filter.label}</label>
                                {filter.type === 'select' && filter.options && (
                                    <select
                                        className="w-full bg-gray-950/50 border border-gray-700/50 rounded-lg text-white text-sm px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                                        value={String(activeFilters[filter.key] || '')}
                                        onChange={(e) => onFilterChange?.(filter.key, e.target.value || undefined)}
                                    >
                                        <option value="">All</option>
                                        {filter.options.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                )}
                                {filter.type === 'text' && (
                                    <input
                                        type="text"
                                        className="w-full bg-gray-950/50 border border-gray-700/50 rounded-lg text-white text-sm px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                                        placeholder={filter.placeholder}
                                        value={String(activeFilters[filter.key] || '')}
                                        onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                                    />
                                )}
                                {filter.type === 'boolean' && (
                                    <select
                                        className="w-full bg-gray-950/50 border border-gray-700/50 rounded-lg text-white text-sm px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                                        value={String(activeFilters[filter.key] || '')}
                                        onChange={(e) => onFilterChange?.(filter.key, e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined)}
                                    >
                                        <option value="">All</option>
                                        <option value="true">Yes</option>
                                        <option value="false">No</option>
                                    </select>
                                )}
                            </div>
                        ))}
                    </div>
                    {hasActiveFilters && onClearFilters && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onClearFilters}
                            className="text-gray-400 hover:text-red-400"
                        >
                            Clear all filters
                        </Button>
                    )}
                </div>
            )}

            {showRecent && recentSearches.length > 0 && (
                <div
                    id="recent-searches"
                    className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-slide-in-down z-50"
                    role="listbox"
                    aria-label="Recent searches"
                >
                    <div className="px-3 py-2 border-b border-gray-700/50 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recent Searches</span>
                        {onClearFilters && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={() => setShowRecent(false)}
                                className="text-gray-500 hover:text-gray-300"
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                    <div className="py-1 max-h-60 overflow-y-auto">
                        {recentSearches.slice(0, 10).map((recent, index) => (
                            <button
                                key={recent}
                                id={`recent-${index}`}
                                onClick={() => {
                                    onRecentSearch?.(recent);
                                    setShowRecent(false);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                                role="option"
                            >
                                <div className="flex items-center gap-2">
                                    <SearchIcon className="w-4 h-4 text-gray-500 flex-shrink-0"/>
                                    <span className="truncate">{recent}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {filterCount > 0 && hasActiveFilters && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {filterCount > 9 ? '9+' : filterCount}
                </div>
            )}
        </div>
    );
}