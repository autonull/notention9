import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useHelp } from '@/hooks';
import { cn } from '../../utils/ui';
import { SearchIcon, XIcon, ArrowUpIcon, ArrowDownIcon, EnterIcon, EscapeIcon } from '../ui/icons';
import type { HelpSearchResult } from '@notention/core/help';

export interface HelpSearchProps {
  className?: string;
  onResultSelect?: (result: HelpSearchResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function HelpSearch({ 
  className, 
  onResultSelect, 
  placeholder = 'Search help topics...',
  autoFocus = false 
}: HelpSearchProps) {
  const { search } = useHelp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HelpSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showResults, setShowResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('help:recent-searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowResults(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value.trim()) {
      const searchResults = search(value, { limit: 8 });
      setResults(searchResults);
      setShowResults(true);
      setSelectedIndex(-1);
    } else if (recentSearches.length > 0) {
      setResults([]);
      setShowResults(true);
      setSelectedIndex(-1);
    } else {
      setShowResults(false);
    }
  }, [search, recentSearches]);

  const handleSelectResult = useCallback((result: HelpSearchResult, index: number) => {
    onResultSelect?.(result);
    setQuery(result.title);
    setShowResults(false);
    setSelectedIndex(-1);
    
    const updated = [result.title, ...recentSearches.filter(r => r !== result.title)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('help:recent-searches', JSON.stringify(updated));
  }, [onResultSelect, recentSearches]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (showResults && (results.length > 0 || recentSearches.length > 0)) {
          setSelectedIndex(prev => Math.min(prev + 1, Math.max(results.length, recentSearches.length) - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (showResults) {
          setSelectedIndex(prev => Math.max(prev - 1, -1));
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (selectedIndex < results.length) {
            handleSelectResult(results[selectedIndex], selectedIndex);
          } else {
            const recentIndex = selectedIndex - results.length;
            if (recentIndex < recentSearches.length) {
              handleSearch(recentSearches[recentIndex]);
              setSelectedIndex(-1);
            }
          }
        } else if (query.trim()) {
          handleSearch(query);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showResults, results, recentSearches, selectedIndex, query, handleSelectResult, handleSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, []);

  return (
    <div className={cn('help-search relative', className)}>
      <label htmlFor="help-search" className="sr-only">Search help</label>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--app-muted)]" />
        <input
          ref={inputRef}
          id="help-search"
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={e => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim()) {
              const searchResults = search(query, { limit: 8 });
              setResults(searchResults);
            }
            setShowResults(true);
          }}
          onBlur={() => {
            setTimeout(() => setShowResults(false), 200);
          }}
          className={cn(
            'w-full pl-10 pr-12 py-3 rounded-lg',
            'bg-[var(--app-surface)] border border-[var(--app-line)]',
            'text-[var(--app-text)] placeholder-[var(--app-muted)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]',
            'text-base'
          )}
          data-testid="help-search-input"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--app-muted)] hover:text-[var(--app-text)] transition-colors rounded"
            aria-label="Clear search"
            data-testid="help-search-clear"
          >
            <XIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {showResults && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-[var(--app-surface)] border border-[var(--app-line)] rounded-lg shadow-lg overflow-hidden max-h-96 overflow-y-auto"
          data-testid="help-search-results"
        >
          {query.trim() && results.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-1 text-xs font-medium text-[var(--app-muted)] uppercase tracking-wide">
                Search Results
              </p>
            </div>
          )}

          {query.trim() && results.length > 0 ? (
            <ul role="listbox" className="divide-y divide-[var(--app-line)]">
              {results.map((result, index) => (
                <li key={result.topicId}>
                  <button
                    role="option"
                    aria-selected={selectedIndex === index}
                    onClick={() => handleSelectResult(result, index)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors',
                      selectedIndex === index 
                        ? 'bg-[var(--app-accent-soft)] text-[var(--app-accent)]' 
                        : 'hover:bg-[var(--app-raised)] text-[var(--app-text)]'
                    )}
                    data-testid={`search-result-${result.topicId}`}
                  >
                    <div className="font-medium truncate">{result.title}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[var(--app-muted)]">
                      <span className="px-1.5 py-0.5 rounded bg-[var(--app-raised)]">{result.category}</span>
                      {result.matchedTags.length > 0 && (
                        <span>{result.matchedTags.slice(0, 3).map(t => `#${t}`).join(' ')}</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--app-muted)] mt-1 line-clamp-1">{result.snippet}</div>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim() ? (
            <div className="p-6 text-center text-[var(--app-muted)]">
              <p className="text-sm">No topics found for "{query}"</p>
              <p className="text-xs mt-1">Try different keywords or check spelling</p>
            </div>
          ) : recentSearches.length > 0 ? (
            <div>
              <div className="px-3 py-2 text-xs font-medium text-[var(--app-muted)] uppercase tracking-wide flex items-center justify-between">
                Recent Searches
                <button
                  onClick={() => {
                    setRecentSearches([]);
                    localStorage.removeItem('help:recent-searches');
                  }}
                  className="text-[var(--app-accent)] hover:underline text-sm"
                  data-testid="clear-recent-searches"
                >
                  Clear
                </button>
              </div>
              <ul role="listbox" className="divide-y divide-[var(--app-line)]">
                {recentSearches.map((recent, index) => (
                  <li key={recent}>
                    <button
                      role="option"
                      aria-selected={selectedIndex === results.length + index}
                      onClick={() => handleSearch(recent)}
                      onMouseEnter={() => setSelectedIndex(results.length + index)}
                      className={cn(
                        'w-full px-4 py-3 text-left transition-colors',
                        selectedIndex === results.length + index 
                          ? 'bg-[var(--app-accent-soft)] text-[var(--app-accent)]' 
                          : 'hover:bg-[var(--app-raised)] text-[var(--app-text)]'
                      )}
                      data-testid={`recent-search-${recent}`}
                    >
                      <div className="flex items-center gap-2">
                        <SearchIcon className="w-4 h-4 text-[var(--app-muted)] flex-shrink-0" />
                        <span className="truncate">{recent}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-6 text-center text-[var(--app-muted)]">
              <p className="text-sm">Type to search help topics</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-[var(--app-muted)]">
                <kbd className="px-2 py-1 bg-[var(--app-raised)] rounded">↑</kbd>
                <kbd className="px-2 py-1 bg-[var(--app-raised)] rounded">↓</kbd> Navigate
                <span className="mx-1">|</span>
                <kbd className="px-2 py-1 bg-[var(--app-raised)] rounded">Enter</kbd> Select
                <span className="mx-1">|</span>
                <kbd className="px-2 py-1 bg-[var(--app-raised)] rounded">Esc</kbd> Close
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}