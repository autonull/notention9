import React, { useRef } from 'react';
import type { Note } from '@notention/core';
import { TrashIcon, WorldIcon, DownloadIcon, MapPinIcon, ClockIcon, PinIcon, DocumentDuplicateIcon } from '../common/icons';
import { getTextFromHtml } from '@notention/core';
import { IconButton } from '../common/IconButton';
import { Badge } from '../common/Badge';

export const NoteListItem = React.memo(({
  note,
  isSelected,
  onSelect,
  onDelete,
  onPin,
  isTrash = false,
  onRestore
}: {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPin?: () => void;
  isTrash?: boolean;
  onRestore?: () => void;
}) => {
  const itemRef = useRef<HTMLDivElement>(null);

  const contentPreview = React.useMemo(() => {
    return getTextFromHtml(note.content) || 'No content';
  }, [note.content]);

  const hasLocation = React.useMemo(() => {
      return note.properties.some(p => ['location', 'geo', 'place', 'lat', 'lng'].includes(p.key.toLowerCase()));
  }, [note.properties]);

  const hasTime = React.useMemo(() => {
      return note.properties.some(p => {
          const k = p.key.toLowerCase();
          return k.includes('date') || k.includes('time') || k === 'start' || k === 'end' || k === 'deadline';
      });
  }, [note.properties]);

  const handleExport = (e: React.MouseEvent) => {
      e.stopPropagation();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(note, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${note.title || 'untitled'}.json`);
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = itemRef.current?.nextElementSibling as HTMLElement;
          if (next && next.classList.contains('note-list-item')) {
              next.focus();
          }
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = itemRef.current?.previousElementSibling as HTMLElement;
          if (prev && prev.classList.contains('note-list-item')) {
              prev.focus();
          } else {
              // Focus search input
              const searchInput = document.getElementById('sidebar-search-input');
              if (searchInput) {
                  searchInput.focus();
              }
          }
      } else if (e.key === 'Enter') {
          e.preventDefault();
          onSelect();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          onDelete();
      } else if (e.key.toLowerCase() === 'p' && onPin) {
          e.preventDefault();
          onPin();
      }
  };

  return (
    <div
      ref={itemRef}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`note-list-item group relative flex flex-col p-3 mx-2 my-1 rounded-lg cursor-pointer transition-all duration-200 border border-transparent
        ${isSelected
            ? 'bg-blue-900/30 border-blue-500/30 shadow-md'
            : 'hover:bg-gray-800 border-transparent hover:border-gray-700/50'
        } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
    >
      <div className="flex justify-between items-start mb-0.5">
        <h3 className={`font-semibold text-sm truncate pr-8 ${isSelected ? 'text-blue-100' : 'text-gray-200'}`}>
          {note.title || 'Untitled Note'}
        </h3>
        {note.pinned && (
             <PinIcon className="h-3.5 w-3.5 text-blue-400 absolute top-3.5 right-3" />
        )}
      </div>

      <p className={`text-xs truncate mb-2 ${isSelected ? 'text-blue-200/70' : 'text-gray-500'}`}>
        {contentPreview}
      </p>

      {/* Property Badges */}
      {note.properties.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
              {note.properties.slice(0, 3).map((p, i) => (
                  <Badge key={i} size="sm" variant="outline" className={`border-opacity-50 ${isSelected ? 'text-blue-200 border-blue-400' : 'text-gray-400 border-gray-600'}`}>
                      {p.key}: {p.values[0]}
                  </Badge>
              ))}
              {note.properties.length > 3 && (
                  <span className={`text-[10px] ${isSelected ? 'text-blue-300' : 'text-gray-600'}`}>+{note.properties.length - 3}</span>
              )}
          </div>
      )}

      <div className="flex items-center justify-between h-5">
        <div className="flex items-center gap-2">
            {note.nostrEventId && note.publishedAt && (
                <span title={`Published on Nostr at ${new Date(note.publishedAt).toLocaleString()}`}>
                    <WorldIcon className={`h-3.5 w-3.5 ${isSelected ? 'text-green-300' : 'text-green-500/70'}`} />
                </span>
            )}
            {hasLocation && (
                <span title="Has location data">
                    <MapPinIcon className={`h-3.5 w-3.5 ${isSelected ? 'text-blue-300' : 'text-blue-500/70'}`} />
                </span>
            )}
            {hasTime && (
                <span title="Has time data">
                    <ClockIcon className={`h-3.5 w-3.5 ${isSelected ? 'text-yellow-300' : 'text-yellow-500/70'}`} />
                </span>
            )}
        </div>

        <div className={`flex items-center gap-1 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} focus-within:opacity-100`}>
             {isTrash && onRestore && (
                <IconButton
                    onClick={(e) => {
                        e.stopPropagation();
                        onRestore();
                    }}
                    tabIndex={-1}
                    className="text-gray-400 hover:text-green-400 hover:bg-green-900/30"
                    tooltip="Restore Note"
                    icon={() => <DocumentDuplicateIcon className="h-3.5 w-3.5 transform rotate-180" />}
                    size="sm"
                    variant="ghost"
                />
            )}
            {onPin && !isTrash && (
                <IconButton
                    onClick={(e) => {
                        e.stopPropagation();
                        onPin();
                    }}
                    tabIndex={-1}
                    className={`${note.pinned ? 'text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                    tooltip={note.pinned ? "Unpin Note" : "Pin Note"}
                    icon={PinIcon}
                    size="sm"
                    variant="ghost"
                />
            )}
            {!isTrash && (
                <IconButton
                    onClick={handleExport}
                    tabIndex={-1}
                    className="text-gray-400 hover:text-white hover:bg-gray-700/50"
                    tooltip="Export Note"
                    icon={DownloadIcon}
                    size="sm"
                    variant="ghost"
                />
            )}
            <IconButton
                onClick={(e) => {
                e.stopPropagation();
                onDelete();
                }}
                tabIndex={-1}
                className="text-gray-400 hover:text-red-400 hover:bg-red-900/30"
                tooltip={isTrash ? "Delete Permanently" : "Move to Trash"}
                icon={TrashIcon}
                size="sm"
                variant="ghost"
            />
        </div>
      </div>
    </div>
  );
});

NoteListItem.displayName = 'NoteListItem';
