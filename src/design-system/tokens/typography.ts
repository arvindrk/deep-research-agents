export const fontFamilies = {
  sans: 'Inter Variable, SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif',
  mono: 'Berkeley Mono, ui-monospace, SF Mono, Menlo, monospace',
} as const;

export const fontWeights = {
  regular: 400,
  medium: 510,
  semibold: 538,
} as const;

export const fontSizes = {
  xs: '10px',
  sm: '12px',
  base: '13px',
  md: '14px',
  lg: '15px',
  xl: '16px',
  '2xl': '17px',
  '3xl': '21px',
  '4xl': '24px',
  '5xl': '40px',
  '6xl': '56px',
  '7xl': '64px',
} as const;

export const lineHeights = {
  tight: 1.06,
  snug: 1.1,
  normal: 1.33,
  relaxed: 1.4,
  loose: 1.47,
  body: 1.5,
  relaxed2: 1.6,
  tall: 2.67,
} as const;

export const letterSpacings = {
  tighter: '-1.82px',
  tight: '-0.88px',
  normal: '0',
  wide: '-0.37px',
  wider: '-0.252px',
  widest: '-0.204px',
  button: '-0.22px',
  caption: '-0.182px',
  small: '-0.165px',
  xs: '-0.156px',
  '2xs': '-0.13px',
  '3xs': '-0.12px',
} as const;

export const typographyStyles = {
  'display-xl': {
    fontSize: fontSizes['7xl'],
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.tight,
    letterSpacing: '-1.408px',
  },
  'display-lg': {
    fontSize: fontSizes['6xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacings.tighter,
  },
  'display-md': {
    fontSize: fontSizes['5xl'],
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacings.tight,
  },

  'heading-xl': {
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.normal,
    letterSpacing: '-0.288px',
  },
  'heading-lg': {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.wider,
  },
  'heading-md': {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacings.widest,
  },
  'heading-sm': {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.relaxed2,
    letterSpacing: letterSpacings.normal,
  },

  'body-lg': {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.body,
    letterSpacing: letterSpacings.normal,
  },
  'body-md': {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.body,
    letterSpacing: letterSpacings.small,
  },
  'body-base': {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.relaxed2,
    letterSpacing: letterSpacings.small,
  },

  'button-lg': {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.loose,
    letterSpacing: letterSpacings.button,
  },
  'button-md': {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.tall,
    letterSpacing: letterSpacings.normal,
  },
  'button-sm': {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.tall,
    letterSpacing: letterSpacings.normal,
  },

  'caption-md': {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.body,
    letterSpacing: letterSpacings.caption,
  },
  'caption-base': {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.body,
    letterSpacing: letterSpacings['2xs'],
  },
  'caption-sm': {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.body,
    letterSpacing: letterSpacings['3xs'],
  },
  'caption-xs': {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacings.widest,
  },

  'mono-base': {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.body,
    letterSpacing: letterSpacings.normal,
  },
} as const;

export const fontFeatures = {
  inter: '"cv01", "ss03"',
} as const;

export type TypographyToken = typeof typographyStyles;
