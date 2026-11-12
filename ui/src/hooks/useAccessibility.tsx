import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocalForage } from './useLocalForage';

export interface AccessibilitySettings {
    reducedMotion: boolean;
    highContrast: boolean;
    screenReaderOptimized: boolean;
    keyboardNavigation: boolean;
    fontSize: 'small' | 'medium' | 'large';
    focusIndicator: boolean;
    announceChanges: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
    reducedMotion: false,
    highContrast: false,
    screenReaderOptimized: false,
    keyboardNavigation: true,
    fontSize: 'medium',
    focusIndicator: true,
    announceChanges: true,
};

const STORAGE_KEY = 'notention-accessibility';

interface AccessibilityContextValue {
    settings: AccessibilitySettings;
    updateSetting: <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => void;
    resetSettings: () => void;
    announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
    const [loaded, setLoaded] = useState(false);
    const { getItem, setItem } = useLocalForage<AccessibilitySettings>(STORAGE_KEY, DEFAULT_SETTINGS);

    useEffect(() => {
        getItem().then((stored) => {
            if (stored) {
                setSettings(stored);
            }
            setLoaded(true);
        });
    }, [getItem]);

    useEffect(() => {
        if (loaded) {
            setItem(settings);
            applySettings(settings);
        }
    }, [settings, loaded, setItem]);

    const applySettings = (newSettings: AccessibilitySettings) => {
        const root = document.documentElement;
        
        // Reduced motion
        if (newSettings.reducedMotion) {
            root.classList.add('reduce-motion');
        } else {
            root.classList.remove('reduce-motion');
        }

        // High contrast
        if (newSettings.highContrast) {
            root.classList.add('high-contrast');
        } else {
            root.classList.remove('high-contrast');
        }

        // Screen reader optimized
        if (newSettings.screenReaderOptimized) {
            root.classList.add('screen-reader-optimized');
        } else {
            root.classList.remove('screen-reader-optimized');
        }

        // Font size
        root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
        root.classList.add(`font-size-${newSettings.fontSize}`);

        // Focus indicator
        if (newSettings.focusIndicator) {
            root.classList.add('focus-visible-ring');
        } else {
            root.classList.remove('focus-visible-ring');
        }
    };

    const updateSetting = useCallback(<K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    const resetSettings = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
    }, []);

    const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        if (!settings.announceChanges) return;

        const announcer = document.getElementById('a11y-announcer');
        if (announcer) {
            announcer.setAttribute('aria-live', priority);
            announcer.textContent = '';
            // Force reflow
            void announcer.offsetWidth;
            announcer.textContent = message;
        }
    }, [settings.announceChanges]);

    // Create live region announcer if it doesn't exist
    useEffect(() => {
        if (!document.getElementById('a11y-announcer')) {
            const announcer = document.createElement('div');
            announcer.id = 'a11y-announcer';
            announcer.setAttribute('role', 'status');
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.className = 'sr-only';
            document.body.appendChild(announcer);
        }
    }, []);

    return (
        <AccessibilityContext.Provider value={{ settings, updateSetting, resetSettings, announce }}>
            {children}
        </AccessibilityContext.Provider>
    );
}

export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (!context) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
}

export function useReducedMotion() {
    const { settings } = useAccessibility();
    return settings.reducedMotion;
}

export function useHighContrast() {
    const { settings } = useAccessibility();
    return settings.highContrast;
}

export function useScreenReaderOptimized() {
    const { settings } = useAccessibility();
    return settings.screenReaderOptimized;
}

export function useFontSize() {
    const { settings } = useAccessibility();
    return settings.fontSize;
}