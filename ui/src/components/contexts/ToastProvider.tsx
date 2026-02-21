import React, {ReactNode, useCallback, useState} from 'react';
import {Toast} from '../common/Toast';
import {ToastContext, ToastMessage, ToastType} from './ToastContext';

interface ToastProviderProps {
    children: ReactNode;
}

export function ToastProvider({children}: ToastProviderProps) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback(
        (message: string, type: ToastType = 'info', duration: number = 3000) => {
            const id = crypto.randomUUID();
            const newToast = {id, message, type, duration};
            setToasts((prev) => [...prev, newToast]);
        },
        []
    );

    return (
        <ToastContext.Provider value={{addToast, removeToast}}>
            {children}
            <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};
