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
import {Tabs} from '../ui/kit';
import {cn} from '../../utils/ui';
import {NextStepStrip} from '../next-steps';
import {MatchItem} from '../items/MatchItem';
import {ChatPanel} from '../chat/ChatPanel';
import {NOTE_RAIL_TABS} from '../../config/uiSurfaces';

interface NoteContextRailProps {
    note: Note;
    model: UseNextStepsReturn;
    onOpenDrawer: () => void;
    onPublish: () => void;
    isPublished: boolean;
    isPublishing?: boolean;
    onNavigateToNote: (noteId: string) => void;
    onRespond: (match: ScoredMatch) => void;
    className?: string;
}

/** One rail, four top-level tabs, no nested surface toggle. */
export function NoteContextRail({
    note,
    model,
    onOpenDrawer,
    onNavigateToNote,
    onRespond,
    className,
}: NoteContextRailProps) {
    const {noteTab, setNoteTab} = useView();
    const {notes, addNote} = useNotes();
    const matches = useMatches(note);
    const [reply, setReply] = useState('');

    const noteContact = useMemo(
        () => note.properties.find(p => ['pubkey', 'contact', 'nostr'].includes(p.key))?.values[0] ?? null,
        [note.properties]
    );

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
            className={cn('flex h-full min-h-0 flex-col bg-[var(--app-panel)]', className)}
            aria-label="Note context"
        >
            <Tabs
                options={NOTE_RAIL_TABS.map(tab => {
                    const count = tab.id === 'matches' ? matches.length : tab.id === 'replies' ? replies.length : 0;
                    return {...tab, count: count > 0 ? count : undefined};
                })}
                value={noteTab}
                onChange={setNoteTab}
                label="Note context"
                size="sm"
                className="h-9 shrink-0 border-b border-[var(--app-line)] px-1.5"
            />

            <div className="min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar">
                {noteTab === 'next' && (
                    <div className="space-y-3">
                        <NextStepStrip note={note} model={model} onOpenDrawer={onOpenDrawer}/>
                        {!model.topNextStep && !model.nextSteps.some(step => step.state === 'stale') && (
                            <p className="px-1 py-2 text-[12px] leading-5 text-[var(--app-muted)]">
                                No next step yet. Add a detail.
                            </p>
                        )}
                    </div>
                )}

                {noteTab === 'matches' && (
                    <div className="space-y-2" data-testid="note-matches">
                        {matches.length === 0 ? (
                            <div className="flex items-start gap-2 px-1 py-3 text-[12px] leading-5 text-[var(--app-muted)]">
                                <SparklesIcon className="mt-0.5 h-3.5 w-3.5 shrink-0"/>
                                <span>No matches yet.</span>
                            </div>
                        ) : matches.map(match => (
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
                    <div className="flex h-full min-h-0 flex-col gap-3" data-testid="note-replies">
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
                                    fullWidth={false}
                                    wrapperClassName="min-w-0 flex-1"
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

                {noteTab === 'chat' && (
                    <div className="h-full min-h-0" data-testid="note-chat">
                        <ChatPanel initialPubkey={noteContact} className="h-full"/>
                    </div>
                )}
            </div>
        </aside>
    );
}
