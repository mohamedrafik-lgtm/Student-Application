// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles attendance display and navigation
// 2. Open/Closed: Can be extended with new attendance types without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for attendance
// 4. Dependency Inversion: Depends on abstractions (components) not concretions

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';
import Icon from '../components/shared/Icon';
import ScreenHeader from '../components/shared/ScreenHeader';
import { Colors } from '../styles/colors';
import { attendanceService } from '../services/attendanceService';
import { API_CONFIG } from '../services/apiConfig';
import {
  AttendanceResponse,
  ContentGroup,
  AttendanceSession,
  AttendanceStatus,
  SessionType,
  DayOfWeek,
  ATTENDANCE_STATUS_INFO,
  SESSION_TYPE_INFO,
  DAY_OF_WEEK_INFO,
  AttendanceError,
} from '../types/attendance';

const { width } = Dimensions.get('window');

interface AttendanceScreenProps {
  accessToken: string;
  onBack: () => void;
}

// Term filter type
type TermFilter = 'term1' | 'term2' | 'practical';

const AttendanceScreen: React.FC<AttendanceScreenProps> = ({
  accessToken,
  onBack,
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceResponse | null>(null);
  const [expandedContent, setExpandedContent] = useState<number | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<TermFilter>('term2');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Loading attendance records...');
      const response = await attendanceService.getAttendanceRecords(accessToken);

      console.log('Attendance records loaded successfully!');

      if (response.success && response.data) {
        setAttendanceData(response.data);
      } else if (response.success === false) {
        const errorMessage = response.message || 'فشل في تحميل سجلات الحضور';
        setError(errorMessage);
        setAttendanceData(null);
      } else {
        console.warn('Invalid response structure');
        setAttendanceData(null);
      }
    } catch (error) {
      console.error('Failed to load attendance records:', error);
      const apiError = error as AttendanceError;

      if (apiError && apiError.message && apiError.message.includes('BASE_URL')) {
        setError(
          'خطأ تكوين: لم يتم تعيين عنوان الخادم (BASE_URL). يرجى اختيار الفرع أو إعادة تهيئة التطبيق.',
        );
        setAttendanceData(null);
        setIsLoading(false);
        return;
      }

      let errorMessage = 'حدث خطأ أثناء تحميل سجلات الحضور';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      } else if (apiError.statusCode === 404) {
        errorMessage = 'لم يتم العثور على سجلات حضور';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadAttendance();
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return Colors.primaryLight;
    if (rate >= 80) return Colors.info;
    if (rate >= 70) return Colors.accent;
    if (rate >= 60) return Colors.error;
    return Colors.textLight;
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPercentage = (rate: number) => {
    return `${Math.round(rate)}%`;
  };

  const toggleContent = (contentId: number) => {
    setExpandedContent(expandedContent === contentId ? null : contentId);
  };

  // Get first letter of content name for the avatar circle
  const getContentInitial = (name: string) => {
    return name.charAt(0) || 'م';
  };

  // ────────────────────────────────────────────────
  // Render helpers
  // ────────────────────────────────────────────────

  /** Circular percentage indicator (matches the website's 0% circle) */
  const renderCircularProgress = (percentage: number) => {
    const color = getAttendanceColor(percentage);
    return (
      <View style={styles.circularProgressContainer}>
        <View style={[styles.circularProgressOuter, { borderColor: Colors.borderMedium }]}>
          <View style={styles.circularProgressInner}>
            <Text style={[styles.circularProgressText, { color }]}>
              {formatPercentage(percentage)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  /** One coloured stat card inside the summary row */
  const renderStatCard = (
    label: string,
    value: number,
    icon: React.ReactNode,
    bgColor: string,
    iconColor: string,
  ) => (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <View style={styles.statCardHeader}>
        {icon}
        <Text style={[styles.statCardLabel, { color: iconColor }]}>{label}</Text>
      </View>
      <Text style={styles.statCardValue}>{value}</Text>
    </View>
  );

  /** A single session row inside an expanded subject card */
  const renderSessionCard = (session: AttendanceSession) => {
    const statusInfo = ATTENDANCE_STATUS_INFO[session.status];
    const dayInfo = DAY_OF_WEEK_INFO[session.dayOfWeek];

    return (
      <View key={session.id} style={styles.sessionRow}>
        {/* Status badge – left side */}
        <View style={styles.sessionLeft}>
          <View
            style={[
              styles.sessionStatusBadge,
              { backgroundColor: statusInfo.backgroundColor },
            ]}>
            <Text style={[styles.sessionStatusText, { color: statusInfo.color }]}>
              {statusInfo.labelAr}
            </Text>
          </View>
        </View>

        {/* Date info – right side */}
        <View style={styles.sessionRight}>
          <View style={styles.sessionDateRow}>
            <Icon name="clock-outline" size={14} color="#8E95A2" />
            <Text style={styles.sessionDayText}>{dayInfo.labelAr}</Text>
            <Text style={styles.sessionDateDot}>•</Text>
            <Text style={styles.sessionDateText}>{formatDate(session.date)}</Text>
          </View>
          {session.isCancelled && (
            <View style={styles.cancelledBadge}>
              <Text style={styles.cancelledText}>ملغاة</Text>
            </View>
          )}
          {session.notes && <Text style={styles.sessionNotes}>{session.notes}</Text>}
        </View>
      </View>
    );
  };

  /** Subject / content group card (matches website layout) */
  const renderContentGroup = (contentGroup: ContentGroup) => {
    const isExpanded = expandedContent === contentGroup.content.id;
    const { stats } = contentGroup;

    return (
      <View key={contentGroup.content.id} style={styles.contentCard}>
        {/* ── Card header ── */}
        <TouchableOpacity
          style={styles.contentCardHeader}
          onPress={() => toggleContent(contentGroup.content.id)}
          activeOpacity={0.7}>
          {/* Left: expand arrow + mini attendance/absence counters */}
          <View style={styles.contentCardLeft}>
            <View style={styles.expandButton}>
              <Text style={styles.expandIcon}>{isExpanded ? '∧' : '∨'}</Text>
            </View>
            <View style={styles.contentMiniStats}>
              <View style={styles.miniStatItem}>
                <Text style={styles.miniStatValue}>{stats.present}</Text>
                <Text style={styles.miniStatLabelGreen}>حضور</Text>
              </View>
              <View style={styles.miniStatItem}>
                <Text style={[styles.miniStatValue, { color: Colors.error }]}>
                  {stats.absent}
                </Text>
                <Text style={styles.miniStatLabelRed}>غياب</Text>
              </View>
            </View>
          </View>

          {/* Right: subject name + badges + avatar circle */}
          <View style={styles.contentCardRight}>
            <View style={styles.contentNameArea}>
              <Text style={styles.contentName}>{contentGroup.content.nameAr}</Text>
              <View style={styles.contentBadges}>
                <View style={styles.attendanceBadge}>
                  <Text style={styles.attendanceBadgeText}>
                    {formatPercentage(stats.attendanceRate)} حضور
                  </Text>
                </View>
                <View style={styles.lectureBadge}>
                  <Text style={styles.lectureBadgeText}>
                    {stats.total} محاضرة
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.contentAvatar}>
              <Text style={styles.contentAvatarText}>
                {getContentInitial(contentGroup.content.nameAr)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Expanded sessions list ── */}
        {isExpanded && (
          <View style={styles.sessionsContainer}>
            {contentGroup.sessions.length > 0 ? (
              contentGroup.sessions.map(renderSessionCard)
            ) : (
              <View style={styles.noSessionsContainer}>
                <Text style={styles.noSessionsText}>
                  لا توجد سجلات حضور لهذه المادة
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // ────────────────────────────────────────────────
  // Main render
  // ────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="سجل الحضور" subtitle="متابعة حضورك في المحاضرات التدريبية" onBack={onBack} />

      {/* ══════════ Body ══════════ */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }>
        {/* Loading */}
        {isLoading && !isRefreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>جاري تحميل سجلات الحضور...</Text>
          </View>
        )}

        {/* Error */}
        {error && !isLoading && (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle-outline" size={56} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <CustomButton
              title="إعادة المحاولة"
              onPress={loadAttendance}
              variant="outline"
              size="medium"
            />
          </View>
        )}

        {/* ══════════ Attendance Data ══════════ */}
        {!isLoading && !error && attendanceData && (
          <Animated.View
            style={[
              styles.attendanceContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}>
            {/* ── Overall Stats Summary ── */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                {renderStatCard(
                  'تأخر',
                  attendanceData.stats.late,
                  <Icon name="clock-outline" size={12} color={Colors.warning} />,
                  Colors.warningLight,
                  Colors.warning,
                )}
                {renderStatCard(
                  'غياب',
                  attendanceData.stats.absent,
                  '✕',
                  Colors.errorLight,
                  Colors.error,
                )}
                {renderStatCard(
                  'حضور',
                  attendanceData.stats.present,
                  '✓',
                  Colors.successLight,
                  Colors.success,
                )}
                {renderStatCard(
                  'إجمالي المحاضرات',
                  attendanceData.stats.total,
                  <Icon name="clipboard-text-outline" size={12} color={Colors.info} />,
                  Colors.infoLight,
                  Colors.info,
                )}

                {/* Circular progress */}
                {renderCircularProgress(attendanceData.stats.attendanceRate)}
              </View>
            </View>

            {/* ── Term Filter Tabs ── */}
            <View style={styles.termFilterContainer}>
              <TouchableOpacity
                style={[
                  styles.termTab,
                  selectedTerm === 'practical' && styles.termTabActive,
                ]}
                onPress={() => setSelectedTerm('practical')}>
                <Text
                  style={[
                    styles.termTabText,
                    selectedTerm === 'practical' && styles.termTabTextActive,
                  ]}>
                  التدريب العملي والتكليفات
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.termTab,
                  selectedTerm === 'term2' && styles.termTabActive,
                ]}
                onPress={() => setSelectedTerm('term2')}>
                <Text
                  style={[
                    styles.termTabText,
                    selectedTerm === 'term2' && styles.termTabTextActive,
                  ]}>
                  الترم الثاني
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.termTab,
                  selectedTerm === 'term1' && styles.termTabActive,
                ]}
                onPress={() => setSelectedTerm('term1')}>
                <Text
                  style={[
                    styles.termTabText,
                    selectedTerm === 'term1' && styles.termTabTextActive,
                  ]}>
                  الترم الأول
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Section Title: سجل المواد ── */}
            <View style={styles.sectionTitleRow}>
              <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                <Icon name="refresh" size={16} color="#8E95A2" />
              </TouchableOpacity>
              <View style={styles.sectionTitleRight}>
                <Text style={styles.sectionTitle}>سجل المواد</Text>
              </View>
            </View>

            {/* ── Content / Subject Cards ── */}
            <View style={styles.contentGroupsContainer}>
              {attendanceData.contentGroups.map(renderContentGroup)}
            </View>
          </Animated.View>
        )}

        {/* Empty */}
        {!isLoading && !error && !attendanceData && (
          <View style={styles.emptyContainer}>
            <Icon name="calendar-outline" size={56} color={Colors.primary} />
            <Text style={styles.emptyTitle}>لا توجد سجلات حضور</Text>
            <Text style={styles.emptyDescription}>
              لا توجد سجلات حضور متاحة لك في الوقت الحالي
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ────────────────────────────────────────────────────
// Styles – matching the website design (light, clean)
// ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /* ══════ Container ══════ */
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundAlt,
  },

  /* ══════ Header ══════ */
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTop: {
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
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
    textAlign: 'right',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  updatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  updatedBadgeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  updatedBadgeText: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
  },

  /* ══════ Scroll ══════ */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  /* ══════ Loading / Error / Empty ══════ */
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: Colors.textLight,
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
    color: Colors.error,
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
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 15,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },

  /* ══════ Attendance Container ══════ */
  attendanceContainer: {
    gap: 16,
  },

  /* ══════ Summary Card ══════ */
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  /* ══════ Stat Card ══════ */
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    minWidth: 55,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  statCardIcon: {
    fontSize: 12,
  },
  statCardLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  /* ══════ Circular Progress ══════ */
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  circularProgressOuter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressText: {
    fontSize: 18,
    fontWeight: '800',
  },

  /* ══════ Term Filter Tabs ══════ */
  termFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  termTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.borderMedium,
  },
  termTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  termTabText: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: '700',
  },
  termTabTextActive: {
    color: '#FFFFFF',
  },

  /* ══════ Section Title ══════ */
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitleRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  refreshIcon: {
    fontSize: 16,
  },

  /* ══════ Content Groups ══════ */
  contentGroupsContainer: {
    gap: 12,
  },

  /* ══════ Content Card (Subject) ══════ */
  contentCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  contentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },

  // Right side — name + badges + blue avatar
  contentCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  contentNameArea: {
    alignItems: 'flex-end',
    marginRight: 12,
    flex: 1,
  },
  contentName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: 6,
  },
  contentBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  attendanceBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  attendanceBadgeText: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '600',
  },
  lectureBadge: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lectureBadgeText: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: '600',
  },
  contentAvatar: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Left side — expand arrow + mini stats
  contentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expandButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandIcon: {
    fontSize: 16,
    color: Colors.textLight,
    fontWeight: '700',
  },
  contentMiniStats: {
    flexDirection: 'row',
    gap: 12,
  },
  miniStatItem: {
    alignItems: 'center',
  },
  miniStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  miniStatLabelGreen: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: '600',
    marginTop: 2,
  },
  miniStatLabelRed: {
    fontSize: 10,
    color: Colors.error,
    fontWeight: '600',
    marginTop: 2,
  },

  /* ══════ Sessions (expanded) ══════ */
  sessionsContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingVertical: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sessionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    gap: 6,
  },
  sessionDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionDateIcon: {
    fontSize: 14,
    color: Colors.textLight,
  },
  sessionDayText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  sessionDateDot: {
    fontSize: 10,
    color: Colors.borderMedium,
  },
  sessionDateText: {
    fontSize: 13,
    color: Colors.textLight,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionStatusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sessionStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cancelledBadge: {
    backgroundColor: Colors.errorLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  cancelledText: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: '600',
  },
  sessionNotes: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
    textAlign: 'right',
  },
  noSessionsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noSessionsText: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
  },
});

export default AttendanceScreen;
