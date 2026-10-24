import React, { useState, useMemo } from 'react';
import { X, Search, Keyboard } from 'lucide-react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface HelpSection {
    title: string;
    icon: string;
    content: string;
    shortcuts?: { key: string; description: string }[];
}

const helpSections: HelpSection[] = [
    {
        title: 'Studio (Create)',
        icon: '🎬',
        content: 'Launch new simulations. Choose a pre-defined scenario (like \'Gig Economy\') or generate a random one. Configure the number of agents and duration for random scenarios.',
        shortcuts: [
            { key: '1', description: 'Navigate to Studio' },
            { key: 'Tab', description: 'Navigate form fields' },
            { key: 'Enter', description: 'Start production' },
        ],
    },
    {
        title: 'Live Preview (Watch)',
        icon: '📺',
        content: 'Monitor the simulation in real-time. The dashboard shows agent interactions and system logs. You can cancel a running job from here if needed.',
        shortcuts: [
            { key: '3', description: 'Navigate to Live Preview' },
            { key: 'Esc', description: 'Stop recording (when running)' },
        ],
    },
    {
        title: 'Library (Manage)',
        icon: '🎥',
        content: 'Access your recorded simulations. Preview the generated MP4 videos, download them to your device, or delete old recordings to save space. Use the search box to filter movies.',
        shortcuts: [
            { key: '2', description: 'Navigate to Library' },
            { key: 'Ctrl+F / ⌘F', description: 'Focus search' },
            { key: 'Enter', description: 'Play selected movie' },
        ],
    },
    {
        title: 'Global Shortcuts',
        icon: '⌨️',
        content: 'These shortcuts work from anywhere in the app.',
        shortcuts: [
            { key: 'Ctrl+K / ⌘K', description: 'Open Command Palette' },
            { key: '?', description: 'Show this help' },
            { key: 'Esc', description: 'Close modals / sidebar' },
        ],
    },
];

const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const filteredSections = useMemo(() => {
        if (!searchQuery) return helpSections;
        const query = searchQuery.toLowerCase();
        return helpSections.filter(s => 
            s.title.toLowerCase().includes(query) ||
            s.content.toLowerCase().includes(query) ||
            s.shortcuts?.some(sc => sc.description.toLowerCase().includes(query))
        );
    }, [searchQuery]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] border border-gray-700 shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.stopPropagation()}
                            placeholder="Search help..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            autoFocus
                        />
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-1"
                        aria-label="Close help"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-auto flex-1">
                    <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                        <Keyboard size={28} className="text-indigo-400" />
                        Using the Movie Studio
                    </h2>

                    {filteredSections.length === 0 ? (
                        <div className="text-gray-500 text-center py-12">
                            No results found for "{searchQuery}"
                        </div>
                    ) : (
                        <div className="space-y-6 text-gray-300">
                            {filteredSections.map((section, i) => (
                                <section key={i} className="space-y-4">
                                    <h3 className="text-lg font-semibold text-indigo-400 flex items-center gap-2">
                                        <span>{section.icon}</span>
                                        {section.title}
                                    </h3>
                                    <p>{section.content}</p>
                                    {section.shortcuts && (
                                        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Shortcuts</div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {section.shortcuts.map((sc, j) => (
                                                    <div key={j} className="flex items-center gap-3 text-sm">
                                                        <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300 font-mono text-xs min-w-[80px] text-center">
                                                            {sc.key}
                                                        </kbd>
                                                        <span className="text-gray-400">{sc.description}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            ))}
                        </div>
                    )}

                    <div className="mt-8 bg-gray-900 p-4 rounded-lg text-sm border border-gray-700">
                        <strong className="text-gray-300">Note:</strong> Simulations run on the server. Closing this browser window will not stop the recording process, but you will lose the live preview until you reconnect.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;
