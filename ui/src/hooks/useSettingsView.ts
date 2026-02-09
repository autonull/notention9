import {useState} from 'react';
import {useSettings} from './useSettingsContext';

export type SettingsTab = 'ai' | 'nostr' | 'data' | 'ontology';

export const useSettingsView = () => {
    const {settings, setSettings} = useSettings();
    const [activeTab, setActiveTab] = useState<SettingsTab>('ai');

    const toggleDeveloperMode = () => {
        setSettings((prev) => ({...prev, developerMode: !prev.developerMode}));
    };

    return {
        settings,
        setSettings,
        activeTab,
        setActiveTab,
        toggleDeveloperMode,
    };
};
