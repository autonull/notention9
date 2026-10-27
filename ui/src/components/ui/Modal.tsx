import React, {useEffect, useRef} from 'react';
import {cn} from '../../utils/ui';
import {useFocusTrap} from './Overlay';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnOverlayClick?: boolean;
    showCloseButton?: boolean;
}

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = 'md',
    closeOnOverlayClick = true,
    showCloseButton = true,
}: ModalProps) {
    const contentRef = useFocusTrap(isOpen, onClose);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeStyles = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        full: 'max-w-4xl',
    };

    return (
        <div
            className="fixed inset-0 z-[500] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
        >
            <div
                className="modal-backdrop animate-fade-in"
                onClick={closeOnOverlayClick ? onClose : undefined}
                aria-hidden="true"
            />
            <div
                ref={contentRef}
                tabIndex={-1}
                className={cn(
                    'card glass',
                    'shadow-2xl animate-scale-in',
                    'overflow-hidden flex flex-col max-h-[90vh]',
                    sizeStyles[size]
                )}
            >
                {(title || showCloseButton) && (
                    <div className="flex items-start justify-between p-4 md:p-6 border-b border-gray-700">
                        <div>
                            {title && (
                                <h2 id="modal-title" className="text-lg font-semibold text-white">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p id="modal-description" className="mt-1 text-sm text-gray-400">
                                    {description}
                                </p>
                            )}
                        </div>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="btn btn-ghost btn-sm p-1 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                                aria-label="Close"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        )}
                    </div>
                )}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}