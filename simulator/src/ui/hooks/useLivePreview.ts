import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useToast } from '../components/ui';
import { useNavigate } from 'react-router-dom';

export interface JobStatus {
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  scenario: string;
  logs: string[];
  dashboardPort: number;
}

export type LogLevel = 'all' | 'info' | 'warn' | 'error' | 'debug';
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useJobStatus() {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
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

  const cancelJob = useCallback(async () => {
    if (!confirm('Stop current job? This cannot be undone.')) return;
    try {
      await fetch('/api/jobs/cancel', { method: 'POST' });
      addToast('Job cancelled', 'info');
    } catch (e) {
      addToast('Failed to cancel job', 'error');
    } finally {
      checkStatus();
    }
  }, [addToast, checkStatus]);

  return { job, loading, connectionState, setConnectionState, cancelJob, checkStatus };
}

export function useDashboardConnection(job: JobStatus | null, connectionState: ConnectionState, setConnectionState: React.Dispatch<React.SetStateAction<ConnectionState>>) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (job?.dashboardPort && job?.status === 'running') {
      setConnectionState('connecting');

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'dashboard-ready') {
          setConnectionState('connected');
        }
      };

      window.addEventListener('message', handleMessage);

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
  }, [job?.dashboardPort, job?.status, connectionState, setConnectionState]);

  const retryConnection = useCallback(() => {
    setConnectionState('connecting');
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }, [setConnectionState]);

  const handleIframeLoad = useCallback(() => {
    setConnectionState('connected');
  }, [setConnectionState]);

  const handleIframeError = useCallback(() => {
    setConnectionState('error');
  }, [setConnectionState]);

  return { iframeRef, retryConnection, handleIframeLoad, handleIframeError };
}

export function useLogs(job: JobStatus | null) {
  const [logFilter, setLogFilter] = useState<LogLevel>('all');
  const [logSearch, setLogSearch] = useState('');
  const [paused, setPaused] = useState(false);
  const [showLogPanel, setShowLogPanel] = useState(true);
  const [logPanelWidth, setLogPanelWidth] = useState(320);
  const [isResizingLogs, setIsResizingLogs] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef({ x: 0, width: 320 });
  const { addToast } = useToast();

  useEffect(() => {
    if (logsEndRef.current && !paused) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [job?.logs, paused]);

  const detectLogLevel = useCallback((log: string): LogLevel => {
    const lower = log.toLowerCase();
    if (lower.includes('error') || lower.includes('fail')) return 'error';
    if (lower.includes('warn')) return 'warn';
    if (lower.includes('debug')) return 'debug';
    return 'info';
  }, []);

  const filteredLogs = useMemo(() =>
    job?.logs
      .filter((log) => {
        if (logFilter !== 'all') {
          const detected = detectLogLevel(log);
          return detected === logFilter;
        }
        return true;
      })
      .filter((log) => !logSearch || log.toLowerCase().includes(logSearch.toLowerCase())),
    [job?.logs, logFilter, logSearch, detectLogLevel]
  );

  const copyLogs = useCallback(() => {
    const logs = filteredLogs.map((log, i) => `[${i}] ${log}`).join('\n') || 'No logs';
    navigator.clipboard.writeText(logs);
    addToast(`Copied ${logs.split('\n').length} log lines`, 'success');
  }, [filteredLogs, addToast]);

  const downloadLogs = useCallback(() => {
    const allLogs = job?.logs.map((log, i) => `[${i}] ${log}`).join('\n') || 'No logs';
    const blob = new Blob([allLogs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job?.scenario || 'simulation'}-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Logs downloaded', 'success');
  }, [job, addToast]);

  const clearLogs = useCallback(() => {
    addToast('Log clearing requires backend support', 'info');
  }, [addToast]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLogs(true);
    resizeStartRef.current = { x: e.clientX, width: logPanelWidth };
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [logPanelWidth]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingLogs) return;
    const newWidth = Math.min(Math.max(resizeStartRef.current.width + (resizeStartRef.current.x - e.clientX), 200), 600);
    setLogPanelWidth(newWidth);
  }, [isResizingLogs]);

  const handleResizeEnd = useCallback(() => {
    setIsResizingLogs(false);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove, handleResizeEnd]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;

    switch (e.key) {
      case 'Escape':
        setShowLogPanel(!showLogPanel);
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
  }, [showLogPanel, paused]);

  return {
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
    setIsResizingLogs,
    filteredLogs,
    logsEndRef,
    copyLogs,
    downloadLogs,
    clearLogs,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
    handleKeyDown,
    detectLogLevel,
  };
}

export const STATUS_CONFIG = {
  running: { icon: 'Activity', color: 'text-blue-400', bg: 'bg-blue-900/30', label: 'Recording' },
  completed: { icon: 'CheckCircle', color: 'text-green-400', bg: 'bg-green-900/30', label: 'Completed' },
  failed: { icon: 'AlertTriangle', color: 'text-red-400', bg: 'bg-red-900/30', label: 'Failed' },
  cancelled: { icon: 'PauseCircle', color: 'text-yellow-400', bg: 'bg-yellow-900/30', label: 'Cancelled' },
} as const;