import React from 'react';
import { ClockIcon, PlusIcon } from '../common/icons';
import { Button } from '../common/Button';
import { DashboardWidget } from './DashboardWidget';
import { RecentNoteItem } from './RecentNoteItem';
import type { Note } from '@notention/core';

interface RecentNotesWidgetProps {
  notes: Note[];
  onSelectNote: (noteId: string) => void;
  onViewAll: () => void;
  onCreateNote: () => void;
}

export function RecentNotesWidget({
  notes,
  onSelectNote,
  onViewAll,
  onCreateNote
}: RecentNotesWidgetProps) {
  return (
    <DashboardWidget
      title="Recent Notes"
      icon={ClockIcon}
      isEmpty={notes.length === 0}
      emptyState={{
          title: "No notes yet. Start writing!",
          className: "bg-gray-800/30 rounded-xl border border-gray-800 border-dashed py-12",
          action: (
            <Button
                onClick={onCreateNote}
                variant="primary"
                icon={PlusIcon}
            >
                Create First Note
            </Button>
          )
      }}
      headerAction={
        <Button
          onClick={onViewAll}
          variant="ghost"
          size="sm"
          className="text-blue-400 hover:text-blue-300"
        >
          View all
        </Button>
      }
    >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notes.map(note => (
                <RecentNoteItem key={note.id} note={note} onClick={onSelectNote} />
            ))}
        </div>
    </DashboardWidget>
  );
};
