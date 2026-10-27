import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StopCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useJobStatus, useDashboardConnection, type JobStatus, type ConnectionState } from '../hooks/useLivePreview';
import { useToast } from '../components/ui';
import { Button, Skeleton } from '../components/ui';
import { cn } from '../utils';
import { DesignTokens } from '../components/ui';
import { LogsPanel, LogsPanelProvider } from './LogsPanel';
import { ConnectionIndicator } from './ConnectionIndicator';
import { DashboardSkeleton, LogsSkeleton } from './LivePreviewSkeletons';
import { NoJobView } from './NoJobView';
import { JobStatusView } from './JobStatusView';
import { LivePreviewKeyboardHints } from './LivePreviewKeyboardHints';

export const LivePreviewContent = () => {
  const { job, loading, connectionState, setConnectionState, cancelJob, checkStatus } = useJobStatus();
  const { iframeRef, retryConnection, handleIframeLoad, handleIframeError } = useDashboardConnection(job, connectionState, setConnectionState);
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
        <div className={cn('p-4 rounded-xl border backdrop-blur-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4', DesignTokens.card.default, DesignTokens.shadows.card)}>
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-gray-500 animate-pulse" />
            <Skeleton className="h-6 bg-gray-700 rounded w-32" />
          </div>
          <ConnectionIndicator state="connecting" />
        </div>
        <div className="flex flex-1 gap-4 overflow-hidden">
          <DashboardSkeleton />
          <div className={cn('w-80 rounded-xl border flex flex-col backdrop-blur-sm', DesignTokens.card.default, DesignTokens.shadows.card)}>
            <div className={cn('p-2 border-b text-xs font-mono font-bold text-gray-400 flex justify-between', DesignTokens.colors.background.panel, DesignTokens.colors.border.muted)}>
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
      <div className={cn('p-4 rounded-xl border backdrop-blur-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4', DesignTokens.card.default, DesignTokens.shadows.card)}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className={cn('w-3 h-3 rounded-full', isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500')} />
          <div className="flex items-center gap-3">
            <span className={cn(DesignTokens.typography.heading4, 'font-bold')}>{job.scenario}</span>
            <span
              className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                isRunning && 'bg-blue-900/30 text-blue-400',
                job.status === 'completed' && 'bg-green-900/30 text-green-400',
                job.status === 'failed' && 'bg-red-900/30 text-red-400',
                job.status === 'cancelled' && 'bg-yellow-900/30 text-yellow-400',
                job.status === 'pending' && 'bg-gray-900/30 text-gray-400'
              )}
            >
              {config.label}
            </span>
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

        <LogsPanelProvider job={job}>
          <LogsPanel />
        </LogsPanelProvider>
      </div>

      <LivePreviewKeyboardHints />
    </div>
  );
};

export const LivePreview = () => (
  <LogsPanelProvider job={null}>
    <LivePreviewContent />
  </LogsPanelProvider>
);

export default LivePreview;