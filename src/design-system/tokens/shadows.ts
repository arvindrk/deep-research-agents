export const shadows = {
  none: 'none',
  sm: 'rgba(0, 0, 0, 0) 0px 8px 2px 0px, rgba(0, 0, 0, 0.01) 0px 5px 2px 0px, rgba(0, 0, 0, 0.04) 0px 3px 2px 0px, rgba(0, 0, 0, 0.07) 0px 1px 1px 0px, rgba(0, 0, 0, 0.08) 0px 0px 1px 0px',
  md: 'rgba(0, 0, 0, 0.2) 0px 4px 24px 0px',
  lg: 'rgba(0, 0, 0, 0.35) 0px 7px 32px 0px',
  focus: 'rgba(0, 0, 0, 0.1) 0px 4px 12px, rgba(0, 0, 0, 0.2) 0px 0px 0px 2px',
  innerGlow: 'rgba(255, 255, 255, 0.04) 0px 1.503px 5.261px 0px inset, rgba(255, 255, 255, 0.1) 0px -0.752px 0.752px 0px inset',
  elevated: 'rgba(255, 255, 255, 0.14) 0px -2.75px 4.75px 0px inset, rgba(255, 255, 255, 0.1) 0px -0.752px 0.752px 0px inset, rgba(0, 0, 0, 0.5) 0px 54px 73px 3px',
} as const;

export const shadowVars = {
  '--shadow-none': shadows.none,
  '--shadow-sm': shadows.sm,
  '--shadow-md': shadows.md,
  '--shadow-lg': shadows.lg,
  '--shadow-focus': shadows.focus,
  '--shadow-inner-glow': shadows.innerGlow,
  '--shadow-elevated': shadows.elevated,
} as const;

export type ShadowToken = typeof shadows;
