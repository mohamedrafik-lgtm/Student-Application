// SOLID Principles Applied:
// 1. Single Responsibility: This component only handles schedule slot details display
// 2. Open/Closed: Can be extended with new features without modification
// 3. Interface Segregation: Uses specific props interface
// 4. Dependency Inversion: Depends on abstractions (services) not concretions

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../services/authService';
import { ScheduleSlotResponse, ScheduleError } from '../types/auth';
import { Colors } from '../styles/colors';
import CustomButton from './CustomButton';

interface ScheduleSlotDetailsProps {
  slotId: number;
  accessToken: string;
  onBack: () => void;
}

// Day of Week Arabic Mapping
const dayOfWeekArabic = {
  SUNDAY: 'الأحد',
  MONDAY: 'الاثنين',
  TUESDAY: 'الثلاثاء',
  WEDNESDAY: 'الأربعاء',
  THURSDAY: 'الخميس',
  FRIDAY: 'الجمعة',
  SATURDAY: 'السبت',
};

// Session Type Arabic Mapping
const sessionTypeArabic = {
  THEORY: 'نظري',
  PRACTICAL: 'عملي',
  EXAM: 'اختبار',
  WORKSHOP: 'ورشة عمل',
};

const ScheduleSlotDetails: React.FC<ScheduleSlotDetailsProps> = ({ 
  slotId, 
  accessToken, 
  onBack 
}) => {
  const [slotData, setSlotData] = useState<ScheduleSlotResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSlotData();
  }, [slotId]);

  const loadSlotData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Loading schedule slot:', slotId);
      const data = await AuthService.getScheduleSlot(slotId, accessToken);
      console.log('✅ Schedule slot loaded successfully:', data);
      
      setSlotData(data);
    } catch (err) {
      console.error('❌ Failed to load schedule slot:', err);
      const apiError = err as ScheduleError;
      
      let errorMessage = 'حدث خطأ أثناء تحميل تفاصيل الفترة الدراسية';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      } else if (apiError.statusCode === 404) {
        errorMessage = 'لم يتم العثور على الفترة الدراسية المحددة';
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

  const handleRetry = () => {
    loadSlotData();
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'م' : 'ص';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>جاري تحميل تفاصيل الفترة...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>خطأ في التحميل</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <CustomButton
            title="إعادة المحاولة"
            onPress={handleRetry}
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

  if (!slotData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>لا توجد بيانات</Text>
          <Text style={styles.errorMessage}>لم يتم العثور على تفاصيل الفترة الدراسية</Text>
          <CustomButton
            title="العودة"
            onPress={onBack}
            variant="primary"
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← العودة</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تفاصيل الفترة الدراسية</Text>
        </View>

        {/* Basic Slot Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>معلومات الفترة</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>المادة:</Text>
            <Text style={styles.infoValue}>
              {slotData.content.name} ({slotData.content.code})
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>المدرب:</Text>
            <Text style={styles.infoValue}>{slotData.content.instructor.name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>اليوم:</Text>
            <Text style={styles.infoValue}>
              {dayOfWeekArabic[slotData.dayOfWeek]}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>الوقت:</Text>
            <Text style={styles.infoValue}>
              {formatTime(slotData.startTime)} - {formatTime(slotData.endTime)}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>النوع:</Text>
            <Text style={[
              styles.infoValue,
              styles.sessionType,
              { color: slotData.type === 'THEORY' ? Colors.primary : Colors.accent }
            ]}>
              {sessionTypeArabic[slotData.type]}
            </Text>
          </View>
          
          {slotData.location && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>المكان:</Text>
              <Text style={styles.infoValue}>{slotData.location}</Text>
            </View>
          )}
        </View>

        {/* Classroom Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>معلومات الفصل</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>اسم الفصل:</Text>
            <Text style={styles.infoValue}>{slotData.classroom.name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>تاريخ البداية:</Text>
            <Text style={styles.infoValue}>
              {formatDate(slotData.classroom.startDate)}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>تاريخ النهاية:</Text>
            <Text style={styles.infoValue}>
              {formatDate(slotData.classroom.endDate)}
            </Text>
          </View>
        </View>

        {/* Sessions List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            الجلسات ({slotData.sessions.length})
          </Text>
          
          {slotData.sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>لا توجد جلسات مسجلة</Text>
            </View>
          ) : (
            <View style={styles.sessionsList}>
              {slotData.sessions.map((session) => (
                <View 
                  key={session.id} 
                  style={[
                    styles.sessionCard,
                    session.isCancelled && styles.cancelledSession
                  ]}
                >
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionDate}>
                      {formatDate(session.date)}
                    </Text>
                    <View style={[
                      styles.sessionStatus,
                      { backgroundColor: session.isCancelled ? Colors.error : Colors.success }
                    ]}>
                      <Text style={styles.sessionStatusText}>
                        {session.isCancelled ? 'ملغاة' : 'مجدولة'}
                      </Text>
                    </View>
                  </View>
                  
                  {session.isCancelled && session.cancellationReason && (
                    <View style={styles.cancellationReason}>
                      <Text style={styles.cancellationReasonText}>
                        سبب الإلغاء: {session.cancellationReason}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textPrimary,
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
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'right',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'right',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    textAlign: 'left',
    flex: 2,
  },
  sessionType: {
    fontWeight: '700',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  sessionsList: {
    gap: 12,
  },
  sessionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    marginBottom: 12,
  },
  cancelledSession: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sessionStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sessionStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  cancellationReason: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  cancellationReasonText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'right',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default ScheduleSlotDetails;
