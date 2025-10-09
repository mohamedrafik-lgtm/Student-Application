// SOLID Principle: Single Responsibility - This file handles only color definitions
export const Colors = {
  // Modern Primary Colors - Enhanced
  primary: '#6366F1', // Modern indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  primaryGlow: 'rgba(99, 102, 241, 0.25)',
  primarySoft: 'rgba(99, 102, 241, 0.1)',
  
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
  background: '#FFFFFF', // Pure white background
  backgroundDark: '#FFFFFF', // Changed from dark to white
  backgroundSoft: '#F9FAFB', // Light gray for soft backgrounds
  cardBackground: '#FFFFFF',
  
  // Text Colors - Enhanced
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  textHint: '#CBD5E1',
  textMuted: '#9CA3AF',
  
  // Status Colors - Enhanced
  success: '#10B981',
  successSoft: 'rgba(16, 185, 129, 0.1)',
  error: '#EF4444',
  errorSoft: 'rgba(239, 68, 68, 0.1)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.1)',
  info: '#3B82F6',
  infoSoft: 'rgba(59, 130, 246, 0.1)',
  
  // Input Colors - Enhanced
  inputBorder: '#E2E8F0',
  inputBorderFocused: '#6366F1',
  inputBorderError: '#EF4444',
  inputBackground: '#FFFFFF',
  inputPlaceholder: '#9CA3AF',
  inputDisabled: '#F8FAFC',
  
  // Shadow and Effects - Enhanced
  shadow: 'rgba(15, 23, 42, 0.08)',
  shadowMedium: 'rgba(15, 23, 42, 0.12)',
  shadowDark: 'rgba(15, 23, 42, 0.20)',
  shadowPrimary: 'rgba(99, 102, 241, 0.3)',
  shadowSuccess: 'rgba(16, 185, 129, 0.3)',
  shadowError: 'rgba(239, 68, 68, 0.3)',
  
  // Gradients - Enhanced
  gradientPrimary: ['#6366F1', '#8B5CF6'],
  gradientSecondary: ['#F59E0B', '#EF4444'],
  gradientBackground: ['#F8FAFC', '#E2E8F0'],
  gradientCard: ['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.95)'],
  
  // Border Colors - Enhanced
  borderLight: '#F1F5F9',
  borderMedium: '#E2E8F0',
  borderDark: '#CBD5E1',
  borderPrimary: '#6366F1',
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
