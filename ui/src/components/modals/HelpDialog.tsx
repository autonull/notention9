import React from 'react';
import {Modal} from '../ui/Modal';
import {Button} from '../ui/Button';
import {KeyIcon, MapPinIcon, PlusCircleIcon, SearchIcon, SparklesIcon, TagIcon, Heading1Icon} from '../ui/icons';
import {altShortcut, modShortcut} from '../../utils/platform';

const SHORTCUTS: Array<[string, string]> = [
    ['New note', modShortcut('N')],
    ['Search notes', modShortcut('/')],
    ['Commands and notes', modShortcut('K')],
    ['Add detail', modShortcut('Shift+P')],
    ['Save note', modShortcut('S')],
    ['Previous / next note', `${altShortcut('↑')} / ${altShortcut('↓')}`],
    ['Back to list', altShortcut('←')],
];

const CONCEPTS = [
    {title: 'Notes are prose plus details', body: 'Write naturally. Add structured details with the "Add detail" control; they render as chips, never as syntax.'},
    {title: 'Details make matching work', body: 'A detail is a name, a comparison, and a value. Requests and offers match when their details agree.'},
    {title: 'Privacy is explicit', body: 'Notes stay local until you publish. Private notes are never transmitted; public notes show a preview before leaving your device.'},
];

const heading = 'mb-3 text-xs font-bold tracking-widest text-[var(--app-muted)]';

export function HelpDialog({isOpen, onClose, onAddDetail}: {isOpen: boolean; onClose: () => void; onAddDetail?: () => void}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Help & Shortcuts"
            size="2xl"
            footer={onAddDetail ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[13px] font-medium text-[var(--app-text)]">Add a detail</div>
                        <p className="mt-0.5 text-[12px] leading-5 text-[var(--app-muted)]">
                            Use the Add detail button on the page, or press {modShortcut('Shift+P')}.
                        </p>
                    </div>
                    <Button onClick={onAddDetail} size="sm" icon={PlusCircleIcon}>
                        Add detail now
                    </Button>
                </div>
            ) : undefined}
        >
            <div className="space-y-6">
                <section>
                    <h4 className={heading}>Concepts</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {CONCEPTS.map(({title, body}, index) => (
                            <div
                                key={title}
                                className={`rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] p-4 ${index === CONCEPTS.length - 1 && CONCEPTS.length % 2 === 1 ? 'sm:col-span-2' : ''}`}
                            >
                                <div className="mb-1 font-semibold text-[var(--app-text)]">{title}</div>
                                <p className="text-sm leading-relaxed text-[var(--app-muted)]">{body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h4 className={heading}>Keyboard</h4>
                    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                        {SHORTCUTS.map(([label, keys]) => (
                            <div key={label} className="flex items-center justify-between gap-3 text-sm text-[var(--app-muted)]">
                                <span>{label}</span>
                                <kbd className="shrink-0 rounded border border-[var(--app-line-strong)] bg-[var(--app-raised)] px-1.5 py-0.5 text-xs text-[var(--app-text-secondary)]">{keys}</kbd>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h4 className={heading}>What you can do</h4>
                    <div className="grid gap-2 text-sm text-[var(--app-muted)] sm:grid-cols-2">
                        <div className="flex items-center gap-2"><TagIcon className="w-4 h-4 text-[var(--app-muted)]"/>Tag notes and filter by them</div>
                        <div className="flex items-center gap-2"><SearchIcon className="w-4 h-4 text-[var(--app-muted)]"/>Search prose, tags, and details</div>
                        <div className="flex items-center gap-2"><Heading1Icon className="w-4 h-4 text-[var(--app-muted)]"/>Use Text style to add a heading, list, or quote</div>
                        <div className="flex items-center gap-2"><MapPinIcon className="w-4 h-4 text-[var(--app-muted)]"/>Place notes on the map</div>
                        <div className="flex items-center gap-2"><SparklesIcon className="w-4 h-4 text-[var(--app-muted)]"/>Extract details from text</div>
                        <div className="flex items-center gap-2"><KeyIcon className="w-4 h-4 text-[var(--app-muted)]"/>No model is needed to use the app</div>
                    </div>
                </section>
            </div>
        </Modal>
    );
}
