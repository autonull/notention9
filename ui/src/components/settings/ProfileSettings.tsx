import { useStrategy } from '../../hooks/useStrategyResolver';
import { SEAM_ROLES, type SeamRole, resolveSeamId } from '../../constants/seams';
import { profileRegistry, type StrategyProfile } from '@notention/core/ui/ProfileRegistry';
import { getStrategiesForSeam } from '@notention/core/ui/strategy';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Toggle } from '../ui/Toggle';
import { useState, useMemo } from 'react';
import { UserGroupIcon, ChevronDownIcon, ChevronUpIcon } from '../ui/icons';
import {SectionHeader} from '../ui/kit';

export function ProfileSettings() {
    const {
        getActiveProfile,
        setActiveProfile,
        setOverride,
        removeOverride,
        setManualMode,
        isManualMode,
        activeProfileId,
        overrides,
    } = useStrategy();

    const profiles = profileRegistry.getAllProfiles();
    const activeProfile = getActiveProfile();
    const [showOverrides, setShowOverrides] = useState(false);
    const [addingOverrideSeam, setAddingOverrideSeam] = useState<SeamRole | null>(null);

    const getAvailableStrategies = useMemo(
        () => (seamRole: SeamRole) => getStrategiesForSeam(resolveSeamId(seamRole)).map(s => ({ id: s.id, name: s.id })),
        []
    );

    const seamOptions = useMemo(
        () => [
            { value: SEAM_ROLES.CAPTURE, label: 'Capture' },
            { value: SEAM_ROLES.ELICIT, label: 'Elicit' },
            { value: SEAM_ROLES.MATCH, label: 'Match Display' },
            { value: SEAM_ROLES.LAYOUT, label: 'Layout' },
        ],
        []
    );

    const handleOverrideChange = (seamRole: SeamRole, strategyId: string) => {
        strategyId ? setOverride(seamRole, strategyId) : removeOverride(seamRole);
    };

    const handleAddOverrideSeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => setAddingOverrideSeam(e.target.value as SeamRole);

    const handleAddOverrideStrategyChange = (seamRole: SeamRole, strategyId: string) => {
        if (strategyId) {
            setOverride(seamRole, strategyId);
            setAddingOverrideSeam(null);
        }
    };

    return (
        <div className="space-y-8">
            <SectionHeader
                title="Profile and strategy"
                description="Choose how capture, matching, and layout strategies are resolved."
            />

            <div className="space-y-6">
            {/* Manual Mode Toggle */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[13px] font-medium">Manual profile selection</p>
                    <p className="text-[12px] text-[var(--app-muted)]">Disable automatic profile switching based on context</p>
                </div>
                <Toggle checked={isManualMode} onChange={() => setManualMode(!isManualMode)} aria-label="Manual profile selection" />
            </div>

            {/* Profile Selector */}
            <div className="space-y-2">
                <label className="block text-[12px] font-medium text-[var(--app-muted)]">Active profile</label>
                <Select
                    value={activeProfileId}
                    onChange={(e) => setActiveProfile(e.target.value)}
                    disabled={!isManualMode}
                    options={profiles.map(p => ({ value: p.id, label: `${p.name} — ${p.description}` }))}
                />
                {activeProfile && <p className="ml-0.5 text-[12px] text-[var(--app-faint)]">{activeProfile.description}</p>}
            </div>

            {/* Strategy Overrides */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="block text-[12px] font-medium text-[var(--app-muted)]">Strategy overrides</label>
                    <Button variant="ghost" size="sm" onClick={() => setShowOverrides(!showOverrides)}>
                        {showOverrides ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                    </Button>
                </div>

                {showOverrides && (
                    <div className="space-y-3 pl-4 border-l-2 border-[var(--app-line)]">
                        {/* Existing overrides */}
                        {Object.entries(overrides).length === 0 ? (
                            <p className="text-[12px] text-[var(--app-muted)]">No overrides set. Using profile defaults.</p>
                        ) : (
                            Object.entries(overrides).map(([seamId, strategyId]) => {
                                // Find the role for this seam ID
                                const seamRole = Object.entries(SEAM_ROLES).find(([, id]) => seamId.startsWith(id))?.[0] as SeamRole | undefined;
                                return (
                                    <div key={seamId} className="flex items-center gap-3">
                                        <span className="text-sm font-mono text-[var(--app-muted)] min-w-[150px]">{seamRole ?? seamId}</span>
                                        <Select
                                            value={strategyId}
                                            onChange={(e) => handleOverrideChange(seamRole!, e.target.value)}
                                            options={getAvailableStrategies(seamRole!).map(s => ({ value: s.id, label: s.name }))}
                                        />
                                        <Button variant="ghost" size="sm" onClick={() => handleOverrideChange(seamRole!, '')}>
                                            Clear
                                        </Button>
                                    </div>
                                );
                            })
                        )}

                        {/* Add new override */}
                        <div className="pt-2 border-t border-[var(--app-line)]">
                            <div className="flex items-center gap-2 mb-2">
                                <p className="text-[12px] text-[var(--app-muted)]">Add new override:</p>
                                {addingOverrideSeam && (
                                    <Button variant="ghost" size="sm" onClick={() => setAddingOverrideSeam(null)}>
                                        Cancel
                                    </Button>
                                )}
                            </div>

                            {!addingOverrideSeam ? (
                                <Select options={seamOptions} onChange={handleAddOverrideSeamChange} />
                            ) : (
                                <div className="flex gap-2">
                                    <span className="text-sm font-mono text-[var(--app-muted)] min-w-[150px] flex items-center">
                                        {seamOptions.find(o => o.value === addingOverrideSeam)?.label} ({addingOverrideSeam})
                                    </span>
                                    <Select
                                        options={getAvailableStrategies(addingOverrideSeam).map(s => ({ value: s.id, label: s.name }))}
                                        onChange={(e) => handleAddOverrideStrategyChange(addingOverrideSeam, e.target.value)}
                                    />
                                    <Button variant="ghost" size="sm" onClick={() => setAddingOverrideSeam(null)}>
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Profile Info */}
            <details className="group">
                <summary className="cursor-pointer flex items-center gap-2 text-[12px] text-[var(--app-muted)]">
                    <UserGroupIcon className="w-4 h-4" />
                    Available Profiles
                </summary>
                <div className="mt-2 space-y-2">
                    {profiles.map(profile => (
                        <div
                            key={profile.id}
                            className={`p-3 rounded-lg border ${
                                profile.id === activeProfileId
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : 'border-[var(--app-line)]'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{profile.name}</p>
                                    <p className="text-[12px] text-[var(--app-muted)]">{profile.description}</p>
                                </div>
                                {profile.id === activeProfileId && (
                                    <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                                        Active
                                    </span>
                                )}
                            </div>
                            <div className="mt-2 text-xs text-[var(--app-muted)] space-y-1">
                                {Object.entries(profile.strategySelections).map(([seam, strategy]) => {
                                    const seamRole = Object.entries(SEAM_ROLES).find(([, id]) => seam.startsWith(id))?.[0] as SeamRole | undefined;
                                    return (
                                        <div key={seam} className="flex justify-between">
                                            <span className="font-mono">{seamRole ?? seam}</span>
                                            <span>{strategy}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </details>
            </div>
        </div>
    );
}