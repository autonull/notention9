import React, {useState, useEffect} from 'react';
import {DocumentDuplicateIcon, TrashIcon, ExclamationTriangleIcon, DownloadIcon} from '../ui/icons';
import {useNotes} from '../../hooks/useNotes';
import {useSettings} from '../../hooks/useSettingsContext';
import {useView} from '../../hooks/useViewContext';
import {Button} from '../ui/Button';
import {ConfirmationModal} from '../ui/Primitives';
import {ImportExportSection} from './ImportExportSection';
import {AutoBackupSection} from './AutoBackupSection';
import {CapabilitiesPanel} from './CapabilitiesPanel';
import {useDemoWorkspace} from '../../hooks/useDemoWorkspace';
import {SparklesIcon} from '../ui/icons';
import {SectionHeader} from '../ui/kit';
import {useMetrics, Metrics} from '../../hooks/useMetrics';
import {storageRecovery} from '@notention/core';
import {getJournal, serializeFrictionEvents} from '@notention/core/telemetry/journal';
import {useToast} from '../../hooks/useToast';

export function DataTab() {
    const {notes} = useNotes();
    const {settings} = useSettings();
    const {setActiveView, setNotesSection} = useView();
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
            const journal = getJournal();
            await journal.flush();
            const events = await journal.getEvents();
            const lines = serializeFrictionEvents(events);

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
        <div className="space-y-8">

            {/* Backup & Restore */}
            <ImportExportSection
                notes={notes}
                settings={settings}
                onExportWorkspace={handleExportWorkspace}
                onExportNote={handleExportNote}
                onImportSuccess={handleImportSuccess}
                onImportFailed={handleImportFailed}
            />

            <div className="border-t border-[var(--app-line)] pt-4 mt-4">
                <h3 className="text-sm font-medium text-[var(--app-text-secondary)] mb-2">Friction Journal</h3>
                <p className="text-xs text-[var(--app-muted)] mb-3">
                    Export the local friction journal as JSONL. Then run{' '}
                    <code className="px-1.5 py-0.5 bg-[var(--app-raised)] rounded text-green-300 font-mono text-xs">
                        pnpm loop import-journal {'<downloaded-file>'}
                    </code>{' '}
                    to merge it into the local journal used by the optimization loop.
                </p>
                <div className="flex gap-2">
                    <Button variant="secondary" icon={DownloadIcon} onClick={handleExportFriction}>
                        Export Friction Journal (JSONL)
                    </Button>
                    <span className="text-xs text-[var(--app-muted)] self-center px-2">
                        → <code className="font-mono">pnpm loop prioritize --source friction</code>
                    </span>
                </div>
            </div>

            <div className="space-y-3">
                <SectionHeader
                    title="Sample workspace"
                    description="Load a small local community. Existing notes are never overwritten."
                    icon={SparklesIcon}
                />
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

            <div className="space-y-3">
                <SectionHeader
                    title="Deleted notes"
                    description="Restore or remove them permanently. Nothing expires on its own."
                    icon={DocumentDuplicateIcon}
                />
                <Button
                    variant="secondary"
                    icon={DocumentDuplicateIcon}
                    onClick={() => {
                        setNotesSection('trash');
                        setActiveView('notes');
                    }}
                >
                    Recently deleted
                </Button>
            </div>

            <CapabilitiesPanel
                onGrantViewed={(noteId, capability) => track(Metrics.CAPABILITY_GRANT_VIEWED, {noteId, capability})}
                onRevoked={(noteId, capability) => track(Metrics.CAPABILITY_REVOKED, {noteId, capability})}
            />

            <AutoBackupSection onBackupDue={() => {}}/>

            {quotaInfo && quotaInfo.percentUsed >= 80 && (
                <div className="border-t border-[var(--app-line)] pt-6">
                    <div className="flex items-center gap-3 p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
                        <ExclamationTriangleIcon tone="warning" className="h-6 w-6 flex-shrink-0"/>
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

            <div className="border-t border-[var(--app-line)] pt-6">
                <p className="text-[12px] text-[var(--app-muted)] mb-4">
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