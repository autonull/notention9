import React from 'react';
import type {Note} from '@notention/core';
import {getTextFromHtml} from '@notention/core';

export function NotePreview({note}: {note: Note}) {
    const content = getTextFromHtml(note.content).trim();
    return (
        <aside
            aria-label="Note preview"
            className="w-full shrink-0 overflow-y-auto border-t border-neutral-800 p-4 md:w-80 md:border-l md:border-t-0"
        >
            <p className="text-meta text-neutral-400">Preview</p>
            <h2 className="mt-2 text-xl font-semibold leading-7 text-neutral-100">
                {note.title || 'Untitled'}
            </h2>
            {content && (
                <p className="mt-3 line-clamp-[12] whitespace-pre-wrap text-sm leading-6 text-neutral-300">
                    {content}
                </p>
            )}
            {note.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                    {note.tags.slice(0, 6).map(tag => (
                        <span key={tag} className="rounded-full border border-neutral-700 px-2 py-0.5 text-meta text-neutral-400">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
            {note.properties.length > 0 && (
                <dl className="mt-4 space-y-1.5">
                    {note.properties.slice(0, 5).map(property => (
                        <div key={property.key} className="flex gap-2 text-meta">
                            <dt className="text-neutral-400">{property.key}</dt>
                            <dd className="truncate text-neutral-300">{property.values.join(', ')}</dd>
                        </div>
                    ))}
                </dl>
            )}
            <p className="mt-4 text-meta text-neutral-400">Enter opens this note.</p>
        </aside>
    );
}
