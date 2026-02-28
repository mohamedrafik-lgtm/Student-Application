import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {gradesService} from '../services/gradesService';
import {
  GradesResponse,
  MyGradesResponse,
  ClassroomWithContents,
  ContentWithGrades,
  GradeType,
  GRADE_TYPE_INFO,
  GradesError,
  Grades,
  MaxMarks,
} from '../types/grades';

interface GradesScreenProps {
  accessToken: string;
  onBack: () => void;
}

const GradesScreen: React.FC<GradesScreenProps> = ({accessToken, onBack}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradesData, setGradesData] = useState<GradesResponse | null>(null);
  const [expandedClassroom, setExpandedClassroom] = useState<number | null>(
    null,
  );
  const [expandedContent, setExpandedContent] = useState<number | null>(null);

  useEffect(() => {
    loadGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGrades = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response: MyGradesResponse =
        await gradesService.getMyGrades(accessToken);
      if (response.success) {
        setGradesData(response.data);
      } else {
        setError(response.message || 'فشل في تحميل الدرجات');
      }
    } catch (err) {
      const apiError = err as GradesError;
      let errorMessage = 'حدث خطأ أثناء تحميل الدرجات';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getGradeColor = (percentage: number): string => {
    if (percentage >= 90) return '#10B981';
    if (percentage >= 80) return '#3B82F6';
    if (percentage >= 70) return '#F59E0B';
    if (percentage >= 60) return '#EF4444';
    return '#6B7280';
  };

  const getGradeStatus = (percentage: number): string => {
    if (percentage >= 90) return 'ممتاز';
    if (percentage >= 80) return 'جيد جداً';
    if (percentage >= 70) return 'جيد';
    if (percentage >= 60) return 'مقبول';
    return 'راسب';
  };

  const formatGrade = (earned: number, max: number): string => {
    return `${earned}/${max}`;
  };

  const toggleClassroom = (classroomId: number) => {
    setExpandedClassroom(prev => (prev === classroomId ? null : classroomId));
    setExpandedContent(null);
  };

  const toggleContent = (contentId: number) => {
    setExpandedContent(prev => (prev === contentId ? null : contentId));
  };

  const renderProgressBar = (percentage: number, color: string) => (
    <View style={s.progressBarBg}>
      <View
        style={[
          s.progressBarFill,
          {width: `${Math.min(percentage, 100)}%`, backgroundColor: color},
        ]}
      />
    </View>
  );

  const renderGradeBreakdown = (contentItem: ContentWithGrades) => {
    const gradeTypes = Object.values(GradeType);
    const grades: Grades = contentItem.grades;
    const maxMarks: MaxMarks = contentItem.maxMarks;

    return (
      <View style={s.breakdownContainer}>
        {gradeTypes.map(gradeType => {
          const gradeInfo = GRADE_TYPE_INFO[gradeType];
          const earned = grades[gradeType as keyof Grades] || 0;
          const max = maxMarks[gradeType as keyof MaxMarks] || 0;
          if (max === 0) return null;

          const percentage = max > 0 ? (earned / max) * 100 : 0;
          const color = getGradeColor(percentage);

          return (
            <View key={gradeType} style={s.gradeTypeRow}>
              <View style={s.gradeTypeLeft}>
                <Text style={s.gradeTypeEmoji}>{gradeInfo.icon}</Text>
                <View style={s.gradeTypeInfo}>
                  <Text style={s.gradeTypeLabel}>{gradeInfo.labelAr}</Text>
                  <Text style={s.gradeTypeMarks}>
                    {formatGrade(earned, max)}
                  </Text>
                </View>
              </View>
              <View style={s.gradeTypeRight}>
                <Text style={[s.gradeTypePct, {color}]}>
                  {percentage.toFixed(0)}%
                </Text>
                {renderProgressBar(percentage, color)}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderContentCard = (
    contentItem: ContentWithGrades,
    classroomId: number,
  ) => {
    const isExpanded = expandedContent === contentItem.content.id;
    const percentage = contentItem.percentage || 0;
    const color = getGradeColor(percentage);

    return (
      <View key={contentItem.content.id} style={s.contentCard}>
        <TouchableOpacity
          style={s.contentCardHeader}
          onPress={() => toggleContent(contentItem.content.id)}
          activeOpacity={0.7}>
          <View style={s.contentCardLeft}>
            <View style={[s.contentDot, {backgroundColor: color}]} />
            <View style={{flex: 1}}>
              <Text style={s.contentName} numberOfLines={1}>
                {contentItem.content.name}
              </Text>
              {contentItem.content.code && (
                <Text style={s.contentCode}>{contentItem.content.code}</Text>
              )}
            </View>
          </View>
          <View style={s.contentCardRight}>
            <Text style={[s.contentPct, {color}]}>
              {percentage.toFixed(0)}%
            </Text>
            <Text style={s.expandArrow}>{isExpanded ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {/* Mini Progress */}
        <View style={s.contentProgress}>
          {renderProgressBar(percentage, color)}
        </View>

        {isExpanded && renderGradeBreakdown(contentItem)}
      </View>
    );
  };

  const renderClassroomCard = (classroomData: ClassroomWithContents) => {
    const isExpanded = expandedClassroom === classroomData.classroom.id;

    return (
      <View key={classroomData.classroom.id} style={s.classroomCard}>
        <TouchableOpacity
          style={s.classroomHeader}
          onPress={() => toggleClassroom(classroomData.classroom.id)}
          activeOpacity={0.7}>
          <View style={s.classroomLeft}>
            <View style={s.classroomIcon}>
              <Text style={s.classroomIconText}>🎓</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={s.classroomName} numberOfLines={1}>
                {classroomData.classroom.name}
              </Text>
              <Text style={s.classroomSub}>
                {classroomData.contents?.length || 0} مقرر
              </Text>
            </View>
          </View>
          <Text style={s.classroomArrow}>{isExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {isExpanded && classroomData.contents && (
          <View style={s.classroomContents}>
            {classroomData.contents.map((contentItem: ContentWithGrades) =>
              renderContentCard(contentItem, classroomData.classroom.id),
            )}
          </View>
        )}
      </View>
    );
  };

  // Loading
  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={s.loadingText}>جاري تحميل الدرجات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error
  if (error) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerBox}>
          <Text style={s.errorEmoji}>⚠️</Text>
          <Text style={s.errorTitle}>خطأ</Text>
          <Text style={s.errorMsg}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadGrades}>
            <Text style={s.retryBtnText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const overallPercentage = gradesData?.overallStats?.percentage || 0;
  const overallColor = getGradeColor(overallPercentage);
  const overallStatus = getGradeStatus(overallPercentage);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={onBack}>
            <Text style={s.backArrow}>→</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>الدرجات</Text>
            <Text style={s.headerSub}>نتائج المقررات الدراسية</Text>
          </View>
          <View style={{width: 38}} />
        </View>

        {/* Overall Stats Card */}
        {gradesData && (
          <View style={s.overallCard}>
            {/* Trainee Name */}
            {gradesData.trainee?.nameAr && (
              <Text style={s.traineeName}>{gradesData.trainee.nameAr}</Text>
            )}

            {/* Percentage Circle */}
            <View style={s.circleRow}>
              <View style={[s.circle, {borderColor: overallColor}]}>
                <Text style={[s.circlePct, {color: overallColor}]}>
                  {overallPercentage.toFixed(0)}%
                </Text>
                <Text style={s.circleLabel}>المعدل العام</Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={s.statsGrid}>
              <View style={s.statsGridItem}>
                <Text style={[s.statsGridValue, {color: overallColor}]}>
                  {overallPercentage.toFixed(1)}%
                </Text>
                <Text style={s.statsGridLabel}>النسبة المئوية</Text>
              </View>
              <View style={s.statsGridDivider} />
              <View style={s.statsGridItem}>
                <Text style={s.statsGridValue}>
                  {gradesData.overallStats?.totalEarned || 0}/
                  {gradesData.overallStats?.totalMax || 0}
                </Text>
                <Text style={s.statsGridLabel}>الدرجات</Text>
              </View>
              <View style={s.statsGridDivider} />
              <View style={s.statsGridItem}>
                <Text style={s.statsGridValue}>
                  {gradesData.overallStats?.totalContents || 0}
                </Text>
                <Text style={s.statsGridLabel}>المقررات</Text>
              </View>
            </View>

            {/* Status Badge */}
            <View
              style={[s.statusBadge, {backgroundColor: overallColor + '18'}]}>
              <Text style={[s.statusBadgeText, {color: overallColor}]}>
                {overallStatus}
              </Text>
            </View>
          </View>
        )}

        {/* Classrooms */}
        {gradesData?.classrooms && gradesData.classrooms.length > 0 ? (
          <View style={s.classroomsList}>
            {gradesData.classrooms.map(
              (classroomData: ClassroomWithContents) =>
                renderClassroomCard(classroomData),
            )}
          </View>
        ) : (
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>📊</Text>
            <Text style={s.emptyTitle}>لا توجد درجات</Text>
            <Text style={s.emptyMsg}>لم يتم العثور على درجات مسجلة</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E95A2',
  },
  errorEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1D26',
    marginBottom: 8,
  },
  errorMsg: {
    fontSize: 15,
    color: '#8E95A2',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: '#2563EB',
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1D26',
  },
  headerSub: {
    fontSize: 13,
    color: '#8E95A2',
    marginTop: 2,
  },

  /* Overall Card */
  overallCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    alignItems: 'center',
  },
  traineeName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1D26',
    marginBottom: 16,
    textAlign: 'center',
  },
  circleRow: {
    marginBottom: 20,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFBFC',
  },
  circlePct: {
    fontSize: 28,
    fontWeight: '800',
  },
  circleLabel: {
    fontSize: 11,
    color: '#8E95A2',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  statsGridItem: {
    alignItems: 'center',
    flex: 1,
  },
  statsGridValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D26',
    marginBottom: 4,
  },
  statsGridLabel: {
    fontSize: 12,
    color: '#8E95A2',
  },
  statsGridDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#EEF2F6',
  },
  statusBadge: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 15,
    fontWeight: '700',
  },

  /* Classrooms */
  classroomsList: {
    marginTop: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  classroomCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    overflow: 'hidden',
  },
  classroomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  classroomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  classroomIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  classroomIconText: {
    fontSize: 20,
  },
  classroomName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D26',
  },
  classroomSub: {
    fontSize: 13,
    color: '#8E95A2',
    marginTop: 2,
  },
  classroomArrow: {
    fontSize: 12,
    color: '#8E95A2',
    marginLeft: 8,
  },
  classroomContents: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },

  /* Content Card */
  contentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    overflow: 'hidden',
  },
  contentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  contentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  contentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1D26',
  },
  contentCode: {
    fontSize: 12,
    color: '#8E95A2',
    marginTop: 2,
  },
  contentCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contentPct: {
    fontSize: 16,
    fontWeight: '700',
  },
  expandArrow: {
    fontSize: 10,
    color: '#8E95A2',
  },
  contentProgress: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },

  /* Progress Bar */
  progressBarBg: {
    height: 6,
    backgroundColor: '#EEF2F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* Grade Breakdown */
  breakdownContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    paddingTop: 12,
  },
  gradeTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gradeTypeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  gradeTypeEmoji: {
    fontSize: 18,
  },
  gradeTypeInfo: {
    flex: 1,
  },
  gradeTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1D26',
  },
  gradeTypeMarks: {
    fontSize: 11,
    color: '#8E95A2',
    marginTop: 1,
  },
  gradeTypeRight: {
    alignItems: 'flex-end',
    width: 80,
  },
  gradeTypePct: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },

  /* Empty */
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 48,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D26',
    marginBottom: 8,
  },
  emptyMsg: {
    fontSize: 14,
    color: '#8E95A2',
  },
});

export default GradesScreen;
