import React from 'react';
import { Kbd } from '../components/ui';
import { cn } from '../utils';
import { DesignTokens } from '../components/ui';

export const LivePreviewKeyboardHints = () => (
  <div className={cn('fixed bottom-4 right-4 rounded-lg border p-3 text-xs text-gray-500 flex flex-col gap-1 pointer-events-none', DesignTokens.colors.background.elevated, DesignTokens.colors.border.muted, DesignTokens.shadows.card)}>
    <div className="flex items-center gap-2"><Kbd>Esc</Kbd><span>Toggle logs</span></div>
    <div className="flex items-center gap-2"><Kbd>Ctrl+L</Kbd><span>Focus search</span></div>
    <div className="flex items-center gap-2"><Kbd>Ctrl+Space</Kbd><span>Pause scroll</span></div>
  </div>
);

LivePreviewKeyboardHints.displayName = 'LivePreviewKeyboardHints';