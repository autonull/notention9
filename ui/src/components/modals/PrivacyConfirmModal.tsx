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
        <Modal isOpen={isOpen} onClose={onClose} title="Review before publishing" size="2xl">
            <div className="space-y-5">
                <div className="rounded-xl border border-[var(--color-warning-line)] bg-[var(--color-warning-bg)] p-4 text-sm text-[var(--color-warning-text)]">
                    This note leaves this device and is sent to <strong>{destination}</strong>.
                    {note && note.privacy !== 'public' && (
                        <p className="mt-2">
                            It will be visible to everyone on that network.
                        </p>
                    )}
                </div>

                <div>
                    <div className="mb-2 text-xs font-bold tracking-widest text-[var(--app-muted)]">What will be shared</div>
                    <div className="space-y-3 rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] p-4">
                        <div className="font-semibold text-[var(--app-text)]">{noteTitle || 'Untitled note'}</div>
                        <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm text-[var(--app-text-secondary)] custom-scrollbar">{preview?.body || 'No content'}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {note?.tags.map(tag => (
                                <span key={tag} className="rounded-full border border-[var(--app-line)] bg-[var(--app-raised)] px-2 py-0.5 text-xs text-[var(--app-text-secondary)]">#{tag}</span>
                            ))}
                            {note?.properties.map(property => (
                                <span key={`${property.key}-${property.values.join('-')}`} className="rounded-full border border-[var(--app-line)] bg-[var(--app-raised)] px-2 py-0.5 text-xs text-[var(--app-text-secondary)]">
                                    {property.key} {property.operator} {property.values.join(', ')}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <details className="rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)]">
                    <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-[var(--app-muted)]">Raw event</summary>
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
