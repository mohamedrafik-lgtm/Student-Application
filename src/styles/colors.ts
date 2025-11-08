// SOLID Principle: Single Responsibility - This file handles only color definitions
export const Colors = {
  // Modern Primary Colors - Enhanced
  // Brighter, more vibrant primary palette
  primary: '#2563EB', // vivid blue
  primaryLight: '#3B82F6',
  primaryDark: '#1E3A8A',
  primaryGlow: 'rgba(37, 99, 235, 0.18)',
  primarySoft: 'rgba(59, 130, 246, 0.08)',
  
  // Secondary Colors - Enhanced
  secondary: '#F59E0B', // Warm amber
  secondaryLight: '#FCD34D',
  secondaryDark: '#D97706',
  secondarySoft: 'rgba(245, 158, 11, 0.1)',
  
  // Accent Colors - Enhanced
  accent: '#10B981', // Emerald green
  accentLight: '#34D399',
  accentDark: '#059669',
  accentSoft: 'rgba(16, 185, 129, 0.1)',
  
  // Neutral Colors - Enhanced (White Theme)
  white: '#FFFFFF',
  background: '#F6F9FF', // very light blue background for livelier feel
  backgroundDark: '#0F172A',
  backgroundSoft: '#F1F5FF', // soft light background
  cardBackground: '#FFFFFF',
  
  // Text Colors - Enhanced
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textLight: '#64748B',
  textHint: '#94A3B8',
  textMuted: '#94A3B8',
  
  // Status Colors - Enhanced
  success: '#06B6D4',
  successSoft: 'rgba(6, 182, 212, 0.08)',
  error: '#EF4444',
  errorSoft: 'rgba(239, 68, 68, 0.1)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.1)',
  info: '#2563EB',
  infoSoft: 'rgba(37, 99, 235, 0.08)',
  
  // Input Colors - Enhanced
  inputBorder: '#E2E8F0',
  inputBorderFocused: '#6366F1',
  inputBorderError: '#EF4444',
  inputBackground: '#FFFFFF',
  inputPlaceholder: '#9CA3AF',
  inputDisabled: '#F8FAFC',
  
  // Shadow and Effects - Enhanced
  shadow: 'rgba(2,6,23,0.06)',
  shadowMedium: 'rgba(2,6,23,0.10)',
  shadowDark: 'rgba(2,6,23,0.18)',
  shadowPrimary: 'rgba(37, 99, 235, 0.16)',
  shadowSuccess: 'rgba(6, 182, 212, 0.16)',
  shadowError: 'rgba(239, 68, 68, 0.16)',
  
  // Gradients - Enhanced
  gradientPrimary: ['#2563EB', '#06B6D4'],
  gradientSecondary: ['#F59E0B', '#EF4444'],
  gradientBackground: ['#F6F9FF', '#EEF2FF'],
  gradientCard: ['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.95)'],
  
  // Border Colors - Enhanced
  borderLight: '#EEF2FF',
  borderMedium: '#E6EEF9',
  borderDark: '#CBD5E1',
  borderPrimary: '#2563EB',
  borderError: '#EF4444',
  
  // Glass effect - Enhanced
  glass: 'rgba(255, 255, 255, 0.98)',
  glassDark: 'rgba(255, 255, 255, 0.15)',
  glassSoft: 'rgba(255, 255, 255, 0.8)',
  
  // Overlay Colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.1)',
  overlayDark: 'rgba(0, 0, 0, 0.8)',
} as const;
