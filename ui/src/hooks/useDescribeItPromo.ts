import { useState, useEffect, useCallback } from 'react';

interface DescribeItPromoState {
  shouldShow: boolean;
  message: string;
  ctaText: string;
  onDismiss: () => void;
  onActivate: () => void;
}

interface UseDescribeItPromoOptions {
  variant?: 'pulse' | 'tooltip' | 'contextual-hint';
}

export function useDescribeItPromo(options: UseDescribeItPromoOptions = {}): DescribeItPromoState {
  const { variant = 'pulse' } = options;
  const [shouldShow, setShouldShow] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`describe-it-promo-${variant}-dismissed`);
    if (stored === 'true') {
      setDismissed(true);
      setShouldShow(false);
    }
  }, [variant]);

  const onDismiss = useCallback(() => {
    setShouldShow(false);
    setDismissed(true);
    localStorage.setItem(`describe-it-promo-${variant}-dismissed`, 'true');
  }, [variant]);

  const onActivate = useCallback(() => {
    // Open Describe It feature
    window.location.hash = '#/describe-it';
  }, []);

  const message = 'Describe what you need in plain English';
  const ctaText = 'Try Describe It';

  return {
    shouldShow: shouldShow && !dismissed,
    message,
    ctaText,
    onDismiss,
    onActivate,
  };
}