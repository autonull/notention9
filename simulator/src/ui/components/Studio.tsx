import React, { useState, useEffect } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Studio = () => {
    const [scenarios, setScenarios] = useState<string[]>([]);
    const [selectedScenario, setSelectedScenario] = useState('gig-economy');
    const [agentCount, setAgentCount] = useState(5);
    const [duration, setDuration] = useState(30);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetch('/api/scenarios')
            .then(res => res.json())
            .then(data => {
                 setScenarios(['generate', ...data]);
            })
            .catch(err => setError("Failed to load scenarios"));
    }, []);

    const startJob = async () => {
        setLoading(true);
        setError('');
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
                navigate('/live');
            } else {
                setError(data.error || 'Failed to start job');
            }
        } catch (e) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Create New Movie</h2>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-6">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Scenario</label>
                        <select
                            value={selectedScenario}
                            onChange={e => setSelectedScenario(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            {scenarios.map(s => (
                                <option key={s} value={s}>
                                    {s === 'generate' ? '✨ Random Generation' : s}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedScenario === 'generate' && (
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Agent Count</label>
                                <input
                                    type="number"
                                    value={agentCount}
                                    onChange={e => setAgentCount(parseInt(e.target.value))}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    min={2} max={20}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Duration (seconds)</label>
                                <input
                                    type="number"
                                    value={duration}
                                    onChange={e => setDuration(parseInt(e.target.value))}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    min={10} max={300}
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t border-gray-700">
                        <button
                            onClick={startJob}
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition-all transform active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
                            Start Production
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Studio;
