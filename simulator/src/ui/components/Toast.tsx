import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const MAX_TOASTS = 5;

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const startTime = Date.now();
        const duration = 4000;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(newProgress);
            
            if (newProgress > 0) {
                requestAnimationFrame(animate);
            } else {
                onRemove(toast.id);
            }
        };
        
        const frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [toast.id, onRemove]);

    const bgColor = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600'
    }[toast.type];

    return (
        <div
            className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-slide-in-right flex items-start gap-3 relative overflow-hidden ${bgColor}`}
            style={{ minWidth: '300px', maxWidth: '420px' }}
        >
            <div className="flex-1 min-w-0">{toast.message}</div>
            <button
                onClick={() => onRemove(toast.id)}
                className="text-white/70 hover:text-white p-1 ml-2 flex-shrink-0"
                aria-label="Dismiss"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
            <div
                className="absolute bottom-0 left-0 h-1 bg-white/30"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev.slice(-(MAX_TOASTS - 1)), { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.slice().reverse().map(toast => (
          <div key={toast.id} className="pointer-events-auto">
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
