import React, {useState, useEffect} from 'react';
import {useSettings} from '../../hooks/useSettingsContext';
import {Toggle, Button, Select} from '../ui/Primitives';
import {cn} from '../../utils/ui';
import {
    InboxIcon, BellIcon, SettingsIcon,
    ArrowPathIcon, DownloadIcon, TrashIcon, ClockIcon
} from '../ui/icons';

export function MatchDigestTab() {
    const {settings, setSettings} = useSettings();
    const [digest, setDigest] = useState<string>('');
    const [jsonDigest, setJsonDigest] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [activeView, setActiveView] = useState<'text' | 'json'>('text');
    const [testEventKind, setTestEventKind] = useState<'new_match' | 'pending_action' | 'match_accepted' | 'match_dismissed' | 'action_completed'>('new_match');

    const matchDigestSettings = settings.matchDigest ?? {
        enabled: false,
        frequency: 'daily',
        quietHoursStart: 22,
        quietHoursEnd: 8,
        minMatchScore: 0.5,
        includePendingActions: true,
        includeAcceptedMatches: true,
        includeDismissedMatches: true,
        includeCompletedActions: true,
    };

    const handleSettingChange = <K extends keyof typeof matchDigestSettings>(
        key: K,
        value: (typeof matchDigestSettings)[K]
    ) => {
        setSettings(prev => ({
            ...prev,
            matchDigest: {...matchDigestSettings, [key]: value},
        }));
    };

    const generateDigest = async (asJson = false) => {
        setLoading(true);
        try {
            // Dynamically import to avoid SSR issues
            const {generateMatchDigestFromStore, generateJsonMatchDigestFromStore} = await import('@notention/core/telemetry/matchDigest');
            
            const config = {
                lookbackDays: 7,
                topSignalsPerKind: 10,
                minScoreForNewMatch: matchDigestSettings.minMatchScore,
                quietHoursStart: matchDigestSettings.quietHoursStart,
                quietHoursEnd: matchDigestSettings.quietHoursEnd,
                enabled: true,
            };
            
            if (asJson) {
                const result = await generateJsonMatchDigestFromStore(config);
                setJsonDigest(result);
                setDigest(JSON.stringify(result, null, 2));
            } else {
                const result = await generateMatchDigestFromStore(config);
                setDigest(result);
            }
        } catch (error) {
            setDigest(`Error generating digest: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const recordTestEvent = async () => {
        try {
            const {recordNewMatch, recordPendingAction, recordMatchAccepted, recordMatchDismissed, recordActionCompleted} = await import('@notention/core/telemetry/matchDigest');
            
            const testNoteId = `test-note-${Date.now()}`;
            const testMatchId = `test-match-${Date.now()}`;
            
            switch (testEventKind) {
                case 'new_match':
                    recordNewMatch(testNoteId, testMatchId, 0.75);
                    break;
                case 'pending_action':
                    recordPendingAction(testNoteId, 'skill:notify');
                    break;
                case 'match_accepted':
                    recordMatchAccepted(testNoteId, testMatchId, 0.75);
                    break;
                case 'match_dismissed':
                    recordMatchDismissed(testNoteId, testMatchId, 0.45);
                    break;
                case 'action_completed':
                    recordActionCompleted(testNoteId, 'skill:notify');
                    break;
            }
            
            // Auto-generate digest after recording
            await generateDigest();
        } catch (error) {
            setDigest(`Error recording test event: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const clearEvents = async () => {
        try {
            // Note: This would need a proper clear method in the match digest storage
            // For now, just inform the user
            setDigest('To clear events, delete the .notention/match-digest/events.jsonl file (Node) or clear IndexedDB (Browser)');
        } catch {
            setDigest('Error clearing events');
        }
    };

    return (
        <div className="bg-gray-900/70 p-6 rounded-lg animate-fade-in space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-3">
                    <InboxIcon className="h-6 w-6 text-green-400"/>
                    Match Digest & Notifications
                </h2>
                <p className="text-sm text-gray-400">
                    Opt-in daily or on-demand digest of new matches and pending actions. Respects quiet hours.
                </p>
            </div>

            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex-grow">
                        <label className="font-medium text-gray-300">Enable Match Digest</label>
                        <p className="text-sm text-gray-500 mt-1">
                            Receive digests of new matches, accepted matches, pending actions, and completed actions.
                        </p>
                    </div>
                    <Toggle
                        checked={matchDigestSettings.enabled}
                        onChange={(v) => handleSettingChange('enabled', v)}
                        ariaLabel="Enable Match Digest"
                    />
                </div>

                {matchDigestSettings.enabled && (
                    <div className="space-y-4 pt-4 border-t border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Frequency</label>
                                <Select
                                    value={matchDigestSettings.frequency}
                                    onChange={(v) => handleSettingChange('frequency', v as any)}
                                    options={[
                                        {value: 'daily', label: 'Daily (at 8 AM)'},
                                        {value: 'on-demand', label: 'On-Demand Only'},
                                        {value: 'disabled', label: 'Disabled'},
                                    ]}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Min Match Score</label>
                                <Select
                                    value={String(matchDigestSettings.minMatchScore)}
                                    onChange={(v) => handleSettingChange('minMatchScore', Number(v))}
                                    options={[
                                        {value: '0.3', label: 'Low (30%)'},
                                        {value: '0.5', label: 'Medium (50%)'},
                                        {value: '0.7', label: 'High (70%)'},
                                        {value: '0.85', label: 'Very High (85%)'},
                                    ]}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                                    <ClockIcon className="h-4 w-4" />
                                    Quiet Hours Start
                                </label>
                                <Select
                                    value={String(matchDigestSettings.quietHoursStart)}
                                    onChange={(v) => handleSettingChange('quietHoursStart', Number(v))}
                                    options={Array.from({length: 24}, (_, i) => ({
                                        value: String(i),
                                        label: `${i.toString().padStart(2, '0')}:00`,
                                    }))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                                    <ClockIcon className="h-4 w-4" />
                                    Quiet Hours End
                                </label>
                                <Select
                                    value={String(matchDigestSettings.quietHoursEnd)}
                                    onChange={(v) => handleSettingChange('quietHoursEnd', Number(v))}
                                    options={Array.from({length: 24}, (_, i) => ({
                                        value: String(i),
                                        label: `${i.toString().padStart(2, '0')}:00`,
                                    }))}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-700">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Include in Digest</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <label className="flex items-center gap-2 text-sm text-gray-300">
                                    <Toggle
                                        checked={matchDigestSettings.includePendingActions}
                                        onChange={(v) => handleSettingChange('includePendingActions', v)}
                                        ariaLabel="Include Pending Actions"
                                    />
                                    <span>⚡ Pending Actions</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-300">
                                    <Toggle
                                        checked={matchDigestSettings.includeAcceptedMatches}
                                        onChange={(v) => handleSettingChange('includeAcceptedMatches', v)}
                                        ariaLabel="Include Accepted Matches"
                                    />
                                    <span>✅ Accepted Matches</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-300">
                                    <Toggle
                                        checked={matchDigestSettings.includeDismissedMatches}
                                        onChange={(v) => handleSettingChange('includeDismissedMatches', v)}
                                        ariaLabel="Include Dismissed Matches"
                                    />
                                    <span>❌ Dismissed Matches</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-300">
                                    <Toggle
                                        checked={matchDigestSettings.includeCompletedActions}
                                        onChange={(v) => handleSettingChange('includeCompletedActions', v)}
                                        ariaLabel="Include Completed Actions"
                                    />
                                    <span>🏁 Completed Actions</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-4">
                <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Generate Digest</label>
                        <p className="text-sm text-gray-500">Create an on-demand digest of recent match activity.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => generateDigest(false)}
                            disabled={loading}
                            className="flex items-center gap-1"
                        >
                            <ArrowPathIcon className={cn('w-4 h-4', loading && 'animate-spin')} />
                            Generate
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => generateDigest(true)}
                            disabled={loading}
                            className="flex items-center gap-1"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            JSON
                        </Button>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                        <SettingsIcon className="h-4 w-4" />
                        Test Event (for development)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <Select
                            value={testEventKind}
                            onChange={(v) => setTestEventKind(v as any)}
                            options={[
                                {value: 'new_match', label: '🔍 New Match'},
                                {value: 'pending_action', label: '⚡ Pending Action'},
                                {value: 'match_accepted', label: '✅ Match Accepted'},
                                {value: 'match_dismissed', label: '❌ Match Dismissed'},
                                {value: 'action_completed', label: '🏁 Action Completed'},
                            ]}
                            className="w-auto min-w-[180px]"
                        />
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={recordTestEvent}
                            disabled={loading}
                            className="flex items-center gap-1"
                        >
                            Record & Generate
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearEvents}
                            className="flex items-center gap-1 text-red-400 hover:text-red-300"
                        >
                            <TrashIcon className="w-4 h-4" />
                            Clear All
                        </Button>
                    </div>
                </div>
            </div>

            {digest && (
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-100">Digest Output</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveView('text')}
                                className={cn(
                                    'px-2 py-1 text-xs rounded text-gray-400 hover:text-white',
                                    activeView === 'text' && 'bg-blue-900/30 text-blue-400'
                                )}
                            >
                                Text
                            </button>
                            <button
                                onClick={() => setActiveView('json')}
                                className={cn(
                                    'px-2 py-1 text-xs rounded text-gray-400 hover:text-white',
                                    activeView === 'json' && 'bg-blue-900/30 text-blue-400'
                                )}
                            >
                                JSON
                            </button>
                        </div>
                    </div>
                    <pre className="text-sm text-gray-300 bg-gray-950 p-4 rounded overflow-x-auto max-h-96 overflow-y-auto font-mono whitespace-pre-wrap">
                        {digest}
                    </pre>
                </div>
            )}
        </div>
    );
}