import React, {useState} from 'react';
import {ClipboardIcon} from '../common/icons';
import {useToast} from '../../hooks/useToast';
import {Input} from './Input';

interface CopyableFieldProps {
    label: string;
    value: string;
    isSecret?: boolean;
}

export function CopyableField({
                                  label,
                                  value,
                                  isSecret = false,
                              }: CopyableFieldProps) {
    const {addToast} = useToast();
    const [visible, setVisible] = useState(!isSecret);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        addToast('Copied to clipboard', 'success');
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
                {label}
            </label>
            <div className="flex items-center gap-2">
                <Input
                    type={visible ? 'text' : 'password'}
                    readOnly
                    value={value}
                    className="flex-grow"
                />
                {isSecret && (
                    <button
                        onClick={() => setVisible(!visible)}
                        className="p-2 text-gray-400 hover:text-white rounded-md text-xs bg-gray-700 hover:bg-gray-600 self-start mt-0.5"
                    >
                        {visible ? 'Hide' : 'Show'}
                    </button>
                )}
                <button
                    onClick={handleCopy}
                    className="p-2 bg-gray-600 rounded-md hover:bg-gray-500 self-start mt-0.5"
                    title="Copy to clipboard"
                    type="button"
                >
                    <ClipboardIcon className="h-4 w-4"/>
                </button>
            </div>
        </div>
    );
};
