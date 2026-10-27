import React, { useState, useRef, useCallback } from 'react';
import { Trash2, Film, PlayCircle, Download, Loader2, Search, X, ChevronUp, ChevronDown, Filter, Check, CheckSquare, Square, List, Grid, Video, Clock, FileText, MoreVertical } from 'lucide-react';
import { useMovies, useMovieSelection, useMovieFilters, useMovieActions, type Movie, type ViewMode } from '../hooks/useMovies';
import { useToast } from '../components/ui';
import { Button, IconButton, Input, Kbd, Skeleton } from '../components/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui';
import { Badge } from '../components/ui';
import { Dropdown } from '../components/ui';
import { Modal, ConfirmModal } from '../components/ui';
import { DesignTokens } from '../components/ui';
import { cn, formatBytes, formatDuration, formatDate } from '../utils';
import { MovieSkeleton, MovieGridSkeleton, MovieListItem, MovieGridItem, EmptyState, PreviewPane } from './MovieLibraryComponents';

export const MovieLibrary = () => {
  const { movies, loading, reload: loadMovies } = useMovies();
  const { addToast } = useToast();
  const listRef = useRef<HTMLDivElement>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteMultiple, setDeleteMultiple] = useState(false);

  const {
    searchQuery,
    setSearchQuery,
    sortField,
    sortDirection,
    handleSort,
    viewMode,
    setViewMode,
    filterTag,
    setFilterTag,
    filteredAndSortedMovies,
    clearFilters,
  } = useMovieFilters(movies);

  const {
    selectedMovies,
    selectedMovie,
    setSelectedMovie,
    setSelectedMovies,
    toggleSelectMovie,
    selectAllMovies,
    clearSelection,
    handleMovieClick,
    isAllSelected,
    isIndeterminate,
  } = useMovieSelection(movies);

  const { deleteMovie, deleteSelectedMovies } = useMovieActions(movies, loadMovies);

  const handleDeleteMovie = useCallback((name: string) => {
    setDeleteTarget(name);
    setDeleteMultiple(false);
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedMovies.size === 0) return;
    setDeleteMultiple(true);
    setShowDeleteConfirm(true);
  }, [selectedMovies.size]);

  const confirmDelete = useCallback(() => {
    if (deleteTarget) {
      if (deleteMultiple) {
        deleteSelectedMovies(selectedMovies).then(() => {
          setSelectedMovies(new Set());
          setSelectedMovie(null);
        });
      } else {
        deleteMovie(deleteTarget).then(() => {
          if (selectedMovie?.name === deleteTarget) setSelectedMovie(null);
        });
      }
    }
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  }, [deleteTarget, deleteMultiple, selectedMovies, selectedMovie, deleteMovie, deleteSelectedMovies, setSelectedMovies, setSelectedMovie]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault();
        break;
      case 'Enter':
        if (selectedMovie) {
          // Focus the video player
        }
        break;
      case 'Escape':
        clearSelection();
        break;
      case 'a':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          selectAllMovies(filteredAndSortedMovies);
        }
        break;
    }
  };

  const isAllSelectedValue = isAllSelected(filteredAndSortedMovies);
  const isIndeterminateValue = isIndeterminate(filteredAndSortedMovies);

  return (
    <div className="flex h-full gap-6" onKeyDown={handleKeyDown}>
      {/* Sidebar - Movie List */}
      <div className={cn(
        'w-full lg:w-1/3 rounded-2xl overflow-hidden flex flex-col',
        DesignTokens.card.elevated,
        DesignTokens.shadows.card,
        'backdrop-blur-sm'
      )}>
        {/* Header */}
        <CardHeader className={cn('p-4', DesignTokens.colors.background.panel, 'border-b', DesignTokens.colors.border.muted, 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4')}>
          <div className="flex items-center gap-3">
            <Film className="text-indigo-400" size={24} />
            <div>
              <CardTitle className="text-white">Library</CardTitle>
              <CardDescription>{filteredAndSortedMovies.length} of {movies.length} movies</CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className={cn('flex bg-gray-900 rounded-lg p-1 border', DesignTokens.colors.border.muted)} role="group" aria-label="View mode">
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                aria-label="List view"
              >
                <List size={16} />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                aria-label="Grid view"
              >
                <Grid size={16} />
              </Button>
            </div>

            {/* Sort Dropdown */}
            <Dropdown align="right">
              <Dropdown.Item
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Filter size={16} />}
                    className={cn(showFilters && 'text-indigo-400')}
                  >
                    Sort: {sortField}
                    <span className="text-gray-500 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  </Button>
                }
                items={[
                  { label: 'Sort by Name', onClick: () => { handleSort('name'); setShowFilters(false); }, icon: sortField === 'name' ? (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : null },
                  { label: 'Sort by Date', onClick: () => { handleSort('createdAt'); setShowFilters(false); }, icon: sortField === 'createdAt' ? (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : null },
                  { label: 'Sort by Size', onClick: () => { handleSort('size'); setShowFilters(false); }, icon: sortField === 'size' ? (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : null },
                  { label: 'Sort by Duration', onClick: () => { handleSort('duration'); setShowFilters(false); }, icon: sortField === 'duration' ? (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : null },
                  { label: 'Clear Filters', onClick: clearFilters, icon: <X size={16} />, dividerAfter: true },
                ]}
              />
            </Dropdown>
          </div>
        </CardHeader>

        {/* Search Bar */}
        <div className={cn('p-3', DesignTokens.colors.background.panel, 'border-b', DesignTokens.colors.border.muted)}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <Input
              id="movie-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search movies..."
              className="w-full"
              aria-label="Search movies"
              icon={<X size={16} />}
              iconPosition="right"
            />
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedMovies.size > 0 && (
          <div className={cn('p-3 flex items-center gap-3 animate-slide-in-down', DesignTokens.colors.status.connecting.bg, 'border-b', DesignTokens.colors.status.connecting.border)}>
            <Badge variant="primary" size="sm">{selectedMovies.size} selected</Badge>
            <div className="flex-1" />
            <Button variant="danger" size="sm" onClick={handleDeleteSelected} icon={<Trash2 size={14} />}>
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        )}

        {/* Movie List/Grid */}
        <CardContent className={cn('p-3 flex-1 overflow-auto custom-scrollbar')} ref={listRef} role="listbox" aria-label="Movies">
          {loading ? (
            viewMode === 'list' ? (
              Array.from({ length: 5 }).map((_, i) => <MovieSkeleton key={i} />)
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <MovieGridSkeleton key={i} />)}
              </div>
            )
          ) : filteredAndSortedMovies.length === 0 ? (
            <EmptyState message={searchQuery || filterTag ? 'No movies match your search.' : 'No movies yet.'} />
          ) : viewMode === 'list' ? (
            <div className="space-y-1">
              {filteredAndSortedMovies.map((movie) => {
                const isSelected = selectedMovie?.name === movie.name;
                const isChecked = selectedMovies.has(movie.name);
                return (
                  <MovieListItem
                    key={movie.name}
                    movie={movie}
                    isSelected={isSelected}
                    isChecked={isChecked}
                    onClick={(e) => handleMovieClick(movie, e)}
                    onToggleSelect={(e) => { e.stopPropagation(); toggleSelectMovie(movie.name); }}
                    onPreview={(e) => { e.stopPropagation(); setSelectedMovie(movie); }}
                    onDelete={(e) => { e.stopPropagation(); handleDeleteMovie(movie.name); }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredAndSortedMovies.map((movie) => {
                const isSelected = selectedMovie?.name === movie.name;
                const isChecked = selectedMovies.has(movie.name);
                return (
                  <MovieGridItem
                    key={movie.name}
                    movie={movie}
                    isSelected={isSelected}
                    isChecked={isChecked}
                    onClick={(e) => handleMovieClick(movie, e)}
                    onToggleSelect={(e) => { e.stopPropagation(); toggleSelectMovie(movie.name); }}
                    onPreview={(e) => { e.stopPropagation(); setSelectedMovie(movie); }}
                    onDelete={(e) => { e.stopPropagation(); handleDeleteMovie(movie.name); }}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </div>

      {/* Preview Pane */}
      <div className={cn('flex-1 rounded-2xl overflow-hidden flex flex-col', DesignTokens.card.elevated, DesignTokens.shadows.card, 'backdrop-blur-sm')}>
        <PreviewPane selectedMovie={selectedMovie} onClose={clearSelection} onDownload={() => {}} />
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
        onConfirm={confirmDelete}
        title={deleteMultiple ? 'Delete Multiple Movies' : 'Delete Movie'}
        message={deleteMultiple
          ? `Are you sure you want to delete ${selectedMovies.size} selected movies? This cannot be undone.`
          : `Are you sure you want to delete "${deleteTarget}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

export default MovieLibrary;