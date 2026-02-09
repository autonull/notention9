import React, {useEffect} from 'react';
import {CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon, XMarkIcon} from '../common/icons';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
    onClose: () => void;
}

export function Toast({message, type, duration = 3000, onClose}: ToastProps) {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircleIcon className="h-5 w-5 text-green-400"/>;
            case 'error':
                return <XCircleIcon className="h-5 w-5 text-red-400"/>;
            case 'warning':
                return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400"/>;
            case 'info':
            default:
                return <InformationCircleIcon className="h-5 w-5 text-blue-400"/>;
        }
    };

    const getStyles = () => {
        switch (type) {
            case 'success':
                return 'bg-gray-800 border-green-500/20 text-gray-100';
            case 'error':
                return 'bg-gray-800 border-red-500/20 text-gray-100';
            case 'warning':
                return 'bg-gray-800 border-yellow-500/20 text-gray-100';
            case 'info':
            default:
                return 'bg-gray-800 border-blue-500/20 text-gray-100';
        }
    };

    return (
        <div
            className={`
        pointer-events-auto flex items-center gap-3 p-3 rounded-lg shadow-lg border animate-slide-in-right max-w-sm
        ${getStyles()}
      `}
            role="alert"
        >
            <div className="flex-shrink-0">{getIcon()}</div>
            <p className="text-sm font-medium flex-grow">{message}</p>
            <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-gray-700/50 transition-colors"
            >
                <XMarkIcon className="h-4 w-4"/>
            </button>
        </div>
    );
};
