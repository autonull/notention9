import React, {useState, useEffect} from 'react';
import {Button} from '../ui/Button';
import {useMetrics, Metrics, hasConsent, setConsent} from '../../hooks/useMetrics';
import {ArrowUpTrayIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon, InformationCircleIcon} from '../ui/icons';
import {getFrictionSignals, type FrictionSignal} from '@notention/core/telemetry/journal';

export function MetricsTab() {
    const {consent, toggleConsent, getQueue, clearQueue} = useMetrics();
    const [queue, setQueue] = useState<ReturnType<typeof getQueue>>([]);
    const [showRaw, setShowRaw] = useState(false);
    const [frictionSignals, setFrictionSignals] = useState<FrictionSignal[]>([]);
    const [loadingDigest, setLoadingDigest] = useState(false);

    useEffect(() => {
        const loaded = getQueue();
        setQueue(loaded);
    }, [getQueue]);

    useEffect(() => {
        if (!consent) {
            setFrictionSignals([]);
            return;
        }
        let mounted = true;
        setLoadingDigest(true);
        Promise.resolve(getFrictionSignals()).then(signals => {
            if (mounted) {
                setFrictionSignals(signals);
                setLoadingDigest(false);
            }
        }).catch(() => {
            if (mounted) setLoadingDigest(false);
        });
        return () => { mounted = false; };
    }, [consent]);

    const handleConsentChange = (enabled: boolean) => {
        toggleConsent(enabled);
        if (enabled) {
            const loaded = getQueue();
            setQueue(loaded);
        } else {
            setQueue([]);
            setFrictionSignals([]);
        }
    };

    const handleExport = () => {
        const data = JSON.stringify(queue, null, 2);
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notention-metrics-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClear = () => {
        clearQueue();
        setQueue([]);
    };

    const eventCounts = queue.reduce((acc, e) => {
        acc[e.name] = (acc[e.name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const totalEvents = queue.length;

    const getEvidenceIcon = (evidenceClass: FrictionSignal['evidenceClass']) => {
        switch (evidenceClass) {
            case 'measured': return <ExclamationTriangleIcon className="w-4 h-4 text-red-400" title="Measured — direct user action, sufficient count" />;
            case 'observed': return <ClockIcon className="w-4 h-4 text-yellow-400" title="Observed — indirect signal" />;
            case 'hypothesized': return <InformationCircleIcon className="w-4 h-4 text-green-400" title="Hypothesized — start without completion" />;
            default: return <CheckCircleIcon className="w-4 h-4 text-[var(--app-muted)]" title="Asserted" />;
        }
    };

    const groupByWorkflow = (signals: FrictionSignal[]) => {
        const map = new Map<string, FrictionSignal[]>();
        for (const s of signals) {
            const arr = map.get(s.workflow) ?? [];
            arr.push(s);
            map.set(s.workflow, arr);
        }
        return map;
    };

    const workflowGroups = groupByWorkflow(frictionSignals);

    return (
        <div className="bg-[var(--app-surface)] p-6 rounded-lg animate-fade-in space-y-8">
            <div className="flex items-center gap-4">
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--app-text)]">Metrics & Analytics</h2>
                <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                        consent ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                    }`}
                >
                    {consent ? 'Enabled' : 'Disabled'}
                </span>
            </div>

            <div className="border border-[var(--app-line)] rounded-lg p-4 space-y-4">
                <p className="text-sm text-[var(--app-muted)]">
                    Opt-in metrics help improve Notention by tracking anonymous usage patterns.
                    No personal data is collected. Data stays in your browser unless you export it.
                </p>

                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => handleConsentChange(e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--app-line-strong)] text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-[var(--app-text)]">Enable anonymous metrics collection</span>
                </label>

                {consent && (
                    <div className="pt-4 border-t border-[var(--app-line)] space-y-2">
                        <p className="text-sm text-[var(--app-text-secondary)]">
                            <strong>{totalEvents}</strong> events in current session
                        </p>
                        <div className="flex gap-2 flex-wrap">
                            <Button variant="secondary" icon={ArrowUpTrayIcon} onClick={handleExport} disabled={totalEvents === 0}>
                                Export JSON
                            </Button>
                            <Button variant="ghost" icon={TrashIcon} onClick={handleClear} disabled={totalEvents === 0}>
                                Clear
                            </Button>
                            <Button variant="ghost" icon={showRaw ? ChevronUpIcon : ChevronDownIcon} onClick={() => setShowRaw(!showRaw)}>
                                {showRaw ? 'Hide Raw' : 'Show Raw'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {consent && totalEvents > 0 && (
                <div className="border border-[var(--app-line)] rounded-lg p-4">
                    <h3 className="text-lg font-medium text-[var(--app-text)] mb-3">Event Summary</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                        {Object.entries(eventCounts)
                            .sort(([, a], [, b]) => b - a)
                            .map(([name, count]) => (
                                <div key={name} className="flex justify-between text-[var(--app-text-secondary)]">
                                    <span className="font-mono text-xs">{name}</span>
                                    <span className="font-semibold">{count}</span>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {consent && (
                <div className="border border-[var(--app-line)] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium text-[var(--app-text)]">Friction Digest</h3>
                        {loadingDigest && <span className="text-xs text-[var(--app-muted)] animate-pulse">Loading…</span>}
                    </div>
                    {loadingDigest ? (
                        <p className="text-sm text-[var(--app-muted)]">Analyzing friction journal…</p>
                    ) : frictionSignals.length === 0 ? (
                        <p className="text-sm text-[var(--app-muted)]">No friction events recorded yet. Use the app to generate signals.</p>
                    ) : (
                        <div className="space-y-4">
                            {Array.from(workflowGroups.entries()).map(([workflow, signals]) => (
                                <div key={workflow} className="space-y-2">
 <h4 className="text-sm font-medium text-[var(--app-text-secondary)] tracking-wider">{workflow}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {signals.slice(0, 5).map((signal, idx) => (
                                            <div key={`${signal.workflow}-${signal.seam}-${signal.kind}-${idx}`} className="bg-[var(--app-raised)] rounded-lg p-3 border border-[var(--app-line)]">
                                                <div className="flex items-start gap-2">
                                                    {getEvidenceIcon(signal.evidenceClass)}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <span className="font-mono text-xs text-[var(--app-muted)] bg-neutral-700 px-1.5 py-0.5 rounded">{signal.kind}</span>
                                                            <span className="text-xs text-[var(--app-muted)]">({signal.seam})</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--app-muted)]">
                                                            <span><strong>{signal.count}×</strong></span>
                                                            <span>{signal.ageDays}d ago</span>
                                                            <span>weight: <strong className="text-[var(--app-text-secondary)]">{signal.weight.toFixed(2)}</strong></span>
                                                            {signal.durationBucket && (
                                                                <span className="font-mono text-xs bg-neutral-700 px-1.5 py-0.5 rounded">{signal.durationBucket}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {consent && showRaw && queue.length > 0 && (
                <div className="border border-[var(--app-line)] rounded-lg p-4 max-h-96 overflow-auto">
                    <h3 className="text-lg font-medium text-[var(--app-text)] mb-3">Raw Events (newest first)</h3>
                    <pre className="text-xs text-[var(--app-text-secondary)] font-mono whitespace-pre-wrap break-all">
                        {JSON.stringify([...queue].reverse(), null, 2)}
                    </pre>
                </div>
            )}

            {!consent && (
                <div className="border border-[var(--app-line)] rounded-lg p-4 bg-[var(--app-raised)]">
                    <p className="text-sm text-[var(--app-muted)]">
                        Metrics are disabled. Enable above to start collecting:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-[var(--app-muted)]">
                        <li>Time to first match</li>
                        <li>Match acceptance/rejection rate</li>
                        <li>Export/import success rate</li>
                        <li>Capability grant/revoke rate</li>
                        <li>Pattern suggestion acceptance</li>
                        <li>Template usage → match success</li>
                    </ul>
                </div>
            )}
        </div>
    );
}