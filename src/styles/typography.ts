// SOLID Principle: Single Responsibility - This file handles only typography definitions
export const Typography = {
  // Font Sizes - Optimized for Arabic text
  fontSize: {
    xs: 11,
    sm: 13,
    base: 16,
    lg: 18,
    xl: 22,
    '2xl': 26,
    '3xl': 30,
    '4xl': 36,
    '5xl': 42,
  },
  
  // Font Weights
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  // Line Heights - Better for Arabic text
  lineHeight: {
    tight: 1.1,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.7,
    loose: 2.0,
  },
  
  // Letter Spacing
  letterSpacing: {
    tighter: -0.8,
    tight: -0.4,
    normal: 0,
    wide: 0.4,
    wider: 0.8,
  },
  
  // Font Families - Arabic-friendly
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    arabic: 'Tahoma, Arial, sans-serif', // Better for Arabic
  },
} as const;
