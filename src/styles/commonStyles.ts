// Shared styles — Premium Design System
// Used across all screens for consistent, modern look and feel

import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

// ── Unified Design Tokens (aligned with Colors.ts — Emerald Green theme) ──
export const WebColors = {
  // Backgrounds
  screenBg: '#F0FDF4',
  cardBg: '#FFFFFF',
  headerBg: '#FFFFFF',

  // Text
  title: '#111827',
  subtitle: '#6B7280',
  body: '#374151',
  hint: '#9CA3AF',

  // Primary — ALWAYS emerald green
  primary: '#059669',
  primarySoft: '#ECFDF5',
  primaryLight: '#10B981',

  // Status
  success: '#059669',
  successBg: '#ECFDF5',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  info: '#2563EB',
  infoBg: '#EFF6FF',

  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderMedium: '#D1D5DB',

  // Misc
  badgeBg: '#F0FDF4',
  avatarBg: '#059669',
  separator: '#F9FAFB',
};

// ── Shared screen-level styles ──
export const commonStyles = StyleSheet.create({
  /* ── Screen Container ── */
  screen: {
    flex: 1,
    backgroundColor: WebColors.screenBg,
  },

  /* ── Header ── */
  header: {
    backgroundColor: WebColors.headerBg,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: WebColors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitleArea: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: WebColors.title,
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 13,
    color: WebColors.subtitle,
    marginTop: 4,
    textAlign: 'right',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WebColors.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: WebColors.title,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 38,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WebColors.badgeBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerBadgeText: {
    fontSize: 12,
    color: WebColors.subtitle,
    fontWeight: '500',
  },
  headerActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WebColors.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Scroll ── */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  /* ── Cards ── */
  card: {
    backgroundColor: WebColors.cardBg,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardSmall: {
    backgroundColor: WebColors.cardBg,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  /* ── Section Title ── */
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: WebColors.title,
    textAlign: 'right',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  /* ── Loading / Error / Empty ── */
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: WebColors.subtitle,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 15,
    color: WebColors.error,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: WebColors.title,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 15,
    color: WebColors.subtitle,
    textAlign: 'center',
    lineHeight: 24,
  },

  /* ── Stat Card ── */
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    minWidth: 55,
  },
  statCardLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: '800',
    color: WebColors.title,
  },

  /* ── Pill Badge ── */
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* ── Avatar Circle ── */
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: WebColors.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ── Filter / Term Tabs ── */
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: WebColors.cardBg,
    borderWidth: 1.5,
    borderColor: WebColors.borderMedium,
  },
  filterTabActive: {
    backgroundColor: WebColors.primary,
    borderColor: WebColors.primary,
  },
  filterTabText: {
    fontSize: 13,
    color: WebColors.subtitle,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },

  /* ── Form ── */
  formCard: {
    backgroundColor: WebColors.cardBg,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: WebColors.title,
    textAlign: 'right',
    marginBottom: 8,
  },
  formTextArea: {
    backgroundColor: WebColors.screenBg,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: WebColors.title,
    textAlign: 'right',
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: WebColors.borderMedium,
  },

  /* ── Refresh button ── */
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WebColors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});
