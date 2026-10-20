import React, {useState} from 'react';
import {DocumentDuplicateIcon, TrashIcon} from '../common/icons';
import {useNotes} from '../../hooks/useNotes';
import {useSettings} from '../../hooks/useSettingsContext';
import {useView} from '../../hooks/useViewContext';
import {Button} from '../common/Button';
import {ConfirmationModal} from '../common/ConfirmationModal';
import {ImportExportSection} from './ImportExportSection';
import {useDemoWorkspace} from '../../hooks/useDemoWorkspace';
import {SparklesIcon} from '../common/icons';

export function DataTab() {
    const {notes} = useNotes();
    const {settings} = useSettings();
    const {setActiveView} = useView();
    const demo = useDemoWorkspace();
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    return (
        <div className="bg-gray-900/70 p-6 rounded-lg animate-fade-in space-y-8">

            {/* Backup & Restore */}
            <ImportExportSection notes={notes} settings={settings}/>

            <div className="border-t border-gray-700 pt-6">
                <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-3">
                    <SparklesIcon className="h-6 w-6 text-purple-400"/>
                    Sample Workspace
                </h2>
                <p className="text-sm text-gray-400 mb-4">
                    Load a small local community of notes with requests, offers, an event, and places.
                    Existing notes are never overwritten.
                </p>
                <div className="flex gap-3">
                    <Button variant="primary" icon={SparklesIcon} onClick={demo.load}>
                        {demo.hasSampleData ? 'Reload sample workspace' : 'Load sample workspace'}
                    </Button>
                    {demo.hasSampleData && (
                        <Button variant="secondary" icon={TrashIcon} onClick={demo.remove}>
                            Remove sample data
                        </Button>
                    )}
                </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
                    <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-3">
                        <DocumentDuplicateIcon className="h-6 w-6 text-red-400"/>
                        Deleted Notes
                    </h2>
                    <p className="text-sm text-gray-400 mb-4">
                        Deleted notes can be restored or permanently removed. They are never expired automatically.
                    </p>
                    <Button
                        variant="secondary"
                        icon={DocumentDuplicateIcon}
                        onClick={() => setActiveView('trash')}
                    >
                        Recently deleted
                    </Button>
                </div>

                <div className="border-t border-gray-700 pt-6">
                <p className="text-sm text-gray-400 mb-4">
                    Your notes and settings are stored locally in your browser&apos;s
                    IndexedDB. Clearing data is irreversible.
                </p>
                <Button
                    variant="danger"
                    icon={TrashIcon}
                    onClick={() => setShowClearConfirm(true)}
                >
                    Clear All Local Data
                </Button>
            </div>

            <ConfirmationModal
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={() => {
                    window.localStorage.clear();
                    window.indexedDB.deleteDatabase('localforage');
                    window.location.reload();
                }}
                title="Clear All Data?"
                message="Are you sure you want to delete all data? This action cannot be undone."
                confirmLabel="Clear Everything"
                isDestructive
            />
        </div>
    );
};
