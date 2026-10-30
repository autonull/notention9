import { useStrategy } from '../../hooks/useStrategyResolver';
import { SEAM_ROLES, type SeamRole, resolveSeamId } from '../../constants/seams';
import { profileRegistry, type StrategyProfile } from '@notention/core/ui/profile';
import { strategyRegistry } from '@notention/core/ui/strategy';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Toggle } from '../ui/Toggle';
import { useState, useMemo } from 'react';
import { UserGroupIcon, SettingsIcon, ChevronDownIcon, ChevronUpIcon } from '../ui/icons';

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
        () => (seamRole: SeamRole) => strategyRegistry.getAllForSeam(resolveSeamId(seamRole, strategyRegistry)).map(s => ({ id: s.id, name: s.id })),
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

    const handleAddOverrideSeamChange = (seamRole: SeamRole) => setAddingOverrideSeam(seamRole);

    const handleAddOverrideStrategyChange = (seamRole: SeamRole, strategyId: string) => {
        if (strategyId) {
            setOverride(seamRole, strategyId);
            setAddingOverrideSeam(null);
        }
    };

    return (
        <div className="space-y-6 p-4 border border-gray-700 rounded-xl bg-gray-900/50">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Profile & Strategy Settings
            </h2>

            {/* Manual Mode Toggle */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-medium">Manual Profile Selection</p>
                    <p className="text-sm text-gray-400">Disable automatic profile switching based on context</p>
                </div>
                <Toggle checked={isManualMode} onChange={() => setManualMode(!isManualMode)} aria-label="Manual profile selection" />
            </div>

            {/* Profile Selector */}
            <div className="space-y-2">
                <label className="block text-sm font-medium">Active Profile</label>
                <Select
                    value={activeProfileId}
                    onChange={setActiveProfile}
                    disabled={!isManualMode}
                    options={profiles.map(p => ({ value: p.id, label: `${p.name} — ${p.description}` }))}
                    placeholder="Select profile"
                />
                {activeProfile && <p className="text-sm text-gray-400 ml-2">{activeProfile.description}</p>}
            </div>

            {/* Strategy Overrides */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">Strategy Overrides</label>
                    <Button variant="ghost" size="sm" onClick={() => setShowOverrides(!showOverrides)}>
                        {showOverrides ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                    </Button>
                </div>

                {showOverrides && (
                    <div className="space-y-3 pl-4 border-l-2 border-gray-700">
                        {/* Existing overrides */}
                        {Object.entries(overrides).length === 0 ? (
                            <p className="text-sm text-gray-500">No overrides set. Using profile defaults.</p>
                        ) : (
                            Object.entries(overrides).map(([seamId, strategyId]) => {
                                // Find the role for this seam ID
                                const seamRole = Object.entries(SEAM_ROLES).find(([, id]) => seamId.startsWith(id))?.[0] as SeamRole | undefined;
                                return (
                                    <div key={seamId} className="flex items-center gap-3">
                                        <span className="text-sm font-mono text-gray-400 min-w-[150px]">{seamRole ?? seamId}</span>
                                        <Select
                                            value={strategyId}
                                            onChange={v => handleOverrideChange(seamRole!, v)}
                                            options={getAvailableStrategies(seamRole!).map(s => ({ value: s.id, label: s.name }))}
                                            placeholder="Select strategy"
                                        />
                                        <Button variant="ghost" size="sm" onClick={() => handleOverrideChange(seamRole!, '')}>
                                            Clear
                                        </Button>
                                    </div>
                                );
                            })
                        )}

                        {/* Add new override */}
                        <div className="pt-2 border-t border-gray-700">
                            <div className="flex items-center gap-2 mb-2">
                                <p className="text-sm text-gray-500">Add new override:</p>
                                {addingOverrideSeam && (
                                    <Button variant="ghost" size="sm" onClick={() => setAddingOverrideSeam(null)}>
                                        Cancel
                                    </Button>
                                )}
                            </div>

                            {!addingOverrideSeam ? (
                                <Select placeholder="Select seam to override" options={seamOptions} onChange={handleAddOverrideSeamChange} />
                            ) : (
                                <div className="flex gap-2">
                                    <span className="text-sm font-mono text-gray-400 min-w-[150px] flex items-center">
                                        {seamOptions.find(o => o.value === addingOverrideSeam)?.label} ({addingOverrideSeam})
                                    </span>
                                    <Select
                                        placeholder="Select strategy"
                                        options={getAvailableStrategies(addingOverrideSeam).map(s => ({ value: s.id, label: s.name }))}
                                        onChange={v => handleAddOverrideStrategyChange(addingOverrideSeam, v)}
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
                <summary className="cursor-pointer flex items-center gap-2 text-sm text-gray-400">
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
                                    : 'border-gray-700'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{profile.name}</p>
                                    <p className="text-sm text-gray-400">{profile.description}</p>
                                </div>
                                {profile.id === activeProfileId && (
                                    <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                                        Active
                                    </span>
                                )}
                            </div>
                            <div className="mt-2 text-xs text-gray-500 space-y-1">
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
    );
}