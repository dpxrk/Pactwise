// Design tokens for consistent styling across the application

export const colors = {
  // Primary palette
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
  
  // Secondary palette
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  
  // Semantic colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  
  // Neutral colors
  gray: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },
} as const;

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
} as const;

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Georgia', 'serif'],
    mono: ['Menlo', 'Monaco', 'Consolas', 'monospace'],
  },
  
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
    '7xl': ['4.5rem', { lineHeight: '1' }],
    '8xl': ['6rem', { lineHeight: '1' }],
    '9xl': ['8rem', { lineHeight: '1' }],
  },
  
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const;

export const animation = {
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },
  
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  dropdown: '1000',
  sticky: '1020',
  fixed: '1030',
  modal: '1040',
  popover: '1050',
  tooltip: '1060',
  toast: '1070',
} as const;

// Component-specific tokens
export const components = {
  button: {
    height: {
      sm: spacing[8],
      md: spacing[10],
      lg: spacing[12],
    },
    padding: {
      sm: `${spacing[2]} ${spacing[3]}`,
      md: `${spacing[2]} ${spacing[4]}`,
      lg: `${spacing[3]} ${spacing[6]}`,
    },
    borderRadius: borderRadius.md,
  },
  
  input: {
    height: spacing[10],
    padding: `${spacing[2]} ${spacing[3]}`,
    borderRadius: borderRadius.md,
    borderWidth: '1px',
  },
  
  card: {
    padding: spacing[6],
    borderRadius: borderRadius.lg,
    shadow: shadows.md,
  },
  
  modal: {
    borderRadius: borderRadius.xl,
    shadow: shadows['2xl'],
    backdropBlur: '8px',
  },
} as const;

// Theme configuration
export const lightTheme = {
  colors: {
    background: colors.gray[50],
    foreground: colors.gray[900],
    muted: colors.gray[100],
    mutedForeground: colors.gray[500],
    card: '#ffffff',
    cardForeground: colors.gray[900],
    border: colors.gray[200],
    input: colors.gray[200],
    primary: colors.primary[600],
    primaryForeground: colors.gray[50],
    secondary: colors.secondary[100],
    secondaryForeground: colors.secondary[900],
    accent: colors.secondary[100],
    accentForeground: colors.secondary[900],
    destructive: colors.error[500],
    destructiveForeground: colors.gray[50],
    ring: colors.primary[600],
  },
} as const;

export const darkTheme = {
  colors: {
    background: colors.gray[950],
    foreground: colors.gray[50],
    muted: colors.gray[800],
    mutedForeground: colors.gray[400],
    card: colors.gray[900],
    cardForeground: colors.gray[50],
    border: colors.gray[800],
    input: colors.gray[800],
    primary: colors.primary[500],
    primaryForeground: colors.gray[900],
    secondary: colors.secondary[800],
    secondaryForeground: colors.secondary[50],
    accent: colors.secondary[800],
    accentForeground: colors.secondary[50],
    destructive: colors.error[600],
    destructiveForeground: colors.gray[50],
    ring: colors.primary[500],
  },
} as const;

// Utility functions for working with tokens
export const getColor = (colorPath: string, opacity?: number): string => {
  const parts = colorPath.split('.');
  let color: unknown = colors;
  
  for (const part of parts) {
    if (typeof color === 'object' && color !== null && part in color) {
      color = (color as Record<string, unknown>)[part];
    } else {
      throw new Error(`Invalid color path: ${colorPath}`);
    }
  }
  
  if (typeof color !== 'string') {
    throw new Error(`Invalid color path: ${colorPath}`);
  }
  
  if (opacity !== undefined) {
    const rgb = hexToRgb(color);
    if (rgb) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    }
  }
  
  return color;
};

export const getSpacing = (size: keyof typeof spacing): string => {
  return spacing[size];
};

export const getFontSize = (size: keyof typeof typography.fontSize): string => {
  const fontSizeEntry = typography.fontSize[size];
  if (typeof fontSizeEntry === 'string') {
    return fontSizeEntry;
  }
  if (Array.isArray(fontSizeEntry)) {
    return fontSizeEntry[0];
  }
  return '1rem'; // fallback
};

export const getBreakpoint = (breakpoint: keyof typeof breakpoints): string => {
  return breakpoints[breakpoint];
};

// Helper function to convert hex to rgb
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16)
  };
}

// Export all tokens as default
export default {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  animation,
  breakpoints,
  zIndex,
  components,
  lightTheme,
  darkTheme,
  getColor,
  getSpacing,
  getFontSize,
  getBreakpoint,
};