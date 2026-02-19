import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Film, Clapperboard, MonitorPlay } from 'lucide-react';
import Studio from './components/Studio';
import MovieLibrary from './components/MovieLibrary';
import LivePreview from './components/LivePreview';

const App = () => {
  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      <nav className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col p-4">
        <h1 className="text-xl font-bold mb-8 flex items-center gap-2">
          <Clapperboard className="text-indigo-500" />
          Movie Studio
        </h1>

        <div className="space-y-2">
          <NavLink
            to="/"
            className={({isActive}) => `flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
          >
            <Clapperboard size={20} />
            Studio
          </NavLink>

          <NavLink
            to="/movies"
            className={({isActive}) => `flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
          >
            <Film size={20} />
            Library
          </NavLink>

          <NavLink
            to="/live"
            className={({isActive}) => `flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
          >
            <MonitorPlay size={20} />
            Live Preview
          </NavLink>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden bg-gray-950 p-8">
        <Routes>
          <Route path="/" element={<Studio />} />
          <Route path="/movies" element={<MovieLibrary />} />
          <Route path="/live" element={<LivePreview />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
