import {createContext, ReactNode, useContext, useEffect, useState} from 'react';
import {Logger} from '@notention/core';

export interface ErrorMessage {
    id: string;
    message: string;
    type: 'error' | 'warning' | 'info';
    timestamp: number;
    autoDismiss?: boolean;
    dismissAfter?: number; // milliseconds
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ErrorHandlerContextType {
    errors: ErrorMessage[];
    addError: (error: Omit<ErrorMessage, 'id' | 'timestamp'>) => string;
    removeError: (id: string) => void;
    clearErrors: () => void;
    dismissError: (id: string) => void;
}

const ErrorHandlerContext = createContext<ErrorHandlerContextType | undefined>(undefined);

export const ErrorHandlingProvider: React.FC<{ children: ReactNode }> = ({children}) => {
    const [errors, setErrors] = useState<ErrorMessage[]>([]);

    const addError = (error: Omit<ErrorMessage, 'id' | 'timestamp'>): string => {
        const id = crypto.randomUUID();
        const newError: ErrorMessage = {
            ...error,
            id,
            timestamp: Date.now(),
        };

        setErrors(prev => [...prev, newError]);

        // Auto-dismiss if specified
        if (error.autoDismiss && error.dismissAfter) {
            setTimeout(() => {
                dismissError(id);
            }, error.dismissAfter);
        }

        return id;
    };

    const removeError = (id: string) => {
        setErrors(prev => prev.filter(error => error.id !== id));
    };

    const dismissError = (id: string) => {
        setErrors(prev => prev.filter(error => error.id !== id));
    };

    const clearErrors = () => {
        setErrors([]);
    };

    // Clean up old errors periodically
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setErrors(prev => prev.filter(error => {
                // Keep errors for at least 5 minutes unless auto-dismissed
                return (now - error.timestamp) < 5 * 60 * 1000;
            }));
        }, 60 * 1000); // Check every minute

        return () => clearInterval(interval);
    }, []);

    return (
        <ErrorHandlerContext.Provider
            value={{
                errors,
                addError,
                removeError,
                clearErrors,
                dismissError,
            }}
        >
            {children}
        </ErrorHandlerContext.Provider>
    );
};

export const useErrorHandler = (): ErrorHandlerContextType => {
    const context = useContext(ErrorHandlerContext);
    if (!context) {
        throw new Error('useErrorHandler must be used within an ErrorHandlingProvider');
    }
    return context;
};

// Utility function to handle errors consistently
export const handleAppError = (
    error: any,
    context?: string,
    showError: boolean = true
): string | null => {
    const {addError} = useErrorHandler();

    let errorMessage = 'An unexpected error occurred';
    let errorType: 'error' | 'warning' | 'info' = 'error';

    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else {
        errorMessage = JSON.stringify(error);
    }

    if (context) {
        errorMessage = `${context}: ${errorMessage}`;
    }

    if (!showError) {
        Logger.getInstance().error(errorMessage);
        return null;
    }

    return addError({
        message: errorMessage,
        type: errorType,
        autoDismiss: true,
        dismissAfter: 5000,
    });
};

// Component to display errors
export const ErrorDisplay: React.FC = () => {
    const {errors, dismissError} = useErrorHandler();

    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
            {errors.map((error) => (
                <div
                    key={error.id}
                    className={`p-4 rounded-lg shadow-lg max-w-md transform transition-all duration-300 ${
                        error.type === 'error'
                            ? 'bg-red-500 text-white'
                            : error.type === 'warning'
                                ? 'bg-yellow-500 text-black'
                                : 'bg-blue-500 text-white'
                    }`}
                >
                    <div className="flex justify-between items-start">
                        <div className="flex-1">{error.message}</div>
                        <button
                            onClick={() => dismissError(error.id)}
                            className="ml-2 text-xl leading-none"
                        >
                            ×
                        </button>
                    </div>
                    {error.action && (
                        <div className="mt-2">
                            <button
                                onClick={error.action.onClick}
                                className="text-sm underline hover:no-underline"
                            >
                                {error.action.label}
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};