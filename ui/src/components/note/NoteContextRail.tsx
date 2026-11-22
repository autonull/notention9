import React, {useCallback, useEffect, useMemo, useState} from 'react';
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
import {ChatPanel} from '../chat/ChatPanel';

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
    onNavigateToNote,
    onRespond,
}: NoteContextRailProps) {
    const {noteTab, setNoteTab} = useView();
    const {notes, addNote} = useNotes();
    const matches = useMatches(note);
    const [reply, setReply] = useState('');
    const [replySurface, setReplySurface] = useState<'replies' | 'chat'>('replies');

    const noteContact = useMemo(
        () => note.properties.find(p => ['pubkey', 'contact', 'nostr'].includes(p.key))?.values[0] ?? null,
        [note.properties]
    );

    useEffect(() => {
        if (noteContact) setReplySurface('chat');
    }, [noteContact]);

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
                'flex max-h-[42dvh] shrink-0 flex-col border-t border-[var(--app-line)] bg-[var(--app-panel)]',
                'lg:max-h-none lg:w-[20rem] lg:border-l lg:border-t-0'
            )}
            aria-label="Note context"
        >
            <div className="hidden">
                <span className="h-1 w-9 rounded-full bg-[var(--app-line-strong)]" aria-hidden="true"/>
            </div>

            <div
                className="flex h-11 shrink-0 items-center border-b border-[var(--app-line)] px-2"
                role="tablist"
                aria-label="Note context"
            >
                {TABS.map(tab => {
                    const count = tab.id === 'matches' ? matches.length : tab.id === 'replies' ? replies.length : 0;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={noteTab === tab.id}
                            onClick={() => setNoteTab(tab.id)}
                            className={cn(
                                'relative flex h-full flex-1 items-center justify-center gap-1.5 border-b-2 text-[12px] font-medium transition-colors',
                                noteTab === tab.id
                                    ? 'border-[var(--app-accent)] text-[var(--app-text)]'
                                    : 'border-transparent text-[var(--app-muted)] hover:text-[var(--app-text-secondary)]'
                            )}
                        >
                            {tab.label}
                            {count > 0 && (
                                <span className="text-[11px] tabular-nums text-[var(--app-faint)]">{count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar">
                {noteTab === 'next' && (
                    <div className="space-y-3">
                        <NextStepStrip note={note} model={model} onOpenDrawer={onOpenDrawer}/>
                        {!model.topNextStep && (
                            <p className="px-1 py-2 text-[12px] leading-5 text-[var(--app-muted)]">
                                No next step yet. Add a detail to the note.
                            </p>
                        )}
                    </div>
                )}

                {noteTab === 'matches' && (
                    <div className="space-y-2" data-testid="note-matches">
                        {matches.length === 0 ? (
                            <div className="flex items-start gap-2 px-1 py-3 text-[12px] leading-5 text-[var(--app-muted)]">
                                <SparklesIcon className="mt-0.5 h-3.5 w-3.5 shrink-0"/>
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
                        <div className="flex shrink-0 items-center gap-3 text-[11px]">
                            <button
                                type="button"
                                onClick={() => setReplySurface('replies')}
                                aria-pressed={replySurface === 'replies'}
                                className={cn(
                                    'font-medium transition-colors',
                                    replySurface === 'replies' ? 'text-[var(--app-text)]' : 'text-[var(--app-faint)] hover:text-[var(--app-muted)]'
                                )}
                            >
                                Replies
                            </button>
                            <button
                                type="button"
                                onClick={() => setReplySurface('chat')}
                                aria-pressed={replySurface === 'chat'}
                                className={cn(
                                    'font-medium transition-colors',
                                    replySurface === 'chat' ? 'text-[var(--app-text)]' : 'text-[var(--app-faint)] hover:text-[var(--app-muted)]'
                                )}
                            >
                                Chat
                            </button>
                        </div>

                        {replySurface === 'chat' ? (
                            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--app-line)]">
                                <ChatPanel initialPubkey={noteContact} className="h-full"/>
                            </div>
                        ) : (
                            <div className="flex min-h-0 flex-1 flex-col gap-3">
                                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                                    {replies.length === 0 ? (
                                        <p className="px-1 py-2 text-[12px] text-[var(--app-muted)]">No replies yet.</p>
                                    ) : replies.map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => onNavigateToNote(item.id)}
                                            className="w-full rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] p-2.5 text-left transition-colors hover:border-[var(--app-line-strong)]"
                                        >
                                            <span className="block truncate text-[12px] font-medium text-[var(--app-text-secondary)]">{item.title || 'Untitled reply'}</span>
                                            <span className="mt-0.5 block line-clamp-2 text-[11px] leading-4 text-[var(--app-muted)]">{getTextFromHtml(item.content)}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="shrink-0">
                                    <label className="sr-only" htmlFor="note-reply-input">Write a reply</label>
                                    <div className="flex items-center gap-1.5">
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
                                            size="sm"
                                            onClick={sendReply}
                                            disabled={!reply.trim()}
                                            aria-label="Send reply"
                                        >
                                            <SendIcon className="h-3.5 w-3.5"/>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}
