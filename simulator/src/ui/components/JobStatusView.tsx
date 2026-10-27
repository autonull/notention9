import React from 'react';
import { Loader2, AlertTriangle, CheckCircle, PauseCircle, RefreshCw, Maximize2, Copy, MonitorPlay } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, IconButton, Card, CardHeader, CardContent } from '../components/ui';
import { cn } from '../utils';
import { DesignTokens } from '../components/ui';
import { STATUS_CONFIG, type JobStatus, type ConnectionState } from '../hooks/useLivePreview';

interface JobStatusViewProps {
  job: JobStatus;
  connectionState: ConnectionState;
  onCancel: () => void;
  onRetry: () => void;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  handleIframeLoad: () => void;
  handleIframeError: () => void;
  cancelling: boolean;
  iframeError: boolean;
}

export const JobStatusView = ({
  job,
  connectionState,
  onCancel,
  onRetry,
  iframeRef,
  handleIframeLoad,
  handleIframeError,
  cancelling,
  iframeError,
}: JobStatusViewProps) => {
  const navigate = useNavigate();
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
              <h3 className={cn(DesignTokens.typography.heading4, 'text-white mb-2')}>Failed to Load Dashboard</h3>
              <p className={cn(DesignTokens.colors.text.muted, 'text-center mb-6 max-w-md')}>
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
          <CheckCircle size={64} className={cn(DesignTokens.colors.status.completed.dot, 'mb-4 animate-scale-in-bounce')} />
          <h3 className={cn(DesignTokens.typography.heading3, 'text-white mb-2')}>Production Complete</h3>
          <p className={cn(DesignTokens.colors.text.muted, 'text-center')}>The simulation has finished successfully.</p>
        </div>
      );
    }

    if (job.status === 'failed') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
          <AlertTriangle size={64} className={cn(DesignTokens.colors.status.failed.dot, 'mb-4 animate-shake')} />
          <h3 className={cn(DesignTokens.typography.heading3, 'text-white mb-2')}>Production Failed</h3>
          <p className={cn(DesignTokens.colors.text.muted, 'text-center')}>The simulation encountered an error.</p>
        </div>
      );
    }

    if (job.status === 'cancelled') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
          <PauseCircle size={64} className={cn(DesignTokens.colors.status.cancelled.dot, 'mb-4')} />
          <h3 className={cn(DesignTokens.typography.heading3, 'text-white mb-2')}>Production Cancelled</h3>
          <p className={cn(DesignTokens.colors.text.muted, 'text-center')}>The simulation was stopped by the user.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <Loader2 size={64} className="animate-spin mb-4 text-indigo-500" />
        <h3 className={cn(DesignTokens.typography.heading3, 'text-white mb-2')}>Starting Dashboard...</h3>
        <p className={cn(DesignTokens.colors.text.muted, 'text-center')}>Please wait while the live dashboard initializes.</p>
      </div>
    );
  };

  return (
    <Card variant="elevated" className={cn('flex-1 bg-black/50 rounded-xl overflow-hidden relative backdrop-blur-sm flex flex-col', DesignTokens.colors.border.card)}>
      <CardHeader className={cn('p-3 border-b', DesignTokens.colors.background.panel, DesignTokens.colors.border.muted, 'flex items-center justify-between')}>
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

JobStatusView.displayName = 'JobStatusView';