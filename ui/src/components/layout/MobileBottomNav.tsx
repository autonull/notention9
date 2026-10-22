import React from 'react';
import {useView} from '../../hooks/useViewContext';
import {HomeIcon, GitBranchIcon, UserIcon, PlusIcon, MenuIcon, XIcon} from '../common/icons';

const MOBILE_NAV_ITEMS = [
    {id: 'notes', label: 'Notes', icon: HomeIcon, badge: 'notes'},
    {id: 'graph', label: 'Graph', icon: GitBranchIcon},
    {id: 'self', label: 'Self', icon: UserIcon},
] as const;

interface MobileBottomNavProps {
    isOpen?: boolean;
    onToggle?: () => void;
}

export function MobileBottomNav({isOpen = false, onToggle}: MobileBottomNavProps) {
    const {activeView, setActiveView, isPaletteOpen, setIsPaletteOpen} = useView();

    const handleSelect = (viewId: string) => {
        setActiveView(viewId);
        if (isPaletteOpen) setIsPaletteOpen(false);
    };

    return (
        <>
            <div
                className={`fixed bottom-0 left-0 right-0 z-50 md:hidden transition-all duration-300 ${
                    isOpen ? 'translate-y-0' : 'translate-y-full'
                }`}>
                <div className="bg-gray-900/95 backdrop-blur-sm border-t border-gray-700/50 rounded-t-2xl shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-around px-2 py-3">
                        {MOBILE_NAV_ITEMS.map(item => {
                            const Icon = item.icon;
                            const isActive = activeView === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelect(item.id)}
                                    className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${
                                        isActive
                                            ? 'bg-indigo-600/20 text-indigo-400'
                                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                                    }`}
                                    aria-label={item.label}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <Icon className={`w-6 h-6 ${isActive ? 'text-indigo-400' : ''}`} />
                                    <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center justify-between px-4 pb-4 border-t border-gray-700/30">
                        <button
                            onClick={() => setIsPaletteOpen(true)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all"
                            aria-label="Command Palette (Ctrl+K)"
                        >
                            <MenuIcon className="w-4 h-4" />
                            <span className="text-sm">Command</span>
                        </button>
                        <button
                            onClick={() => {
                                setActiveView('notes');
                                setTimeout(() => window.dispatchEvent(new CustomEvent('open-property-palette')), 100);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-all border border-gray-700"
                            aria-label="Quick Capture"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span className="text-sm">Capture</span>
                        </button>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div
                    className="fixed inset-0 z-40 md:hidden bg-black/50"
                    onClick={onToggle}
                    aria-hidden="true"
                />
            )}
        </>
    );
}