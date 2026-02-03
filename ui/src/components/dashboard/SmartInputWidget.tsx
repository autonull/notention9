import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { Card } from '../common/Card';
import { SparklesIcon, SendIcon } from '../common/icons';
import { useSmartInput } from '../../hooks/useSmartInput';

export function SmartInputWidget() {
    const [text, setText] = useState('');
    const { processInput, isProcessing } = useSmartInput();

    const handleSubmit = async () => {
        await processInput(text);
        setText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit();
        }
    }

    return (
        <Card
            title="What's on your mind?"
            icon={SparklesIcon}
            className="shadow-xl relative overflow-hidden group"
            variant="default"
        >
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                <SparklesIcon className="w-24 h-24 text-purple-500 transform rotate-12" />
            </div>

            <div className="relative z-10">
                <Textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe a project, an offer, or just take a note... (e.g. 'I need a React developer for $100')"
                    className="w-full bg-gray-900/80 border-gray-700 focus:border-purple-500/50 min-h-[100px] text-lg mb-4"
                />
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                        Pro tip: Press <kbd className="bg-gray-700 px-1 rounded">Ctrl+Enter</kbd> to save
                    </span>
                    <Button
                        onClick={handleSubmit}
                        disabled={!text.trim() || isProcessing}
                        isLoading={isProcessing}
                        variant="primary"
                        icon={SendIcon}
                        className="bg-purple-600 hover:bg-purple-500"
                    >
                        Create Note
                    </Button>
                </div>
            </div>
        </Card>
    );
};
