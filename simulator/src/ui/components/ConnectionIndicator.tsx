import React from 'react';
import { Loader2, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { cn } from '../utils';
import { DesignTokens } from '../components/ui';

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

const configs = {
  connecting: { status: DesignTokens.colors.status.connecting },
  connected: { status: DesignTokens.colors.status.connected },
  disconnected: { status: DesignTokens.colors.status.disconnected },
  error: { status: DesignTokens.colors.status.error },
} as const;

export const ConnectionIndicator = ({ state }: { state: ConnectionState }) => {
  const config = configs[state];

  return (
    <span className={cn('flex items-center gap-1.5 text-xs font-medium', config.status.text)}>
      <span className="relative">
        <span className={cn('w-2 h-2 rounded-full', config.status.dot)} />
        {state === 'connected' && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        )}
      </span>
      {state === 'connecting' && <Loader2 className="animate-spin" size={12} />}
      {state === 'connected' && <Wifi size={12} />}
      {state === 'disconnected' && <WifiOff size={12} />}
      {state === 'error' && <AlertTriangle size={12} />}
      {state === 'connecting' && 'Connecting...'}
      {state === 'connected' && 'Connected'}
      {state === 'disconnected' && 'Disconnected'}
      {state === 'error' && 'Connection Error'}
    </span>
  );
};

ConnectionIndicator.displayName = 'ConnectionIndicator';