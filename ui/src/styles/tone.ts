export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

interface ToneTokens {
    text: string;
    surface: string;
    border: string;
    dot: string;
    bar: string;
}

/** One tone map for chips, banners, toasts, and status rows. */
export const tone: Record<Tone, ToneTokens> = {
    neutral: {
        text: 'text-[var(--app-muted)]',
        surface: 'bg-[var(--app-raised)]',
        border: 'border-[var(--app-line)]',
        dot: 'bg-[var(--app-faint)]',
        bar: 'bg-[var(--app-muted)]',
    },
    accent: {
        text: 'text-[var(--app-accent-text)]',
        surface: 'bg-[var(--app-accent-soft)]',
        border: 'border-[var(--app-accent-line)]',
        dot: 'bg-[var(--app-accent)]',
        bar: 'bg-[var(--app-accent)]',
    },
    success: {
        text: 'text-emerald-300',
        surface: 'bg-emerald-500/10',
        border: 'border-emerald-500/25',
        dot: 'bg-emerald-400',
        bar: 'bg-emerald-500',
    },
    warning: {
        text: 'text-amber-300',
        surface: 'bg-amber-500/10',
        border: 'border-amber-500/25',
        dot: 'bg-amber-400',
        bar: 'bg-amber-500',
    },
    danger: {
        text: 'text-red-300',
        surface: 'bg-red-500/10',
        border: 'border-red-500/25',
        dot: 'bg-red-400',
        bar: 'bg-red-500',
    },
};

export const toneClass = (value: Tone) => `${tone[value].border} ${tone[value].surface} ${tone[value].text}`;
