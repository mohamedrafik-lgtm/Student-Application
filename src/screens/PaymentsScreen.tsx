import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AuthService} from '../services/authService';
import {
  TraineeProfile,
  TraineePayment,
  PaymentStatus,
  FeeType,
} from '../types/auth';

interface PaymentsScreenProps {
  accessToken: string;
  onBack: () => void;
  onNavigateToPaymentDueDates?: () => void;
}

const PaymentsScreen: React.FC<PaymentsScreenProps> = ({
  accessToken,
  onBack,
  onNavigateToPaymentDueDates,
}) => {
  const [profile, setProfile] = useState<TraineeProfile | null>(null);
  const [payments, setPayments] = useState<TraineePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<
    PaymentStatus | 'ALL'
  >('ALL');

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Loading payments...');
      const profileData = await AuthService.getProfile(accessToken);
      console.log('✅ Payments loaded successfully:', profileData);

      setProfile(profileData);
      setPayments(profileData.trainee.traineePayments || []);
    } catch (err) {
      console.error('❌ Failed to load payments:', err);
      const apiError = err as any;

      let errorMessage = 'حدث خطأ أثناء تحميل المدفوعات';
      if (apiError.statusCode === 401) {
        errorMessage =
          'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
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

  const handleMakePayment = (payment: TraineePayment) => {
    Alert.alert('دفع الرسوم', 'سيتم إضافة هذه الميزة قريباً');
  };

  const handlePaymentHistory = () => {
    Alert.alert('سجل المدفوعات', 'سيتم إضافة هذه الميزة قريباً');
  };

  const getPaymentStatusText = (status: PaymentStatus): string => {
    switch (status) {
      case 'PENDING':
        return 'معلق';
      case 'COMPLETED':
        return 'مكتمل';
      case 'CANCELLED':
        return 'ملغي';
      case 'REFUNDED':
        return 'مسترد';
      default:
        return status;
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus): string => {
    switch (status) {
      case 'PENDING':
        return '#F59E0B';
      case 'COMPLETED':
        return '#10B981';
      case 'CANCELLED':
        return '#EF4444';
      case 'REFUNDED':
        return '#3B82F6';
      default:
        return '#8E95A2';
    }
  };

  const getFeeTypeText = (type: FeeType): string => {
    switch (type) {
      case 'REGISTRATION':
        return 'رسوم التسجيل';
      case 'TUITION':
        return 'الرسوم الدراسية';
      case 'EXAM':
        return 'رسوم الامتحان';
      case 'MATERIALS':
        return 'رسوم المواد';
      case 'CERTIFICATE':
        return 'رسوم الشهادة';
      case 'OTHER':
        return 'أخرى';
      default:
        return type;
    }
  };

  const getFeeTypeIcon = (type: FeeType): string => {
    switch (type) {
      case 'REGISTRATION':
        return '📝';
      case 'TUITION':
        return '🎓';
      case 'EXAM':
        return '📋';
      case 'MATERIALS':
        return '📚';
      case 'CERTIFICATE':
        return '🏆';
      case 'OTHER':
        return '💰';
      default:
        return '💰';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const filteredPayments =
    selectedFilter === 'ALL'
      ? payments
      : payments.filter(payment => payment.status === selectedFilter);

  const paymentStatuses: (PaymentStatus | 'ALL')[] = [
    'ALL',
    PaymentStatus.PENDING,
    PaymentStatus.COMPLETED,
    PaymentStatus.CANCELLED,
    PaymentStatus.REFUNDED,
  ];

  // Calculate totals
  const totalAmount = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const paidAmount = payments.reduce(
    (sum, payment) => sum + payment.paidAmount,
    0,
  );
  const pendingAmount = totalAmount - paidAmount;
  const completedPayments = payments.filter(
    p => p.status === 'COMPLETED',
  ).length;
  const pendingPaymentsCount = payments.filter(
    p => p.status === 'PENDING',
  ).length;
  const paidPct = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  // Loading
  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={s.loadingText}>جاري تحميل المدفوعات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error
  if (error) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerBox}>
          <Text style={s.errorEmoji}>⚠️</Text>
          <Text style={s.errorTitle}>خطأ في تحميل المدفوعات</Text>
          <Text style={s.errorMsg}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadPayments}>
            <Text style={s.retryBtnText}>إعادة المحاولة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.backLink} onPress={onBack}>
            <Text style={s.backLinkText}>العودة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={s.headerTitle}>المدفوعات</Text>
            <Text style={s.headerSub}>إدارة الرسوم والمدفوعات</Text>
          </View>
          <View style={s.headerActions}>
            {onNavigateToPaymentDueDates && (
              <TouchableOpacity
                style={s.headerActionBtn}
                onPress={onNavigateToPaymentDueDates}>
                <Text style={s.headerActionIcon}>📅</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={s.headerActionBtn}
              onPress={handlePaymentHistory}>
              <Text style={s.headerActionIcon}>📊</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Card */}
        <View style={s.summaryCard}>
          <Text style={s.summaryTitle}>ملخص المدفوعات</Text>

          <View style={s.summaryGrid}>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{formatCurrency(totalAmount)}</Text>
              <Text style={s.summaryLabel}>إجمالي المطلوب</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryValue, {color: '#10B981'}]}>
                {formatCurrency(paidAmount)}
              </Text>
              <Text style={s.summaryLabel}>المدفوع</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryValue, {color: '#F59E0B'}]}>
                {formatCurrency(pendingAmount)}
              </Text>
              <Text style={s.summaryLabel}>المتبقي</Text>
            </View>
          </View>

          {/* Progress */}
          <View style={s.progressRow}>
            <View style={s.progressBarBg}>
              <View
                style={[s.progressBarFill, {width: `${paidPct}%`}]}
              />
            </View>
            <Text style={s.progressText}>
              {Math.round(paidPct)}% مكتمل
            </Text>
          </View>

          {/* Stats Row */}
          <View style={s.statsRow}>
            <View style={s.statsItem}>
              <Text style={s.statsNum}>{payments.length}</Text>
              <Text style={s.statsLabel}>إجمالي</Text>
            </View>
            <View style={s.statsDivider} />
            <View style={s.statsItem}>
              <Text style={[s.statsNum, {color: '#10B981'}]}>
                {completedPayments}
              </Text>
              <Text style={s.statsLabel}>مكتملة</Text>
            </View>
            <View style={s.statsDivider} />
            <View style={s.statsItem}>
              <Text style={[s.statsNum, {color: '#F59E0B'}]}>
                {pendingPaymentsCount}
              </Text>
              <Text style={s.statsLabel}>معلقة</Text>
            </View>
          </View>
        </View>

        {/* Filter */}
        <View style={s.filterSection}>
          <Text style={s.sectionTitle}>تصفية المدفوعات</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterContent}>
            {paymentStatuses.map(status => (
              <TouchableOpacity
                key={status}
                style={[
                  s.filterChip,
                  selectedFilter === status && s.filterChipActive,
                ]}
                onPress={() => setSelectedFilter(status)}>
                <Text
                  style={[
                    s.filterChipText,
                    selectedFilter === status && s.filterChipTextActive,
                  ]}>
                  {status === 'ALL'
                    ? 'الكل'
                    : getPaymentStatusText(status as PaymentStatus)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Payments List */}
        <View style={s.listSection}>
          <Text style={s.sectionTitle}>
            المدفوعات ({filteredPayments.length})
          </Text>

          {filteredPayments.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyEmoji}>💰</Text>
              <Text style={s.emptyTitle}>لا توجد مدفوعات</Text>
              <Text style={s.emptyMsg}>
                {selectedFilter === 'ALL'
                  ? 'لم يتم العثور على أي مدفوعات'
                  : `لا توجد مدفوعات بحالة ${getPaymentStatusText(selectedFilter as PaymentStatus)}`}
              </Text>
            </View>
          ) : (
            <View style={s.paymentsList}>
              {filteredPayments.map(payment => (
                <View key={payment.id} style={s.paymentCard}>
                  {/* Card Header */}
                  <View style={s.paymentHeader}>
                    <View style={s.paymentIconBox}>
                      <Text style={s.paymentIconText}>
                        {getFeeTypeIcon(payment.fee.type)}
                      </Text>
                    </View>
                    <View
                      style={[
                        s.paymentStatusBadge,
                        {
                          backgroundColor:
                            getPaymentStatusColor(payment.status) + '18',
                        },
                      ]}>
                      <Text
                        style={[
                          s.paymentStatusText,
                          {
                            color: getPaymentStatusColor(payment.status),
                          },
                        ]}>
                        {getPaymentStatusText(payment.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Payment Info */}
                  <Text style={s.paymentTitle}>{payment.fee.name}</Text>
                  <Text style={s.paymentType}>
                    {getFeeTypeText(payment.fee.type)}
                  </Text>

                  {/* Amounts */}
                  <View style={s.amountsBox}>
                    <View style={s.amountRow}>
                      <Text style={s.amountLabel}>المبلغ المطلوب:</Text>
                      <Text style={s.amountValue}>
                        {formatCurrency(payment.amount)}
                      </Text>
                    </View>
                    <View style={s.amountRow}>
                      <Text style={s.amountLabel}>المبلغ المدفوع:</Text>
                      <Text style={[s.amountValue, {color: '#10B981'}]}>
                        {formatCurrency(payment.paidAmount)}
                      </Text>
                    </View>
                    {payment.amount > payment.paidAmount && (
                      <View style={s.amountRow}>
                        <Text style={s.amountLabel}>المتبقي:</Text>
                        <Text
                          style={[s.amountValue, {color: '#F59E0B'}]}>
                          {formatCurrency(
                            payment.amount - payment.paidAmount,
                          )}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Details */}
                  <View style={s.detailsRow}>
                    <Text style={s.detailText}>
                      📅 {formatDate(payment.createdAt)}
                    </Text>
                    <Text style={s.detailText}>
                      🎓 {payment.fee.academicYear}
                    </Text>
                  </View>

                  {payment.notes && (
                    <Text style={s.paymentNotes} numberOfLines={2}>
                      {payment.notes}
                    </Text>
                  )}

                  {/* Pay Button */}
                  {payment.status === 'PENDING' &&
                    payment.amount > payment.paidAmount && (
                      <TouchableOpacity
                        style={s.payBtn}
                        onPress={() => handleMakePayment(payment)}>
                        <Text style={s.payBtnText}>💳 دفع الآن</Text>
                      </TouchableOpacity>
                    )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
  },
  errorEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1D26',
    marginBottom: 8,
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
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionIcon: {
    fontSize: 18,
  },

  /* Summary */
  summaryCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D26',
    textAlign: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1D26',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#8E95A2',
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#EEF2F6',
  },
  progressRow: {
    marginBottom: 16,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#EEF2F6',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E95A2',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  statsItem: {
    alignItems: 'center',
  },
  statsNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 2,
  },
  statsLabel: {
    fontSize: 12,
    color: '#8E95A2',
    fontWeight: '500',
  },
  statsDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#EEF2F6',
  },

  /* Filter */
  filterSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1D26',
    textAlign: 'right',
    marginBottom: 12,
  },
  filterContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E95A2',
  },
  filterChipTextActive: {
    color: '#FFF',
  },

  /* Payments List */
  listSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  paymentsList: {
    gap: 12,
  },
  paymentCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIconText: {
    fontSize: 22,
  },
  paymentStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D26',
    textAlign: 'right',
    marginBottom: 4,
  },
  paymentType: {
    fontSize: 13,
    color: '#8E95A2',
    textAlign: 'right',
    marginBottom: 14,
  },
  amountsBox: {
    marginBottom: 12,
    gap: 6,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 13,
    color: '#8E95A2',
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1D26',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#8E95A2',
  },
  paymentNotes: {
    fontSize: 12,
    color: '#8E95A2',
    fontStyle: 'italic',
    textAlign: 'right',
    marginTop: 8,
    lineHeight: 18,
  },
  payBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  payBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },

  /* Empty */
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D26',
    marginBottom: 8,
  },
  emptyMsg: {
    fontSize: 14,
    color: '#8E95A2',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
});

export default PaymentsScreen;
