// AcademicResultsScreen — النتائج الدراسية (matching web design exactly)
// Uses gradesService + types/grades.ts (classrooms > contents > grades/maxMarks)
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, Modal,
  TextInput, Alert, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { gradesService } from '../services/gradesService';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
import { HomeService } from '../services/homeService';
import ScreenHeader from '../components/shared/ScreenHeader';
import {
  GradesResponse, ClassroomWithContents, ContentWithGrades,
  GradeType, GRADE_TYPE_INFO, Grades, MaxMarks,
} from '../types/grades';

const { width: SW } = Dimensions.get('window');
const PASS = 50;

/* ══════════════════════════════════ PROPS ══════════════════════════════════ */
interface Props {
  accessToken: string;
  traineeId?: number;
  onBack: () => void;
}

/* ══════════════════════════════════ GRADE COLUMN DEFINITIONS ══════════════════════════════════ */
// These match the web table columns exactly:
// أعمال السنة | العملي | التحريري | الحضور | اختبارات أونلاين | العملي(يوم)
interface GradeColumn {
  key: GradeType;
  label: string;
  gradeField: keyof Grades;
  maxField: keyof MaxMarks;
}

const GRADE_COLUMNS: GradeColumn[] = [
  { key: GradeType.YEAR_WORK, label: 'أعمال السنة', gradeField: 'yearWorkMarks', maxField: 'yearWorkMarks' },
  { key: GradeType.PRACTICAL, label: 'العملي', gradeField: 'practicalMarks', maxField: 'practicalMarks' },
  { key: GradeType.WRITTEN, label: 'التحريري', gradeField: 'writtenMarks', maxField: 'writtenMarks' },
  { key: GradeType.ATTENDANCE, label: 'الحضور', gradeField: 'attendanceMarks', maxField: 'attendanceMarks' },
  { key: GradeType.QUIZZES, label: 'اختبارات أونلاين', gradeField: 'quizzesMarks', maxField: 'quizzesMarks' },
  { key: GradeType.FINAL_EXAM, label: 'العملي(يوم)', gradeField: 'finalExamMarks', maxField: 'finalExamMarks' },
];

/* ══════════════════════════════════ HELPERS ══════════════════════════════════ */
const getPassStatus = (pct: number): { text: string; color: string; bg: string } => {
  if (pct >= 85) return { text: 'ممتاز', color: Colors.success, bg: Colors.successLight };
  if (pct >= 75) return { text: 'جيد جداً', color: Colors.secondary, bg: Colors.successLight };
  if (pct >= 65) return { text: 'جيد', color: Colors.primary, bg: Colors.infoLight };
  if (pct >= PASS) return { text: 'مقبول', color: Colors.warning, bg: Colors.warningLight };
  return { text: 'راسب', color: Colors.error, bg: Colors.errorLight };
};



/** Which columns actually have data > 0 in at least one content row */
const getActiveColumns = (contents: ContentWithGrades[]): GradeColumn[] => {
  return GRADE_COLUMNS.filter(col => {
    return contents.some(c => {
      const maxVal = (c.maxMarks as any)[col.maxField] ?? 0;
      return maxVal > 0;
    });
  });
};

/* ══════════════════════════════════ COMPONENT ══════════════════════════════════ */
const AcademicResultsScreen: React.FC<Props> = ({ accessToken, onBack }) => {
  const [gradesData, setGradesData] = useState<GradesResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* appeal modal */
  const [appealModalVisible, setAppealModalVisible] = useState(false);
  const [appealContent, setAppealContent] = useState<ContentWithGrades | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealRequestedGrade, setAppealRequestedGrade] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  /* ── Load data ── */
  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) { setIsLoading(true); setError(null); }

      const gradesRes = await gradesService.getMyGrades(accessToken);

      if (gradesRes.success && gradesRes.data) {
        setGradesData(gradesRes.data);
      } else {
        setGradesData(null);
      }

      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (err: any) {
      const code = err?.statusCode;
      if (code === 403 || code === 401) {
        setError('ليس لديك صلاحية لعرض النتائج الدراسية حالياً.');
      } else {
        setError(err?.message || 'حدث خطأ أثناء تحميل النتائج');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accessToken, fadeAnim]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setIsRefreshing(true); loadData(true); };

  /* ── Derived data ── */
  const trainee = gradesData?.trainee;
  const overallStats = gradesData?.overallStats;
  const classrooms = gradesData?.classrooms ?? [];

  // Flatten all content rows for counting
  const allContents = useMemo(() => {
    const result: ContentWithGrades[] = [];
    classrooms.forEach(cl => cl.contents?.forEach(c => result.push(c)));
    return result;
  }, [classrooms]);

  const failedContents = useMemo(() =>
    allContents.filter(c => c.percentage < PASS),
  [allContents]);

  const passedContents = useMemo(() =>
    allContents.filter(c => c.percentage >= PASS),
  [allContents]);



  /* ── Appeal ── */
  const openAppealModal = (content: ContentWithGrades) => {
    setAppealContent(content);
    setAppealReason('');
    setAppealRequestedGrade('');
    setAppealModalVisible(true);
  };

  const submitAppeal = async () => {
    if (!appealContent) return;
    if (!appealReason.trim()) {
      Alert.alert('خطأ', 'يرجى كتابة سبب التظلم');
      return;
    }
    try {
      setIsSubmitting(true);
      const body: { gradeId: number; reason: string; requestedGrade?: number } = {
        gradeId: appealContent.content.id,
        reason: appealReason.trim(),
      };
      if (appealRequestedGrade.trim()) {
        const rg = Number(appealRequestedGrade);
        if (!isNaN(rg) && rg > 0) body.requestedGrade = rg;
      }
      await HomeService.createGradeAppeal(accessToken, body);
      Alert.alert('تم بنجاح ✅', 'تم تقديم التظلم بنجاح وسيتم مراجعته من الإدارة.');
      setAppealModalVisible(false);
      loadData(true);
    } catch (err: any) {
      Alert.alert('فشل التقديم', err?.message || 'حدث خطأ أثناء تقديم التظلم');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ══════════════════════════════════ TABLE DIMENSIONS ══════════════════════════════════ */
  const COL_SUBJECT = 110;
  const COL_GRADE = 65;
  const COL_TOTAL = 70;
  const COL_PCT = 55;
  const COL_RATING = 55;
  const COL_STATUS = 55;

  /* ══════════════════════════════════ SUB-RENDERS ══════════════════════════════════ */

  /* ── 1. Student Banner ── */
  const renderStudentBanner = () => {
    if (!trainee) return null;
    return (
      <View style={st.studentBanner}>
        <View style={st.studentBannerIcon}>
          <Text style={st.studentBannerIconText}>✅</Text>
        </View>
        <View style={st.studentBannerInfo}>
          <Text style={st.studentBannerName}>{trainee.nameAr || trainee.nameEn}</Text>
          <Text style={st.studentBannerProgram}>{trainee.program?.nameAr || ''}</Text>
        </View>
      </View>
    );
  };


  /* ── 3. Pass Criteria ── */
  const renderCriteria = () => (
    <View style={st.criteriaRow}>
      <Text style={st.criteriaText}>
        معيار النجاح: الحصول على نسبة 50% فأعلى في كل مادة
      </Text>
      <Text style={st.criteriaIcon}>⚪</Text>
    </View>
  );



  /* ── 5. Term Header + Table per Classroom ── */
  const renderClassroom = (cl: ClassroomWithContents, clIdx: number) => {
    if (!cl.contents || cl.contents.length === 0) return null;

    // Hide term if all grades are zero (results not published yet)
    const hasAnyGrades = cl.contents.some(c => (c.grades?.totalMarks ?? 0) > 0);
    if (!hasAnyGrades) return null;

    const activeColumns = getActiveColumns(cl.contents);
    const tableWidth = COL_SUBJECT + (activeColumns.length * COL_GRADE) + COL_TOTAL + COL_PCT + COL_RATING + COL_STATUS;

    const clStats = cl.stats;
    const clPct = clStats?.percentage ?? 0;
    const clPassed = cl.contents.filter(c => c.percentage >= PASS).length;
    const clFailed = cl.contents.filter(c => c.percentage < PASS).length;
    const pctStatus = getPassStatus(clPct);

    return (
      <View key={cl.classroom?.id ?? clIdx} style={st.termSection}>
        {/* TERM HEADER CARD */}
        <View style={st.termCard}>
          <View style={st.termTitleRow}>
            <Text style={st.termTitle}>{cl.classroom?.name || `الترم ${clIdx + 1}`}</Text>
          </View>

          <View style={st.termStatsRow}>
            {/* Left: pass/fail badges */}
            <View style={st.termStatBadges}>
              <View style={[st.termStatBadge, { backgroundColor: Colors.successLight }]}>
                <Text style={[st.termStatValue, { color: Colors.success }]}>{clPassed}</Text>
                <Text style={[st.termStatLabel, { color: Colors.success }]}>ناجح</Text>
                <Text style={st.termStatEmoji}>✅</Text>
              </View>
              <View style={[st.termStatBadge, { backgroundColor: Colors.errorLight }]}>
                <Text style={[st.termStatValue, { color: Colors.error }]}>{clFailed}</Text>
                <Text style={[st.termStatLabel, { color: Colors.error }]}>راسب</Text>
                <Text style={st.termStatEmoji}>❌</Text>
              </View>
            </View>

            {/* Right: overall percentage */}
            <View style={st.termPctBox}>
              <View style={[st.termPctBadge, { backgroundColor: pctStatus.bg }]}>
                <Text style={[st.termPctBadgeText, { color: pctStatus.color }]}>{pctStatus.text}</Text>
              </View>
              <Text style={[st.termPctValue, { color: pctStatus.color }]}>{clPct.toFixed(1)}%</Text>
              <View style={st.termPctDetail}>
                <Text style={st.termPctDetailText}>
                  {clStats?.totalEarned ?? 0} / {clStats?.totalMax ?? 0}
                </Text>
                <Text style={st.termPctLabel}>النسبة الكلية</Text>
              </View>
            </View>
          </View>
        </View>

        {/* PIVOTED GRADES TABLE */}
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={{ minWidth: tableWidth }}>
            {/* Header */}
            <View style={st.tHeader}>
              <View style={[st.tHCell, { width: COL_STATUS }]}>
                <Text style={st.tHText}>الحالة</Text>
              </View>
              <View style={[st.tHCell, { width: COL_RATING }]}>
                <Text style={st.tHText}>التقدير</Text>
              </View>
              <View style={[st.tHCell, { width: COL_PCT }]}>
                <Text style={st.tHText}>النسبة</Text>
              </View>
              <View style={[st.tHCell, { width: COL_TOTAL }]}>
                <Text style={st.tHText}>الإجمالي</Text>
              </View>
              {[...activeColumns].reverse().map(col => (
                <View key={col.key} style={[st.tHCell, { width: COL_GRADE }]}>
                  <Text style={st.tHText}>{col.label}</Text>
                </View>
              ))}
              <View style={[st.tHCell, { width: COL_SUBJECT }]}>
                <Text style={st.tHText}>المادة</Text>
              </View>
            </View>

            {/* Body rows */}
            {cl.contents.map((cg, idx) => {
              const pct = cg.percentage ?? 0;
              const status = getPassStatus(pct);
              const isFailed = pct < PASS;

              return (
                <View key={cg.content.id} style={[st.tRow, idx % 2 === 1 && st.tRowAlt, isFailed && st.tRowFailed]}>
                  {/* Status */}
                  <View style={[st.tCell, { width: COL_STATUS }]}>
                    <View style={[st.statusBadge, { backgroundColor: isFailed ? Colors.errorLight : Colors.successLight }]}>
                      <Text style={[st.statusBadgeText, { color: isFailed ? Colors.error : Colors.success }]}>
                        {isFailed ? 'راسب' : 'ناجح'}
                      </Text>
                    </View>
                  </View>

                  {/* Rating */}
                  <View style={[st.tCell, { width: COL_RATING }]}>
                    <View style={[st.ratingBadge, { backgroundColor: status.bg }]}>
                      <Text style={[st.ratingBadgeText, { color: status.color }]}>{status.text}</Text>
                    </View>
                  </View>

                  {/* Percentage */}
                  <View style={[st.tCell, { width: COL_PCT }]}>
                    <Text style={[st.tCellText, { color: isFailed ? Colors.error : Colors.success, fontWeight: '800' }]}>
                      {pct.toFixed(1)}%
                    </Text>
                  </View>

                  {/* Total */}
                  <View style={[st.tCell, { width: COL_TOTAL }]}>
                    <Text style={st.tCellText}>
                      {cg.grades.totalMarks}/{cg.maxMarks.total}
                    </Text>
                  </View>

                  {/* Grade columns (RTL reversed) */}
                  {[...activeColumns].reverse().map(col => {
                    const earned = (cg.grades as any)[col.gradeField] ?? 0;
                    const max = (cg.maxMarks as any)[col.maxField] ?? 0;
                    const hasData = max > 0;

                    return (
                      <View key={col.key} style={[st.tCell, { width: COL_GRADE }]}>
                        {hasData ? (
                          <Text style={[st.tCellText, { color: Colors.textSecondary }]}>
                            {earned}/{max}
                          </Text>
                        ) : (
                          <Text style={[st.tCellText, { color: Colors.borderDark }]}>-</Text>
                        )}
                      </View>
                    );
                  })}

                  {/* Subject */}
                  <View style={[st.tCell, { width: COL_SUBJECT, alignItems: 'flex-end', paddingHorizontal: 6 }]}>
                    <Text style={st.tSubjectText} numberOfLines={2}>{cg.content.name}</Text>
                  </View>
                </View>
              );
            })}

            {/* SUMMARY ROW */}
            <View style={st.tSummaryRow}>
              <View style={[st.tCell, { width: COL_STATUS }]}>
                <View style={[st.statusBadge, { backgroundColor: clPct >= PASS ? Colors.successLight : Colors.errorLight }]}>
                  <Text style={[st.statusBadgeText, { color: clPct >= PASS ? Colors.success : Colors.error }]}>
                    {clPct >= PASS ? 'ناجح' : 'راسب'}
                  </Text>
                </View>
              </View>
              <View style={[st.tCell, { width: COL_RATING }]} />
              <View style={[st.tCell, { width: COL_PCT }]}>
                <Text style={[st.tCellText, { fontWeight: '900', color: Colors.secondary }]}>
                  {clPct.toFixed(1)}%
                </Text>
              </View>
              <View style={[st.tCell, { width: COL_TOTAL }]}>
                <Text style={[st.tCellText, { fontWeight: '800' }]}>
                  {clStats?.totalEarned ?? 0}/{clStats?.totalMax ?? 0}
                </Text>
              </View>
              {[...activeColumns].reverse().map(col => (
                <View key={col.key} style={[st.tCell, { width: COL_GRADE }]} />
              ))}
              <View style={[st.tCell, { width: COL_SUBJECT, alignItems: 'flex-end', paddingHorizontal: 6 }]}>
                <Text style={st.tSummaryLabel}>الإجمالي الكلي للفصل الدراسي</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  /* ── 6. Failed Subjects Warning ── */
  const renderFailedWarning = () => {
    if (failedContents.length === 0) return null;
    return (
      <View style={st.warningCard}>
        <View style={st.warningHeader}>
          <Text style={st.warningTitle}>تنبيه بخصوص المواد الراسبة  ⚠️</Text>
        </View>
        <Text style={st.warningSubtitle}>يوجد {failedContents.length} مواد تقديراتهم راسب</Text>
        {failedContents.map(c => (
          <View key={c.content.id} style={st.failedRow}>
            <View style={st.failedPctBadge}>
              <Text style={st.failedPctText}>{c.percentage.toFixed(1)}%</Text>
            </View>
            <Text style={st.failedPctLabel}>النسبة الكلية</Text>
            <View style={st.failedDot} />
            <Text style={st.failedCourseName}>{c.content.name}</Text>
          </View>
        ))}
      </View>
    );
  };

  /* ── 7. Mercy Grades Card ── */
  const renderMercyCard = () => {
    // Look for contents that have mercy/bonus marks (finalExamMarks used as bonus in some setups)
    // Since no explicit mercy type, skip if no data suggests it
    // We'll show this section if there's mercy data from the API
    return null;
  };

  /* ── 8. Bottom Note ── */
  const renderBottomNote = () => {
    if (failedContents.length === 0) return null;
    return (
      <View style={st.bottomNote}>
        <Text style={st.bottomNoteText}>
          📌  أي مادة تكون تقديرها "راسب" ستلتحق من إعادة اختبارها مرة أخرى في الدور الثاني
          {'\n'}وسيكون سعر المادة 100 جنيه وسيتم إعلان جدول الدور الثاني من قبل المركز
        </Text>
      </View>
    );
  };

  /* ── Appeal Modal ── */
  const renderAppealModal = () => (
    <Modal
      visible={appealModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setAppealModalVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={st.modalOverlay}
      >
        <View style={st.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={st.modalHeaderRow}>
              <TouchableOpacity onPress={() => setAppealModalVisible(false)}>
                <Text style={st.modalClose}>✕</Text>
              </TouchableOpacity>
              <Text style={st.modalTitle}>📝 تقديم تظلم</Text>
            </View>

            {appealContent && (
              <View style={st.modalGradeInfo}>
                <Text style={st.modalGradeTitle}>{appealContent.content.name}</Text>
                <View style={st.modalGradeDetailsRow}>
                  <Text style={st.modalGradeDetail}>الدرجة: {appealContent.grades.totalMarks}/{appealContent.maxMarks.total}</Text>
                  <Text style={st.modalGradeDetail}>النسبة: {appealContent.percentage.toFixed(0)}%</Text>
                </View>
              </View>
            )}

            <Text style={st.inputLabel}>سبب التظلم *</Text>
            <TextInput
              style={st.textArea}
              value={appealReason}
              onChangeText={setAppealReason}
              placeholder="اكتب سبب التظلم بالتفصيل..."
              placeholderTextColor={Colors.textHint}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              textAlign="right"
            />

            <Text style={st.inputLabel}>الدرجة المطلوبة (اختياري)</Text>
            <TextInput
              style={st.textInput}
              value={appealRequestedGrade}
              onChangeText={setAppealRequestedGrade}
              placeholder="مثال: 85"
              placeholderTextColor={Colors.textHint}
              keyboardType="numeric"
              textAlign="right"
            />

            <TouchableOpacity
              style={[st.submitBtn, isSubmitting && st.submitBtnDisabled]}
              onPress={submitAppeal}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={st.submitBtnText}>تقديم التظلم</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  /* ══════════════════════════════════ MAIN RENDER ══════════════════════════════════ */
  return (
    <View style={st.container}>
      <ScreenHeader title="النتائج الدراسية" subtitle="عرض الدرجات المعتمدة للفصول الدراسية الخاصة بك" onBack={onBack} />

      {/* Loading */}
      {isLoading && (
        <View style={st.center}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={st.loadingText}>جاري تحميل النتائج الدراسية...</Text>
        </View>
      )}

      {/* Error */}
      {!isLoading && error && (
        <View style={st.center}>
          <View style={st.errorCircle}><Text style={{ fontSize: 32 }}>⚠️</Text></View>
          <Text style={st.errorText}>{error}</Text>
          <TouchableOpacity style={st.retryBtn} onPress={() => loadData()}>
            <Text style={st.retryBtnText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <ScrollView
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.secondary]} />}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Student Banner */}
            {renderStudentBanner()}

            {/* Pass Criteria */}
            {allContents.length > 0 && renderCriteria()}



            {/* Classroom Term + Table */}
            {classrooms.map((cl, idx) => renderClassroom(cl, idx))}

            {/* Empty state */}
            {allContents.length === 0 && (
              <View style={st.center}>
                <Text style={{ fontSize: 56, marginBottom: 16 }}>📊</Text>
                <Text style={st.emptyTitle}>لا توجد نتائج</Text>
                <Text style={st.emptyDesc}>لم يتم إعلان نتائج دراسية حتى الآن</Text>
              </View>
            )}

            {/* Failed Warning */}
            {renderFailedWarning()}

            {/* Bottom Note */}
            {renderBottomNote()}
          </Animated.View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {renderAppealModal()}
    </View>
  );
};

/* ══════════════════════════════════ STYLES ══════════════════════════════════ */
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.borderLight },

  /* Header */
  header: { display: 'none' as any },
  headerTitle: { fontSize: 0 },
  headerSub: { fontSize: 0 },

  scroll: { padding: 16, paddingBottom: 32 },

  /* Loading / Error */
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 16, fontSize: 14, color: Colors.textLight, fontWeight: '600' },
  errorCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.errorLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  errorText: { fontSize: 15, color: Colors.error, textAlign: 'center', marginBottom: 20, fontWeight: '600' },
  retryBtn: { backgroundColor: Colors.secondary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: Colors.textLight, textAlign: 'center' },

  /* 1. Student Banner */
  studentBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.secondary, borderRadius: 16, padding: 16, marginBottom: 14,
  },
  studentBannerIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
  studentBannerIconText: { fontSize: 22 },
  studentBannerInfo: { flex: 1, alignItems: 'flex-end' },
  studentBannerName: { fontSize: 17, fontWeight: '800', color: Colors.white, textAlign: 'right', marginBottom: 2 },
  studentBannerProgram: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'right' },

  /* 3. Criteria */
  criteriaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    marginBottom: 14, paddingHorizontal: 4, gap: 6,
  },
  criteriaIcon: { fontSize: 10, color: Colors.textHint },
  criteriaText: { fontSize: 12, color: Colors.textLight, textAlign: 'right' },

  /* 4. Previous Appeals */
  prevAppealsCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.borderMedium,
  },
  prevAppealsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    marginBottom: 10, gap: 8,
  },
  prevAppealsTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right' },
  prevAppealsBadge: { backgroundColor: Colors.borderLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  prevAppealsBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.textLight },
  prevAppealsChips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  prevAppealsChip: { backgroundColor: Colors.borderLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  prevAppealsChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  /* 5. Term Section */
  termSection: { marginBottom: 20 },
  termCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 2,
    borderWidth: 1, borderColor: Colors.borderMedium,
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },
  termTitleRow: { alignItems: 'flex-end', marginBottom: 14 },
  termTitle: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary, textAlign: 'right' },
  termClassroomName: { fontSize: 12, color: Colors.textLight, textAlign: 'right', marginTop: 2 },
  termStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  termStatBadges: { flexDirection: 'row', gap: 6 },
  termStatBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, gap: 4,
  },
  termStatEmoji: { fontSize: 11 },
  termStatLabel: { fontSize: 11, fontWeight: '600' },
  termStatValue: { fontSize: 13, fontWeight: '800' },
  termPctBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  termPctValue: { fontSize: 24, fontWeight: '900' },
  termPctDetail: { alignItems: 'flex-end' },
  termPctLabel: { fontSize: 10, color: Colors.textLight },
  termPctDetailText: { fontSize: 11, color: Colors.textLight, fontWeight: '600' },
  termPctBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  termPctBadgeText: { fontSize: 11, fontWeight: '700' },

  /* 6. Table */
  tHeader: {
    flexDirection: 'row', backgroundColor: Colors.inputDisabled, paddingVertical: 10,
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: Colors.borderMedium,
  },
  tHCell: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  tHText: { fontSize: 10, fontWeight: '700', color: Colors.textLight, textAlign: 'center' },
  tRow: {
    flexDirection: 'row', backgroundColor: Colors.white, paddingVertical: 12,
    borderBottomWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  tRowAlt: { backgroundColor: Colors.backgroundAlt },
  tRowFailed: { backgroundColor: Colors.errorLight },
  tCell: { alignItems: 'center', justifyContent: 'center' },
  tCellText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  tSubjectText: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', lineHeight: 16 },
  tSummaryRow: {
    flexDirection: 'row', backgroundColor: Colors.successLight, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.successBorder,
    borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
    alignItems: 'center',
  },
  tSummaryLabel: { fontSize: 10, fontWeight: '700', color: Colors.secondary, textAlign: 'right' },

  statusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  statusBadgeText: { fontSize: 9, fontWeight: '700' },
  ratingBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  ratingBadgeText: { fontSize: 9, fontWeight: '700' },

  /* 7. Warning Card */
  warningCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.errorBorder, borderRightWidth: 4, borderRightColor: Colors.error,
  },
  warningHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6 },
  warningTitle: { fontSize: 14, fontWeight: '800', color: Colors.error, textAlign: 'right' },
  warningSubtitle: { fontSize: 12, color: Colors.textLight, textAlign: 'right', marginBottom: 10 },
  failedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.errorLight, gap: 8,
  },
  failedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.error },
  failedCourseName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  failedPctLabel: { fontSize: 10, color: Colors.textHint },
  failedPctBadge: { backgroundColor: Colors.errorLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  failedPctText: { fontSize: 11, fontWeight: '700', color: Colors.error },

  /* 9. Bottom Note */
  bottomNote: {
    backgroundColor: Colors.infoLight, borderRadius: 12, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.infoBorder,
  },
  bottomNoteText: { flex: 1, fontSize: 12, color: Colors.primaryDark, textAlign: 'right', lineHeight: 20 },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, maxHeight: '85%',
  },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalClose: { fontSize: 22, color: Colors.textLight, padding: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  modalGradeInfo: {
    backgroundColor: Colors.inputDisabled, borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.borderMedium,
  },
  modalGradeTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 6 },
  modalGradeDetailsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10 },
  modalGradeDetail: { fontSize: 12, color: Colors.textLight },

  inputLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 6 },
  textArea: {
    backgroundColor: Colors.inputDisabled, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderMedium,
    padding: 12, fontSize: 14, color: Colors.textPrimary, minHeight: 100, marginBottom: 14,
    textAlignVertical: 'top', textAlign: 'right',
  },
  textInput: {
    backgroundColor: Colors.inputDisabled, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderMedium,
    padding: 12, fontSize: 14, color: Colors.textPrimary, marginBottom: 16, textAlign: 'right',
  },

  submitBtn: {
    backgroundColor: Colors.secondary, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: Colors.white },
});

export default AcademicResultsScreen;
