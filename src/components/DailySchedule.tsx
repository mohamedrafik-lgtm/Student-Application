// SOLID Principles Applied:
// 1. Single Responsibility: This component only handles displaying daily schedule
// 2. Open/Closed: Can be extended with new features without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for different concerns
// 4. Dependency Inversion: Depends on abstractions (components) not concretions

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { ScheduleSession, DayOfWeek } from '../types/auth';
import { Colors } from '../styles/colors';
import ScheduleSessionItem from './ScheduleSessionItem';

const { width } = Dimensions.get('window');

interface DailyScheduleProps {
  day: DayOfWeek;
  sessions: ScheduleSession[];
  onSessionPress?: (session: ScheduleSession) => void;
  compact?: boolean;
}

const DailySchedule: React.FC<DailyScheduleProps> = ({
  day,
  sessions,
  onSessionPress,
  compact = false,
}) => {
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

  const isToday = (day: DayOfWeek): boolean => {
    const today = new Date().getDay();
    const dayMap: { [key: number]: DayOfWeek } = {
      0: 'SUNDAY',
      1: 'MONDAY',
      2: 'TUESDAY',
      3: 'WEDNESDAY',
      4: 'THURSDAY',
      5: 'FRIDAY',
      6: 'SATURDAY',
    };
    return dayMap[today] === day;
  };

  const sortedSessions = [...sessions].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });

  const totalHours = sessions.reduce((total, session) => {
    const start = new Date(`2000-01-01T${session.startTime}`);
    const end = new Date(`2000-01-01T${session.endTime}`);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return total + duration;
  }, 0);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={[
          styles.compactHeader,
          isToday(day) && styles.compactHeaderToday
        ]}>
          <Text style={styles.compactDayEmoji}>
            {getDayOfWeekEmoji(day)}
          </Text>
          <Text style={[
            styles.compactDayText,
            isToday(day) && styles.compactDayTextToday
          ]}>
            {getDayOfWeekText(day)}
          </Text>
          <Text style={styles.compactSessionsCount}>
            {sessions.length} جلسة
          </Text>
        </View>
        
        {sortedSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>لا توجد جلسات</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.compactSessionsContainer}
          >
            {sortedSessions.map((session) => (
              <ScheduleSessionItem
                key={session.id}
                session={session}
                onPress={onSessionPress}
                compact={true}
              />
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Day Header */}
      <View style={[
        styles.dayHeader,
        isToday(day) && styles.dayHeaderToday
      ]}>
        <View style={styles.dayInfo}>
          <Text style={styles.dayEmoji}>
            {getDayOfWeekEmoji(day)}
          </Text>
          <View style={styles.dayTextContainer}>
            <Text style={[
              styles.dayText,
              isToday(day) && styles.dayTextToday
            ]}>
              {getDayOfWeekText(day)}
            </Text>
            {isToday(day) && (
              <Text style={styles.todayLabel}>اليوم</Text>
            )}
          </View>
        </View>
        
        <View style={styles.dayStats}>
          <Text style={styles.sessionsCount}>
            {sessions.length} جلسة
          </Text>
          <Text style={styles.totalHours}>
            {totalHours.toFixed(1)} ساعة
          </Text>
        </View>
      </View>

      {/* Sessions List */}
      {sortedSessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>📚</Text>
          <Text style={styles.emptyStateTitle}>لا توجد جلسات</Text>
          <Text style={styles.emptyStateMessage}>
            لا توجد جلسات دراسية مجدولة لهذا اليوم
          </Text>
        </View>
      ) : (
        <View style={styles.sessionsContainer}>
          {sortedSessions.map((session) => (
            <ScheduleSessionItem
              key={session.id}
              session={session}
              onPress={onSessionPress}
              compact={false}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.1)',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dayHeaderToday: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderBottomColor: 'rgba(16, 185, 129, 0.2)',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.1)',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  compactHeaderToday: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderBottomColor: 'rgba(16, 185, 129, 0.2)',
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  compactDayEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  dayTextContainer: {
    flex: 1,
  },
  dayText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  dayTextToday: {
    color: Colors.success,
  },
  compactDayText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  compactDayTextToday: {
    color: Colors.success,
  },
  todayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  dayStats: {
    alignItems: 'flex-end',
  },
  sessionsCount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  compactSessionsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  totalHours: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sessionsContainer: {
    padding: 20,
  },
  compactSessionsContainer: {
    padding: 16,
    gap: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default DailySchedule;

