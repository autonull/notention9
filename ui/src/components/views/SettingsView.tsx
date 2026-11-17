import React, {useState} from 'react';
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
import {CollapsibleSection} from '../ui/CollapsibleSection';
import {SparklesIcon, BoltIcon, TagIcon, GlobeIcon, KeyIcon, CubeIcon, ChartBarIcon, UserGroupIcon, ClockIcon, ShieldIcon, InboxIcon} from '../ui/icons';

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
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        general: true,
        aiAutomation: true,
        networkIdentity: true,
        dataMetrics: true,
    });

    const groups: SettingsGroup[] = [
        {
            id: 'general',
            label: 'General',
            icon: <UserGroupIcon className="h-5 w-5" />,
            tabs: [
                {id: 'profile', label: 'Profile & Strategies', icon: <UserGroupIcon className="h-4 w-4" />},
                {id: 'labels', label: 'Labels', icon: <TagIcon className="h-4 w-4" />},
                {id: 'language', label: 'Language & Region', icon: <GlobeIcon className="h-4 w-4" />},
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
            default:
                return null;
        }
    };

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-950 flex flex-col">
            <div
                className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-1 tracking-tight">Settings</h2>
                    <p className="text-gray-500 text-sm font-medium">Preferences and network data.</p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {groups.map((group) => (
                    <CollapsibleSection
                        key={group.id}
                        title={group.label}
                        icon={group.icon}
                        defaultOpen={expandedGroups[group.id]}
                        onToggle={(open) => setExpandedGroups(prev => ({...prev, [group.id]: open}))}
                        className="bg-gray-900/50 border border-gray-700/50 rounded-xl"
                    >
                        <div className="space-y-2 pt-2">
                            {group.tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-3',
                                        isRTL ? 'text-right' : 'text-left',
                                        activeTab === tab.id
                                            ? `bg-blue-900/30 text-blue-400 ${isRTL ? 'border-r-2 border-blue-500 pr-1' : 'border-l-2 border-blue-500 pl-1'}`
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                    )}
                                    aria-current={activeTab === tab.id ? 'page' : undefined}
                                >
                                    {tab.icon && <span className="flex-shrink-0 w-5 h-5" aria-hidden="true">{tab.icon}</span>}
                                    <span className={`flex-1 truncate ${isRTL ? 'text-right' : 'text-left'}`}>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </CollapsibleSection>
                ))}
            </div>

            <div className="flex-grow mt-6 pt-6 border-t border-gray-700/50 animate-fade-in">
                {renderTabContent()}
            </div>
        </div>
    );
}