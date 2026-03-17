import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
import { AuthService } from '../services/authService';
import { FeeType, TraineePayment } from '../types/auth';

interface PaymentsScreenProps {
  accessToken: string;
  onBack: () => void;
  onNavigateToPaymentDueDates?: () => void;
}

type PaymentWithAvailability = TraineePayment & {
  canPay: boolean;
  isNext: boolean;
};

const normalizeStatus = (status: string): string => {
  if (status === 'COMPLETED') {
    return 'PAID';
  }
  return status;
};

const PaymentsScreen: React.FC<PaymentsScreenProps> = ({
  accessToken,
  onBack,
  onNavigateToPaymentDueDates,
}) => {
  const [payments, setPayments] = useState<TraineePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Same endpoint used in web trainee dashboard: /api/trainee-auth/profile
      const profileData = await AuthService.getProfile(accessToken);
      setPayments(profileData?.trainee?.traineePayments || []);
    } catch (err) {
      const apiError = err as any;
      let errorMessage = 'حدث خطأ أثناء تحميل البيانات المالية';

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

  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [payments],
  );

  const paymentsWithAvailability = useMemo<PaymentWithAvailability[]>(() => {
    let nextUnpaidFound = false;

    return sortedPayments.map(payment => {
      const status = normalizeStatus(payment.status);
      const isFullyPaid = status === 'PAID';
      const isPartiallyPaid = status === 'PARTIALLY_PAID';
      const isPending = status === 'PENDING';

      if (isFullyPaid) {
        return { ...payment, canPay: false, isNext: false };
      }

      if ((isPending || isPartiallyPaid) && !nextUnpaidFound) {
        nextUnpaidFound = true;
        return { ...payment, canPay: true, isNext: true };
      }

      return { ...payment, canPay: false, isNext: false };
    });
  }, [sortedPayments]);

  const totalAmount = useMemo(
    () => payments.reduce((sum, payment) => sum + (payment.amount || 0), 0),
    [payments],
  );
  const paidAmount = useMemo(
    () => payments.reduce((sum, payment) => sum + (payment.paidAmount || 0), 0),
    [payments],
  );
  const remainingAmount = totalAmount - paidAmount;
  const paymentPercentage = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  const getFeeTypeMeta = (type: FeeType | string) => {
    switch (type) {
      case 'TUITION':
        return { label: 'رسوم دراسية', icon: AppIcons.student, color: Colors.primary };
      case 'SERVICES':
        return { label: 'رسوم خدمات', icon: AppIcons.settings, color: Colors.secondary };
      case 'TRAINING':
        return { label: 'رسوم تدريب', icon: AppIcons.content, color: Colors.info };
      case 'ADDITIONAL':
        return { label: 'رسوم إضافية', icon: AppIcons.add, color: Colors.accentDark };
      case 'REGISTRATION':
        return { label: 'رسوم التسجيل', icon: AppIcons.document, color: Colors.secondary };
      case 'EXAM':
        return { label: 'رسوم الامتحان', icon: AppIcons.exam, color: Colors.info };
      case 'MATERIALS':
        return { label: 'رسوم المواد', icon: AppIcons.book, color: Colors.warning };
      case 'CERTIFICATE':
        return { label: 'رسوم الشهادة', icon: AppIcons.certificate, color: Colors.warning };
      default:
        return { label: 'رسوم أخرى', icon: AppIcons.money, color: Colors.textLight };
    }
  };

  const getPaymentStatusMeta = (status: string) => {
    const normalized = normalizeStatus(status);

    switch (normalized) {
      case 'PAID':
        return { label: 'مدفوع بالكامل', color: '#166534', bg: '#DCFCE7', border: '#BBF7D0', icon: AppIcons.checkFilled };
      case 'PARTIALLY_PAID':
        return { label: 'مدفوع جزئياً', color: '#1D4ED8', bg: '#DBEAFE', border: '#BFDBFE', icon: AppIcons.pending };
      case 'PENDING':
        return { label: 'في انتظار الدفع', color: '#92400E', bg: '#FEF3C7', border: '#FDE68A', icon: AppIcons.warning };
      case 'CANCELLED':
        return { label: 'ملغي', color: '#991B1B', bg: '#FEE2E2', border: '#FECACA', icon: AppIcons.error };
      default:
        return { label: normalized, color: Colors.textHint, bg: Colors.background, border: Colors.borderMedium, icon: AppIcons.payments };
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handleMakePayment = (_payment: TraineePayment) => {
    Alert.alert('الدفع الإلكتروني', 'سيتم إضافة الدفع الإلكتروني قريباً');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.loadingText}>جاري تحضير بياناتك المالية...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerBox}>
          <View style={s.errorIconBox}>
            <Icon name={AppIcons.warning} size={28} color={Colors.error} />
          </View>
          <Text style={s.errorTitle}>حدث خطأ في تحميل البيانات</Text>
          <Text style={s.errorMsg}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadPayments}>
            <Text style={s.retryBtnText}>إعادة المحاولة</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBack} style={s.backLink}>
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
        showsVerticalScrollIndicator={false}
      >
        <View style={s.pageHeader}>
          <TouchableOpacity style={s.pageBackBtn} onPress={onBack}>
            <Icon name={AppIcons.back} size={20} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={s.pageHeaderTextWrap}>
            <Text style={s.pageTitle}>المدفوعات والرسوم</Text>
            <Text style={s.pageSubtitle}>متابعة الرصيد المستحق وسجل المدفوعات الخاص بك</Text>
          </View>
        </View>

        <View style={s.walletCard}>
          <View style={s.walletTopRow}>
            <View style={s.walletTopLabelWrap}>
              <Icon name={AppIcons.money} size={18} color={Colors.white} />
              <Text style={s.walletTopLabel}>إجمالي المبالغ المتبقية للدفع</Text>
            </View>

            {onNavigateToPaymentDueDates && (
              <TouchableOpacity style={s.walletDatesBtn} onPress={onNavigateToPaymentDueDates}>
                <Icon name={AppIcons.calendar} size={15} color={Colors.white} />
                <Text style={s.walletDatesText}>المواعيد</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={s.remainingAmountText}>{remainingAmount.toLocaleString('ar-EG')} ج.م</Text>

          <View style={s.walletStatsRow}>
            <View style={s.walletStat}>
              <Text style={s.walletStatLabel}>إجمالي الرسوم</Text>
              <Text style={s.walletStatValue}>{totalAmount.toLocaleString('ar-EG')} ج.م</Text>
            </View>

            <View style={s.walletStat}>
              <Text style={s.walletStatLabel}>المدفوع</Text>
              <Text style={s.walletStatValue}>{paidAmount.toLocaleString('ar-EG')} ج.م</Text>
            </View>
          </View>

          <View style={s.progressRowHead}>
            <Text style={s.progressRowText}>نسبة السداد</Text>
            <Text style={s.progressRowText}>{paymentPercentage}%</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${paymentPercentage}%` }]} />
          </View>
        </View>

        <View style={s.listHeader}>
          <Text style={s.listHeaderCount}>{payments.length} رسوم</Text>
          <Text style={s.listHeaderTitle}>تفاصيل الرسوم</Text>
        </View>

        {paymentsWithAvailability.length === 0 ? (
          <View style={s.emptyBox}>
            <Icon name={AppIcons.checkFilled} size={38} color={Colors.primary} />
            <Text style={s.emptyTitle}>لا توجد رسوم مطلوبة</Text>
            <Text style={s.emptyMsg}>حسابك المالي سليم ولا توجد أي رسوم مستحقة الدفع.</Text>
          </View>
        ) : (
          <View style={s.cardsList}>
            {paymentsWithAvailability.map(payment => {
              const feeMeta = getFeeTypeMeta(payment.fee?.type);
              const statusMeta = getPaymentStatusMeta(payment.status);
              const remaining = (payment.amount || 0) - (payment.paidAmount || 0);
              const payPct = payment.amount > 0 ? Math.round(((payment.paidAmount || 0) / payment.amount) * 100) : 0;
              const paymentSchedule = (payment.fee as any)?.paymentSchedule;

              return (
                <View key={payment.id} style={s.paymentCard}>
                  <View style={s.cardTopRow}>
                    <View style={[s.feeIconWrap, { backgroundColor: `${feeMeta.color}1A` }]}>
                      <Icon name={feeMeta.icon} size={22} color={feeMeta.color} />
                    </View>

                    <View style={s.cardTitleWrap}>
                      <Text style={s.feeName}>{payment.fee?.name}</Text>

                      <View style={s.cardMetaInline}>
                        <Text style={[s.feeTypeText, { color: feeMeta.color }]}>{feeMeta.label}</Text>
                        <View style={s.metaDot} />
                        <View style={[s.statusBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
                          <Icon name={statusMeta.icon} size={12} color={statusMeta.color} />
                          <Text style={[s.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={s.requiredAmountWrap}>
                      <Text style={s.requiredAmountLabel}>المبلغ المطلوب</Text>
                      <Text style={s.requiredAmountValue}>{formatCurrency(payment.amount || 0)}</Text>
                    </View>
                  </View>

                  <View style={s.detailBox}>
                    <View style={s.amountsLegendRow}>
                      <Text style={s.paidLegend}>مدفوع: {(payment.paidAmount || 0).toLocaleString('ar-EG')} ج.م</Text>
                      <Text style={s.remainingLegend}>متبقي: {remaining.toLocaleString('ar-EG')} ج.م</Text>
                    </View>

                    <View style={s.miniProgressTrack}>
                      <View
                        style={[
                          s.miniProgressFill,
                          {
                            width: `${payPct}%`,
                            backgroundColor:
                              normalizeStatus(payment.status) === 'PAID'
                                ? Colors.primary
                                : normalizeStatus(payment.status) === 'PARTIALLY_PAID'
                                  ? Colors.info
                                  : normalizeStatus(payment.status) === 'CANCELLED'
                                    ? Colors.error
                                    : Colors.warning,
                          },
                        ]}
                      />
                    </View>

                    {!!paymentSchedule && (
                      <View style={s.scheduleWrap}>
                        <View style={s.scheduleItem}>
                          <Icon name={AppIcons.calendar} size={14} color={Colors.textHint} />
                          <Text style={s.scheduleLabel}>بداية السداد:</Text>
                          <Text style={s.scheduleValue}>{formatDate(paymentSchedule.paymentStartDate)}</Text>
                        </View>

                        <View style={s.scheduleItem}>
                          <Icon name={AppIcons.pending} size={14} color={Colors.textHint} />
                          <Text style={s.scheduleLabel}>نهاية السداد:</Text>
                          <Text style={s.scheduleValue}>{formatDate(paymentSchedule.paymentEndDate)}</Text>
                        </View>
                      </View>
                    )}

                    {!payment.canPay && normalizeStatus(payment.status) !== 'PAID' && (
                      <View style={s.lockedNotice}>
                        <Icon name={AppIcons.lock} size={14} color={Colors.textLight} />
                        <Text style={s.lockedNoticeText}>سداد هذه الرسوم غير متاح حالياً حتى سداد الرسوم السابقة</Text>
                      </View>
                    )}

                    {payment.isNext && normalizeStatus(payment.status) !== 'PAID' && remaining > 0 && (
                      <TouchableOpacity
                        style={s.payNowBtn}
                        onPress={() => handleMakePayment(payment)}
                        activeOpacity={0.85}
                      >
                        <Text style={s.payNowBtnText}>دفع الآن</Text>
                        <Text style={s.payNowBtnAmount}>{formatCurrency(remaining)}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={s.footerMetaRow}>
                    <Text style={s.footerDate}>{formatDate(payment.createdAt)}</Text>
                    <Text style={s.footerAcademicYear}>السنة الدراسية: {payment.fee?.academicYear || '-'}</Text>
                  </View>

                  {!!payment.notes && <Text style={s.notesText}>{payment.notes}</Text>}
                </View>
              );
            })}
          </View>
        )}

        <View style={s.comingSoonBox}>
          <View style={s.comingSoonIconWrap}>
            <Icon name={AppIcons.paymentsFilled} size={23} color={Colors.primary} />
          </View>
          <View style={s.comingSoonTextWrap}>
            <Text style={s.comingSoonTitle}>الدفع الإلكتروني قريباً</Text>
            <Text style={s.comingSoonText}>نعمل على توفير بوابات دفع إلكترونية لتسهيل عملية السداد.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },

  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 15, color: Colors.textLight },

  errorIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  errorMsg: { fontSize: 14, color: Colors.textLight, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  retryBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  backLink: { paddingVertical: 8 },
  backLinkText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },

  pageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  pageBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    marginRight: 10,
  },
  pageHeaderTextWrap: { flex: 1, alignItems: 'flex-end' },
  pageTitle: { fontSize: 23, fontWeight: '800', color: Colors.textPrimary },
  pageSubtitle: { fontSize: 13, color: Colors.textLight, marginTop: 3, textAlign: 'right' },

  walletCard: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  walletTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  walletTopLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletTopLabel: { fontSize: 13, color: Colors.white, fontWeight: '700' },
  walletDatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  walletDatesText: { fontSize: 12, color: Colors.white, fontWeight: '700' },

  remainingAmountText: { fontSize: 32, fontWeight: '800', color: Colors.white, textAlign: 'right', marginBottom: 14 },
  walletStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  walletStat: { flex: 1 },
  walletStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.84)', marginBottom: 4, textAlign: 'right' },
  walletStatValue: { fontSize: 16, color: Colors.white, fontWeight: '700', textAlign: 'right' },

  progressRowHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressRowText: { fontSize: 12, color: Colors.white, fontWeight: '700' },
  progressTrack: {
    height: 8,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.18)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: Colors.white },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  listHeaderTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  listHeaderCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  cardsList: { gap: 12, marginBottom: 16 },
  paymentCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 18,
    padding: 14,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  feeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitleWrap: { flex: 1 },
  feeName: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right' },
  cardMetaInline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  feeTypeText: { fontSize: 12, fontWeight: '700' },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.borderDark, marginHorizontal: 6 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  requiredAmountWrap: { alignItems: 'flex-end' },
  requiredAmountLabel: { fontSize: 11, color: Colors.textLight },
  requiredAmountValue: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },

  detailBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
  },
  amountsLegendRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  paidLegend: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  remainingLegend: { fontSize: 11, fontWeight: '700', color: Colors.error },
  miniProgressTrack: {
    width: '100%',
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  miniProgressFill: { height: '100%', borderRadius: 4 },

  scheduleWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },
  scheduleItem: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 5 },
  scheduleLabel: { fontSize: 11, color: Colors.textLight },
  scheduleValue: { fontSize: 12, color: Colors.textSecondary, fontWeight: '700' },

  lockedNotice: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 10 },
  lockedNoticeText: { fontSize: 11, color: Colors.textLight },

  payNowBtn: {
    marginTop: 10,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payNowBtnText: { fontSize: 14, color: Colors.white, fontWeight: '800' },
  payNowBtnAmount: { fontSize: 13, color: Colors.white, fontWeight: '700' },

  footerMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  footerDate: { fontSize: 11, color: Colors.textHint },
  footerAcademicYear: { fontSize: 11, color: Colors.textHint },
  notesText: { fontSize: 12, color: Colors.textLight, textAlign: 'right', marginTop: 8 },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    gap: 8,
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptyMsg: { fontSize: 13, color: Colors.textLight, textAlign: 'center', paddingHorizontal: 18, lineHeight: 20 },

  comingSoonBox: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  comingSoonIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  comingSoonTextWrap: { flex: 1, alignItems: 'flex-end' },
  comingSoonTitle: { fontSize: 13, fontWeight: '800', color: '#065F46', marginBottom: 2 },
  comingSoonText: { fontSize: 12, color: '#047857', textAlign: 'right' },
});

export default PaymentsScreen;
