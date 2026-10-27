import React from 'react';
import { Trash2, Film, PlayCircle, Download, Loader2, Search, X, ChevronUp, ChevronDown, Filter, Check, CheckSquare, Square, List, Grid, Video, Clock, FileText, MoreVertical } from 'lucide-react';
import { type Movie, type ViewMode } from '../hooks/useMovies';
import { Button, IconButton, Kbd, Skeleton } from './ui';
import { Card } from './ui';
import { Badge } from './ui';
import { DesignTokens } from './ui';
import { cn, formatBytes, formatDuration, formatDate } from '../utils';

export const MovieSkeleton = () => <Skeleton className="h-4 bg-gray-700 rounded w-3/4" />;
export const MovieGridSkeleton = () => <Skeleton className="aspect-video bg-gray-800 rounded-lg" />;

interface MovieListItemProps {
  movie: Movie;
  isSelected: boolean;
  isChecked: boolean;
  onClick: (e: React.MouseEvent) => void;
  onToggleSelect: (e: React.MouseEvent) => void;
  onPreview: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

export const MovieListItem = ({ movie, isSelected, isChecked, onClick, onToggleSelect, onPreview, onDelete }: MovieListItemProps) => (
  <div
    onClick={onClick}
    className={cn(
      'group relative p-3 rounded-xl cursor-pointer flex items-center gap-3',
      DesignTokens.colors.state.transitionFast,
      isSelected ? 'bg-indigo-900/30 border border-indigo-500/50' : 'hover:bg-gray-700/50',
      isChecked && !isSelected && 'bg-indigo-900/10'
    )}
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
        <span className={cn('font-medium truncate', isSelected ? 'text-white' : 'text-gray-200')}>
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

interface MovieGridItemProps {
  movie: Movie;
  isSelected: boolean;
  isChecked: boolean;
  onClick: (e: React.MouseEvent) => void;
  onToggleSelect: (e: React.MouseEvent) => void;
  onPreview: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

export const MovieGridItem = ({ movie, isSelected, isChecked, onClick, onToggleSelect, onPreview, onDelete }: MovieGridItemProps) => (
  <div
    onClick={onClick}
    className={cn(
      'relative aspect-video rounded-xl overflow-hidden cursor-pointer group',
      DesignTokens.colors.state.transitionFast,
      isSelected ? 'ring-2 ring-indigo-500 bg-indigo-900/20' : 'hover:ring-1 ring-gray-600',
      isChecked && !isSelected && 'ring-1 ring-indigo-500/50'
    )}
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
          className={cn(isChecked ? 'bg-indigo-500 text-white' : 'bg-black/50 text-white hover:bg-black/70')}
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

interface EmptyStateProps {
  message: string;
  action?: React.ReactNode;
}

export const EmptyState = ({ message, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
    <Film size={48} className="mb-4 opacity-50" />
    <p className="text-center">{message}</p>
    {action}
  </div>
);

interface PreviewPaneProps {
  selectedMovie: Movie | null;
  onClose: () => void;
  onDownload: (path: string) => void;
}

export const PreviewPane = ({ selectedMovie, onClose, onDownload }: PreviewPaneProps) => {
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
      <div className={cn('bg-gray-900/50 p-3 border-b', DesignTokens.colors.border.muted, 'font-medium flex items-center justify-between')}>
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