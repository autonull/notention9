import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Play, Loader2, Info, AlertTriangle, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';

const Skeleton = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-800 rounded ${className}`} />
);

interface ScenarioInfo {
    id: string;
    name: string;
    description: string;
    agentCount?: number;
    duration?: number;
    tags: string[];
}

const SCENARIO_DETAILS: Record<string, ScenarioInfo> = {
    'gig-economy': {
        id: 'gig-economy',
        name: 'Gig Economy',
        description: 'Simulates a marketplace with workers and clients negotiating tasks. Demonstrates dynamic pricing, reputation systems, and market equilibrium.',
        agentCount: 10,
        duration: 60,
        tags: ['marketplace', 'negotiation', 'reputation'],
    },
    generate: {
        id: 'generate',
        name: 'Random Generation',
        description: 'Procedurally generate a unique scenario with randomized agents, behaviors, and objectives. Every run is different.',
        tags: ['procedural', 'experimental', 'unpredictable'],
    },
};

const ScenarioCard = ({ scenario, isSelected, onClick, loading }: {
    scenario: ScenarioInfo;
    isSelected: boolean;
    onClick: () => void;
    loading?: boolean;
}) => {
    if (loading) return <Skeleton className="h-24 w-full" />;

    return (
        <button
            onClick={onClick}
            className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col gap-3 ${
                isSelected
                    ? 'border-indigo-500 bg-indigo-900/30 shadow-lg shadow-indigo-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-700/50'
            }`}
            aria-pressed={isSelected}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{scenario.name}</h3>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{scenario.description}</p>
                </div>
                {isSelected && (
                    <CheckCircle className="text-indigo-400 flex-shrink-0 mt-0.5" size={20} aria-hidden="true" />
                )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-auto">
                {scenario.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 text-xs text-gray-400 bg-gray-700 rounded-full">
                        {tag}
                    </span>
                ))}
            </div>
            {scenario.agentCount && scenario.duration && (
                <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-700">
                    <span className="flex items-center gap-1">{scenario.agentCount} agents</span>
                    <span className="flex items-center gap-1">{scenario.duration}s duration</span>
                </div>
            )}
        </button>
    );
};

const ValidationMessage = ({ message, type = 'error' }: { message: string; type?: 'error' | 'warning' | 'info' }) => (
    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
        type === 'error' ? 'bg-red-900/30 text-red-300 border border-red-500/30' :
        type === 'warning' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-500/30' :
        'bg-blue-900/30 text-blue-300 border border-blue-500/30'
    }`} role="alert">
        {type === 'error' && <AlertTriangle size={16} />}
        {type === 'warning' && <Info size={16} />}
        {type === 'info' && <HelpCircle size={16} />}
        <span>{message}</span>
    </div>
);

const Studio = () => {
    const [scenarios, setScenarios] = useState<string[]>([]);
    const [selectedScenario, setSelectedScenario] = useState('gig-economy');
    const [agentCount, setAgentCount] = useState(5);
    const [duration, setDuration] = useState(30);
    const [loading, setLoading] = useState(false);
    const [scenariosLoading, setScenariosLoading] = useState(true);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const { addToast } = useToast();
    const navigate = useNavigate();

    const loadScenarios = useCallback(async () => {
        setScenariosLoading(true);
        try {
            const res = await fetch('/api/scenarios');
            const data = await res.json();
            setScenarios(['generate', ...data]);
        } catch (err) {
            addToast('Failed to load scenarios', 'error');
        } finally {
            setScenariosLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        loadScenarios();
    }, [loadScenarios]);

    const selectedScenarioInfo = useMemo(() => SCENARIO_DETAILS[selectedScenario] || { 
        id: selectedScenario, 
        name: selectedScenario, 
        description: 'Custom scenario', 
        tags: [] 
    }, [selectedScenario]);

    const validation = useMemo(() => {
        if (selectedScenario === 'generate') {
            if (agentCount < 2 || agentCount > 20) {
                return { valid: false, message: 'Agent count must be between 2 and 20', type: 'error' as const };
            }
            if (duration < 10 || duration > 300) {
                return { valid: false, message: 'Duration must be between 10 and 300 seconds', type: 'error' as const };
            }
        }
        return { valid: true, message: '', type: 'info' as const };
    }, [selectedScenario, agentCount, duration]);

    const startJob = async () => {
        if (!validation.valid) {
            addToast(validation.message, validation.type);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenarioName: selectedScenario,
                    agentCount: selectedScenario === 'generate' ? agentCount : undefined,
                    duration: selectedScenario === 'generate' ? duration : undefined
                })
            });
            const data = await res.json();
            if (data.success) {
                addToast('Production started!', 'success');
                navigate('/live');
            } else {
                addToast(data.error || 'Failed to start job', 'error');
            }
        } catch (e) {
            addToast('Network error', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            startJob();
        }
    };

    return (
        <div className="max-w-4xl mx-auto" onKeyDown={handleKeyDown}>
            <header className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight">Create New Movie</h2>
                <p className="text-gray-400 mt-1">Configure and launch a simulation production</p>
            </header>

            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 backdrop-blur-sm shadow-xl space-y-8">

                {/* Scenario Selection */}
                <section aria-labelledby="scenario-heading">
                    <div className="flex items-center justify-between mb-4">
                        <label id="scenario-heading" className="block text-sm font-medium text-gray-300">Scenario</label>
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                            aria-expanded={showAdvanced}
                        >
                            {showAdvanced ? 'Show Less' : 'Show Details'}
                            <HelpCircle size={14} />
                        </button>
                    </div>

                    {scenariosLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Skeleton className="h-24" />
                            <Skeleton className="h-24" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="radiogroup" aria-label="Select scenario">
                            {scenarios.map(s => {
                                const info = SCENARIO_DETAILS[s] || { id: s, name: s, description: 'Custom scenario', tags: [] };
                                return (
                                    <ScenarioCard
                                        key={s}
                                        scenario={info}
                                        isSelected={selectedScenario === s}
                                        onClick={() => setSelectedScenario(s)}
                                        loading={scenariosLoading}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* Scenario Details Panel */}
                    {!scenariosLoading && showAdvanced && (
                        <div className="mt-4 p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 animate-slide-in-down">
                            <h4 className="font-medium text-gray-300 mb-3 flex items-center gap-2">
                                <Info size={16} className="text-indigo-400" />
                                {selectedScenarioInfo.name} Details
                            </h4>
                            <dl className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <dt className="text-gray-500">Description</dt>
                                    <dd className="text-gray-300 mt-1">{selectedScenarioInfo.description}</dd>
                                </div>
                                {selectedScenarioInfo.agentCount && (
                                    <div>
                                        <dt className="text-gray-500">Default Agents</dt>
                                        <dd className="text-gray-300 mt-1">{selectedScenarioInfo.agentCount}</dd>
                                    </div>
                                )}
                                {selectedScenarioInfo.duration && (
                                    <div>
                                        <dt className="text-gray-500">Default Duration</dt>
                                        <dd className="text-gray-300 mt-1">{selectedScenarioInfo.duration}s</dd>
                                    </div>
                                )}
                                <div className="col-span-2">
                                    <dt className="text-gray-500">Tags</dt>
                                    <dd className="flex flex-wrap gap-1.5 mt-1">
                                        {selectedScenarioInfo.tags.map(tag => (
                                            <span key={tag} className="px-2 py-0.5 text-xs text-gray-400 bg-gray-700 rounded-full">
                                                {tag}
                                            </span>
                                        ))}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    )}
                </section>

                {/* Dynamic Parameters */}
                {selectedScenario === 'generate' && !scenariosLoading && (
                    <section aria-labelledby="params-heading" className="animate-slide-in-up">
                        <h3 id="params-heading" className="text-sm font-medium text-gray-300 mb-4">Parameters</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="agentCount" className="block text-sm font-medium text-gray-400 mb-2">
                                    Agent Count
                                </label>
                                <input
                                    id="agentCount"
                                    type="number"
                                    value={agentCount}
                                    onChange={e => setAgentCount(Math.max(2, Math.min(20, parseInt(e.target.value) || 2)))}
                                    onBlur={e => setAgentCount(Math.max(2, Math.min(20, parseInt(e.target.value) || 2)))}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                                    min={2} max={20}
                                    aria-describedby="agentCount-hint"
                                />
                                <p id="agentCount-hint" className="text-xs text-gray-500 mt-1">2–20 agents (default: 5)</p>
                            </div>
                            <div>
                                <label htmlFor="duration" className="block text-sm font-medium text-gray-400 mb-2">
                                    Duration (seconds)
                                </label>
                                <input
                                    id="duration"
                                    type="number"
                                    value={duration}
                                    onChange={e => setDuration(Math.max(10, Math.min(300, parseInt(e.target.value) || 10)))}
                                    onBlur={e => setDuration(Math.max(10, Math.min(300, parseInt(e.target.value) || 10)))}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                                    min={10} max={300}
                                    aria-describedby="duration-hint"
                                />
                                <p id="duration-hint" className="text-xs text-gray-500 mt-1">10–300 seconds (default: 30)</p>
                            </div>
                        </div>

                        {/* Validation Feedback */}
                        {!validation.valid && (
                            <ValidationMessage message={validation.message} type={validation.type} />
                        )}
                    </section>
                )}

                {/* Action Bar */}
                <div className="pt-4 border-t border-gray-700 flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={startJob}
                        disabled={loading || scenariosLoading || !validation.valid}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 touch-target-48"
                        aria-busy={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Starting...
                            </>
                        ) : (
                            <>
                                <Play fill="currentColor" size={20} />
                                Start Production
                            </>
                        )}
                        <kbd className="ml-auto text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded hidden sm:inline-flex">⌘Enter</kbd>
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/movies')}
                        className="flex-1 sm:w-auto bg-gray-700 hover:bg-gray-600 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] touch-target-48"
                    >
                        Browse Library
                    </button>
                </div>

                {/* Keyboard Hint */}
                <p className="text-xs text-gray-500 text-center hidden sm:block">
                    Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">⌘Enter</kbd> to start production
                </p>
            </div>
        </div>
    );
};

export default Studio;
