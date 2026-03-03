// GradeAppealsScreen  تظلمات الدرجات (Mercy Grades)
// GET /api/trainee-grades/{traineeId}/mercy-grades
// Response: flat array of { contentId, contentName, contentCode, classroomId, classroomName, addedPoints, totalAfter, appliedAt }

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
import { gradeAppealsService } from '../services/gradeAppealsService';
import { MercyGradeItem, MercyGradesResponse } from '../types/mercyGrades';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/*  PROPS  */
interface GradeAppealsScreenProps {
  accessToken: string;
  traineeId?: number;
  onBack: () => void;
}

/*  HELPERS  */
const fmtNum = (v: number | null | undefined): string => {
  if (v == null) return '';
  return Number.isInteger(v) ? v.toString() : v.toFixed(2);
};

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
};

/*  STAT CARD  */
const StatCard: React.FC<{
  icon: string; label: string; value: string | number; color: string; bg: string;
}> = ({ icon, label, value, color, bg }) => (
  <View style={[styles.statCard, { borderColor: bg }]}>
    <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
      <Icon name={icon} size={20} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/*  MAIN  */
const GradeAppealsScreen: React.FC<GradeAppealsScreenProps> = ({
  accessToken,
  traineeId,
  onBack,
}) => {
  const [items, setItems] = useState<MercyGradesResponse>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MercyGradeItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeClassroom, setActiveClassroom] = useState<string>('ALL');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  /*  LOAD  */
  const loadData = useCallback(async (silent = false) => {
    if (!traineeId) {
      setError('لم يتم تحديد المتدرب');
      setLoading(false);
      return;
    }
    try {
      if (!silent) setLoading(true);
      setError(null);
      const result = await gradeAppealsService.getMercyGrades(traineeId, accessToken);
      setItems(result);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات الرأفة');
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

  /*  DERIVED  */
  // Group by classroom
  const classrooms = useMemo(() => {
    const map = new Map<string, MercyGradeItem[]>();
    items.forEach(item => {
      const name = item.classroomName || 'غير محدد';
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(item);
    });
    return map;
  }, [items]);

  const classroomNames = useMemo(() => ['ALL', ...Array.from(classrooms.keys())], [classrooms]);

  const filteredItems = useMemo(() => {
    if (activeClassroom === 'ALL') return items;
    return classrooms.get(activeClassroom) ?? [];
  }, [items, classrooms, activeClassroom]);

  const totalMercy = items.reduce((sum, i) => sum + (i.addedPoints ?? 0), 0);
  const subjectCount = items.length;

  /*  OPEN DETAIL  */
  const openDetail = (item: MercyGradeItem) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  /*  RENDER  */

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="تظلمات الدرجات" subtitle="درجات الرأفة" onBack={onBack} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>جارٍ تحميل البيانات...</Text>
        </View>
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="تظلمات الدرجات" subtitle="درجات الرأفة" onBack={onBack} />
        <View style={styles.centered}>
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <Icon name="alert-circle-outline" size={48} color={Colors.error} />
            </View>
            <Text style={styles.errorTitle}>خطأ</Text>
            <Text style={styles.errorMsg}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()} activeOpacity={0.7}>
              <Icon name="refresh" size={18} color="#FFF" />
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="تظلمات الدرجات" subtitle="درجات الرأفة" onBack={onBack} />

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

          {/*  SUMMARY STATS  */}
          <View style={styles.summaryRow}>
            <StatCard
              icon="book-open-outline"
              label="عدد المواد"
              value={subjectCount}
              color="#2563EB"
              bg="#EFF6FF"
            />
            <StatCard
              icon="plus-circle-outline"
              label="إجمالي الرأفة"
              value={fmtNum(totalMercy)}
              color="#059669"
              bg="#ECFDF5"
            />
            <StatCard
              icon="school-outline"
              label="الفصول"
              value={classrooms.size}
              color="#7C3AED"
              bg="#F5F3FF"
            />
          </View>

          {/*  CLASSROOM TABS  */}
          {classrooms.size > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
              <View style={styles.tabRow}>
                {classroomNames.map(name => {
                  const isActive = activeClassroom === name;
                  const label = name === 'ALL' ? `الكل (${items.length})` : `${name} (${classrooms.get(name)?.length ?? 0})`;
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                      onPress={() => setActiveClassroom(name)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/*  TABLE HEADER  */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>المادة</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>الكود</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>الرأفة</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>بعد الرأفة</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>التاريخ</Text>
          </View>

          {/*  TABLE ROWS  */}
          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="clipboard-text-off-outline" size={56} color={Colors.borderMedium} />
              <Text style={styles.emptyTitle}>لا توجد بيانات رأفة</Text>
              <Text style={styles.emptySub}>لم يتم تسجيل أي درجات رأفة بعد</Text>
            </View>
          ) : (
            filteredItems.map((item, idx) => {
              const isOdd = idx % 2 === 1;
              return (
                <TouchableOpacity
                  key={`${item.contentId}-${item.classroomId}-${idx}`}
                  style={[styles.tableRow, isOdd && styles.tableRowAlt]}
                  onPress={() => openDetail(item)}
                  activeOpacity={0.7}
                >
                  {/* Content name */}
                  <View style={[styles.tableCell, { flex: 2.5, alignItems: 'flex-start' }]}>
                    <Text style={styles.courseName} numberOfLines={2}>{item.contentName}</Text>
                  </View>

                  {/* Code */}
                  <View style={[styles.tableCell, { flex: 1.2 }]}>
                    <Text style={styles.codeText}>{item.contentCode}</Text>
                  </View>

                  {/* Added Points */}
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <View style={styles.mercyBadge}>
                      <Text style={styles.mercyBadgeText}>+{fmtNum(item.addedPoints)}</Text>
                    </View>
                  </View>

                  {/* Total After */}
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <Text style={styles.totalAfterText}>{fmtNum(item.totalAfter)}</Text>
                  </View>

                  {/* Date */}
                  <View style={[styles.tableCell, { flex: 1.2 }]}>
                    <Text style={styles.dateText}>{formatDate(item.appliedAt)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* Footer spacer */}
          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>

      {/*  DETAIL MODAL  */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />

            {selectedItem && (() => {
              const item = selectedItem;
              // Collect all extra fields (beyond known ones)
              const knownKeys = new Set(['contentId','contentName','contentCode','classroomId','classroomName','addedPoints','totalAfter','appliedAt']);
              const extraFields = Object.entries(item).filter(([k]) => !knownKeys.has(k) && item[k] != null);

              return (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <View style={styles.modalCourseIconWrap}>
                      <Icon name="book-open-page-variant-outline" size={32} color={Colors.primary} />
                    </View>
                    <Text style={styles.modalTitle}>{item.contentName}</Text>
                    <Text style={styles.modalCode}>{item.contentCode}</Text>
                  </View>

                  {/* Info Cards */}
                  <View style={styles.detailGrid}>
                    {/* Classroom */}
                    <View style={[styles.detailCard, { backgroundColor: '#F5F3FF' }]}>
                      <Icon name="school-outline" size={22} color="#7C3AED" />
                      <Text style={styles.detailCardLabel}>الفصل الدراسي</Text>
                      <Text style={[styles.detailCardValue, { color: '#7C3AED' }]}>{item.classroomName}</Text>
                    </View>

                    {/* Added Points */}
                    <View style={[styles.detailCard, { backgroundColor: '#ECFDF5' }]}>
                      <Icon name="plus-circle-outline" size={22} color="#059669" />
                      <Text style={styles.detailCardLabel}>درجات الرأفة</Text>
                      <Text style={[styles.detailCardValue, { color: '#059669' }]}>+{fmtNum(item.addedPoints)}</Text>
                    </View>

                    {/* Total After */}
                    <View style={[styles.detailCard, { backgroundColor: '#EFF6FF' }]}>
                      <Icon name="calculator-variant-outline" size={22} color="#2563EB" />
                      <Text style={styles.detailCardLabel}>الدرجة بعد الرأفة</Text>
                      <Text style={[styles.detailCardValue, { color: '#2563EB' }]}>{fmtNum(item.totalAfter)}</Text>
                    </View>

                    {/* Applied Date */}
                    <View style={[styles.detailCard, { backgroundColor: '#FFFBEB' }]}>
                      <Icon name="calendar-check-outline" size={22} color="#D97706" />
                      <Text style={styles.detailCardLabel}>تاريخ التطبيق</Text>
                      <Text style={[styles.detailCardValue, { color: '#D97706' }]}>{formatDate(item.appliedAt)}</Text>
                    </View>
                  </View>

                  {/* Extra fields if any */}
                  {extraFields.length > 0 && (
                    <View style={styles.extrasSection}>
                      <Text style={styles.sectionTitle}>معلومات إضافية</Text>
                      {extraFields.map(([key, value]) => (
                        <View key={key} style={styles.extraRow}>
                          <Text style={styles.extraLabel}>{key}</Text>
                          <Text style={styles.extraValue}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Close */}
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setShowModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalCloseBtnText}>إغلاق</Text>
                  </TouchableOpacity>
                </ScrollView>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

/*  STYLES  */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 12, paddingTop: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },

  loadingText: { fontSize: 14, color: Colors.textLight, marginTop: 8 },

  /* Error */
  errorCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 32, alignItems: 'center',
    width: '100%', maxWidth: 320, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12,
  },
  errorIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.errorLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  errorMsg: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, gap: 8,
  },
  retryText: { fontSize: 14, fontWeight: '600', color: '#FFF' },

  /* Summary */
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4,
  },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textLight, marginTop: 2, textAlign: 'center' },

  /* Tabs */
  tabScroll: { marginBottom: 12 },
  tabRow: { flexDirection: 'row', gap: 8 },
  tabBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderMedium,
  },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  tabBtnTextActive: { color: '#FFF' },

  /* Table */
  tableHeaderRow: {
    flexDirection: 'row', backgroundColor: Colors.primaryDark, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 8, marginBottom: 4,
  },
  tableHeaderCell: { fontSize: 10, fontWeight: '700', color: '#FFF', textAlign: 'center' },

  tableRow: {
    flexDirection: 'row', backgroundColor: Colors.white, paddingVertical: 12, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight, alignItems: 'center',
  },
  tableRowAlt: { backgroundColor: '#FAFBFC' },

  tableCell: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  courseName: { fontSize: 11, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right', lineHeight: 16 },
  codeText: { fontSize: 10, color: Colors.textLight, fontWeight: '500' },

  mercyBadge: {
    backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  mercyBadgeText: { fontSize: 12, fontWeight: '800', color: '#059669' },

  totalAfterText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  dateText: { fontSize: 9, color: Colors.textLight, textAlign: 'center' },

  /* Empty */
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: 13, color: Colors.textLight, textAlign: 'center', maxWidth: 260 },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: Dimensions.get('window').height * 0.75,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderMedium,
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },

  /* Modal header */
  modalHeader: { alignItems: 'center', marginBottom: 20 },
  modalCourseIconWrap: {
    width: 60, height: 60, borderRadius: 16, backgroundColor: Colors.primary50,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  modalCode: { fontSize: 13, color: Colors.textLight, fontWeight: '500' },

  /* Detail grid */
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  detailCard: {
    width: '47%', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6,
  },
  detailCardLabel: { fontSize: 11, color: Colors.textLight, textAlign: 'center' },
  detailCardValue: { fontSize: 18, fontWeight: '800', textAlign: 'center' },

  /* Extras  */
  extrasSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12, textAlign: 'right' },
  extraRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  extraLabel: { fontSize: 13, color: Colors.textSecondary },
  extraValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },

  /* Close */
  modalCloseBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  modalCloseBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});

export default GradeAppealsScreen;