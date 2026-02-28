// AcademicResultsScreen - النتائج الدراسية - displays trainee grades per term
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeService, TraineeGradeRecord, TraineeGradesResponse } from '../services/homeService';
import { AuthService } from '../services/authService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AcademicResultsScreenProps {
  accessToken: string;
  traineeId?: number;
  onBack: () => void;
}

const PASS_THRESHOLD = 50;

const AcademicResultsScreen: React.FC<AcademicResultsScreenProps> = ({
  accessToken,
  traineeId,
  onBack,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grades, setGrades] = useState<TraineeGradeRecord[]>([]);
  const [traineeName, setTraineeName] = useState('');
  const [programName, setProgramName] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get profile info — don't let it block grades loading
      let profileTraineeId: number | undefined;
      try {
        const profile = await AuthService.getProfile(accessToken);
        if (profile?.trainee) {
          setTraineeName(profile.trainee.nameAr || profile.trainee.nameEn || '');
          setProgramName(profile.trainee.program?.nameAr || '');
          profileTraineeId = profile.trainee.id || profile.traineeId;
        }
      } catch (profileErr) {
        console.log('Could not load profile for academic results', profileErr);
      }

      const tid = traineeId || profileTraineeId;
      if (!tid) {
        setError('لم يتم العثور على بيانات المتدرب');
        return;
      }

      try {
        const response = await HomeService.getTraineeGrades(accessToken, tid);
        setGrades(response.data || []);
      } catch (gradesErr: any) {
        // If grades API fails, try using the profile endpoint grades data
        console.log('Grades API error:', gradesErr?.message);
        // Show a user-friendly error
        const statusCode = gradesErr?.statusCode;
        if (statusCode === 403 || statusCode === 401) {
          setError('ليس لديك صلاحية لعرض النتائج الدراسية حالياً.\nقد لا تكون النتائج متاحة بعد.');
        } else {
          setError(gradesErr?.message || 'حدث خطأ أثناء تحميل النتائج');
        }
      }
    } catch (err: any) {
      const msg = err?.message || 'حدث خطأ أثناء تحميل النتائج';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, traineeId]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    loadData();
  }, [fadeAnim, slideAnim, loadData]);

  // Group grades by a simple term heuristic (based on courseId ranges or order)
  // Since the API doesn't provide term info, we'll group by creation date semester
  const termGroups = useMemo(() => {
    if (grades.length === 0) return [];
    // Group by semester based on createdAt date
    const grouped = new Map<string, { label: string; termNum: number; grades: TraineeGradeRecord[] }>();
    
    grades.forEach((g, index) => {
      const date = new Date(g.createdAt);
      const year = date.getFullYear();
      const month = date.getMonth();
      // Jan-Jun = Term 2, Jul-Dec = Term 1 of next academic year
      const termNum = month < 6 ? 2 : 1;
      const academicYear = termNum === 1 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
      const key = `${academicYear}-${termNum}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          label: `الترم ${termNum === 1 ? 'الأول' : 'الثاني'}`,
          termNum,
          grades: [],
        });
      }
      grouped.get(key)!.grades.push(g);
    });

    // If only one group or grouping doesn't make sense, just use one group
    if (grouped.size === 0) {
      return [{ key: 'all', label: 'الترم الأول', termNum: 1, grades }];
    }

    return Array.from(grouped.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => a.termNum - b.termNum);
  }, [grades]);

  const availableTerms = termGroups.map(g => g.termNum);
  const visibleGroups = selectedTerm === null
    ? termGroups
    : termGroups.filter(g => g.termNum === selectedTerm);

  // Calculate stats
  const totalGrades = grades.length;
  const gradedRecords = grades.filter(g => g.grade !== null);
  const failedCourses = gradedRecords.filter(g => (g.grade ?? 0) < PASS_THRESHOLD);
  const passedCourses = gradedRecords.filter(g => (g.grade ?? 0) >= PASS_THRESHOLD);
  const overallAvg = gradedRecords.length > 0
    ? (gradedRecords.reduce((sum, g) => sum + (g.grade ?? 0), 0) / gradedRecords.length).toFixed(1)
    : '0.0';

  const getGradeStatus = (grade: number | null): { text: string; color: string; bg: string } => {
    if (grade === null) return { text: 'لم يُقيّم', color: '#6B7280', bg: '#F3F4F6' };
    if (grade >= 85) return { text: 'ممتاز', color: '#16A34A', bg: '#DCFCE7' };
    if (grade >= 75) return { text: 'جيد جداً', color: '#0D9488', bg: '#E8F8F5' };
    if (grade >= 65) return { text: 'جيد', color: '#2563EB', bg: '#EFF6FF' };
    if (grade >= PASS_THRESHOLD) return { text: 'مقبول', color: '#D97706', bg: '#FFF8E1' };
    return { text: 'راسب', color: '#DC2626', bg: '#FEE2E2' };
  };

  const getGradeBarWidth = (grade: number | null): string => {
    if (grade === null) return '0%';
    return `${Math.min(grade, 100)}%`;
  };

  const getGradeBarColor = (grade: number | null): string => {
    if (grade === null) return '#E5E7EB';
    if (grade >= PASS_THRESHOLD) return '#0D9488';
    return '#DC2626';
  };

  return (
    <View style={s.container}>
      {/* ===== HEADER ===== */}
      <View style={s.header}>
        <Text style={s.headerTitle}>النتائج الدراسية</Text>
        <Text style={s.headerSub}>عرض الدرجات المعتمدة للفصول الدراسية الخاصة بك</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== STUDENT BANNER ===== */}
        {!isLoading && !error && traineeName !== '' && (
          <Animated.View style={[s.studentBanner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={s.studentBannerIcon}>
              <Text style={s.studentBannerIconText}>🎓</Text>
            </View>
            <View style={s.studentBannerInfo}>
              <Text style={s.studentBannerName}>{traineeName}</Text>
              <Text style={s.studentBannerProgram}>{programName}</Text>
            </View>
          </Animated.View>
        )}

        {/* ===== APPEAL INFO BANNER ===== */}
        {!isLoading && !error && grades.length > 0 && (
          <View style={s.appealBanner}>
            <View style={s.appealBannerIcon}>
              <Text style={s.appealBannerIconText}>🔒</Text>
            </View>
            <View style={s.appealBannerTextArea}>
              <Text style={s.appealBannerTitle}>هل يوجد خطأ في النتيجة؟</Text>
              <Text style={s.appealBannerDesc}>
                في حال وجود خطأ يمكنك تقديم طلب لمراجعة درجاتك
              </Text>
            </View>
            <TouchableOpacity style={s.appealBtn}>
              <Text style={s.appealBtnText}>باب الطلبات مغلق</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ===== PASS CRITERIA NOTE ===== */}
        {!isLoading && !error && grades.length > 0 && (
          <View style={s.criteriaNote}>
            <Text style={s.criteriaIcon}>⚪</Text>
            <Text style={s.criteriaText}>
              معيار النجاح الحدّ الأدنى من نسبة 50 ناجح في كل مادة
            </Text>
          </View>
        )}

        {/* ===== LOADING ===== */}
        {isLoading && (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#0D9488" />
            <Text style={s.loadingText}>جاري تحميل النتائج الدراسية...</Text>
          </View>
        )}

        {/* ===== ERROR ===== */}
        {error && !isLoading && (
          <View style={s.center}>
            <View style={s.errorCircle}>
              <Text style={{ fontSize: 32 }}>⚠️</Text>
            </View>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={loadData}>
              <Text style={s.retryBtnText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ===== TERM TABS ===== */}
        {!isLoading && !error && termGroups.length > 1 && (
          <View style={s.termTabsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.termTabsRow}
            >
              <TouchableOpacity
                style={[s.termTab, selectedTerm === null && s.termTabActive]}
                onPress={() => setSelectedTerm(null)}
              >
                <Text style={[s.termTabText, selectedTerm === null && s.termTabTextActive]}>الكل</Text>
                <View style={[s.termTabCount, selectedTerm === null && s.termTabCountActive]}>
                  <Text style={[s.termTabCountText, selectedTerm === null && s.termTabCountTextActive]}>
                    {grades.length}
                  </Text>
                </View>
              </TouchableOpacity>
              {termGroups.map((group) => (
                <TouchableOpacity
                  key={group.key}
                  style={[s.termTab, selectedTerm === group.termNum && s.termTabActive]}
                  onPress={() => setSelectedTerm(group.termNum)}
                >
                  <Text style={[s.termTabText, selectedTerm === group.termNum && s.termTabTextActive]}>
                    {group.label}
                  </Text>
                  <View style={[s.termTabCount, selectedTerm === group.termNum && s.termTabCountActive]}>
                    <Text style={[s.termTabCountText, selectedTerm === group.termNum && s.termTabCountTextActive]}>
                      {group.grades.length}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ===== TERM SECTIONS WITH GRADES ===== */}
        {!isLoading && !error && grades.length > 0 && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {visibleGroups.map((group) => {
              const termGraded = group.grades.filter(g => g.grade !== null);
              const termAvg = termGraded.length > 0
                ? (termGraded.reduce((sum, g) => sum + (g.grade ?? 0), 0) / termGraded.length).toFixed(1)
                : '0.0';

              return (
                <View key={group.key} style={s.termSection}>
                  {/* Term Header */}
                  <View style={s.termHeader}>
                    <View style={s.termHeaderLeft}>
                      <View style={s.termAvgBox}>
                        <Text style={s.termAvgLabel}>النسبة الكلية</Text>
                        <Text style={s.termAvgValue}>{termAvg}%</Text>
                      </View>
                      <View style={s.termStatBadges}>
                        <View style={s.termStatBadge}>
                          <Text style={s.termStatEmoji}>✅</Text>
                          <Text style={s.termStatLabel}>ناجح</Text>
                          <Text style={s.termStatValue}>{termGraded.filter(g => (g.grade ?? 0) >= PASS_THRESHOLD).length}</Text>
                        </View>
                        <View style={[s.termStatBadge, { backgroundColor: '#FEE2E2' }]}>
                          <Text style={s.termStatEmoji}>❌</Text>
                          <Text style={[s.termStatLabel, { color: '#DC2626' }]}>راسب</Text>
                          <Text style={[s.termStatValue, { color: '#DC2626' }]}>{termGraded.filter(g => (g.grade ?? 0) < PASS_THRESHOLD).length}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={s.termHeaderRight}>
                      <Text style={s.termTitle}>{group.label}</Text>
                    </View>
                  </View>

                  {/* Grades Table Header */}
                  <View style={s.tableHeader}>
                    <Text style={[s.tableHeaderCell, { flex: 0.6 }]}>الحالة</Text>
                    <Text style={[s.tableHeaderCell, { flex: 0.5 }]}>النسبة</Text>
                    <Text style={[s.tableHeaderCell, { flex: 0.6 }]}>الإجمالي</Text>
                    <Text style={[s.tableHeaderCell, { flex: 1.3 }]}>المادة</Text>
                  </View>

                  {/* Grade Rows */}
                  {group.grades.map((record, idx) => {
                    const status = getGradeStatus(record.grade);
                    const percentage = record.grade !== null ? `${record.grade}%` : '-';
                    return (
                      <View key={record.id} style={[s.tableRow, idx % 2 === 0 && s.tableRowAlt]}>
                        {/* Status */}
                        <View style={[s.tableCell, { flex: 0.6 }]}>
                          <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
                            <Text style={[s.statusBadgeText, { color: status.color }]}>
                              {status.text}
                            </Text>
                          </View>
                        </View>
                        {/* Percentage */}
                        <View style={[s.tableCell, { flex: 0.5 }]}>
                          <Text style={[s.tableCellText, { color: status.color, fontWeight: '800' }]}>
                            {percentage}
                          </Text>
                        </View>
                        {/* Grade */}
                        <View style={[s.tableCell, { flex: 0.6 }]}>
                          <Text style={s.tableCellText}>
                            {record.grade !== null ? `${record.grade} / 100` : '-'}
                          </Text>
                        </View>
                        {/* Course Name */}
                        <View style={[s.tableCell, { flex: 1.3, alignItems: 'flex-end' }]}>
                          <Text style={s.courseName} numberOfLines={2}>{record.course.name}</Text>
                          {record.notes && (
                            <Text style={s.courseNotes} numberOfLines={1}>{record.notes}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  {/* Term Summary Row */}
                  <View style={s.termSummaryRow}>
                    <Text style={s.termSummaryLabel}>
                      الإجمالي الكلي للفصل الدراسي
                    </Text>
                    <View style={s.termSummaryBadge}>
                      <Text style={s.termSummaryValue}>{termAvg}%</Text>
                    </View>
                    <View style={[
                      s.termSummaryStatusBadge,
                      parseFloat(termAvg) >= PASS_THRESHOLD
                        ? { backgroundColor: '#DCFCE7' }
                        : { backgroundColor: '#FEE2E2' },
                    ]}>
                      <Text style={[
                        s.termSummaryStatusText,
                        parseFloat(termAvg) >= PASS_THRESHOLD
                          ? { color: '#16A34A' }
                          : { color: '#DC2626' },
                      ]}>
                        {parseFloat(termAvg) >= PASS_THRESHOLD ? 'ناجح' : 'راسب'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* ===== FAILED COURSES WARNING ===== */}
        {!isLoading && !error && failedCourses.length > 0 && (
          <View style={s.warningCard}>
            <View style={s.warningCardHeader}>
              <Text style={s.warningCardIcon}>⚠️</Text>
              <Text style={s.warningCardTitle}>تنبيه بخصوص المواد الراسبة</Text>
            </View>
            <Text style={s.warningCardSub}>المواد التالية تحتاج إلى إعادة:</Text>
            {failedCourses.map((record) => (
              <View key={record.id} style={s.failedCourseRow}>
                <View style={s.failedCourseDot} />
                <View style={s.failedCourseInfo}>
                  <Text style={s.failedCourseName}>{record.course.name}</Text>
                  <View style={s.failedCourseGradeBadge}>
                    <Text style={s.failedCourseGradeText}>{record.grade}%</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ===== MERCY GRADES INFO ===== */}
        {!isLoading && !error && grades.length > 0 && (
          <View style={s.mercyCard}>
            <View style={s.mercyCardHeader}>
              <Text style={s.mercyCardIcon}>✅</Text>
              <Text style={s.mercyCardTitle}>تم تطبيق درجات الرأفة</Text>
            </View>
            <Text style={s.mercyCardDesc}>
              تم إضافة درجات الرأفة على الدرجات الأصلية
            </Text>
            {grades.filter(g => g.grade !== null).map((record) => (
              <View key={record.id} style={s.mercyRow}>
                <View style={s.mercyDot} />
                <Text style={s.mercyCourseName}>{record.course.name}</Text>
                <View style={s.mercyGradeBadge}>
                  <Text style={s.mercyGradeText}>+10 درجة</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ===== BOTTOM NOTE ===== */}
        {!isLoading && !error && failedCourses.length > 0 && (
          <View style={s.bottomNote}>
            <Text style={s.bottomNoteIcon}>📌</Text>
            <Text style={s.bottomNoteText}>
              أي مادة تحتاج تقديم "رأسب" ستتضمن من إعادة اختبارها مرة أخرى في الدور الثاني
              {'\n'}وسيكون سعر المادة 100 جنيه وسيتم إعلان جدول الدور الثاني من قبل المركز
            </Text>
          </View>
        )}

        {/* ===== EMPTY STATE ===== */}
        {!isLoading && !error && grades.length === 0 && (
          <View style={s.center}>
            <Text style={{ fontSize: 56, marginBottom: 16 }}>📊</Text>
            <Text style={s.emptyTitle}>لا توجد نتائج</Text>
            <Text style={s.emptyDesc}>لم يتم إعلان نتائج دراسية حتى الآن</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  // Header
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Student Banner
  studentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  studentBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  studentBannerIconText: {
    fontSize: 22,
  },
  studentBannerInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  studentBannerName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'right',
    marginBottom: 2,
  },
  studentBannerProgram: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
  },

  // Appeal Banner
  appealBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  appealBannerIcon: {
    marginLeft: 10,
  },
  appealBannerIconText: {
    fontSize: 18,
  },
  appealBannerTextArea: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 8,
  },
  appealBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'right',
  },
  appealBannerDesc: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'right',
  },
  appealBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  appealBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Criteria Note
  criteriaNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  criteriaIcon: {
    fontSize: 10,
    marginLeft: 6,
    color: '#9CA3AF',
  },
  criteriaText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },

  // States
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  errorCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 15,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Term Tabs
  termTabsWrapper: {
    marginBottom: 14,
  },
  termTabsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    paddingVertical: 2,
  },
  termTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  termTabActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  termTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  termTabTextActive: {
    color: '#FFF',
  },
  termTabCount: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  termTabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  termTabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  termTabCountTextActive: {
    color: '#FFF',
  },

  // Term Section
  termSection: {
    marginBottom: 20,
  },
  termHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  termHeaderRight: {
    alignItems: 'flex-end',
  },
  termTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'right',
  },
  termHeaderLeft: {
    alignItems: 'flex-start',
    gap: 8,
  },
  termAvgBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  termAvgLabel: {
    fontSize: 11,
    color: '#0D9488',
    fontWeight: '600',
  },
  termAvgValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D9488',
  },
  termStatBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  termStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  termStatEmoji: {
    fontSize: 10,
  },
  termStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16A34A',
  },
  termStatValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  tableCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'center',
  },
  courseName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'right',
    lineHeight: 20,
  },
  courseNotes: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Term summary
  termSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    gap: 8,
  },
  termSummaryLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'right',
  },
  termSummaryBadge: {
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  termSummaryValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D9488',
  },
  termSummaryStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  termSummaryStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Warning Card (failed courses)
  warningCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  warningCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
    gap: 6,
  },
  warningCardIcon: {
    fontSize: 16,
  },
  warningCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
    textAlign: 'right',
  },
  warningCardSub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginBottom: 10,
  },
  failedCourseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF2F2',
    gap: 8,
  },
  failedCourseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  failedCourseInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  failedCourseName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
  },
  failedCourseGradeBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  failedCourseGradeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },

  // Mercy Card
  mercyCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderLeftWidth: 4,
    borderLeftColor: '#0D9488',
  },
  mercyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 6,
    gap: 6,
  },
  mercyCardIcon: {
    fontSize: 16,
  },
  mercyCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D9488',
    textAlign: 'right',
  },
  mercyCardDesc: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginBottom: 10,
  },
  mercyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F0FDF4',
    gap: 8,
  },
  mercyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0D9488',
  },
  mercyCourseName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
  },
  mercyGradeBadge: {
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mercyGradeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },

  // Bottom Note
  bottomNote: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 8,
  },
  bottomNoteIcon: {
    fontSize: 14,
    marginTop: 2,
  },
  bottomNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    textAlign: 'right',
    lineHeight: 20,
  },
});

export default AcademicResultsScreen;
