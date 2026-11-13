import {useState} from 'react';
import {useSettings} from './useSettingsContext';

export type SettingsTab = 'ai' | 'automation' | 'labels' | 'network' | 'nostr' | 'data' | 'metrics' | 'profile' | 'revisions';

export function useSettingsView() {
    const {settings, setSettings} = useSettings();
    const [activeTab, setActiveTab] = useState<SettingsTab>('ai');

    return {
        settings,
        setSettings,
        activeTab,
        setActiveTab,
    };
};
