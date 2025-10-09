// SOLID Principles Applied:
// 1. Single Responsibility: This component only handles displaying weekly schedule
// 2. Open/Closed: Can be extended with new features without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for different concerns
// 4. Dependency Inversion: Depends on abstractions (components) not concretions

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { WeeklySchedule, ScheduleSession, DayOfWeek, ScheduleSlot } from '../types/auth';
import { Colors } from '../styles/colors';
import DailySchedule from './DailySchedule';

const { width } = Dimensions.get('window');

interface WeeklyScheduleViewProps {
  schedule: WeeklySchedule;
  onSessionPress?: (session: ScheduleSession) => void;
  compact?: boolean;
  originalSlots?: { [key in DayOfWeek]: ScheduleSlot[] }; // البيانات الأصلية لإضافة معلومات الإلغاء
}

const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = ({
  schedule,
  onSessionPress,
  compact = false,
  originalSlots,
}) => {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);

  const days: DayOfWeek[] = [
    'SUNDAY',
    'MONDAY', 
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY'
  ];

  const getDayOfWeekText = (day: DayOfWeek): string => {
    switch (day) {
      case 'SUNDAY':
        return 'الأحد';
      case 'MONDAY':
        return 'الاثنين';
      case 'TUESDAY':
        return 'الثلاثاء';
      case 'WEDNESDAY':
        return 'الأربعاء';
      case 'THURSDAY':
        return 'الخميس';
      case 'FRIDAY':
        return 'الجمعة';
      case 'SATURDAY':
        return 'السبت';
      default:
        return day;
    }
  };

  const getDayOfWeekEmoji = (day: DayOfWeek): string => {
    switch (day) {
      case 'SUNDAY':
        return '☀️';
      case 'MONDAY':
        return '🌅';
      case 'TUESDAY':
        return '🌞';
      case 'WEDNESDAY':
        return '☀️';
      case 'THURSDAY':
        return '🌤️';
      case 'FRIDAY':
        return '🕌';
      case 'SATURDAY':
        return '🌙';
      default:
        return '📅';
    }
  };

  const getTotalSessions = (): number => {
    return Object.values(schedule).reduce((total, daySessions) => {
      return total + daySessions.length;
    }, 0);
  };

  const getTotalHours = (): number => {
    return Object.values(schedule).reduce((total, daySessions) => {
      return daySessions.reduce((dayTotal, session) => {
        const start = new Date(`2000-01-01T${session.startTime}`);
        const end = new Date(`2000-01-01T${session.endTime}`);
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return dayTotal + duration;
      }, 0) + total;
    }, 0);
  };

  const getDaysWithSessions = (): DayOfWeek[] => {
    return days.filter(day => schedule[day].length > 0);
  };

  const handleDayPress = (day: DayOfWeek) => {
    if (selectedDay === day) {
      setSelectedDay(null);
    } else {
      setSelectedDay(day);
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {/* Week Summary */}
        <View style={styles.compactSummary}>
          <Text style={styles.compactSummaryTitle}>الجدول الأسبوعي</Text>
          <Text style={styles.compactSummaryStats}>
            {getTotalSessions()} جلسة • {getTotalHours().toFixed(1)} ساعة
          </Text>
        </View>

        {/* Days Navigation */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.compactDaysContainer}
        >
          {days.map((day) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.compactDayChip,
                schedule[day].length > 0 && styles.compactDayChipActive,
                selectedDay === day && styles.compactDayChipSelected
              ]}
              onPress={() => handleDayPress(day)}
            >
              <Text style={styles.compactDayEmoji}>
                {getDayOfWeekEmoji(day)}
              </Text>
              <Text style={[
                styles.compactDayText,
                schedule[day].length > 0 && styles.compactDayTextActive,
                selectedDay === day && styles.compactDayTextSelected
              ]}>
                {getDayOfWeekText(day)}
              </Text>
              <Text style={[
                styles.compactDayCount,
                schedule[day].length > 0 && styles.compactDayCountActive
              ]}>
                {schedule[day].length}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Selected Day Sessions */}
        {selectedDay && (
          <View style={styles.compactSelectedDay}>
            <DailySchedule
              day={selectedDay}
              sessions={schedule[selectedDay]}
              onSessionPress={onSessionPress}
              compact={true}
              originalSlots={originalSlots?.[selectedDay] || []}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Week Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>الجدول الأسبوعي</Text>
          <Text style={styles.summarySubtitle}>
            {getDaysWithSessions().length} من 7 أيام نشطة
          </Text>
        </View>
        
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getTotalSessions()}</Text>
            <Text style={styles.statLabel}>إجمالي الجلسات</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getTotalHours().toFixed(1)}</Text>
            <Text style={styles.statLabel}>إجمالي الساعات</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {(getTotalHours() / 7).toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>متوسط يومي</Text>
          </View>
        </View>
      </View>

      {/* Days List */}
      <View style={styles.daysContainer}>
        {days.map((day) => (
          <DailySchedule
            key={day}
            day={day}
            sessions={schedule[day]}
            onSessionPress={onSessionPress}
            compact={false}
            originalSlots={originalSlots?.[day] || []}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  compactContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  summarySubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
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
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    marginHorizontal: 16,
  },
  compactSummary: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.1)',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  compactSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  compactSummaryStats: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  daysContainer: {
    flex: 1,
  },
  compactDaysContainer: {
    padding: 16,
    gap: 12,
  },
  compactDayChip: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
    minWidth: 80,
  },
  compactDayChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  compactDayChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  compactDayEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  compactDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  compactDayTextActive: {
    color: Colors.primary,
  },
  compactDayTextSelected: {
    color: Colors.white,
  },
  compactDayCount: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textLight,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  compactDayCountActive: {
    color: Colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  compactSelectedDay: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

export default WeeklyScheduleView;

