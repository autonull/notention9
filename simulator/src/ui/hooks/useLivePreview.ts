import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../components/ui';

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

export const STATUS_CONFIG = {
  running: { icon: 'Activity', color: 'text-blue-400', bg: 'bg-blue-900/30', label: 'Recording' },
  completed: { icon: 'CheckCircle', color: 'text-green-400', bg: 'bg-green-900/30', label: 'Completed' },
  failed: { icon: 'AlertTriangle', color: 'text-red-400', bg: 'bg-red-900/30', label: 'Failed' },
  cancelled: { icon: 'PauseCircle', color: 'text-yellow-400', bg: 'bg-yellow-900/30', label: 'Cancelled' },
} as const;