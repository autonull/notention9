import React, {useRef, useState} from 'react';
import {ArrowDownIcon, ArrowUpIcon, DocumentDuplicateIcon} from '../ui/icons';
import {Button} from '../ui/Button';
import {ConfirmationModal} from '../ui/Primitives';
import {useToast} from '../../hooks/useToast';
import localforage from 'localforage';
import type {AppSettings, ExportNote, Note} from '@notention/core';
import {
    buildExportEnvelope,
    generateNotesCSV,
    Logger,
    readExportEnvelope,
    readSingleNote,
} from '@notention/core';
import {STORAGE_KEYS} from '../../config/storageKeys';

interface ImportExportSectionProps {
    notes: Note[];
    settings: AppSettings;
}

interface PendingImport {
    type: 'full' | 'note';
    data: {notes: ExportNote[]; settings: AppSettings} | ExportNote;
    message: string;
}

export function ImportExportSection({notes, settings}: ImportExportSectionProps) {
    const {addToast} = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);

    const handleExport = () => {
        const exportData = buildExportEnvelope(notes, settings);
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notention-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Data exported successfully', 'success');
    };

    const handleExportCSV = () => {
        const csvContent = generateNotesCSV(notes);
        const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notention-notes-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('CSV exported successfully', 'success');
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);

                if (data?.notes && data?.settings) {
                    const envelope = readExportEnvelope(data);
                    setPendingImport({
                        type: 'full',
                        data: envelope,
                        message: `Found backup with ${envelope.notes.length} notes. This will OVERWRITE your current notes and settings. Continue?`
                    });
                    return;
                }

                if (data?.id && data?.content) {
                    const note = readSingleNote(data);
                    const currentNotes = await localforage.getItem<Note[]>(STORAGE_KEYS.notes) || [];
                    const exists = currentNotes.some(n => n.id === note.id);

                    if (exists) {
                        setPendingImport({
                            type: 'note',
                            data: note,
                            message: `Note "${note.title ?? 'Untitled'}" already exists. Overwrite?`
                        });
                    } else {
                        currentNotes.push(note as Note);
                        await localforage.setItem(STORAGE_KEYS.notes, currentNotes);
                        addToast(`Imported note: ${note.title ?? 'Untitled'}`, 'success');
                        setTimeout(() => window.location.reload(), 1000);
                    }
                    return;
                }

                throw new Error('Unknown file format. Expected a backup or a note.');
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                addToast('Import failed: ' + message, 'error', 5000);
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const executeImport = async () => {
        if (!pendingImport) return;

        try {
            if (pendingImport.type === 'full') {
                const envelope = readExportEnvelope(pendingImport.data);
                await localforage.setItem(STORAGE_KEYS.notes, envelope.notes);
                await localforage.setItem(STORAGE_KEYS.settings, envelope.settings);
                addToast('Import successful. Reloading...', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                const note = readSingleNote(pendingImport.data) as Note;
                const currentNotes = await localforage.getItem<Note[]>(STORAGE_KEYS.notes) || [];
                const existingIndex = currentNotes.findIndex(n => n.id === note.id);

                if (existingIndex >= 0) {
                    currentNotes[existingIndex] = note;
                } else {
                    currentNotes.push(note);
                }

                await localforage.setItem(STORAGE_KEYS.notes, currentNotes);
                addToast(`Imported note: ${note.title ?? 'Untitled'}`, 'success');
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (err) {
            Logger.getInstance().error('Import execution failed', err instanceof Error ? err : new Error(String(err)));
            addToast('Import execution failed. Your existing data was not changed.', 'error');
        } finally {
            setPendingImport(null);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-3">
                <DocumentDuplicateIcon className="h-6 w-6 text-blue-400"/>
                Backup & Restore
            </h2>
            <div className="flex gap-4">
                <Button
                    onClick={handleExport}
                    variant="primary"
                    icon={ArrowDownIcon}
                >
                    Export JSON
                </Button>

                <Button
                    onClick={handleExportCSV}
                    variant="secondary"
                    icon={ArrowDownIcon}
                >
                    Export CSV
                </Button>

                <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="secondary"
                    icon={ArrowUpIcon}
                >
                    Import JSON
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".json"
                    onChange={handleImportFile}
                />
            </div>
            <p className="text-sm text-gray-400 mt-2">
                Backups include notes and settings, never your private key. Single notes can be exported from the editor menu.
            </p>

            <ConfirmationModal
                isOpen={!!pendingImport}
                onClose={() => setPendingImport(null)}
                onConfirm={executeImport}
                title={pendingImport?.type === 'full' ? 'Restore Backup?' : 'Overwrite Note?'}
                message={pendingImport?.message || 'Are you sure?'}
                confirmLabel={pendingImport?.type === 'full' ? 'Restore & Overwrite' : 'Overwrite'}
                isDestructive={pendingImport?.type === 'full'}
            />
        </div>
    );
}
