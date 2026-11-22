import React, {useEffect, useMemo, useRef, useState} from 'react';
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
import {SparklesIcon, BoltIcon, TagIcon, GlobeIcon, KeyIcon, CubeIcon, ChartBarIcon, UserGroupIcon, ClockIcon, ShieldIcon, InboxIcon, NetworkIcon, PaletteIcon, CogIcon, BookOpenIcon, ChevronRightIcon} from '../../components/ui/icons';
import type {SettingsTab} from '@notention/core';

interface SettingsGroup {
    id: string;
    label: string;
    icon: React.ReactNode;
    tabs: Array<{
        id: SettingsTab;
        label: string;
        icon?: React.ReactNode;
    }>;
}

const GROUPS: SettingsGroup[] = [
    {
        id: 'general',
        label: 'General',
        icon: <UserGroupIcon className="h-5 w-5"/>,
        tabs: [
            {id: 'general', label: 'General', icon: <CogIcon className="h-4 w-4"/>},
            {id: 'appearance', label: 'Appearance', icon: <PaletteIcon className="h-4 w-4"/>},
            {id: 'language', label: 'Language & Region', icon: <GlobeIcon className="h-4 w-4"/>},
            {id: 'shortcuts', label: 'Keyboard Shortcuts', icon: <KeyIcon className="h-4 w-4"/>},
            {id: 'accessibility', label: 'Accessibility', icon: <ShieldIcon className="h-4 w-4"/>},
        ],
    },
    {
        id: 'networkIdentity',
        label: 'Network & Identity',
        icon: <GlobeIcon className="h-5 w-5"/>,
        tabs: [
            {id: 'network', label: 'Networks', icon: <GlobeIcon className="h-4 w-4"/>},
            {id: 'nostr', label: 'Nostr Keys', icon: <KeyIcon className="h-4 w-4"/>},
            {id: 'sync', label: 'Sync', icon: <NetworkIcon className="h-4 w-4"/>},
            {id: 'relayDiscovery', label: 'Relay Discovery', icon: <NetworkIcon className="h-4 w-4"/>},
        ],
    },
    {
        id: 'aiAutomation',
        label: 'AI & Automation',
        icon: <SparklesIcon className="h-5 w-5"/>,
        tabs: [
            {id: 'ai', label: 'AI Assistant', icon: <SparklesIcon className="h-4 w-4"/>},
            {id: 'automation', label: 'Automation', icon: <BoltIcon className="h-4 w-4"/>},
            {id: 'matchDigest', label: 'Match Digest', icon: <InboxIcon className="h-4 w-4"/>},
        ],
    },
    {
        id: 'data',
        label: 'Data',
        icon: <CubeIcon className="h-5 w-5"/>,
        tabs: [
            {id: 'data', label: 'Data Management', icon: <CubeIcon className="h-4 w-4"/>},
            {id: 'metrics', label: 'Metrics', icon: <ChartBarIcon className="h-4 w-4"/>},
            {id: 'revisions', label: 'Revisions', icon: <ClockIcon className="h-4 w-4"/>},
        ],
    },
    {
        id: 'advanced',
        label: 'Advanced',
        icon: <BookOpenIcon className="h-5 w-5"/>,
        tabs: [
            {id: 'labels', label: 'Labels', icon: <TagIcon className="h-4 w-4"/>},
            {id: 'ontology', label: 'Ontology', icon: <BookOpenIcon className="h-4 w-4"/>},
            {id: 'skills', label: 'Skills', icon: <ShieldIcon className="h-4 w-4"/>},
        ],
    },
];

const groupForTab = (tab: SettingsTab): string =>
    GROUPS.find(group => group.tabs.some(item => item.id === tab))?.id ?? 'general';

export function SettingsView() {
    const {settings, setSettings} = useSettingsView();
    const direction = useDirection();
    const isRTL = direction === 'rtl';
    const {settingsTab, setSettingsTab, setActiveView} = useView();
    const [openGroup, setOpenGroup] = useState(() => groupForTab(settingsTab));
    const tabRefs = useRef(new Map<SettingsTab, HTMLButtonElement>());

    useEffect(() => {
        setOpenGroup(groupForTab(settingsTab));
    }, [settingsTab]);

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
        <div className="flex h-full flex-col overflow-hidden bg-neutral-950">
            <header className="shrink-0 px-4 pb-4 pt-5 md:px-6">
                <h1 className="text-h1 text-neutral-100">Settings</h1>
                <p className="mt-1 text-base text-neutral-400">Preferences and network data.</p>
            </header>

            <label className="mx-4 mb-3 md:mx-6 lg:hidden">
                <span className="mb-1 block text-sm font-medium text-neutral-400">Section</span>
                <select
                    value={settingsTab}
                    onChange={(event) => selectTab(event.target.value as SettingsTab)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-base text-neutral-100 focus:border-neutral-600 focus:outline-none"
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

            <div className="grid min-h-0 flex-1 gap-4 px-4 pb-6 md:px-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
                <nav aria-label="Settings sections" className="hidden lg:block lg:overflow-y-auto custom-scrollbar">
                    <div role="tablist" aria-orientation="vertical" onKeyDown={handleTabKeyDown} className="space-y-1">
                        {GROUPS.map(group => {
                            const open = openGroup === group.id;
                            return (
                                <div key={group.id} className="rounded-xl">
                                    <button
                                        type="button"
                                        aria-expanded={open}
                                        onClick={() => setOpenGroup(open ? '' : group.id)}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-meta font-medium text-neutral-300 hover:bg-neutral-900',
                                            isRTL ? 'text-right' : 'text-left'
                                        )}
                                    >
                                        <span className="h-5 w-5 shrink-0 text-neutral-400" aria-hidden="true">{group.icon}</span>
                                        <span className="flex-1 truncate">{group.label}</span>
                                        <ChevronRightIcon className={cn('h-4 w-4 text-neutral-400 transition-transform', open && 'rotate-90')}/>
                                    </button>
                                    {open && (
                                        <div className="mt-1 space-y-0.5 pl-3">
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
                                                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-ui transition-colors',
                                                        isRTL ? 'text-right' : 'text-left',
                                                        settingsTab === tab.id
                                                            ? 'bg-neutral-800 text-neutral-100'
                                                            : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-300'
                                                    )}
                                                >
                                                    {tab.icon && <span className="h-4 w-4 shrink-0" aria-hidden="true">{tab.icon}</span>}
                                                    <span className="truncate">{tab.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </nav>

                <section
                    role="tabpanel"
                    id={`settings-panel-${settingsTab}`}
                    aria-labelledby={`settings-tab-${settingsTab}`}
                    aria-label={activeLabel}
                    className="min-w-0 overflow-y-auto custom-scrollbar"
                >
                    {renderTabContent()}
                </section>
            </div>
        </div>
    );
}
