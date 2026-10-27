export const shadows = {
  card: 'shadow-xl',
  modal: 'shadow-2xl',
  dropdown: 'shadow-xl',
  elevated: 'shadow-lg',
} as const;

export const animations = {
  fast: 'duration-150',
  normal: 'duration-200',
  slow: 'duration-300',
  easing: 'ease-in-out',
  slideInRight: 'animate-slide-in-right',
  slideInUp: 'animate-slide-in-up',
  slideInDown: 'animate-slide-in-down',
  fadeIn: 'animate-fade-in',
  fadeInUp: 'animate-fade-in-up',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  scaleIn: 'animate-scale-in-bounce',
  shake: 'animate-shake',
} as const;

export const breakpoints = {
  mobile: 'lg:hidden',
  desktop: 'hidden lg:block',
  sidebarWidth: 'w-64',
  maxWidth: 'max-w-4xl',
  commandPaletteWidth: 'max-w-2xl',
  logPanelMin: 'min-w-[200px]',
  logPanelMax: 'max-w-[600px]',
} as const;

export const zIndex = {
  dropdown: 'z-40',
  sidebar: 'z-50',
  modal: 'z-50',
  toast: 'z-50',
  tooltip: 'z-60',
  overlay: 'z-50',
} as const;

export const card = {
  default: 'bg-gray-800/50 border border-gray-700/50',
  elevated: 'bg-gray-800/50 border border-gray-700/50 shadow-xl',
  outlined: 'bg-transparent border border-gray-600',
  interactive: 'bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 hover:bg-gray-700/50 cursor-pointer transition-colors',
} as const;

export const modal = {
  overlay: 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in',
  container: 'fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-in-up',
  sizes: {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  },
} as const;

export const dropdown = {
  container: 'absolute top-full mt-2 z-50 min-w-[200px] animate-slide-in-down',
  item: 'w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors focus:outline-none focus:bg-gray-700',
  itemDanger: 'text-red-400 hover:bg-red-900/30',
  itemDefault: 'text-gray-300 hover:bg-gray-700',
  divider: 'border-t border-gray-700 my-1',
} as const;