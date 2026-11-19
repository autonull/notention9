import React, {useRef, useState} from 'react';
import {cn} from '../../utils/ui';

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
import {SparklesIcon, BoltIcon, TagIcon, GlobeIcon, KeyIcon, CubeIcon, ChartBarIcon, UserGroupIcon, ClockIcon, ShieldIcon, InboxIcon, NetworkIcon} from '../ui/icons';

interface SettingsGroup {
    id: string;
    label: string;
    icon: React.ReactNode;
    tabs: Array<{
        id: string;
        label: string;
        icon?: React.ReactNode;
    }>;
}

export function SettingsView() {
    const {
        settings,
        setSettings,
    } = useSettingsView();
    const direction = useDirection();
    const isRTL = direction === 'rtl';

    const [activeTab, setActiveTab] = useState('ai');
    const tabRefs = useRef(new Map<string, HTMLButtonElement>());

    const groups: SettingsGroup[] = [
        {
            id: 'general',
            label: 'General',
            icon: <UserGroupIcon className="h-5 w-5" />,
            tabs: [
                {id: 'profile', label: 'Profile & Strategies', icon: <UserGroupIcon className="h-4 w-4" />},
                {id: 'labels', label: 'Labels', icon: <TagIcon className="h-4 w-4" />},
                {id: 'language', label: 'Language & Region', icon: <GlobeIcon className="h-4 w-4" />},
                {id: 'shortcuts', label: 'Keyboard Shortcuts', icon: <KeyIcon className="h-4 w-4" />},
            ],
        },
        {
            id: 'aiAutomation',
            label: 'AI & Automation',
            icon: <SparklesIcon className="h-5 w-5" />,
            tabs: [
                {id: 'ai', label: 'AI Assistant', icon: <SparklesIcon className="h-4 w-4" />},
                {id: 'automation', label: 'Automation', icon: <BoltIcon className="h-4 w-4" />},
                {id: 'matchDigest', label: 'Match Digest', icon: <InboxIcon className="h-4 w-4" />},
            ],
        },
        {
            id: 'networkIdentity',
            label: 'Network & Identity',
            icon: <GlobeIcon className="h-5 w-5" />,
            tabs: [
                {id: 'network', label: 'Networks', icon: <GlobeIcon className="h-4 w-4" />},
                {id: 'nostr', label: 'Nostr Keys', icon: <KeyIcon className="h-4 w-4" />},
                {id: 'sync', label: 'Sync', icon: <NetworkIcon className="h-4 w-4" />},
                {id: 'relayDiscovery', label: 'Relay Discovery', icon: <NetworkIcon className="h-4 w-4" />},
            ],
        },
        {
            id: 'dataMetrics',
            label: 'Data & Metrics',
            icon: <CubeIcon className="h-5 w-5" />,
            tabs: [
                {id: 'data', label: 'Data Management', icon: <CubeIcon className="h-4 w-4" />},
                {id: 'metrics', label: 'Metrics', icon: <ChartBarIcon className="h-4 w-4" />},
                {id: 'revisions', label: 'Revisions', icon: <ClockIcon className="h-4 w-4" />},
            ],
        },
        {
            id: 'accessibility',
            label: 'Accessibility',
            icon: <ShieldIcon className="h-5 w-5" />,
            tabs: [
                {id: 'accessibility', label: 'Accessibility', icon: <ShieldIcon className="h-4 w-4" />},
            ],
        },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'ai':
                return <AITab settings={settings} setSettings={setSettings}/>;
            case 'automation':
                return <AutomationTab/>;
            case 'matchDigest':
                return <MatchDigestTab/>;
            case 'labels':
                return <LabelsTab/>;
            case 'network':
                return <NetworkManagementSection/>;
            case 'nostr':
                return <NostrTab settings={settings} setSettings={setSettings}/>;
            case 'data':
                return <DataTab/>;
            case 'metrics':
                return <MetricsTab/>;
            case 'profile':
                return <ProfileSettings/>;
            case 'language':
                return <LanguageTab/>;
            case 'revisions':
                return <RevisionsTab userId="default-user"/>;
            case 'accessibility':
                return <AccessibilityTab/>;
            case 'shortcuts':
                return <ShortcutsTab/>;
            case 'sync':
                return <SyncTab/>;
            case 'relayDiscovery':
                return <RelayDiscoverySection/>;
            default:
                return null;
        }
    };

    const tabs = groups.flatMap(group => group.tabs);
    const activeLabel = tabs.find(tab => tab.id === activeTab)?.label ?? 'Settings';

    const selectTab = (id: string) => {
        setActiveTab(id);
        tabRefs.current.get(id)?.focus();
    };

    const handleTabKeyDown = (event: React.KeyboardEvent) => {
        const index = tabs.findIndex(tab => tab.id === activeTab);
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
        <div className="p-4 md:p-6 h-full overflow-y-auto lg:overflow-hidden bg-gray-950 flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2 shrink-0">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Settings</h2>
                    <p className="text-gray-400 text-sm font-medium">Preferences and network data.</p>
                </div>
            </div>

            <label className="lg:hidden mb-3">
                <span className="block text-xs uppercase font-bold text-gray-400 mb-1 tracking-wider">Section</span>
                <select
                    value={activeTab}
                    onChange={(event) => setActiveTab(event.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                    {groups.map(group => (
                        <optgroup key={group.id} label={group.label}>
                            {group.tabs.map(tab => (
                                <option key={tab.id} value={tab.id}>{tab.label}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </label>

            <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
                <nav aria-label="Settings sections" className="hidden lg:block lg:overflow-y-auto custom-scrollbar pr-1">
                    <div role="tablist" aria-orientation="vertical" onKeyDown={handleTabKeyDown} className="space-y-3">
                        {groups.map((group) => (
                            <div key={group.id}>
                                <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                    {group.label}
                                </p>
                                <div className="space-y-1">
                                    {group.tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            ref={(element) => {
                                                if (element) tabRefs.current.set(tab.id, element);
                                                else tabRefs.current.delete(tab.id);
                                            }}
                                            role="tab"
                                            id={`settings-tab-${tab.id}`}
                                            aria-selected={activeTab === tab.id}
                                            aria-controls={`settings-panel-${tab.id}`}
                                            tabIndex={activeTab === tab.id ? 0 : -1}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                'w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-3',
                                                isRTL ? 'text-right' : 'text-left',
                                                activeTab === tab.id
                                                    ? `bg-blue-900/30 text-blue-400 ${isRTL ? 'border-r-2 border-blue-500 pr-1' : 'border-l-2 border-blue-500 pl-1'}`
                                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                            )}
                                        >
                                            {tab.icon && <span className="flex-shrink-0 w-5 h-5" aria-hidden="true">{tab.icon}</span>}
                                            <span className={`flex-1 truncate ${isRTL ? 'text-right' : 'text-left'}`}>{tab.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </nav>

                <section
                    role="tabpanel"
                    id={`settings-panel-${activeTab}`}
                    aria-labelledby={`settings-tab-${activeTab}`}
                    aria-label={activeLabel}
                    className="min-w-0 lg:overflow-y-auto custom-scrollbar animate-fade-in"
                >
                    {renderTabContent()}
                </section>
            </div>
        </div>
    );
}