import { useEffect } from 'react';
import { useSettings } from './useSettingsContext';

const systemPrefersDark = (): boolean =>
    typeof window === 'undefined' || !window.matchMedia
        ? true
        : window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyTheme = (theme: string | undefined, root: HTMLElement): void => {
    const effective = theme === 'system' || !theme ? (systemPrefersDark() ? 'dark' : 'light') : theme;
    root.setAttribute('data-theme', effective);
    root.classList.toggle('light', effective === 'light');
    root.classList.toggle('dark', effective === 'dark');
};

export function useTheme() {
    const { settings } = useSettings();

    // Apply theme
    useEffect(() => {
        const theme = settings.theme ?? 'system';
        const root = document.documentElement;
        applyTheme(theme, root);
        if (theme !== 'system') return;

        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => applyTheme(theme, root);
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, [settings.theme]);

    // Apply density
    useEffect(() => {
        const density = settings.density ?? 'comfortable';
        const root = document.documentElement;

        root.classList.remove('density-compact', 'density-comfortable');
        root.classList.add(`density-${density}`);
    }, [settings.density]);

    // Apply accent color
    useEffect(() => {
        const accentColor = settings.accentColor ?? '#404040';
        const root = document.documentElement;

        // Convert hex to RGB for CSS custom property
        const hex = accentColor.replace('#', '');
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);

        root.style.setProperty('--accent-color', accentColor);
        root.style.setProperty('--accent-color-rgb', `${r}, ${g}, ${b}`);

        // Compute hover/light/muted variants
        const lighten = (color: string, amount: number) => {
            const hex = color.replace('#', '');
            const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + Math.round(255 * amount));
            const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + Math.round(255 * amount));
            const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + Math.round(255 * amount));
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };

        const darken = (color: string, amount: number) => {
            const hex = color.replace('#', '');
            const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - Math.round(255 * amount));
            const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - Math.round(255 * amount));
            const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - Math.round(255 * amount));
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };

        root.style.setProperty('--accent-color-hover', darken(accentColor, 0.1));
        root.style.setProperty('--accent-color-light', lighten(accentColor, 0.15));
        root.style.setProperty('--accent-color-muted', darken(accentColor, 0.2));
    }, [settings.accentColor]);
}

export function initializeTheme(settings: { theme?: string; density?: string; accentColor?: string }) {
    const theme = settings.theme ?? 'system';
    const density = settings.density ?? 'comfortable';
    const accentColor = settings.accentColor ?? '#404040';

    const root = document.documentElement;

    // Theme
    applyTheme(theme, root);

    // Density
    root.classList.remove('density-compact', 'density-comfortable');
    root.classList.add(`density-${density}`);

    // Accent color
    const hex = accentColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    root.style.setProperty('--accent-color', accentColor);
    root.style.setProperty('--accent-color-rgb', `${r}, ${g}, ${b}`);

    const lighten = (color: string, amount: number) => {
        const hex = color.replace('#', '');
        const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + Math.round(255 * amount));
        const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + Math.round(255 * amount));
        const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + Math.round(255 * amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    const darken = (color: string, amount: number) => {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - Math.round(255 * amount));
        const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - Math.round(255 * amount));
        const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - Math.round(255 * amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    root.style.setProperty('--accent-color-hover', darken(accentColor, 0.1));
    root.style.setProperty('--accent-color-light', lighten(accentColor, 0.15));
    root.style.setProperty('--accent-color-muted', darken(accentColor, 0.2));
}