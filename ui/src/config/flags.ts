// Feature flags for staged rollouts
// All flags default to OFF for safety; enable via Vite env vars (VITE_<FLAG_NAME>)

const flagDefaults: Record<string, boolean> = {
  NEXT_STEPS_UI: true,
  // Add future flags here
};

function getFlagValue(flag: string): boolean {
  const envKey = `VITE_${flag}`;
  const envValue = import.meta.env[envKey];
  if (envValue !== undefined) {
    return envValue === 'true';
  }
  return flagDefaults[flag] ?? false;
}

export const flags = {
  NEXT_STEPS_UI: getFlagValue('NEXT_STEPS_UI'),
} as const;

export type FlagKey = keyof typeof flags;

// Helper for debugging
export const getFlagsStatus = (): string => {
  return Object.entries(flags)
    .map(([key, value]) => `${key}: ${value ? 'ON' : 'OFF'}`)
    .join(', ');
};