import React, {useState} from 'react';
import {DocumentDuplicateIcon, TrashIcon} from '../ui/icons';
import {useNotes} from '../../hooks/useNotes';
import {useSettings} from '../../hooks/useSettingsContext';
import {useView} from '../../hooks/useViewContext';
import {Button} from '../ui/Button';
import {ConfirmationModal} from '../ui/Primitives';
import {ImportExportSection} from './ImportExportSection';
import {CapabilitiesPanel} from './CapabilitiesPanel';
import {useDemoWorkspace} from '../../hooks/useDemoWorkspace';
import {SparklesIcon} from '../ui/icons';
import {useMetrics, Metrics} from '../../hooks/useMetrics';

export function DataTab() {
    const {notes} = useNotes();
    const {settings} = useSettings();
    const {setActiveView} = useView();
    const demo = useDemoWorkspace();
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const {track} = useMetrics();

    const handleExportWorkspace = () => {
        track(Metrics.EXPORT_WORKSPACE, {noteCount: notes.length});
    };

    const handleExportNote = (noteId: string) => {
        track(Metrics.EXPORT_NOTE, {noteId});
    };

    const handleImportSuccess = (noteCount: number) => {
        track(Metrics.IMPORT_SUCCESS, {noteCount});
    };

    const handleImportFailed = (error: string) => {
        track(Metrics.IMPORT_FAILED, {error});
    };

    const handleClearConfirm = () => {
        window.localStorage.clear();
        window.indexedDB.deleteDatabase('localforage');
        window.location.reload();
    };

    return (
        <div className="bg-gray-900/70 p-6 rounded-lg animate-fade-in space-y-8">

            {/* Backup & Restore */}
            <ImportExportSection
                notes={notes}
                settings={settings}
                onExportWorkspace={handleExportWorkspace}
                onExportNote={handleExportNote}
                onImportSuccess={handleImportSuccess}
                onImportFailed={handleImportFailed}
            />

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

            <CapabilitiesPanel
                onGrantViewed={(noteId, capability) => track(Metrics.CAPABILITY_GRANT_VIEWED, {noteId, capability})}
                onRevoked={(noteId, capability) => track(Metrics.CAPABILITY_REVOKED, {noteId, capability})}
            />

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
                onConfirm={handleClearConfirm}
                title="Clear All Data?"
                message="Are you sure you want to delete all data? This action cannot be undone."
                confirmLabel="Clear Everything"
                isDestructive
            />
        </div>
    );
}