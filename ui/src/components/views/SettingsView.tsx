import React, {useMemo, useRef} from 'react';
import {cn} from '../../utils/ui';

import {useView} from '../../hooks/useViewContext';
import {useSettingsView} from '../../hooks/useSettingsView';
import {useDirection} from '../../hooks/useI18n';
import {AITab} from '../settings/AITab';
import {DataTab} from '../settings/DataTab';
import {MetricsTab} from '../settings/MetricsTab';
import {NostrTab} from '../settings/NostrTab';
import {LabelsTab} from '../settings/LabelsTab';
import {AutomationTab} from '../settings/AutomationTab';
import {MatchDigestTab} from '../settings/MatchDigestTab';
import {NetworkManagementSection} from '../settings/NetworkManagementSection';
import {ProfileSettings} from '../settings/ProfileSettings';
import {RevisionsTab} from '../settings/RevisionsTab';
import {AccessibilityTab} from '../settings/AccessibilityTab';
import {LanguageTab} from '../settings/LanguageTab';
import {ShortcutsTab} from '../settings/ShortcutsTab';
import {SyncTab} from '../settings/SyncTab';
import {RelayDiscoverySection} from '../settings/RelayDiscoverySection';
import {AppearanceTab} from '../settings/AppearanceTab';
import {OntologyView} from './OntologyView';
import {SkillManagementView} from '../skills';
import type {SettingsTab} from '@notention/core';
import {SETTINGS_GROUPS} from '../../config/uiSurfaces';

const GROUPS = SETTINGS_GROUPS;

export function SettingsView() {
    const {settings, setSettings} = useSettingsView();
    const direction = useDirection();
    const isRTL = direction === 'rtl';
    const {settingsTab, setSettingsTab, setActiveView} = useView();
    const tabRefs = useRef(new Map<SettingsTab, HTMLButtonElement>());

    const tabs = useMemo(() => GROUPS.flatMap(group => group.tabs), []);
    const activeLabel = tabs.find(tab => tab.id === settingsTab)?.label ?? 'Settings';

    const selectTab = (id: SettingsTab) => {
        setSettingsTab(id);
        setActiveView('settings');
        tabRefs.current.get(id)?.focus();
    };

    const renderTabContent = () => {
        switch (settingsTab) {
            case 'ai': return <AITab settings={settings} setSettings={setSettings}/>;
            case 'automation': return <AutomationTab/>;
            case 'matchDigest': return <MatchDigestTab/>;
            case 'labels': return <LabelsTab/>;
            case 'network': return <NetworkManagementSection/>;
            case 'nostr': return <NostrTab settings={settings} setSettings={setSettings}/>;
            case 'data': return <DataTab/>;
            case 'metrics': return <MetricsTab/>;
            case 'general': return <ProfileSettings/>;
            case 'appearance': return <AppearanceTab/>;
            case 'language': return <LanguageTab/>;
            case 'revisions': return <RevisionsTab userId="default-user"/>;
            case 'accessibility': return <AccessibilityTab/>;
            case 'shortcuts': return <ShortcutsTab/>;
            case 'sync': return <SyncTab/>;
            case 'relayDiscovery': return <RelayDiscoverySection settings={settings} setSettings={setSettings}/>;
            case 'skills': return <SkillManagementView/>;
            case 'ontology': return <OntologyView/>;
            default: return null;
        }
    };

    const handleTabKeyDown = (event: React.KeyboardEvent) => {
        const index = tabs.findIndex(tab => tab.id === settingsTab);
        const next =
            event.key === 'ArrowDown' || event.key === 'ArrowRight' ? (index + 1) % tabs.length :
            event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length :
            event.key === 'Home' ? 0 :
            event.key === 'End' ? tabs.length - 1 : -1;
        if (next < 0) return;
        event.preventDefault();
        selectTab(tabs[next].id);
    };

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[var(--app-bg)]">
            <div className="mx-auto flex min-h-0 w-full max-w-[1120px] flex-1 flex-col px-4 md:px-6">
                <label className="mb-3 pt-4 md:mb-4 md:pt-5 lg:hidden">
                    <span className="mb-1 block text-[11px] font-medium text-[var(--app-muted)]">Section</span>
                    <select
                        value={settingsTab}
                        onChange={(event) => selectTab(event.target.value as SettingsTab)}
                        className="h-9 w-full rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] px-2.5 text-[13px] text-[var(--app-text)] focus:border-[var(--app-accent-line)] focus:outline-none"
                    >
                        {GROUPS.map(group => (
                            <optgroup key={group.id} label={group.label}>
                                {group.tabs.map(tab => (
                                    <option key={tab.id} value={tab.id}>{tab.label}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </label>

                <div className="grid min-h-0 flex-1 gap-6 pb-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
                    <nav aria-label="Settings sections" className="hidden lg:block lg:overflow-y-auto custom-scrollbar">
                        <div role="tablist" aria-orientation="vertical" onKeyDown={handleTabKeyDown}>
                            {GROUPS.map(group => (
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
                                                role="tab"
                                                id={`settings-tab-${tab.id}`}
                                                aria-selected={settingsTab === tab.id}
                                                aria-controls={`settings-panel-${tab.id}`}
                                                tabIndex={settingsTab === tab.id ? 0 : -1}
                                                onClick={() => selectTab(tab.id)}
                                                className={cn(
                                                    'flex h-8 w-full items-center rounded-md px-2 text-[13px] transition-colors',
                                                    isRTL ? 'text-right' : 'text-left',
                                                    settingsTab === tab.id
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

                    <section
                        role="tabpanel"
                        id={`settings-panel-${settingsTab}`}
                        aria-labelledby={`settings-tab-${settingsTab}`}
                        aria-label={activeLabel}
                        className="min-w-0 max-w-[840px] overflow-y-auto pb-10 custom-scrollbar"
                    >
                        {renderTabContent()}
                    </section>
                </div>
            </div>
        </div>
    );
}
