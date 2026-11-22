import React, {useRef} from 'react';
import type {SettingsTab} from '@notention/core';
import {SETTINGS_GROUPS} from '../../config/uiSurfaces';
import {cn} from '../../utils/ui';

interface SettingsDirectoryProps {
    value: SettingsTab;
    onSelect: (id: SettingsTab) => void;
    rtl?: boolean;
    className?: string;
}

/** The settings directory owns only the list of sections, never the panel. */
export function SettingsDirectory({value, onSelect, rtl = false, className}: SettingsDirectoryProps) {
    const tabRefs = useRef(new Map<SettingsTab, HTMLButtonElement>());
    const tabs = SETTINGS_GROUPS.flatMap(group => group.tabs);
    const current = tabs.findIndex(tab => tab.id === value);

    const select = (id: SettingsTab) => {
        onSelect(id);
        tabRefs.current.get(id)?.focus();
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        const next =
            event.key === 'ArrowDown' || event.key === 'ArrowRight' ? current + 1 :
            event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? current - 1 :
            event.key === 'Home' ? 0 :
            event.key === 'End' ? tabs.length - 1 : -1;
        if (next < 0) return;
        event.preventDefault();
        select(tabs[(next + tabs.length) % tabs.length].id);
    };

    return (
        <nav aria-label="Settings sections" className={cn('min-h-0 overflow-y-auto custom-scrollbar', className)}>
            <div role="tablist" aria-orientation="vertical" onKeyDown={handleKeyDown}>
                {SETTINGS_GROUPS.map(group => (
                    <div key={group.id} className="mb-4">
                        <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-faint)]">
                            {group.label}
                        </div>
                        <div className="space-y-0.5">
                            {group.tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    ref={(element) => {
                                        if (element) tabRefs.current.set(tab.id, element);
                                        else tabRefs.current.delete(tab.id);
                                    }}
                                    type="button"
                                    role="tab"
                                    id={`settings-tab-${tab.id}`}
                                    aria-selected={value === tab.id}
                                    aria-controls={`settings-panel-${tab.id}`}
                                    tabIndex={value === tab.id ? 0 : -1}
                                    onClick={() => select(tab.id)}
                                    className={cn(
                                        'flex h-8 w-full items-center rounded-md px-2 text-[13px] transition-colors',
                                        rtl ? 'text-right' : 'text-left',
                                        value === tab.id
                                            ? 'bg-[var(--app-raised)] font-medium text-[var(--app-text)]'
                                            : 'text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-secondary)]'
                                    )}
                                >
                                    <span className="truncate">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </nav>
    );
}
