import { useState } from 'react';
import { useUisgFlags, useUisgFlagActions, resolveFlagsFromContext } from '../hooks/useUisgFlags';

const KNOWN_FLAGS = [
    { id: 'swipe-actions', label: 'Swipe Actions', description: 'Enable swipe-to-action gestures on list items' },
    { id: 'haptic-feedback', label: 'Haptic Feedback', description: 'Vibration feedback on touch interactions' },
    { id: 'offline-queue', label: 'Offline Queue', description: 'Queue mutations when offline, sync when online' },
    { id: 'ai-suggestions', label: 'AI Suggestions', description: 'Show AI-powered content suggestions' },
    { id: 'density-compact', label: 'Compact Density', description: 'Use compact spacing and smaller touch targets' },
    { id: 'density-comfortable', label: 'Comfortable Density', description: 'Use comfortable spacing and larger touch targets' },
    { id: 'animations-on', label: 'Animations Enabled', description: 'Enable UI transitions and animations' },
    { id: 'animations-off', label: 'Animations Disabled', description: 'Disable all UI animations' },
    { id: 'reduced-motion', label: 'Reduced Motion', description: 'Respect prefers-reduced-motion system setting' },
    { id: 'high-contrast', label: 'High Contrast', description: 'Force high contrast color scheme' },
] as const;

const CONTEXT_PRESETS = {
    desktop: [],
    mobile: ['swipe-actions', 'haptic-feedback'],
    'mobile-dense': [],
    'mobile-expert-degraded': ['offline-queue'],
    tablet: [],
    'desktop-novice-dark': [],
    'desktop-expert-light': ['reduced-motion'],
    'mobile-novice-dark': [],
    'desktop-a11y-high-contrast': ['high-contrast', 'reduced-motion'],
    'tablet-multilingual': [],
} as const;

export function FlagsPanel(): JSX.Element {
    const flags = useUisgFlags();
    const { setFlags, setExperimentalFlags, toggleExperimentalFlag } = useUisgFlagActions();
    const [contextPreset, setContextPreset] = useState<keyof typeof CONTEXT_PRESETS>('desktop');
    const [urlFlagsParam, setUrlFlagsParam] = useState('');

    const handleContextChange = (context: keyof typeof CONTEXT_PRESETS) => {
        setContextPreset(context);
        const contextFlags = CONTEXT_PRESETS[context];
        const { enabled } = resolveFlagsFromContext(contextFlags, urlFlagsParam);
        setExperimentalFlags(enabled);
        setFlags({ context, experimental: enabled });
    };

    const handleUrlFlagsChange = (value: string) => {
        setUrlFlagsParam(value);
        const contextFlags = CONTEXT_PRESETS[contextPreset];
        const { enabled } = resolveFlagsFromContext(contextFlags, value);
        setExperimentalFlags(enabled);
        setFlags({ experimental: enabled });
    };

    const handleFlagToggle = (flagId: string) => {
        toggleExperimentalFlag(flagId);
        const next = flags.experimental.includes(flagId)
            ? flags.experimental.filter(f => f !== flagId)
            : [...flags.experimental, flagId];
        // Update URL param
        const newUrlParams = next.join(',');
        setUrlFlagsParam(newUrlParams);
        window.history.replaceState({}, '', `?uisg=1&mode=flags&flags=${newUrlParams}`);
    };

    const handleDensityChange = (density: 'compact' | 'comfortable') => {
        setFlags({ density });
        updateUrlParam('density', density);
    };

    const handleAnimationsChange = (enabled: boolean) => {
        setFlags({ animations: enabled });
        updateUrlParam('animations', enabled ? 'true' : 'false');
    };

    const handleReducedMotionChange = (enabled: boolean) => {
        setFlags({ reducedMotion: enabled });
        updateUrlParam('reducedMotion', enabled ? 'true' : 'false');
    };

    const handleThemeChange = (theme: string) => {
        setFlags({ theme });
        updateUrlParam('theme', theme);
    };

    const updateUrlParam = (key: string, value: string) => {
        const url = new URL(window.location.href);
        url.searchParams.set(key, value);
        window.history.replaceState({}, '', url.toString());
    };

    const { enabled, unknown } = resolveFlagsFromContext(CONTEXT_PRESETS[contextPreset], urlFlagsParam);

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>UISG Feature Flags</h2>
            
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Context Preset</h3>
                <select
                    style={styles.select}
                    value={contextPreset}
                    onChange={e => handleContextChange(e.target.value as keyof typeof CONTEXT_PRESETS)}
                >
                    {Object.entries(CONTEXT_PRESETS).map(([key, value]) => (
                        <option key={key} value={key}>
                            {key} — {value.join(', ') || 'no flags'}
                        </option>
                    ))}
                </select>
                <p style={styles.caption}>
                    Base flags from context profile. URL flags override these.
                </p>
            </div>

            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>URL Flags Parameter</h3>
                <input
                    style={styles.input}
                    type="text"
                    value={urlFlagsParam}
                    onChange={e => handleUrlFlagsChange(e.target.value)}
                    placeholder="swipe-actions,-haptic-feedback,ai-suggestions"
                />
                <p style={styles.caption}>
                    Comma-separated. Prefix with <code>-</code> to disable.
                    Example: <code>?uisg=1&flags=swipe-actions,-haptic-feedback</code>
                </p>
                {unknown.length > 0 && (
                    <p style={styles.warning}>Unknown flags (will be rejected): {unknown.join(', ')}</p>
                )}
            </div>

            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Core Settings</h3>
                <div style={styles.grid}>
                    <div>
                        <label style={styles.label}>Density</label>
                        <select
                            style={styles.select}
                            value={flags.density}
                            onChange={e => handleDensityChange(e.target.value as 'compact' | 'comfortable')}
                        >
                            <option value="compact">Compact</option>
                            <option value="comfortable">Comfortable</option>
                        </select>
                    </div>
                    <div>
                        <label style={styles.label}>Animations</label>
                        <select
                            style={styles.select}
                            value={flags.animations ? 'on' : 'off'}
                            onChange={e => handleAnimationsChange(e.target.value === 'on')}
                        >
                            <option value="on">Enabled</option>
                            <option value="off">Disabled</option>
                        </select>
                    </div>
                    <div>
                        <label style={styles.label}>Reduced Motion</label>
                        <select
                            style={styles.select}
                            value={flags.reducedMotion ? 'on' : 'off'}
                            onChange={e => handleReducedMotionChange(e.target.value === 'on')}
                        >
                            <option value="off">Off</option>
                            <option value="on">On</option>
                        </select>
                    </div>
                    <div>
                        <label style={styles.label}>Theme</label>
                        <select
                            style={styles.select}
                            value={flags.theme}
                            onChange={e => handleThemeChange(e.target.value)}
                        >
                            <option value="default">Default</option>
                            <option value="brand-acme">Brand Acme</option>
                            <option value="brand-beta">Brand Beta</option>
                            <option value="high-contrast">High Contrast</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Experimental Flags</h3>
                <div style={styles.flagsGrid}>
                    {KNOWN_FLAGS.map(flag => (
                        <div key={flag.id} style={styles.flagCard}>
                            <div style={styles.flagHeader}>
                                <input
                                    type="checkbox"
                                    checked={flags.experimental.includes(flag.id)}
                                    onChange={() => handleFlagToggle(flag.id)}
                                    style={styles.checkbox}
                                />
                                <div>
                                    <strong style={styles.flagLabel}>{flag.label}</strong>
                                    <span style={styles.flagBadge}>
                                        {enabled.includes(flag.id) ? 'enabled' : 'disabled'}
                                    </span>
                                </div>
                            </div>
                            <p style={styles.flagDesc}>{flag.description}</p>
                            <p style={styles.flagSource}>
                                Source:{' '}
                                {CONTEXT_PRESETS[contextPreset].includes(flag.id) ? 'context' : '—'}
                                {urlFlagsParam.split(',').includes(flag.id) && ' + url'}
                                {urlFlagsParam.split(',').includes(`-${flag.id}`) && ' (disabled by url)'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Current Resolved Flags</h3>
                <pre style={styles.json}>{JSON.stringify(flags, null, 2)}</pre>
                <button
                    style={styles.button}
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(flags, null, 2))}
                >
                    Copy JSON
                </button>
            </div>

            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Test in Generated Component</h3>
                <p style={styles.caption}>
                    In a generated component, use:
                </p>
                <pre style={styles.code}>
{`import { useUisgFlags, useUisgFlag } from '@/hooks/useUisgFlags';

function MyComponent() {
  const flags = useUisgFlags();
  const hasSwipe = useUisgFlag('swipe-actions');
  
  return (
    <div className={flags.density === 'compact' ? 'compact' : ''}>
      {hasSwipe && <SwipeActions />}
    </div>
  );
}`}
                </pre>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        padding: '1.5rem',
        maxWidth: '900px',
        margin: '0 auto',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        color: '#1b1d21',
    },
    title: {
        margin: '0 0 1.5rem',
        fontSize: '1.5rem',
        fontWeight: 600,
    },
    section: {
        marginBottom: '1.5rem',
        padding: '1rem',
        background: '#f8f8f6',
        borderRadius: '8px',
        border: '1px solid #e8e8e4',
    },
    sectionTitle: {
        margin: '0 0 0.75rem',
        fontSize: '1rem',
        fontWeight: 600,
    },
    caption: {
        margin: '0.5rem 0 0',
        fontSize: '0.85rem',
        color: '#5a5f69',
    },
    warning: {
        margin: '0.5rem 0 0',
        fontSize: '0.85rem',
        color: '#b3414f',
    },
    select: {
        width: '100%',
        maxWidth: '300px',
        padding: '0.5rem',
        fontSize: '0.9rem',
        border: '1px solid #d8d8d2',
        borderRadius: '6px',
        background: 'white',
    },
    input: {
        width: '100%',
        maxWidth: '600px',
        padding: '0.5rem',
        fontSize: '0.9rem',
        border: '1px solid #d8d8d2',
        borderRadius: '6px',
        fontFamily: 'ui-monospace, monospace',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
    },
    label: {
        display: 'block',
        marginBottom: '0.25rem',
        fontSize: '0.85rem',
        fontWeight: 500,
        color: '#3a3d44',
    },
    flagsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '0.75rem',
    },
    flagCard: {
        padding: '0.75rem',
        background: 'white',
        border: '1px solid #e8e8e4',
        borderRadius: '6px',
    },
    flagHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
    },
    checkbox: {
        marginTop: '0.125rem',
    },
    flagLabel: {
        fontSize: '0.9rem',
    },
    flagBadge: {
        marginLeft: '0.5rem',
        padding: '0.125rem 0.375rem',
        fontSize: '0.7rem',
        fontWeight: 600,
        borderRadius: '9999px',
        background: '#e8f5e9',
        color: '#2f8a63',
    },
    flagDesc: {
        margin: '0.375rem 0 0',
        fontSize: '0.8rem',
        color: '#5a5f69',
    },
    flagSource: {
        margin: '0.375rem 0 0',
        fontSize: '0.75rem',
        color: '#8a8d96',
        fontFamily: 'ui-monospace, monospace',
    },
    json: {
        margin: '0.5rem 0',
        padding: '0.75rem',
        fontSize: '0.8rem',
        background: '#1b1d21',
        color: '#e8e8e4',
        borderRadius: '6px',
        overflow: 'auto',
        maxHeight: '300px',
    },
    code: {
        margin: '0.5rem 0',
        padding: '0.75rem',
        fontSize: '0.8rem',
        background: '#1b1d21',
        color: '#e8e8e4',
        borderRadius: '6px',
        overflow: 'auto',
    },
    button: {
        marginTop: '0.5rem',
        padding: '0.5rem 1rem',
        fontSize: '0.85rem',
        background: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
    },
};