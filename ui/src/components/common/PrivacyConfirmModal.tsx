import React from 'react';
import {Modal} from './Modal';
import {Button} from './Button';
import type {Note} from '@notention/core';

interface PrivacyConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    note: Note;
    destination: string;
}

export function PrivacyConfirmModal({
                                        isOpen,
                                        onClose,
                                        onConfirm,
                                        note,
                                        destination,
                                    }: PrivacyConfirmModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="⚠️ Privacy Warning">
            <div className="space-y-6">
                <p className="text-gray-300 leading-relaxed">
                    "<strong className="text-white">{note.title}</strong>" is currently{' '}
                    <strong className="text-yellow-400">private</strong>.
                </p>

                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-2">
                        Making it <strong className="text-green-400">public</strong> will allow:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start gap-2">
                            <span className="text-green-400 flex-shrink-0">✓</span>
                            <span>Publishing to {destination}</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-400 flex-shrink-0">✓</span>
                            <span>Discovery by other users on the network</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-400 flex-shrink-0">⚠</span>
                            <span>Permanent visibility (cannot be completely erased once published)</span>
                        </li>
                    </ul>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        onClick={onClose}
                        variant="secondary"
                    >
                        Keep Private
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        variant="primary"
                    >
                        Make Public & Share
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
