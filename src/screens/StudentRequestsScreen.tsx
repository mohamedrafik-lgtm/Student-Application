// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles student requests display and creation
// 2. Open/Closed: Can be extended with new request types without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for requests
// 4. Dependency Inversion: Depends on abstractions (components) not concretions

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';
import { requestsService } from '../services/requestsService';
import {
  StudentRequest,
  PaymentDeferralStatus,
  RequestError,
  REQUEST_TYPE_INFO,
} from '../types/requests';
import CustomButton from '../components/CustomButton';

interface StudentRequestsScreenProps {
  accessToken: string;
  onBack: () => void;
  onNavigateToExamPostponement?: () => void;
  onNavigateToSickLeave?: () => void;
  onNavigateToEnrollmentProof?: () => void;
  onNavigateToCertificate?: () => void;
}

const StudentRequestsScreen: React.FC<StudentRequestsScreenProps> = ({
  accessToken,
  onBack,
  onNavigateToExamPostponement,
  onNavigateToSickLeave,
  onNavigateToEnrollmentProof,
  onNavigateToCertificate
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<StudentRequest[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await requestsService.getMyRequests(accessToken);
      
      console.log('📊 Response check:', {
        isArray: Array.isArray(response),
        length: Array.isArray(response) ? response.length : 0,
        firstItem: Array.isArray(response) && response.length > 0 ? response[0] : null
      });
      
      if (Array.isArray(response)) {
        console.log('✅ Setting requests with', response.length, 'items');
        // تصفية فقط الطلبات المجانية (التي لها type وليس feeId)
        const freeRequests = response.filter(req => 'type' in req && !('feeId' in req));
        console.log('📋 Free requests:', freeRequests.length);
        setRequests(freeRequests as any[]);
        console.log('✅ State updated, requests.length should be:', freeRequests.length);
      } else {
        console.error('❌ Response is not array!');
        setError('صيغة استجابة غير صحيحة من الخادم');
      }
    } catch (err: any) {
      const apiError = err as RequestError;
      
      let errorMessage = 'حدث خطأ أثناء تحميل الطلبات';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      } else if (apiError.statusCode === 404) {
        errorMessage = 'لم يتم العثور على طلبات';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: PaymentDeferralStatus) => {
    switch (status) {
      case PaymentDeferralStatus.PENDING:
        return Colors.warning;
      case PaymentDeferralStatus.APPROVED:
        return Colors.success;
      case PaymentDeferralStatus.REJECTED:
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusText = (status: PaymentDeferralStatus) => {
    switch (status) {
      case PaymentDeferralStatus.PENDING:
        return 'قيد المراجعة';
      case PaymentDeferralStatus.APPROVED:
        return 'مقبول';
      case PaymentDeferralStatus.REJECTED:
        return 'مرفوض';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Debug render conditions
  console.log('🎨 RENDER CONDITIONS:', {
    isLoading,
    error,
    requestsLength: requests.length,
    shouldShowRequests: !isLoading && !error && requests.length > 0,
    shouldShowEmpty: !isLoading && !error && requests.length === 0,
    shouldShowCreateButtons: !isLoading && !error
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <View style={styles.backButtonContainer}>
            <Text style={styles.backButtonText}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الطلبات المجانية</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading */}
        {isLoading && (
          <Animated.View style={[
            styles.loadingContainer,
            { opacity: fadeAnim }
          ]}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
          </Animated.View>
        )}

        {/* Error */}
        {error && !isLoading && (
          <Animated.View style={[
            styles.errorContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <CustomButton
              title="إعادة المحاولة"
              onPress={loadRequests}
              variant="outline"
              size="medium"
            />
          </Animated.View>
        )}

        {/* Create Request Buttons */}
        {!isLoading && !error && (
          <View style={styles.createRequestSection}>
            <TouchableOpacity
              style={styles.requestTypeButton}
              activeOpacity={0.7}
              onPress={() => onNavigateToCertificate && onNavigateToCertificate()}
            >
              <View style={styles.requestTypeIcon}>
                <Text style={styles.iconEmoji}>📋</Text>
              </View>
              <Text style={styles.requestTypeLabel}>إفادة</Text>
              <Text style={styles.createLabel}>إنشاء طلب</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.requestTypeButton}
              activeOpacity={0.7}
              onPress={() => onNavigateToEnrollmentProof && onNavigateToEnrollmentProof()}
            >
              <View style={styles.requestTypeIcon}>
                <Text style={styles.iconEmoji}>📄</Text>
              </View>
              <Text style={styles.requestTypeLabel}>إثبات قيد</Text>
              <Text style={styles.createLabel}>إنشاء طلب</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.requestTypeButton}
              activeOpacity={0.7}
              onPress={() => onNavigateToSickLeave && onNavigateToSickLeave()}
            >
              <View style={styles.requestTypeIcon}>
                <Text style={styles.iconEmoji}>🏥</Text>
              </View>
              <Text style={styles.requestTypeLabel}>إجازة مرضية</Text>
              <Text style={styles.createLabel}>إنشاء طلب</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.requestTypeButton}
              activeOpacity={0.7}
              onPress={() => onNavigateToExamPostponement && onNavigateToExamPostponement()}
            >
              <View style={styles.requestTypeIcon}>
                <Text style={styles.iconEmoji}>📝</Text>
              </View>
              <Text style={styles.requestTypeLabel}>تأجيل اختبار</Text>
              <Text style={styles.createLabel}>إنشاء طلب</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Requests List */}
        {!isLoading && !error && requests.length > 0 && (
          <View style={styles.requestsContainer}>
            {requests.map((request) => {
              // التحقق من نوع الطلب
              const isPaymentDeferral = 'feeId' in request;
              const isTraineeReq = 'type' in request;
              
              const statusColor = getStatusColor(request.status);
              
              // تحديد الأيقونة والعنوان حسب النوع
              let icon = '💰';
              let title = 'طلب';
              
              if (isPaymentDeferral) {
                icon = '💰';
                title = `تأجيل سداد - ${(request as any).fee?.name || 'غير محدد'}`;
              } else if (isTraineeReq) {
                const traineeReq = request as any;
                const reqType = traineeReq.type as keyof typeof REQUEST_TYPE_INFO;
                if (reqType && REQUEST_TYPE_INFO[reqType]) {
                  const typeInfo = REQUEST_TYPE_INFO[reqType];
                  icon = typeInfo.icon;
                  title = typeInfo.nameAr;
                }
              }
              
              return (
                <View key={request.id} style={styles.requestCard}>
                  {/* Header */}
                  <View style={styles.requestCardHeader}>
                    <View style={styles.requestMainInfo}>
                      <View style={styles.iconContainer}>
                        <Text style={styles.iconText}>{icon}</Text>
                      </View>
                      <View style={styles.requestTitleSection}>
                        <Text style={styles.requestTitle}>
                          {title}
                        </Text>
                        <Text style={styles.requestAmount}>
                          {request.reason}
                        </Text>
                      </View>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { 
                        backgroundColor: statusColor + '15',
                        borderColor: statusColor
                      }
                    ]}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {getStatusText(request.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Request Details */}
                  <View style={styles.requestDetails}>
                    <Text style={styles.reasonText}>
                      📝 {request.reason}
                    </Text>
                    
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>⏰ عدد الأيام</Text>
                        <Text style={styles.statValue}>{request.requestedExtensionDays}</Text>
                      </View>
                      {request.requestedDeadline && (
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>📅 الموعد الجديد</Text>
                          <Text style={styles.statValue}>{formatDate(request.requestedDeadline)}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Admin Response */}
                  {request.adminResponse && (
                    <View style={styles.adminResponseContainer}>
                      <Text style={styles.adminResponseLabel}>💬 رد الإدارة:</Text>
                      <Text style={styles.adminResponseText}>{request.adminResponse}</Text>
                    </View>
                  )}

                  {/* Reviewer */}
                  {request.reviewer && (
                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerLabel}>👤 المراجع:</Text>
                      <Text style={styles.reviewerName}>{request.reviewer.name}</Text>
                      {request.reviewedAt && (
                        <Text style={styles.reviewDate}>
                          {formatDate(request.reviewedAt)}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Footer */}
                  <View style={styles.requestFooter}>
                    <Text style={styles.createdDate}>
                      📅 تاريخ الطلب: {formatDate(request.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {!isLoading && !error && requests.length === 0 && (
          <Animated.View style={[
            styles.emptyContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>لا توجد طلبات</Text>
            <Text style={styles.emptyDescription}>
              لا توجد طلبات تأجيل سداد لديك حالياً
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.primary,
    fontWeight: '800',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  createRequestSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  requestTypeButton: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  requestTypeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconEmoji: {
    fontSize: 28,
  },
  requestTypeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  createLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  reasonText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    textAlign: 'right',
    marginBottom: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    fontWeight: '600',
  },
  requestsContainer: {
    gap: 16,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  requestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  requestMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
  },
  requestTitleSection: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  requestAmount: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'right',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '800',
  },
  requestDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  adminResponseContainer: {
    backgroundColor: Colors.successSoft,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  adminResponseLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.success,
    marginBottom: 6,
    textAlign: 'right',
  },
  adminResponseText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    textAlign: 'right',
    fontWeight: '600',
  },
  reviewerInfo: {
    backgroundColor: Colors.primarySoft,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  reviewerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
    textAlign: 'right',
  },
  reviewerName: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  requestFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  createdDate: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'right',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 96,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default StudentRequestsScreen;