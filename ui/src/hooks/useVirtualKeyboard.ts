import { useState, useEffect, useCallback } from 'react';

export interface VirtualKeyboardState {
  isOpen: boolean;
  height: number;
  width: number;
  inset: { top: number; right: number; bottom: number; left: number } | null;
}

export function useVirtualKeyboard(): VirtualKeyboardState & {
  onFocus: (element: HTMLElement | null) => void;
  onBlur: () => void;
} {
  const [state, setState] = useState<VirtualKeyboardState>({
    isOpen: false,
    height: 0,
    width: 0,
    inset: null,
  });

  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (focusedElement) {
        const rect = focusedElement.getBoundingClientRect();
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const keyboardHeight = window.innerHeight - viewportHeight;
        
        setState({
          isOpen: keyboardHeight > 150,
          height: keyboardHeight,
          width: window.visualViewport?.width ?? window.innerWidth,
          inset: window.visualViewport 
            ? {
                top: window.visualViewport.offsetTop,
                right: window.innerWidth - window.visualViewport.width - window.visualViewport.offsetLeft,
                bottom: keyboardHeight,
                left: window.visualViewport.offsetLeft,
              }
            : null,
        });
      }
    };

    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', handleResize);
      visualViewport.addEventListener('scroll', handleResize);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleResize);
        visualViewport.removeEventListener('scroll', handleResize);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [focusedElement]);

  const onFocus = useCallback((element: HTMLElement | null) => {
    setFocusedElement(element);
    if (element) {
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, []);

  const onBlur = useCallback(() => {
    setFocusedElement(null);
    setState({ isOpen: false, height: 0, width: 0, inset: null });
  }, []);

  return { ...state, onFocus, onBlur };
}

export function useViewportHeight(): number {
  const [height, setHeight] = useState(window.innerHeight);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    const updateHeight = () => {
      setHeight(visualViewport?.height ?? window.innerHeight);
    };

    if (visualViewport) {
      visualViewport.addEventListener('resize', updateHeight);
      visualViewport.addEventListener('scroll', updateHeight);
    }
    window.addEventListener('resize', updateHeight);

    return () => {
      if (visualViewport) {
        visualViewport.removeEventListener('resize', updateHeight);
        visualViewport.removeEventListener('scroll', updateHeight);
      }
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  return height;
}

export function useKeyboardAwareScrollView(): { 
  contentStyle: React.CSSProperties;
  keyboardHeight: number;
} {
  const { height: keyboardHeight } = useVirtualKeyboard();
  const viewportHeight = useViewportHeight();

  const contentStyle: React.CSSProperties = {
    minHeight: `calc(${viewportHeight}px - ${keyboardHeight}px)`,
    paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0,
  };

  return { contentStyle, keyboardHeight };
}