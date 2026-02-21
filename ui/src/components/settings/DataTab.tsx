import React, {useState} from 'react';
import {TrashIcon} from '../common/icons';
import {useNotes} from '../../hooks/useNotes';
import {useSettings} from '../../hooks/useSettingsContext';
import {Button} from '../common/Button';
import {ConfirmationModal} from '../common/ConfirmationModal';
import {ImportExportSection} from './ImportExportSection';

export function DataTab() {
    const {notes} = useNotes();
    const {settings} = useSettings();
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    return (
        <div className="bg-gray-900/70 p-6 rounded-lg animate-fade-in space-y-8">

            {/* Backup & Restore */}
            <ImportExportSection notes={notes} settings={settings}/>

            <div className="border-t border-gray-700 pt-6">
                <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-3">
                    <TrashIcon className="h-6 w-6 text-red-400"/>
                    Danger Zone
                </h2>
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
