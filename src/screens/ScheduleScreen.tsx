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
import {authService} from '../services/authService';
import {API_CONFIG} from '../services/apiConfig';
import {ScheduleDebugger} from '../utils/scheduleDebugger';
import {
  WeeklySchedule,
  ScheduleSession,
  ScheduleError,
  DayOfWeek,
  MyScheduleResponse,
  ScheduleSlot,
  SessionType,
} from '../types/auth';
import WeeklyScheduleView from '../components/WeeklyScheduleView';
import DailySchedule from '../components/DailySchedule';
import ScheduleSlotDetails from '../components/ScheduleSlotDetails';

interface ScheduleScreenProps {
  accessToken: string;
  classroomId?: number;
  onBack: () => void;
}

const ScheduleScreen: React.FC<ScheduleScreenProps> = ({
  accessToken,
  classroomId,
  onBack,
}) => {
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null);
  const [myScheduleData, setMyScheduleData] =
    useState<MyScheduleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ScheduleError | null>(null);
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(DayOfWeek.SATURDAY);
  const [currentClassroomId, setCurrentClassroomId] = useState<
    number | undefined
  >(classroomId);
  const [showSlotDetails, setShowSlotDetails] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<number | undefined>();

  useEffect(() => {
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSchedule = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Loading schedule...');
      console.log(
        '📋 API Base URL:',
        API_CONFIG.BASE_URL || 'Not set, using default',
      );

      const response = await authService.getMySchedule(accessToken);

      console.log(
        '✅ Schedule loaded successfully!',
        JSON.stringify(response, null, 2).substring(0, 500),
      );

      setMyScheduleData(response);

      if (response.classroom) {
        setCurrentClassroomId(response.classroom.id);
      }

      const weeklySchedule: WeeklySchedule = {
        [DayOfWeek.SUNDAY]: [],
        [DayOfWeek.MONDAY]: [],
        [DayOfWeek.TUESDAY]: [],
        [DayOfWeek.WEDNESDAY]: [],
        [DayOfWeek.THURSDAY]: [],
        [DayOfWeek.FRIDAY]: [],
        [DayOfWeek.SATURDAY]: [],
      };

      if (
        response.schedule &&
        typeof response.schedule === 'object' &&
        !Array.isArray(response.schedule)
      ) {
        const scheduleObj = response.schedule as Record<string, ScheduleSlot[]>;
        for (const [dayKey, slots] of Object.entries(scheduleObj)) {
          const dayOfWeek = dayKey as DayOfWeek;
          if (weeklySchedule[dayOfWeek] !== undefined && Array.isArray(slots)) {
            weeklySchedule[dayOfWeek] = slots.map(slot =>
              convertScheduleSlot(slot, dayOfWeek),
            );
          }
        }
      }

      setSchedule(weeklySchedule);
    } catch (err) {
      console.error('❌ Failed to load schedule:', err);
      const apiError = err as ScheduleError;
      setError({
        message: apiError.message || 'حدث خطأ أثناء تحميل الجدول',
        statusCode: apiError.statusCode,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const convertScheduleSlot = (
    slot: ScheduleSlot,
    dayOfWeek: DayOfWeek,
  ): ScheduleSession => {
    return {
      id: slot.id,
      contentId: slot.content?.id || 0,
      classroomId: currentClassroomId || 0,
      distributionRoomId: slot.distributionRoom?.id || null,
      dayOfWeek,
      startTime: slot.startTime || '00:00',
      endTime: slot.endTime || '00:00',
      type: slot.type || SessionType.THEORY,
      location: slot.location || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: {
        id: slot.content?.id || 0,
        code: slot.content?.code || '',
        name: slot.content?.name || 'مادة غير محددة',
        instructor: {
          id: slot.content?.instructor?.id || 0,
          name: slot.content?.instructor?.name || 'غير محدد',
        },
      },
      classroom: {
        id: currentClassroomId || 0,
        name: myScheduleData?.classroom?.name || '',
      },
      distributionRoom: slot.distributionRoom || null,
      _count: {sessions: 0},
    };
  };

  const handleSessionPress = (session: ScheduleSession) => {
    // Check cancellation from original slot
    const originalSlot = findOriginalSlot(session.id);
    if (originalSlot?.isCancelledThisWeek) {
      const reason =
        originalSlot.cancellationReason || 'لم يتم تحديد سبب الإلغاء';
      console.log(
        `❌ Session cancelled: ${session.content?.name} - ${reason}`,
      );
    }
    setSelectedSlotId(session.id);
    setShowSlotDetails(true);
  };

  const findOriginalSlot = (
    slotId: number,
  ): ScheduleSlot | undefined => {
    if (!myScheduleData?.schedule) return undefined;
    const scheduleObj = myScheduleData.schedule as Record<
      string,
      ScheduleSlot[]
    >;
    for (const slots of Object.values(scheduleObj)) {
      if (Array.isArray(slots)) {
        const found = slots.find(s => s.id === slotId);
        if (found) return found;
      }
    }
    return undefined;
  };

  const getOriginalSlotsForDay = (day: DayOfWeek): ScheduleSlot[] => {
    if (!myScheduleData?.schedule) return [];
    const scheduleObj = myScheduleData.schedule as Record<
      string,
      ScheduleSlot[]
    >;
    return scheduleObj[day] || [];
  };

  const handleDebugTest = async () => {
    if (myScheduleData) {
      const debugResult = await ScheduleDebugger.runFullTest(accessToken);
      console.log('Debug Result:', debugResult);
    }
  };

  const handleViewModeChange = (mode: 'weekly' | 'daily') => {
    setViewMode(mode);
  };

  const getDayOfWeekText = (day: DayOfWeek): string => {
    const dayNames: Record<DayOfWeek, string> = {
      [DayOfWeek.SATURDAY]: 'السبت',
      [DayOfWeek.SUNDAY]: 'الأحد',
      [DayOfWeek.MONDAY]: 'الاثنين',
      [DayOfWeek.TUESDAY]: 'الثلاثاء',
      [DayOfWeek.WEDNESDAY]: 'الأربعاء',
      [DayOfWeek.THURSDAY]: 'الخميس',
      [DayOfWeek.FRIDAY]: 'الجمعة',
    };
    return dayNames[day] || day;
  };

  const getTotalSessions = (): number => {
    if (!schedule) return 0;
    return Object.values(schedule).reduce(
      (total, sessions) => total + sessions.length,
      0,
    );
  };

  // Loading
  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={s.loadingText}>جاري تحميل الجدول...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error
  if (error) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerBox}>
          <Text style={s.errorIcon}>⚠️</Text>
          <Text style={s.errorTitle}>خطأ في تحميل الجدول</Text>
          <Text style={s.errorMsg}>{error.message}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadSchedule}>
            <Text style={s.retryBtnText}>إعادة المحاولة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.backLink} onPress={onBack}>
            <Text style={s.backLinkText}>العودة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // No data
  if (!schedule) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerBox}>
          <Text style={s.emptyIcon}>📅</Text>
          <Text style={s.emptyTitle}>لا يوجد جدول</Text>
          <Text style={s.emptyMsg}>لم يتم العثور على جدول دراسي</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadSchedule}>
            <Text style={s.retryBtnText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeDays = Object.entries(schedule).filter(
    ([_, sessions]) => sessions.length > 0,
  ).length;

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
            <Text style={s.headerTitle}>الجدول الدراسي</Text>
            <Text style={s.headerSub}>جدول المحاضرات الأسبوعي</Text>
          </View>
          <View style={s.headerActions}>
            {__DEV__ && (
              <TouchableOpacity style={s.debugBtn} onPress={handleDebugTest}>
                <Text style={s.debugBtnText}>🐛</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.refreshBtn} onPress={loadSchedule}>
              <Text style={s.refreshBtnText}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Card */}
        <View style={s.statsCard}>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{getTotalSessions()}</Text>
              <Text style={s.statLabel}>محاضرة</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>{activeDays}</Text>
              <Text style={s.statLabel}>أيام نشطة</Text>
            </View>
            {currentClassroomId && (
              <>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statValue}>{currentClassroomId}</Text>
                  <Text style={s.statLabel}>رقم الفصل</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* View Mode Toggle */}
        <View style={s.toggleRow}>
          <TouchableOpacity
            style={[s.toggleBtn, viewMode === 'weekly' && s.toggleBtnActive]}
            onPress={() => handleViewModeChange('weekly')}>
            <Text
              style={[
                s.toggleBtnText,
                viewMode === 'weekly' && s.toggleBtnTextActive,
              ]}>
              أسبوعي
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, viewMode === 'daily' && s.toggleBtnActive]}
            onPress={() => handleViewModeChange('daily')}>
            <Text
              style={[
                s.toggleBtnText,
                viewMode === 'daily' && s.toggleBtnTextActive,
              ]}>
              يومي
            </Text>
          </TouchableOpacity>
        </View>

        {/* Schedule View */}
        {viewMode === 'weekly' ? (
          <WeeklyScheduleView
            schedule={schedule}
            onSessionPress={handleSessionPress}
          />
        ) : (
          <View>
            {/* Day Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.daySelector}
              contentContainerStyle={s.daySelectorContent}>
              {Object.values(DayOfWeek).map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    s.dayChip,
                    selectedDay === day && s.dayChipActive,
                  ]}
                  onPress={() => setSelectedDay(day)}>
                  <Text
                    style={[
                      s.dayChipText,
                      selectedDay === day && s.dayChipTextActive,
                    ]}>
                    {getDayOfWeekText(day)}
                  </Text>
                  {schedule[day] && schedule[day].length > 0 && (
                    <View
                      style={[
                        s.dayBadge,
                        selectedDay === day && s.dayBadgeActive,
                      ]}>
                      <Text
                        style={[
                          s.dayBadgeText,
                          selectedDay === day && s.dayBadgeTextActive,
                        ]}>
                        {schedule[day].length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <DailySchedule
              day={selectedDay}
              sessions={schedule[selectedDay] || []}
              onSessionPress={handleSessionPress}
              originalSlots={getOriginalSlotsForDay(selectedDay)}
            />
          </View>
        )}
      </ScrollView>

      {/* Slot Details Overlay */}
      {showSlotDetails && selectedSlotId && (
        <ScheduleSlotDetails
          slotId={selectedSlotId}
          accessToken={accessToken}
          onBack={() => {
            setShowSlotDetails(false);
            setSelectedSlotId(undefined);
          }}
        />
      )}
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
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1D26',
    marginBottom: 8,
    textAlign: 'center',
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
    marginBottom: 12,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backLink: {
    paddingVertical: 8,
  },
  backLinkText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1D26',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMsg: {
    fontSize: 15,
    color: '#8E95A2',
    textAlign: 'center',
    marginBottom: 24,
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  debugBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugBtnText: {
    fontSize: 18,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnText: {
    fontSize: 18,
  },

  /* Stats */
  statsCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#8E95A2',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#EEF2F6',
  },

  /* Toggle */
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#EEF2F6',
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: '#2563EB',
  },
  toggleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E95A2',
  },
  toggleBtnTextActive: {
    color: '#FFF',
  },

  /* Day Selector */
  daySelector: {
    marginTop: 16,
  },
  daySelectorContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EEF2F6',
    gap: 6,
  },
  dayChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1D26',
  },
  dayChipTextActive: {
    color: '#FFF',
  },
  dayBadge: {
    backgroundColor: '#EEF2F6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  dayBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  dayBadgeTextActive: {
    color: '#FFF',
  },
});

export default ScheduleScreen;
