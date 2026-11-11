import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Eat&Meet design tokens – the single source of truth for colour, type,
 * spacing, radius and elevation. Screens should never hardcode these values.
 */

export const colors = {
  // Brand
  forest: '#1F5E45',
  forestDeep: '#163F2F',
  forestSoft: '#2E7A5C',
  terracotta: '#E4775F',
  terracottaDeep: '#C25A43',
  terracottaSoft: '#FCEAE4',
  sage: '#DCE9DC',
  sageSoft: '#EDF4EC',
  sageDeep: '#B9D2BC',
  honey: '#E9A23B',
  honeySoft: '#FBF1DD',

  // Surfaces
  cream: '#FAF8F2',
  paper: '#FFFFFF',
  sand: '#F3EFE4',
  line: '#E8E3D6',
  lineStrong: '#D8D1C0',

  // Text
  ink: '#252A26',
  inkSoft: '#4A514B',
  muted: '#6E746F',
  faint: '#A1A69F',
  onDark: '#FAF8F2',
  onDarkMuted: 'rgba(250,248,242,0.72)',

  // Status
  success: '#1F5E45',
  successSoft: '#E3F0E5',
  warning: '#9A6110',
  warningSoft: '#FBF0DA',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  info: '#2F5D7C',
  infoSoft: '#E6EFF5',

  overlay: 'rgba(20, 26, 22, 0.45)',
  scrim: 'rgba(20, 26, 22, 0.55)',
} as const;

export type ColorName = keyof typeof colors;

/**
 * Chart series colours – validated for colour-vision deficiency and contrast
 * (dataviz validate_palette.js, light surface). Always use in this adjacency
 * order: series1 → series2 → series3.
 */
export const chart = {
  series1: '#1C9A6C',
  series2: '#2A78D6',
  series3: '#E8693A',
  track: '#F3EFE4',
} as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  displayItalic: 'Fraunces_500Medium_Italic',
  /** System font (SF Pro on iOS) for body copy – crisp and highly legible. */
  body: Platform.select({ ios: 'System', default: undefined }),
} as const;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/** Horizontal page gutter. */
export const gutter = 20;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

type TextVariant =
  | 'hero'
  | 'display'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'footnote'
  | 'caption'
  | 'overline'
  | 'number';

export const typography: Record<TextVariant, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -0.8 },
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 37, letterSpacing: -0.6 },
  title1: { fontFamily: fonts.display, fontSize: 26, lineHeight: 31, letterSpacing: -0.4 },
  title2: { fontFamily: fonts.display, fontSize: 21, lineHeight: 26, letterSpacing: -0.2 },
  title3: { fontSize: 17, lineHeight: 22, fontWeight: '700', letterSpacing: -0.2 },
  headline: { fontSize: 16, lineHeight: 21, fontWeight: '600', letterSpacing: -0.1 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  callout: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  number: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
};

export type TypographyVariant = keyof typeof typography;

export const shadow = {
  card: {
    shadowColor: '#2B2A1F',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  } satisfies ViewStyle,
  raised: {
    shadowColor: '#1D2B22',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  } satisfies ViewStyle,
  soft: {
    shadowColor: '#2B2A1F',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  } satisfies ViewStyle,
} as const;

/** Minimum touch target (Apple HIG). */
export const hitSize = 44;

/** Space reserved below scroll content so it clears the native tab bar. */
export const tabBarClearance = Platform.select({ ios: 96, android: 110, default: 90 }) ?? 90;
