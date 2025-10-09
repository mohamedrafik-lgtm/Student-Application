// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles schedule display and management
// 2. Open/Closed: Can be extended with new features without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for different concerns
// 4. Dependency Inversion: Depends on abstractions (components) not concretions

import React, { useState, useEffect, useRef } from 'react';
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
import { AuthService, authService } from '../services/authService';
import { API_CONFIG } from '../services/apiConfig';
import { ScheduleDebugger } from '../utils/scheduleDebugger';
import { 
  WeeklySchedule, 
  ScheduleSession, 
  ScheduleError,
  DayOfWeek,
  MyScheduleResponse,
  ScheduleSlot
} from '../types/auth';
import { Colors } from '../styles/colors';
import CustomButton from '../components/CustomButton';
import WeeklyScheduleView from '../components/WeeklyScheduleView';
import DailySchedule from '../components/DailySchedule';
import ScheduleSlotDetails from '../components/ScheduleSlotDetails';

const { width, height } = Dimensions.get('window');

interface ScheduleScreenProps {
  accessToken: string;
  classroomId?: number; // يمكن تمرير معرف الفصل أو الحصول عليه من البروفايل
  onBack: () => void;
}

const ScheduleScreen: React.FC<ScheduleScreenProps> = ({ 
  accessToken, 
  classroomId,
  onBack 
}) => {
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null);
  const [myScheduleData, setMyScheduleData] = useState<MyScheduleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [currentClassroomId, setCurrentClassroomId] = useState<number | null>(classroomId || null);
  const [showSlotDetails, setShowSlotDetails] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    loadSchedule();
  }, []);

  useEffect(() => {
    if (schedule) {
      console.log('🎬 Schedule state updated:', {
        hasSchedule: !!schedule,
        scheduleKeys: Object.keys(schedule),
        totalSessions: Object.values(schedule).reduce((total, daySessions) => total + daySessions.length, 0)
      });
      
      // Start entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [schedule]);

  const loadSchedule = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Loading my schedule...');
      console.log('🌐 API URL:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MY_SCHEDULE}`);
      console.log('🔑 Access Token:', accessToken ? 'Present' : 'Missing');
      
      const scheduleData = await authService.getMySchedule(accessToken);
      
      console.log('✅ My schedule loaded successfully!');
      console.log('📊 Raw Schedule Data:', JSON.stringify(scheduleData, null, 2));
      console.log('📊 Schedule structure:', {
        success: scheduleData.success,
        classroom: scheduleData.classroom,
        scheduleKeys: Object.keys(scheduleData.schedule),
        scheduleLengths: Object.keys(scheduleData.schedule).map(day => ({
          day,
          length: scheduleData.schedule[day as keyof typeof scheduleData.schedule].length
        }))
      });
      
      // حفظ البيانات الأصلية
      setMyScheduleData(scheduleData);
      
      // التحقق من وجود بيانات
      const totalSlots = Object.values(scheduleData.schedule).reduce((total, daySlots) => total + daySlots.length, 0);
      console.log('📈 Total slots in API response:', totalSlots);
      
      if (totalSlots === 0) {
        console.warn('⚠️ No schedule slots found in API response!');
        setError('لا توجد جلسات دراسية مجدولة');
        return;
      }
      
      // تحويل البيانات مع التحقق من كل يوم
      const convertedSchedule: WeeklySchedule = {
        SUNDAY: (scheduleData.schedule.SUNDAY || []).map((slot: ScheduleSlot) => {
          console.log('🔄 Converting SUNDAY slot:', slot.id, slot.content?.name);
          return convertScheduleSlot(slot, DayOfWeek.SUNDAY);
        }),
        MONDAY: (scheduleData.schedule.MONDAY || []).map((slot: ScheduleSlot) => {
          console.log('🔄 Converting MONDAY slot:', slot.id, slot.content?.name);
          return convertScheduleSlot(slot, DayOfWeek.MONDAY);
        }),
        TUESDAY: (scheduleData.schedule.TUESDAY || []).map((slot: ScheduleSlot) => {
          console.log('🔄 Converting TUESDAY slot:', slot.id, slot.content?.name);
          return convertScheduleSlot(slot, DayOfWeek.TUESDAY);
        }),
        WEDNESDAY: (scheduleData.schedule.WEDNESDAY || []).map((slot: ScheduleSlot) => {
          console.log('🔄 Converting WEDNESDAY slot:', slot.id, slot.content?.name);
          return convertScheduleSlot(slot, DayOfWeek.WEDNESDAY);
        }),
        THURSDAY: (scheduleData.schedule.THURSDAY || []).map((slot: ScheduleSlot) => {
          console.log('🔄 Converting THURSDAY slot:', slot.id, slot.content?.name);
          return convertScheduleSlot(slot, DayOfWeek.THURSDAY);
        }),
        FRIDAY: (scheduleData.schedule.FRIDAY || []).map((slot: ScheduleSlot) => {
          console.log('🔄 Converting FRIDAY slot:', slot.id, slot.content?.name);
          return convertScheduleSlot(slot, DayOfWeek.FRIDAY);
        }),
        SATURDAY: (scheduleData.schedule.SATURDAY || []).map((slot: ScheduleSlot) => {
          console.log('🔄 Converting SATURDAY slot:', slot.id, slot.content?.name);
          return convertScheduleSlot(slot, DayOfWeek.SATURDAY);
        }),
      };
      
      const convertedTotal = Object.values(convertedSchedule).reduce((total, daySessions) => total + daySessions.length, 0);
      
      console.log('🔄 Converted schedule summary:', {
        totalDays: Object.keys(convertedSchedule).length,
        totalSessions: convertedTotal,
        dayBreakdown: Object.keys(convertedSchedule).map(day => ({
          day,
          sessions: convertedSchedule[day as keyof WeeklySchedule].length,
          firstSession: convertedSchedule[day as keyof WeeklySchedule][0]?.content?.name || 'N/A'
        }))
      });
      
      if (convertedTotal === 0) {
        console.warn('⚠️ No sessions after conversion!');
      }
      
      console.log('💾 Setting schedule state with', convertedTotal, 'sessions');
      setSchedule(convertedSchedule);
      setCurrentClassroomId(scheduleData.classroom.id);
      
    } catch (error) {
      console.error('❌ Failed to load schedule:', error);
      const apiError = error as ScheduleError;
      
      let errorMessage = 'حدث خطأ أثناء تحميل الجدول الدراسي';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      } else if (apiError.statusCode === 404) {
        errorMessage = 'لم يتم العثور على جدول دراسي';
      } else if (apiError.statusCode === 0) {
        errorMessage = apiError.message;
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // دالة لتحويل ScheduleSlot إلى ScheduleSession للتوافق مع الكود الموجود
  const convertScheduleSlot = (slot: ScheduleSlot, dayOfWeek: DayOfWeek): ScheduleSession => {
    console.log('🔧 Converting slot:', {
      id: slot.id,
      day: dayOfWeek,
      contentName: slot.content?.name,
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: slot.type,
      hasContent: !!slot.content,
      hasInstructor: !!slot.content?.instructor
    });
    
    const converted: ScheduleSession = {
      id: slot.id,
      contentId: slot.content.id,
      classroomId: myScheduleData?.classroom.id || 0,
      distributionRoomId: slot.distributionRoom?.id || null,
      dayOfWeek: dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: slot.type,
      location: slot.location,
      createdAt: new Date(),
      updatedAt: new Date(),
      content: {
        id: slot.content.id,
        code: slot.content.code,
        name: slot.content.name,
        instructor: {
          id: slot.content.instructor.id,
          name: slot.content.instructor.name,
        },
      },
      classroom: {
        id: myScheduleData?.classroom.id || 0,
        name: myScheduleData?.classroom.name || '',
      },
      distributionRoom: slot.distributionRoom ? {
        id: slot.distributionRoom.id,
        roomName: slot.distributionRoom.roomName,
        roomNumber: slot.distributionRoom.roomNumber,
      } : null,
      _count: {
        sessions: 1,
      },
    };
    
    console.log('✅ Converted session:', {
      id: converted.id,
      contentName: converted.content.name,
      instructorName: converted.content.instructor.name,
      time: `${converted.startTime} - ${converted.endTime}`
    });
    
    return converted;
  };

  const handleSessionPress = (session: ScheduleSession) => {
    // البحث عن البيانات الأصلية من myScheduleData لإضافة معلومات الإلغاء
    const originalSlot = findOriginalSlot(session.id);
    
    if (originalSlot && originalSlot.isCancelledThisWeek) {
      Alert.alert(
        'محاضرة ملغية',
        `هذه المحاضرة ملغية هذا الأسبوع${originalSlot.cancellationReason ? `\nالسبب: ${originalSlot.cancellationReason}` : ''}`,
        [{ text: 'موافق' }]
      );
      return;
    }
    
    setSelectedSlotId(session.id);
    setShowSlotDetails(true);
  };

  // دالة للبحث عن البيانات الأصلية للفترة الدراسية
  const findOriginalSlot = (slotId: number): ScheduleSlot | null => {
    if (!myScheduleData) return null;
    
    const allSlots = [
      ...myScheduleData.schedule.SUNDAY,
      ...myScheduleData.schedule.MONDAY,
      ...myScheduleData.schedule.TUESDAY,
      ...myScheduleData.schedule.WEDNESDAY,
      ...myScheduleData.schedule.THURSDAY,
      ...myScheduleData.schedule.FRIDAY,
      ...myScheduleData.schedule.SATURDAY,
    ];
    
    return allSlots.find(slot => slot.id === slotId) || null;
  };

  // دالة للحصول على البيانات الأصلية ليوم معين
  const getOriginalSlotsForDay = (day: DayOfWeek): ScheduleSlot[] => {
    if (!myScheduleData) return [];
    
    switch (day) {
      case DayOfWeek.SUNDAY:
        return myScheduleData.schedule.SUNDAY;
      case DayOfWeek.MONDAY:
        return myScheduleData.schedule.MONDAY;
      case DayOfWeek.TUESDAY:
        return myScheduleData.schedule.TUESDAY;
      case DayOfWeek.WEDNESDAY:
        return myScheduleData.schedule.WEDNESDAY;
      case DayOfWeek.THURSDAY:
        return myScheduleData.schedule.THURSDAY;
      case DayOfWeek.FRIDAY:
        return myScheduleData.schedule.FRIDAY;
      case DayOfWeek.SATURDAY:
        return myScheduleData.schedule.SATURDAY;
      default:
        return [];
    }
  };

  const handleBackFromSlotDetails = () => {
    setShowSlotDetails(false);
    setSelectedSlotId(null);
  };

  const handleRefresh = () => {
    loadSchedule();
  };

  const handleDebugTest = async () => {
    try {
      Alert.alert('اختبار النظام', 'جاري تشغيل اختبار شامل للنظام...');
      
      const testResult = await ScheduleDebugger.runFullTest(accessToken);
      
      Alert.alert(
        'نتائج الاختبار',
        `${testResult.summary}\n\n` +
        `الاتصال: ${testResult.connection.success ? '✅ نجح' : '❌ فشل'}\n` +
        `الجدول: ${testResult.schedule?.success ? '✅ نجح' : '❌ فشل'}\n\n` +
        `تفاصيل:\n${JSON.stringify(testResult, null, 2)}`,
        [
          { text: 'موافق', style: 'default' },
          { text: 'إعادة المحاولة', onPress: handleRefresh }
        ]
      );
    } catch (error) {
      console.error('❌ Debug test failed:', error);
      Alert.alert('خطأ في الاختبار', 'فشل في تشغيل اختبار النظام');
    }
  };

  const handleViewModeChange = (mode: 'weekly' | 'daily') => {
    setViewMode(mode);
    if (mode === 'daily' && !selectedDay) {
      // تحديد اليوم الحالي كافتراضي
      const today = new Date().getDay();
      const dayMap: { [key: number]: DayOfWeek } = {
        0: DayOfWeek.SUNDAY,
        1: DayOfWeek.MONDAY,
        2: DayOfWeek.TUESDAY,
        3: DayOfWeek.WEDNESDAY,
        4: DayOfWeek.THURSDAY,
        5: DayOfWeek.FRIDAY,
        6: DayOfWeek.SATURDAY,
      };
      setSelectedDay(dayMap[today]);
    }
  };

  const getDayOfWeekText = (day: DayOfWeek): string => {
    switch (day) {
      case DayOfWeek.SUNDAY:
        return 'الأحد';
      case DayOfWeek.MONDAY:
        return 'الاثنين';
      case DayOfWeek.TUESDAY:
        return 'الثلاثاء';
      case DayOfWeek.WEDNESDAY:
        return 'الأربعاء';
      case DayOfWeek.THURSDAY:
        return 'الخميس';
      case DayOfWeek.FRIDAY:
        return 'الجمعة';
      case DayOfWeek.SATURDAY:
        return 'السبت';
      default:
        return day;
    }
  };

  const getTotalSessions = (): number => {
    if (!schedule) return 0;
    return Object.values(schedule).reduce((total, daySessions) => {
      return total + daySessions.length;
    }, 0);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>جاري تحميل الجدول الدراسي...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>خطأ في تحميل الجدول</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <CustomButton
            title="إعادة المحاولة"
            onPress={handleRefresh}
            variant="primary"
            size="large"
          />
          <CustomButton
            title="العودة"
            onPress={onBack}
            variant="outline"
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!schedule) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>لا توجد بيانات</Text>
          <Text style={styles.errorMessage}>لم يتم العثور على جدول دراسي</Text>
          <CustomButton
            title="إعادة المحاولة"
            onPress={loadSchedule}
            variant="primary"
            size="large"
          />
          <CustomButton
            title="العودة"
            onPress={onBack}
            variant="outline"
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }

  // التحقق من وجود جلسات في الجدول
  const totalSessionsInSchedule = schedule ? Object.values(schedule).reduce((total, daySessions) => total + daySessions.length, 0) : 0;
  console.log('📊 Total sessions in schedule state:', totalSessionsInSchedule);
  
  if (totalSessionsInSchedule === 0 && !isLoading && !error) {
    console.warn('⚠️ Schedule is set but has no sessions!');
  }

  // إذا كان المستخدم يريد عرض تفاصيل فترة معينة
  if (showSlotDetails && selectedSlotId) {
    return (
      <ScheduleSlotDetails
        slotId={selectedSlotId}
        accessToken={accessToken}
        onBack={handleBackFromSlotDetails}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Background with Gradient */}
      <View style={styles.backgroundContainer}>
        <View style={styles.gradientOverlay} />
        <View style={styles.decorativeCircles}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Header Section */}
        <Animated.View style={[
          styles.headerSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <View style={styles.backButtonIcon}>
                <Text style={styles.backButtonText}>←</Text>
              </View>
              <Text style={styles.backButtonLabel}>العودة</Text>
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>
                الجدول الدراسي {myScheduleData?.classroom.name ? `- ${myScheduleData.classroom.name}` : ''}
              </Text>
              <View style={styles.headerUnderline} />
            </View>
            
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.debugButton} onPress={handleDebugTest}>
                <View style={styles.debugButtonIcon}>
                  <Text style={styles.debugButtonText}>🔍</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                <View style={styles.refreshButtonIcon}>
                  <Text style={styles.refreshButtonText}>🔄</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Schedule Stats */}
          <View style={styles.statsCard}>
            <View style={styles.statsContent}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{getTotalSessions()}</Text>
                <Text style={styles.statLabel}>إجمالي الجلسات</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {Object.values(schedule).filter(day => day.length > 0).length}
                </Text>
                <Text style={styles.statLabel}>أيام نشطة</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {currentClassroomId || 'غير محدد'}
                </Text>
                <Text style={styles.statLabel}>معرف الفصل</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* View Mode Toggle */}
        <Animated.View style={[
          styles.viewModeSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.viewModeToggle}>
            <TouchableOpacity
              style={[
                styles.viewModeButton,
                viewMode === 'weekly' && styles.viewModeButtonActive
              ]}
              onPress={() => handleViewModeChange('weekly')}
            >
              <Text style={[
                styles.viewModeButtonText,
                viewMode === 'weekly' && styles.viewModeButtonTextActive
              ]}>
                📅 أسبوعي
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.viewModeButton,
                viewMode === 'daily' && styles.viewModeButtonActive
              ]}
              onPress={() => handleViewModeChange('daily')}
            >
              <Text style={[
                styles.viewModeButtonText,
                viewMode === 'daily' && styles.viewModeButtonTextActive
              ]}>
                📋 يومي
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Schedule Content */}
        <Animated.View style={[
          styles.scheduleSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          {viewMode === 'weekly' ? (
            <WeeklyScheduleView
              schedule={schedule}
              onSessionPress={handleSessionPress}
              compact={false}
              originalSlots={myScheduleData?.schedule}
            />
          ) : (
            <View style={styles.dailyViewContainer}>
              {/* Day Selector */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.daySelector}
              >
                {Object.keys(schedule).map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      selectedDay === day && styles.dayButtonActive
                    ]}
                    onPress={() => setSelectedDay(day as DayOfWeek)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      selectedDay === day && styles.dayButtonTextActive
                    ]}>
                      {getDayOfWeekText(day as DayOfWeek)}
                    </Text>
                    <Text style={[
                      styles.dayButtonCount,
                      selectedDay === day && styles.dayButtonCountActive
                    ]}>
                      {schedule[day as DayOfWeek].length}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Selected Day Schedule */}
              {selectedDay && (
                <DailySchedule
                  day={selectedDay}
                  sessions={schedule[selectedDay]}
                  onSessionPress={handleSessionPress}
                  compact={false}
                  originalSlots={getOriginalSlotsForDay(selectedDay)}
                />
              )}
            </View>
          )}
        </Animated.View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.backgroundDark,
  },
  decorativeCircles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -75,
  },
  circle3: {
    width: 100,
    height: 100,
    top: '30%',
    right: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textLight,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  headerSection: {
    marginBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButtonIcon: {
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 18,
    color: Colors.white,
    fontWeight: '700',
  },
  backButtonLabel: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerUnderline: {
    width: 60,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginTop: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  debugButton: {
    backgroundColor: Colors.info,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: Colors.info,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  debugButtonIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugButtonText: {
    fontSize: 16,
  },
  refreshButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  refreshButtonIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    fontSize: 16,
  },
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  viewModeSection: {
    marginBottom: 32,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  viewModeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  viewModeButtonTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  scheduleSection: {
    flex: 1,
  },
  dailyViewContainer: {
    flex: 1,
  },
  daySelector: {
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  dayButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 80,
  },
  dayButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 4,
  },
  dayButtonTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  dayButtonCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textLight,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dayButtonCountActive: {
    color: Colors.white,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default ScheduleScreen;

