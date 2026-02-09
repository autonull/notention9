import React from 'react';
import {Modal} from '../common/Modal';
import {Button} from '../common/Button';

export interface PrivacyConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    noteTitle: string;
    destination: string;
}

export function PrivacyConfirmModal({
                                        isOpen,
                                        onClose,
                                        onConfirm,
                                        noteTitle,
                                        destination,
                                    }: PrivacyConfirmModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="⚠️ Privacy Warning">
            <div className="space-y-6">
                <div className="text-gray-300 leading-relaxed">
                    <p className="mb-4">
                        "<strong>{noteTitle || 'Untitled Note'}</strong>" is currently <strong>private</strong>.
                    </p>
                    <p className="mb-2">Making it <strong>public</strong> will allow:</p>
                    <ul className="list-disc pl-5 space-y-1 mb-4 text-gray-400">
                        <li>Publishing to {destination}</li>
                        <li>Discovery by other users</li>
                        <li>Permanent visibility on the network</li>
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
