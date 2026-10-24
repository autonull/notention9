import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, AlertTriangle, CheckCircle, StopCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';

interface JobStatus {
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    scenario: string;
    logs: string[];
    dashboardPort: number;
}

const DashboardSkeleton = () => (
    <div className="w-full h-full flex flex-col">
        <div className="bg-gray-800 p-4 border-b border-gray-700">
            <div className="animate-pulse h-4 bg-gray-700 rounded w-1/4" />
        </div>
        <div className="flex-1 bg-gray-900 animate-pulse" />
    </div>
);

const LogsSkeleton = () => (
    <div className="flex-1 overflow-auto p-2 font-mono text-xs space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-800 rounded animate-pulse" />
        ))}
    </div>
);

const LivePreview = () => {
    const [job, setJob] = useState<JobStatus | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [loading, setLoading] = useState(true);
    const [iframeError, setIframeError] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const navigate = useNavigate();
    const { addToast } = useToast();

    const checkStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            setJob(data.job);
            if (loading) setLoading(false);
        } catch (e) {
            console.error(e);
            if (loading) setLoading(false);
        }
    }, [loading]);

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 1000);
        return () => clearInterval(interval);
    }, [checkStatus]);

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

    const retryConnection = () => {
        setIframeError(false);
        if (iframeRef.current) {
            iframeRef.current.src = iframeRef.current.src;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full gap-4">
                <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-gray-500 animate-pulse" />
                        <div className="animate-pulse h-6 bg-gray-700 rounded w-32" />
                    </div>
                </div>
                <div className="flex flex-1 gap-4 overflow-hidden">
                    <DashboardSkeleton />
                    <div className="w-80 bg-gray-900 rounded-xl border border-gray-700 flex flex-col">
                        <div className="p-2 bg-gray-800 border-b border-gray-700 text-xs font-mono font-bold text-gray-400">
                            SYSTEM LOGS
                        </div>
                        <LogsSkeleton />
                    </div>
                </div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                <div className="text-2xl font-bold">No Active Production</div>
                <div className="text-gray-400">Ready to start a new simulation movie?</div>
                <button
                    onClick={() => navigate('/')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105"
                >
                    Go to Studio
                </button>
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
                        <>
                            <iframe
                                ref={iframeRef}
                                src={`http://${window.location.hostname}:${job.dashboardPort}`}
                                className="w-full h-full border-none"
                                title="Live Dashboard"
                                onLoad={() => setIframeError(false)}
                                onError={() => setIframeError(true)}
                            />
                            {iframeError && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 p-4">
                                    <AlertTriangle size={48} className="text-red-500 mb-4" />
                                    <div className="text-center text-gray-300 mb-4">Failed to load dashboard</div>
                                    <button
                                        onClick={retryConnection}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded flex items-center gap-2"
                                    >
                                        <RefreshCw size={16} />
                                        Retry Connection
                                    </button>
                                </div>
                            )}
                        </>
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
                    <div className="p-2 bg-gray-800 border-b border-gray-700 text-xs font-mono font-bold text-gray-400 flex justify-between items-center">
                        <span>SYSTEM LOGS</span>
                        <button
                            onClick={() => {
                                const allLogs = job.logs.map((log, i) => `[${i}] ${log}`).join('\n');
                                navigator.clipboard.writeText(allLogs);
                                addToast('Logs copied to clipboard', 'success');
                            }}
                            className="text-gray-500 hover:text-white text-xs px-2 py-1 rounded transition-colors"
                            title="Copy all logs"
                        >
                            Copy Logs
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto p-2 font-mono text-xs space-y-1 custom-scrollbar">
                        {job.logs.map((log, i) => (
                            <div key={i} className="text-gray-300 break-words group">
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
