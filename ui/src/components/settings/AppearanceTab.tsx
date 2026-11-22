import React from 'react';
import { useSettings } from '../../hooks/useSettingsContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ChoiceGrid } from '../ui/kit';
import { SettingsSection } from '../patterns/SettingsSection';
import { SunIcon, MoonIcon, MonitorIcon, MinimizeIcon, MaximizeIcon } from '../../components/ui/icons';
import { cn } from '../../utils/ui';

const ACCENT_COLORS = [
    { name: 'Violet', value: '#6366f1' },
    { name: 'Blue', value: '#2563eb' },
    { name: 'Teal', value: '#0d9488' },
    { name: 'Green', value: '#16a34a' },
    { name: 'Amber', value: '#d97706' },
    { name: 'Orange', value: '#ea580c' },
    { name: 'Rose', value: '#e11d48' },
    { name: 'Pink', value: '#db2777' },
];

const THEMES = [
    { id: 'light' as const, label: 'Light', icon: SunIcon },
    { id: 'dark' as const, label: 'Dark', icon: MoonIcon },
    { id: 'system' as const, label: 'System', icon: MonitorIcon },
];

const DENSITIES = [
    { id: 'comfortable' as const, label: 'Comfortable', description: 'More breathing room', icon: MaximizeIcon },
    { id: 'compact' as const, label: 'Compact', description: 'Fit more on screen', icon: MinimizeIcon },
];

export function AppearanceTab() {
    const { settings, setSettings } = useSettings();
    const theme = settings.theme ?? 'system';
    const density = settings.density ?? 'comfortable';
    const accentColor = settings.accentColor ?? '#6366f1';

    const set = (patch: Partial<typeof settings>) => setSettings({ ...settings, ...patch });

    return (
        <div className="space-y-8">
            <SettingsSection
                title="Theme"
                description="System follows your operating system setting."
            >
                <ChoiceGrid
                    options={THEMES}
                    value={theme}
                    onChange={(value) => set({ theme: value })}
                    columns={3}
                    label="Theme"
                />
                <p className="text-[11px] text-[var(--app-faint)]">
                    System preference:{' '}
                    <span className="font-medium text-[var(--app-muted)]">
                        {window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'}
                    </span>
                    {theme === 'system' && ' · active'}
                </p>
                        </SettingsSection>

            <SettingsSection
                title="Density"
                description="Adjust spacing and control size across the workspace."
            >
                <ChoiceGrid
                    options={DENSITIES}
                    value={density}
                    onChange={(value) => set({ density: value })}
                    label="Density"
                />
                        </SettingsSection>

            <SettingsSection
                title="Accent"
                description="Used for selection, primary actions, and focus."
            >
                <div className="flex flex-wrap items-center gap-2">
                    {ACCENT_COLORS.map(color => {
                        const selected = accentColor.toLowerCase() === color.value.toLowerCase();
                        return (
                            <button
                                key={color.value}
                                type="button"
                                onClick={() => set({ accentColor: color.value })}
                                title={color.name}
                                aria-label={color.name}
                                aria-pressed={selected}
                                className={cn(
                                    'grid h-8 w-8 place-items-center rounded-full border-2 transition-transform',
                                    selected
                                        ? 'scale-105 border-[var(--app-text)]'
                                        : 'border-transparent hover:scale-105'
                                )}
                                style={{ backgroundColor: color.value }}
                            >
                                {selected && (
                                    <svg className="h-4 w-4 text-[var(--app-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="custom-accent" className="text-[12px] text-[var(--app-muted)]">Custom</label>
                    <input
                        id="custom-accent"
                        type="color"
                        value={accentColor}
                        onChange={(event) => set({ accentColor: event.target.value })}
                        className="h-8 w-8 cursor-pointer rounded-md border border-[var(--app-line)] bg-transparent"
                        aria-label="Custom accent color"
                    />
                    <input
                        type="text"
                        value={accentColor}
                        onChange={(event) => {
                            const value = event.target.value;
                            if (/^#[0-9a-fA-F]{6}$/.test(value)) set({ accentColor: value });
                        }}
                        onBlur={(event) => {
                            if (!/^#[0-9a-fA-F]{6}$/.test(event.target.value)) {
                                event.target.value = accentColor;
                            }
                        }}
                        className="h-8 w-24 rounded-md border border-[var(--app-line)] bg-[var(--app-surface)] px-2 font-mono text-[12px] text-[var(--app-text-secondary)] focus:border-[var(--app-accent-line)] focus:outline-none"
                        placeholder="#RRGGBB"
                        aria-label="Custom accent color hex"
                    />
                </div>
                        </SettingsSection>

            <SettingsSection title="Preview" description="Live examples using the current settings.">
                <div className="space-y-4 rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm">Primary</Button>
                        <Button size="sm" variant="secondary">Secondary</Button>
                        <Button size="sm" variant="ghost">Ghost</Button>
                        <Button size="sm" disabled>Disabled</Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Input placeholder="Text input" className="w-48" />
                        <Select className="w-40">
                            <option>Select option</option>
                            <option>Option 1</option>
                            <option>Option 2</option>
                        </Select>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 text-[12px] text-[var(--app-text-secondary)]">
                            <input type="checkbox" className="h-3.5 w-3.5 accent-[var(--app-accent)]" defaultChecked />
                            Checkbox
                        </label>
                        <label className="flex items-center gap-2 text-[12px] text-[var(--app-text-secondary)]">
                            <input type="radio" className="h-3.5 w-3.5 accent-[var(--app-accent)]" defaultChecked />
                            Radio
                        </label>
                        <label className="flex items-center gap-2 text-[12px] text-[var(--app-text-secondary)]">
                            <input type="checkbox" role="switch" className="h-3.5 w-3.5 accent-[var(--app-accent)]" />
                            Toggle
                        </label>
                    </div>
                </div>
            </SettingsSection>
        </div>
    );
}
