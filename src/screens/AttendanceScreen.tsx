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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';
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
  AttendanceError 
} from '../types/attendance';

const { width } = Dimensions.get('window');

interface AttendanceScreenProps {
  accessToken: string;
  onBack: () => void;
}

const AttendanceScreen: React.FC<AttendanceScreenProps> = ({ 
  accessToken, 
  onBack 
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceResponse | null>(null);
  const [expandedContent, setExpandedContent] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | AttendanceStatus>('all');

  useEffect(() => {
    // Start animations
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

    // Load attendance data
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Loading attendance records...');
      console.log('ℹ️ API_BASE_URL:', API_CONFIG.BASE_URL);
      console.log('ℹ️ accessToken present:', !!accessToken, accessToken ? `${accessToken.substring(0,20)}...` : 'no-token');

      const response = await attendanceService.getAttendanceRecords(accessToken);
      
      console.log('✅ Attendance records loaded successfully!');
      console.log('📊 Response structure:', {
        success: response.success,
        hasData: !!response.data,
        traineeName: response.data?.trainee?.nameAr,
        attendanceRate: response.data?.stats?.attendanceRate,
        contentGroupsCount: response.data?.contentGroups?.length || 0
      });
      
      // التحقق من وجود البيانات قبل التعيين
      if (response.success && response.data) {
        setAttendanceData(response.data);
      } else if (response.success === false) {
        // إذا كان response.success = false، عرض رسالة الخطأ من الـ API
        const errorMessage = response.message || 'فشل في تحميل سجلات الحضور';
        setError(errorMessage);
        setAttendanceData(null);
      } else {
        console.warn('⚠️ Invalid response structure or no attendance records found');
        setAttendanceData(null);
        
      }

    } catch (error) {
      console.error('❌ Failed to load attendance records:', error);
      const apiError = error as AttendanceError;

      // Surface BASE_URL missing clearly to the UI
      if (apiError && apiError.message && apiError.message.includes('BASE_URL')) {
        setError('خطأ تكوين: لم يتم تعيين عنوان الخادم (BASE_URL). يرجى اختيار الفرع أو إعادة تهيئة التطبيق.');
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
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return '#10B981'; // أخضر
    if (rate >= 80) return '#3B82F6'; // أزرق
    if (rate >= 70) return '#F59E0B'; // برتقالي
    if (rate >= 60) return '#EF4444'; // أحمر
    return '#6B7280'; // رمادي
  };

  const getAttendanceStatus = (rate: number) => {
    if (rate >= 90) return 'ممتاز';
    if (rate >= 80) return 'جيد جداً';
    if (rate >= 70) return 'جيد';
    if (rate >= 60) return 'مقبول';
    return 'ضعيف';
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  const toggleContent = (contentId: number) => {
    setExpandedContent(expandedContent === contentId ? null : contentId);
  };

  const getFilteredSessions = (sessions: AttendanceSession[]) => {
    if (selectedFilter === 'all') {
      return sessions;
    }
    return sessions.filter(session => session.status === selectedFilter);
  };

  const renderSessionCard = (session: AttendanceSession) => {
    const statusInfo = ATTENDANCE_STATUS_INFO[session.status];
    const sessionTypeInfo = SESSION_TYPE_INFO[session.sessionType];
    const dayInfo = DAY_OF_WEEK_INFO[session.dayOfWeek];

    return (
      <View key={session.id} style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
            <Text style={styles.sessionDay}>{dayInfo.labelAr}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: statusInfo.backgroundColor }
          ]}>
            <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
            <Text style={[
              styles.statusText,
              { color: statusInfo.color }
            ]}>
              {statusInfo.labelAr}
            </Text>
          </View>
        </View>

        <View style={styles.sessionDetails}>
          <View style={styles.sessionType}>
            <Text style={styles.sessionTypeIcon}>{sessionTypeInfo.icon}</Text>
            <Text style={styles.sessionTypeText}>{sessionTypeInfo.labelAr}</Text>
          </View>
          
          {session.isCancelled && (
            <View style={styles.cancelledBadge}>
              <Text style={styles.cancelledText}>ملغاة</Text>
            </View>
          )}
        </View>

        {session.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>ملاحظات:</Text>
            <Text style={styles.notesText}>{session.notes}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderContentGroup = (contentGroup: ContentGroup) => {
    const isExpanded = expandedContent === contentGroup.content.id;
    const filteredSessions = getFilteredSessions(contentGroup.sessions);

    return (
      <View key={contentGroup.content.id} style={styles.contentGroupCard}>
        {/* Content Header */}
        <TouchableOpacity
          style={styles.contentHeader}
          onPress={() => toggleContent(contentGroup.content.id)}
          activeOpacity={0.7}
        >
          <View style={styles.contentInfo}>
            <Text style={styles.contentName}>{contentGroup.content.nameAr}</Text>
            <Text style={styles.contentStats}>
              {contentGroup.stats.total} جلسة • {formatPercentage(contentGroup.stats.attendanceRate)}
            </Text>
          </View>
          <View style={styles.contentGrade}>
            <Text style={[
              styles.contentPercentage,
              { color: getAttendanceColor(contentGroup.stats.attendanceRate) }
            ]}>
              {formatPercentage(contentGroup.stats.attendanceRate)}
            </Text>
            <Text style={styles.expandIcon}>
              {isExpanded ? '▲' : '▼'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Content Stats */}
        <View style={styles.contentStatsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={styles.statValue}>{contentGroup.stats.present}</Text>
            <Text style={styles.statLabel}>حاضر</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>❌</Text>
            <Text style={styles.statValue}>{contentGroup.stats.absent}</Text>
            <Text style={styles.statLabel}>غائب</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>⏰</Text>
            <Text style={styles.statValue}>{contentGroup.stats.late}</Text>
            <Text style={styles.statLabel}>متأخر</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>📝</Text>
            <Text style={styles.statValue}>{contentGroup.stats.excused}</Text>
            <Text style={styles.statLabel}>بعذر</Text>
          </View>
        </View>

        {/* Expanded Sessions */}
        {isExpanded && (
          <Animated.View style={[
            styles.sessionsContainer,
            { opacity: fadeAnim }
          ]}>
            <Text style={styles.sessionsTitle}>سجلات الحضور:</Text>
            {filteredSessions.length > 0 ? (
              filteredSessions.map(renderSessionCard)
            ) : (
              <View style={styles.noSessionsContainer}>
                <Text style={styles.noSessionsText}>لا توجد جلسات تطابق الفلتر المحدد</Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الحضور والغياب</Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      {/* Filter Tabs */}
      {!isLoading && !error && attendanceData && attendanceData.contentGroups.length > 0 && (
        <Animated.View style={[
          styles.filterContainer,
          { opacity: fadeAnim }
        ]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <TouchableOpacity
              style={[
                styles.filterTab,
                selectedFilter === 'all' && styles.filterTabActive
              ]}
              onPress={() => setSelectedFilter('all')}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === 'all' && styles.filterTabTextActive
              ]}>
                الكل
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                selectedFilter === AttendanceStatus.PRESENT && styles.filterTabActive
              ]}
              onPress={() => setSelectedFilter(AttendanceStatus.PRESENT)}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === AttendanceStatus.PRESENT && styles.filterTabTextActive
              ]}>
                حاضر
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                selectedFilter === AttendanceStatus.ABSENT && styles.filterTabActive
              ]}
              onPress={() => setSelectedFilter(AttendanceStatus.ABSENT)}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === AttendanceStatus.ABSENT && styles.filterTabTextActive
              ]}>
                غائب
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                selectedFilter === AttendanceStatus.LATE && styles.filterTabActive
              ]}
              onPress={() => setSelectedFilter(AttendanceStatus.LATE)}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === AttendanceStatus.LATE && styles.filterTabTextActive
              ]}>
                متأخر
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                selectedFilter === AttendanceStatus.EXCUSED && styles.filterTabActive
              ]}
              onPress={() => setSelectedFilter(AttendanceStatus.EXCUSED)}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === AttendanceStatus.EXCUSED && styles.filterTabTextActive
              ]}>
                بعذر
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      )}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Loading State */}
        {isLoading && (
          <Animated.View style={[
            styles.loadingContainer,
            { opacity: fadeAnim }
          ]}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>جاري تحميل سجلات الحضور...</Text>
          </Animated.View>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Animated.View style={[
            styles.errorContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <CustomButton
              title="إعادة المحاولة"
              onPress={loadAttendance}
              variant="outline"
              size="medium"
            />
          </Animated.View>
        )}

        {/* Attendance Data */}
        {!isLoading && !error && attendanceData && (
          <Animated.View style={[
            styles.attendanceContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            {/* Overall Stats */}
            <View style={styles.overallStatsCard}>
              <View style={styles.overallStatsHeader}>
                <Text style={styles.overallStatsTitle}>إحصائيات الحضور</Text>
                <Text style={styles.traineeName}>{attendanceData.trainee.nameAr}</Text>
              </View>
              
              <View style={styles.overallStatsContent}>
                <View style={styles.overallStatItem}>
                  <Text style={styles.overallStatValue}>
                    {formatPercentage(attendanceData.stats.attendanceRate)}
                  </Text>
                  <Text style={styles.overallStatLabel}>نسبة الحضور</Text>
                </View>
                
                <View style={styles.overallStatItem}>
                  <Text style={styles.overallStatValue}>
                    {attendanceData.stats.total}
                  </Text>
                  <Text style={styles.overallStatLabel}>إجمالي الجلسات</Text>
                </View>
                
                <View style={styles.overallStatItem}>
                  <Text style={styles.overallStatValue}>
                    {attendanceData.stats.present}
                  </Text>
                  <Text style={styles.overallStatLabel}>حاضر</Text>
                </View>
              </View>

              <View style={[
                styles.overallStatusBadge,
                { backgroundColor: getAttendanceColor(attendanceData.stats.attendanceRate) + '20' }
              ]}>
                <Text style={[
                  styles.overallStatusText,
                  { color: getAttendanceColor(attendanceData.stats.attendanceRate) }
                ]}>
                  {getAttendanceStatus(attendanceData.stats.attendanceRate)}
                </Text>
              </View>
            </View>

            {/* Content Groups */}
            <View style={styles.contentGroupsContainer}>
              <Text style={styles.contentGroupsTitle}>المواد الدراسية</Text>
              {attendanceData.contentGroups.map(renderContentGroup)}
            </View>
          </Animated.View>
        )}

        {/* Empty State */}
        {!isLoading && !error && !attendanceData && (
          <Animated.View style={[
            styles.emptyContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>لا توجد سجلات حضور</Text>
            <Text style={styles.emptyDescription}>
              لا توجد سجلات حضور متاحة لك في الوقت الحالي
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
  },
  filterScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  attendanceContainer: {
    gap: 20,
  },
  overallStatsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  overallStatsHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  overallStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  traineeName: {
    fontSize: 16,
    color: '#6B7280',
  },
  overallStatsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  overallStatItem: {
    alignItems: 'center',
  },
  overallStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  overallStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  overallStatusBadge: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  overallStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentGroupsContainer: {
    gap: 16,
  },
  contentGroupsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  contentGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  contentInfo: {
    flex: 1,
  },
  contentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  contentStats: {
    fontSize: 14,
    color: '#6B7280',
  },
  contentGrade: {
    alignItems: 'flex-end',
  },
  contentPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  expandIcon: {
    fontSize: 16,
    color: '#6B7280',
  },
  contentStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  sessionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  sessionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sessionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sessionDay: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  statusIcon: {
    fontSize: 14,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionTypeIcon: {
    fontSize: 16,
  },
  sessionTypeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  cancelledBadge: {
    backgroundColor: '#EF444420',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cancelledText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  notesLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  noSessionsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noSessionsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default AttendanceScreen;
