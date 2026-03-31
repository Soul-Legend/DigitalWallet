/**
 * Theme system with high contrast support
 * Respects system font size settings
 */

import {Platform, PixelRatio} from 'react-native';

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
    primary: '#003366',
    primaryDark: '#001a33',
    primaryLight: '#004d99',
    secondary: '#2196f3',
    background: '#f5f5f5',
    surface: '#ffffff',
    error: '#c62828',
    errorLight: '#ffebee',
    success: '#2e7d32',
    successLight: '#e8f5e9',
    warning: '#f57c00',
    warningLight: '#fff3e0',
    text: '#333333',
    textSecondary: '#666666',
    textDisabled: '#999999',
    border: '#dddddd',
    divider: '#e0e0e0',
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
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
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
 * Gets responsive spacing based on screen size
 */
export const getResponsiveSpacing = (baseSpacing: number): number => {
  const scale = PixelRatio.get();
  return Math.round(baseSpacing * scale) / scale;
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
 * Gets accessible text color for a given background
 */
export const getAccessibleTextColor = (backgroundColor: string): string => {
  // Simplified - in production, calculate luminance
  const darkBackgrounds = ['#003366', '#001a33', '#004d99', '#000066'];
  return darkBackgrounds.includes(backgroundColor)
    ? accessibleColors.textOnDark
    : accessibleColors.textOnLight;
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
