import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertTriangle, CheckCircle, StopCircle } from 'lucide-react';

interface JobStatus {
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    scenario: string;
    logs: string[];
    dashboardPort: number;
}

const LivePreview = () => {
    const [job, setJob] = useState<JobStatus | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const checkStatus = async () => {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            setJob(data.job);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [job?.logs]);

    const cancelJob = async () => {
        if (!confirm('Stop current job?')) return;
        setCancelling(true);
        await fetch('/api/jobs/cancel', { method: 'POST' });
        setCancelling(false);
        checkStatus();
    };

    if (!job) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-xl">No active job</div>
                <div className="mt-2 text-sm">Start a new movie in Studio</div>
            </div>
        );
    }

    const isRunning = job.status === 'running';

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                    <span className="font-bold text-lg">{job.scenario}</span>
                    <span className={`px-2 py-0.5 rounded text-xs uppercase font-bold ${
                        job.status === 'completed' ? 'bg-green-900 text-green-200' :
                        job.status === 'failed' ? 'bg-red-900 text-red-200' :
                        job.status === 'cancelled' ? 'bg-yellow-900 text-yellow-200' :
                        'bg-blue-900 text-blue-200'
                    }`}>
                        {job.status}
                    </span>
                </div>

                {isRunning && (
                    <button
                        onClick={cancelJob}
                        disabled={cancelling}
                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded flex items-center gap-2"
                    >
                        {cancelling ? <Loader2 className="animate-spin" size={16} /> : <StopCircle size={16} />}
                        Stop Recording
                    </button>
                )}
            </div>

            <div className="flex flex-1 gap-4 overflow-hidden">
                {/* Live Dashboard View */}
                <div className="flex-1 bg-black rounded-xl border border-gray-700 overflow-hidden relative">
                    {isRunning && job.dashboardPort ? (
                        <iframe
                            src={`http://${window.location.hostname}:${job.dashboardPort}`}
                            className="w-full h-full border-none"
                            title="Live Dashboard"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            {job.status === 'completed' ? <CheckCircle size={48} className="text-green-500 mb-4" /> :
                             job.status === 'failed' ? <AlertTriangle size={48} className="text-red-500 mb-4" /> :
                             <Loader2 size={48} className="animate-spin mb-4" />}
                            <div>{job.status === 'running' ? 'Connecting to Dashboard...' : 'Simulation Ended'}</div>
                        </div>
                    )}
                </div>

                {/* Logs Console */}
                <div className="w-80 bg-gray-900 rounded-xl border border-gray-700 flex flex-col">
                    <div className="p-2 bg-gray-800 border-b border-gray-700 text-xs font-mono font-bold text-gray-400">
                        SYSTEM LOGS
                    </div>
                    <div className="flex-1 overflow-auto p-2 font-mono text-xs space-y-1">
                        {job.logs.map((log, i) => (
                            <div key={i} className="text-gray-300 break-words">
                                <span className="text-gray-600 mr-2">[{i}]</span>
                                {log}
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LivePreview;
