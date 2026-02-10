export const transitions = {
  none: 'none',
  fast: '100ms',
  base: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

export const easings = {
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export const transforms = {
  scaleDown: 'scale(0.97)',
  scaleNormal: 'scale(1)',
  translateSmall: 'translate(4px)',
} as const;

export const motionVars = {
  '--transition-fast': transitions.fast,
  '--transition-base': transitions.base,
  '--transition-normal': transitions.normal,
  '--transition-slow': transitions.slow,
  '--transition-slower': transitions.slower,

  '--ease-in': easings.in,
  '--ease-out': easings.out,
  '--ease-in-out': easings.inOut,
  '--ease-spring': easings.spring,
} as const;

export type MotionToken = typeof transitions;
