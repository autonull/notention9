import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Button } from './Button';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  actions?: ToastAction[];
  persistent?: boolean;
  duration?: number;
}

interface ToastContextType {
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', options?: Partial<Toast>) => number;
  removeToast: (id: number) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const MAX_TOASTS = 5;
const DEFAULT_DURATION = 4000;

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
  const [progress, setProgress] = useState(100);
  const [hovered, setHovered] = useState(false);
  const progressRef = useRef(100);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (toast.persistent) {
      setProgress(100);
      return;
    }

    const duration = toast.duration ?? DEFAULT_DURATION;
    startTimeRef.current = Date.now();
    progressRef.current = 100;
    setProgress(100);

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.max(0, 100 - (elapsed / duration) * 100);
      progressRef.current = newProgress;
      setProgress(newProgress);

      if (newProgress > 0 && !hovered) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else if (newProgress <= 0) {
        onRemove(toast.id);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameRef.current!);
  }, [toast.id, onRemove, toast.persistent, toast.duration, hovered]);

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-yellow-600',
  }[toast.type];

  const iconMap = {
    success: <CheckCircle size={18} />,
    error: <AlertTriangle size={18} />,
    info: <Info size={18} />,
    warning: <AlertTriangle size={18} />,
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium animate-slide-in-right flex items-start gap-3 overflow-hidden ${bgColor} border border-white/10`}
      style={{ minWidth: '320px', maxWidth: '480px' }}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex-shrink-0 mt-0.5 text-white/90">
        {iconMap[toast.type]}
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <p className="break-words">{toast.message}</p>
        {toast.actions && toast.actions.length > 0 && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {toast.actions.map((action, idx) => (
              <Button
                key={idx}
                variant={action.variant === 'primary' ? 'primary' : action.variant === 'secondary' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => {
                  action.onClick();
                  if (!action.variant || action.variant !== 'ghost') {
                    onRemove(toast.id);
                  }
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-white/70 hover:text-white p-1.5 ml-2 flex-shrink-0 rounded-lg hover:bg-white/10 transition-colors"
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </Button>
      {!toast.persistent && (
        <div
          className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      )}
      {toast.persistent && (
        <div className="absolute bottom-0 left-0 h-1 bg-white/30 animate-pulse-subtle" aria-hidden="true" />
      )}
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', options: Partial<Toast> = {}) => {
    const id = Date.now() + Math.random();
    const newToast: Toast = {
      id,
      message,
      type,
      persistent: options.persistent ?? false,
      duration: options.duration,
      actions: options.actions,
    };
    setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, clearToasts }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.slice().reverse().map((toast) => (
          <div key={toast.id} className="pointer-events-auto animate-fade-in-up">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const toastHelpers = {
  success: (message: string, options?: Partial<Toast>) => ({ type: 'success' as const, message, options }),
  error: (message: string, options?: Partial<Toast>) => ({ type: 'error' as const, message, options }),
  info: (message: string, options?: Partial<Toast>) => ({ type: 'info' as const, message, options }),
  warning: (message: string, options?: Partial<Toast>) => ({ type: 'warning' as const, message, options }),

  saved: (item = 'Changes') => ({
    type: 'success' as const,
    message: `${item} saved`,
    options: { duration: 2000 },
  }),
  deleted: (item = 'Item') => ({
    type: 'success' as const,
    message: `${item} deleted`,
    options: { duration: 2000 },
  }),
  copied: (item = 'Content') => ({
    type: 'info' as const,
    message: `${item} copied to clipboard`,
    options: { duration: 2000 },
  }),
  networkError: () => ({
    type: 'error' as const,
    message: 'Network error. Please check your connection.',
    options: {
      persistent: true,
      actions: [{ label: 'Retry', onClick: () => window.location.reload(), variant: 'primary' as const }],
    },
  }),
  unsavedChanges: () => ({
    type: 'warning' as const,
    message: 'You have unsaved changes',
    options: {
      persistent: true,
      actions: [
        { label: 'Save', onClick: () => window.dispatchEvent(new CustomEvent('save-note')), variant: 'primary' as const },
        { label: 'Discard', onClick: () => {}, variant: 'ghost' as const },
      ],
    },
  }),
};