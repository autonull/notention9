import React, { useState, useEffect } from 'react';
import { Trash2, Film, PlayCircle, Download } from 'lucide-react';
import { useToast } from './Toast';

interface Movie {
    name: string;
    path: string;
}

const MovieLibrary = () => {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const { addToast } = useToast();

    const loadMovies = () => {
        fetch('/api/movies')
            .then(res => res.json())
            .then(setMovies);
    };

    useEffect(() => {
        loadMovies();
    }, []);

    const deleteMovie = async (name: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await fetch(`/api/movies/${name}`, { method: 'DELETE' });
            addToast(`Deleted ${name}`, 'success');
            loadMovies();
            if (selectedMovie?.name === name) setSelectedMovie(null);
        } catch (e) {
            addToast('Failed to delete movie', 'error');
        }
    };

    return (
        <div className="flex h-full gap-6">
            <div className="w-1/3 bg-gray-800 rounded-xl overflow-hidden border border-gray-700 flex flex-col">
                <div className="p-4 bg-gray-700 font-bold border-b border-gray-600 flex items-center gap-2">
                    <Film className="text-indigo-400" />
                    Library ({movies.length})
                </div>
                <div className="overflow-auto flex-1 p-2 space-y-2">
                    {movies.length === 0 && (
                        <div className="text-gray-500 text-center p-8">No movies yet.</div>
                    )}
                    {movies.map(movie => (
                        <div
                            key={movie.name}
                            onClick={() => setSelectedMovie(movie)}
                            className={`p-3 rounded-lg cursor-pointer flex justify-between items-center group transition-colors ${selectedMovie?.name === movie.name ? 'bg-indigo-900/50 border border-indigo-500/50' : 'hover:bg-gray-700'}`}
                        >
                            <div className="truncate pr-2">
                                <div className="font-medium text-gray-200 truncate">{movie.name}</div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteMovie(movie.name); }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-900/50 text-red-400 rounded transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 bg-black rounded-xl overflow-hidden border border-gray-800 relative flex items-center justify-center">
                {selectedMovie ? (
                    <div className="w-full h-full flex flex-col relative">
                        <div className="bg-gray-800 p-3 border-b border-gray-700 font-medium flex justify-between items-center">
                            <span>{selectedMovie.name}</span>
                            <a
                                href={selectedMovie.path}
                                download
                                className="text-gray-400 hover:text-white transition-colors"
                                title="Download Video"
                            >
                                <Download size={20} />
                            </a>
                        </div>
                        <video
                            src={selectedMovie.path}
                            controls
                            autoPlay
                            className="w-full h-full object-contain bg-black"
                        />
                    </div>
                ) : (
                    <div className="text-gray-600 flex flex-col items-center">
                        <PlayCircle size={48} className="mb-4 opacity-50" />
                        Select a movie to preview
                    </div>
                )}
            </div>
        </div>
    );
};

export default MovieLibrary;
