import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Trash2, Film, PlayCircle, Download, Loader2, Search, X, ChevronUp, ChevronDown, Filter, Check, CheckSquare, Square, List, Grid, Video, Clock, FileText, MoreVertical } from 'lucide-react';
import { useMovies, useMovieSelection, useMovieFilters, useMovieActions, formatBytes, formatDuration, formatDate, type Movie, type ViewMode, type SortField, type SortDirection } from '../hooks/useMovies';
import { useToast } from '../components/Toast';
import { Button, IconButton, Input, Kbd, Skeleton } from '../components/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui';
import { Badge } from '../components/ui';
import { Dropdown, DropdownTrigger } from '../components/ui';
import { Modal, ConfirmModal } from '../components/ui';

const MovieSkeleton = () => <Skeleton className="h-4 bg-gray-700 rounded w-3/4" />;
const MovieGridSkeleton = () => <Skeleton className="aspect-video bg-gray-800 rounded-lg" />;

const MovieListItem = ({ movie, isSelected, isChecked, onClick, onToggleSelect, onPreview, onDelete }: {
  movie: Movie;
  isSelected: boolean;
  isChecked: boolean;
  onClick: (e: React.MouseEvent) => void;
  onToggleSelect: (e: React.MouseEvent) => void;
  onPreview: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) => (
  <div
    onClick={onClick}
    className={`
      group relative p-3 rounded-xl cursor-pointer transition-all duration-150 flex items-center gap-3
      ${isSelected ? 'bg-indigo-900/30 border border-indigo-500/50' : 'hover:bg-gray-700/50'}
      ${isChecked && !isSelected ? 'bg-indigo-900/10' : ''}
    `}
    role="option"
    aria-selected={isSelected}
    aria-checked={isChecked}
  >
    <Button
      variant="ghost"
      size="sm"
      className="flex-shrink-0 p-1.5 text-gray-500 hover:text-white transition-colors"
      onClick={onToggleSelect}
      aria-label={isChecked ? 'Deselect' : 'Select'}
      aria-pressed={isChecked}
    >
      {isChecked ? <CheckSquare size={18} className="text-indigo-400" /> : <Square size={18} />}
    </Button>

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 truncate">
        <Video size={16} className="text-gray-500 flex-shrink-0" />
        <span className={`font-medium truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
          {movie.name}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
        {movie.size && <span className="flex items-center gap-1">{formatBytes(movie.size)}</span>}
        {movie.duration && <span className="flex items-center gap-1"><Clock size={12} />{formatDuration(movie.duration)}</span>}
        {movie.createdAt && <span className="flex items-center gap-1">{formatDate(movie.createdAt)}</span>}
      </div>
    </div>

    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <IconButton size="sm" onClick={onPreview} aria-label="Preview">
        <PlayCircle size={16} />
      </IconButton>
      <IconButton size="sm" onClick={onDelete} aria-label="Delete" className="text-gray-500 hover:text-red-400 hover:bg-red-900/30">
        <Trash2 size={16} />
      </IconButton>
    </div>
  </div>
);

const MovieGridItem = ({ movie, isSelected, isChecked, onClick, onToggleSelect, onPreview, onDelete }: {
  movie: Movie;
  isSelected: boolean;
  isChecked: boolean;
  onClick: (e: React.MouseEvent) => void;
  onToggleSelect: (e: React.MouseEvent) => void;
  onPreview: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) => (
  <div
    onClick={onClick}
    className={`
      relative aspect-video rounded-xl overflow-hidden cursor-pointer transition-all duration-150 group
      ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-900/20' : 'hover:ring-1 ring-gray-600'}
      ${isChecked && !isSelected ? 'ring-1 ring-indigo-500/50' : ''}
    `}
    role="option"
    aria-selected={isSelected}
    aria-checked={isChecked}
  >
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
    <video
      src={movie.path}
      muted
      loop
      playsInline
      className="w-full h-full object-cover"
      preload="metadata"
    />
    <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white truncate">{movie.name}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            {movie.duration && <span><Clock size={10} />{formatDuration(movie.duration)}</span>}
            {movie.size && <span className="ml-2">{formatBytes(movie.size)}</span>}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`${isChecked ? 'bg-indigo-500 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}
          onClick={onToggleSelect}
          aria-label={isChecked ? 'Deselect' : 'Select'}
          aria-pressed={isChecked}
        >
          {isChecked ? <Check size={14} /> : <Square size={14} />}
        </Button>
      </div>
    </div>
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-1">
      <IconButton size="sm" onClick={onPreview} aria-label="Preview">
        <PlayCircle size={14} />
      </IconButton>
      <IconButton size="sm" onClick={onDelete} aria-label="Delete" className="hover:bg-red-900/50">
        <Trash2 size={14} />
      </IconButton>
    </div>
  </div>
);

const EmptyState = ({ message, action }: { message: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
    <Film size={48} className="mb-4 opacity-50" />
    <p className="text-center">{message}</p>
    {action}
  </div>
);

const PreviewPane = ({ selectedMovie, onClose, onDownload }: {
  selectedMovie: Movie | null;
  onClose: () => void;
  onDownload: (path: string) => void;
}) => {
  if (!selectedMovie) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-600 p-8">
        <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-6">
          <PlayCircle size={48} className="opacity-50" />
        </div>
        <h3 className="text-lg font-medium text-gray-400 mb-2">No movie selected</h3>
        <p className="text-gray-500 text-center max-w-xs">
          Select a movie from the library to preview it here. Use checkboxes to select multiple movies for bulk actions.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center text-xs text-gray-600">
          <Kbd>⌘A</Kbd> Select all
          <Kbd>Esc</Kbd> Clear selection
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative">
      <div className="bg-gray-900/50 p-3 border-b border-gray-700/50 font-medium flex items-center justify-between">
        <div className="flex items-center gap-3 mr-2">
          <Video size={18} className="text-indigo-400" />
          <span className="truncate">{selectedMovie.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {selectedMovie.duration && (
            <Badge variant="default" size="sm" className="flex items-center gap-1">
              <Clock size={10} />
              {formatDuration(selectedMovie.duration)}
            </Badge>
          )}
          {selectedMovie.size && (
            <Badge variant="default" size="sm">{formatBytes(selectedMovie.size)}</Badge>
          )}
          <a
            href={selectedMovie.path}
            download
            className="text-gray-400 hover:text-white transition-colors p-2"
            title="Download Video"
            aria-label="Download"
          >
            <Download size={20} />
          </a>
        </div>
      </div>
      <div className="flex-1 relative">
        <video
          src={selectedMovie.path}
          controls
          autoPlay
          className="w-full h-full object-contain bg-black"
          onError={(e) => {
            console.error('Video playback error:', e);
          }}
        />
      </div>
    </div>
  );
};

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
      <div className="w-full lg:w-1/3 bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-700/50 flex flex-col backdrop-blur-sm shadow-xl">
        {/* Header */}
        <CardHeader className="p-4 bg-gray-900/50 border-b border-gray-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Film className="text-indigo-400" size={24} />
            <div>
              <CardTitle className="text-white">Library</CardTitle>
              <CardDescription>{filteredAndSortedMovies.length} of {movies.length} movies</CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700" role="group" aria-label="View mode">
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
              <DropdownTrigger aria-label="Sort and filter options">
                <Button variant="ghost" size="sm" icon={<Filter size={16} />} className={showFilters ? 'text-indigo-400' : ''}>
                  Sort: {sortField}
                  <span className="text-gray-500 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                </Button>
              </DropdownTrigger>
              <Dropdown.Item
                label="Sort by Name"
                onClick={() => { handleSort('name'); setShowFilters(false); }}
                icon={sortField === 'name' ? (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : null}
              />
              <Dropdown.Item
                label="Sort by Date"
                onClick={() => { handleSort('createdAt'); setShowFilters(false); }}
                icon={sortField === 'createdAt' ? (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : null}
              />
              <Dropdown.Item
                label="Sort by Size"
                onClick={() => { handleSort('size'); setShowFilters(false); }}
                icon={sortField === 'size' ? (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : null}
              />
              <Dropdown.Item
                label="Sort by Duration"
                onClick={() => { handleSort('duration'); setShowFilters(false); }}
                icon={sortField === 'duration' ? (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : null}
              />
              <Dropdown.Item dividerAfter label="Clear Filters" onClick={clearFilters} icon={<X size={16} />} />
            </Dropdown>
          </div>
        </CardHeader>

        {/* Search Bar */}
        <div className="p-3 bg-gray-900/30 border-b border-gray-700/50">
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
          <div className="p-3 bg-indigo-900/20 border-b border-indigo-500/30 flex items-center gap-3 animate-slide-in-down">
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
        <CardContent className="p-3 flex-1 overflow-auto custom-scrollbar" ref={listRef} role="listbox" aria-label="Movies">
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
      <div className="flex-1 bg-black/50 rounded-2xl overflow-hidden border border-gray-800 relative flex flex-col backdrop-blur-sm shadow-xl">
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