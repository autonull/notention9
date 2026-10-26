export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const isMac = (): boolean =>
  typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

export const formatShortcut = (keys: string[]): string => {
  const isMacPlatform = isMac();
  return keys.map(k => {
    if (k === 'meta' || k === 'ctrl') return isMacPlatform ? '⌘' : 'Ctrl';
    if (k === 'shift') return 'Shift';
    if (k === 'alt') return isMacPlatform ? '⌥' : 'Alt';
    return k.toUpperCase();
  }).join(' + ');
};

export const parseShortcut = (shortcut: string): { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } => {
  const parts = shortcut.toLowerCase().split('+').map(p => p.trim());
  return {
    key: parts[parts.length - 1],
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option') || parts.includes('⌥'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('⌘'),
  };
};

export const matchesShortcut = (
  event: KeyboardEvent,
  shortcut: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }
): boolean => {
  const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
  const ctrlMatch = (shortcut.ctrl ?? false) === (event.ctrlKey || event.metaKey);
  const shiftMatch = (shortcut.shift ?? false) === event.shiftKey;
  const altMatch = (shortcut.alt ?? false) === event.altKey;
  return keyMatch && ctrlMatch && shiftMatch && altMatch;
};

export const isInputFocused = (target: HTMLElement | null): boolean => {
  if (!target) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
};

export const focusFirstFocusable = (container: HTMLElement | null): void => {
  if (!container) return;
  const focusable = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  focusable[0]?.focus();
};

export const trapFocus = (container: HTMLElement, event: KeyboardEvent): void => {
  if (event.key !== 'Tab') return;
  const focusable = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

export const cn = (...classes: (string | undefined | null | false)[]): string =>
  classes.filter(Boolean).join(' ');