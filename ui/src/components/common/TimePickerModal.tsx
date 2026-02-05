import React, { useState, useEffect } from 'react';
import { Logger } from '@notention/core';
import { Modal } from './Modal';
import { Input } from './Input';
import { format, isValid, parseISO } from 'date-fns';
import { useToast } from '../../hooks/useToast';

interface TimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTimeSelect: (isoString: string) => void;
  initialValue?: string;
  title?: string;
}

export function TimePickerModal({
    isOpen,
    onClose,
    onTimeSelect,
    initialValue,
    title = "Pick Date & Time"
}: TimePickerModalProps) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const { addToast } = useToast();

    useEffect(() => {
        if (isOpen) {
            let d = new Date();
            if (initialValue) {
                const parsed = parseISO(initialValue);
                if (isValid(parsed)) {
                    d = parsed;
                }
            }
            setDate(format(d, 'yyyy-MM-dd'));
            setTime(format(d, 'HH:mm'));
        }
    }, [isOpen, initialValue]);

    const handleSave = () => {
        try {
            const dateTimeString = `${date}T${time}`;
            const dt = new Date(dateTimeString);

            if (isValid(dt)) {
                // Return ISO string without milliseconds for cleaner display
                // Or just the string the user built if we want to be loose
                // Let's use standard ISO format
                onTimeSelect(`${date}T${time}:00`);
                onClose();
            } else {
                addToast("Invalid date/time combination", "error");
            }
        } catch (e: unknown) {
            Logger.getInstance().error("Error constructing date", e instanceof Error ? e : new Error(String(e)));
            addToast("Error constructing date", "error");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Date"
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        autoFocus
                    />
                    <Input
                        label="Time"
                        type="time"
                        value={time}
                        onChange={e => setTime(e.target.value)}
                    />
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-700/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors font-medium text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-blue-900/20 text-sm"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </Modal>
    );
}
