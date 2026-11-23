import React, {useMemo} from 'react';
import {Modal} from '../ui/Modal';
import {Button} from '../ui/Button';
import type {Note} from '@notention/core';
import {getTextFromHtml} from '../../utils/html';

export interface PrivacyConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    noteTitle: string;
    destination: string;
    note?: Note;
}

export function PrivacyConfirmModal({
                                        isOpen,
                                        onClose,
                                        onConfirm,
                                        noteTitle,
                                        destination,
                                        note,
                                    }: PrivacyConfirmModalProps) {
    const preview = useMemo(() => {
        if (!note) return null;
        const body = getTextFromHtml(note.content);
        const tags = [
            ['d', note.id],
            ...note.tags.map(tag => ['t', tag]),
            ...note.properties.flatMap(property => [
                ['t', `prop:${property.key}`],
                ['property', property.key, property.operator, ...property.values],
            ]),
        ];
        const raw = {
            kind: note.properties.length > 0 ? 35000 : 1,
            tags,
            content: body,
            privacy: 'public',
        };
        return {body, tags, raw};
    }, [note]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Review before publishing" className="max-w-2xl">
            <div className="space-y-5 overflow-y-auto custom-scrollbar pr-1">
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm text-yellow-100">
                    This note will leave your device and be stored on <strong>{destination}</strong>. The same disclosure applies whether the note was private or public.
                    {note && note.privacy !== 'public' && (
                        <p className="mt-2 text-yellow-200/90">
                            Publishing makes this note <strong>public</strong> on the network.
                        </p>
                    )}
                </div>

                <div>
 <div className="text-xs font-bold tracking-widest text-[var(--app-muted)] mb-2">What will be shared</div>
                    <div className="rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] p-4 space-y-3">
                        <div className="font-semibold text-[var(--app-text)]">{noteTitle || 'Untitled note'}</div>
                        <p className="text-sm text-[var(--app-text-secondary)] whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">{preview?.body || 'No content'}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {note?.tags.map(tag => (
                                <span key={tag} className="rounded-full bg-[var(--app-accent-soft)] px-2 py-0.5 text-xs text-[var(--app-accent-text)]">#{tag}</span>
                            ))}
                            {note?.properties.map(property => (
                                <span key={`${property.key}-${property.values.join('-')}`} className="rounded-full bg-[var(--app-accent-soft)] px-2 py-0.5 text-xs text-[var(--app-accent-text)]">
                                    {property.key} {property.operator} {property.values.join(', ')}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <details className="rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)]">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-[var(--app-muted)] select-none">Raw event</summary>
                    <pre className="max-h-56 overflow-auto border-t border-[var(--app-line)] p-4 text-xs text-[var(--app-muted)] custom-scrollbar">{JSON.stringify(preview?.raw ?? {}, null, 2)}</pre>
                </details>

                <div className="flex justify-end gap-3 pt-1">
                    <Button onClick={onClose} variant="secondary">
                        Cancel
                    </Button>
                    <Button onClick={onConfirm} variant="primary">
                        Publish to {destination}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
