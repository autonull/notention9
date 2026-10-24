import React, {useEffect, useMemo} from 'react';
import {IconButton} from '../ui/Primitives';
import {useFocusTrap} from '../ui/Overlay';
import {XIcon, HelpIcon} from '../common/icons';
import {cn} from '../../utils/ui';
import {SHORTCUT_GROUPS, type ShortcutGroup} from '../../config/shortcuts';

interface KeyboardShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
    groups?: ShortcutGroup[];
}

export function KeyboardShortcutsHelp({
    isOpen,
    onClose,
    groups = SHORTCUT_GROUPS,
}: KeyboardShortcutsHelpProps) {
    const contentRef = useFocusTrap(isOpen, onClose);
    const platform = useMemo(() => {
        if (typeof navigator !== 'undefined') {
            return navigator.platform.includes('Mac') ? 'mac' : 'win';
        }
        return 'win';
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const formatKeys = (keys: string[]) => {
        if (platform === 'mac') {
            return keys.map(k => {
                if (k === '⌘') return '⌘';
                if (k === 'Ctrl') return 'Ctrl';
                if (k === 'Alt') return '⌥';
                if (k === 'Shift') return '⇧';
                return k;
            }).join(' + ');
        }
        return keys.map(k => {
            if (k === '⌘') return 'Ctrl';
            if (k === 'Ctrl') return 'Ctrl';
            if (k === 'Alt') return 'Alt';
            if (k === 'Shift') return 'Shift';
            return k;
        }).join(' + ');
    };

    return (
        <div
            className="fixed inset-0 z-[700] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="keyboard-shortcuts-title"
        >
            <div
                ref={contentRef}
                tabIndex={-1}
                className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-scale-in focus:outline-none"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400">
                            <HelpIcon className="w-6 h-6" />
                        </div>
                        <h2 id="keyboard-shortcuts-title" className="text-xl font-semibold text-white">
                            Keyboard Shortcuts
                        </h2>
                    </div>
                    <IconButton
                        onClick={onClose}
                        icon={XIcon}
                        variant="ghost"
                        size="md"
                        aria-label="Close shortcuts help"
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {groups.map((group) => (
                        <div key={group.category} className="mb-8">
                            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">
                                {group.category}
                            </h3>
                            <div className="space-y-2">
                                {group.shortcuts.map((shortcut, index) => (
                                    <div
                                        key={`${group.category}-${index}`}
                                        className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-700/50 transition-colors group"
                                        onClick={shortcut.action}
                                        role={shortcut.action ? 'button' : undefined}
                                        tabIndex={shortcut.action ? 0 : undefined}
                                        onKeyDown={(e) => {
                                            if (shortcut.action && (e.key === 'Enter' || e.key === ' ')) {
                                                e.preventDefault();
                                                shortcut.action();
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <span className="text-sm text-gray-300 truncate pr-4">
                                                {shortcut.label}
                                            </span>
                                            {shortcut.description && (
                                                <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                                                    {shortcut.description}
                                                </span>
                                            )}
                                        </div>
                                        <kbd className={cn(
                                            'flex-shrink-0 ml-4 text-[10px] font-mono px-2 py-1 rounded',
                                            'bg-gray-700 text-gray-400',
                                            'group-hover:bg-gray-600 group-hover:text-gray-200',
                                            'transition-colors',
                                            shortcut.global && 'ring-1 ring-blue-500/30'
                                        )}>
                                            {formatKeys(shortcut.keys)}
                                        </kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="pt-4 border-t border-gray-700/50">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400 font-mono">
                                {platform === 'mac' ? '⌘' : 'Ctrl'}
                            </span>
                            <span> = Command (Mac) / Control (Windows/Linux)</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                            Global shortcuts (marked with ring) work anywhere in the app.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}