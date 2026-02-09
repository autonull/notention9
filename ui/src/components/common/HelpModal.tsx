import React from 'react';
import {Modal} from './Modal';
import {TagIcon} from '../common/icons';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function HelpModal({isOpen, onClose}: HelpModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Notention Help">
            <div className="space-y-6 text-gray-300">
                <p className="text-gray-400 leading-relaxed">
                    Notention is a semantic note-taking app that helps you connect with others.
                    Use special syntax to make your notes machine-readable.
                </p>

                <div className="border-t border-gray-700/50 pt-5">
                    <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <TagIcon className="w-4 h-4 text-blue-400"/>
                        Semantic Syntax
                    </h3>
                    <div
                        className="bg-gray-900/50 border border-gray-700/50 p-4 rounded-lg font-mono text-sm space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-blue-400 font-semibold">[key:op:value]</span>
                            <span className="text-gray-500 text-xs uppercase tracking-wide">Canonical</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-green-400 font-semibold">[key op value]</span>
                            <span className="text-gray-500 text-xs uppercase tracking-wide">Natural</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/30">
                        <h4 className="font-semibold text-gray-200 mb-3 text-sm">Real (Facts)</h4>
                        <ul className="text-sm space-y-2 text-gray-400">
                            <li className="flex justify-between"><code
                                className="text-blue-300 bg-blue-900/20 px-1 rounded">is</code> <span>Exact match</span>
                            </li>
                            <li className="flex justify-between"><code
                                className="text-blue-300 bg-blue-900/20 px-1 rounded">is not</code>
                                <span>Negative match</span></li>
                        </ul>
                        <div className="mt-3 text-xs text-gray-500 border-t border-gray-700/30 pt-2">
                            Ex: <code className="text-gray-300">[role:is:Engineer]</code>
                        </div>
                    </div>
                    <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/30">
                        <h4 className="font-semibold text-gray-200 mb-3 text-sm">Imaginary (Constraints)</h4>
                        <ul className="text-sm space-y-2 text-gray-400">
                            <li className="flex justify-between"><code
                                className="text-green-300 bg-green-900/20 px-1 rounded">&lt; &gt;</code>
                                <span>Numeric</span></li>
                            <li className="flex justify-between"><code
                                className="text-green-300 bg-green-900/20 px-1 rounded">contains</code> <span>Partial match</span>
                            </li>
                        </ul>
                        <div className="mt-3 text-xs text-gray-500 border-t border-gray-700/30 pt-2">
                            Ex: <code className="text-gray-300">[price &lt; 100]</code>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-700/50 pt-5">
                    <h3 className="font-bold text-white mb-3 text-sm uppercase tracking-wider">Special Properties</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold text-gray-200 mb-2 text-xs uppercase tracking-wider">Location</h4>
                            <p className="text-sm text-gray-400 mb-1">
                                Keys: <code className="text-blue-300">location</code>, <code
                                className="text-blue-300">geo</code>, <code className="text-blue-300">place</code>
                            </p>
                            <div className="text-xs text-gray-500">
                                Val: <code className="text-gray-300">lat,lng</code>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-200 mb-2 text-xs uppercase tracking-wider">Time</h4>
                            <p className="text-sm text-gray-400 mb-1">
                                Keys: <code className="text-blue-300">date</code>, <code
                                className="text-blue-300">deadline</code>, <code
                                className="text-blue-300">start</code>, <code className="text-blue-300">end</code>
                            </p>
                            <div className="text-xs text-gray-500">
                                Val: ISO 8601 Date
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-700/50 pt-5">
                    <h3 className="font-bold text-white mb-3 text-sm uppercase tracking-wider">Tips</h3>
                    <ul className="text-sm text-gray-400 space-y-2">
                        <li className="flex gap-2"><span className="text-blue-500">•</span> Press <strong
                            className="text-gray-300">Ctrl+K</strong> to open the Command Palette anywhere.
                        </li>
                        <li className="flex gap-2"><span className="text-blue-500">•</span> Use <strong
                            className="text-gray-300">#hashtags</strong> for general categorization.
                        </li>
                        <li className="flex gap-2"><span className="text-blue-500">•</span> Click <strong
                            className="text-gray-300">Publish</strong> to save to Nostr.
                        </li>
                        <li className="flex gap-2"><span className="text-blue-500">•</span> Click <strong
                            className="text-gray-300">Find Matches</strong> to search the network.
                        </li>
                        <li className="flex gap-2"><span className="text-blue-500">•</span> Enable <strong
                            className="text-gray-300">Developer Mode</strong> in Settings for advanced tools.
                        </li>
                    </ul>
                </div>

                <div className="border-t border-gray-700/50 pt-5">
                    <h3 className="font-bold text-white mb-3 text-sm uppercase tracking-wider">Keyboard Shortcuts</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        <div className="flex justify-between items-center group">
                            <span
                                className="text-gray-400 group-hover:text-white transition-colors">Command Palette</span>
                            <code
                                className="text-gray-300 bg-gray-800 px-2 py-0.5 rounded border border-gray-700/50 font-mono text-xs">Ctrl+K</code>
                        </div>
                        <div className="flex justify-between items-center group">
                            <span className="text-gray-400 group-hover:text-white transition-colors">New Note</span>
                            <code
                                className="text-gray-300 bg-gray-800 px-2 py-0.5 rounded border border-gray-700/50 font-mono text-xs">Ctrl+N</code>
                        </div>
                        <div className="flex justify-between items-center group">
                            <span
                                className="text-gray-400 group-hover:text-white transition-colors">Search Sidebar</span>
                            <code
                                className="text-gray-300 bg-gray-800 px-2 py-0.5 rounded border border-gray-700/50 font-mono text-xs">Ctrl+/</code>
                        </div>
                        <div className="flex justify-between items-center group">
                            <span className="text-gray-400 group-hover:text-white transition-colors">Save Note</span>
                            <code
                                className="text-gray-300 bg-gray-800 px-2 py-0.5 rounded border border-gray-700/50 font-mono text-xs">Ctrl+S</code>
                        </div>
                        <div className="flex justify-between items-center group">
                            <span
                                className="text-gray-400 group-hover:text-white transition-colors">Previous Note</span>
                            <code
                                className="text-gray-300 bg-gray-800 px-2 py-0.5 rounded border border-gray-700/50 font-mono text-xs">Alt+Up</code>
                        </div>
                        <div className="flex justify-between items-center group">
                            <span className="text-gray-400 group-hover:text-white transition-colors">Next Note</span>
                            <code
                                className="text-gray-300 bg-gray-800 px-2 py-0.5 rounded border border-gray-700/50 font-mono text-xs">Alt+Down</code>
                        </div>
                        <div className="flex justify-between items-center group">
                            <span className="text-gray-400 group-hover:text-white transition-colors">Back to List</span>
                            <code
                                className="text-gray-300 bg-gray-800 px-2 py-0.5 rounded border border-gray-700/50 font-mono text-xs">Alt+Left</code>
                        </div>
                        <div className="flex justify-between items-center group">
                            <span
                                className="text-gray-400 group-hover:text-white transition-colors">Toggle Sidebar</span>
                            <code
                                className="text-gray-300 bg-gray-800 px-2 py-0.5 rounded border border-gray-700/50 font-mono text-xs">Ctrl+\\</code>
                        </div>
                        <div className="flex justify-between items-center group">
                            <span className="text-gray-400 group-hover:text-white transition-colors">Toggle Developer Mode</span>
                            <code
                                className="text-gray-300 bg-gray-800 px-2 py-0.5 rounded border border-gray-700/50 font-mono text-xs">Ctrl+Shift+D</code>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
