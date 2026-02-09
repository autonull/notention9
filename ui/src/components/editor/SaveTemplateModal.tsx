import React, {useState} from 'react';
import {Modal} from '../common/Modal';
import {Input} from '../common/Input';
import {Button} from '../common/Button';

interface SaveTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
}

export function SaveTemplateModal({
                                      isOpen,
                                      onClose,
                                      onSave,
                                  }: SaveTemplateModalProps) {
    const [name, setName] = useState('');

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
            setName('');
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Save as Template">
            <div className="space-y-4">
                <div>
                    <Input
                        label="Template Name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Daily Standup"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                        }}
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <Button
                        onClick={onClose}
                        variant="ghost"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        variant="primary"
                    >
                        Save Template
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
