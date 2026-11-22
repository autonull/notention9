import React, {useCallback, forwardRef, useImperativeHandle} from 'react';
import type {Note} from '@notention/core';
import {VirtualizedList, VirtualizedListRef} from '../ui/VirtualizedList';
import {NoteListItem} from './NoteListItem';
import {NoteGridItem} from './NoteGridItem';
import {EmptyState, SearchEmptyIllustration, TrashEmptyIllustration} from '../ui/Primitives';
import {Button} from '../ui/Button';
import {cn} from '../../utils/ui';
import {ITEM_HEIGHT} from '../../constants/ui';
import {useSidebar} from './SidebarContext';

interface SidebarListProps {
    virtualListRef: React.RefObject<VirtualizedListRef | null>;
}

const SidebarListInner = forwardRef<VirtualizedListRef, SidebarListProps>(({ virtualListRef }, ref) => {
    const {
        filteredNotes,
        sortedNotes,
        isLoading,
        isMobile,
        containerHeight,
        sidebarViewMode,
        selectedNoteId,
        setSelectedNoteId,
        isTrashView,
        showFullContent,
        renderItem,
        getItemKey,
        renderCollapsedTooltip,
        searchTerm,
        setSearchTerm
    } = useSidebar();

    useImperativeHandle(ref, () => virtualListRef.current!, [virtualListRef]);

    if (isLoading) return null;

    const EmptyStateFallback = useCallback(() => {
        if (searchTerm) {
            return (
                <EmptyState
                    variant="illustrated"
                    illustration={<SearchEmptyIllustration/>}
                    title="No matching notes"
                    description={`No notes match "${searchTerm}".`}
                    action={<Button variant="secondary" onClick={() => setSearchTerm('')}>Clear search</Button>}
                />
            );
        }
        if (isTrashView) {
            return (
                <EmptyState
                    variant="illustrated"
                    illustration={<TrashEmptyIllustration/>}
                    title="Trash is empty"
                    description="Deleted notes stay here for 30 days."
                />
            );
        }
        return (
            <EmptyState
                variant="minimal"
                title="No notes yet"
                description="Capture a thought above and it will appear here."
            />
        );
    }, [searchTerm, setSearchTerm, isTrashView]);

    return (
        <div
            className="flex-grow px-2 py-3 overflow-hidden custom-scrollbar"
            role="list"
            aria-label={isTrashView ? 'Trash notes' : 'Notes'}
        >
            {filteredNotes.length > 0 ? (
                sidebarViewMode === 'grid' ? (
                    <div className="grid grid-cols-2 gap-2 h-full overflow-y-auto custom-scrollbar" role="list">
                        {filteredNotes.map((note) => (
                            <NoteGridItem
                                key={note.id}
                                note={note}
                                isSelected={selectedNoteId === note.id}
                                onSelect={() => setSelectedNoteId(note.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <VirtualizedList
                        ref={virtualListRef}
                        items={filteredNotes}
                        itemHeight={ITEM_HEIGHT}
                        containerHeight={containerHeight}
                        getItemKey={getItemKey}
                        selectedKey={selectedNoteId}
                        overscan={8}
                        className="h-full"
                        keyboardNavigation
                        role="listbox"
                        aria-label={isTrashView ? 'Trash notes' : 'Notes'}
                        onItemClick={(note) => setSelectedNoteId(note.id)}
                        collapsedTooltip={!showFullContent ? renderCollapsedTooltip : undefined}
                    >
                        {renderItem}
                    </VirtualizedList>
                )
            ) : (
                <EmptyStateFallback/>
            )}
        </div>
    );
});

SidebarListInner.displayName = 'SidebarList';

export const SidebarList = SidebarListInner;