import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Trash2, Film, PlayCircle, Download, Loader2, Search, X, ChevronUp, ChevronDown, Filter, MoreVertical, Check, CheckSquare, Square, SortAsc, SortDesc, Grid, List, Video, Clock, FileText } from 'lucide-react';
import { useToast } from './Toast';

interface Movie {
    name: string;
    path: string;
    size?: number;
    createdAt?: string;
    duration?: number;
}

type SortField = 'name' | 'createdAt' | 'size' | 'duration';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'grid';

const MovieSkeleton = () => (
    <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-700 rounded w-1/2" />
    </div>
);

const MovieGridSkeleton = () => (
    <div className="animate-pulse aspect-video bg-gray-800 rounded-lg" />
);

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const MovieLibrary = () => {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [selectedMovies, setSelectedMovies] = useState<Set<string>>(new Set());
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [showFilters, setShowFilters] = useState(false);
    const [filterTag, setFilterTag] = useState('');
    const { addToast } = useToast();
    const listRef = useRef<HTMLDivElement>(null);

    const loadMovies = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/movies');
            const data = await res.json();
            setMovies(data);
        } catch (e) {
            addToast('Failed to load movies', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        loadMovies();
    }, [loadMovies]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const filteredAndSortedMovies = useMemo(() => {
        let result = movies.filter(movie => {
            const matchesSearch = movie.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTag = !filterTag || movie.name.toLowerCase().includes(filterTag.toLowerCase());
            return matchesSearch && matchesTag;
        });

        result.sort((a, b) => {
            let aVal: any = a[sortField];
            let bVal: any = b[sortField];
            
            if (sortField === 'createdAt') {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
            } else if (sortField === 'size') {
                aVal = aVal || 0;
                bVal = bVal || 0;
            } else if (sortField === 'duration') {
                aVal = aVal || 0;
                bVal = bVal || 0;
            } else {
                aVal = (aVal || '').toString().toLowerCase();
                bVal = (bVal || '').toString().toLowerCase();
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [movies, searchQuery, sortField, sortDirection, filterTag]);

    const deleteMovie = async (name: string) => {
        if (!confirm('Are you sure you want to delete this movie?')) return;
        try {
            await fetch(`/api/movies/${name}`, { method: 'DELETE' });
            addToast(`Deleted ${name}`, 'success');
            loadMovies();
            setSelectedMovies(prev => {
                const next = new Set(prev);
                next.delete(name);
                return next;
            });
            if (selectedMovie?.name === name) setSelectedMovie(null);
        } catch (e) {
            addToast('Failed to delete movie', 'error');
        }
    };

    const deleteSelectedMovies = async () => {
        if (selectedMovies.size === 0) return;
        if (!confirm(`Delete ${selectedMovies.size} selected movies?`)) return;
        
        let successCount = 0;
        for (const name of selectedMovies) {
            try {
                await fetch(`/api/movies/${name}`, { method: 'DELETE' });
                successCount++;
            } catch (e) {
                addToast(`Failed to delete ${name}`, 'error');
            }
        }
        
        if (successCount > 0) {
            addToast(`Deleted ${successCount} movie${successCount !== 1 ? 's' : ''}`, 'success');
            loadMovies();
            setSelectedMovies(new Set());
            if (selectedMovie && selectedMovies.has(selectedMovie.name)) {
                setSelectedMovie(null);
            }
        }
    };

    const toggleSelectMovie = (name: string) => {
        setSelectedMovies(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const selectAllMovies = () => {
        if (selectedMovies.size === filteredAndSortedMovies.length) {
            setSelectedMovies(new Set());
        } else {
            setSelectedMovies(new Set(filteredAndSortedMovies.map(m => m.name)));
        }
    };

    const clearSearch = () => setSearchQuery('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                // Could implement keyboard navigation
                break;
            case 'ArrowUp':
                e.preventDefault();
                break;
            case 'Enter':
                if (selectedMovie) {
                    // Focus the video player
                }
                break;
            case 'Escape':
                setSelectedMovie(null);
                setSelectedMovies(new Set());
                break;
            case 'a':
                if (e.metaKey || e.ctrlKey) {
                    e.preventDefault();
                    selectAllMovies();
                }
                break;
        }
    };

    const isAllSelected = filteredAndSortedMovies.length > 0 && selectedMovies.size === filteredAndSortedMovies.length;
    const isIndeterminate = selectedMovies.size > 0 && selectedMovies.size < filteredAndSortedMovies.length;

    return (
        <div className="flex h-full gap-6" onKeyDown={handleKeyDown}>
            {/* Sidebar - Movie List */}
            <div className="w-full lg:w-1/3 bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-700/50 flex flex-col backdrop-blur-sm shadow-xl">
                {/* Header */}
                <div className="p-4 bg-gray-900/50 border-b border-gray-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Film className="text-indigo-400" size={24} />
                        <div>
                            <h2 className="font-bold text-white">Library</h2>
                            <p className="text-xs text-gray-500">{filteredAndSortedMovies.length} of {movies.length} movies</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* View Mode Toggle */}
                        <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700" role="group" aria-label="View mode">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'}`}
                                aria-pressed={viewMode === 'list'}
                                aria-label="List view"
                            >
                                <List size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'}`}
                                aria-pressed={viewMode === 'grid'}
                                aria-label="Grid view"
                            >
                                <Grid size={16} />
                            </button>
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white hover:border-gray-600 transition-colors touch-target-48"
                                aria-expanded={showFilters}
                                aria-haspopup="true"
                            >
                                <Filter size={16} className={showFilters ? 'text-indigo-400' : ''} />
                                <span>Sort: {sortField}</span>
                                <span className="text-gray-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            </button>
                            {showFilters && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setShowFilters(false)} 
                                        aria-hidden="true"
                                    />
                                    <div className="absolute right-0 top-full mt-2 z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-xl min-w-[200px] py-2 animate-slide-in-down">
                                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-700">Sort By</div>
                                        {(['name', 'createdAt', 'size', 'duration'] as SortField[]).map(field => (
                                            <button
                                                key={field}
                                                onClick={() => { handleSort(field); setShowFilters(false); }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                                            >
                                                {sortField === field && (
                                                    <span className="text-indigo-400">
                                                        {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </span>
                                                )}
                                                {sortField !== field && <span className="w-5" />}
                                                <span className="capitalize">{field === 'createdAt' ? 'Date' : field}</span>
                                            </button>
                                        ))}
                                        <div className="border-t border-gray-700 mt-2 pt-2">
                                            <button
                                                onClick={() => { setFilterTag(''); setShowFilters(false); }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                                            >
                                                <X size={16} />
                                                Clear Filters
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="p-3 bg-gray-900/30 border-b border-gray-700/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.stopPropagation()}
                            placeholder="Search movies..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-10 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                            aria-label="Search movies"
                        />
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors touch-target"
                                aria-label="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedMovies.size > 0 && (
                    <div className="p-3 bg-indigo-900/20 border-b border-indigo-500/30 flex items-center gap-3 animate-slide-in-down">
                        <span className="text-sm text-indigo-300 font-medium">{selectedMovies.size} selected</span>
                        <div className="flex-1" />
                        <button
                            onClick={deleteSelectedMovies}
                            className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors touch-target-48 flex items-center gap-1.5"
                        >
                            <Trash2 size={14} />
                            Delete
                        </button>
                        <button
                            onClick={() => setSelectedMovies(new Set())}
                            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors touch-target-48"
                        >
                            Clear
                        </button>
                    </div>
                )}

                {/* Movie List/Grid */}
                <div 
                    ref={listRef}
                    className="overflow-auto flex-1 p-3 custom-scrollbar"
                    role="listbox"
                    aria-label="Movies"
                >
                    {loading ? (
                        viewMode === 'list' ? (
                            Array.from({ length: 5 }).map((_, i) => <MovieSkeleton key={i} />)
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {Array.from({ length: 6 }).map((_, i) => <MovieGridSkeleton key={i} />)}
                            </div>
                        )
                    ) : filteredAndSortedMovies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                            <Film size={48} className="mb-4 opacity-50" />
                            <p className="text-center">{searchQuery || filterTag ? 'No movies match your search.' : 'No movies yet.'}</p>
                            {!searchQuery && !filterTag && (
                                <p className="text-xs text-gray-600 mt-2">Start a production in the Studio to create movies</p>
                            )}
                        </div>
                    ) : viewMode === 'list' ? (
                        <div className="space-y-1" role="listbox">
                            {filteredAndSortedMovies.map((movie, index) => {
                                const isSelected = selectedMovie?.name === movie.name;
                                const isChecked = selectedMovies.has(movie.name);
                                
                                return (
                                    <div
                                        key={movie.name}
                                        onClick={(e) => {
                                            if (e.target instanceof HTMLButtonElement) return;
                                            if (e.metaKey || e.ctrlKey) {
                                                toggleSelectMovie(movie.name);
                                            } else if (e.shiftKey && selectedMovie) {
                                                // Range selection could be implemented
                                                setSelectedMovie(movie);
                                            } else {
                                                setSelectedMovie(movie);
                                                setSelectedMovies(new Set([movie.name]));
                                            }
                                        }}
                                        onDoubleClick={() => {}}
                                        className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-150 flex items-center gap-3 ${
                                            isSelected
                                                ? 'bg-indigo-900/30 border border-indigo-500/50'
                                                : 'hover:bg-gray-700/50'
                                        } ${isChecked && !isSelected ? 'bg-indigo-900/10' : ''}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        aria-checked={isChecked}
                                    >
                                        {/* Checkbox for multi-select */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleSelectMovie(movie.name); }}
                                            className="flex-shrink-0 p-1.5 text-gray-500 hover:text-white transition-colors touch-target"
                                            aria-label={isChecked ? 'Deselect' : 'Select'}
                                            aria-pressed={isChecked}
                                        >
                                            {isChecked ? (
                                                <CheckSquare size={18} className="text-indigo-400" />
                                            ) : (
                                                <Square size={18} />
                                            )}
                                        </button>

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
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedMovie(movie); }}
                                                className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition-colors touch-target"
                                                aria-label="Preview"
                                            >
                                                <PlayCircle size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteMovie(movie.name); }}
                                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors touch-target"
                                                aria-label="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3" role="listbox">
                            {filteredAndSortedMovies.map((movie) => {
                                const isSelected = selectedMovie?.name === movie.name;
                                const isChecked = selectedMovies.has(movie.name);
                                
                                return (
                                    <div
                                        key={movie.name}
                                        onClick={(e) => {
                                            if (e.target instanceof HTMLButtonElement) return;
                                            if (e.metaKey || e.ctrlKey) {
                                                toggleSelectMovie(movie.name);
                                            } else {
                                                setSelectedMovie(movie);
                                                setSelectedMovies(new Set([movie.name]));
                                            }
                                        }}
                                        className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer transition-all duration-150 group ${
                                            isSelected
                                                ? 'ring-2 ring-indigo-500 bg-indigo-900/20'
                                                : 'hover:ring-1 ring-gray-600'
                                        } ${isChecked && !isSelected ? 'ring-1 ring-indigo-500/50' : ''}`}
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
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleSelectMovie(movie.name); }}
                                                    className={`p-1.5 rounded-full transition-colors touch-target ${
                                                        isChecked 
                                                            ? 'bg-indigo-500 text-white' 
                                                            : 'bg-black/50 text-white hover:bg-black/70'
                                                    }`}
                                                    aria-label={isChecked ? 'Deselect' : 'Select'}
                                                    aria-pressed={isChecked}
                                                >
                                                    {isChecked ? <Check size={14} /> : <Square size={14} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedMovie(movie); }}
                                                className="p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 touch-target"
                                                aria-label="Preview"
                                            >
                                                <PlayCircle size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteMovie(movie.name); }}
                                                className="p-1.5 bg-black/50 text-white rounded-full hover:bg-red-900/50 touch-target"
                                                aria-label="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Pane */}
            <div className="flex-1 bg-black/50 rounded-2xl overflow-hidden border border-gray-800 relative flex flex-col backdrop-blur-sm shadow-xl">
                {selectedMovie ? (
                    <div className="w-full h-full flex flex-col relative">
                        <div className="bg-gray-900/50 p-3 border-b border-gray-700/50 font-medium flex items-center justify-between">
                            <div className="flex items-center gap-3 mr-2">
                                <Video size={18} className="text-indigo-400" />
                                <span className="truncate">{selectedMovie.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedMovie.duration && (
                                    <span className="text-xs text-gray-400 flex items-center gap-1 px-2 py-0.5 bg-gray-800 rounded">
                                        <Clock size={10} />{formatDuration(selectedMovie.duration)}
                                    </span>
                                )}
                                {selectedMovie.size && (
                                    <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-800 rounded">
                                        {formatBytes(selectedMovie.size)}
                                    </span>
                                )}
                                <a
                                    href={selectedMovie.path}
                                    download
                                    className="text-gray-400 hover:text-white transition-colors p-2 touch-target"
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
                                    addToast('Failed to play video', 'error');
                                }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 p-8">
                        <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-6">
                            <PlayCircle size={48} className="opacity-50" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-400 mb-2">No movie selected</h3>
                        <p className="text-gray-500 text-center max-w-xs">
                            Select a movie from the library to preview it here. Use checkboxes to select multiple movies for bulk actions.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3 justify-center text-xs text-gray-600">
                            <kbd className="px-2 py-1 bg-gray-800 rounded">⌘A</kbd> Select all
                            <kbd className="px-2 py-1 bg-gray-800 rounded">Esc</kbd> Clear selection
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MovieLibrary;
