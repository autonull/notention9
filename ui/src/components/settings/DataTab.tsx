import React, {useState, useEffect} from 'react';
import {DocumentDuplicateIcon, TrashIcon, ExclamationTriangleIcon, DownloadIcon} from '../ui/icons';
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
import {storageRecovery} from '@notention/core';
import {useToast} from '../../hooks/useToast';

export function DataTab() {
    const {notes} = useNotes();
    const {settings} = useSettings();
    const {setActiveView} = useView();
    const demo = useDemoWorkspace();
    const {addToast} = useToast();
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [quotaInfo, setQuotaInfo] = useState<{used: number; available: number; percentUsed: number} | null>(null);
    const {track} = useMetrics();

    useEffect(() => {
        const checkQuota = async () => {
            const info = await storageRecovery.getQuotaInfo();
            setQuotaInfo(info);
        };
        checkQuota();
        const interval = setInterval(checkQuota, 60000);
        return () => clearInterval(interval);
    }, []);

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

    const handleExportFriction = async () => {
        try {
            const db = await new Promise<IDBDatabase>((resolve, reject) => {
                const request = indexedDB.open('notention-journal');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            const tx = db.transaction('friction', 'readonly');
            const store = tx.objectStore('friction');
            const request = store.get('friction-journal');

            const events = await new Promise<any[]>((resolve, reject) => {
                tx.oncomplete = () => resolve((request.result ?? []) as never);
                tx.onerror = () => reject(request.error);
            });

            const lines = events.map(e => JSON.stringify(e)).join('\n');
            if (lines) lines + '\n';

            const blob = new Blob([lines], {type: 'application/jsonl'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `friction-journal-${new Date().toISOString().slice(0, 10)}.jsonl`;
            a.click();
            URL.revokeObjectURL(url);
            addToast(`Exported ${events.length} friction events`, 'success');
            track(Metrics.EXPORT_WORKSPACE, {noteCount: notes.length, friction: true});
        } catch (err) {
            addToast('Friction export failed: ' + (err instanceof Error ? err.message : String(err)), 'error');
        }
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

            <div className="border-t border-gray-700 pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Friction Journal</h3>
                <p className="text-xs text-gray-500 mb-3">
                    Export the local friction journal for <code className="px-1.5 py-0.5 bg-gray-800 rounded text-green-300 font-mono text-xs">pnpm loop prioritize --source friction</code>.
                    The journal records capture, match, and response friction from this browser session.
                </p>
                <div className="flex gap-2">
                    <Button variant="secondary" icon={DownloadIcon} onClick={handleExportFriction}>
                        Export Friction Journal (JSONL)
                    </Button>
                    <span className="text-xs text-gray-500 self-center px-2">
                        → <code className="font-mono">.notention/journal/friction.jsonl</code>
                    </span>
                </div>
            </div>

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

            {quotaInfo && quotaInfo.percentUsed >= 80 && (
                <div className="border-t border-gray-700 pt-6">
                    <div className="flex items-center gap-3 p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
                        <ExclamationTriangleIcon className="h-6 w-6 text-amber-400 flex-shrink-0"/>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-amber-300">Storage quota warning</p>
                            <p className="text-xs text-amber-500 mt-1">
                                Using {quotaInfo.percentUsed.toFixed(1)}% of available storage
                                ({(quotaInfo.used / 1024 / 1024).toFixed(2)} MB / {(quotaInfo.available / 1024 / 1024).toFixed(2)} MB).
                                Consider exporting and clearing old data.
                            </p>
                        </div>
                    </div>
                </div>
            )}

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