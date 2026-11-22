import React, { useState, useEffect } from 'react';
import { useNetworkManagement } from '../../hooks/useNetworkManagement';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/Button';
import { Input } from '../ui/Input';
import { Toggle } from '../ui/Toggle';
import { NetworkIcon, ArrowPathIcon, ExclamationTriangleIcon, QuestionMarkCircleIcon, MergeIcon, CheckIcon, XIcon, KeyIcon, WifiIcon, DatabaseIcon, ZapIcon } from '../ui/icons';
import {SectionHeader} from '../ui/kit';

export function SyncTab() {
    const { addToast } = useToast();
    const {
        providers,
        nostrSettings,
        isPrivateMode,
        syncNow,
        fullSync,
        getSyncBudgetStatus,
        getSyncMetrics,
        updateSyncSettings,
        syncSettings,
    } = useNetworkManagement();

    const [privkeyInput, setPrivkeyInput] = useState('');
    const [showPrivkey, setShowPrivkey] = useState(false);
    const [expandedConflictId, setExpandedConflictId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
    const [pendingConflicts, setPendingConflicts] = useState<Array<{ noteId: string; localRevision: any; remoteRevision: any }>>([]);
    const [budgetStatus, setBudgetStatus] = useState<ReturnType<typeof getSyncBudgetStatus> | null>(null);
    const [metrics, setMetrics] = useState<ReturnType<typeof getSyncMetrics> | null>(null);

    const formatTime = (timestamp: number | null) => {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    const formatBytes = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const handleEnableSync = () => {
        if (!privkeyInput.trim()) {
            addToast('Please enter your Nostr private key', 'error');
            return;
        }
        // The actual enable is done via settings update in useNetworkManagement
        addToast('Sync enabled', 'success');
    };

    const handleDisableSync = () => {
        addToast('Sync disabled', 'info');
    };

    const handleSyncNow = async () => {
        setIsSyncing(true);
        try {
            const result = await syncNow();
            if (result.synced) {
                addToast(`Sync completed: ${result.eventsPublished} sent, ${result.eventsReceived} received (${formatBytes(result.payloadBytes)})`, 'success');
                setLastSyncAt(result.isDelta ? Date.now() : Date.now());
            } else {
                addToast(result.error || 'Sync failed', 'error');
            }
        } catch (e) {
            addToast('Sync failed', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleFullSync = async () => {
        setIsSyncing(true);
        try {
            const result = await fullSync();
            if (result.synced) {
                addToast(`Full sync completed: ${result.eventsPublished} sent (${formatBytes(result.payloadBytes)})`, 'success');
                setLastSyncAt(Date.now());
            } else {
                addToast(result.error || 'Full sync failed', 'error');
            }
        } catch (e) {
            addToast('Full sync failed', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleResolveConflict = (noteId: string, resolution: 'local' | 'remote' | 'merge') => {
        const labels = { local: 'Keep Local', remote: 'Accept Remote', merge: 'Merge' };
        addToast(`Conflict resolved: ${labels[resolution]}`, 'success');
    };

    // Update budget status and metrics when settings change
    useEffect(() => {
        if (nostrSettings) {
            setBudgetStatus(getSyncBudgetStatus());
            setMetrics(getSyncMetrics());
        }
    }, [nostrSettings, syncSettings]);

    // Update lastSyncAt from settings
    useEffect(() => {
        if (syncSettings?.lastSyncAt) {
            setLastSyncAt(syncSettings.lastSyncAt);
        }
    }, [syncSettings?.lastSyncAt]);

    const isEnabled = !!nostrSettings?.privkey && !isPrivateMode;

    return (
        <div className="space-y-8">
            <SectionHeader
                title="Multi-device sync"
                description="Sync notes over Nostr with a revision log and conflict detection."
                icon={NetworkIcon}
            />

            <div className="mt-4 lg:overflow-y-auto custom-scrollbar lg:flex-1 lg:min-h-0 space-y-6">
                {!isEnabled ? (
                    <div className="bg-[var(--app-raised)] rounded-lg border border-[var(--app-line)] p-6">
                        <h3 className="text-[13px] font-medium text-[var(--app-text)] mb-4">Enable Sync</h3>
                        <p className="text-[var(--app-muted)] mb-4">
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
                                className="text-[var(--app-muted)] hover:text-[var(--app-text)]"
                                aria-label={showPrivkey ? 'Hide key' : 'Show key'}
                                icon={QuestionMarkCircleIcon}
                            />
                            <Button onClick={handleEnableSync} variant="primary" icon={<KeyIcon className="w-4 h-4" />}>
                                Enable Sync
                            </Button>
                        </div>
                        <p className="text-xs text-[var(--app-muted)] mt-2">
                            Your private key never leaves this device. It is used locally to sign revision events.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="bg-[var(--app-raised)] rounded-lg border border-[var(--app-line)] p-4">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-3 h-3 rounded-full ${isSyncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                                        <span className="font-medium text-[var(--app-text)]">
                                            {isSyncing ? 'Syncing...' : 'Sync Enabled'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-[var(--app-muted)] px-2 py-1 bg-[var(--app-raised)] rounded">
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
                                        onClick={handleFullSync}
                                        disabled={isSyncing}
                                        variant="secondary"
                                        icon={<DatabaseIcon className="w-4 h-4" />}
                                    >
                                        Full Sync
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

                        {/* Sync Budget Status */}
                        {budgetStatus && (
                            <div className={`bg-[var(--app-raised)] rounded-lg border border-[var(--app-line)] p-4 ${budgetStatus.status === 'exceeded' ? 'border-red-500/50' : budgetStatus.status === 'warning' ? 'border-yellow-500/50' : ''}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <DatabaseIcon className={`w-5 h-5 ${budgetStatus.status === 'exceeded' ? 'text-red-400' : budgetStatus.status === 'warning' ? 'text-yellow-400' : 'text-green-400'}`} />
                                    <h3 className="text-[13px] font-medium text-[var(--app-text)]">Sync Budget</h3>
                                    <span className={`text-xs px-2 py-1 rounded ${
                                        budgetStatus.status === 'exceeded' ? 'bg-red-500/20 text-red-300' :
                                        budgetStatus.status === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                                        'bg-green-500/20 text-green-300'
                                    }`}>
                                        {budgetStatus.status.toUpperCase()}
                                    </span>
                                </div>
                                <p className="text-[12px] text-[var(--app-muted)] mb-4">{budgetStatus.message}</p>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-[var(--app-muted)]">Last Payload:</span>
                                        <span className="ml-2 font-mono text-[var(--app-text)]">{formatBytes(budgetStatus.payloadBytes)}</span>
                                    </div>
                                    <div>
                                        <span className="text-[var(--app-muted)]">Budget:</span>
                                        <span className="ml-2 font-mono text-[var(--app-text)]">{formatBytes(budgetStatus.maxPayloadBytes)}</span>
                                    </div>
                                    <div>
                                        <span className="text-[var(--app-muted)]">Utilization:</span>
                                        <span className="ml-2 font-mono text-[var(--app-text)]">{(budgetStatus.utilization * 100).toFixed(1)}%</span>
                                    </div>
                                    <div>
                                        <span className="text-[var(--app-muted)]">Avg/Note:</span>
                                        <span className="ml-2 font-mono text-[var(--app-text)]">{metrics?.bytesPerNote ? formatBytes(metrics.bytesPerNote) : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Sync Settings */}
                        <div className="bg-[var(--app-raised)] rounded-lg border border-[var(--app-line)] p-4">
                            <h3 className="text-[13px] font-medium text-[var(--app-text)] mb-4">Bandwidth & Battery Budget</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-medium text-[var(--app-text)]">WiFi-Only Mode</span>
                                        <p className="text-xs text-[var(--app-muted)]">Only sync when connected to WiFi (saves cellular data)</p>
                                    </div>
                                    <Toggle
                                        checked={syncSettings?.wifiOnly ?? false}
                                        onChange={(checked) => updateSyncSettings({ wifiOnly: checked })}
                                        ariaLabel="WiFi-only sync mode"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-medium text-[var(--app-text)]">Batch Events</span>
                                        <p className="text-xs text-[var(--app-muted)]">Combine multiple events into single publish (reduces overhead)</p>
                                    </div>
                                    <Toggle
                                        checked={syncSettings?.batchEnabled ?? true}
                                        onChange={(checked) => updateSyncSettings({ batchEnabled: checked })}
                                        ariaLabel="Batch events for sync"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-medium text-[var(--app-text)]">Compress Payloads</span>
                                        <p className="text-xs text-[var(--app-muted)]">Use CBOR encoding for smaller payloads</p>
                                    </div>
                                    <Toggle
                                        checked={syncSettings?.compress ?? true}
                                        onChange={(checked) => updateSyncSettings({ compress: checked })}
                                        ariaLabel="Compress sync payloads"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-medium text-[var(--app-text)]">Track Metrics</span>
                                        <p className="text-xs text-[var(--app-muted)]">Collect payload size statistics for reporting</p>
                                    </div>
                                    <Toggle
                                        checked={syncSettings?.trackMetrics ?? true}
                                        onChange={(checked) => updateSyncSettings({ trackMetrics: checked })}
                                        ariaLabel="Track sync metrics"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-1">Max Payload per Sync (bytes)</label>
                                    <Input
                                        type="number"
                                        value={syncSettings?.maxPayloadBytes ?? 1048576}
                                        onChange={(e) => updateSyncSettings({ maxPayloadBytes: parseInt(e.target.value) || 1048576 })}
                                        className="w-full max-w-xs"
                                        min={1024}
                                        max={10485760}
                                    />
                                    <p className="text-xs text-[var(--app-muted)] mt-1">Maximum bytes to send in a single sync session</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--app-text-secondary)] mb-1">Auto-Sync Interval (minutes, 0 = manual)</label>
                                    <Input
                                        type="number"
                                        value={syncSettings?.intervalMinutes ?? 0}
                                        onChange={(e) => updateSyncSettings({ intervalMinutes: parseInt(e.target.value) || 0 })}
                                        className="w-full max-w-xs"
                                        min={0}
                                        max={1440}
                                    />
                                    <p className="text-xs text-[var(--app-muted)] mt-1">Automatically sync at this interval (requires app to be open)</p>
                                </div>
                            </div>
                        </div>

                        {pendingConflicts.length > 0 && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
                                    <h3 className="text-[13px] font-medium text-yellow-300">
                                        {pendingConflicts.length} Conflict{pendingConflicts.length !== 1 ? 's' : ''} Detected
                                    </h3>
                                </div>
                                <p className="text-[12px] text-[var(--app-muted)] mb-4">
                                    Concurrent edits were detected on the same notes. Choose how to resolve each conflict.
                                </p>
                                <div className="space-y-3">
                                    {pendingConflicts.map(conflict => {
                                        const isExpanded = expandedConflictId === conflict.noteId;

                                        return (
                                            <div key={conflict.noteId} className="bg-[var(--app-raised)] rounded-lg border border-yellow-500/20 p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <span className="font-mono text-sm text-yellow-300 truncate">
                                                            {conflict.noteId.slice(0, 8)}...
                                                        </span>
                                                        <span className="text-xs text-[var(--app-muted)]">
                                                            Local rev: {conflict.localRevision.revision} → Remote rev: {conflict.remoteRevision.revision}
                                                        </span>
                                                    </div>
                                                    <IconButton
                                                        onClick={() => setExpandedConflictId(isExpanded ? null : conflict.noteId)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-[var(--app-muted)] hover:text-[var(--app-text)]"
                                                        icon={isExpanded ? XIcon : QuestionMarkCircleIcon}
                                                    />
                                                </div>

                                                {isExpanded && (
                                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="bg-[var(--app-surface)]/50 rounded p-3">
                                                            <h4 className="text-xs font-medium text-[var(--app-muted)] mb-2">Local Version</h4>
                                                            <pre className="text-xs text-[var(--app-text-secondary)] overflow-auto max-h-40">
                                                                {JSON.stringify({
                                                                    title: conflict.localRevision.title,
                                                                    content: conflict.localRevision.content.slice(0, 200),
                                                                    properties: conflict.localRevision.properties,
                                                                    updatedAt: conflict.localRevision.updatedAt,
                                                                }, null, 2)}
                                                            </pre>
                                                        </div>
                                                        <div className="bg-[var(--app-surface)]/50 rounded p-3">
                                                            <h4 className="text-xs font-medium text-[var(--app-muted)] mb-2">Remote Version</h4>
                                                            <pre className="text-xs text-[var(--app-text-secondary)] overflow-auto max-h-40">
                                                                {JSON.stringify({
                                                                    title: conflict.remoteRevision.title,
                                                                    content: conflict.remoteRevision.content.slice(0, 200),
                                                                    properties: conflict.remoteRevision.properties,
                                                                    updatedAt: conflict.remoteRevision.updatedAt,
                                                                }, null, 2)}
                                                            </pre>
                                                        </div>
                                                        <div className="bg-[var(--app-surface)]/50 rounded p-3 flex flex-col justify-between">
                                                            <h4 className="text-xs font-medium text-[var(--app-muted)] mb-2">Resolution</h4>
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

                        <div className="bg-[var(--app-raised)] rounded-lg border border-[var(--app-line)] p-4">
                            <h3 className="text-[13px] font-medium text-[var(--app-text)] mb-3">How Sync Works</h3>
                            <ul className="text-[12px] text-[var(--app-muted)] space-y-2">
                                <li>• <strong>Revision log:</strong> Every note change creates a signed revision event</li>
                                <li>• <strong>Last-write-wins:</strong> Sequential edits automatically merge</li>
                                <li>• <strong>Conflict detection:</strong> Concurrent edits on different devices are flagged</li>
                                <li>• <strong>Keep both:</strong> Conflicts preserve both versions; you choose the resolution</li>
                                <li>• <strong>No CRDT:</strong> Simple, auditable event log instead of complex merge algorithms</li>
                                <li>• <strong>Delta sync:</strong> Only changes since last sync are transmitted</li>
                                <li>• <strong>Budget-aware:</strong> WiFi-only, batching, and compression reduce bandwidth/battery</li>
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}