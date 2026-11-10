import React, {useState, useEffect} from 'react';
import {Button} from '../ui/Button';
import {useMetrics, Metrics, hasConsent, setConsent} from '../../hooks/useMetrics';
import {ArrowUpTrayIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon} from '../ui/icons';

export function MetricsTab() {
    const {consent, toggleConsent, getQueue, clearQueue} = useMetrics();
    const [queue, setQueue] = useState<ReturnType<typeof getQueue>>([]);
    const [showRaw, setShowRaw] = useState(false);

    useEffect(() => {
        const loaded = getQueue();
        setQueue(loaded);
    }, [getQueue]);

    const handleConsentChange = (enabled: boolean) => {
        toggleConsent(enabled);
        if (enabled) {
            const loaded = getQueue();
            setQueue(loaded);
        } else {
            setQueue([]);
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

    return (
        <div className="bg-gray-900/70 p-6 rounded-lg animate-fade-in space-y-8">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-100">Metrics & Analytics</h2>
                <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                        consent ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                    }`}
                >
                    {consent ? 'Enabled' : 'Disabled'}
                </span>
            </div>

            <div className="border border-gray-700 rounded-lg p-4 space-y-4">
                <p className="text-sm text-gray-400">
                    Opt-in metrics help improve Notention by tracking anonymous usage patterns.
                    No personal data is collected. Data stays in your browser unless you export it.
                </p>

                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => handleConsentChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-600 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-gray-100">Enable anonymous metrics collection</span>
                </label>

                {consent && (
                    <div className="pt-4 border-t border-gray-700 space-y-2">
                        <p className="text-sm text-gray-300">
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
                <div className="border border-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-100 mb-3">Event Summary</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                        {Object.entries(eventCounts)
                            .sort(([, a], [, b]) => b - a)
                            .map(([name, count]) => (
                                <div key={name} className="flex justify-between text-gray-300">
                                    <span className="font-mono text-xs">{name}</span>
                                    <span className="font-semibold">{count}</span>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {consent && showRaw && queue.length > 0 && (
                <div className="border border-gray-700 rounded-lg p-4 max-h-96 overflow-auto">
                    <h3 className="text-lg font-medium text-gray-100 mb-3">Raw Events (newest first)</h3>
                    <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all">
                        {JSON.stringify([...queue].reverse(), null, 2)}
                    </pre>
                </div>
            )}

            {!consent && (
                <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                    <p className="text-sm text-gray-400">
                        Metrics are disabled. Enable above to start collecting:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-500">
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