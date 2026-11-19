import React, { useState, useEffect } from 'react';
import { useSync } from '../../hooks/data/useSync';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/Button';
import { Input } from '../ui/Input';
import { ConfirmationModal } from '../ui/Primitives';
import { NetworkIcon, ArrowPathIcon, ExclamationTriangleIcon, QuestionMarkCircleIcon, MergeIcon, CheckIcon, XIcon, KeyIcon } from '../ui/icons';

export function SyncTab() {
    const { addToast } = useToast();
    const {
        isEnabled,
        isSyncing,
        lastSyncAt,
        pendingConflicts,
        enableSync,
        disableSync,
        syncNow,
        resolveConflict,
        getConflictDetails,
    } = useSync();

    const [privkeyInput, setPrivkeyInput] = useState('');
    const [showPrivkey, setShowPrivkey] = useState(false);
    const [expandedConflictId, setExpandedConflictId] = useState<string | null>(null);

    const formatTime = (timestamp: number | null) => {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    const handleEnableSync = () => {
        if (!privkeyInput.trim()) {
            addToast('Please enter your Nostr private key', 'error');
            return;
        }
        enableSync(privkeyInput.trim());
        setPrivkeyInput('');
        addToast('Sync enabled', 'success');
    };

    const handleDisableSync = () => {
        disableSync();
        addToast('Sync disabled', 'info');
    };

    const handleSyncNow = async () => {
        await syncNow();
        addToast('Sync completed', 'success');
    };

    const handleResolveConflict = (noteId: string, resolution: 'local' | 'remote' | 'merge') => {
        resolveConflict(noteId, resolution);
        const labels = { local: 'Keep Local', remote: 'Accept Remote', merge: 'Merge' };
        addToast(`Conflict resolved: ${labels[resolution]}`, 'success');
    };

    return (
        <div className="bg-gray-900/70 p-4 md:p-6 rounded-lg animate-fade-in lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
            <div className="flex flex-col gap-2 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400">
                        <NetworkIcon className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-100">Multi-Device Sync</h2>
                </div>
                <p className="text-sm text-gray-400">
                    Synchronize notes across devices using Nostr. Uses revision log with last-write-wins and conflict detection.
                </p>
            </div>

            <div className="mt-4 lg:overflow-y-auto custom-scrollbar lg:flex-1 lg:min-h-0 space-y-6">
                {!isEnabled ? (
                    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                        <h3 className="text-lg font-medium text-gray-100 mb-4">Enable Sync</h3>
                        <p className="text-gray-400 mb-4">
                            Enter your Nostr private key (nsec or hex) to enable multi-device sync.
                            Your notes will be synced as a revision log across all linked devices.
                        </p>
                        <div className="flex gap-2">
                            <Input
                                type={showPrivkey ? 'text' : 'password'}
                                value={privkeyInput}
                                onChange={(e) => setPrivkeyInput(e.target.value)}
                                placeholder="nsec1... or hex private key"
                                className="flex-1"
                            />
                            <IconButton
                                onClick={() => setShowPrivkey(!showPrivkey)}
                                variant="ghost"
                                size="md"
                                className="text-gray-500 hover:text-white"
                                aria-label={showPrivkey ? 'Hide key' : 'Show key'}
                            >
                                {showPrivkey ? <QuestionMarkCircleIcon className="w-5 h-5" /> : <QuestionMarkCircleIcon className="w-5 h-5" />}
                            </IconButton>
                            <Button onClick={handleEnableSync} variant="primary" icon={<KeyIcon className="w-4 h-4" />}>
                                Enable Sync
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Your private key never leaves this device. It is used locally to sign revision events.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-3 h-3 rounded-full ${isSyncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                                        <span className="font-medium text-gray-100">
                                            {isSyncing ? 'Syncing...' : 'Sync Enabled'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500 px-2 py-1 bg-gray-700 rounded">
                                        Last sync: {formatTime(lastSyncAt)}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleSyncNow}
                                        disabled={isSyncing}
                                        variant="primary"
                                        icon={<ArrowPathIcon className="w-4 h-4" />}
                                    >
                                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                                    </Button>
                                    <Button
                                        onClick={handleDisableSync}
                                        variant="ghost"
                                        className="text-red-400 hover:text-red-300"
                                        icon={<XIcon className="w-4 h-4" />}
                                    >
                                        Disable
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {pendingConflicts.length > 0 && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
                                    <h3 className="text-lg font-medium text-yellow-300">
                                        {pendingConflicts.length} Conflict{pendingConflicts.length !== 1 ? 's' : ''} Detected
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-400 mb-4">
                                    Concurrent edits were detected on the same notes. Choose how to resolve each conflict.
                                </p>
                                <div className="space-y-3">
                                    {pendingConflicts.map(conflict => {
                                        const details = getConflictDetails(conflict.noteId);
                                        const isExpanded = expandedConflictId === conflict.noteId;

                                        return (
                                            <div key={conflict.noteId} className="bg-gray-800 rounded-lg border border-yellow-500/20 p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <span className="font-mono text-sm text-yellow-300 truncate">
                                                            {conflict.noteId.slice(0, 8)}...
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            Local rev: {conflict.localRevision.revision} → Remote rev: {conflict.remoteRevision.revision}
                                                        </span>
                                                    </div>
                                                    <IconButton
                                                        onClick={() => setExpandedConflictId(isExpanded ? null : conflict.noteId)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-gray-500 hover:text-white"
                                                    >
                                                        {isExpanded ? <XIcon className="w-4 h-4" /> : <QuestionMarkCircleIcon className="w-4 h-4" />}
                                                    </IconButton>
                                                </div>

                                                {isExpanded && (
                                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="bg-gray-900/50 rounded p-3">
                                                            <h4 className="text-xs font-medium text-gray-400 mb-2">Local Version</h4>
                                                            <pre className="text-[10px] text-gray-300 overflow-auto max-h-40">
                                                                {JSON.stringify({
                                                                    title: conflict.localRevision.title,
                                                                    content: conflict.localRevision.content.slice(0, 200),
                                                                    properties: conflict.localRevision.properties,
                                                                    updatedAt: conflict.localRevision.updatedAt,
                                                                }, null, 2)}
                                                            </pre>
                                                        </div>
                                                        <div className="bg-gray-900/50 rounded p-3">
                                                            <h4 className="text-xs font-medium text-gray-400 mb-2">Remote Version</h4>
                                                            <pre className="text-[10px] text-gray-300 overflow-auto max-h-40">
                                                                {JSON.stringify({
                                                                    title: conflict.remoteRevision.title,
                                                                    content: conflict.remoteRevision.content.slice(0, 200),
                                                                    properties: conflict.remoteRevision.properties,
                                                                    updatedAt: conflict.remoteRevision.updatedAt,
                                                                }, null, 2)}
                                                            </pre>
                                                        </div>
                                                        <div className="bg-gray-900/50 rounded p-3 flex flex-col justify-between">
                                                            <h4 className="text-xs font-medium text-gray-400 mb-2">Resolution</h4>
                                                            <div className="space-y-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    onClick={() => handleResolveConflict(conflict.noteId, 'local')}
                                                                >
                                                                    Keep Local
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    onClick={() => handleResolveConflict(conflict.noteId, 'remote')}
                                                                >
                                                                    Accept Remote
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="primary"
                                                                    onClick={() => handleResolveConflict(conflict.noteId, 'merge')}
                                                                    icon={<MergeIcon className="w-3 h-3" />}
                                                                >
                                                                    Merge (Auto)
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                            <h3 className="text-lg font-medium text-gray-100 mb-3">How Sync Works</h3>
                            <ul className="text-sm text-gray-400 space-y-2">
                                <li>• <strong>Revision log:</strong> Every note change creates a signed revision event</li>
                                <li>• <strong>Last-write-wins:</strong> Sequential edits automatically merge</li>
                                <li>• <strong>Conflict detection:</strong> Concurrent edits on different devices are flagged</li>
                                <li>• <strong>Keep both:</strong> Conflicts preserve both versions; you choose the resolution</li>
                                <li>• <strong>No CRDT:</strong> Simple, auditable event log instead of complex merge algorithms</li>
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}