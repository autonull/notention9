import React, { useMemo, useState, useEffect } from 'react';

import { useView } from '../../hooks/useViewContext';
import { useSettingsView } from '../../hooks/useSettingsView';
import { useDirection } from '../../hooks/useI18n';
import { AITab } from '../settings/AITab';
import { DataTab } from '../settings/DataTab';
import { MetricsTab } from '../settings/MetricsTab';
import { NostrTab } from '../settings/NostrTab';
import { LabelsTab } from '../settings/LabelsTab';
import { AutomationTab } from '../settings/AutomationTab';
import { MatchDigestTab } from '../settings/MatchDigestTab';
import { NetworkManagementSection } from '../settings/NetworkManagementSection';
import { ProfileSettings } from '../settings/ProfileSettings';
import { RevisionsTab } from '../settings/RevisionsTab';
import { AccessibilityTab } from '../settings/AccessibilityTab';
import { LanguageTab } from '../settings/LanguageTab';
import { ShortcutsTab } from '../settings/ShortcutsTab';
import { SyncTab } from '../settings/SyncTab';
import { RelayDiscoverySection } from '../settings/RelayDiscoverySection';
import { AppearanceTab } from '../settings/AppearanceTab';
import { OntologyView } from './OntologyView';
import { SkillManagementView } from '../skills';
import type { SettingsTab } from '@notention/core';
import { SETTINGS_GROUPS } from '../../config/uiSurfaces';
import { SettingsDirectory } from '../settings/SettingsDirectory';
import { SettingsWizard } from '../settings/SettingsWizard';
import { useSettings } from '../../hooks/useSettingsContext';

const TABS = SETTINGS_GROUPS.flatMap(group => group.tabs);
const FIRST_RUN_KEY = 'notention:settings:wizard:completed';

export function SettingsView() {
    const { settings, setSettings } = useSettingsView();
    const { settings: allSettings, setSettings: setAllSettings } = useSettings();
    const isRTL = useDirection() === 'rtl';
    const { settingsTab, setSettingsTab, setActiveView } = useView();
    const [showWizard, setShowWizard] = useState(false);

    const activeLabel = useMemo(
        () => TABS.find(tab => tab.id === settingsTab)?.label ?? 'Settings',
        [settingsTab]
    );

    useEffect(() => {
        const hasCompletedWizard = localStorage.getItem(FIRST_RUN_KEY);
        if (!hasCompletedWizard) {
            setShowWizard(true);
        }
    }, []);

    const selectTab = (id: SettingsTab) => {
        setSettingsTab(id);
        setActiveView('settings');
    };

    const handleWizardComplete = () => {
        localStorage.setItem(FIRST_RUN_KEY, 'true');
        setShowWizard(false);
    };

    const handleWizardSkip = () => {
        localStorage.setItem(FIRST_RUN_KEY, 'true');
        setShowWizard(false);
    };

    const renderTab = () => {
        if (showWizard) {
            return (
              <SettingsWizard 
                onComplete={handleWizardComplete} 
                onSkip={handleWizardSkip} 
              />
            );
        }
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
                        {SETTINGS_GROUPS.map(group => (
                            <optgroup key={group.id} label={group.label}>
                                {group.tabs.map(tab => (
                                    <option key={tab.id} value={tab.id}>{tab.label}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </label>

                <div className="grid min-h-0 flex-1 gap-6 pb-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
                    <SettingsDirectory
                        showWizard={showWizard}
                        onWizardComplete={handleWizardComplete}
                        onWizardSkip={handleWizardSkip}
                        className="hidden lg:block"
                    />

                    <section
                        role="tabpanel"
                        id={`settings-panel-${settingsTab}`}
                        aria-labelledby={`settings-tab-${settingsTab}`}
                        aria-label={activeLabel}
                        className="min-w-0 max-w-[840px] overflow-y-auto pb-10 custom-scrollbar"
                    >
                        {renderTab()}
                    </section>
                </div>
            </div>
        </div>
    );
}
