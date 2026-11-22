import React from 'react';
import {useSettings} from '../../hooks/useSettingsContext';
import {Toggle} from '../ui/Toggle';
import {ShieldIcon, MinusIcon, CheckIcon, SparklesIcon} from '../ui/icons';

export function AccessibilityTab() {
    const {settings, setSettings} = useSettings();
    
    const reducedMotion = settings.accessibility?.reducedMotion ?? false;
    const highContrast = settings.accessibility?.highContrast ?? false;
    
    const handleReducedMotionChange = (enabled: boolean) => {
        setSettings({
            ...settings,
            accessibility: {
                ...settings.accessibility,
                reducedMotion: enabled,
            },
        });
        
        // Apply immediately for testing
        if (enabled) {
            document.documentElement.classList.add('reduced-motion');
        } else {
            document.documentElement.classList.remove('reduced-motion');
        }
    };
    
    const handleHighContrastChange = (enabled: boolean) => {
        setSettings({
            ...settings,
            accessibility: {
                ...settings.accessibility,
                highContrast: enabled,
            },
        });
        
        // Apply immediately for testing
        if (enabled) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
    };
    
    // Initialize on mount
    React.useEffect(() => {
        if (reducedMotion) {
            document.documentElement.classList.add('reduced-motion');
        }
        if (highContrast) {
            document.documentElement.classList.add('high-contrast');
        }
        
        // Also respect system preferences if not explicitly set
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
        
        if (!settings.accessibility?.reducedMotion && prefersReducedMotion) {
            document.documentElement.classList.add('reduced-motion');
        }
        if (!settings.accessibility?.highContrast && prefersHighContrast) {
            document.documentElement.classList.add('high-contrast');
        }
    }, []);
    
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-[13px] font-semibold text-[var(--app-text)] mb-2">Motion</h3>
                <p className="text-[var(--app-muted)] text-sm mb-4">
                    Reduce animations and transitions for users sensitive to motion.
                    When enabled, all animations and transitions are disabled or significantly reduced.
                </p>
                <div className="flex items-center justify-between p-4 bg-[var(--app-raised)] rounded-lg border border-[var(--app-line)]/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--app-raised)] rounded-lg text-blue-400">
                            <SparklesIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[var(--app-text)] font-medium">Reduce motion</p>
                            <p className="text-[var(--app-muted)] text-sm">
                                Disable animations, transitions, and scroll animations
                            </p>
                        </div>
                    </div>
                    <Toggle
                        checked={reducedMotion}
                        onChange={handleReducedMotionChange}
                        aria-label="Reduce motion"
                    />
                </div>
                
                {/* System preference indicator */}
                <div className="mt-3 p-3 bg-[var(--app-raised)]/30 rounded-lg border border-[var(--app-line)]/30">
                    <div className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
                        <InfoIcon className="w-4 h-4 flex-shrink-0" />
                        <span>
                            System preference: <strong className="text-[var(--app-text)]">
                                {window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Reduced motion' : 'Normal motion'}
                            </strong>
                            {settings.accessibility?.reducedMotion === undefined && ' (auto-detected)'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div>
                <h3 className="text-[13px] font-semibold text-[var(--app-text)] mb-2">Contrast</h3>
                <p className="text-[var(--app-muted)] text-sm mb-4">
                    Increase contrast for better readability. When enabled, borders are stronger,
                    text is more legible, and focus indicators are more prominent.
                </p>
                <div className="flex items-center justify-between p-4 bg-[var(--app-raised)] rounded-lg border border-[var(--app-line)]/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--app-raised)] rounded-lg text-yellow-400">
                            <ShieldIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[var(--app-text)] font-medium">High contrast</p>
                            <p className="text-[var(--app-muted)] text-sm">
                                Stronger borders, higher text contrast, prominent focus rings
                            </p>
                        </div>
                    </div>
                    <Toggle
                        checked={highContrast}
                        onChange={handleHighContrastChange}
                        aria-label="High contrast"
                    />
                </div>
                
                {/* System preference indicator */}
                <div className="mt-3 p-3 bg-[var(--app-raised)]/30 rounded-lg border border-[var(--app-line)]/30">
                    <div className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
                        <InfoIcon className="w-4 h-4 flex-shrink-0" />
                        <span>
                            System preference: <strong className="text-[var(--app-text)]">
                                {window.matchMedia('(prefers-contrast: high)').matches ? 'High contrast' : 'Normal contrast'}
                            </strong>
                            {settings.accessibility?.highContrast === undefined && ' (auto-detected)'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div>
                <h3 className="text-[13px] font-semibold text-[var(--app-text)] mb-2">Color-blind friendly</h3>
                <p className="text-[var(--app-muted)] text-sm mb-4">
                    All status indicators use both color and text/icons. No essential information
                    is conveyed by color alone.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'High confidence', icon: <CheckIcon className="w-4 h-4" />, color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-700/50' },
                        { label: 'Medium confidence', icon: <MinusIcon className="w-4 h-4" />, color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-700/50' },
                        { label: 'Low confidence', icon: <SparklesIcon className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-700/50' },
                        { label: 'Focus source', icon: <ShieldIcon className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-700/50' },
                    ].map((item, i) => (
                        <div key={i} className={`px-3 py-2 rounded-lg border ${item.bg} ${item.border} flex items-center gap-2`}>
                            <span className={item.color}>{item.icon}</span>
                            <span className="text-sm text-[var(--app-text)]">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// InfoIcon for the system preference indicator
function InfoIcon({className}: {className?: string}) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}