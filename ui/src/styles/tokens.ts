/**
 * Design Tokens - Single source of truth for design values
 * Enables consistent theming and easy maintenance
 */

export const colors = {
  // Base colors (semantic naming)
  background: {
    primary: 'bg-gray-950',
    secondary: 'bg-gray-900',
    tertiary: 'bg-gray-800',
    elevated: 'bg-gray-800/50',
    glass: 'bg-gray-900/50 backdrop-blur-sm',
    gradient: 'bg-gradient-to-r from-blue-900/40 to-purple-900/40',
  },
  border: {
    subtle: 'border-gray-700/50',
    default: 'border-gray-700',
    emphasis: 'border-gray-600',
    focus: 'border-blue-500/50',
    error: 'border-red-500/50',
    success: 'border-green-500/50',
    warning: 'border-yellow-500/50',
  },
  text: {
    primary: 'text-white',
    secondary: 'text-gray-300',
    muted: 'text-gray-400',
    disabled: 'text-gray-500',
    inverse: 'text-gray-900',
    link: 'text-blue-400 hover:text-blue-300',
  },
  brand: {
    primary: 'bg-blue-600',
    primaryHover: 'hover:bg-blue-500',
    primaryFocus: 'focus:ring-blue-500',
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
    offline: 'bg-gray-500',
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
    base: 'font-medium rounded-lg transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-900',
    sizes: {
      xs: 'px-2 py-1 text-xs',
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    },
    variants: {
      primary: `${colors.brand.primary} ${colors.brand.primaryHover} text-white shadow-lg shadow-blue-900/20 ${colors.brand.primaryFocus}`,
      secondary: `${colors.background.tertiary} ${colors.background.tertiary.replace('bg-', 'hover:bg-').replace('800', '700')} ${colors.text.secondary} ${colors.border.default} focus:ring-gray-500`,
      danger: 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 focus:ring-red-500',
      success: 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 focus:ring-green-500',
      ghost: 'bg-transparent hover:bg-gray-800 text-gray-400 hover:text-white focus:ring-gray-500',
      outline: 'bg-transparent border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 focus:ring-gray-500',
    },
    disabled: 'opacity-50 cursor-not-allowed',
    loading: 'opacity-75 cursor-wait',
  },
  input: {
    base: 'w-full bg-gray-900/50 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed',
    padding: 'px-3 py-2.5',
    label: 'block text-xs uppercase font-bold text-gray-500 mb-2 tracking-wider',
    error: 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50',
    errorText: 'mt-1 text-xs text-red-500',
    hintText: 'mt-1 text-xs text-gray-500',
    iconWrapper: 'absolute inset-y-0 flex items-center pointer-events-none text-gray-500',
  },
  card: {
    base: 'rounded-xl',
    variants: {
      default: `${colors.background.secondary} ${colors.border.subtle}`,
      elevated: `${colors.background.secondary} ${colors.border.subtle} shadow-lg`,
      outlined: `${colors.background.secondary} ${colors.border.default}`,
      glass: `${colors.background.glass} ${colors.border.subtle}`,
      gradient: `${colors.background.gradient} border-blue-800/30`,
    },
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-4 md:p-6',
      lg: 'p-6 md:p-8',
    },
    hover: 'hover:shadow-xl hover:border-gray-600/50 transition-all duration-200',
  },
  badge: {
    base: 'inline-flex items-center justify-center border font-medium',
    sizes: {
      sm: 'text-[10px] px-1.5 py-0.5',
      md: 'text-xs px-2.5 py-0.5',
    },
    variants: {
      default: `${colors.background.tertiary} ${colors.border.default} ${colors.text.muted}`,
      primary: `${colors.semantic.info.bg} ${colors.semantic.info.border} ${colors.semantic.info.text}`,
      success: `${colors.semantic.success.bg} ${colors.semantic.success.border} ${colors.semantic.success.text}`,
      warning: `${colors.semantic.warning.bg} ${colors.semantic.warning.border} ${colors.semantic.warning.text}`,
      danger: `${colors.semantic.danger.bg} ${colors.semantic.danger.border} ${colors.semantic.danger.text}`,
      outline: 'bg-transparent border-gray-600 text-gray-400',
      purple: 'bg-purple-900/30 border-purple-800 text-purple-300',
      info: `${colors.semantic.info.bg} ${colors.semantic.info.border} ${colors.semantic.info.text}`,
    },
    pill: 'rounded-full',
    default: 'rounded',
  },
  avatar: {
    sizes: {
      xs: 'h-6 w-6 text-[10px]',
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 h-10 text-sm',
      lg: 'h-12 w-12 text-base',
      xl: 'h-16 w-16 text-lg',
      '2xl': 'h-24 w-24 text-xl',
    },
    statusSizes: {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4',
      '2xl': 'w-5 h-5',
    },
  },
  modal: {
    backdrop: 'fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in',
    container: 'card glass shadow-2xl animate-scale-in overflow-hidden flex flex-col max-h-[90vh]',
    sizes: {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      full: 'max-w-4xl',
    },
    header: 'flex items-start justify-between p-4 md:p-6 border-b border-gray-700',
    closeButton: 'btn btn-ghost btn-sm p-1 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0',
    body: 'flex-1 overflow-y-auto p-4 md:p-6',
  },
  toast: {
    base: 'card relative overflow-hidden flex items-start gap-3 p-4 shadow-lg animate-slide-in-up',
    types: {
      info: `${colors.semantic.info.bg} ${colors.semantic.info.border} ${colors.semantic.info.text}`,
      success: `${colors.semantic.success.bg} ${colors.semantic.success.border} ${colors.semantic.success.text}`,
      warning: `${colors.semantic.warning.bg} ${colors.semantic.warning.border} ${colors.semantic.warning.text}`,
      error: `${colors.semantic.danger.bg} ${colors.semantic.danger.border} ${colors.semantic.danger.text}`,
    },
    progress: {
      info: 'bg-blue-500',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500',
    },
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