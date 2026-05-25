/**
 * Theme system with high contrast support
 * Respects system font size settings
 */

import {PixelRatio} from 'react-native';

export interface Theme {
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    secondary: string;
    background: string;
    surface: string;
    error: string;
    errorLight: string;
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    text: string;
    textSecondary: string;
    textDisabled: string;
    border: string;
    divider: string;
    overlay: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    fontSizeSmall: number;
    fontSizeBase: number;
    fontSizeLarge: number;
    fontSizeXLarge: number;
    fontSizeTitle: number;
    lineHeightSmall: number;
    lineHeightBase: number;
    lineHeightLarge: number;
  };
  borderRadius: {
    small: number;
    medium: number;
    large: number;
  };
  shadows: {
    small: object;
    medium: object;
    large: object;
  };
}

/**
 * Default theme (normal contrast)
 */
export const defaultTheme: Theme = {
  colors: {
    primary: '#003a8c',
    primaryDark: '#001945',
    primaryLight: '#1351b4',
    secondary: '#fecc03',
    background: '#fcf9f8',
    surface: '#ffffff',
    error: '#ba1a1a',
    errorLight: '#ffdad6',
    success: '#006511',
    successLight: '#8ffb85',
    warning: '#745b00',
    warningLight: '#ffe089',
    text: '#1b1b1c',
    textSecondary: '#434653',
    textDisabled: '#737784',
    border: '#c3c6d5',
    divider: '#e5e2e1',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    fontSizeSmall: 12,
    fontSizeBase: 14,
    fontSizeLarge: 16,
    fontSizeXLarge: 20,
    fontSizeTitle: 24,
    lineHeightSmall: 16,
    lineHeightBase: 20,
    lineHeightLarge: 24,
  },
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
  },
  shadows: {
    small: {
      shadowColor: '#1b1b1c',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },
    medium: {
      shadowColor: '#1b1b1c',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 2,
    },
    large: {
      shadowColor: '#1b1b1c',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 4,
    },
  },
};

/**
 * Design system surface tiers from DESIGN.md
 * Used for tonal layering instead of borders
 */
export const DesignTokens = {
  colors: {
    primary: '#003a8c',
    primaryContainer: '#1351b4',
    primaryFixed: '#d9e2ff',
    primaryFixedDim: '#b0c6ff',
    onPrimary: '#ffffff',
    onPrimaryContainer: '#b8cbff',
    onPrimaryFixed: '#001945',
    surface: '#fcf9f8',
    surfaceBright: '#fcf9f8',
    surfaceDim: '#dcd9d9',
    surfaceContainer: '#f0eded',
    surfaceContainerLow: '#f6f3f2',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerHigh: '#eae7e7',
    surfaceContainerHighest: '#e5e2e1',
    onSurface: '#1b1b1c',
    onSurfaceVariant: '#434653',
    secondary: '#745b00',
    secondaryContainer: '#fecc03',
    secondaryFixed: '#ffe089',
    secondaryFixedDim: '#f0c100',
    onSecondary: '#ffffff',
    onSecondaryContainer: '#6e5700',
    tertiary: '#004a09',
    tertiaryContainer: '#006511',
    tertiaryFixed: '#8ffb85',
    tertiaryFixedDim: '#73dd6b',
    onTertiary: '#ffffff',
    onTertiaryContainer: '#79e370',
    error: '#ba1a1a',
    errorContainer: '#ffdad6',
    onError: '#ffffff',
    onErrorContainer: '#93000a',
    outline: '#737784',
    outlineVariant: '#c3c6d5',
    inverseSurface: '#303030',
    inverseOnSurface: '#f3f0ef',
    inversePrimary: '#b0c6ff',
    surfaceTint: '#225abd',
  },
};

/**
 * High contrast theme for accessibility
 */
export const highContrastTheme: Theme = {
  ...defaultTheme,
  colors: {
    primary: '#000066',
    primaryDark: '#000033',
    primaryLight: '#0000cc',
    secondary: '#0066cc',
    background: '#ffffff',
    surface: '#ffffff',
    error: '#990000',
    errorLight: '#ffcccc',
    success: '#006600',
    successLight: '#ccffcc',
    warning: '#cc6600',
    warningLight: '#ffeecc',
    text: '#000000',
    textSecondary: '#333333',
    textDisabled: '#666666',
    border: '#000000',
    divider: '#333333',
    overlay: 'rgba(0, 0, 0, 0.8)',
  },
};

/**
 * Scales font size based on system accessibility settings
 */
export const scaleFontSize = (baseSize: number, maxScale: number = 2.0): number => {
  const fontScale = PixelRatio.getFontScale();
  const scaledSize = baseSize * Math.min(fontScale, maxScale);
  return Math.round(scaledSize);
};

/**
 * Scales spacing modestly with the device's pixel density.
 *
 * The previous implementation rounded `baseSpacing * scale` and then divided
 * by `scale`, which collapsed back to the input on every density. We now
 * apply a gentle multiplier that grows from 1× on standard 160dpi screens
 * up to ~1.25× on the densest devices, keeping spacing legible without
 * blowing up layout proportions.
 */
export const getResponsiveSpacing = (baseSpacing: number): number => {
  const density = PixelRatio.get();
  const multiplier = 1 + Math.min(Math.max(density - 1, 0), 1) * 0.25;
  return Math.round(baseSpacing * multiplier);
};

/**
 * Theme hook (simplified - in production use Context API)
 */
let currentTheme: Theme = defaultTheme;
let isHighContrast = false;

export const setHighContrastMode = (enabled: boolean): void => {
  isHighContrast = enabled;
  currentTheme = enabled ? highContrastTheme : defaultTheme;
};

export const getTheme = (): Theme => currentTheme;

export const isHighContrastMode = (): boolean => isHighContrast;

/**
 * Accessible color combinations (WCAG AA compliant)
 */
export const accessibleColors = {
  // Text on light backgrounds
  textOnLight: '#000000',
  secondaryTextOnLight: '#333333',

  // Text on dark backgrounds
  textOnDark: '#ffffff',
  secondaryTextOnDark: '#cccccc',

  // Interactive elements
  linkColor: '#0066cc',
  linkColorVisited: '#551a8b',

  // Status colors with sufficient contrast
  errorText: '#990000',
  successText: '#006600',
  warningText: '#cc6600',
  infoText: '#004d99',
};

/**
 * Picks the WCAG-friendly text color (light vs dark) for a given background.
 * Uses real relative luminance instead of an allow-list, so both theme
 * tokens and ad-hoc literals resolve correctly.
 */
export const getAccessibleTextColor = (backgroundColor: string): string => {
  const rgb = backgroundColor.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!rgb) {
    return accessibleColors.textOnLight;
  }
  let hex = rgb[1];
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const luminance =
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  // W3C-recommended pivot \u2014 minimises the worst-case contrast ratio.
  // luminance > 0.179 means black text wins; otherwise white text wins.
  // (See https://www.w3.org/TR/AERT/#color-contrast and the derivation
  // sqrt(1.05 * 0.05) - 0.05 \u2248 0.179.)
  return luminance > 0.179
    ? accessibleColors.textOnLight
    : accessibleColors.textOnDark;
};

/**
 * Font size presets that respect system settings
 */
export const getFontSizes = () => {
  const theme = getTheme();
  return {
    small: scaleFontSize(theme.typography.fontSizeSmall),
    base: scaleFontSize(theme.typography.fontSizeBase),
    large: scaleFontSize(theme.typography.fontSizeLarge),
    xLarge: scaleFontSize(theme.typography.fontSizeXLarge),
    title: scaleFontSize(theme.typography.fontSizeTitle),
  };
};

/**
 * Line height that scales with font size
 */
export const getLineHeight = (fontSize: number): number => {
  return Math.round(fontSize * 1.4);
};
