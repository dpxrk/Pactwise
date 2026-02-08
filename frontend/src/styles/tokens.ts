// Design tokens for consistent styling across the application

export const colors = {
  // Primary palette — Purple brand
  primary: {
    50: '#faf5f9',
    100: '#f5ebf3',
    200: '#ead6e7',
    300: '#dab5d5',
    400: '#c388bb',
    500: '#9e829c',
    600: '#7d5c7b',
    700: '#644862',
    800: '#533e52',
    900: '#291528',
    950: '#1a0d18',
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
  
  // Muted Semantic Colors — Bloomberg Terminal aesthetic
  success: {
    50: '#F2F5F2',
    100: '#E0E8E0',
    200: '#C1D1C1',
    300: '#A2BAA2',
    400: '#83A383',
    500: '#6B8E6B',
    600: '#567256',
    700: '#425642',
    800: '#2D3B2D',
    900: '#192019',
    950: '#0D110D',
  },

  warning: {
    50: '#F5F1EB',
    100: '#EBE3D7',
    200: '#D7C7AF',
    300: '#C3AB87',
    400: '#B89860',
    500: '#9E7F4A',
    600: '#7F663B',
    700: '#604D2D',
    800: '#41341E',
    900: '#221B10',
    950: '#110E08',
  },

  error: {
    50: '#F5EFEF',
    100: '#EBDFDF',
    200: '#D7BFBF',
    300: '#C39F9F',
    400: '#B07070',
    500: '#9A5A5A',
    600: '#7D4848',
    700: '#5F3636',
    800: '#412525',
    900: '#231313',
    950: '#120A0A',
  },

  info: {
    50: '#EFF2F5',
    100: '#DFE5EB',
    200: '#BFCBD7',
    300: '#9FB1C3',
    400: '#7088A0',
    500: '#5A6F83',
    600: '#485969',
    700: '#36434F',
    800: '#252D35',
    900: '#13171B',
    950: '#0A0C0E',
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
    sans: ['Montserrat', 'system-ui', 'sans-serif'],
    display: ['Syne', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace'],
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
  sm: '0',
  DEFAULT: '0',
  md: '0',
  lg: '0',
  xl: '0',
  '2xl': '0',
  '3xl': '0',
  full: '0',
} as const;

export const shadows = {
  sm: 'none',
  DEFAULT: 'none',
  md: 'none',
  lg: 'none',
  xl: 'none',
  '2xl': 'none',
  inner: 'none',
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
    borderRadius: borderRadius.none,
  },

  input: {
    height: spacing[10],
    padding: `${spacing[2]} ${spacing[3]}`,
    borderRadius: borderRadius.none,
    borderWidth: '1px',
  },
  
  card: {
    padding: spacing[6],
    borderRadius: borderRadius.none,
    shadow: shadows.none,
  },

  modal: {
    borderRadius: borderRadius.none,
    shadow: shadows.none,
    backdropBlur: '8px',
  },
} as const;

// Theme configuration — Purple brand
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
    primary: colors.primary[900],
    primaryForeground: colors.gray[50],
    secondary: colors.primary[500],
    secondaryForeground: colors.gray[50],
    accent: colors.primary[500],
    accentForeground: colors.gray[50],
    destructive: colors.error[500],
    destructiveForeground: colors.gray[50],
    ring: colors.primary[900],
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
    secondary: colors.primary[800],
    secondaryForeground: colors.gray[50],
    accent: colors.primary[800],
    accentForeground: colors.gray[50],
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