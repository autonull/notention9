import React, { useEffect } from 'react';
import { cn } from '../../utils/ui';
import { useFocusTrap } from './Overlay';
import { componentTokens } from '../../styles/tokens';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    placement?: 'center' | 'top';
    closeOnOverlayClick?: boolean;
    showCloseButton?: boolean;
    bodyVariant?: 'default' | 'flush';
    className?: string;
}

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    size = 'md',
    placement = 'center',
    closeOnOverlayClick = true,
    showCloseButton = true,
    className = '',
    bodyVariant = 'default',
}: ModalProps) {
    const contentRef = useFocusTrap(isOpen, onClose);
    const tokens = componentTokens.modal;

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

    return (
        <div
            className={cn(
                'fixed inset-0 z-[500] flex justify-center p-4',
                placement === 'top' ? 'items-start pt-[15vh]' : 'items-center',
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
        >
            <div
                className={tokens.backdrop}
                onClick={closeOnOverlayClick ? onClose : undefined}
                aria-hidden="true"
            />
            <div
                ref={contentRef}
                tabIndex={-1}
                className={cn(
                    tokens.container,
                    tokens.sizes[size],
                    className
                )}
            >
                {(title || showCloseButton) && (
                    <div className={tokens.header}>
                        <div>
                            {title && (
                                <h2 id="modal-title" className="text-lg font-semibold text-[var(--app-text)]">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p id="modal-description" className="mt-1 text-sm text-[var(--app-muted)]">
                                    {description}
                                </p>
                            )}
                        </div>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className={tokens.closeButton}
                                aria-label="Close"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
                <div className={bodyVariant === 'flush' ? tokens.bodyFlush : tokens.body}>
                    {children}
                </div>
                {footer && (
                    <div className={tokens.footer}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}