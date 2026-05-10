import {useState} from 'react';
import {useSettings} from './useSettingsContext';

export type SettingsTab = 'ai' | 'nostr' | 'data' | 'ontology';

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
