import React, {useCallback, useMemo, useState} from 'react';
import type {Note, ScoredMatch} from '@notention/core';
import {getTextFromHtml} from '@notention/core';
import {useView} from '../../hooks/useViewContext';
import {useNotes} from '../../hooks/useNotes';
import {useMatches} from '../../hooks/useMatches';
import type {UseNextStepsReturn} from '../../hooks/useNextSteps';
import {Button} from '../ui/Button';
import {Input} from '../ui/Input';
import {SendIcon, SparklesIcon} from '../ui/icons';
import {cn} from '../../utils/ui';
import {NextStepStrip} from '../next-steps';
import {MatchItem} from '../match/MatchItem';

interface NoteContextRailProps {
    note: Note;
    model: UseNextStepsReturn;
    onOpenDrawer: () => void;
    onPublish: () => void;
    isPublished: boolean;
    isPublishing?: boolean;
    onNavigateToNote: (noteId: string) => void;
    onRespond: (match: ScoredMatch) => void;
}

const TABS = [
    {id: 'next', label: 'Next steps'},
    {id: 'matches', label: 'Matches'},
    {id: 'replies', label: 'Replies'},
] as const;

export function NoteContextRail({
    note,
    model,
    onOpenDrawer,
    onPublish,
    isPublished,
    isPublishing = false,
    onNavigateToNote,
    onRespond,
}: NoteContextRailProps) {
    const {noteTab, setNoteTab} = useView();
    const {notes, addNote} = useNotes();
    const matches = useMatches(note);
    const [reply, setReply] = useState('');

    const replies = useMemo(
        () => notes.filter(candidate =>
            candidate.properties.some(p => p.key === 'inResponseTo' && p.values.includes(note.id))
        ),
        [notes, note.id]
    );

    const sendReply = useCallback(() => {
        const text = reply.trim();
        if (!text) return;
        addNote({
            title: `Re: ${note.title || 'Untitled note'}`,
            content: `<p>${text}</p>`,
            tags: ['reply'],
            properties: [
                {key: 'intent', operator: 'is', values: ['response']},
                {key: 'inResponseTo', operator: 'is', values: [note.id]},
            ],
        });
        setReply('');
    }, [reply, note, addNote]);

    return (
        <aside
            className={cn(
                'z-30 flex flex-col border-neutral-800 bg-neutral-950',
                'fixed inset-x-0 bottom-0 max-h-[50dvh] rounded-t-2xl border-t shadow-2xl',
                'lg:static lg:max-h-none lg:w-[22rem] lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none'
            )}
            aria-label="Note context"
        >
            <div className="flex items-center justify-center py-1.5 lg:hidden">
                <span className="h-1 w-10 rounded-full bg-neutral-700" aria-hidden="true"/>
            </div>

            <div className="flex shrink-0 items-center gap-1 border-b border-neutral-800 px-2 py-1.5" role="tablist" aria-label="Note context">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={noteTab === tab.id}
                        onClick={() => setNoteTab(tab.id)}
                        className={cn(
                            'h-9 flex-1 rounded-lg text-sm font-medium transition-colors',
                            noteTab === tab.id
                                ? 'bg-neutral-800 text-neutral-100'
                                : 'text-neutral-400 hover:text-neutral-300'
                        )}
                    >
                        {tab.label}
                        {tab.id === 'matches' && matches.length > 0 && (
                            <span className="ml-1.5 text-xs tabular-nums text-neutral-400">{matches.length}</span>
                        )}
                        {tab.id === 'replies' && replies.length > 0 && (
                            <span className="ml-1.5 text-xs tabular-nums text-neutral-400">{replies.length}</span>
                        )}
                    </button>
                ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar">
                {noteTab === 'next' && (
                    <div className="space-y-3">
                        <NextStepStrip note={note} model={model} onOpenDrawer={onOpenDrawer}/>
                        {!model.topNextStep && (
                            <p className="px-1 text-sm text-neutral-400">No next step yet. Add a detail to the note.</p>
                        )}
                    </div>
                )}

                {noteTab === 'matches' && (
                    <div className="space-y-2" data-testid="note-matches">
                        {matches.length === 0 ? (
                            <div className="flex items-start gap-2 px-1 py-3 text-sm text-neutral-400">
                                <SparklesIcon className="mt-0.5 h-4 w-4 shrink-0"/>
                                <span>No matches yet. Add what you need or offer as a detail.</span>
                            </div>
                        ) : matches.slice(0, 4).map(match => (
                            <MatchItem
                                key={match.note.id}
                                match={match}
                                isLocal
                                onClick={() => onNavigateToNote(match.note.id)}
                                onRespond={() => onRespond(match)}
                            />
                        ))}
                    </div>
                )}

                {noteTab === 'replies' && (
                    <div className="flex h-full flex-col gap-3" data-testid="note-replies">
                        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                            {replies.length === 0 ? (
                                <p className="px-1 py-2 text-sm text-neutral-400">No replies yet.</p>
                            ) : replies.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => onNavigateToNote(item.id)}
                                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-left hover:border-neutral-700"
                                >
                                    <span className="block truncate text-sm font-medium text-neutral-200">{item.title || 'Untitled reply'}</span>
                                    <span className="mt-1 block line-clamp-2 text-sm text-neutral-400">{getTextFromHtml(item.content)}</span>
                                </button>
                            ))}
                        </div>
                        <div className="shrink-0">
                            <label className="sr-only" htmlFor="note-reply-input">Write a reply</label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="note-reply-input"
                                    value={reply}
                                    onChange={event => setReply(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault();
                                            sendReply();
                                        }
                                    }}
                                    placeholder="Write a reply…"
                                    className="min-w-0"
                                />
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={sendReply}
                                    disabled={!reply.trim()}
                                    aria-label="Send reply"
                                >
                                    <SendIcon className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="shrink-0 border-t border-neutral-800 p-3">
                <Button
                    variant="secondary"
                    size="lg"
                    className="w-full"
                    onClick={onPublish}
                    disabled={isPublishing || isPublished}
                >
                    {isPublished ? 'Published' : isPublishing ? 'Sharing…' : 'Share'}
                </Button>
            </div>
        </aside>
    );
}
