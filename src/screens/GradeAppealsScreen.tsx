// GradeAppealsScreen — تظلمات الدرجات (fully dynamic + submit form)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, Modal,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { HomeService } from '../services/homeService';
import { gradesService } from '../services/gradesService';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
import ScreenHeader from '../components/shared/ScreenHeader';

/* ══════════════════════════════════ PROPS ══════════════════════════════════ */
interface GradeAppealsScreenProps {
  accessToken: string;
  traineeId?: number;
  onBack: () => void;
}

/* ══════════════════════════════════ STATUS HELPERS ══════════════════════════════════ */
const STATUS_MAP: Record<string, string> = {
  pending: 'PENDING', under_review: 'UNDER_REVIEW', approved: 'APPROVED', rejected: 'REJECTED',
  'قيد المراجعة': 'PENDING', 'تحت المراجعة': 'UNDER_REVIEW',
  'مقبول': 'APPROVED', 'مرفوض': 'REJECTED',
  PENDING: 'PENDING', UNDER_REVIEW: 'UNDER_REVIEW', APPROVED: 'APPROVED', REJECTED: 'REJECTED',
};

const normalizeStatus = (raw: any): string => {
  if (!raw) return 'PENDING';
  const trimmed = String(raw).trim();
  if (STATUS_MAP[trimmed]) return STATUS_MAP[trimmed];
  if (STATUS_MAP[trimmed.toLowerCase()]) return STATUS_MAP[trimmed.toLowerCase()];
  return trimmed.toUpperCase();
};

type FilterStatus = 'ALL' | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PENDING:      { label: 'قيد المراجعة', color: Colors.warning, bg: Colors.warningLight, icon: 'timer-sand' },
  UNDER_REVIEW: { label: 'تحت المراجعة', color: Colors.primary, bg: Colors.infoLight, icon: 'magnify' },
  APPROVED:     { label: 'مقبول',         color: Colors.success, bg: Colors.successLight, icon: 'check-circle' },
  REJECTED:     { label: 'مرفوض',         color: Colors.error, bg: Colors.errorLight, icon: 'close-circle-outline' },
};

const EXAM_TYPE_META: Record<string, { label: string; icon: string }> = {
  PAPER_EXAM: { label: 'امتحان ورقي', icon: 'file-document-outline' },
  PRACTICAL:  { label: 'عملي',        icon: 'flask' },
  ORAL:       { label: 'شفهي',        icon: 'microphone' },
  ASSIGNMENT: { label: 'واجب',        icon: 'book-open-variant' },
};

const FILTERS: { id: FilterStatus; label: string }[] = [
  { id: 'ALL',          label: 'الكل' },
  { id: 'PENDING',      label: 'قيد المراجعة' },
  { id: 'UNDER_REVIEW', label: 'تحت المراجعة' },
  { id: 'APPROVED',     label: 'مقبول' },
  { id: 'REJECTED',     label: 'مرفوض' },
];

/* ══════════════════════════════════ NORMALIZE ══════════════════════════════════ */
interface NormalizedAppeal {
  id: number;
  status: string;
  reason: string;
  requestedGrade: number | null;
  adminResponse: string | null;
  createdAt: string;
  updatedAt: string;
  subjectName: string;
  subjectCode: string;
  score: number | null;
  totalMarks: number;
  examType: string;
  examDate: string | null;
  lectureDate: string | null;
  gradeId: number | null;
}

const normalizeAppeal = (raw: any): NormalizedAppeal => {
  const grade = raw.grade ?? raw.gradeInfo ?? null;
  const paperExam = grade?.paperExam ?? grade?.paper_exam ?? grade?.exam ?? null;
  const lecture = grade?.lecture ?? null;
  const subject = raw.subject ?? raw.course ?? grade?.subject ?? grade?.course ?? null;

  const subjectName =
    subject?.name ?? subject?.title ??
    raw.subjectName ?? raw.courseName ?? raw.subject_name ?? raw.course_name ??
    paperExam?.title ?? paperExam?.name ??
    lecture?.title ?? lecture?.name ??
    raw.gradeName ?? raw.grade_name ??
    (grade?.id ? `درجة #${grade.id}` : `تظلم #${raw.id}`);

  const subjectCode =
    subject?.code ?? raw.subjectCode ?? raw.courseCode ??
    raw.subject_code ?? raw.course_code ?? '';

  const score = grade?.score ?? grade?.mark ?? grade?.grade ?? raw.score ?? null;
  const totalMarks = paperExam?.totalMarks ?? paperExam?.total_marks ?? paperExam?.total ?? 100;
  const examType = grade?.examType ?? grade?.exam_type ?? raw.examType ?? '';

  return {
    id: raw.id,
    status: normalizeStatus(raw.status),
    reason: raw.reason ?? raw.description ?? raw.note ?? '',
    requestedGrade: raw.requestedGrade ?? raw.requested_grade ?? raw.newGrade ?? null,
    adminResponse: raw.adminResponse ?? raw.admin_response ?? raw.response ?? raw.reply ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? raw.date ?? '',
    updatedAt: raw.updatedAt ?? raw.updated_at ?? raw.createdAt ?? '',
    subjectName: String(subjectName),
    subjectCode: String(subjectCode),
    score: score !== null && score !== undefined ? Number(score) : null,
    totalMarks: Number(totalMarks),
    examType: String(examType).toUpperCase(),
    examDate: paperExam?.examDate ?? paperExam?.exam_date ?? paperExam?.date ?? null,
    lectureDate: lecture?.date ?? null,
    gradeId: grade?.id ?? raw.gradeId ?? raw.grade_id ?? null,
  };
};

const extractAppeals = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (response?.appeals && Array.isArray(response.appeals)) return response.appeals;
  if (response?.gradeAppeals && Array.isArray(response.gradeAppeals)) return response.gradeAppeals;
  if (response?.results && Array.isArray(response.results)) return response.results;
  if (response?.items && Array.isArray(response.items)) return response.items;
  return [];
};

/* ══════════════════════════════════ COMPONENT ══════════════════════════════════ */

const GradeAppealsScreen: React.FC<GradeAppealsScreenProps> = ({ accessToken, traineeId, onBack }) => {
  const [appeals, setAppeals] = useState<NormalizedAppeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Submit form state
  const [showForm, setShowForm] = useState(false);
  const [formGradeId, setFormGradeId] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formRequestedGrade, setFormRequestedGrade] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available grades for selecting
  const [availableGrades, setAvailableGrades] = useState<{ id: number; name: string; code: string; score: number; total: number }[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null);
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [acceptAppeals, setAcceptAppeals] = useState(true);

  const loadAppeals = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);

      const [rawResponse, statusRes] = await Promise.all([
        HomeService.getMyGradeAppeals(accessToken),
        HomeService.getAppealsStatus(accessToken).catch(() => ({ acceptGradeAppeals: true })),
      ]);

      setAcceptAppeals(statusRes?.acceptGradeAppeals === true);

      console.log('[GradeAppeals] RAW response:', JSON.stringify(rawResponse).slice(0, 800));

      const rawList = extractAppeals(rawResponse);
      console.log('[GradeAppeals] Extracted count:', rawList.length);
      if (rawList.length > 0) {
        console.log('[GradeAppeals] First item:', JSON.stringify(rawList[0]).slice(0, 500));
      }

      const normalized = rawList.map(normalizeAppeal);
      setAppeals(normalized);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (err: any) {
      console.log('[GradeAppeals] Error:', JSON.stringify(err));
      setError(err?.message || 'حدث خطأ أثناء تحميل التظلمات');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accessToken, fadeAnim]);

  useEffect(() => { loadAppeals(); }, [loadAppeals]);

  const onRefresh = () => { setIsRefreshing(true); loadAppeals(true); };

  const filtered = filter === 'ALL' ? appeals : appeals.filter(a => a.status === filter);

  const counts: Record<FilterStatus, number> = {
    ALL:          appeals.length,
    PENDING:      appeals.filter(a => a.status === 'PENDING').length,
    UNDER_REVIEW: appeals.filter(a => a.status === 'UNDER_REVIEW').length,
    APPROVED:     appeals.filter(a => a.status === 'APPROVED').length,
    REJECTED:     appeals.filter(a => a.status === 'REJECTED').length,
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return d; }
  };

  /* ── Load grades for the picker ── */
  const loadGradesForPicker = async () => {
    try {
      setLoadingGrades(true);
      const response = await gradesService.getMyGrades(accessToken);
      if (response.success && response.data?.classrooms) {
        const grades: typeof availableGrades = [];
        response.data.classrooms.forEach(classroom => {
          classroom.contents?.forEach(cg => {
            grades.push({
              id: cg.content.id,
              name: cg.content.name,
              code: cg.content.code,
              score: cg.grades.totalMarks,
              total: cg.maxMarks.total,
            });
          });
        });
        setAvailableGrades(grades);
      }
    } catch (err) {
      console.log('[GradeAppeals] Failed to load grades for picker:', err);
    } finally {
      setLoadingGrades(false);
    }
  };

  const handleOpenForm = () => {
    if (!acceptAppeals) {
      Alert.alert('غير متاح', 'باب التظلمات مغلق حالياً، لا يمكن تقديم تظلم في الوقت الحالي.');
      return;
    }
    setFormGradeId('');
    setFormReason('');
    setFormRequestedGrade('');
    setSelectedGradeId(null);
    setShowForm(true);
    loadGradesForPicker();
  };

  const handleSelectGrade = (gradeId: number) => {
    setSelectedGradeId(gradeId);
    setFormGradeId(String(gradeId));
    setShowGradePicker(false);
  };

  const handleSubmit = async () => {
    if (!acceptAppeals) {
      Alert.alert('غير متاح', 'باب التظلمات مغلق حالياً، لا يمكن تقديم تظلم في الوقت الحالي.');
      setShowForm(false);
      return;
    }
    const gradeId = Number(formGradeId);
    if (!gradeId || isNaN(gradeId)) {
      Alert.alert('خطأ', 'يرجى اختيار الدرجة المراد التظلم عليها');
      return;
    }
    if (!formReason.trim()) {
      Alert.alert('خطأ', 'يرجى كتابة سبب التظلم');
      return;
    }

    try {
      setIsSubmitting(true);
      const body: { gradeId: number; reason: string; requestedGrade?: number } = {
        gradeId,
        reason: formReason.trim(),
      };
      if (formRequestedGrade.trim()) {
        const rg = Number(formRequestedGrade);
        if (!isNaN(rg)) body.requestedGrade = rg;
      }

      console.log('[GradeAppeals] Submitting:', body);
      await HomeService.createGradeAppeal(accessToken, body);

      Alert.alert('تم بنجاح', 'تم تقديم التظلم بنجاح. سيتم مراجعته من قِبَل الإدارة.');
      setShowForm(false);
      loadAppeals();
    } catch (err: any) {
      console.log('[GradeAppeals] Submit error:', JSON.stringify(err));
      Alert.alert('فشل التقديم', err?.message || 'حدث خطأ أثناء تقديم التظلم');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ══════════════════════════════════ RENDER ══════════════════════════════════ */

  const renderHeader = () => (
    <ScreenHeader title="تظلمات الدرجات" subtitle="تقديم ومتابعة طلبات التظلم على الدرجات" onBack={onBack} />
  );

  /* ── Loading ── */
  if (isLoading) {
    return (
      <View style={s.container}>
        {renderHeader()}
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.loadingText}>جاري تحميل التظلمات...</Text>
        </View>
      </View>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <View style={s.container}>
        {renderHeader()}
        <View style={s.centerBox}>
          <Icon name="alert-circle-outline" size={48} color={Colors.warning} />
          <Text style={s.errTitle}>تعذّر التحميل</Text>
          <Text style={s.errMsg}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => loadAppeals()}>
            <Text style={s.retryTxt}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const selectedGradeInfo = availableGrades.find(g => g.id === selectedGradeId);

  return (
    <View style={s.container}>
      {renderHeader()}

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}>

        {/* ═══ APPEALS STATUS BANNER ═══ */}
        {!acceptAppeals && (
          <View style={s.closedBanner}>
            <Icon name="lock-outline" size={22} color={Colors.error} />
            <View style={s.closedBannerTextArea}>
              <Text style={s.closedBannerTitle}>باب التظلمات مغلق حالياً</Text>
              <Text style={s.closedBannerDesc}>لا يمكن تقديم تظلمات جديدة في الوقت الحالي</Text>
            </View>
          </View>
        )}

        {/* ═══ SUBMIT BUTTON ═══ */}
        <TouchableOpacity
          style={[s.submitBtn, !acceptAppeals && s.submitBtnDisabled]}
          onPress={handleOpenForm}
          activeOpacity={0.8}
          disabled={!acceptAppeals}>
          <Icon name="file-document-edit-outline" size={18} color={Colors.white} />
          <Text style={s.submitBtnTxt}>تقديم تظلم جديد</Text>
        </TouchableOpacity>

        {/* ═══ MY APPEALS HEADER ═══ */}
        <View style={s.sectionHeader}>
          <View style={s.sectionCountBadge}>
            <Text style={s.sectionCountTxt}>{appeals.length}</Text>
          </View>
          <Text style={s.sectionTitle}>تظلماتي</Text>
          <Icon name="chart-bar" size={18} color={Colors.textPrimary} />
        </View>

        {/* ═══ FILTER CHIPS ═══ */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {FILTERS.map(f => {
            const active = filter === f.id;
            const meta = f.id !== 'ALL' ? STATUS_META[f.id] : null;
            return (
              <TouchableOpacity
                key={f.id}
                style={[s.chip, active && s.chipActive, active && meta ? { backgroundColor: meta.color, borderColor: meta.color } : null]}
                onPress={() => setFilter(f.id)}>
                {f.id !== 'ALL' && meta && <Icon name={meta.icon} size={12} color={active ? Colors.white : meta.color} />}
                <Text style={[s.chipTxt, active && s.chipTxtActive]}>{f.label}</Text>
                <View style={[s.chipBadge, active ? s.chipBadgeActive : null]}>
                  <Text style={[s.chipBadgeTxt, active && s.chipBadgeTxtActive]}>{counts[f.id]}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ═══ APPEALS LIST ═══ */}
        {filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <Icon name="mailbox-outline" size={48} color={Colors.textHint} />
            <Text style={s.emptyTitle}>لا توجد تظلمات</Text>
            <Text style={s.emptyMsg}>
              {filter === 'ALL'
                ? 'لم يتم العثور على أي تظلمات مسجلة'
                : `لا توجد تظلمات بحالة "${FILTERS.find(f => f.id === filter)?.label}"`}
            </Text>
          </View>
        ) : (
          <Animated.View style={[s.list, { opacity: fadeAnim }]}>
            {filtered.map((appeal, idx) => {
              const statusMeta = STATUS_META[appeal.status] ?? STATUS_META.PENDING;
              const examMeta = appeal.examType
                ? (EXAM_TYPE_META[appeal.examType] ?? { label: appeal.examType, icon: 'file-document-outline' })
                : null;
              const isExpanded = expandedId === appeal.id;

              return (
                <View key={appeal.id} style={s.appealGroup}>
                  {/* Date group header */}
                  {(idx === 0 || filtered[idx - 1]?.createdAt?.slice(0, 10) !== appeal.createdAt?.slice(0, 10)) && (
                    <View style={s.dateHeader}>
                      <View style={s.dateLine} />
                      <View style={[s.dateBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.color }]}>
                        <Text style={[s.dateBadgeTxt, { color: statusMeta.color }]}>
                          {formatDate(appeal.createdAt)}
                        </Text>
                      </View>
                      <Text style={s.dateSubjectCount}>
                        {filtered.filter(a => a.createdAt?.slice(0, 10) === appeal.createdAt?.slice(0, 10)).length} مواد
                      </Text>
                    </View>
                  )}

                  {/* Appeal Card */}
                  <TouchableOpacity
                    style={[s.appealCard, { borderRightColor: statusMeta.color }]}
                    onPress={() => setExpandedId(isExpanded ? null : appeal.id)}
                    activeOpacity={0.85}>

                    {/* Subject + status */}
                    <View style={s.cardTop}>
                      <View style={[s.statusPill, { backgroundColor: statusMeta.bg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <Text style={[s.statusPillTxt, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                        <Icon name={statusMeta.icon} size={12} color={statusMeta.color} />
                      </View>
                      <View style={s.cardTitleArea}>
                        <Text style={s.subjectName} numberOfLines={1}>{appeal.subjectName}</Text>
                        {appeal.subjectCode ? <Text style={s.subjectCode}>{appeal.subjectCode}</Text> : null}
                      </View>
                    </View>

                    {/* Score row */}
                    <View style={s.scoreRow}>
                      {appeal.score !== null && (
                        <View style={s.scoreItem}>
                          <Text style={s.scoreLabel}>الدرجة الحالية</Text>
                          <Text style={s.scoreVal}>
                            ({((appeal.score / appeal.totalMarks) * 100).toFixed(1)}%)
                            {' '}{appeal.score}/
                            <Text style={s.scoreDenom}>{appeal.totalMarks}</Text>
                          </Text>
                        </View>
                      )}
                      {appeal.requestedGrade !== null && (
                        <View style={s.scoreItem}>
                          <Text style={s.scoreLabel}>الدرجة المطلوبة</Text>
                          <Text style={[s.scoreVal, { color: Colors.primary }]}>{appeal.requestedGrade}</Text>
                        </View>
                      )}
                      {examMeta && (
                        <View style={[s.examTypePill, { backgroundColor: Colors.borderLight, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                          <Text style={s.examTypeTxt}>{examMeta.label}</Text>
                          <Icon name={examMeta.icon} size={11} color={Colors.textSecondary} />
                        </View>
                      )}
                    </View>

                    {/* Admin response */}
                    {appeal.adminResponse ? (
                      <View style={[s.responseBox, { borderColor: statusMeta.color + '60', backgroundColor: statusMeta.bg }]}>
                        <Icon name="information-outline" size={14} color={statusMeta.color} style={{marginTop: 1}} />
                        <Text style={[s.responseTxt, { color: statusMeta.color }]}>
                          <Text style={{ fontWeight: '700' }}>نتيجة المراجعة: </Text>
                          {appeal.adminResponse}
                        </Text>
                      </View>
                    ) : null}

                    {/* Expand toggle */}
                    <TouchableOpacity style={s.expandToggle} onPress={() => setExpandedId(isExpanded ? null : appeal.id)}>
                      <Text style={s.expandToggleTxt}>{isExpanded ? '▲ إخفاء التفاصيل' : '▼ عرض التفاصيل'}</Text>
                    </TouchableOpacity>

                    {/* Expanded details */}
                    {isExpanded && (
                      <View style={s.expanded}>
                        {appeal.reason ? (
                          <View style={s.expandRow}>
                            <Text style={s.expandVal}>{appeal.reason}</Text>
                            <Text style={s.expandLbl}>سبب التظلم</Text>
                          </View>
                        ) : null}
                        {appeal.createdAt ? (
                          <View style={s.expandRow}>
                            <Text style={s.expandVal}>{formatDate(appeal.createdAt)}</Text>
                            <Text style={s.expandLbl}>تاريخ التقديم</Text>
                          </View>
                        ) : null}
                        {appeal.updatedAt ? (
                          <View style={s.expandRow}>
                            <Text style={s.expandVal}>{formatDate(appeal.updatedAt)}</Text>
                            <Text style={s.expandLbl}>آخر تحديث</Text>
                          </View>
                        ) : null}
                        {appeal.examDate ? (
                          <View style={s.expandRow}>
                            <Text style={s.expandVal}>{formatDate(appeal.examDate)}</Text>
                            <Text style={s.expandLbl}>تاريخ الامتحان</Text>
                          </View>
                        ) : null}
                        {appeal.lectureDate ? (
                          <View style={s.expandRow}>
                            <Text style={s.expandVal}>{formatDate(appeal.lectureDate)}</Text>
                            <Text style={s.expandLbl}>تاريخ المحاضرة</Text>
                          </View>
                        ) : null}
                        <View style={s.expandRow}>
                          <View style={[s.statusPill, { backgroundColor: statusMeta.bg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                            <Text style={[s.statusPillTxt, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                            <Icon name={statusMeta.icon} size={12} color={statusMeta.color} />
                          </View>
                          <Text style={s.expandLbl}>حالة الطلب</Text>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ═══════════════════ SUBMIT FORM MODAL ═══════════════════ */}
      <Modal visible={showForm} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalCard}>
            {/* Modal header */}
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowForm(false)} disabled={isSubmitting}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Text style={s.modalTitle}>تقديم تظلم جديد</Text>
                <Icon name="file-document-edit-outline" size={18} color={Colors.textPrimary} />
              </View>
            </View>

            <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Grade picker */}
              <Text style={s.fieldLabel}>الدرجة المراد التظلم عليها *</Text>
              <TouchableOpacity
                style={s.pickerBtn}
                onPress={() => setShowGradePicker(!showGradePicker)}>
                <Text style={selectedGradeInfo ? s.pickerBtnTxtSelected : s.pickerBtnTxt}>
                  {selectedGradeInfo
                    ? `${selectedGradeInfo.name} (${selectedGradeInfo.code}) — ${selectedGradeInfo.score}/${selectedGradeInfo.total}`
                    : 'اختر المادة / الدرجة'}
                </Text>
                <Text style={s.pickerArrow}>{showGradePicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showGradePicker && (
                <View style={s.gradePickerList}>
                  {loadingGrades ? (
                    <ActivityIndicator size="small" color={Colors.primary} style={{ padding: 16 }} />
                  ) : availableGrades.length === 0 ? (
                    <View style={s.noGradesBox}>
                      <Text style={s.noGradesTxt}>لا توجد درجات متاحة</Text>
                      <Text style={s.noGradesSub}>يمكنك إدخال رقم الدرجة يدوياً</Text>
                    </View>
                  ) : (
                    availableGrades.map(g => (
                      <TouchableOpacity
                        key={g.id}
                        style={[s.gradeOption, selectedGradeId === g.id && s.gradeOptionActive]}
                        onPress={() => handleSelectGrade(g.id)}>
                        <View style={s.gradeOptionRight}>
                          <Text style={s.gradeOptionName}>{g.name}</Text>
                          <Text style={s.gradeOptionCode}>{g.code}</Text>
                        </View>
                        <Text style={s.gradeOptionScore}>{g.score}/{g.total}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {/* Manual grade ID */}
              <Text style={[s.fieldLabel, { marginTop: 4 }]}>أو أدخل رقم الدرجة يدوياً</Text>
              <TextInput
                style={s.textInput}
                placeholder="رقم الدرجة (Grade ID)"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={formGradeId}
                onChangeText={t => { setFormGradeId(t); setSelectedGradeId(null); }}
                textAlign="right"
              />

              {/* Reason */}
              <Text style={[s.fieldLabel, { marginTop: 16 }]}>سبب التظلم *</Text>
              <TextInput
                style={[s.textInput, s.textArea]}
                placeholder="اكتب سبب التظلم بالتفصيل..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={formReason}
                onChangeText={setFormReason}
                textAlign="right"
                textAlignVertical="top"
              />

              {/* Requested grade (optional) */}
              <Text style={[s.fieldLabel, { marginTop: 16 }]}>الدرجة المطلوبة (اختياري)</Text>
              <TextInput
                style={s.textInput}
                placeholder="الدرجة المتوقعة"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={formRequestedGrade}
                onChangeText={setFormRequestedGrade}
                textAlign="right"
              />

              {/* Submit button */}
              <TouchableOpacity
                style={[s.formSubmitBtn, isSubmitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}>
                {isSubmitting ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={s.formSubmitTxt}>تقديم التظلم</Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

/* ════════════════════════════════════════════════ STYLES ════════════════════════════════════════════════ */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 15, color: Colors.textLight },
  errEmoji: { fontSize: 48, marginBottom: 12 },
  errTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  errMsg: { fontSize: 14, color: Colors.textLight, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  retryTxt: { color: Colors.white, fontWeight: '700', fontSize: 15 },

  /* Header */
  header: { display: 'none' as any },
  backBtn: { display: 'none' as any },
  backArrow: { fontSize: 0 },
  backText: { fontSize: 0 },
  headerCenter: { display: 'none' as any },
  headerTitle: { fontSize: 0 },
  headerSub: { fontSize: 0 },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  /* Submit CTA */
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14,
    marginBottom: 20,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.textHint, shadowOpacity: 0, elevation: 0,
  },
  submitBtnIcon: { fontSize: 18 },
  submitBtnTxt: { fontSize: 16, fontWeight: '800', color: Colors.white },

  /* Closed banner */
  closedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    backgroundColor: Colors.errorLight, borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.errorBorder,
  },
  closedBannerIcon: { fontSize: 22, marginLeft: 10 },
  closedBannerTextArea: { flex: 1, alignItems: 'flex-end' },
  closedBannerTitle: { fontSize: 14, fontWeight: '800', color: Colors.error, textAlign: 'right' },
  closedBannerDesc: { fontSize: 12, color: Colors.textLight, textAlign: 'right', marginTop: 2 },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 8, marginBottom: 12,
  },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  sectionCountBadge: {
    backgroundColor: Colors.primary, width: 22, height: 22,
    borderRadius: 11, alignItems: 'center', justifyContent: 'center',
  },
  sectionCountTxt: { fontSize: 11, fontWeight: '700', color: Colors.white },

  /* Filter chips */
  filterRow: { gap: 8, paddingBottom: 16, paddingRight: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: Colors.borderMedium,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipEmoji: { fontSize: 12 },
  chipTxt: { fontSize: 12, fontWeight: '600', color: Colors.textLight },
  chipTxtActive: { color: Colors.white },
  chipBadge: {
    backgroundColor: Colors.borderLight, paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 8, minWidth: 20, alignItems: 'center',
  },
  chipBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipBadgeTxt: { fontSize: 11, fontWeight: '700', color: Colors.textLight },
  chipBadgeTxtActive: { color: Colors.white },

  /* Empty */
  emptyBox: {
    alignItems: 'center', paddingVertical: 48,
    backgroundColor: Colors.white, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.borderMedium, marginTop: 8,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptyMsg: { fontSize: 13, color: Colors.textHint, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },

  /* List */
  list: { gap: 0 },
  appealGroup: { marginBottom: 4 },

  dateHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 12,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.borderMedium },
  dateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1,
  },
  dateBadgeTxt: { fontSize: 12, fontWeight: '600' },
  dateSubjectCount: { fontSize: 11, color: Colors.textHint, fontWeight: '500' },

  /* Appeal Card */
  appealCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    marginBottom: 10, borderRightWidth: 4,
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardTitleArea: { flex: 1, alignItems: 'flex-end', marginRight: 8 },
  subjectName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  subjectCode: { fontSize: 11, color: Colors.textHint, textAlign: 'right', marginTop: 2 },

  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusPillTxt: { fontSize: 12, fontWeight: '700' },

  scoreRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  scoreItem: { alignItems: 'flex-end' },
  scoreLabel: { fontSize: 10, color: Colors.textHint, fontWeight: '500', marginBottom: 2 },
  scoreVal: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  scoreDenom: { fontSize: 11, color: Colors.textHint },
  examTypePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  examTypeTxt: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },

  responseBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderRadius: 10, padding: 10, borderWidth: 1, marginBottom: 8,
  },
  responseIcon: { fontSize: 14, marginTop: 1 },
  responseTxt: { flex: 1, fontSize: 12, lineHeight: 18, textAlign: 'right' },

  expandToggle: { alignItems: 'center', paddingTop: 6 },
  expandToggleTxt: { fontSize: 12, color: Colors.textHint, fontWeight: '600' },

  expanded: {
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: Colors.borderLight, gap: 8,
  },
  expandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expandLbl: { fontSize: 12, color: Colors.textHint, fontWeight: '500' },
  expandVal: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', textAlign: 'right', flex: 1, marginRight: 8 },

  /* ═══ MODAL STYLES ═══ */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  modalClose: { fontSize: 22, color: Colors.textHint, fontWeight: '700', padding: 4 },
  modalScroll: { paddingHorizontal: 20, paddingTop: 16 },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 8 },

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.background, borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: Colors.borderMedium,
  },
  pickerBtnTxt: { fontSize: 14, color: Colors.textHint },
  pickerBtnTxtSelected: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  pickerArrow: { fontSize: 12, color: Colors.textHint },

  gradePickerList: {
    backgroundColor: Colors.background, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.borderMedium, marginTop: 4,
    maxHeight: 200,
  },
  gradeOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  gradeOptionActive: { backgroundColor: Colors.infoLight },
  gradeOptionRight: { flex: 1, alignItems: 'flex-end' },
  gradeOptionName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  gradeOptionCode: { fontSize: 11, color: Colors.textHint, marginTop: 2 },
  gradeOptionScore: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginLeft: 8 },

  noGradesBox: { padding: 16, alignItems: 'center' },
  noGradesTxt: { fontSize: 13, color: Colors.textLight, fontWeight: '600' },
  noGradesSub: { fontSize: 11, color: Colors.textHint, marginTop: 4 },

  textInput: {
    backgroundColor: Colors.background, borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: Colors.borderMedium,
    fontSize: 14, color: Colors.textPrimary,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },

  formSubmitBtn: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  formSubmitTxt: { fontSize: 16, fontWeight: '800', color: Colors.white },
});

export default GradeAppealsScreen;
