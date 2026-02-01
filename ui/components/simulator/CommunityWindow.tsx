import React from 'react';
import type { Note } from '@notention/core';
import { WorldIcon } from '../common/icons';
import { useNetworkMatching } from '../../hooks/useNetworkMatching';
import { NetworkEventItem } from './NetworkEventItem';
import { Badge } from '../common/Badge';

interface Props {
  networkNotes: Note[];
  onSaveNote?: (note: Note) => void;
}

export function CommunityWindow({ networkNotes, onSaveNote }: Props) {
  const matches = useNetworkMatching(networkNotes);

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-sm">
      <div className="bg-purple-900/20 px-3 py-2 border-b border-purple-500/20 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <WorldIcon className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-xs text-purple-200 tracking-wide">NETWORK</h3>
        </div>
        <Badge variant="primary" size="sm" className="bg-purple-900/40 border-purple-500/20 text-purple-400">
            {networkNotes.length} Events
        </Badge>
      </div>

      <div className="flex-grow p-2 overflow-y-auto relative bg-gray-950/50 custom-scrollbar">
        {networkNotes.length === 0 && (
            <div className="flex items-center justify-center h-full flex-col gap-2 text-gray-600">
                <WorldIcon className="w-8 h-8 opacity-20" />
                <span className="text-[10px] italic">Waiting for network activity...</span>
            </div>
        )}

        <div className="space-y-2">
            {networkNotes.map((note) => {
                const relatedMatches = matches.filter(m => m.source.id === note.id || m.target.id === note.id);

                return (
                    <NetworkEventItem
                        key={note.id}
                        note={note}
                        relatedMatches={relatedMatches}
                        onSaveNote={onSaveNote}
                    />
                );
            })}
        </div>
      </div>
    </div>
  );
};
