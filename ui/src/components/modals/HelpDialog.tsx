import React from 'react';
import {Modal} from '../common/Modal';
import {KeyIcon, MapPinIcon, PlusCircleIcon, SearchIcon, SparklesIcon, TagIcon} from '../common/icons';

const SHORTCUTS = [
    ['New note', 'Ctrl N'],
    ['Search notes', 'Ctrl /'],
    ['Commands and notes', 'Ctrl K'],
    ['Add detail', 'Ctrl Shift P'],
    ['Save note', 'Ctrl S'],
    ['Previous / next note', 'Alt ↑ / Alt ↓'],
    ['Back to list', 'Alt ←'],
    ['Toggle sidebar', 'Ctrl \\'],
];

const CONCEPTS = [
    {title: 'Notes are prose plus details', body: 'Write naturally. Add structured details with the "Add detail" control; they render as chips, never as syntax.'},
    {title: 'Details make matching work', body: 'A detail is a name, a comparison, and a value. Requests and offers match when their details agree.'},
    {title: 'Privacy is explicit', body: 'Notes stay local until you publish. Private notes are never transmitted; public notes show a preview before leaving your device.'},
];

export function HelpDialog({isOpen, onClose, onAddDetail}: {isOpen: boolean; onClose: () => void; onAddDetail?: () => void}) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Help & Shortcuts" className="max-w-2xl">
            <div className="space-y-6 overflow-y-auto custom-scrollbar pr-1">
                <section>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Concepts</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {CONCEPTS.map(({title, body}) => (
                            <div key={title} className="rounded-xl border border-gray-700/60 bg-gray-900/60 p-4">
                                <div className="font-semibold text-gray-100 mb-1">{title}</div>
                                <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Keyboard</h4>
                    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                        {SHORTCUTS.map(([label, keys]) => (
                            <div key={label} className="flex items-center justify-between text-sm text-gray-400">
                                <span>{label}</span>
                                <kbd className="rounded border border-gray-600/40 bg-gray-700/50 px-1.5 py-0.5 text-xs text-gray-300">{keys}</kbd>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                    <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                            <PlusCircleIcon className="w-5 h-5"/>
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-gray-100">Add a detail</div>
                            <p className="text-sm text-gray-400 mt-1">Use the Add detail button in the editor toolbar, or press Ctrl Shift P. Pick what the detail is about, choose a comparison, and enter a value.</p>
                            {onAddDetail && (
                                <button
                                    onClick={onAddDetail}
                                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
                                >
                                    <PlusCircleIcon className="w-4 h-4"/> Add detail now
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <section>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">What you can do</h4>
                    <div className="grid gap-2 sm:grid-cols-2 text-sm text-gray-400">
                        <div className="flex items-center gap-2"><TagIcon className="w-4 h-4 text-gray-500"/>Tag notes and filter by them</div>
                        <div className="flex items-center gap-2"><SearchIcon className="w-4 h-4 text-gray-500"/>Search prose, tags, and details</div>
                        <div className="flex items-center gap-2"><MapPinIcon className="w-4 h-4 text-gray-500"/>Place notes on the map</div>
                        <div className="flex items-center gap-2"><SparklesIcon className="w-4 h-4 text-gray-500"/>Extract details from text</div>
                        <div className="flex items-center gap-2"><KeyIcon className="w-4 h-4 text-gray-500"/>No model is needed to use the app</div>
                    </div>
                </section>
            </div>
        </Modal>
    );
}
