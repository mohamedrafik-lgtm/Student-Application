// Design System — Modern violet/cyan trainee platform
// Single Responsibility: Only color definitions

export const Colors = {
  // ── Primary (Emerald Green) ──
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  primaryDark: '#312E81',
  primarySoft: 'rgba(79, 70, 229, 0.09)',
  primaryGlow: 'rgba(79, 70, 229, 0.18)',
  primary50: '#EEF2FF',
  primary100: '#E0E7FF',
  primary200: '#C7D2FE',
  primary500: '#6366F1',
  primary600: '#4F46E5',
  primary700: '#4338CA',
  primary800: '#3730A3',

  // ── Secondary (Teal) ──
  secondary: '#0891B2',
  secondaryLight: '#22D3EE',
  secondaryDark: '#0E7490',
  secondarySoft: 'rgba(8, 145, 178, 0.08)',

  // ── Accent (Amber) ──
  accent: '#F59E0B',
  accentLight: '#FCD34D',
  accentDark: '#D97706',
  accentSoft: 'rgba(245, 158, 11, 0.08)',

  // ── Backgrounds ──
  white: '#FFFFFF',
  background: '#F4F6FC',
  backgroundAlt: '#F8FAFC',
  backgroundDark: '#111827',
  backgroundSoft: '#EEF2FF',
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
  borderPrimary: '#4F46E5',
  borderError: '#DC2626',

  // ── Input ──
  inputBorder: '#E5E7EB',
  inputBorderFocused: '#4F46E5',
  inputBorderError: '#DC2626',
  inputBackground: '#FFFFFF',
  inputPlaceholder: '#9CA3AF',
  inputDisabled: '#F9FAFB',

  // ── Shadows ──
  shadow: 'rgba(0,0,0,0.04)',
  shadowMedium: 'rgba(0,0,0,0.08)',
  shadowDark: 'rgba(0,0,0,0.12)',
  shadowPrimary: 'rgba(79, 70, 229, 0.18)',
  shadowSuccess: 'rgba(5, 150, 105, 0.12)',
  shadowError: 'rgba(220, 38, 38, 0.12)',

  // ── Gradients ──
  gradientPrimary: ['#4F46E5', '#7C3AED'] as readonly string[],
  gradientSecondary: ['#F59E0B', '#EF4444'] as readonly string[],
  gradientBackground: ['#F4F6FC', '#EEF2FF'] as readonly string[],
  gradientCard: ['#FFFFFF', '#F8FAFC'] as readonly string[],

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
