// Payment Deferral Requests Screen - عرض طلبات تأجيل السداد فقط

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
  PaymentDeferralRequest,
  PaymentDeferralStatus,
  RequestError,
} from '../types/requests';
import CustomButton from '../components/CustomButton';

interface PaymentDeferralRequestsScreenProps {
  accessToken: string;
  onBack: () => void;
  onNavigateToCreateDeferral?: () => void;
}

const PaymentDeferralRequestsScreen: React.FC<PaymentDeferralRequestsScreenProps> = ({
  accessToken,
  onBack,
  onNavigateToCreateDeferral
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<PaymentDeferralRequest[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await requestsService.getMyDeferralRequests(accessToken);
      
      if (Array.isArray(response)) {
        setRequests(response as PaymentDeferralRequest[]);
      } else {
        setError('صيغة استجابة غير صحيحة من الخادم');
      }
    } catch (err: any) {
      const apiError = err as RequestError;
      
      let errorMessage = 'حدث خطأ أثناء تحميل الطلبات';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <View style={styles.backButtonContainer}>
            <Text style={styles.backButtonText}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>طلبات تأجيل السداد</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Create Button */}
        {!isLoading && !error && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => onNavigateToCreateDeferral && onNavigateToCreateDeferral()}
            activeOpacity={0.8}
          >
            <Text style={styles.createButtonIcon}>➕</Text>
            <Text style={styles.createButtonText}>إنشاء طلب تأجيل سداد جديد</Text>
          </TouchableOpacity>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
          </View>
        )}

        {/* Error */}
        {error && !isLoading && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <CustomButton
              title="إعادة المحاولة"
              onPress={loadRequests}
              variant="outline"
              size="medium"
            />
          </View>
        )}

        {/* Requests List */}
        {!isLoading && !error && requests.length > 0 && (
          <View style={styles.requestsContainer}>
            {requests.map((request) => {
              const statusColor = getStatusColor(request.status);
              
              return (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <View style={styles.requestInfo}>
                      <View style={styles.iconContainer}>
                        <Text style={styles.iconText}>💰</Text>
                      </View>
                      <View style={styles.requestTitleSection}>
                        <Text style={styles.requestTitle}>
                          {request.fee?.name || 'رسم غير محدد'}
                        </Text>
                        <Text style={styles.requestAmount}>
                          {request.fee?.amount || 0} جنيه
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
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {getStatusText(request.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.reasonText}>
                    📝 {request.reason}
                  </Text>

                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>⏰ الأيام</Text>
                      <Text style={styles.statValue}>{request.requestedExtensionDays}</Text>
                    </View>
                    {request.requestedDeadline && (
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>📅 الموعد</Text>
                        <Text style={styles.statValue}>{formatDate(request.requestedDeadline)}</Text>
                      </View>
                    )}
                  </View>

                  {request.adminResponse && (
                    <View style={styles.adminResponse}>
                      <Text style={styles.adminResponseLabel}>💬 الرد:</Text>
                      <Text style={styles.adminResponseText}>{request.adminResponse}</Text>
                    </View>
                  )}

                  <View style={styles.footer}>
                    <Text style={styles.dateText}>
                      📅 {formatDate(request.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {!isLoading && !error && requests.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💰</Text>
            <Text style={styles.emptyTitle}>لا توجد طلبات</Text>
            <Text style={styles.emptyDescription}>
              لا توجد طلبات تأجيل سداد حالياً
            </Text>
          </View>
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 24,
  },
  requestsContainer: {
    gap: 16,
  },
  requestCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  requestInfo: {
    flexDirection: 'row',
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
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'right',
  },
  requestAmount: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  reasonText: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 14,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.backgroundSoft,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  adminResponse: {
    backgroundColor: Colors.successSoft,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
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
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  dateText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyEmoji: {
    fontSize: 96,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonIcon: {
    fontSize: 20,
    marginRight: 8,
    color: Colors.white,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
});

export default PaymentDeferralRequestsScreen;