import React from 'react';
import {Button} from '../ui/Primitives';
import {PlusIcon, BoltIcon} from '../common/icons';
import {modShortcut} from '../../utils/platform';

interface DashboardHeaderProps {
    onCreateNote: () => void;
    showFeatures: boolean;
    onToggleFeatures: () => void;
}

export function DashboardHeader({onCreateNote, showFeatures, onToggleFeatures}: DashboardHeaderProps) {
    return (
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-down">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                    Welcome back
                </h1>
                <p className="mt-1 text-gray-400">
                    Capture thoughts, discover connections, build knowledge.
                </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button
                    onClick={onCreateNote}
                    leftIcon={<PlusIcon className="w-5 h-5"/>}
                    size="lg"
                    className="touch-target-48"
                >
                    New Note
                </Button>
                <Button
                    onClick={onToggleFeatures}
                    variant="ghost"
                    size="lg"
                    leftIcon={<BoltIcon className="w-5 h-5"/>}
                    className="touch-target-48 hidden sm:inline-flex"
                >
                    Features
                </Button>
            </div>
        </header>
    );
}