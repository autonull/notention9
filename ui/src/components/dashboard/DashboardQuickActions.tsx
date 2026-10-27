import React, {useCallback} from 'react';
import {useView} from '../../hooks/useViewContext';
import {useNotes} from '../../hooks/useNotes';
import {Button} from '../ui';
import {cn} from '../../utils/ui';
import {modShortcut} from '../../utils/platform';
import type {View} from '@notention/core';
import {
    PencilIcon,
    MapIcon,
    ChatIcon,
    NetworkIcon,
    ClockIcon,
    SettingsIcon,
} from '../ui/icons';

const QUICK_ACTIONS = [
    {id: 'new-note', label: 'New Note', description: 'Start writing', icon: PencilIcon, gradient: 'gradient-primary', action: 'new-note', shortcut: modShortcut('N')},
    {id: 'map', label: 'Map View', description: 'Browse notes spatially', icon: MapIcon, gradient: 'gradient-purple', action: 'map'},
    {id: 'chat', label: 'Chat', description: 'Messages & contacts', icon: ChatIcon, gradient: 'gradient-teal', action: 'chat'},
    {id: 'network', label: 'Network', description: 'P2P connections', icon: NetworkIcon, gradient: 'gradient-warning', action: 'network'},
    {id: 'timeline', label: 'Timeline', description: 'Chronological view', icon: ClockIcon, gradient: 'gradient-info', action: 'timeline'},
    {id: 'settings', label: 'Settings', description: 'Preferences', icon: SettingsIcon, gradient: 'gradient-gray', action: 'settings'},
];

interface DashboardQuickActionsProps {
    onCreateNote: () => void;
}

export function DashboardQuickActions({onCreateNote}: DashboardQuickActionsProps) {
    const {setActiveView} = useView();

    const handleQuickAction = useCallback((action: string) => {
        if (action === 'new-note') {
            onCreateNote();
            return;
        }
        setActiveView(action as View);
    }, [onCreateNote, setActiveView]);

    return (
        <aside className="bg-gray-900/50 rounded-3xl border border-gray-700/30 p-6 flex flex-col gap-3 backdrop-blur-sm shadow-xl animate-fade-in-up stagger-5">
            <h2 className="text-lg font-bold text-white mb-2">Quick Actions</h2>

            {QUICK_ACTIONS.map((action) => (
                <Button
                    key={action.id}
                    onClick={() => handleQuickAction(action.action)}
                    variant="outline"
                    className="w-full text-left gap-4 justify-start hover:shadow-lg transition-all duration-200 touch-target-48"
                    leftIcon={
                        <div className={cn('p-2 rounded-xl', action.gradient, 'text-white')}>
                            <action.icon className="w-5 h-5" />
                        </div>
                    }
                >
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white">{action.label}</div>
                        <div className="text-sm text-gray-400">{action.description}</div>
                    </div>
                    {action.shortcut && (
                        <kbd className="text-[10px] font-mono px-2 py-0.5 bg-gray-800 text-gray-400 rounded uppercase tracking-wider">
                            {action.shortcut}
                        </kbd>
                    )}
                </Button>
            ))}
        </aside>
    );
}