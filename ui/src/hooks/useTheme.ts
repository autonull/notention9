import { useEffect } from 'react';
import { useSettings } from './useSettingsContext';

export function useTheme() {
    const { settings } = useSettings();

    // Apply theme
    useEffect(() => {
        const theme = settings.theme ?? 'system';
        const root = document.documentElement;

        root.removeAttribute('data-theme');
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            // Let CSS media queries handle it
        } else if (theme === 'light') {
            root.setAttribute('data-theme', 'light');
            root.classList.add('light');
        } else if (theme === 'dark') {
            root.setAttribute('data-theme', 'dark');
            root.classList.add('dark');
        }
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
    root.removeAttribute('data-theme');
    root.classList.remove('light', 'dark');
    if (theme === 'light') {
        root.setAttribute('data-theme', 'light');
        root.classList.add('light');
    } else if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
        root.classList.add('dark');
    }

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