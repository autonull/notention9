import React from 'react';
import { useControlMode, ControlMode } from '../contexts/ControlModeContext';
import { LockIcon, UserGroupIcon, CpuChipIcon } from './icons';

export function ControlToggle() {
  const { mode, setMode } = useControlMode();

  const handleModeChange = (newMode: ControlMode) => {
    // In future: Add confirmation/auth for auto mode
    setMode(newMode);
  };

  return (
    <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg p-1 select-none">
      <button
        onClick={() => handleModeChange('manual')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          mode === 'manual'
            ? 'bg-green-900/30 text-green-400 shadow-sm border border-green-500/20'
            : 'text-gray-500 hover:text-gray-300'
        }`}
        title="Manual Mode: You are the pilot."
      >
        <LockIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Manual</span>
      </button>

      <div className="w-px h-4 bg-gray-800 mx-1"></div>

      <button
        onClick={() => handleModeChange('assist')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          mode === 'assist'
            ? 'bg-yellow-900/30 text-yellow-400 shadow-sm border border-yellow-500/20'
            : 'text-gray-500 hover:text-gray-300'
        }`}
        title="Assist Mode: Agent helps but waits for approval."
      >
        <UserGroupIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Assist</span>
      </button>

      <div className="w-px h-4 bg-gray-800 mx-1"></div>

      <button
        onClick={() => handleModeChange('auto')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          mode === 'auto'
            ? 'bg-red-900/30 text-red-400 shadow-sm border border-red-500/20 animate-pulse'
            : 'text-gray-500 hover:text-gray-300'
        }`}
        title="Auto Mode: Agent acts autonomously."
      >
        <CpuChipIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Auto</span>
      </button>
    </div>
  );
}
