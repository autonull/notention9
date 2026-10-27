import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Button } from './Button';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { DesignTokens } from './DesignTokens';
import { cn } from '../../utils';

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

const typeStyles = {
  success: { bg: 'bg-green-600', icon: <CheckCircle size={18} /> },
  error: { bg: 'bg-red-600', icon: <AlertTriangle size={18} /> },
  info: { bg: 'bg-blue-600', icon: <Info size={18} /> },
  warning: { bg: 'bg-yellow-600', icon: <AlertTriangle size={18} /> },
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (toast.persistent) return;

    const duration = toast.duration ?? DEFAULT_DURATION;
    const timer = setTimeout(() => {
      if (!hovered) {
        setVisible(false);
        setTimeout(() => onRemove(toast.id), 300);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, onRemove, toast.persistent, toast.duration, hovered]);

  if (!visible) return null;

  const { bg, icon } = typeStyles[toast.type];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative px-4 py-3 rounded-xl text-white text-sm font-medium animate-slide-in-right flex items-start gap-3 overflow-hidden',
        DesignTokens.shadows.card,
        bg,
        'border border-white/10',
        'animate-fade-out'
      )}
      style={{ minWidth: '320px', maxWidth: '480px', animationDuration: `${(toast.duration ?? DEFAULT_DURATION) / 1000}s` }}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex-shrink-0 mt-0.5 text-white/90">
        {icon}
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
        <div className="absolute bottom-0 left-0 h-1 bg-white/30 animate-progress" aria-hidden="true" />
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