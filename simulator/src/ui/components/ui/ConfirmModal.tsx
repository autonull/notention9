import React from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { DesignTokens } from './DesignTokens';
import { cn } from '../../utils';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
}: ConfirmModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
    <p className={cn(DesignTokens.typography.body, DesignTokens.colors.text.secondary)}>{message}</p>
    <div className="flex justify-end gap-3 mt-6" slot="footer">
      <Button variant="ghost" onClick={onClose} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button variant={variant} onClick={onConfirm} loading={loading}>
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);

ConfirmModal.displayName = 'ConfirmModal';