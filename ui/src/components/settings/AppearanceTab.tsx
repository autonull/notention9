import React from 'react';
import { useSettings } from '../../hooks/useSettingsContext';
import { Toggle } from '../ui/Toggle';
import { PaletteIcon, MinimizeIcon, MaximizeIcon, SunIcon, MoonIcon, MonitorIcon } from '../../components/ui/icons';
import { cn } from '../../utils/ui';

const ACCENT_COLORS = [
    { name: 'Blue', value: '#2563eb' },
    { name: 'Violet', value: '#7c3aed' },
    { name: 'Green', value: '#16a34a' },
    { name: 'Orange', value: '#ea580c' },
    { name: 'Red', value: '#dc2626' },
    { name: 'Cyan', value: '#0891b2' },
    { name: 'Pink', value: '#db2777' },
    { name: 'Amber', value: '#d97706' },
];

export function AppearanceTab() {
    const { settings, setSettings } = useSettings();

    const theme = settings.theme ?? 'system';
    const density = settings.density ?? 'comfortable';
    const accentColor = settings.accentColor ?? '#2563eb';

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        setSettings({ ...settings, theme: newTheme });
    };

    const handleDensityChange = (newDensity: 'compact' | 'comfortable') => {
        setSettings({ ...settings, density: newDensity });
    };

    const handleAccentColorChange = (newAccentColor: string) => {
        setSettings({ ...settings, accentColor: newAccentColor });
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Theme</h3>
                <p className="text-gray-500 text-sm mb-4">
                    Choose your preferred color scheme. System follows your OS setting.
                </p>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { id: 'light', label: 'Light', icon: <SunIcon className="w-5 h-5" /> },
                        { id: 'dark', label: 'Dark', icon: <MoonIcon className="w-5 h-5" /> },
                        { id: 'system', label: 'System', icon: <MonitorIcon className="w-5 h-5" /> },
                    ].map((option) => (
                        <button
                            key={option.id}
                            onClick={() => handleThemeChange(option.id as 'light' | 'dark' | 'system')}
                            className={cn(
                                'p-4 rounded-lg border-2 transition-all duration-150 flex flex-col items-center gap-2',
                                theme === option.id
                                    ? 'border-blue-500 bg-blue-900/30 text-blue-400'
                                    : 'border-gray-700 bg-gray-800/50 text-white hover:border-gray-600 hover:bg-gray-800'
                            )}
                            aria-pressed={theme === option.id}
                        >
                            <span className="text-gray-400">{option.icon}</span>
                            <span className="font-medium">{option.label}</span>
                        </button>
                    ))}
                </div>

                {/* System preference indicator */}
                <div className="mt-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>
                            System preference: <strong className="text-white">
                                {window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'}
                            </strong>
                            {theme === 'system' && ' (active)'}
                        </span>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Density</h3>
                <p className="text-gray-500 text-sm mb-4">
                    Adjust the spacing and size of UI elements.
                </p>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { id: 'comfortable', label: 'Comfortable', icon: <MaximizeIcon className="w-5 h-5" />, description: 'More breathing room' },
                        { id: 'compact', label: 'Compact', icon: <MinimizeIcon className="w-5 h-5" />, description: 'Fit more on screen' },
                    ].map((option) => (
                        <button
                            key={option.id}
                            onClick={() => handleDensityChange(option.id as 'compact' | 'comfortable')}
                            className={cn(
                                'p-4 rounded-lg border-2 transition-all duration-150 flex flex-col items-center gap-2 text-left',
                                density === option.id
                                    ? 'border-blue-500 bg-blue-900/30 text-blue-400'
                                    : 'border-gray-700 bg-gray-800/50 text-white hover:border-gray-600 hover:bg-gray-800'
                            )}
                            aria-pressed={density === option.id}
                        >
                            <div className="flex items-center gap-2 w-full">
                                <span className="text-gray-400">{option.icon}</span>
                                <span className="font-medium">{option.label}</span>
                            </div>
                            <span className="text-xs text-gray-500 self-start ml-7">{option.description}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Accent Color</h3>
                <p className="text-gray-500 text-sm mb-4">
                    Choose the primary color used for buttons, links, and highlights.
                </p>
                <div className="flex flex-wrap gap-3">
                    {ACCENT_COLORS.map((color) => (
                        <button
                            key={color.value}
                            onClick={() => handleAccentColorChange(color.value)}
                            className={cn(
                                'w-10 h-10 rounded-full border-2 transition-all duration-150 relative',
                                accentColor === color.value
                                    ? 'border-white scale-110 shadow-lg'
                                    : 'border-gray-700 hover:border-gray-500 hover:scale-105'
                            )}
                            style={{ backgroundColor: color.value }}
                            aria-label={color.name}
                            aria-pressed={accentColor === color.value}
                        >
                            {accentColor === color.value && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Custom color picker */}
                <div className="mt-4 flex items-center gap-3">
                    <label htmlFor="custom-accent" className="text-sm text-gray-400">Custom:</label>
                    <input
                        id="custom-accent"
                        type="color"
                        value={accentColor}
                        onChange={(e) => handleAccentColorChange(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-gray-700 bg-transparent cursor-pointer"
                        aria-label="Custom accent color"
                    />
                    <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (/^#[0-9a-fA-F]{6}$/.test(value)) {
                                handleAccentColorChange(value);
                            }
                        }}
                        onBlur={(e) => {
                            const value = e.target.value;
                            if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
                                e.target.value = accentColor;
                            }
                        }}
                        className="w-24 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white font-mono"
                        placeholder="#RRGGBB"
                        aria-label="Custom accent color hex"
                    />
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Preview</h3>
                <p className="text-gray-500 text-sm mb-4">Live preview of your theme settings.</p>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                        <button className="btn btn-primary">Primary Button</button>
                        <button className="btn btn-secondary">Secondary Button</button>
                        <button className="btn btn-ghost">Ghost Button</button>
                        <button className="btn btn-primary" disabled>Disabled</button>
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="text" placeholder="Text input" className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <select className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option>Select option</option>
                            <option>Option 1</option>
                            <option>Option 2</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 accent-blue-600" defaultChecked />
                            <span className="text-white">Checkbox</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" className="w-4 h-4 accent-blue-600" defaultChecked />
                            <span className="text-white">Radio</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 accent-blue-600" role="switch" />
                            <span className="text-white">Toggle</span>
                        </label>
                    </div>
                    <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                        <p className="text-white">Card with elevated background</p>
                        <p className="text-gray-400 text-sm mt-1">Secondary text color</p>
                        <p className="text-gray-500 text-xs mt-1">Muted text color</p>
                    </div>
                </div>
            </div>
        </div>
    );
}