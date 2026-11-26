import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotes } from './useNotes';

interface DescribeItPromoState {
  shouldShow: boolean;
  message: string;
  ctaText: string;
  onDismiss: () => void;
  onActivate: () => void;
  variant: 'pulse' | 'tooltip' | 'contextual-hint';
}

interface UseDescribeItPromoOptions {
  variant?: 'pulse' | 'tooltip' | 'contextual-hint';
  trigger?: 'auto' | 'empty-state' | 'idle' | 'error' | 'manual';
}

const STORAGE_KEYS = {
  pulse: 'describe-it-promo-pulse-dismissed',
  tooltip: 'describe-it-promo-tooltip-dismissed',
  'contextual-hint': 'describe-it-promo-contextual-hint-dismissed',
} as const;

const MESSAGES = {
  pulse: 'Describe what you need in plain English',
  tooltip: 'Press Ctrl+Shift+/ to open Describe It',
  'contextual-hint': 'Stuck? Describe what you need and let AI help',
} as const;

const CTA_TEXTS = {
  pulse: 'Try Describe It',
  tooltip: 'Open Describe It',
  'contextual-hint': 'Get help',
} as const;

export function useDescribeItPromo(options: UseDescribeItPromoOptions = {}): DescribeItPromoState {
  const { variant = 'pulse', trigger = 'auto' } = options;
  const { notes } = useNotes();
  
  const [shouldShow, setShouldShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const activeNotes = useMemo(() => notes.filter(n => !n.deletedAt), [notes]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS[variant]);
    if (stored === 'true') {
      setDismissed(true);
      setShouldShow(false);
      return;
    }

    let show = false;
    
    switch (trigger) {
      case 'empty-state':
        show = activeNotes.length === 0;
        break;
      case 'idle':
        // Handled by useHelpContextual
        show = false;
        break;
      case 'error':
        // Could be triggered by error boundary
        show = false;
        break;
      case 'auto':
      default:
        // Show pulse variant on first visit with no notes
        // Show tooltip variant when user has notes but hasn't used Describe It
        // Show contextual-hint when in empty matches state
        if (variant === 'pulse') {
          show = activeNotes.length === 0;
        } else if (variant === 'tooltip') {
          show = activeNotes.length > 0;
        } else if (variant === 'contextual-hint') {
          show = activeNotes.length > 0;
        }
        break;
    }

    setShouldShow(show && !dismissed);
  }, [variant, trigger, activeNotes.length, dismissed]);

  const onDismiss = useCallback(() => {
    setShouldShow(false);
    setDismissed(true);
    localStorage.setItem(STORAGE_KEYS[variant], 'true');
  }, [variant]);

  const onActivate = useCallback(() => {
    window.location.hash = '#/describe-it';
    onDismiss();
  }, [onDismiss]);

  return {
    shouldShow: shouldShow && !dismissed,
    message: MESSAGES[variant],
    ctaText: CTA_TEXTS[variant],
    onDismiss,
    onActivate,
    variant,
  };
}

export function useDescribeItShortcut(): { onOpenDescribeIt: () => void } {
  const onOpenDescribeIt = useCallback(() => {
    window.location.hash = '#/describe-it';
  }, []);

  return { onOpenDescribeIt };
}