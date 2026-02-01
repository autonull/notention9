import React, { useRef, useState } from 'react';
import { DocumentDuplicateIcon, ArrowDownIcon, ArrowUpIcon } from '../common/icons';
import { Button } from '../common/Button';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { useToast } from '../../hooks/useToast';
import localforage from 'localforage';
import type { Note, AppSettings } from '@notention/core';
import { generateNotesCSV } from '../../utils/csvExport';

interface ImportExportSectionProps {
    notes: Note[];
    settings: AppSettings;
}

interface PendingImport {
    type: 'full' | 'note';
    data: any;
    message: string;
}

export function ImportExportSection({ notes, settings }: ImportExportSectionProps) {
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);

    const handleExport = async () => {
        const exportData = {
            version: 1,
            timestamp: new Date().toISOString(),
            notes,
            settings
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notention-backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Data exported successfully', 'success');
    };

    const handleExportCSV = () => {
        const csvContent = generateNotesCSV(notes);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notention-notes-${new Date().toISOString().slice(0,10)}.csv`;
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
                const text = event.target?.result as string;
                const data = JSON.parse(text);

                // Case 1: Full Backup (notes + settings)
                if (data.notes && data.settings) {
                    setPendingImport({
                        type: 'full',
                        data,
                        message: `Found backup with ${data.notes.length} notes. This will OVERWRITE your current data. Continue?`
                    });
                    return;
                }

                // Case 2: Single Note
                if (data.id && data.content) {
                    const currentNotes = await localforage.getItem<Note[]>('notention-notes') || [];
                    const existingIndex = currentNotes.findIndex((n) => n.id === data.id);

                    if (existingIndex >= 0) {
                        setPendingImport({
                            type: 'note',
                            data,
                            message: `Note "${data.title}" already exists. Overwrite?`
                        });
                    } else {
                        // No conflict, just import
                        currentNotes.push(data);
                        await localforage.setItem('notention-notes', currentNotes);
                        addToast(`Imported note: ${data.title}`, "success");
                        setTimeout(() => window.location.reload(), 1000);
                    }
                    return;
                }

                throw new Error("Unknown file format. Expected a backup or a note.");
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                addToast("Import failed: " + message, 'error', 5000);
            } finally {
                // Reset input
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const executeImport = async () => {
        if (!pendingImport) return;

        try {
            if (pendingImport.type === 'full') {
                const { data } = pendingImport;
                await localforage.setItem('notention-notes', data.notes);
                await localforage.setItem('notention-settings', data.settings);
                addToast("Import successful! Reloading...", "success");
                setTimeout(() => window.location.reload(), 1500);
            } else if (pendingImport.type === 'note') {
                 const { data } = pendingImport;
                 const currentNotes = await localforage.getItem<Note[]>('notention-notes') || [];
                 const existingIndex = currentNotes.findIndex((n) => n.id === data.id);

                 if (existingIndex >= 0) {
                     currentNotes[existingIndex] = data;
                 } else {
                     currentNotes.push(data);
                 }

                 await localforage.setItem('notention-notes', currentNotes);
                 addToast(`Imported note: ${data.title}`, "success");
                 setTimeout(() => window.location.reload(), 1000);
            }
        } catch (err) {
            console.error(err);
            addToast("Import execution failed.", "error");
        } finally {
            setPendingImport(null);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-3">
              <DocumentDuplicateIcon className="h-6 w-6 text-blue-400" />
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
                Save your notes and settings to a JSON file. You can restore them later on any device.
            </p>

            <ConfirmationModal
                isOpen={!!pendingImport}
                onClose={() => setPendingImport(null)}
                onConfirm={executeImport}
                title={pendingImport?.type === 'full' ? "Restore Backup?" : "Overwrite Note?"}
                message={pendingImport?.message || "Are you sure?"}
                confirmLabel={pendingImport?.type === 'full' ? "Restore & Overwrite" : "Overwrite"}
                isDestructive={pendingImport?.type === 'full'}
            />
        </div>
    );
};
