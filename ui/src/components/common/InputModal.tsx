import React, {useEffect, useState} from 'react';
import {Modal} from './Modal';
import {Button} from './Button';
import {Input} from './Input';

interface InputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: string) => void;
    title: string;
    label?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

export function InputModal({
                               isOpen,
                               onClose,
                               onConfirm,
                               title,
                               label,
                               defaultValue = '',
                               placeholder = '',
                               confirmLabel = 'Confirm',
                               cancelLabel = 'Cancel',
                           }: InputModalProps) {
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
        }
    }, [isOpen, defaultValue]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        onConfirm(value);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <Input
                        label={label}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        autoFocus
                        className="w-full"
                    />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        onClick={onClose}
                        variant="secondary"
                        type="button"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={!value.trim()}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
