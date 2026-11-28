import React, {useEffect, useRef, useCallback} from 'react';
import {createPortal} from 'react-dom';
import {cn} from '../../utils/ui';
import {XMarkIcon} from '../ui/icons';

/**
 * BaseModal - Foundation for all modal dialogs
 * 
 * Provides:
 * - Portal rendering to document.body
 * - Focus trap with Tab/Shift+Tab cycling
 * - Escape key to close
 * - Click outside to close (configurable)
 * - Body scroll lock
 * - ARIA attributes for accessibility
 * - Size variants and placement options
 */

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
export type ModalPlacement = 'center' | 'top';

export interface BaseModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Called when modal should close */
    onClose: () => void;
    /** Modal title (for aria-labelledby) */
    title?: string;
    /** Modal description (for aria-describedby) */
    description?: string;
    /** Modal content */
    children: React.ReactNode;
    /** Footer content (actions) */
    footer?: React.ReactNode;
    /** Size variant */
    size?: ModalSize;
    /** Vertical placement */
    placement?: ModalPlacement;
    /** Close when clicking overlay */
    closeOnOverlayClick?: boolean;
    /** Show close button in header */
    showCloseButton?: boolean;
    /** Body padding variant */
    bodyVariant?: 'default' | 'flush';
    /** Additional className */
    className?: string;
    /** Render in portal (default: true) */
    portal?: boolean;
    /** Custom close button aria-label */
    closeButtonAriaLabel?: string;
    /** Callback when escape key pressed */
    onEscape?: () => void;
    /** Prevent closing on escape */
    disableEscapeClose?: boolean;
    /** Z-index for modal layer */
    zIndex?: number;
}

// Size class mapping
const SIZE_CLASSES: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-[calc(100vw-2rem)] w-[calc(100vw-2rem)]',
};

const PLACEMENT_CLASSES: Record<ModalPlacement, string> = {
    center: 'items-center',
    top: 'items-start pt-[15vh]',
};

const DEFAULT_Z_INDEX = 500;

/**
 * Hook for focus trap functionality
 */
function useFocusTrap(
    isActive: boolean,
    onEscape?: () => void,
    onTabCycle?: () => void
): React.MutableRefObject<HTMLDivElement | null> {
    const contentRef = useRef<HTMLDivElement | null>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (isActive) {
            previousActiveElement.current = document.activeElement as HTMLElement;
            setTimeout(() => contentRef.current?.focus(), 0);
        } else {
            previousActiveElement.current?.focus();
        }
        return () => {
            previousActiveElement.current?.focus();
        };
    }, [isActive]);

    useEffect(() => {
        if (!isActive) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !onEscape) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                onEscape?.();
                return;
            }
            if (e.key === 'Tab') {
                const focusableElements = contentRef.current?.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements?.length) {
                    const firstElement = focusableElements[0] as HTMLElement;
                    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isActive, onEscape]);

    return contentRef;
}

/**
 * BaseModal component
 */
export function BaseModal({
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
    bodyVariant = 'default',
    className = '',
    portal = true,
    closeButtonAriaLabel = 'Close',
    onEscape,
    disableEscapeClose = false,
    zIndex = DEFAULT_Z_INDEX,
}: BaseModalProps) {
    const contentRef = useFocusTrap(
        isOpen,
        disableEscapeClose ? undefined : onEscape ?? onClose
    );

    // Body scroll lock
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

    const modalContent = (
        <div
            className={cn(
                'fixed inset-0 flex justify-center p-4',
                PLACEMENT_CLASSES[placement],
                'z-[500]'
            )}
            style={{zIndex}}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
        >
            <div
                className={cn(
                    'absolute inset-0 bg-black/50 backdrop-blur-sm',
                    'transition-opacity duration-200'
                )}
                onClick={closeOnOverlayClick ? onClose : undefined}
                aria-hidden="true"
            />
            <div
                ref={contentRef}
                tabIndex={-1}
                className={cn(
                    'relative w-full bg-[var(--app-raised)] border border-[var(--app-line)] rounded-xl shadow-[var(--app-shadow)]',
                    'animate-slide-up',
                    SIZE_CLASSES[size],
                    className
                )}
            >
                {(title || showCloseButton) && (
                    <div className="flex items-start justify-between p-4 border-b border-[var(--app-line)]">
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
                                className={cn(
                                    'p-1.5 rounded-lg text-[var(--app-muted)] hover:text-[var(--app-text)]',
                                    'hover:bg-[var(--app-line)] transition-colors',
                                    'focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]'
                                )}
                                aria-label={closeButtonAriaLabel}
                            >
                                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                )}
                <div className={cn(
                    bodyVariant === 'flush' ? 'p-0' : 'p-4',
                    'overflow-y-auto max-h-[70vh]'
                )}>
                    {children}
                </div>
                {footer && (
                    <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--app-line)] bg-[var(--app-raised)]/50">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    if (portal) {
        return createPortal(modalContent, document.body);
    }
    return modalContent;
}

/**
 * ConfirmationModal - Specialized modal for confirmations
 */
export interface ConfirmationModalProps extends Omit<BaseModalProps, 'children' | 'footer'> {
    /** Confirmation message */
    message: string;
    /** Confirm button text */
    confirmText?: string;
    /** Cancel button text */
    cancelText?: string;
    /** Confirm button variant */
    confirmVariant?: 'danger' | 'primary';
    /** Called when confirmed */
    onConfirm: () => void;
    /** Called when cancelled */
    onCancel?: () => void;
    /** Show loading state on confirm */
    isLoading?: boolean;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    title = 'Confirm',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'primary',
    onConfirm,
    onCancel,
    isLoading = false,
    size = 'sm',
    ...props
}: ConfirmationModalProps) {
    const handleClose = () => {
        onCancel?.();
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title={title}
            size={size}
            showCloseButton={false}
            {...props}
        >
            <p className="text-[var(--app-text)]">{message}</p>
            <BaseModal.Footer>
                <button
                    onClick={handleClose}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-[var(--app-text)] bg-[var(--app-line)] rounded-lg hover:bg-[var(--app-line-strong)] transition-colors"
                >
                    {cancelText}
                </button>
                <button
                    onClick={() => {
                        onConfirm();
                        onClose();
                    }}
                    disabled={isLoading}
                    className={cn(
                        'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                        confirmVariant === 'danger'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-[var(--app-accent)] hover:bg-[var(--app-accent-strong)]'
                    )}
                >
                    {isLoading ? '...' : confirmText}
                </button>
            </BaseModal.Footer>
        </BaseModal>
    );
}

/**
 * Footer component for modal actions
 */
export function ModalFooter({children}: {children: React.ReactNode}) {
    return <div className="flex items-center justify-end gap-3">{children}</div>;
}

// Attach Footer as static property for convenience
BaseModal.Footer = ModalFooter;
BaseModal.Confirmation = ConfirmationModal;