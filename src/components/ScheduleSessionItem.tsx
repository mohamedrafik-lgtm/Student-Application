// SOLID Principles Applied:
// 1. Single Responsibility: This component only handles displaying a single schedule session
// 2. Open/Closed: Can be extended with new features without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for different concerns
// 4. Dependency Inversion: Depends on abstractions (props) not concretions

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ScheduleSession, SessionType, DayOfWeek, ScheduleSlot } from '../types/auth';
import { Colors } from '../styles/colors';

interface ScheduleSessionItemProps {
  session: ScheduleSession;
  onPress?: (session: ScheduleSession) => void;
  compact?: boolean;
  originalSlot?: ScheduleSlot; // البيانات الأصلية لإضافة معلومات الإلغاء
}

const ScheduleSessionItem: React.FC<ScheduleSessionItemProps> = ({
  session,
  onPress,
  compact = false,
  originalSlot,
}) => {
  const getSessionTypeColor = (type: SessionType): string => {
    switch (type) {
      case 'THEORY':
        return Colors.primary;
      case 'PRACTICAL':
        return Colors.accent;
      default:
        return Colors.textSecondary;
    }
  };

  const getSessionTypeIcon = (type: SessionType): string => {
    switch (type) {
      case 'THEORY':
        return '📚';
      case 'PRACTICAL':
        return '🔬';
      default:
        return '📖';
    }
  };

  const getSessionTypeText = (type: SessionType): string => {
    switch (type) {
      case 'THEORY':
        return 'نظري';
      case 'PRACTICAL':
        return 'عملي';
      default:
        return type;
    }
  };

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

  const formatTime = (time: string): string => {
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const minute = parseInt(minutes);
      
      if (hour === 0) {
        return `12:${minutes} ص`;
      } else if (hour < 12) {
        return `${hour}:${minutes} ص`;
      } else if (hour === 12) {
        return `12:${minutes} م`;
      } else {
        return `${hour - 12}:${minutes} م`;
      }
    } catch {
      return time;
    }
  };

  const getLocationText = (): string => {
    if (session.distributionRoom) {
      return `${session.distributionRoom.roomName} - ${session.distributionRoom.roomNumber}`;
    } else if (session.location) {
      return session.location;
    } else {
      return 'غير محدد';
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress(session);
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactContainer,
          { borderLeftColor: getSessionTypeColor(session.type) }
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.compactHeader}>
          <Text style={styles.compactTime}>
            {formatTime(session.startTime)} - {formatTime(session.endTime)}
          </Text>
          <View style={[
            styles.compactTypeBadge,
            { backgroundColor: getSessionTypeColor(session.type) }
          ]}>
            <Text style={styles.compactTypeText}>
              {getSessionTypeIcon(session.type)} {getSessionTypeText(session.type)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.compactSubject} numberOfLines={1}>
          {session.content.name}
        </Text>
        
        <Text style={styles.compactInstructor} numberOfLines={1}>
          {session.content.instructor.name}
        </Text>
        
        {/* عرض معلومات الإلغاء */}
        {originalSlot?.isCancelledThisWeek && (
          <View style={styles.cancelledBadge}>
            <Text style={styles.cancelledText}>
              ❌ ملغية هذا الأسبوع
            </Text>
            {originalSlot.cancellationReason && (
              <Text style={styles.cancellationReason} numberOfLines={1}>
                {originalSlot.cancellationReason}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderLeftColor: getSessionTypeColor(session.type) }
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Header with time and type */}
      <View style={styles.header}>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>
            {formatTime(session.startTime)} - {formatTime(session.endTime)}
          </Text>
          <Text style={styles.dayText}>
            {getDayOfWeekText(session.dayOfWeek)}
          </Text>
        </View>
        
        <View style={[
          styles.typeBadge,
          { backgroundColor: getSessionTypeColor(session.type) }
        ]}>
          <Text style={styles.typeText}>
            {getSessionTypeIcon(session.type)} {getSessionTypeText(session.type)}
          </Text>
        </View>
      </View>

      {/* Subject and code */}
      <View style={styles.subjectContainer}>
        <Text style={styles.subjectName} numberOfLines={2}>
          {session.content.name}
        </Text>
        <Text style={styles.subjectCode}>
          {session.content.code}
        </Text>
      </View>

      {/* Instructor */}
      <View style={styles.instructorContainer}>
        <Text style={styles.instructorLabel}>المدرب:</Text>
        <Text style={styles.instructorName} numberOfLines={1}>
          {session.content.instructor.name}
        </Text>
      </View>

      {/* Location */}
      <View style={styles.locationContainer}>
        <Text style={styles.locationLabel}>المكان:</Text>
        <Text style={styles.locationText} numberOfLines={1}>
          {getLocationText()}
        </Text>
      </View>

      {/* Sessions count */}
      {session._count.sessions > 0 && (
        <View style={styles.sessionsCountContainer}>
          <Text style={styles.sessionsCountText}>
            📊 {session._count.sessions} جلسة مولدة
          </Text>
        </View>
      )}
      
      {/* عرض معلومات الإلغاء */}
      {originalSlot?.isCancelledThisWeek && (
        <View style={styles.cancelledContainer}>
          <Text style={styles.cancelledTitle}>
            ❌ محاضرة ملغية هذا الأسبوع
          </Text>
          {originalSlot.cancellationReason && (
            <Text style={styles.cancellationReason}>
              السبب: {originalSlot.cancellationReason}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  compactContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeContainer: {
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  dayText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  compactTime: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  compactTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  compactTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
  },
  subjectContainer: {
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
    lineHeight: 22,
  },
  subjectCode: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  compactSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  instructorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructorLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginRight: 8,
  },
  instructorName: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  compactInstructor: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginRight: 8,
  },
  locationText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  sessionsCountContainer: {
    backgroundColor: Colors.infoSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sessionsCountText: {
    fontSize: 12,
    color: Colors.info,
    fontWeight: '600',
  },
  cancelledBadge: {
    backgroundColor: Colors.errorSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  cancelledText: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: '600',
  },
  cancellationReason: {
    fontSize: 10,
    color: Colors.error,
    fontWeight: '400',
    marginTop: 2,
  },
  cancelledContainer: {
    backgroundColor: Colors.errorSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  cancelledTitle: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
    marginBottom: 4,
  },
});

export default ScheduleSessionItem;

