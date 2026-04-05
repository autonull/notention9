import React from 'react';
import type { AppSettings } from '@notention/core';

interface EditorTabProps {
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export function EditorTab({ settings, setSettings }: EditorTabProps) {
    const handleEditorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value as 'tiptap' | 'pretext';
        setSettings(s => ({ ...s, editorType: val }));
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-medium text-white mb-4">Editor Selection</h3>
                <p className="text-sm text-gray-400 mb-6">
                    Choose which editor to use for writing and displaying notes.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Active Editor
                        </label>
                        <select
                            value={settings.editorType || 'tiptap'}
                            onChange={handleEditorChange}
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="tiptap">Tiptap (Rich Text)</option>
                            <option value="pretext">Pretext (Experimental)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                            Pretext is an experimental custom editor using lightweight browser typography.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}