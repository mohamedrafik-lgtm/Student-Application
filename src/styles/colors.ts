// Design System — Color Tokens (White + Green Theme)
// Single Responsibility: Only color definitions

export const Colors = {
  // ── Primary (Emerald Green) ──
  primary: '#059669',
  primaryLight: '#10B981',
  primaryDark: '#047857',
  primarySoft: 'rgba(5, 150, 105, 0.08)',
  primaryGlow: 'rgba(5, 150, 105, 0.16)',
  primary50: '#ECFDF5',
  primary100: '#D1FAE5',
  primary200: '#A7F3D0',
  primary500: '#10B981',
  primary600: '#059669',
  primary700: '#047857',
  primary800: '#065F46',

  // ── Secondary (Teal) ──
  secondary: '#0D9488',
  secondaryLight: '#14B8A6',
  secondaryDark: '#0F766E',
  secondarySoft: 'rgba(13, 148, 136, 0.08)',

  // ── Accent (Amber) ──
  accent: '#F59E0B',
  accentLight: '#FCD34D',
  accentDark: '#D97706',
  accentSoft: 'rgba(245, 158, 11, 0.08)',

  // ── Backgrounds ──
  white: '#FFFFFF',
  background: '#F0FDF4',
  backgroundAlt: '#F8FAF9',
  backgroundDark: '#064E3B',
  backgroundSoft: '#ECFDF5',
  surface: '#FFFFFF',
  cardBackground: '#FFFFFF',

  // ── Text ──
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textLight: '#6B7280',
  textHint: '#9CA3AF',
  textMuted: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  // ── Status ──
  success: '#059669',
  successSoft: 'rgba(5, 150, 105, 0.08)',
  successLight: '#ECFDF5',
  successBorder: '#A7F3D0',
  error: '#DC2626',
  errorSoft: 'rgba(220, 38, 38, 0.08)',
  errorLight: '#FEF2F2',
  errorBorder: '#FECACA',
  warning: '#D97706',
  warningSoft: 'rgba(217, 119, 6, 0.08)',
  warningLight: '#FFFBEB',
  warningBorder: '#FDE68A',
  info: '#2563EB',
  infoSoft: 'rgba(37, 99, 235, 0.08)',
  infoLight: '#EFF6FF',
  infoBorder: '#BFDBFE',

  // ── Borders ──
  borderLight: '#F3F4F6',
  borderMedium: '#E5E7EB',
  borderDark: '#D1D5DB',
  borderPrimary: '#059669',
  borderError: '#DC2626',

  // ── Input ──
  inputBorder: '#E5E7EB',
  inputBorderFocused: '#059669',
  inputBorderError: '#DC2626',
  inputBackground: '#FFFFFF',
  inputPlaceholder: '#9CA3AF',
  inputDisabled: '#F9FAFB',

  // ── Shadows ──
  shadow: 'rgba(0,0,0,0.04)',
  shadowMedium: 'rgba(0,0,0,0.08)',
  shadowDark: 'rgba(0,0,0,0.12)',
  shadowPrimary: 'rgba(5, 150, 105, 0.15)',
  shadowSuccess: 'rgba(5, 150, 105, 0.12)',
  shadowError: 'rgba(220, 38, 38, 0.12)',

  // ── Gradients ──
  gradientPrimary: ['#059669', '#0D9488'] as readonly string[],
  gradientSecondary: ['#F59E0B', '#EF4444'] as readonly string[],
  gradientBackground: ['#F0FDF4', '#ECFDF5'] as readonly string[],
  gradientCard: ['#FFFFFF', '#F0FDF4'] as readonly string[],

  // ── Glass ──
  glass: 'rgba(255,255,255,0.95)',
  glassDark: 'rgba(255,255,255,0.15)',
  glassSoft: 'rgba(255,255,255,0.80)',

  // ── Overlay ──
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.1)',
  overlayDark: 'rgba(0,0,0,0.8)',
} as const;

export type ColorKey = keyof typeof Colors;
