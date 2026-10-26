import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Loader2, AlertTriangle, CheckCircle, StopCircle, RefreshCw, Search, X, Copy, Trash2, Filter, PauseCircle, PlayCircle, Wifi, WifiOff, Activity, Terminal, Download, Maximize2, Minimize2, MonitorPlay } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useJobStatus, useDashboardConnection, useLogs, type JobStatus, type ConnectionState, STATUS_CONFIG } from '../hooks/useLivePreview';
import { useToast } from '../components/Toast';
import { Button, IconButton, Kbd, Skeleton, Select } from '../components/ui';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui';
import { Badge } from '../components/ui';
import { Modal, ConfirmModal } from '../components/ui';

const DashboardSkeleton = () => (
  <div className="w-full h-full flex flex-col">
    <div className="bg-gray-800 p-4 border-b border-gray-700">
      <Skeleton className="h-4 bg-gray-700 rounded w-1/4" />
    </div>
    <div className="flex-1 bg-gray-900" />
  </div>
);

const LogsSkeleton = () => (
  <div className="flex-1 overflow-auto p-2 font-mono text-xs space-y-1">
    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 bg-gray-800 rounded" />)}
  </div>
);

const ConnectionIndicator = ({ state }: { state: ConnectionState }) => {
  const config = {
    connecting: { color: 'text-yellow-400', label: 'Connecting...', icon: <Loader2 className="animate-spin" size={12} /> },
    connected: { color: 'text-green-400', label: 'Connected', icon: <Wifi size={12} /> },
    disconnected: { color: 'text-gray-500', label: 'Disconnected', icon: <WifiOff size={12} /> },
    error: { color: 'text-red-400', label: 'Connection Error', icon: <AlertTriangle size={12} /> },
  }[state];

  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${config.color}`}>
      <span className="relative">
        {config.icon}
        {state === 'connected' && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
      </span>
      {config.label}
    </span>
  );
};

const LogEntry = ({ log, index, searchQuery, onClick, level }: {
  log: string;
  index: number;
  searchQuery: string;
  onClick: () => void;
  level: 'all' | 'info' | 'warn' | 'error' | 'debug';
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

const NoJobView = ({ onNavigate }: { onNavigate: () => void }) => (
  <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-6 p-8">
    <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-4">
      <Film size={48} className="opacity-50" />
    </div>
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white mb-2">No Active Production</h2>
      <p className="text-gray-400 mb-6 max-w-md">Ready to start a new simulation movie?</p>
      <Button onClick={onNavigate} icon={<Play size={20} />} size="lg">
        Go to Studio
      </Button>
    </div>
  </div>
);

const JobStatusView = ({ job, connectionState, onCancel, onRetry, iframeRef, handleIframeLoad, handleIframeError, cancelling, iframeError }: {
  job: JobStatus;
  connectionState: ConnectionState;
  onCancel: () => void;
  onRetry: () => void;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  handleIframeLoad: () => void;
  handleIframeError: () => void;
  cancelling: boolean;
  iframeError: boolean;
}) => {
  const isRunning = job.status === 'running';
  const config = STATUS_CONFIG[job.status];

  const renderDashboard = () => {
    if (isRunning && job.dashboardPort) {
      return (
        <>
          <iframe
            ref={iframeRef}
            src={`http://${window.location.hostname}:${job.dashboardPort}`}
            className="w-full h-full border-none"
            title="Live Dashboard"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
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
                <Button onClick={onRetry} icon={<RefreshCw size={16} />}>
                  Retry Connection
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigator.clipboard.writeText(`http://${window.location.hostname}:${job.dashboardPort}`)}
                  icon={<Copy size={16} />}
                >
                  Copy URL
                </Button>
              </div>
            </div>
          )}
        </>
      );
    }

    if (job.status === 'completed') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
          <CheckCircle size={64} className="text-green-500 mb-4 animate-scale-in-bounce" />
          <h3 className="text-xl font-semibold text-white mb-2">Production Complete</h3>
          <p className="text-gray-400 text-center">The simulation has finished successfully.</p>
        </div>
      );
    }

    if (job.status === 'failed') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
          <AlertTriangle size={64} className="text-red-500 mb-4 animate-shake" />
          <h3 className="text-xl font-semibold text-white mb-2">Production Failed</h3>
          <p className="text-gray-400 text-center">The simulation encountered an error.</p>
        </div>
      );
    }

    if (job.status === 'cancelled') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
          <PauseCircle size={64} className="text-yellow-500 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Production Cancelled</h3>
          <p className="text-gray-400 text-center">The simulation was stopped by the user.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <Loader2 size={64} className="animate-spin mb-4 text-indigo-500" />
        <h3 className="text-xl font-semibold text-white mb-2">Starting Dashboard...</h3>
        <p className="text-gray-400 text-center">Please wait while the live dashboard initializes.</p>
      </div>
    );
  };

  return (
    <Card variant="elevated" className="flex-1 bg-black/50 rounded-xl border border-gray-700/50 overflow-hidden relative backdrop-blur-sm flex flex-col">
      <CardHeader className="p-3 bg-gray-900/50 border-b border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MonitorPlay size={16} className="text-gray-400" />
          Live Dashboard
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            size="sm"
            onClick={() => iframeRef.current?.contentWindow?.postMessage({ type: 'toggle-fullscreen' }, '*')}
            aria-label="Toggle fullscreen"
          >
            <Maximize2 size={16} />
          </IconButton>
          {iframeError && (
            <Button size="sm" variant="danger" onClick={onRetry} icon={<RefreshCw size={12} />}>
              Retry
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 relative p-0">
        {renderDashboard()}
      </CardContent>
    </Card>
  );
};

const LogsPanel = ({
  filteredLogs,
  job,
  logFilter,
  setLogFilter,
  logSearch,
  setLogSearch,
  paused,
  setPaused,
  showLogPanel,
  setShowLogPanel,
  logPanelWidth,
  setLogPanelWidth,
  isResizingLogs,
  handleResizeStart,
  handleResizeMove,
  handleResizeEnd,
  handleKeyDown,
  copyLogs,
  downloadLogs,
  clearLogs,
  logsEndRef,
}: {
  filteredLogs: string[];
  job: JobStatus | null;
  logFilter: 'all' | 'info' | 'warn' | 'error' | 'debug';
  setLogFilter: React.Dispatch<React.SetStateAction<'all' | 'info' | 'warn' | 'error' | 'debug'>>;
  logSearch: string;
  setLogSearch: React.Dispatch<React.SetStateAction<string>>;
  paused: boolean;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
  showLogPanel: boolean;
  setShowLogPanel: React.Dispatch<React.SetStateAction<boolean>>;
  logPanelWidth: number;
  setLogPanelWidth: React.Dispatch<React.SetStateAction<number>>;
  isResizingLogs: boolean;
  handleResizeStart: (e: React.MouseEvent) => void;
  handleResizeMove: (e: MouseEvent) => void;
  handleResizeEnd: () => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  copyLogs: () => void;
  downloadLogs: () => void;
  clearLogs: () => void;
  logsEndRef: React.RefObject<HTMLDivElement>;
}) => (
  <div className="relative" onKeyDown={handleKeyDown}>
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

    <Card
      variant="elevated"
      className="min-w-[200px] max-w-[600px] flex flex-col"
      style={{ width: `${logPanelWidth}px`, flexShrink: 0 }}
    >
      <CardHeader className="p-3 bg-gray-800/50 border-b border-gray-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-mono font-bold text-gray-400 flex items-center gap-1.5">
            <Terminal size={14} />
            SYSTEM LOGS
          </span>
          <Badge variant="default" size="sm">{filteredLogs.length} / {job?.logs.length ?? 0}</Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input
              id="log-search"
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Filter logs..."
              className="bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-8 py-1.5 text-white text-xs w-48 sm:w-64 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
              aria-label="Filter logs"
            />
            {logSearch && (
              <button
                onClick={() => setLogSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <Select
            value={logFilter}
            onChange={(e) => setLogFilter(e.target.value as 'all' | 'info' | 'warn' | 'error' | 'debug')}
            options={[
              { value: 'all', label: 'All' },
              { value: 'error', label: 'Errors' },
              { value: 'warn', label: 'Warnings' },
              { value: 'info', label: 'Info' },
              { value: 'debug', label: 'Debug' },
            ]}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
            aria-label="Filter by log level"
          />

          <div className="flex items-center gap-1">
            <IconButton size="sm" onClick={copyLogs} aria-label="Copy filtered logs">
              <Copy size={14} />
            </IconButton>
            <IconButton size="sm" onClick={downloadLogs} aria-label="Download all logs">
              <Download size={14} />
            </IconButton>
            <IconButton size="sm" onClick={clearLogs} aria-label="Clear logs">
              <Trash2 size={14} />
            </IconButton>
            <Button
              variant={paused ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPaused(!paused)}
              aria-label={paused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
              aria-pressed={paused}
              icon={paused ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-2 font-mono text-xs space-y-0.5 custom-scrollbar">
        {filteredLogs.length === 0 ? (
          <div className="text-gray-500 text-center py-8 flex flex-col items-center gap-2">
            <Filter size={32} className="opacity-50" />
            <span>{logSearch || logFilter !== 'all' ? 'No matching logs' : 'No logs yet'}</span>
            {logSearch && <button onClick={() => setLogSearch('')} className="text-xs text-indigo-400 hover:underline">Clear search</button>}
            {logFilter !== 'all' && <button onClick={() => setLogFilter('all')} className="text-xs text-indigo-400 hover:underline">Show all levels</button>}
          </div>
        ) : (
          filteredLogs.map((log, originalIndex) => (
            <LogEntry
              key={originalIndex}
              log={log}
              index={originalIndex}
              searchQuery={logSearch}
              level={logFilter}
              onClick={() => navigator.clipboard.writeText(`[${originalIndex}] ${log}`).then(() => {})}
            />
          ))
        )}
        <div ref={logsEndRef} />
      </CardContent>
    </Card>
  </div>
);

export const LivePreview = () => {
  const { job, loading, connectionState, setConnectionState, cancelJob, checkStatus } = useJobStatus();
  const { iframeRef, retryConnection, handleIframeLoad, handleIframeError } = useDashboardConnection(job, connectionState, setConnectionState);
  const {
    logFilter,
    setLogFilter,
    logSearch,
    setLogSearch,
    paused,
    setPaused,
    showLogPanel,
    setShowLogPanel,
    logPanelWidth,
    setLogPanelWidth,
    isResizingLogs,
    filteredLogs,
    logsEndRef,
    copyLogs,
    downloadLogs,
    clearLogs,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
    handleKeyDown,
  } = useLogs(job);
  const [cancelling, setCancelling] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleCancel = useCallback(async () => {
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
  }, [addToast, checkStatus]);

  const handleRetry = useCallback(() => {
    setIframeError(false);
    retryConnection();
  }, [retryConnection]);

  const wrappedIframeLoad = useCallback(() => {
    handleIframeLoad();
    setIframeError(false);
  }, [handleIframeLoad]);

  const wrappedIframeError = useCallback(() => {
    handleIframeError();
    setIframeError(true);
  }, [handleIframeError]);

  if (loading) {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-gray-500 animate-pulse" />
            <Skeleton className="h-6 bg-gray-700 rounded w-32" />
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
    return <NoJobView onNavigate={() => navigate('/')} />;
  }

  const isRunning = job.status === 'running';
  const config = STATUS_CONFIG[job.status];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header Bar */}
      <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg">{job.scenario}</span>
            <Badge variant={job.status === 'running' ? 'primary' : job.status === 'completed' ? 'success' : job.status === 'failed' ? 'error' : 'warning'} size="sm">
              {config.label}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <ConnectionIndicator state={connectionState} />

          {isRunning && (
            <Button
              variant="danger"
              onClick={handleCancel}
              disabled={cancelling}
              loading={cancelling}
              icon={<StopCircle size={16} />}
            >
              Stop Recording
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        <JobStatusView
          job={job}
          connectionState={connectionState}
          onCancel={handleCancel}
          onRetry={handleRetry}
          iframeRef={iframeRef}
          handleIframeLoad={wrappedIframeLoad}
          handleIframeError={wrappedIframeError}
          cancelling={cancelling}
          iframeError={iframeError}
        />

        {showLogPanel && (
          <LogsPanel
            filteredLogs={filteredLogs}
            job={job}
            logFilter={logFilter}
            setLogFilter={setLogFilter}
            logSearch={logSearch}
            setLogSearch={setLogSearch}
            paused={paused}
            setPaused={setPaused}
            showLogPanel={showLogPanel}
            setShowLogPanel={setShowLogPanel}
            logPanelWidth={logPanelWidth}
            setLogPanelWidth={setLogPanelWidth}
            isResizingLogs={isResizingLogs}
            handleResizeStart={handleResizeStart}
            handleResizeMove={handleResizeMove}
            handleResizeEnd={handleResizeEnd}
            handleKeyDown={handleKeyDown}
            copyLogs={copyLogs}
            downloadLogs={downloadLogs}
            clearLogs={clearLogs}
            logsEndRef={logsEndRef}
          />
        )}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="fixed bottom-4 right-4 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-3 text-xs text-gray-500 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-2"><Kbd>Esc</Kbd><span>Toggle logs</span></div>
        <div className="flex items-center gap-2"><Kbd>Ctrl+L</Kbd><span>Focus search</span></div>
        <div className="flex items-center gap-2"><Kbd>Ctrl+Space</Kbd><span>Pause scroll</span></div>
      </div>
    </div>
  );
};

export default LivePreview;