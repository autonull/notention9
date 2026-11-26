import { useState, useMemo } from 'react';
import { useHelp } from '@/hooks';
import { Button } from '../ui/Button';
import { cn } from '../../utils/ui';
import { SearchIcon, ChevronRightIcon, CheckCircleIcon, ClockIcon } from '../ui/icons';

export interface HelpSidebarProps {
  className?: string;
  onTopicSelect?: (topicId: string) => void;
  onSearch?: (query: string) => void;
}

export function HelpSidebar({ className, onTopicSelect, onSearch }: HelpSidebarProps) {
  const { categories, topics, search, getProgress, currentTopicId } = useHelp();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['getting-started', 'core-skills']));
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setShowSearchResults(true);
      onSearch?.(query);
    } else {
      setShowSearchResults(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return search(searchQuery, { limit: 10 });
  }, [search, searchQuery]);

  const renderTopic = (topicId: string) => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return null;
    
    const progress = getProgress(topicId);
    const isCurrent = currentTopicId === topicId;
    const isCompleted = progress?.completedAt;
    const isInProgress = progress?.startedAt && !progress?.completedAt;

    return (
      <button
        key={topicId}
        onClick={() => { onTopicSelect?.(topicId); setShowSearchResults(false); }}
        className={cn(
          'w-full text-left px-3 py-2 rounded-lg transition-colors',
          'hover:bg-[var(--app-raised)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]',
          isCurrent && 'bg-[var(--app-accent-soft)] text-[var(--app-accent)] font-medium',
          !isCurrent && 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
        )}
        data-testid={`sidebar-topic-${topicId}`}
      >
        <div className="flex items-center gap-2">
          {isCompleted && (
            <CheckCircleIcon className="w-4 h-4 text-[var(--color-success)] flex-shrink-0" />
          )}
          {isInProgress && !isCompleted && (
            <ClockIcon className="w-4 h-4 text-[var(--color-warning)] flex-shrink-0 animate-pulse" />
          )}
          <span className="flex-1 truncate text-sm">{topic.title}</span>
          {isCurrent && <ChevronRightIcon className="w-4 h-4 flex-shrink-0" />}
        </div>
      </button>
    );
  };

  if (showSearchResults && searchQuery.trim()) {
    return (
      <div className={cn('help-sidebar', className)}>
        <div className="p-4 border-b border-[var(--app-line)]">
          <h3 className="text-sm font-semibold text-[var(--app-text)] mb-2">Search Results</h3>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-sm text-[var(--app-muted)] px-2 py-4">No topics found</p>
            ) : (
              searchResults.map(result => (
                <button
                  key={result.topicId}
                  onClick={() => { onTopicSelect?.(result.topicId); setShowSearchResults(false); setSearchQuery(''); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--app-raised)] transition-colors"
                  data-testid={`search-result-${result.topicId}`}
                >
                  <div className="font-medium">{result.title}</div>
                  <div className="text-xs text-[var(--app-muted)]">{result.category}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('help-sidebar flex flex-col', className)}>
      <div className="p-4 border-b border-[var(--app-line)]">
        <label htmlFor="sidebar-search" className="sr-only">Search help</label>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--app-muted)]" />
          <input
            id="sidebar-search"
            type="search"
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)] text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] text-sm"
            data-testid="sidebar-search"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {categories.map(category => {
          const topicIds = category.topicIds.filter(id => topics.some(t => t.id === id));
          if (topicIds.length === 0) return null;
          
          const isExpanded = expandedCategories.has(category.id);
          
          return (
            <div key={category.id} className="border border-[var(--app-line)] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(category.id)}
                className={cn(
                  'w-full px-3 py-2 flex items-center gap-2',
                  'text-left font-medium text-[var(--app-text)]',
                  'hover:bg-[var(--app-raised)] transition-colors'
                )}
                data-testid={`sidebar-category-${category.id}`}
              >
                <span className="text-lg">{category.icon}</span>
                <span className="flex-1">{category.name}</span>
                <ChevronRightIcon 
                  className={cn('w-4 h-4 text-[var(--app-muted)] transition-transform', isExpanded && 'rotate-90')} 
                />
              </button>
              
              {isExpanded && (
                <div className="px-2 pb-2 space-y-1 border-t border-[var(--app-line)]">
                  {topicIds.map(renderTopic)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}