import React from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { DesignTokens } from './DesignTokens';
import { cn } from '../../utils';

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  icon?: React.ReactNode;
}

export const AlertModal = ({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel = 'OK',
  icon,
}: AlertModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
    <div className="flex items-start gap-4">
      {icon && <div className="flex-shrink-0 mt-1">{icon}</div>}
      <p className={cn(DesignTokens.typography.body, DesignTokens.colors.text.secondary, 'flex-1')}>{message}</p>
    </div>
    <div className="flex justify-end mt-6" slot="footer">
      <Button variant="primary" onClick={onClose} autoFocus>
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);

AlertModal.displayName = 'AlertModal';