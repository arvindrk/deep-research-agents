export const radius = {
  none: '0',
  xs: '1px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '10px',
  '2xl': '16px',
  full: '9999px',
} as const;

export const radiusVars = {
  '--radius-none': radius.none,
  '--radius-xs': radius.xs,
  '--radius-sm': radius.sm,
  '--radius-md': radius.md,
  '--radius-lg': radius.lg,
  '--radius-xl': radius.xl,
  '--radius-2xl': radius['2xl'],
  '--radius-full': radius.full,
} as const;

export type RadiusToken = typeof radius;
