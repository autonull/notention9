import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../components/ui';

export interface Movie {
  name: string;
  path: string;
  size?: number;
  createdAt?: string;
  duration?: number;
}

export type SortField = 'name' | 'createdAt' | 'size' | 'duration';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'list' | 'grid';

export function useMovies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

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

  return { movies, loading, reload: loadMovies };
}

export function useMovieSelection(movies: Movie[]) {
  const [selectedMovies, setSelectedMovies] = useState<Set<string>>(new Set());
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const toggleSelectMovie = useCallback((name: string) => {
    setSelectedMovies((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const selectAllMovies = useCallback((filteredMovies: Movie[]) => {
    if (selectedMovies.size === filteredMovies.length) {
      setSelectedMovies(new Set());
    } else {
      setSelectedMovies(new Set(filteredMovies.map((m) => m.name)));
    }
  }, [selectedMovies.size]);

  const clearSelection = useCallback(() => {
    setSelectedMovies(new Set());
    setSelectedMovie(null);
  }, []);

  const handleMovieClick = useCallback(
    (movie: Movie, e: React.MouseEvent) => {
      if (e.target instanceof HTMLButtonElement) return;
      if (e.metaKey || e.ctrlKey) {
        toggleSelectMovie(movie.name);
      } else if (e.shiftKey && selectedMovie) {
        setSelectedMovie(movie);
      } else {
        setSelectedMovie(movie);
        setSelectedMovies(new Set([movie.name]));
      }
    },
    [selectedMovie, toggleSelectMovie]
  );

  return {
    selectedMovies,
    selectedMovie,
    setSelectedMovie,
    setSelectedMovies,
    toggleSelectMovie,
    selectAllMovies,
    clearSelection,
    handleMovieClick,
    isAllSelected: (filteredMovies: Movie[]) => filteredMovies.length > 0 && selectedMovies.size === filteredMovies.length,
    isIndeterminate: (filteredMovies: Movie[]) => selectedMovies.size > 0 && selectedMovies.size < filteredMovies.length,
  };
}

export function useMovieFilters(movies: Movie[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterTag, setFilterTag] = useState('');

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  const filteredAndSortedMovies = useMemo(() => {
    let result = movies.filter((movie) => {
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

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterTag('');
  }, []);

  return {
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
  };
}

export function useMovieActions(movies: Movie[], reload: () => void) {
  const { addToast } = useToast();

  const deleteMovie = useCallback(
    async (name: string) => {
      if (!confirm('Are you sure you want to delete this movie?')) return;
      try {
        await fetch(`/api/movies/${name}`, { method: 'DELETE' });
        addToast(`Deleted ${name}`, 'success');
        reload();
      } catch (e) {
        addToast('Failed to delete movie', 'error');
      }
    },
    [addToast, reload]
  );

  const deleteSelectedMovies = useCallback(
    async (selectedMovies: Set<string>) => {
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
        reload();
      }
    },
    [addToast, reload]
  );

  return { deleteMovie, deleteSelectedMovies };
}

export { formatBytes, formatDuration, formatDate } from '../utils';