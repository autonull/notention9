import React, { Fragment, ReactNode, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { Card } from './Card';
import { DesignTokens } from './DesignTokens';
import { cn } from '../../utils';
import { trapFocus } from '../../utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: ReactNode;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!closeOnEscape) return;
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab') {
        trapFocus(modalRef.current!, e);
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => modalRef.current?.focus(), 50);
    }
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: DesignTokens.modal.sizes.sm,
    md: DesignTokens.modal.sizes.md,
    lg: DesignTokens.modal.sizes.lg,
    xl: DesignTokens.modal.sizes.xl,
    full: DesignTokens.modal.sizes.full,
  };

  return (
    <Fragment>
      <div className={DesignTokens.modal.overlay} onClick={closeOnOverlayClick ? onClose : undefined} aria-hidden="true" />
      <div
        ref={modalRef}
        className={cn(DesignTokens.modal.container, 'on-click-stop-propagation')}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
      >
        <Card variant="elevated" className={cn(sizeStyles[size], 'w-full max-h-[85vh] flex flex-col')}>
          {(title || showCloseButton) && (
            <div className="flex items-start justify-between gap-4 p-4 border-b border-gray-700/50 flex-shrink-0">
              <div className="flex-1 min-w-0">
                {title && (
                  <h2 id="modal-title" className={cn(DesignTokens.typography.heading3, 'text-white')}>
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="modal-description" className={cn(DesignTokens.typography.bodySm, DesignTokens.colors.text.muted, 'mt-1')}>
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <IconButton
                  onClick={onClose}
                  aria-label="Close modal"
                  size="sm"
                  className="flex-shrink-0"
                >
                  <X size={20} />
                </IconButton>
              )}
            </div>
          )}
          <div className="flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </div>
          {footer && (
            <div className="p-4 border-t border-gray-700/50 flex-shrink-0">
              {footer}
            </div>
          )}
        </Card>
      </div>
    </Fragment>
  );
};

Modal.displayName = 'Modal';