export const spacing = {
  xs: 'p-1',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
  gapXs: 'gap-1',
  gapSm: 'gap-2',
  gapMd: 'gap-4',
  gapLg: 'gap-6',
  gapXl: 'gap-8',
  section: 'space-y-8',
  card: 'p-4 lg:p-6',
  cardSm: 'p-3',
} as const;

export const sizing = {
  touchTarget: 'min-h-[44px] min-w-[44px]',
  touchTargetSm: 'min-h-[36px] min-w-[36px]',
  iconSm: 'size-4',
  iconMd: 'size-5',
  iconLg: 'size-6',
  iconXl: 'size-8',
  borderRadius: {
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
    full: 'rounded-full',
  },
  input: {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-3 text-lg',
  },
  button: {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-base gap-2',
    lg: 'px-6 py-3.5 text-lg gap-2.5',
  },
  iconButton: {
    sm: 'p-1.5 size-8',
    md: 'p-2 size-10',
    lg: 'p-2.5 size-12',
  },
} as const;