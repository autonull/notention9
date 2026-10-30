import { useStrategy, SEAM_IDS } from '../../hooks/useStrategyResolver';
import { profileRegistry, type StrategyProfile } from '@notention/core/ui/profile';
import { strategyRegistry } from '@notention/core/ui/strategy';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Toggle } from '../ui/Toggle';
import { useState, useMemo } from 'react';
import { UserGroupIcon, SettingsIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon } from '../ui/icons';

export function ProfileSettings() {
    const {
        getActiveProfile,
        setActiveProfile,
        setOverride,
        removeOverride,
        setManualMode,
        userId,
        isManualMode,
        activeProfileId,
        overrides,
    } = useStrategy();

    const profiles = profileRegistry.getAllProfiles();
    const activeProfile = getActiveProfile();
    const [showOverrides, setShowOverrides] = useState(false);
    const [addingOverrideSeam, setAddingOverrideSeam] = useState<string | null>(null);

    const handleProfileChange = (profileId: string) => {
        setActiveProfile(profileId);
    };

    const handleToggleManual = () => {
        setManualMode(!isManualMode);
    };

    const handleOverrideChange = (seamId: string, strategyId: string) => {
        if (strategyId) {
            setOverride(seamId as any, strategyId);
        } else {
            removeOverride(seamId as any);
        }
    };

    const getAvailableStrategies = useMemo(() => (seamId: string) => {
        return strategyRegistry.getAllForSeam(seamId).map(s => ({ id: s.id, name: s.id }));
    }, []);

    const seamOptions = useMemo(() => [
        { value: SEAM_IDS.CAPTURE, label: 'Capture' },
        { value: SEAM_IDS.ELICIT, label: 'Elicit' },
        { value: SEAM_IDS.MATCH, label: 'Match Display' },
        { value: SEAM_IDS.LAYOUT, label: 'Layout' },
    ], []);

    const handleAddOverrideSeamChange = (seamId: string) => {
        setAddingOverrideSeam(seamId);
    };

    const handleAddOverrideStrategyChange = (seamId: string, strategyId: string) => {
        if (strategyId) {
            setOverride(seamId as any, strategyId);
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
                <Toggle
                    checked={isManualMode}
                    onChange={handleToggleManual}
                    aria-label="Manual profile selection"
                />
            </div>

            {/* Profile Selector */}
            <div className="space-y-2">
                <label className="block text-sm font-medium">Active Profile</label>
                <Select
                    value={activeProfileId}
                    onChange={handleProfileChange}
                    disabled={!isManualMode}
                    options={profiles.map(p => ({ value: p.id, label: `${p.name} — ${p.description}` }))}
                    placeholder="Select profile"
                />
                {activeProfile && (
                    <p className="text-sm text-gray-400 ml-2">
                        {activeProfile.description}
                    </p>
                )}
            </div>

            {/* Strategy Overrides */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">Strategy Overrides</label>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowOverrides(!showOverrides)}
                    >
                        {showOverrides ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                    </Button>
                </div>

                {showOverrides && (
                    <div className="space-y-3 pl-4 border-l-2 border-gray-700">
                        {/* Existing overrides */}
                        {Object.entries(overrides).length === 0 ? (
                            <p className="text-sm text-gray-500">No overrides set. Using profile defaults.</p>
                        ) : (
                            Object.entries(overrides).map(([seamId, strategyId]) => (
                                <div key={seamId} className="flex items-center gap-3">
                                    <span className="text-sm font-mono text-gray-400 min-w-[150px]">{seamId}</span>
                                    <Select
                                        value={strategyId}
                                        onChange={(v) => handleOverrideChange(seamId, v)}
                                        options={getAvailableStrategies(seamId).map(s => ({ value: s.id, label: s.name }))}
                                        placeholder="Select strategy"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleOverrideChange(seamId, '')}
                                    >
                                        Clear
                                    </Button>
                                </div>
                            ))
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
                                <Select
                                    placeholder="Select seam to override"
                                    options={seamOptions}
                                    onChange={handleAddOverrideSeamChange}
                                />
                            ) : (
                                <div className="flex gap-2">
                                    <span className="text-sm font-mono text-gray-400 min-w-[150px] flex items-center">
                                        {seamOptions.find(o => o.value === addingOverrideSeam)?.label} ({addingOverrideSeam})
                                    </span>
                                    <Select
                                        placeholder="Select strategy"
                                        options={getAvailableStrategies(addingOverrideSeam).map(s => ({ value: s.id, label: s.name }))}
                                        onChange={(v) => handleAddOverrideStrategyChange(addingOverrideSeam, v)}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setAddingOverrideSeam(null)}
                                    >
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
                                {Object.entries(profile.strategySelections).map(([seam, strategy]) => (
                                    <div key={seam} className="flex justify-between">
                                        <span className="font-mono">{seam}</span>
                                        <span>{strategy}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </details>
        </div>
    );
}