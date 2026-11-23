/**
 * Design Tokens - Single source of truth for design values
 * Enables consistent theming and easy maintenance
 */

export const colors = {
  // Base colors (semantic naming)
  background: {
    primary: 'bg-neutral-950',
    secondary: 'bg-neutral-900',
    tertiary: 'bg-neutral-800',
    elevated: 'bg-neutral-800/50',
    glass: 'bg-neutral-900/50 backdrop-blur-sm',
    gradient: 'bg-gradient-to-r from-blue-900/40 to-purple-900/40',
  },
  border: {
    subtle: 'border-neutral-700/50',
    default: 'border-neutral-700',
    emphasis: 'border-neutral-600',
    focus: 'border-blue-500/50',
    error: 'border-red-500/50',
    success: 'border-green-500/50',
    warning: 'border-yellow-500/50',
  },
  text: {
    primary: 'text-[#ffffff]',
    secondary: 'text-neutral-300',
    muted: 'text-neutral-400',
    disabled: 'text-neutral-400',
    inverse: 'text-neutral-900',
    link: 'text-blue-400 hover:text-blue-300',
  },
  brand: {
    primary: 'bg-neutral-100',
    primaryHover: 'hover:bg-white',
    primaryFocus: 'focus:ring-neutral-400',
    secondary: 'bg-purple-600',
    secondaryHover: 'hover:bg-purple-500',
  },
  semantic: {
    success: {
      bg: 'bg-green-900/30',
      border: 'border-green-800',
      text: 'text-green-400',
      icon: 'text-green-400',
      hover: 'hover:bg-green-900/50',
    },
    warning: {
      bg: 'bg-yellow-900/30',
      border: 'border-yellow-800',
      text: 'text-yellow-500',
      icon: 'text-yellow-400',
      hover: 'hover:bg-yellow-900/50',
    },
    danger: {
      bg: 'bg-red-900/30',
      border: 'border-red-800',
      text: 'text-red-400',
      icon: 'text-red-400',
      hover: 'hover:bg-red-900/50',
    },
    info: {
      bg: 'bg-blue-900/30',
      border: 'border-blue-800',
      text: 'text-blue-400',
      icon: 'text-blue-400',
      hover: 'hover:bg-blue-900/50',
    },
  },
  status: {
    online: 'bg-green-500',
    offline: 'bg-neutral-500',
    busy: 'bg-red-500',
    away: 'bg-yellow-500',
  },
} as const;

export const spacing = {
  // Base unit: 4px
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
} as const;

export const borderRadius = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  default: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
} as const;

export const shadows = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  default: 'shadow',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  inner: 'shadow-inner',
  focus: 'shadow-[0_0_0_3px_rgb(59_130_246/0.4)]',
} as const;

export const typography = {
  fontFamily: {
    sans: 'font-sans',
    mono: 'font-mono',
  },
  fontSize: {
    xs: 'text-xs',      // 12px
    sm: 'text-sm',      // 14px
    base: 'text-base',  // 16px
    lg: 'text-lg',      // 18px
    xl: 'text-xl',      // 20px
    '2xl': 'text-2xl',  // 24px
    '3xl': 'text-3xl',  // 30px
    '4xl': 'text-4xl',  // 36px
  },
  fontWeight: {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  },
  lineHeight: {
    tight: 'leading-tight',
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
  },
} as const;

export const transitions = {
  fast: 'transition-all duration-150 ease-in-out',
  default: 'transition-all duration-200 ease-in-out',
  slow: 'transition-all duration-300 ease-in-out',
  slower: 'transition-all duration-500 ease-in-out',
} as const;

export const zIndex = {
  dropdown: 'z-10',
  sticky: 'z-20',
  fixed: 'z-30',
  modalBackdrop: 'z-40',
  modal: 'z-50',
  popover: 'z-60',
  tooltip: 'z-70',
  toast: 'z-80',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const iconSizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
} as const;

export const touchTarget = {
  sm: 'min-h-[40px] min-w-[40px]',
  default: 'min-h-[44px] min-w-[44px]',
  lg: 'min-h-[48px] min-w-[48px]',
} as const;

export const animation = {
  fadeIn: 'animate-fade-in',
  fadeOut: 'animate-fade-out',
  slideInUp: 'animate-slide-in-up',
  slideInRight: 'animate-slide-in-right',
  scaleIn: 'animate-scale-in',
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
} as const;

// Component-specific token compositions
export const componentTokens = {
  button: {
    base: "inline-flex select-none items-center justify-center gap-2 rounded-[9px] border border-transparent font-medium leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] disabled:pointer-events-none disabled:opacity-50",
    sizes: {
      xs: "h-7 px-2.5 text-xs",
      sm: "h-8 px-3 text-[13px]",
      md: "h-9 px-3.5 text-[13px]",
      lg: "h-10 px-4 text-sm",
    },
    variants: {
      primary: "bg-[var(--app-accent)] text-[#ffffff] hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,black)]",
      secondary: "border-[var(--app-line)] bg-[var(--app-raised)] text-[var(--app-text)] hover:border-[var(--app-line-strong)] hover:bg-[var(--app-hover)]",
      danger: "bg-red-600 text-[#ffffff] hover:bg-red-500",
      success: "bg-emerald-600 text-[#ffffff] hover:bg-emerald-500",
      ghost: "bg-transparent text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]",
      outline: "border-[var(--app-line-strong)] bg-transparent text-[var(--app-text-secondary)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]",
    },
    disabled: "opacity-50",
    loading: "cursor-wait",
  },
  iconButton: {
    base: "inline-flex select-none items-center justify-center rounded-[9px] border border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] disabled:pointer-events-none disabled:opacity-50",
    sizes: {
      xs: "h-6 w-6",
      sm: "h-8 w-8",
      md: "h-9 w-9",
      lg: "h-10 w-10",
    },
    variants: {
      primary: "bg-[var(--app-accent)] text-[#ffffff] hover:bg-[color-mix(in_srgb,var(--app-accent)_88%,black)]",
      secondary: "border-[var(--app-line)] bg-[var(--app-raised)] text-[var(--app-text)] hover:border-[var(--app-line-strong)] hover:bg-[var(--app-hover)]",
      danger: "bg-red-600 text-[#ffffff] hover:bg-red-500",
      success: "bg-emerald-600 text-[#ffffff] hover:bg-emerald-500",
      ghost: "bg-transparent text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]",
      outline: "border-[var(--app-line-strong)] bg-transparent text-[var(--app-text-secondary)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]",
    },
    disabled: "opacity-50",
  },
  input: {
    base: "w-full rounded-[9px] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-text)] transition-colors placeholder:text-[var(--app-faint)] focus:border-[var(--app-accent-line)] focus:outline-none focus:ring-[3px] focus:ring-[var(--app-accent-soft)] disabled:opacity-50",
    padding: "h-9 px-3 text-[13px]",
    label: "mb-1.5 block text-xs font-medium text-[var(--app-muted)]",
    error: "border-red-500/60 focus:border-red-500 focus:ring-red-500/15",
    errorText: "mt-1.5 text-xs text-red-400",
    hintText: "mt-1.5 text-xs text-[var(--app-faint)]",
    iconWrapper: "pointer-events-none absolute inset-y-0 flex items-center text-[var(--app-faint)]",
  },
  card: {
    base: "rounded-xl",
    variants: {
      default: "border border-[var(--app-line)] bg-[var(--app-surface)]",
      elevated: "border border-[var(--app-line)] bg-[var(--app-panel)] shadow-[var(--app-shadow)]",
      outlined: "border border-[var(--app-line-strong)] bg-transparent",
      glass: "border border-[var(--app-line)] bg-[color-mix(in_srgb,var(--app-surface)_86%,transparent)] backdrop-blur-md",
      gradient: "border border-[var(--app-line)] bg-[var(--app-surface)]",
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    },
    hover: "transition-colors hover:border-[var(--app-line-strong)]",
  },
  badge: {
    base: "inline-flex items-center gap-1 border font-medium leading-none",
    sizes: {
      xs: "px-1.5 py-1 text-[11px]",
      sm: "px-1.5 py-1 text-[11px]",
      md: "px-2 py-1 text-[11px]",
    },
    variants: {
      default: "border-[var(--app-line)] bg-[var(--app-raised)] text-[var(--app-muted)]",
      primary: "border-[var(--app-accent-line)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
      secondary: "border-[var(--app-line)] bg-transparent text-[var(--app-text-secondary)]",
      success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
      warning: "border-amber-500/25 bg-amber-500/10 text-amber-300",
      danger: "border-red-500/25 bg-red-500/10 text-red-300",
      outline: "border-[var(--app-line-strong)] bg-transparent text-[var(--app-muted)]",
      purple: "border-[var(--app-accent-line)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
      info: "border-sky-500/25 bg-sky-500/10 text-sky-300",
    },
    pill: "rounded-full",
    default: "rounded-md",
  },
  avatar: {
    sizes: {
      xs: "h-6 w-6 text-xs",
      sm: "h-8 w-8 text-xs",
      md: "h-10 w-10 text-sm",
      lg: "h-12 w-12 text-base",
      xl: "h-16 w-16 text-lg",
      "2xl": "h-24 w-24 text-xl",
    },
    statusSizes: {
      xs: "w-1.5 h-1.5",
      sm: "w-2 h-2",
      md: "w-2.5 h-2.5",
      lg: "w-3 h-3",
      xl: "w-4 h-4",
      "2xl": "w-5 h-5",
    },
  },
  modal: {
    backdrop: "fixed inset-0 bg-black/55 backdrop-blur-sm animate-fade-in",
    container: "relative z-10 flex max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel)] shadow-[var(--app-shadow)] animate-scale-in",
    sizes: {
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-xl",
      full: "max-w-4xl",
    },
    header: "flex items-start justify-between gap-4 border-b border-[var(--app-line)] p-4",
    closeButton: "rounded-md p-1.5 text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]",
    body: "flex-1 overflow-y-auto p-4",
    bodyFlush: "min-h-0 flex-1 overflow-hidden",
    footer: "border-t border-[var(--app-line)] p-4",
  },
  toast: {
    base: "relative flex items-start gap-3 overflow-hidden rounded-xl border p-3 shadow-[var(--app-shadow)] animate-slide-in-up",
  },
} as const;

// Utility to compose class names from tokens
export function composeTokens(...tokenStrings: (string | undefined | null | false)[]): string {
  return tokenStrings.filter(Boolean).join(' ');
}

export type ColorTokens = typeof colors;
export type SpacingTokens = typeof spacing;
export type BorderRadiusTokens = typeof borderRadius;
export type ShadowTokens = typeof shadows;
export type TypographyTokens = typeof typography;
export type TransitionTokens = typeof transitions;
export type ZIndexTokens = typeof zIndex;
export type ComponentTokens = typeof componentTokens;