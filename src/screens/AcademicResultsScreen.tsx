// AcademicResultsScreen  النتائج الدراسية
// Uses GET /api/trainee-grades/{traineeId}/released
// Response: { trainee, classrooms[] }  each classroom has contents[], totalStats, releaseInfo

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Colors } from '../styles/colors';
import Icon from '../components/shared/Icon';
import ScreenHeader from '../components/shared/ScreenHeader';
import { academicGradesService } from '../services/academicGradesService';
import {
  ReleasedGradesResponse,
  ClassroomGrades,
  ContentGradeItem,
  getGradeColor,
} from '../types/academicGrades';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/*  PROPS  */
interface Props {
  accessToken: string;
  traineeId?: number;
  onBack: () => void;
}

/*  FIELD LABEL MAP  English API keys  Arabic labels  */
const FIELD_LABELS: Record<string, string> = {
  yearWorkMarks: 'أعمال السنة',
  practicalMarks: 'العملي',
  writtenMarks: 'التحريري',
  attendanceMarks: 'الحضور',
  quizzesMarks: 'الكويزات',
  finalExamMarks: 'الاختبار النهائي',
  totalMarks: 'الإجمالي',
  maxMarks: 'الدرجة العظمى',
  earnedMarks: 'الدرجة المكتسبة',
  percentage: 'النسبة المئوية',
  grade: 'التقدير',
  status: 'الحالة',
  yearWork: 'أعمال السنة',
  practical: 'العملي',
  written: 'التحريري',
  attendance: 'الحضور',
  quizzes: 'الكويزات',
  finalExam: 'الاختبار النهائي',
  total: 'الإجمالي',
  max: 'الدرجة العظمى',
  score: 'الدرجة',
  mark: 'الدرجة',
  marks: 'الدرجات',
  passingMarks: 'درجة النجاح',
  passingMark: 'درجة النجاح',
  maxYearWork: 'عظمى أعمال سنة',
  maxPractical: 'عظمى العملي',
  maxWritten: 'عظمى التحريري',
  maxAttendance: 'عظمى الحضور',
  maxQuizzes: 'عظمى الكويزات',
  maxFinalExam: 'عظمى الاختبار النهائي',
  totalMaxMarks: 'عظمى الإجمالي',
  round: 'الدور',
  isReleased: 'تم الإعلان',
  releasedAt: 'تاريخ الإعلان',
  courseName: 'اسم المادة',
  courseId: 'رقم المادة',
  id: 'المعرف',
};

/*  FIELD ICONS  */
const FIELD_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  yearWorkMarks: { icon: 'pencil-outline', color: '#3B82F6', bg: '#EFF6FF' },
  practicalMarks: { icon: 'flask-outline', color: '#10B981', bg: '#ECFDF5' },
  writtenMarks: { icon: 'file-document-edit-outline', color: '#F59E0B', bg: '#FFFBEB' },
  attendanceMarks: { icon: 'calendar-check-outline', color: '#8B5CF6', bg: '#F5F3FF' },
  quizzesMarks: { icon: 'clipboard-list-outline', color: '#EF4444', bg: '#FEF2F2' },
  finalExamMarks: { icon: 'school-outline', color: '#EC4899', bg: '#FDF2F8' },
  totalMarks: { icon: 'calculator-variant-outline', color: '#059669', bg: '#ECFDF5' },
  maxMarks: { icon: 'arrow-up-bold-circle-outline', color: '#6366F1', bg: '#EEF2FF' },
  yearWork: { icon: 'pencil-outline', color: '#3B82F6', bg: '#EFF6FF' },
  practical: { icon: 'flask-outline', color: '#10B981', bg: '#ECFDF5' },
  written: { icon: 'file-document-edit-outline', color: '#F59E0B', bg: '#FFFBEB' },
  attendance: { icon: 'calendar-check-outline', color: '#8B5CF6', bg: '#F5F3FF' },
  quizzes: { icon: 'clipboard-list-outline', color: '#EF4444', bg: '#FEF2F2' },
  finalExam: { icon: 'school-outline', color: '#EC4899', bg: '#FDF2F8' },
  earnedMarks: { icon: 'star-outline', color: '#F59E0B', bg: '#FFFBEB' },
  percentage: { icon: 'percent', color: '#059669', bg: '#ECFDF5' },
  score: { icon: 'star-outline', color: '#F59E0B', bg: '#FFFBEB' },
  mark: { icon: 'star-outline', color: '#F59E0B', bg: '#FFFBEB' },
  total: { icon: 'calculator-variant-outline', color: '#059669', bg: '#ECFDF5' },
  passingMarks: { icon: 'check-circle-outline', color: '#059669', bg: '#ECFDF5' },
};
const DEFAULT_ICON = { icon: 'numeric', color: '#6B7280', bg: '#F3F4F6' };

/*  HELPERS  */
const getLabel = (key: string): string => FIELD_LABELS[key] || key;
const getFieldIcon = (key: string) => FIELD_ICONS[key] || DEFAULT_ICON;

interface DisplayField {
  key: string;
  label: string;
  value: any;
  type: 'number' | 'string' | 'boolean';
}

// Recursively extract ALL displayable fields from an object (flattens nested objects)
const extractFieldsDeep = (obj: any, prefix = '', skipKeys = ['content']): DisplayField[] => {
  const fields: DisplayField[] = [];
  if (!obj || typeof obj !== 'object') return fields;
  for (const [key, value] of Object.entries(obj)) {
    if (skipKeys.includes(key) && prefix === '') continue;
    if (value === null || value === undefined) continue;
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const leafKey = key; // use leaf key for label/icon lookup
    if (typeof value === 'number') {
      fields.push({ key: fullKey, label: getLabel(leafKey), value, type: 'number' });
    } else if (typeof value === 'string') {
      fields.push({ key: fullKey, label: getLabel(leafKey), value, type: 'string' });
    } else if (typeof value === 'boolean') {
      fields.push({ key: fullKey, label: getLabel(leafKey), value, type: 'boolean' });
    } else if (Array.isArray(value)) {
      // Skip arrays for now
    } else if (typeof value === 'object') {
      // Recurse into nested objects
      fields.push(...extractFieldsDeep(value, fullKey, []));
    }
  }
  return fields;
};

// Separate fields
const separateFields = (fields: DisplayField[]) => {
  const markFields = fields.filter(f => f.type === 'number');
  const infoFields = fields.filter(f => f.type !== 'number');
  return { markFields, infoFields };
};

// Recursively search value by key name in an object (deep)
const deepFind = (obj: any, targetKey: string): any => {
  if (!obj || typeof obj !== 'object') return undefined;
  if (obj[targetKey] !== undefined) return obj[targetKey];
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const found = deepFind(val, targetKey);
      if (found !== undefined) return found;
    }
  }
  return undefined;
};

// Find score from item — searches nested objects too
const findScore = (item: ContentGradeItem) => {
  const findNum = (keys: string[]): number | null => {
    for (const k of keys) {
      const v = deepFind(item, k);
      if (typeof v === 'number') return v;
    }
    return null;
  };
  const findStr = (keys: string[]): string | null => {
    for (const k of keys) {
      const v = deepFind(item, k);
      if (typeof v === 'string' && v.length > 0) return v;
    }
    return null;
  };

  const total = findNum(['totalMarks', 'earnedMarks', 'total', 'score', 'mark', 'earnedTotal']);
  const max = findNum(['maxMarks', 'max', 'totalMaxMarks', 'maxTotal']);
  const pct = findNum(['percentage']) ??
    (max && max > 0 && total != null ? Math.round(total / max * 1000) / 10 : null);
  const grade = findStr(['grade']);
  const status = findStr(['status']);

  return { total, max, pct, grade, status };
};

/*  STAT CARD  */
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  iconColor: string;
  bgColor: string;
}> = ({ title, value, icon, iconColor, bgColor }) => (
  <View style={[styles.statCard, { backgroundColor: bgColor }]}>
    <View style={[styles.statIconWrap, { backgroundColor: iconColor + '18' }]}>
      <Icon name={icon} size={18} color={iconColor} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{title}</Text>
  </View>
);

/*  PROGRESS BAR  */
const ProgressBar: React.FC<{ pct: number; color: string }> = ({ pct, color }) => (
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }]} />
  </View>
);

/*  MAIN  */
const AcademicResultsScreen: React.FC<Props> = ({ accessToken, traineeId, onBack }) => {
  const [data, setData] = useState<ReleasedGradesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeClassroomIdx, setActiveClassroomIdx] = useState(0);
  const [selectedContent, setSelectedContent] = useState<ContentGradeItem | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  /*  LOAD DATA  */
  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      if (!traineeId) { setError('لم يتم تحديد رقم المتدرب'); return; }
      const result = await academicGradesService.getReleasedGrades(traineeId, accessToken);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [accessToken, traineeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(true);
    setIsRefreshing(false);
  };

  /*  DERIVED DATA  */
  const traineeInfo = data?.trainee;
  const classrooms = data?.classrooms ?? [];
  const activeCR: ClassroomGrades | null = classrooms[activeClassroomIdx] ?? null;
  const contents = activeCR?.contents ?? [];
  const totalStats = activeCR?.totalStats;
  const releaseInfo = activeCR?.releaseInfo;

  /*  RENDER: Loading  */
  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="النتائج الدراسية" subtitle="عرض الدرجات المعتمدة" onBack={onBack} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>جارٍ تحميل النتائج...</Text>
        </View>
      </View>
    );
  }

  /*  RENDER: Error  */
  if (error && !data) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="النتائج الدراسية" subtitle="عرض الدرجات المعتمدة" onBack={onBack} />
        <View style={styles.centered}>
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <Icon name="alert-circle-outline" size={48} color={Colors.error} />
            </View>
            <Text style={styles.errorTitle}>خطأ</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()} activeOpacity={0.7}>
              <Icon name="refresh" size={18} color="#FFF" />
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  /*  RENDER: Empty  */
  if (classrooms.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="النتائج الدراسية" subtitle="عرض الدرجات المعتمدة" onBack={onBack} />
        <View style={styles.centered}>
          <Icon name="clipboard-text-off-outline" size={64} color={Colors.borderMedium} />
          <Text style={styles.emptyTitle}>لا توجد نتائج معتمدة</Text>
          <Text style={styles.emptySub}>لم يتم إصدار أي نتائج لك بعد</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()} activeOpacity={0.7}>
            <Icon name="refresh" size={18} color="#FFF" />
            <Text style={styles.retryText}>تحديث</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /*  MAIN RENDER  */
  return (
    <View style={styles.container}>
      <ScreenHeader
        title="النتائج الدراسية"
        subtitle="عرض الدرجات المعتمدة للفصول الدراسية"
        onBack={onBack}
      />

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh}
            colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/*  TRAINEE INFO  */}
          {traineeInfo && (traineeInfo.nameAr || traineeInfo.nameEn) ? (
            <View style={styles.traineeCard}>
              <View style={styles.traineeAvatarWrap}>
                <Icon name="account-circle" size={44} color={Colors.primary} />
              </View>
              <View style={styles.traineeInfoWrap}>
                <Text style={styles.traineeName}>{traineeInfo.nameAr || traineeInfo.nameEn}</Text>
                {traineeInfo.nameEn && traineeInfo.nameAr ? (
                  <Text style={styles.traineeNameEn}>{traineeInfo.nameEn}</Text>
                ) : null}
                {traineeInfo.nationalId ? (
                  <Text style={styles.traineeDetail}>الرقم القومي: {traineeInfo.nationalId}</Text>
                ) : null}
                {traineeInfo.program?.name ? (
                  <View style={styles.programBadge}>
                    <Icon name="school-outline" size={13} color={Colors.primary} />
                    <Text style={styles.programBadgeText}>{traineeInfo.program.name}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {/*  CLASSROOM TABS  */}
          {classrooms.length > 1 && (
            <View style={styles.tabRow}>
              {classrooms.map((cr, idx) => (
                <TouchableOpacity
                  key={cr.classroom?.id ?? idx}
                  style={[styles.tabBtn, activeClassroomIdx === idx && styles.tabBtnActive]}
                  onPress={() => setActiveClassroomIdx(idx)}
                  activeOpacity={0.7}
                >
                  <Icon name="calendar-month-outline" size={15}
                    color={activeClassroomIdx === idx ? '#FFF' : Colors.textLight} />
                  <Text style={[styles.tabBtnText, activeClassroomIdx === idx && styles.tabBtnTextActive]}>
                    {cr.classroom?.name || `فصل ${idx + 1}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/*  SINGLE CLASSROOM BANNER  */}
          {classrooms.length === 1 && activeCR?.classroom?.name ? (
            <View style={styles.classroomBanner}>
              <Icon name="calendar-month-outline" size={18} color={Colors.primary} />
              <Text style={styles.classroomBannerText}>{activeCR.classroom.name}</Text>
            </View>
          ) : null}

          {/*  RELEASE INFO  */}
          {releaseInfo ? (
            <View style={styles.releaseCard}>
              <View style={styles.releaseHeader}>
                <Icon name="bullhorn-outline" size={18} color={Colors.primary} />
                <Text style={styles.releaseTitle}>معلومات الإعلان</Text>
              </View>
              {releaseInfo.notes ? (
                <Text style={styles.releaseNotes}>{releaseInfo.notes}</Text>
              ) : null}
              <View style={styles.releaseRow}>
                <Icon name="calendar-clock-outline" size={14} color={Colors.textLight} />
                <Text style={styles.releaseText}>
                  تاريخ الإعلان: {new Date(releaseInfo.releasedAt).toLocaleDateString('ar-EG', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </Text>
              </View>
              {releaseInfo.requirePayment ? (
                <View style={styles.paymentBanner}>
                  <Icon name="cash-lock" size={16} color="#D97706" />
                  <Text style={styles.paymentText}>يتطلب سداد: {releaseInfo.linkedFeeType}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/*  TOTAL STATS  */}
          {totalStats ? (
            <>
              <View style={styles.statsRow}>
                <StatCard title="عدد المواد" value={contents.length}
                  icon="book-open-outline" iconColor={Colors.info} bgColor={Colors.infoLight} />
                <StatCard title="المكتسب" value={totalStats.earnedTotal}
                  icon="star-outline" iconColor="#F59E0B" bgColor="#FFFBEB" />
                <StatCard title="العظمى" value={totalStats.maxTotal}
                  icon="arrow-up-bold-circle-outline" iconColor="#6366F1" bgColor="#EEF2FF" />
                <StatCard title="النسبة" value={`${totalStats.percentage}%`}
                  icon="percent"
                  iconColor={totalStats.percentage >= 60 ? Colors.success : Colors.error}
                  bgColor={totalStats.percentage >= 60 ? Colors.successLight : Colors.errorLight} />
              </View>

              {/* Overall bar */}
              {(() => {
                const pct = totalStats.percentage;
                const sc = getGradeColor(pct >= 60 ? 'ناجح' : 'راسب');
                return (
                  <View style={[styles.overallBar, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.overallLabel}>الحالة العامة للفصل</Text>
                      <View style={styles.overallScoreRow}>
                        <Text style={[styles.overallPct, { color: sc.main }]}>{pct}%</Text>
                        <Text style={styles.overallFrac}>({totalStats.earnedTotal}/{totalStats.maxTotal})</Text>
                      </View>
                      <View style={styles.overallBarTrack}>
                        <View style={[styles.overallBarFill, { width: `${Math.min(100, pct)}%`, backgroundColor: sc.main }]} />
                      </View>
                    </View>
                    <View style={[styles.overallBadge, { backgroundColor: sc.main }]}>
                      <Text style={styles.overallBadgeText}>{pct >= 60 ? 'ناجح' : 'راسب'}</Text>
                    </View>
                  </View>
                );
              })()}
            </>
          ) : null}

          {/*  SUBJECTS LIST  */}
          <View style={styles.sectionHeader}>
            <Icon name="format-list-bulleted" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>المواد الدراسية ({contents.length})</Text>
          </View>

          {contents.length === 0 ? (
            <View style={styles.emptySmall}>
              <Icon name="book-off-outline" size={40} color={Colors.borderMedium} />
              <Text style={styles.emptySmallText}>لا توجد مواد في هذا الفصل</Text>
            </View>
          ) : (
            contents.map((item, idx) => {
              const cname = item.content?.name || `مادة ${idx + 1}`;
              const ccode = item.content?.code || '';
              const score = findScore(item);
              let { total, max, pct } = score;
              const { grade, status } = score;
              // Fallback: compute per-subject max from classroom totalStats
              if (total != null && max == null && totalStats?.maxTotal && contents.length > 0) {
                max = Math.round(totalStats.maxTotal / contents.length);
                pct = max > 0 ? Math.round(total / max * 1000) / 10 : null;
              }
              const fields = extractFieldsDeep(item);
              const { markFields } = separateFields(fields);
              const gc = getGradeColor(grade ?? status);

              return (
                <TouchableOpacity
                  key={item.content?.id ?? idx}
                  style={styles.subjectCard}
                  onPress={() => setSelectedContent(item)}
                  activeOpacity={0.7}
                >
                  {/* Top: icon + name + grade */}
                  <View style={styles.subjectTop}>
                    <View style={[styles.subjectIconWrap, { backgroundColor: gc.bg }]}>
                      <Icon name="book-open-page-variant-outline" size={22} color={gc.main} />
                    </View>
                    <View style={styles.subjectInfo}>
                      <Text style={styles.subjectName} numberOfLines={2}>{cname}</Text>
                      {ccode ? <Text style={styles.subjectCode}>{ccode}</Text> : null}
                    </View>
                    {grade ? (
                      <View style={[styles.gradeBadge, { backgroundColor: gc.bg, borderColor: gc.border }]}>
                        <Text style={[styles.gradeText, { color: gc.main }]}>{grade}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Score section */}
                  {(total != null || markFields.length > 0) ? (
                    <View style={styles.subjectBottom}>
                      {/* Overall score bar */}
                      {total != null && (
                        <View style={styles.scoreSection}>
                          <View style={styles.scoreBarRow}>
                            <View style={styles.scoreBarWrap}>
                              <ProgressBar pct={pct ?? 0} color={gc.main} />
                            </View>
                            <Text style={[styles.scoreLabel, { color: gc.main }]}>
                              {total}{max != null ? `/${max}` : ''}
                            </Text>
                            {pct != null && (
                              <Text style={styles.scorePct}>{pct}%</Text>
                            )}
                          </View>
                        </View>
                      )}

                      {/* Mark fields mini-summary on card */}
                      {markFields.length > 1 && (
                        <View style={styles.miniMarksRow}>
                          {markFields.slice(0, 6).map(f => {
                            const leafKey = f.key.includes('.') ? f.key.split('.').pop()! : f.key;
                            const fi = getFieldIcon(leafKey);
                            return (
                              <View key={f.key} style={styles.miniMark}>
                                <View style={[styles.miniMarkIconWrap, { backgroundColor: fi.bg }]}>
                                  <Icon name={fi.icon} size={10} color={fi.color} />
                                </View>
                                <Text style={styles.miniMarkValue}>{f.value}</Text>
                                <Text style={styles.miniMarkLabel} numberOfLines={1}>{f.label}</Text>
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {/* Status chip */}
                      {status ? (
                        <View style={styles.statusRow}>
                          <View style={[styles.statusChip, { backgroundColor: getGradeColor(status).bg, borderColor: getGradeColor(status).border }]}>
                            <View style={[styles.statusDot, { backgroundColor: getGradeColor(status).main }]} />
                            <Text style={[styles.statusChipText, { color: getGradeColor(status).main }]}>{status}</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.subjectHint}>
                      <Icon name="chevron-left" size={16} color={Colors.textHint} />
                      <Text style={styles.subjectHintText}>اضغط لعرض التفاصيل</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>

      {/*  DETAIL MODAL  */}
      <Modal visible={!!selectedContent} transparent animationType="slide"
        onRequestClose={() => setSelectedContent(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1}
          onPress={() => setSelectedContent(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {selectedContent && (() => {
              const item = selectedContent;
              const cname = item.content?.name || 'مادة';
              const ccode = item.content?.code || '';
              const { total, max, pct, grade, status } = findScore(item);
              const gc = getGradeColor(grade ?? status);
              const sc = getGradeColor(status);
              const fields = extractFieldsDeep(item);
              const { markFields, infoFields } = separateFields(fields);

              return (
                <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <View style={[styles.modalCourseIconWrap, { backgroundColor: gc.bg }]}>
                      <Icon name="book-open-page-variant-outline" size={32} color={gc.main} />
                    </View>
                    <Text style={styles.modalCourseName}>{cname}</Text>
                    {ccode ? <Text style={styles.modalCourseCode}>{ccode}</Text> : null}
                    <View style={styles.modalBadgeRow}>
                      {grade ? (
                        <View style={[styles.modalBadge, { backgroundColor: gc.bg, borderColor: gc.border }]}>
                          <Text style={[styles.modalBadgeText, { color: gc.main }]}>{grade}</Text>
                        </View>
                      ) : null}
                      {status ? (
                        <View style={[styles.modalBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                          <View style={[styles.statusDot, { backgroundColor: sc.main }]} />
                          <Text style={[styles.modalBadgeText, { color: sc.main }]}>{status}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Score circle */}
                  {total != null && (
                    <View style={[styles.scoreCircle, { borderColor: gc.border }]}>
                      <Text style={[styles.scoreCircleBig, { color: gc.main }]}>{total}</Text>
                      {max != null && <Text style={styles.scoreCircleMax}>من {max}</Text>}
                      {pct != null && (
                        <View style={[styles.scoreCirclePctWrap, { backgroundColor: gc.bg }]}>
                          <Text style={[styles.scoreCirclePct, { color: gc.main }]}>{pct}%</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Marks breakdown */}
                  {markFields.length > 0 && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Icon name="chart-bar" size={18} color={Colors.primary} />
                        <Text style={styles.modalSectionTitle}>تفصيل الدرجات</Text>
                      </View>
                      {markFields.map(f => {
                        const leafKey = f.key.includes('.') ? f.key.split('.').pop()! : f.key;
                        const fi = getFieldIcon(leafKey);
                        const mMax = typeof item[`max${f.key.charAt(0).toUpperCase()}${f.key.slice(1).replace('Marks', '')}`] === 'number'
                          ? item[`max${f.key.charAt(0).toUpperCase()}${f.key.slice(1).replace('Marks', '')}`]
                          : max;
                        const mPct = mMax && mMax > 0 ? Math.round(f.value / mMax * 100) : null;

                        return (
                          <View key={f.key} style={styles.markItem}>
                            <View style={styles.markItemTop}>
                              <View style={[styles.markItemIcon, { backgroundColor: fi.bg }]}>
                                <Icon name={fi.icon} size={16} color={fi.color} />
                              </View>
                              <Text style={styles.markItemLabel}>{f.label}</Text>
                              <Text style={[styles.markItemValue, { color: fi.color }]}>
                                {f.value}{mMax ? `/${mMax}` : ''}
                              </Text>
                              {mPct != null && (
                                <Text style={styles.markItemPct}>{mPct}%</Text>
                              )}
                            </View>
                            {mMax && mMax > 0 && (
                              <View style={styles.markItemBarWrap}>
                                <ProgressBar pct={mPct ?? 0} color={fi.color} />
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Info fields */}
                  {infoFields.length > 0 && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Icon name="information-outline" size={18} color={Colors.primary} />
                        <Text style={styles.modalSectionTitle}>معلومات إضافية</Text>
                      </View>
                      {infoFields.map(f => (
                        <View key={f.key} style={styles.infoRow}>
                          <Text style={styles.infoLabel}>{f.label}</Text>
                          <Text style={styles.infoValue}>
                            {f.type === 'boolean' ? (f.value ? 'نعم' : 'لا') : String(f.value)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Always show data structure if no marks/info found */}
                  {markFields.length === 0 && infoFields.length === 0 && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Icon name="database-search-outline" size={18} color="#F59E0B" />
                        <Text style={styles.modalSectionTitle}>بيانات المادة</Text>
                      </View>
                      <Text style={styles.noDataHint}>
                        لم يتم العثور على بيانات درجات مفصلة لهذه المادة
                      </Text>
                    </View>
                  )}

                  {/* Close button */}
                  <TouchableOpacity style={styles.modalCloseBtn}
                    onPress={() => setSelectedContent(null)} activeOpacity={0.7}>
                    <Text style={styles.modalCloseBtnText}>إغلاق</Text>
                  </TouchableOpacity>
                  <View style={{ height: 20 }} />
                </ScrollView>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

/*  STYLES  */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 16, paddingTop: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { fontSize: 14, color: Colors.textLight, marginTop: 12 },

  /* Error */
  errorCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 32, alignItems: 'center',
    width: '100%', maxWidth: 320, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12,
  },
  errorIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.errorLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  errorMessage: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, gap: 8, marginTop: 16 },
  retryText: { fontSize: 14, fontWeight: '600', color: '#FFF' },

  /* Empty */
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 16 },
  emptySub: { fontSize: 13, color: Colors.textLight, textAlign: 'center', maxWidth: 240, marginTop: 4 },
  emptySmall: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptySmallText: { fontSize: 13, color: Colors.textLight },

  /* Trainee */
  traineeCard: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginBottom: 12, alignItems: 'center', gap: 12, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  traineeAvatarWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary50, justifyContent: 'center', alignItems: 'center' },
  traineeInfoWrap: { flex: 1, gap: 3 },
  traineeName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  traineeNameEn: { fontSize: 12, color: Colors.textLight, textAlign: 'right' },
  traineeDetail: { fontSize: 12, color: Colors.textLight, textAlign: 'right' },
  programBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', backgroundColor: Colors.primary50, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4, marginTop: 2 },
  programBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },

  /* Tabs */
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderMedium, gap: 5 },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  tabBtnTextActive: { color: '#FFF' },

  classroomBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.borderLight },
  classroomBannerText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  /* Release card */
  releaseCard: {
    backgroundColor: Colors.primary50, borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.primary200,
  },
  releaseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  releaseTitle: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  releaseNotes: { fontSize: 12, color: Colors.primaryDark, textAlign: 'right', lineHeight: 20, marginBottom: 6 },
  releaseRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  releaseText: { fontSize: 11, color: Colors.textSecondary },
  paymentBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#FDE68A' },
  paymentText: { fontSize: 11, color: '#92400E', fontWeight: '600', flex: 1, textAlign: 'right' },

  /* Stats */
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, minWidth: (SCREEN_WIDTH - 56) / 4, borderRadius: 10, padding: 10, alignItems: 'center', gap: 2 },
  statIconWrap: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 9, color: Colors.textSecondary, textAlign: 'center' },

  /* Overall */
  overallBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1 },
  overallLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  overallScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  overallPct: { fontSize: 24, fontWeight: '900' },
  overallFrac: { fontSize: 12, color: Colors.textLight },
  overallBarTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.08)', marginTop: 8, overflow: 'hidden' },
  overallBarFill: { height: '100%', borderRadius: 3 },
  overallBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginLeft: 12 },
  overallBadgeText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  /* Section */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },

  /* Subject Card */
  subjectCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.borderLight,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  subjectTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjectIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  subjectInfo: { flex: 1, gap: 2 },
  subjectName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  subjectCode: { fontSize: 11, color: Colors.textHint },
  subjectBottom: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  scoreSection: {},
  scoreBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreBarWrap: { flex: 1 },
  scoreLabel: { fontSize: 14, fontWeight: '800', minWidth: 45, textAlign: 'center' },
  scorePct: { fontSize: 12, color: Colors.textHint, minWidth: 35, textAlign: 'left' },

  /* Mini marks row */
  miniMarksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  miniMark: { alignItems: 'center', minWidth: 48, gap: 2 },
  miniMarkIconWrap: { width: 22, height: 22, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  miniMarkValue: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  miniMarkLabel: { fontSize: 8, color: Colors.textHint, textAlign: 'center' },

  /* Status */
  statusRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  subjectHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'center' },
  subjectHintText: { fontSize: 11, color: Colors.textHint },

  gradeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  gradeText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  /* Progress */
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: Colors.borderLight, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: Dimensions.get('window').height * 0.88,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderMedium, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  modalHeader: { alignItems: 'center', marginBottom: 20 },
  modalCourseIconWrap: { width: 64, height: 64, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalCourseName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  modalCourseCode: { fontSize: 13, color: Colors.textHint, marginBottom: 10 },
  modalBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  modalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  modalBadgeText: { fontSize: 13, fontWeight: '700' },

  /* Score circle */
  scoreCircle: { alignItems: 'center', backgroundColor: Colors.backgroundSoft, borderRadius: 16, paddingVertical: 24, marginBottom: 20, borderWidth: 2 },
  scoreCircleBig: { fontSize: 44, fontWeight: '900' },
  scoreCircleMax: { fontSize: 14, color: Colors.textLight, marginTop: 2 },
  scoreCirclePctWrap: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  scoreCirclePct: { fontSize: 18, fontWeight: '800' },

  /* Modal section */
  modalSection: { marginBottom: 16 },
  modalSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  modalSectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  /* Mark item */
  markItem: { marginBottom: 12, backgroundColor: '#FAFBFC', borderRadius: 10, padding: 12 },
  markItemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  markItemIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  markItemLabel: { flex: 1, fontSize: 13, color: Colors.textSecondary, fontWeight: '500', textAlign: 'right' },
  markItemValue: { fontSize: 15, fontWeight: '800' },
  markItemPct: { fontSize: 12, color: Colors.textHint, minWidth: 32 },
  markItemBarWrap: { marginTop: 8 },

  /* Info row */
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoLabel: { fontSize: 13, color: Colors.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },

  /* No data hint */
  noDataHint: { fontSize: 14, color: Colors.textHint, textAlign: 'center', marginVertical: 20, lineHeight: 22 },

  modalCloseBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  modalCloseBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});

export default AcademicResultsScreen;