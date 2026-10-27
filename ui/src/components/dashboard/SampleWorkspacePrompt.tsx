import React from 'react';
import {Button} from '../ui/Primitives';
import {SparklesIcon} from '../common/icons';

interface SampleWorkspacePromptProps {
    onLoad: () => void;
}

export function SampleWorkspacePrompt({onLoad}: SampleWorkspacePromptProps) {
    return (
        <section className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-6 animate-slide-in-up stagger-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="rounded-2xl bg-purple-500/10 p-3 text-purple-300 flex-shrink-0">
                    <SparklesIcon className="w-7 h-7"/>
                </div>
                <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-lg font-bold text-white">Try a sample workspace</h3>
                    <p className="text-sm text-gray-400 mt-1">
                        Ten local notes: a request and an offer that match, an event, places, and tasks. Nothing leaves your device.
                    </p>
                </div>
                <Button
                    onClick={onLoad}
                    variant="primary"
                    size="md"
                    className="w-full sm:w-auto flex-shrink-0 touch-target-48"
                >
                    Load sample workspace
                </Button>
            </div>
        </section>
    );
}