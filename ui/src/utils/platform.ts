const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

export const MOD_LABEL = isMac ? '⌘' : 'Ctrl';

export const modShortcut = (key: string): string => `${MOD_LABEL}+${key}`;
