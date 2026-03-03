// AssignmentsScreen — المهام والتكليفات
// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles assignments display & submission
// 2. Open/Closed: Can be extended with new assignment features without modification

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, Modal, Dimensions,
  TextInput, Alert, Linking, Platform,
} from 'react-native';
import DocumentPicker, { types } from 'react-native-document-picker';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
import ScreenHeader from '../components/shared/ScreenHeader';
import { assignmentsService } from '../services/assignmentsService';
import {
  Assignment, AssignmentStatus, AssignmentFilterTab,
  AssignmentsError, Submission,
} from '../types/assignments';

const { width: SW } = Dimensions.get('window');

/* ═══════════════════════════════════ PROPS ═══════════════════════════════════ */
interface Props {
  accessToken: string;
  onBack: () => void;
}

/* ═══════════════════════════════════ HELPERS ═══════════════════════════════════ */

const getAssignmentStatus = (a: Assignment): AssignmentStatus => {
  const now = new Date();
  const due = new Date(a.dueDate);
  if (a.submission) {
    return a.submission.status === 'GRADED' ? 'GRADED' : 'SUBMITTED';
  }
  if (now > due) return 'OVERDUE';
  return 'PENDING';
};

const getStatusConfig = (status: AssignmentStatus) => {
  switch (status) {
    case 'PENDING':
      return {
        label: 'معلقة',
        labelFull: 'في انتظار التسليم',
        bgColor: '#FFF8E1',
        borderColor: '#FFE082',
        textColor: '#F57F17',
        icon: 'clock-outline',
        sideColor: '#F59E0B',
      };
    case 'SUBMITTED':
      return {
        label: 'تم التسليم',
        labelFull: 'في انتظار التقييم',
        bgColor: '#E3F2FD',
        borderColor: '#90CAF9',
        textColor: '#1565C0',
        icon: 'send',
        sideColor: '#3B82F6',
      };
    case 'GRADED':
      return {
        label: 'تم التقييم',
        labelFull: 'مكتملة - تم التقييم',
        bgColor: '#E8F5E9',
        borderColor: '#A5D6A7',
        textColor: '#2E7D32',
        icon: 'check-circle-outline',
        sideColor: '#10B981',
      };
    case 'OVERDUE':
      return {
        label: 'متأخرة',
        labelFull: 'فات موعد التسليم',
        bgColor: '#FFEBEE',
        borderColor: '#EF9A9A',
        textColor: '#C62828',
        icon: 'alert-circle-outline',
        sideColor: '#F43F5E',
      };
  }
};

const getTimeRemaining = (dueDate: string): string => {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  if (diff <= 0) return 'انتهى الموعد';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 7) return `${days} يوم متبقي`;
  if (days > 0) return `${days} يوم و ${hours} ساعة`;
  if (hours > 0) return `${hours} ساعة متبقية`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes} دقيقة متبقية`;
};

const getTimeRemainingColor = (dueDate: string) => {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return { text: '#C62828', bg: '#FFEBEE' };
  if (days <= 1) return { text: '#C62828', bg: '#FFEBEE' };
  if (days <= 3) return { text: '#F57F17', bg: '#FFF8E1' };
  return { text: '#2E7D32', bg: '#E8F5E9' };
};

const getScoreLabel = (score: number, maxScore: number): string => {
  if (maxScore === 0) return '';
  const pct = (score / maxScore) * 100;
  if (pct >= 90) return 'ممتاز';
  if (pct >= 80) return 'جيد جداً';
  if (pct >= 70) return 'جيد';
  if (pct >= 60) return 'مقبول';
  return 'ضعيف';
};

const getScoreColor = (score: number, maxScore: number) => {
  if (maxScore === 0) return { main: '#6B7280', bg: '#F9FAFB' };
  const pct = (score / maxScore) * 100;
  if (pct >= 90) return { main: '#059669', bg: '#ECFDF5' };
  if (pct >= 80) return { main: '#2563EB', bg: '#EFF6FF' };
  if (pct >= 70) return { main: '#D97706', bg: '#FFFBEB' };
  if (pct >= 60) return { main: '#EA580C', bg: '#FFF7ED' };
  return { main: '#E11D48', bg: '#FFF1F2' };
};

const formatArabicDate = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return 'تاريخ غير محدد'; }
};

const formatArabicDateTime = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return 'تاريخ غير محدد'; }
};

const sortAssignments = (assignments: Assignment[]): Assignment[] => {
  const statusOrder: Record<string, number> = { PENDING: 0, OVERDUE: 1, SUBMITTED: 2, GRADED: 3 };
  return [...assignments].sort((a, b) => {
    const sA = getAssignmentStatus(a);
    const sB = getAssignmentStatus(b);
    if (statusOrder[sA] !== statusOrder[sB]) return statusOrder[sA] - statusOrder[sB];
    if (sA === 'PENDING') return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
};

const getFileIcon = (fileName: string | null) => {
  if (!fileName) return { icon: 'file-outline', color: '#6B7280' };
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return { icon: 'file-pdf-box', color: '#E11D48' };
  if (['doc', 'docx'].includes(ext)) return { icon: 'file-word-box', color: '#2563EB' };
  if (['zip', 'rar'].includes(ext)) return { icon: 'zip-box', color: '#D97706' };
  if (['png', 'jpg', 'jpeg'].includes(ext)) return { icon: 'file-image', color: '#059669' };
  return { icon: 'file-outline', color: '#6B7280' };
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ALLOWED_TYPES = [
  types.pdf, types.doc, types.docx, types.zip,
  types.images,
];
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'zip', 'rar', 'png', 'jpg', 'jpeg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/* ═══════════════════════════════════ COMPONENT ═══════════════════════════════════ */
const AssignmentsScreen: React.FC<Props> = ({ accessToken, onBack }) => {
  // --- State ---
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<AssignmentFilterTab>('ALL');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Submit form state
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitContent, setSubmitContent] = useState('');
  const [submitFile, setSubmitFile] = useState<{ uri: string; name: string; type: string; size: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // --- Derived ---
  const sorted = useMemo(() => sortAssignments(assignments), [assignments]);

  const filtered = useMemo(() => {
    if (filterTab === 'ALL') return sorted;
    return sorted.filter(a => getAssignmentStatus(a) === filterTab);
  }, [sorted, filterTab]);

  const counts = useMemo(() => {
    let pending = 0, submitted = 0, graded = 0, overdue = 0;
    assignments.forEach(a => {
      const s = getAssignmentStatus(a);
      if (s === 'PENDING') pending++;
      else if (s === 'SUBMITTED') submitted++;
      else if (s === 'GRADED') graded++;
      else overdue++;
    });
    return { pending, submitted, graded, overdue };
  }, [assignments]);

  // --- Load ---
  const loadAssignments = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await assignmentsService.getMyAssignments(accessToken);
      setAssignments(data);
    } catch (err: any) {
      const e = err as AssignmentsError;
      setError(e.message || 'حدث خطأ في تحميل المهام');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const onRefresh = () => { setIsRefreshing(true); loadAssignments(true); };

  // --- File Picker ---
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: ALLOWED_TYPES,
        copyTo: 'cachesDirectory',
      });
      const file = result[0];
      if (!file) return;

      // Validate extension
      const ext = file.name?.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        Alert.alert('نوع ملف غير مدعوم', `الأنواع المقبولة: ${ALLOWED_EXTENSIONS.join(', ')}`);
        return;
      }

      // Validate size
      if (file.size && file.size > MAX_FILE_SIZE) {
        Alert.alert('حجم الملف كبير', 'الحد الأقصى لحجم الملف هو 10 ميجابايت');
        return;
      }

      setSubmitFile({
        uri: file.fileCopyUri || file.uri,
        name: file.name || `file.${ext}`,
        type: file.type || 'application/octet-stream',
        size: file.size || 0,
      });
    } catch (err: any) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('خطأ', 'فشل في اختيار الملف');
      }
    }
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!selectedAssignment) return;
    const trimmed = submitContent.trim();
    if (!trimmed && !submitFile) {
      Alert.alert('تنبيه', 'يجب إرسال نص أو ملف على الأقل');
      return;
    }
    setSubmitting(true);
    try {
      await assignmentsService.submitAssignment(
        selectedAssignment.id,
        trimmed || null,
        submitFile ? { uri: submitFile.uri, name: submitFile.name, type: submitFile.type } : null,
        accessToken,
      );
      Alert.alert('نجاح', 'تم تسليم المهمة بنجاح!');
      setShowSubmitForm(false);
      setSubmitContent('');
      setSubmitFile(null);
      // Reload & update selected
      const data = await assignmentsService.getMyAssignments(accessToken);
      setAssignments(data);
      const updated = data.find(a => a.id === selectedAssignment.id);
      if (updated) setSelectedAssignment(updated);
    } catch (err: any) {
      const e = err as AssignmentsError;
      Alert.alert('خطأ', e.message || 'فشل في تسليم المهمة');
    } finally {
      setSubmitting(false);
    }
  };

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('خطأ', 'لا يمكن فتح الرابط');
    }
  };

  // ══════════════════════════════ RENDER: STATS ══════════════════════════════

  const renderStats = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.statsRow}>
      {[
        { label: 'معلقة', count: counts.pending, icon: 'clock-outline', color: '#F59E0B', bg: '#FFF8E1' },
        { label: 'مسلّمة', count: counts.submitted, icon: 'send', color: '#3B82F6', bg: '#E3F2FD' },
        { label: 'مكتملة', count: counts.graded, icon: 'check-circle-outline', color: '#10B981', bg: '#E8F5E9' },
        { label: 'متأخرة', count: counts.overdue, icon: 'alert-circle-outline', color: '#F43F5E', bg: '#FFEBEE' },
      ].map((s, i) => (
        <View key={i} style={[st.statCard, { backgroundColor: s.bg }]}>
          <View style={[st.statIconCircle, { backgroundColor: s.color + '20' }]}>
            <Icon name={s.icon} size={18} color={s.color} />
          </View>
          <Text style={[st.statValue, { color: s.color }]}>{s.count}</Text>
          <Text style={st.statLabel}>{s.label}</Text>
        </View>
      ))}
    </ScrollView>
  );

  // ══════════════════════════════ RENDER: FILTERS ══════════════════════════════

  const renderFilters = () => {
    const tabs: { key: AssignmentFilterTab; label: string; count: number; color: string }[] = [
      { key: 'ALL', label: 'الكل', count: assignments.length, color: Colors.primary },
      { key: 'PENDING', label: 'معلقة', count: counts.pending, color: '#F59E0B' },
      { key: 'SUBMITTED', label: 'مسلّمة', count: counts.submitted, color: '#3B82F6' },
      { key: 'GRADED', label: 'مكتملة', count: counts.graded, color: '#10B981' },
      { key: 'OVERDUE', label: 'متأخرة', count: counts.overdue, color: '#F43F5E' },
    ];
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterRow}>
        {tabs.map(t => {
          const active = filterTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[st.filterChip, active && { backgroundColor: t.color, borderColor: t.color }]}
              onPress={() => setFilterTab(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[st.filterChipText, active && { color: '#FFF' }]}>
                {t.label} ({t.count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  // ══════════════════════════════ RENDER: CARD ══════════════════════════════

  const renderAssignmentCard = (assignment: Assignment) => {
    const status = getAssignmentStatus(assignment);
    const cfg = getStatusConfig(status);
    const instructorName = assignment.instructor?.name || 'غير محدد';
    const subjectName = assignment.subject?.name || 'غير محدد';

    return (
      <TouchableOpacity
        key={assignment.id}
        style={st.card}
        activeOpacity={0.7}
        onPress={() => setSelectedAssignment(assignment)}
      >
        {/* Right side bar */}
        <View style={[st.cardSideBar, { backgroundColor: cfg.sideColor }]} />

        <View style={st.cardContent}>
          {/* Row 1: Status + Subject */}
          <View style={st.cardBadgeRow}>
            <View style={[st.statusBadge, { backgroundColor: cfg.bgColor, borderColor: cfg.borderColor }]}>
              <Icon name={cfg.icon} size={12} color={cfg.textColor} />
              <Text style={[st.statusBadgeText, { color: cfg.textColor }]}>{cfg.label}</Text>
            </View>
            <View style={st.subjectBadge}>
              <Text style={st.subjectBadgeText}>{subjectName}</Text>
            </View>
          </View>

          {/* Row 2: Title */}
          <Text style={st.cardTitle} numberOfLines={2}>{assignment.title}</Text>

          {/* Row 3: Description */}
          {assignment.description ? (
            <Text style={st.cardDesc} numberOfLines={2}>{assignment.description}</Text>
          ) : null}

          {/* Row 4: Info */}
          <View style={st.cardInfoRow}>
            <View style={st.cardInfoItem}>
              <Icon name="account-outline" size={13} color={Colors.textHint} />
              <Text style={st.cardInfoText}>{instructorName}</Text>
            </View>
            <View style={st.cardInfoItem}>
              <Icon name="star-outline" size={13} color={Colors.textHint} />
              <Text style={st.cardInfoText}>{assignment.maxScore} درجة</Text>
            </View>
          </View>

          {/* Time remaining (PENDING only) */}
          {status === 'PENDING' && (
            <View style={st.cardTimeRow}>
              <View style={[st.timeBadge, { backgroundColor: getTimeRemainingColor(assignment.dueDate).bg }]}>
                <Icon name="clock-outline" size={12} color={getTimeRemainingColor(assignment.dueDate).text} />
                <Text style={[st.timeBadgeText, { color: getTimeRemainingColor(assignment.dueDate).text }]}>
                  {getTimeRemaining(assignment.dueDate)}
                </Text>
              </View>
            </View>
          )}

          {/* Due date */}
          <View style={st.cardFooter}>
            <Icon name="calendar-outline" size={12} color={Colors.textHint} />
            <Text style={st.cardFooterText}>آخر موعد: {formatArabicDate(assignment.dueDate)}</Text>
          </View>

          {/* Score (GRADED only) */}
          {status === 'GRADED' && assignment.submission?.score != null && (
            <View style={st.cardScoreSection}>
              <View style={st.cardScoreRow}>
                <Text style={[st.cardScore, { color: getScoreColor(assignment.submission.score, assignment.maxScore).main }]}>
                  {assignment.submission.score} / {assignment.maxScore}
                </Text>
                <View style={[st.cardScoreBadge, { backgroundColor: getScoreColor(assignment.submission.score, assignment.maxScore).bg }]}>
                  <Text style={[st.cardScoreBadgeText, { color: getScoreColor(assignment.submission.score, assignment.maxScore).main }]}>
                    {getScoreLabel(assignment.submission.score, assignment.maxScore)}
                  </Text>
                </View>
              </View>
              {assignment.maxScore > 0 && (
                <View style={st.progressBarBg}>
                  <View style={[st.progressBarFill, {
                    width: `${Math.min((assignment.submission.score / assignment.maxScore) * 100, 100)}%`,
                    backgroundColor: getScoreColor(assignment.submission.score, assignment.maxScore).main,
                  }]} />
                </View>
              )}
            </View>
          )}

          {/* Attachment from instructor */}
          {assignment.attachmentUrl && (
            <View style={st.attachmentRow}>
              <Icon name={getFileIcon(assignment.attachmentName).icon} size={14} color={getFileIcon(assignment.attachmentName).color} />
              <Text style={st.attachmentText} numberOfLines={1}>{assignment.attachmentName || 'ملف مرفق'}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ══════════════════════════════ RENDER: EMPTY ══════════════════════════════

  const renderEmpty = () => (
    <View style={st.emptyContainer}>
      <Text style={st.emptyIcon}>📋</Text>
      <Text style={st.emptyTitle}>
        {filterTab === 'ALL' ? 'لا توجد مهام بعد' : 'لا توجد مهام بهذه الحالة'}
      </Text>
      <Text style={st.emptyDesc}>
        {filterTab === 'ALL'
          ? 'ستظهر المهام والتكليفات هنا عند إضافتها من المحاضرين'
          : 'جرب تصنيفاً آخر لعرض المهام'}
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={st.emptyContainer}>
      <Text style={st.emptyIcon}>⚠️</Text>
      <Text style={st.emptyTitle}>حدث خطأ</Text>
      <Text style={st.emptyDesc}>{error}</Text>
      <TouchableOpacity style={st.retryButton} onPress={() => loadAssignments()} activeOpacity={0.7}>
        <Text style={st.retryText}>إعادة المحاولة</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={st.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={st.loadingText}>جاري تحميل المهام...</Text>
    </View>
  );

  // ══════════════════════════════ DETAIL MODAL ══════════════════════════════

  const renderDetailModal = () => {
    if (!selectedAssignment) return null;
    const a = selectedAssignment;
    const status = getAssignmentStatus(a);
    const cfg = getStatusConfig(status);
    const sub = a.submission;
    const instructorName = a.instructor?.name || 'غير محدد';
    const subjectName = a.subject?.name || 'غير محدد';

    return (
      <Modal
        visible={!!selectedAssignment && !showSubmitForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedAssignment(null)}
      >
        <View style={st.modalContainer}>
          {/* Header */}
          <View style={st.modalHeader}>
            <TouchableOpacity style={st.modalCloseBtn} onPress={() => setSelectedAssignment(null)} activeOpacity={0.7}>
              <Icon name={AppIcons.close} size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={st.modalTitleArea}>
              <Text style={st.modalTitle} numberOfLines={2}>{a.title}</Text>
              <View style={[st.statusBadge, { backgroundColor: cfg.bgColor, borderColor: cfg.borderColor, alignSelf: 'flex-end', marginTop: 6 }]}>
                <Icon name={cfg.icon} size={12} color={cfg.textColor} />
                <Text style={[st.statusBadgeText, { color: cfg.textColor }]}>{cfg.label}</Text>
              </View>
            </View>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView style={st.modalScroll} contentContainerStyle={st.modalScrollContent} showsVerticalScrollIndicator={false}>

            {/* Info section */}
            <View style={st.infoCard}>
              <View style={st.infoRow}>
                <Text style={st.infoLabel}>المادة</Text>
                <View style={[st.subjectBadge, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={[st.subjectBadgeText, { color: '#2563EB' }]}>{subjectName}</Text>
                </View>
              </View>
              <View style={st.infoDivider} />
              <View style={st.infoRow}>
                <Text style={st.infoLabel}>المحاضر</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={st.infoValue}>{instructorName}</Text>
                  <Icon name="account-outline" size={14} color={Colors.textSecondary} />
                </View>
              </View>
              <View style={st.infoDivider} />
              <View style={st.infoRow}>
                <Text style={st.infoLabel}>الدرجة القصوى</Text>
                <Text style={st.infoValue}>{a.maxScore} درجة</Text>
              </View>
              <View style={st.infoDivider} />
              <View style={st.infoRow}>
                <Text style={st.infoLabel}>آخر موعد للتسليم</Text>
                <Text style={st.infoValue}>{formatArabicDateTime(a.dueDate)}</Text>
              </View>
              <View style={st.infoDivider} />
              <View style={st.infoRow}>
                <Text style={st.infoLabel}>تاريخ الإنشاء</Text>
                <Text style={st.infoValue}>{formatArabicDate(a.createdAt)}</Text>
              </View>
              {status === 'PENDING' && (
                <>
                  <View style={st.infoDivider} />
                  <View style={st.infoRow}>
                    <Text style={st.infoLabel}>الوقت المتبقي</Text>
                    <View style={[st.timeBadge, { backgroundColor: getTimeRemainingColor(a.dueDate).bg }]}>
                      <Icon name="clock-outline" size={12} color={getTimeRemainingColor(a.dueDate).text} />
                      <Text style={[st.timeBadgeText, { color: getTimeRemainingColor(a.dueDate).text }]}>
                        {getTimeRemaining(a.dueDate)}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Description */}
            {a.description ? (
              <View style={st.sectionCard}>
                <Text style={st.sectionTitle}>تفاصيل المهمة</Text>
                <Text style={st.sectionBody}>{a.description}</Text>
              </View>
            ) : null}

            {/* Instructor attachment */}
            {a.attachmentUrl && (
              <TouchableOpacity style={st.fileCard} activeOpacity={0.7} onPress={() => openUrl(a.attachmentUrl!)}>
                <View style={st.fileCardLeft}>
                  <View style={[st.fileIconCircle, { backgroundColor: getFileIcon(a.attachmentName).color + '15' }]}>
                    <Icon name={getFileIcon(a.attachmentName).icon} size={22} color={getFileIcon(a.attachmentName).color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.fileName} numberOfLines={1}>{a.attachmentName || 'ملف مرفق'}</Text>
                    <Text style={st.fileHint}>مرفق من المحاضر</Text>
                  </View>
                </View>
                <Icon name="download-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}

            {/* ── Submission Section ── */}

            {/* PENDING: Submit button */}
            {status === 'PENDING' && (
              <TouchableOpacity
                style={st.submitBtn}
                activeOpacity={0.7}
                onPress={() => { setSubmitContent(''); setSubmitFile(null); setShowSubmitForm(true); }}
              >
                <Icon name="send" size={18} color="#FFF" />
                <Text style={st.submitBtnText}>تسليم المهمة</Text>
              </TouchableOpacity>
            )}

            {/* OVERDUE: Warning */}
            {status === 'OVERDUE' && (
              <View style={st.overdueCard}>
                <Icon name="alert-circle-outline" size={22} color="#C62828" />
                <Text style={st.overdueTitle}>انتهت مهلة تسليم هذه المهمة</Text>
                <Text style={st.overdueDesc}>آخر موعد كان: {formatArabicDateTime(a.dueDate)}</Text>
                <TouchableOpacity
                  style={st.lateSubmitBtn}
                  activeOpacity={0.7}
                  onPress={() => { setSubmitContent(''); setSubmitFile(null); setShowSubmitForm(true); }}
                >
                  <Text style={st.lateSubmitBtnText}>تسليم متأخر</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SUBMITTED: Submission info */}
            {status === 'SUBMITTED' && sub && (
              <View style={st.submissionCard}>
                <View style={st.submissionHeader}>
                  <Icon name="check-circle-outline" size={18} color="#1565C0" />
                  <Text style={st.submissionHeaderText}>تم التسليم</Text>
                </View>
                <Text style={st.submissionDate}>تاريخ التسليم: {formatArabicDateTime(sub.submittedAt)}</Text>
                {sub.content && (
                  <View style={st.submissionContentBox}>
                    <Text style={st.submissionContentLabel}>النص المُرسل:</Text>
                    <Text style={st.submissionContentText}>{sub.content}</Text>
                  </View>
                )}
                {sub.fileUrl && sub.fileName && (
                  <TouchableOpacity style={st.submissionFileRow} activeOpacity={0.7} onPress={() => openUrl(sub.fileUrl!)}>
                    <Icon name={getFileIcon(sub.fileName).icon} size={18} color={getFileIcon(sub.fileName).color} />
                    <Text style={st.submissionFileName} numberOfLines={1}>{sub.fileName}</Text>
                    <Icon name="eye-outline" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                )}
                <View style={st.waitingBox}>
                  <Icon name="clock-outline" size={16} color="#F59E0B" />
                  <Text style={st.waitingText}>في انتظار تقييم المحاضر</Text>
                </View>
              </View>
            )}

            {/* GRADED: Score + Submission + Feedback */}
            {status === 'GRADED' && sub && (
              <>
                {/* Score circle */}
                {sub.score != null && a.maxScore > 0 && (
                  <View style={st.gradeCard}>
                    <View style={[st.gradeCircle, { borderColor: getScoreColor(sub.score, a.maxScore).main }]}>
                      <Text style={[st.gradeCirclePct, { color: getScoreColor(sub.score, a.maxScore).main }]}>
                        {Math.round((sub.score / a.maxScore) * 100)}%
                      </Text>
                      <Text style={[st.gradeCircleLabel, { color: getScoreColor(sub.score, a.maxScore).main }]}>
                        {getScoreLabel(sub.score, a.maxScore)}
                      </Text>
                    </View>
                    <Text style={st.gradeScoreText}>{sub.score} / {a.maxScore}</Text>
                  </View>
                )}

                {/* Submission info */}
                <View style={[st.submissionCard, { borderLeftColor: '#10B981' }]}>
                  <View style={st.submissionHeader}>
                    <Icon name="check-circle-outline" size={18} color="#2E7D32" />
                    <Text style={[st.submissionHeaderText, { color: '#2E7D32' }]}>التسليم</Text>
                  </View>
                  <Text style={st.submissionDate}>تاريخ التسليم: {formatArabicDateTime(sub.submittedAt)}</Text>
                  {sub.content && (
                    <View style={st.submissionContentBox}>
                      <Text style={st.submissionContentLabel}>النص المُرسل:</Text>
                      <Text style={st.submissionContentText}>{sub.content}</Text>
                    </View>
                  )}
                  {sub.fileUrl && sub.fileName && (
                    <TouchableOpacity style={st.submissionFileRow} activeOpacity={0.7} onPress={() => openUrl(sub.fileUrl!)}>
                      <Icon name={getFileIcon(sub.fileName).icon} size={18} color={getFileIcon(sub.fileName).color} />
                      <Text style={st.submissionFileName} numberOfLines={1}>{sub.fileName}</Text>
                      <Icon name="eye-outline" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Feedback */}
                {sub.feedback && (
                  <View style={[st.feedbackCard, {
                    backgroundColor: sub.score != null && a.maxScore > 0 && (sub.score / a.maxScore) >= 0.6 ? '#E8F5E9' : '#FFEBEE',
                    borderLeftColor: sub.score != null && a.maxScore > 0 && (sub.score / a.maxScore) >= 0.6 ? '#10B981' : '#F43F5E',
                  }]}>
                    <View style={st.feedbackHeader}>
                      <Icon name="comment-text-outline" size={16} color={Colors.textSecondary} />
                      <Text style={st.feedbackTitle}>ملاحظات المحاضر</Text>
                    </View>
                    <Text style={st.feedbackText}>{sub.feedback}</Text>
                  </View>
                )}
              </>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  // ══════════════════════════════ SUBMIT FORM MODAL ══════════════════════════════

  const renderSubmitFormModal = () => {
    if (!selectedAssignment || !showSubmitForm) return null;
    const a = selectedAssignment;

    return (
      <Modal
        visible={showSubmitForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { if (!submitting) { setShowSubmitForm(false); } }}
      >
        <View style={st.modalContainer}>
          {/* Header */}
          <View style={st.modalHeader}>
            <TouchableOpacity
              style={st.modalCloseBtn}
              onPress={() => { if (!submitting) { setShowSubmitForm(false); } }}
              activeOpacity={0.7}
            >
              <Icon name={AppIcons.close} size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={st.modalTitleArea}>
              <Text style={st.modalTitle}>تسليم المهمة</Text>
              <Text style={st.modalSubtitle} numberOfLines={1}>{a.title}</Text>
            </View>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView style={st.modalScroll} contentContainerStyle={st.modalScrollContent} showsVerticalScrollIndicator={false}>

            {/* Text input */}
            <View style={st.formSection}>
              <Text style={st.formLabel}>الحل / التعليق</Text>
              <Text style={st.formHint}>اختياري إذا تم رفع ملف</Text>
              <TextInput
                style={st.textArea}
                multiline
                numberOfLines={6}
                placeholder="اكتب حل المهمة أو أي ملاحظات تريد إرسالها..."
                placeholderTextColor={Colors.textHint}
                value={submitContent}
                onChangeText={t => { if (t.length <= 5000) setSubmitContent(t); }}
                textAlignVertical="top"
                textAlign="right"
                editable={!submitting}
              />
              <Text style={[st.charCount, submitContent.length > 4800 && { color: '#E11D48' }]}>
                {submitContent.length} / 5000
              </Text>
            </View>

            {/* File picker */}
            <View style={st.formSection}>
              <Text style={st.formLabel}>إرفاق ملف</Text>
              <Text style={st.formHint}>اختياري إذا تم كتابة نص</Text>

              {!submitFile ? (
                <TouchableOpacity style={st.filePickerArea} activeOpacity={0.7} onPress={pickFile} disabled={submitting}>
                  <Icon name="cloud-upload-outline" size={36} color={Colors.textHint} />
                  <Text style={st.filePickerText}>اضغط لاختيار ملف</Text>
                  <Text style={st.filePickerHint}>PDF, DOC, DOCX, ZIP, RAR, PNG, JPG (أقصى 10MB)</Text>
                </TouchableOpacity>
              ) : (
                <View style={st.selectedFileCard}>
                  <View style={[st.fileIconCircle, { backgroundColor: getFileIcon(submitFile.name).color + '15' }]}>
                    <Icon name={getFileIcon(submitFile.name).icon} size={24} color={getFileIcon(submitFile.name).color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.selectedFileName} numberOfLines={1}>{submitFile.name}</Text>
                    {submitFile.size > 0 && <Text style={st.selectedFileSize}>{formatFileSize(submitFile.size)}</Text>}
                  </View>
                  <TouchableOpacity
                    style={st.removeFileBtn}
                    onPress={() => setSubmitFile(null)}
                    activeOpacity={0.7}
                    disabled={submitting}
                  >
                    <Icon name="close-circle" size={22} color="#E11D48" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Warning text */}
            {!submitContent.trim() && !submitFile && (
              <View style={st.warningRow}>
                <Icon name="information-outline" size={14} color="#E11D48" />
                <Text style={st.warningText}>يجب إرسال نص أو ملف على الأقل</Text>
              </View>
            )}

          </ScrollView>

          {/* Footer buttons */}
          <View style={st.formFooter}>
            <TouchableOpacity
              style={st.cancelBtn}
              onPress={() => { if (!submitting) { setShowSubmitForm(false); setSubmitContent(''); setSubmitFile(null); } }}
              activeOpacity={0.7}
              disabled={submitting}
            >
              <Text style={st.cancelBtnText}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.confirmSubmitBtn, (!submitContent.trim() && !submitFile || submitting) && st.disabledBtn]}
              onPress={handleSubmit}
              activeOpacity={0.7}
              disabled={!submitContent.trim() && !submitFile || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Icon name="send" size={16} color="#FFF" />
              )}
              <Text style={st.confirmSubmitBtnText}>
                {submitting ? 'جاري التسليم...' : 'تسليم المهمة'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // ══════════════════════════════ MAIN RENDER ══════════════════════════════

  return (
    <View style={st.container}>
      <ScreenHeader
        title="المهام والتكليفات"
        subtitle="تابع مهامك وسلّم تكليفاتك في الوقت المحدد"
        onBack={onBack}
      />

      {loading ? (
        renderLoading()
      ) : error && assignments.length === 0 ? (
        <ScrollView
          contentContainerStyle={st.scroll}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        >
          {renderError()}
        </ScrollView>
      ) : assignments.length === 0 ? (
        <ScrollView
          contentContainerStyle={st.scroll}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        >
          <Animated.View style={{ opacity: fadeAnim }}>{renderEmpty()}</Animated.View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {renderStats()}
            {renderFilters()}
            {filtered.length > 0 ? filtered.map(renderAssignmentCard) : renderEmpty()}
          </Animated.View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {renderDetailModal()}
      {renderSubmitFormModal()}
    </View>
  );
};

/* ═══════════════════════════════════ STYLES ═══════════════════════════════════ */
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.borderLight },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  loadingText: { marginTop: 16, fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },

  // Empty / Error
  emptyContainer: {
    backgroundColor: '#FFF', borderRadius: 18, padding: 40, alignItems: 'center', marginTop: 40,
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  emptyDesc: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  retryButton: { marginTop: 20, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // Stats
  statsRow: { paddingBottom: 16, gap: 10 },
  statCard: {
    width: (SW - 62) / 4, borderRadius: 14, padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  statIconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },

  // Filters
  filterRow: { paddingBottom: 18, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  filterChipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },

  // Card
  card: {
    backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardSideBar: { width: 5 },
  cardContent: { flex: 1, padding: 16 },
  cardBadgeRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 10 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, gap: 4, borderWidth: 1,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  subjectBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  subjectBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', lineHeight: 24, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: Colors.textLight, textAlign: 'right', lineHeight: 20, marginBottom: 10 },
  cardInfoRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginBottom: 8 },
  cardInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardInfoText: { fontSize: 12, color: Colors.textHint, fontWeight: '500' },
  cardTimeRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
  timeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  timeBadgeText: { fontSize: 11, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, alignItems: 'center' },
  cardFooterText: { fontSize: 11, color: Colors.textHint, fontWeight: '500' },
  cardScoreSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  cardScoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardScore: { fontSize: 18, fontWeight: '800' },
  cardScoreBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  cardScoreBadgeText: { fontSize: 11, fontWeight: '700' },
  progressBarBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3 },
  attachmentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'flex-end' },
  attachmentText: { fontSize: 11, color: Colors.textHint, fontWeight: '500', maxWidth: '80%' },

  // ═══ Detail Modal ═══
  modalContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  modalHeader: {
    backgroundColor: '#FFF', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  modalCloseBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  modalTitleArea: { flex: 1, paddingHorizontal: 12, alignItems: 'flex-end' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right', lineHeight: 28 },
  modalSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginTop: 2 },
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: 16 },

  // Info card
  infoCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  infoLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  infoDivider: { height: 1, backgroundColor: '#F3F4F6' },

  // Sections
  sectionCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 10 },
  sectionBody: { fontSize: 14, color: Colors.textSecondary, textAlign: 'right', lineHeight: 24 },

  // File card
  fileCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  fileCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  fileIconCircle: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fileName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  fileHint: { fontSize: 11, color: Colors.textHint, marginTop: 2 },

  // Submit button
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // Overdue card
  overdueCard: {
    backgroundColor: '#FFEBEE', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#EF9A9A',
  },
  overdueTitle: { fontSize: 16, fontWeight: '700', color: '#C62828', textAlign: 'center', marginTop: 8, marginBottom: 4 },
  overdueDesc: { fontSize: 13, color: '#E53935', textAlign: 'center', marginBottom: 12 },
  lateSubmitBtn: {
    backgroundColor: '#9CA3AF', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10,
  },
  lateSubmitBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },

  // Submission card
  submissionCard: {
    backgroundColor: '#E3F2FD', borderRadius: 14, padding: 16, marginBottom: 16,
    borderLeftWidth: 4, borderLeftColor: '#3B82F6',
  },
  submissionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 8 },
  submissionHeaderText: { fontSize: 15, fontWeight: '700', color: '#1565C0' },
  submissionDate: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 10 },
  submissionContentBox: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: 12, marginBottom: 10 },
  submissionContentLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textAlign: 'right', marginBottom: 4 },
  submissionContentText: { fontSize: 14, color: Colors.textPrimary, textAlign: 'right', lineHeight: 22 },
  submissionFileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10, padding: 12, marginBottom: 10,
  },
  submissionFileName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  waitingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 },
  waitingText: { fontSize: 13, fontWeight: '600', color: '#F59E0B' },

  // Grade card
  gradeCard: { alignItems: 'center', marginBottom: 16 },
  gradeCircle: {
    width: 120, height: 120, borderRadius: 60, borderWidth: 5,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  gradeCirclePct: { fontSize: 28, fontWeight: '800' },
  gradeCircleLabel: { fontSize: 13, fontWeight: '700', marginTop: -2 },
  gradeScoreText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },

  // Feedback card
  feedbackCard: {
    borderRadius: 14, padding: 16, marginBottom: 16, borderLeftWidth: 4,
  },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 8 },
  feedbackTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  feedbackText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'right', lineHeight: 24 },

  // ═══ Submit Form Modal ═══
  formSection: { marginBottom: 20 },
  formLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 4 },
  formHint: { fontSize: 12, color: Colors.textHint, textAlign: 'right', marginBottom: 10 },
  textArea: {
    backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
    padding: 14, fontSize: 14, color: Colors.textPrimary, minHeight: 140, textAlign: 'right',
    lineHeight: 22,
  },
  charCount: { fontSize: 11, color: Colors.textHint, textAlign: 'left', marginTop: 4 },

  // File picker
  filePickerArea: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#D1D5DB', borderRadius: 14,
    padding: 28, alignItems: 'center', backgroundColor: '#FAFAFA',
  },
  filePickerText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginTop: 8 },
  filePickerHint: { fontSize: 11, color: Colors.textHint, marginTop: 4, textAlign: 'center' },

  // Selected file
  selectedFileCard: {
    backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  selectedFileName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  selectedFileSize: { fontSize: 12, color: Colors.textHint, marginTop: 2 },
  removeFileBtn: { padding: 4 },

  // Warning
  warningRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginBottom: 16 },
  warningText: { fontSize: 12, color: '#E11D48', fontWeight: '600' },

  // Form footer
  formFooter: {
    flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  cancelBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 14, backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  confirmSubmitBtn: {
    flex: 2, borderRadius: 12, paddingVertical: 14, backgroundColor: Colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  confirmSubmitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  disabledBtn: { opacity: 0.5 },
});

export default AssignmentsScreen;
