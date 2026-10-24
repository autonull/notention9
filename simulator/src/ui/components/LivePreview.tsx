import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Loader2, AlertTriangle, CheckCircle, StopCircle, RefreshCw, Search, X, Copy, Trash2, Filter, PauseCircle, PlayCircle, Wifi, WifiOff, Activity, Terminal, Download, Maximize2, Minimize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';

interface JobStatus {
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    scenario: string;
    logs: string[];
    dashboardPort: number;
}

type LogLevel = 'all' | 'info' | 'warn' | 'error' | 'debug';
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

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

const ConnectionIndicator = ({ state, className = '' }: { state: ConnectionState; className?: string }) => {
    const config = {
        connecting: { color: 'text-yellow-400', label: 'Connecting...', icon: <Loader2 className="animate-spin" size={12} /> },
        connected: { color: 'text-green-400', label: 'Connected', icon: <Wifi size={12} /> },
        disconnected: { color: 'text-gray-500', label: 'Disconnected', icon: <WifiOff size={12} /> },
        error: { color: 'text-red-400', label: 'Connection Error', icon: <AlertTriangle size={12} /> },
    }[state];

    return (
        <span className={`flex items-center gap-1.5 text-xs font-medium ${config.color} ${className}`}>
            <span className="relative">
                {config.icon}
                {state === 'connected' && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
            </span>
            {config.label}
        </span>
    );
};

const LogEntry = ({ log, index, level, searchQuery, onClick }: { 
    log: string; 
    index: number; 
    level: LogLevel;
    searchQuery: string;
    onClick: () => void;
}) => {
    const lowerLog = log.toLowerCase();
    const detectedLevel = 
        lowerLog.includes('error') || lowerLog.includes('fail') ? 'error' :
        lowerLog.includes('warn') ? 'warn' :
        lowerLog.includes('debug') ? 'debug' : 'info';

    const levelColors = {
        error: 'text-red-400',
        warn: 'text-yellow-400',
        debug: 'text-blue-400',
        info: 'text-gray-300',
    };

    const matchesSearch = !searchQuery || lowerLog.includes(searchQuery.toLowerCase());
    const matchesFilter = level === 'all' || detectedLevel === level;

    if (!matchesSearch || !matchesFilter) return null;

    const highlight = (text: string) => {
        if (!searchQuery) return <span>{text}</span>;
        const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
        return parts.map((part, i) => 
            part.toLowerCase() === searchQuery.toLowerCase() 
                ? <mark key={i} className="bg-yellow-500/30 text-yellow-100 px-0.5 rounded">{part}</mark>
                : <span key={i}>{part}</span>
        );
    };

    return (
        <div 
            key={index} 
            onClick={onClick}
            className={`text-gray-300 break-words group hover:bg-gray-800/50 rounded px-1 py-0.5 transition-colors cursor-pointer ${levelColors[detectedLevel]}`}
            title="Click to copy"
        >
            <span className="text-gray-600 mr-2 select-none">[{index}]</span>
            <span className="flex items-center gap-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${levelColors[detectedLevel]} bg-gray-800 font-medium`}>
                    {detectedLevel.toUpperCase()}
                </span>
                {highlight(log)}
            </span>
        </div>
    );
};

const LivePreview = () => {
    const [job, setJob] = useState<JobStatus | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [loading, setLoading] = useState(true);
    const [iframeError, setIframeError] = useState(false);
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    const [logFilter, setLogFilter] = useState<LogLevel>('all');
    const [logSearch, setLogSearch] = useState('');
    const [showLogPanel, setShowLogPanel] = useState(true);
    const [logPanelWidth, setLogPanelWidth] = useState(320);
    const [isResizingLogs, setIsResizingLogs] = useState(false);
    const [paused, setPaused] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const resizeStartRef = useRef({ x: 0, width: 320 });
    const navigate = useNavigate();
    const { addToast } = useToast();

    const checkStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            setJob(data.job);
            if (loading) setLoading(false);
            
            if (data.job?.status === 'running' && data.job?.dashboardPort) {
                setConnectionState('connecting');
            }
        } catch (e) {
            console.error(e);
            if (loading) setLoading(false);
            setConnectionState('error');
        }
    }, [loading]);

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 1000);
        return () => clearInterval(interval);
    }, [checkStatus]);

    useEffect(() => {
        if (logsEndRef.current && !paused) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [job?.logs, paused]);

    // Monitor iframe connection
    useEffect(() => {
        if (job?.dashboardPort && job?.status === 'running') {
            setConnectionState('connecting');
            
            const handleMessage = (event: MessageEvent) => {
                if (event.data?.type === 'dashboard-ready') {
                    setConnectionState('connected');
                }
            };
            
            window.addEventListener('message', handleMessage);
            
            // Timeout for connection
            const timeout = setTimeout(() => {
                if (connectionState === 'connecting') {
                    setConnectionState('error');
                }
            }, 10000);
            
            return () => {
                window.removeEventListener('message', handleMessage);
                clearTimeout(timeout);
            };
        } else if (job?.status !== 'running') {
            setConnectionState('disconnected');
        }
    }, [job?.dashboardPort, job?.status, connectionState]);

    const cancelJob = async () => {
        if (!confirm('Stop current job? This cannot be undone.')) return;
        setCancelling(true);
        try {
            await fetch('/api/jobs/cancel', { method: 'POST' });
            addToast('Job cancelled', 'info');
        } catch (e) {
            addToast('Failed to cancel job', 'error');
        } finally {
            setCancelling(false);
            checkStatus();
        }
    };

    const retryConnection = () => {
        setIframeError(false);
        setConnectionState('connecting');
        if (iframeRef.current) {
            iframeRef.current.src = iframeRef.current.src;
        }
    };

    const copyLogs = () => {
        const filteredLogs = job?.logs
            .filter(log => {
                if (logFilter !== 'all') {
                    const lower = log.toLowerCase();
                    const detected = lower.includes('error') || lower.includes('fail') ? 'error' :
                                   lower.includes('warn') ? 'warn' :
                                   lower.includes('debug') ? 'debug' : 'info';
                    return detected === logFilter;
                }
                return true;
            })
            .filter(log => !logSearch || log.toLowerCase().includes(logSearch.toLowerCase()))
            .map((log, i) => `[${i}] ${log}`)
            .join('\n') || 'No logs';
        
        navigator.clipboard.writeText(filteredLogs);
        addToast(`Copied ${filteredLogs.split('\n').length} log lines`, 'success');
    };

    const clearLogs = () => {
        // This would need backend support, but we can visually clear
        addToast('Log clearing requires backend support', 'info');
    };

    const downloadLogs = () => {
        const allLogs = job?.logs.map((log, i) => `[${i}] ${log}`).join('\n') || 'No logs';
        const blob = new Blob([allLogs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${job?.scenario || 'simulation'}-logs-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Logs downloaded', 'success');
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingLogs(true);
        resizeStartRef.current = { x: e.clientX, width: logPanelWidth };
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    const handleResizeMove = (e: MouseEvent) => {
        if (!isResizingLogs) return;
        const newWidth = Math.min(Math.max(resizeStartRef.current.width + (resizeStartRef.current.x - e.clientX), 200), 600);
        setLogPanelWidth(newWidth);
    };

    const handleResizeEnd = () => {
        setIsResizingLogs(false);
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement) return;
        
        switch (e.key) {
            case 'Escape':
                if (iframeError) {
                    setIframeError(false);
                } else {
                    setShowLogPanel(!showLogPanel);
                }
                break;
            case ' ':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    setPaused(!paused);
                }
                break;
            case 'l':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    setLogSearch('');
                    const input = document.getElementById('log-search');
                    input?.focus();
                }
                break;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full gap-4" onKeyDown={handleKeyDown}>
                <div className="flex justify-between items-center bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-gray-500 animate-pulse" />
                        <div className="animate-pulse h-6 bg-gray-700 rounded w-32" />
                    </div>
                    <ConnectionIndicator state="connecting" />
                </div>
                <div className="flex flex-1 gap-4 overflow-hidden">
                    <DashboardSkeleton />
                    <div className="w-80 bg-gray-900/50 rounded-xl border border-gray-700/50 flex flex-col backdrop-blur-sm">
                        <div className="p-2 bg-gray-800/50 border-b border-gray-700/50 text-xs font-mono font-bold text-gray-400 flex justify-between">
                            <span>SYSTEM LOGS</span>
                            <ConnectionIndicator state="connecting" />
                        </div>
                        <LogsSkeleton />
                    </div>
                </div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-6 p-8" onKeyDown={handleKeyDown}>
                <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                    <Film size={48} className="opacity-50" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">No Active Production</h2>
                    <p className="text-gray-400 mb-6 max-w-md">Ready to start a new simulation movie?</p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 active:scale-95 touch-target-48"
                    >
                        Go to Studio
                    </button>
                </div>
            </div>
        );
    }

    const isRunning = job.status === 'running';
    const statusConfig = {
        running: { icon: <Activity className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-900/30', label: 'Recording' },
        completed: { icon: <CheckCircle className="w-5 h-5" />, color: 'text-green-400', bg: 'bg-green-900/30', label: 'Completed' },
        failed: { icon: <AlertTriangle className="w-5 h-5" />, color: 'text-red-400', bg: 'bg-red-900/30', label: 'Failed' },
        cancelled: { icon: <PauseCircle className="w-5 h-5" />, color: 'text-yellow-400', bg: 'bg-yellow-900/30', label: 'Cancelled' },
    }[job.status];

    const filteredLogs = useMemo(() => 
        job.logs
            .filter(log => {
                if (logFilter !== 'all') {
                    const lower = log.toLowerCase();
                    const detected = lower.includes('error') || lower.includes('fail') ? 'error' :
                                   lower.includes('warn') ? 'warn' :
                                   lower.includes('debug') ? 'debug' : 'info';
                    return detected === logFilter;
                }
                return true;
            })
            .filter(log => !logSearch || log.toLowerCase().includes(logSearch.toLowerCase())),
        [job.logs, logFilter, logSearch]
    );

    return (
        <div className="flex flex-col h-full gap-4" onKeyDown={handleKeyDown}>
            {/* Header Bar */}
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">{job.scenario}</span>
                        <span className={`px-3 py-1 rounded-full text-xs uppercase font-bold ${statusConfig.bg} ${statusConfig.color} flex items-center gap-1.5`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                    <ConnectionIndicator state={connectionState} />
                    
                    {isRunning && (
                        <button
                            onClick={cancelJob}
                            disabled={cancelling}
                            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors touch-target-48"
                            aria-busy={cancelling}
                        >
                            {cancelling ? <Loader2 className="animate-spin" size={16} /> : <StopCircle size={16} />}
                            Stop Recording
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 gap-4 overflow-hidden">
                {/* Live Dashboard View */}
                <div className="flex-1 bg-black/50 rounded-xl border border-gray-700/50 overflow-hidden relative backdrop-blur-sm flex flex-col">
                    <div className="bg-gray-900/50 p-3 border-b border-gray-700/50 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <MonitorPlay size={16} className="text-gray-400" />
                            Live Dashboard
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => iframeRef.current?.contentWindow?.postMessage({ type: 'toggle-fullscreen' }, '*')}
                                className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors touch-target"
                                title="Toggle fullscreen"
                                aria-label="Toggle fullscreen"
                            >
                                <Maximize2 size={16} />
                            </button>
                            {iframeError && (
                                <button
                                    onClick={retryConnection}
                                    className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center gap-1.5 transition-colors touch-target-48"
                                >
                                    <RefreshCw size={12} />
                                    Retry
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 relative">
                        {isRunning && job.dashboardPort ? (
                            <>
                                <iframe
                                    ref={iframeRef}
                                    src={`http://${window.location.hostname}:${job.dashboardPort}`}
                                    className="w-full h-full border-none"
                                    title="Live Dashboard"
                                    onLoad={() => {
                                        setIframeError(false);
                                        setConnectionState('connected');
                                    }}
                                    onError={() => {
                                        setIframeError(true);
                                        setConnectionState('error');
                                    }}
                                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                                />
                                {iframeError && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-10 p-6 animate-fade-in">
                                        <AlertTriangle size={64} className="text-red-500 mb-4" />
                                        <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Dashboard</h3>
                                        <p className="text-gray-400 text-center mb-6 max-w-md">
                                            The dashboard at port {job.dashboardPort} could not be reached. This may be due to network restrictions or the dashboard not being ready yet.
                                        </p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={retryConnection}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors touch-target-48"
                                            >
                                                <RefreshCw size={16} />
                                                Retry Connection
                                            </button>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(`http://${window.location.hostname}:${job.dashboardPort}`)}
                                                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors touch-target-48"
                                            >
                                                <Copy size={16} />
                                                Copy URL
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                                {job.status === 'completed' && (
                                    <>
                                        <CheckCircle size={64} className="text-green-500 mb-4 animate-scale-in-bounce" />
                                        <h3 className="text-xl font-semibold text-white mb-2">Production Complete</h3>
                                        <p className="text-gray-400 text-center">The simulation has finished successfully.</p>
                                    </>
                                )}
                                {job.status === 'failed' && (
                                    <>
                                        <AlertTriangle size={64} className="text-red-500 mb-4 animate-shake" />
                                        <h3 className="text-xl font-semibold text-white mb-2">Production Failed</h3>
                                        <p className="text-gray-400 text-center">The simulation encountered an error.</p>
                                    </>
                                )}
                                {job.status === 'cancelled' && (
                                    <>
                                        <PauseCircle size={64} className="text-yellow-500 mb-4" />
                                        <h3 className="text-xl font-semibold text-white mb-2">Production Cancelled</h3>
                                        <p className="text-gray-400 text-center">The simulation was stopped by the user.</p>
                                    </>
                                )}
                                {job.status === 'running' && !job.dashboardPort && (
                                    <>
                                        <Loader2 size={64} className="animate-spin mb-4 text-indigo-500" />
                                        <h3 className="text-xl font-semibold text-white mb-2">Starting Dashboard...</h3>
                                        <p className="text-gray-400 text-center">Please wait while the live dashboard initializes.</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Logs Panel - Resizable */}
                <div className="relative">
                    {/* Resize Handle */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-indigo-500/30 transition-colors -ml-0.5"
                        onMouseDown={handleResizeStart}
                        aria-label="Resize logs panel"
                        role="separator"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                                e.preventDefault();
                                const newWidth = Math.min(Math.max(logPanelWidth + (e.key === 'ArrowLeft' ? -20 : 20), 200), 600);
                                setLogPanelWidth(newWidth);
                            }
                        }}
                    />

                    <div 
                        className="w-full bg-gray-900/50 rounded-xl border border-gray-700/50 flex flex-col backdrop-blur-sm shadow-xl min-w-[200px] max-w-[600px]"
                        style={{ width: `${logPanelWidth}px`, flexShrink: 0 }}
                    >
                        {/* Logs Header */}
                        <div className="p-3 bg-gray-800/50 border-b border-gray-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-xs font-mono font-bold text-gray-400 flex items-center gap-1.5">
                                    <Terminal size={14} />
                                    SYSTEM LOGS
                                </span>
                                <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-700 text-gray-300 rounded uppercase tracking-wider">
                                    {filteredLogs.length} / {job.logs.length}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                                    <input
                                        id="log-search"
                                        type="text"
                                        value={logSearch}
                                        onChange={e => setLogSearch(e.target.value)}
                                        placeholder="Filter logs..."
                                        className="bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-8 py-1.5 text-white text-xs w-48 sm:w-64 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                                        aria-label="Filter logs"
                                    />
                                    {logSearch && (
                                        <button
                                            onClick={() => setLogSearch('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white touch-target"
                                            aria-label="Clear search"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>

                                {/* Level Filter */}
                                <select
                                    value={logFilter}
                                    onChange={e => setLogFilter(e.target.value as LogLevel)}
                                    className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-colors touch-target-48"
                                    aria-label="Filter by log level"
                                >
                                    <option value="all">All</option>
                                    <option value="error">Errors</option>
                                    <option value="warn">Warnings</option>
                                    <option value="info">Info</option>
                                    <option value="debug">Debug</option>
                                </select>

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={copyLogs}
                                        className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors touch-target"
                                        title="Copy filtered logs"
                                        aria-label="Copy filtered logs"
                                    >
                                        <Copy size={14} />
                                    </button>
                                    <button
                                        onClick={downloadLogs}
                                        className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors touch-target"
                                        title="Download all logs"
                                        aria-label="Download all logs"
                                    >
                                        <Download size={14} />
                                    </button>
                                    <button
                                        onClick={clearLogs}
                                        className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors touch-target"
                                        title="Clear logs"
                                        aria-label="Clear logs"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => setPaused(!paused)}
                                        className={`p-1.5 rounded transition-colors touch-target ${paused ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
                                        title={paused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
                                        aria-label={paused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
                                        aria-pressed={paused}
                                    >
                                        {paused ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Logs Content */}
                        <div className="flex-1 overflow-auto p-2 font-mono text-xs space-y-0.5 custom-scrollbar">
                            {filteredLogs.length === 0 ? (
                                <div className="text-gray-500 text-center py-8 flex flex-col items-center gap-2">
                                    <Filter size={32} className="opacity-50" />
                                    <span>{logSearch || logFilter !== 'all' ? 'No matching logs' : 'No logs yet'}</span>
                                    {logSearch && <button onClick={() => setLogSearch('')} className="text-xs text-indigo-400 hover:underline">Clear search</button>}
                                    {logFilter !== 'all' && <button onClick={() => setLogFilter('all')} className="text-xs text-indigo-400 hover:underline">Show all levels</button>}
                                </div>
                            ) : (
                                filteredLogs.map((log, originalIndex) => {
                                    const lowerLog = log.toLowerCase();
                                    const detectedLevel = 
                                        lowerLog.includes('error') || lowerLog.includes('fail') ? 'error' :
                                        lowerLog.includes('warn') ? 'warn' :
                                        lowerLog.includes('debug') ? 'debug' : 'info';

                                    return (
                                        <LogEntry
                                            key={originalIndex}
                                            log={log}
                                            index={originalIndex}
                                            level={logFilter}
                                            searchQuery={logSearch}
                                            onClick={() => navigator.clipboard.writeText(`[${originalIndex}] ${log}`).then(() => addToast('Log line copied', 'success'))}
                                        />
                                    );
                                })
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Keyboard Shortcuts Hint */}
            <div className="fixed bottom-4 right-4 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-3 text-xs text-gray-500 flex flex-col gap-1 pointer-events-none">
                <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Esc</kbd><span>Toggle logs</span></div>
                <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Ctrl+L</kbd><span>Focus search</span></div>
                <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Ctrl+Space</kbd><span>Pause scroll</span></div>
            </div>
        </div>
    );
};

export default LivePreview;
