// DistributionsScreen — توزيعات التدريب
// يعكس منطق نسخة الويب (trainee-dashboard/distributions) بالكامل
// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles listing distributions and joining rooms
// 2. Open/Closed: Can be extended with new UI states without modification

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
import ScreenHeader from '../components/shared/ScreenHeader';
import DataState from '../components/shared/DataState';
import { distributionService } from '../services/distributionService';
import {
  AvailableDistribution,
  DistributionRoom,
  DistributionError,
  JoinConfirmState,
} from '../types/distributions';

/* ══════════════════════════════════ PROPS ══════════════════════════════════ */
interface Props {
  accessToken: string;
  onBack: () => void;
}

/* ══════════════════════════════════ HELPERS ══════════════════════════════════ */
const TYPE_LABELS: Record<string, string> = {
  THEORY: 'نظري',
  PRACTICAL: 'عملي',
};

const getTypeLabel = (type: string): string => TYPE_LABELS[type] || type;

const formatArabicDate = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getOccupancyRatio = (room: DistributionRoom): number => {
  if (!room.capacity || room.capacity <= 0) return 0;
  return Math.min(room.enrolledCount / room.capacity, 1);
};

const getProgressColor = (room: DistributionRoom): string => {
  if (room.isFull) return Colors.error;
  if (getOccupancyRatio(room) > 0.8) return Colors.accent;
  return Colors.primary;
};

const EMPTY_CONFIRM: JoinConfirmState = {
  isOpen: false,
  roomId: null,
  roomName: '',
  distributionName: '',
  isChangingGroup: false,
  currentRoomName: '',
};

/* ══════════════════════════════════ COMPONENT ══════════════════════════════════ */
const DistributionsScreen: React.FC<Props> = ({ accessToken, onBack }) => {
  // ─── State ───
  const [distributions, setDistributions] = useState<AvailableDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<JoinConfirmState>(EMPTY_CONFIRM);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ─── Load distributions ───
  const loadDistributions = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setError(null);
        const data = await distributionService.getAvailableDistributions(accessToken);
        setDistributions(data);
      } catch (err: any) {
        const apiError = err as DistributionError;
        setError(apiError.message || 'حدث خطأ أثناء تحميل التوزيعات المتاحة');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    loadDistributions();
  }, [loadDistributions]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // ─── Refresh ───
  const onRefresh = () => {
    setIsRefreshing(true);
    loadDistributions(true);
  };

  // ─── فتح نافذة التأكيد ───
  const requestJoin = (room: DistributionRoom, dist: AvailableDistribution) => {
    const currentRoom = dist.rooms.find(r => r.id === dist.joinedRoomId);
    setConfirmDialog({
      isOpen: true,
      roomId: room.id,
      roomName: room.name,
      distributionName: `${dist.classroomName} — ${getTypeLabel(dist.type)}`,
      isChangingGroup: dist.isJoined,
      currentRoomName: currentRoom?.name || '',
    });
  };

  const cancelJoin = () => setConfirmDialog(EMPTY_CONFIRM);

  // ─── تأكيد الانضمام / تغيير المجموعة ───
  const confirmJoin = async () => {
    const { roomId } = confirmDialog;
    if (!roomId) return;
    cancelJoin();
    try {
      setJoiningRoomId(roomId);
      const res = await distributionService.joinDistributionRoom(roomId, accessToken);
      setFeedback({
        type: 'success',
        text: res?.message || 'تم الانضمام إلى المجموعة بنجاح',
      });
      await loadDistributions(true);
    } catch (err: any) {
      const apiError = err as DistributionError;
      setFeedback({
        type: 'error',
        text: apiError.message || 'حدث خطأ أثناء الانضمام للمجموعة',
      });
    } finally {
      setJoiningRoomId(null);
    }
  };

  // إخفاء رسالة النتيجة تلقائياً
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const hasData = distributions.length > 0;

  return (
    <View style={s.container}>
      <ScreenHeader
        title="التوزيعات"
        subtitle="توزيعات التدريب — اختر مجموعتك"
        onBack={onBack}
      />

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* رسالة نتيجة العملية */}
        {feedback ? (
          <View
            style={[
              s.feedbackBar,
              feedback.type === 'success' ? s.feedbackSuccess : s.feedbackError,
            ]}
          >
            <Icon
              name={feedback.type === 'success' ? AppIcons.checkFilled : AppIcons.warning}
              size={18}
              color={feedback.type === 'success' ? Colors.success : Colors.error}
            />
            <Text
              style={[
                s.feedbackText,
                { color: feedback.type === 'success' ? Colors.success : Colors.error },
              ]}
            >
              {feedback.text}
            </Text>
          </View>
        ) : null}

        <DataState
          isLoading={loading}
          loadingText="جاري تحميل التوزيعات المتاحة..."
          error={error}
          onRetry={() => loadDistributions()}
          isEmpty={!loading && !error && !hasData}
          emptyIcon={AppIcons.distributions}
          emptyTitle="لا توجد توزيعات متاحة"
          emptyMessage="لم يتم نشر أي توزيع متاح للتسجيل الذاتي لبرنامجك حتى الآن. يرجى المحاولة لاحقاً."
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {distributions.map(dist => (
              <DistributionCard
                key={dist.id}
                dist={dist}
                joiningRoomId={joiningRoomId}
                onRequestJoin={requestJoin}
              />
            ))}
          </Animated.View>
        </DataState>
      </ScrollView>

      {/* نافذة تأكيد الانضمام / تغيير المجموعة */}
      <ConfirmDialog
        state={confirmDialog}
        onCancel={cancelJoin}
        onConfirm={confirmJoin}
      />
    </View>
  );
};

export default DistributionsScreen;
/* ══════════════════════════ DistributionCard ══════════════════════════ */
interface CardProps {
  dist: AvailableDistribution;
  joiningRoomId: string | null;
  onRequestJoin: (room: DistributionRoom, dist: AvailableDistribution) => void;
}

const DistributionCard: React.FC<CardProps> = ({ dist, joiningRoomId, onRequestJoin }) => {
  const joinedRoom = dist.rooms.find(r => r.id === dist.joinedRoomId) || null;
  const hasWindow = !!(dist.registrationStartDate || dist.registrationEndDate);

  return (
    <View style={s.card}>
      {/* ── رأس التوزيع ── */}
      <View style={s.cardHeader}>
        <View style={s.cardHeaderIcon}>
          <Icon name={AppIcons.distributions} size={22} color={Colors.primaryDark} />
        </View>
        <View style={s.cardHeaderText}>
          <Text style={s.cardTitle}>{dist.classroomName}</Text>
          <Text style={s.cardSubtitle}>
            {getTypeLabel(dist.type)} · {dist.academicYear}
          </Text>
        </View>
        <View style={s.yearBadge}>
          <Text style={s.yearBadgeText}>{dist.academicYear}</Text>
        </View>
      </View>

      {/* ── شارات الحالة ── */}
      <View style={s.badgesRow}>
        {dist.isRegistrationOpen ? (
          <View style={[s.badge, s.badgeOpen]}>
            <Icon name={AppIcons.unlock} size={13} color={Colors.success} />
            <Text style={[s.badgeText, { color: Colors.success }]}>التسجيل مفتوح</Text>
          </View>
        ) : (
          <View style={[s.badge, s.badgeClosed]}>
            <Icon name={AppIcons.lock} size={13} color={Colors.error} />
            <Text style={[s.badgeText, { color: Colors.error }]}>التسجيل مغلق</Text>
          </View>
        )}

        {dist.isJoined ? (
          <View style={[s.badge, s.badgeJoined]}>
            <Icon name={AppIcons.checkFilled} size={13} color={Colors.primaryDark} />
            <Text style={[s.badgeText, { color: Colors.primaryDark }]}>أنت مسجل</Text>
          </View>
        ) : null}
      </View>

      {/* ── فترة التسجيل ── */}
      {hasWindow ? (
        <View style={s.windowBox}>
          {dist.registrationStartDate ? (
            <View style={s.windowItem}>
              <Text style={s.windowLabel}>بداية التسجيل:</Text>
              <Text style={s.windowValue}>{formatArabicDate(dist.registrationStartDate)}</Text>
            </View>
          ) : null}
          {dist.registrationEndDate ? (
            <View style={s.windowItem}>
              <Text style={s.windowLabel}>نهاية التسجيل:</Text>
              <Text style={s.windowValue}>{formatArabicDate(dist.registrationEndDate)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ── مجموعتي الحالية ── */}
      {dist.isJoined ? (
        <View
          style={[
            s.currentBox,
            dist.isRegistrationOpen ? s.currentBoxOpen : s.currentBoxClosed,
          ]}
        >
          <View
            style={[
              s.currentIcon,
              dist.isRegistrationOpen ? s.currentIconOpen : s.currentIconClosed,
            ]}
          >
            <Icon
              name={AppIcons.checkFilled}
              size={22}
              color={dist.isRegistrationOpen ? Colors.warning : Colors.success}
            />
          </View>
          <View style={s.flex}>
            <Text style={s.currentTitle}>
              مجموعتك الحالية: {joinedRoom?.name || 'مجموعة مسجلة'}
            </Text>
            <Text style={s.currentNote}>
              {dist.isRegistrationOpen
                ? 'يمكنك اختيار مجموعة أخرى أدناه للانتقال إليها طالما أن فترة التسجيل ما زالت مفتوحة.'
                : 'انتهت فترة التسجيل. أنت مسجل في هذه المجموعة ولا يمكنك التغيير الآن إلا من خلال المقر الإداري.'}
            </Text>
          </View>
        </View>
      ) : null}

      {/* ── المجموعات ── */}
      <Text style={s.roomsTitle}>
        {dist.rooms.length > 0 ? `المجموعات المتاحة (${dist.rooms.length})` : 'المجموعات'}
      </Text>

      {dist.rooms.length === 0 ? (
        <View style={s.noRooms}>
          <Icon name={AppIcons.warning} size={18} color={Colors.textLight} />
          <Text style={s.noRoomsText}>لم يتم إضافة مجموعات لهذا التوزيع بعد.</Text>
        </View>
      ) : (
        dist.rooms.map(room => (
          <RoomCard
            key={room.id}
            room={room}
            dist={dist}
            isCurrentRoom={room.id === dist.joinedRoomId}
            joiningRoomId={joiningRoomId}
            onPress={() => onRequestJoin(room, dist)}
          />
        ))
      )}
    </View>
  );
};
  /* ══════════════════════════ RoomCard ══════════════════════════ */
interface RoomProps {
  room: DistributionRoom;
  dist: AvailableDistribution;
  isCurrentRoom: boolean;
  joiningRoomId: string | null;
  onPress: () => void;
}

const RoomCard: React.FC<RoomProps> = ({
  room,
  dist,
  isCurrentRoom,
  joiningRoomId,
  onPress,
}) => {
  const isJoining = joiningRoomId === room.id;
  const disabled =
    isCurrentRoom || !dist.isRegistrationOpen || room.isFull || joiningRoomId !== null;

  // نص الزر — نفس ترتيب أولويات نسخة الويب
  const buttonLabel = isCurrentRoom
    ? 'مجموعتك الحالية'
    : room.isFull
    ? 'المجموعة ممتلئة'
    : !dist.isRegistrationOpen
    ? 'التسجيل مغلق'
    : dist.isJoined
    ? 'الانتقال لهذه المجموعة'
    : 'انضمام للمجموعة';

  const isTransfer = dist.isJoined && !room.isFull && dist.isRegistrationOpen && !isCurrentRoom;

  return (
    <View
      style={[
        s.roomCard,
        isCurrentRoom
          ? s.roomCardCurrent
          : room.isFull
          ? s.roomCardFull
          : s.roomCardDefault,
      ]}
    >
      {/* اسم القاعة + عدد المتدربين */}
      <View style={s.roomTop}>
        <View style={s.flex}>
          <Text style={s.roomName}>{room.name}</Text>
          {isCurrentRoom ? (
            <View style={s.currentPill}>
              <Text style={s.currentPillText}>مجموعتك الحالية</Text>
            </View>
          ) : null}
        </View>
        <View style={[s.capacityBadge, room.isFull ? s.capacityFull : s.capacityOk]}>
          <Icon
            name={AppIcons.capacity}
            size={13}
            color={room.isFull ? Colors.error : Colors.primaryDark}
          />
          <Text
            style={[
              s.capacityText,
              { color: room.isFull ? Colors.error : Colors.primaryDark },
            ]}
          >
            {'\u2066'}{room.enrolledCount} / {room.capacity}{'\u2069'}
          </Text>
        </View>
      </View>

      {/* شريط الإشغال */}
      <View style={s.progressTrack}>
        <View
          style={[
            s.progressFill,
            {
              width: `${Math.round(getOccupancyRatio(room) * 100)}%`,
              backgroundColor: getProgressColor(room),
            },
          ]}
        />
      </View>

      {/* زر الانضمام */}
      <TouchableOpacity
        style={[
          s.joinBtn,
          isCurrentRoom
            ? s.joinBtnCurrent
            : disabled
            ? s.joinBtnDisabled
            : isTransfer
            ? s.joinBtnTransfer
            : s.joinBtnPrimary,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {isJoining ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text
            style={[
              s.joinBtnText,
              (isCurrentRoom || disabled) && !isJoining
                ? s.joinBtnTextMuted
                : s.joinBtnTextLight,
            ]}
          >
            {buttonLabel}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

/* ══════════════════════════ ConfirmDialog ══════════════════════════ */
interface DialogProps {
  state: JoinConfirmState;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmDialog: React.FC<DialogProps> = ({ state, onCancel, onConfirm }) => {
  if (!state.isOpen) return null;

  return (
    <Modal
      visible={state.isOpen}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          {/* شريط علوي برتقالي */}
          <View style={s.modalAccent} />

          <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
            {/* العنوان */}
            <View style={s.modalHeader}>
              <View style={s.modalIconWrap}>
                <Icon name={AppIcons.warning} size={24} color={Colors.warning} />
              </View>
              <View style={s.flex}>
                <Text style={s.modalTitle}>
                  {state.isChangingGroup ? 'تأكيد تغيير المجموعة' : 'تأكيد الانضمام للمجموعة'}
                </Text>
                <Text style={s.modalSubtitle}>يرجى قراءة التنبيه بعناية قبل الإكمال</Text>
              </View>
              <TouchableOpacity style={s.modalClose} onPress={onCancel} activeOpacity={0.7}>
                <Icon name={AppIcons.close} size={18} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            {/* صندوق التنبيه */}
            <View style={s.warnBox}>
              <View style={s.warnHeader}>
                <Icon name={AppIcons.info} size={18} color={Colors.warning} />
                <Text style={s.warnTitle}>تنبيه هام — يرجى الانتباه</Text>
              </View>

              {state.isChangingGroup ? (
                <>
                  <WarnItem>
                    سيتم إزالتك من مجموعتك الحالية
                    {state.currentRoomName ? ` (${state.currentRoomName})` : ''} ونقلك إلى{' '}
                    <Text style={s.warnStrong}>{state.roomName}</Text>.
                  </WarnItem>
                  <WarnItem>
                    يمكنك التغيير مجدداً طالما أن فترة التسجيل ما زالت مفتوحة.
                  </WarnItem>
                  <WarnItem>
                    عند انتهاء فترة التسجيل لن تتمكن من التغيير إلا من خلال المقر الإداري.
                  </WarnItem>
                </>
              ) : (
                <>
                  <WarnItem>
                    يمكنك تغيير مجموعتك لاحقاً طالما أن فترة التسجيل ما زالت مفتوحة.
                  </WarnItem>
                  <WarnItem>
                    عند انتهاء فترة التسجيل يتوجب مراجعة المقر الإداري لأي تعديل.
                  </WarnItem>
                </>
              )}
            </View>

            {/* ملخص الاختيار */}
            <View style={s.summaryBox}>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>التوزيع</Text>
                <Text style={s.summaryValue}>{state.distributionName}</Text>
              </View>
              <View style={s.summaryDivider} />
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>المجموعة المختارة</Text>
                <Text style={[s.summaryValue, { color: Colors.primaryDark }]}>
                  {state.roomName}
                </Text>
              </View>
            </View>

            {/* الأزرار */}
            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnPrimary]}
                onPress={onConfirm}
                activeOpacity={0.85}
              >
                <Icon name={AppIcons.check} size={18} color={Colors.white} />
                <Text style={s.modalBtnPrimaryText}>
                  {state.isChangingGroup ? 'تأكيد التغيير' : 'تأكيد الانضمام'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnCancel]}
                onPress={onCancel}
                activeOpacity={0.85}
              >
                <Text style={s.modalBtnCancelText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/* عنصر قائمة في صندوق التنبيه */
const WarnItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={s.warnItem}>
    <View style={s.warnDot} />
    <Text style={s.warnItemText}>{children}</Text>
  </View>
);
/* ══════════════════════════════════ STYLES ══════════════════════════════════ */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  /* ── رسالة النتيجة ── */
  feedbackBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
  },
  feedbackSuccess: { backgroundColor: Colors.successLight, borderColor: Colors.successBorder },
  feedbackError: { backgroundColor: Colors.errorLight, borderColor: Colors.errorBorder },
  feedbackText: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'right' },

  /* ── بطاقة التوزيع ── */
  card: {
    backgroundColor: Colors.white, borderRadius: 20,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.borderLight,
    shadowColor: Colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 10, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardHeaderIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right' },
  cardSubtitle: {
    fontSize: 12.5, fontWeight: '600', color: Colors.textLight,
    textAlign: 'right', marginTop: 2,
  },
  yearBadge: {
    backgroundColor: Colors.backgroundAlt, borderRadius: 10,
    paddingHorizontal: 9, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.borderMedium,
  },
  yearBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary },

  /* ── الشارات ── */
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 999, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  badgeOpen: { backgroundColor: Colors.successLight, borderColor: Colors.successBorder },
  badgeClosed: { backgroundColor: Colors.errorLight, borderColor: Colors.errorBorder },
  badgeJoined: { backgroundColor: Colors.primarySoft, borderColor: Colors.successBorder },
  badgeText: { fontSize: 11.5, fontWeight: '800' },

  /* ── فترة التسجيل ── */
  windowBox: {
    marginTop: 12, backgroundColor: Colors.backgroundAlt,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight,
    paddingHorizontal: 12, paddingVertical: 10, gap: 6,
  },
  windowItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  windowLabel: { fontSize: 12, fontWeight: '700', color: Colors.textHint },
  windowValue: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },

  /* ── مجموعتي الحالية ── */
  currentBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginTop: 14, borderRadius: 16, borderWidth: 1, padding: 14,
  },
  currentBoxOpen: { backgroundColor: Colors.warningLight, borderColor: Colors.warningBorder },
  currentBoxClosed: { backgroundColor: Colors.successLight, borderColor: Colors.successBorder },
  currentIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  currentIconOpen: { backgroundColor: Colors.warningSoft },
  currentIconClosed: { backgroundColor: Colors.successSoft },
  currentTitle: { fontSize: 14.5, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right' },
  currentNote: {
    fontSize: 12.5, fontWeight: '600', color: Colors.textSecondary,
    textAlign: 'right', marginTop: 4, lineHeight: 19,
  },

  /* ── المجموعات ── */
  roomsTitle: {
    fontSize: 13.5, fontWeight: '800', color: Colors.textPrimary,
    textAlign: 'right', marginTop: 18, marginBottom: 10,
  },
  noRooms: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 18,
    backgroundColor: Colors.backgroundAlt, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.borderLight, borderStyle: 'dashed',
  },
  noRoomsText: { fontSize: 12.5, fontWeight: '600', color: Colors.textLight },

  /* ── بطاقة القاعة ── */
  roomCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  roomCardDefault: {
    backgroundColor: Colors.white, borderColor: Colors.borderMedium,
  },
  roomCardCurrent: {
    backgroundColor: Colors.successLight, borderColor: Colors.successBorder,
  },
  roomCardFull: {
    backgroundColor: Colors.backgroundAlt, borderColor: Colors.borderLight, opacity: 0.85,
  },
  roomTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  roomName: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right' },
  currentPill: {
    alignSelf: 'flex-end', marginTop: 5,
    backgroundColor: Colors.primarySoft, borderRadius: 999,
    borderWidth: 1, borderColor: Colors.successBorder,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  currentPillText: { fontSize: 10.5, fontWeight: '800', color: Colors.primaryDark },
  capacityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  capacityOk: { backgroundColor: Colors.successLight, borderColor: Colors.successBorder },
  capacityFull: { backgroundColor: Colors.errorLight, borderColor: Colors.errorBorder },
  capacityText: { fontSize: 11, fontWeight: '800' },

  progressTrack: {
    height: 6, borderRadius: 3, backgroundColor: Colors.borderLight,
    marginTop: 12, marginBottom: 14, overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3 },

  joinBtn: {
    borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center',
    minHeight: 44, flexDirection: 'row', gap: 6,
  },
  joinBtnPrimary: { backgroundColor: Colors.primary },
  joinBtnTransfer: { backgroundColor: Colors.accentDark },
  joinBtnCurrent: {
    backgroundColor: Colors.successLight,
    borderWidth: 1, borderColor: Colors.successBorder,
  },
  joinBtnDisabled: {
    backgroundColor: Colors.backgroundAlt,
    borderWidth: 1, borderColor: Colors.borderMedium,
  },
  joinBtnText: { fontSize: 13.5, fontWeight: '800' },
  joinBtnTextLight: { color: Colors.white },
  joinBtnTextMuted: { color: Colors.textHint },

  /* ── النافذة المنبثقة ── */
  modalBackdrop: {
    flex: 1, backgroundColor: Colors.overlayDark,
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalCard: {
    width: '100%', maxHeight: '88%',
    backgroundColor: Colors.white, borderRadius: 22, overflow: 'hidden',
  },
  modalAccent: { height: 5, backgroundColor: Colors.accent },
  modalScroll: { paddingHorizontal: 18, paddingBottom: 18 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginTop: 18, marginBottom: 16,
  },
  modalIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: Colors.warningLight, borderWidth: 1, borderColor: Colors.warningBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right' },
  modalSubtitle: {
    fontSize: 12.5, fontWeight: '600', color: Colors.textLight,
    textAlign: 'right', marginTop: 2,
  },
  modalClose: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.backgroundAlt,
  },
  warnBox: {
    backgroundColor: Colors.warningLight, borderWidth: 1, borderColor: Colors.warningBorder,
    borderRadius: 16, padding: 14, gap: 8,
  },
  warnHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  warnTitle: { fontSize: 13.5, fontWeight: '800', color: Colors.warning, textAlign: 'right' },
  warnItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  warnDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.accent, marginTop: 7,
  },
  warnItemText: {
    flex: 1, fontSize: 12.5, fontWeight: '600',
    color: Colors.textSecondary, textAlign: 'right', lineHeight: 20,
  },
  warnStrong: { fontWeight: '800', color: Colors.textPrimary },
  summaryBox: {
    marginTop: 16, backgroundColor: Colors.backgroundAlt,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.borderLight,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  summaryLabel: { fontSize: 12.5, fontWeight: '700', color: Colors.textHint },
  summaryValue: {
    flex: 1, fontSize: 13, fontWeight: '800',
    color: Colors.textPrimary, textAlign: 'right',
  },
  summaryDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 13, paddingVertical: 13, minHeight: 46,
  },
  modalBtnPrimary: { backgroundColor: Colors.primary },
  modalBtnPrimaryText: { fontSize: 14, fontWeight: '800', color: Colors.white },
  modalBtnCancel: {
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderMedium,
  },
  modalBtnCancelText: { fontSize: 14, fontWeight: '800', color: Colors.textSecondary },
});