import { useState, useEffect } from 'react';

export interface MobileState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  orientation: 'portrait' | 'landscape';
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export function useMobile(): MobileState {
  const [state, setState] = useState<MobileState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    hasTouch: false,
    orientation: 'portrait',
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  useEffect(() => {
    const updateState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobile = width < 768 && hasTouch;
      const isTablet = width >= 768 && width < 1024 && hasTouch;
      const isDesktop = !isMobile && !isTablet;
      const orientation = height > width ? 'portrait' : 'landscape';

      let safeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };
      if (CSS.supports('padding-top: env(safe-area-inset-top)')) {
        const style = getComputedStyle(document.documentElement);
        safeAreaInsets = {
          top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0', 10),
          right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0', 10),
          bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0', 10),
          left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0', 10),
        };
      }

      setState({
        isMobile,
        isTablet,
        isDesktop,
        hasTouch,
        orientation,
        safeAreaInsets,
      });
    };

    updateState();
    window.addEventListener('resize', updateState);
    window.addEventListener('orientationchange', updateState);
    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
    };
  }, []);

  return state;
}

export function useIsMobile(): boolean {
  const { isMobile } = useMobile();
  return isMobile;
}

export function useIsTablet(): boolean {
  const { isTablet } = useMobile();
  return isTablet;
}

export function useHasTouch(): boolean {
  const { hasTouch } = useMobile();
  return hasTouch;
}

export function useSafeAreaInsets(): MobileState['safeAreaInsets'] {
  const { safeAreaInsets } = useMobile();
  return safeAreaInsets;
}