import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
import {AuthService} from '../services/authService';
import {
  TraineeProfile,
  TraineePayment,
  PaymentStatus,
  FeeType,
} from '../types/auth';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

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
  const [selectedFilter, setSelectedFilter] = useState<PaymentStatus | 'ALL'>('ALL');

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const profileData = await AuthService.getProfile(accessToken);
      setProfile(profileData);
      setPayments(profileData.trainee.traineePayments || []);
    } catch (err) {
      const apiError = err as any;
      let errorMessage = 'Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª';
      if (apiError.statusCode === 401) {
        errorMessage = 'Ø§Ù†ØªÙ‡Øª ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„Ø¬Ù„Ø³Ø©. ÙŠØ±Ø¬Ù‰ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMakePayment = (_payment: TraineePayment) => {
    Alert.alert('Ø¯ÙØ¹ Ø§Ù„Ø±Ø³ÙˆÙ…', 'Ø³ÙŠØªÙ… Ø¥Ø¶Ø§ÙØ© Ù‡Ø°Ù‡ Ø§Ù„Ù…ÙŠØ²Ø© Ù‚Ø±ÙŠØ¨Ø§Ù‹');
  };

  const getStatusMeta = (status: PaymentStatus) => {
    switch (status) {
      case 'PENDING':
        return {label: 'معلق', color: Colors.warning, bg: Colors.warningLight, icon: '⏳'};
      case 'COMPLETED':
        return {label: 'مكتمل', color: Colors.primaryLight, bg: Colors.successLight, icon: '✅'};
      case 'CANCELLED':
        return {label: 'ملغي', color: Colors.error, bg: Colors.errorLight, icon: '✕'};
      case 'REFUNDED':
        return {label: 'مسترد', color: '#3B82F6', bg: Colors.infoLight, icon: '↩'};
      default:
        return {label: status, color: Colors.textHint, bg: Colors.background, icon: '•'};
    }
  };

  const getFeeTypeMeta = (type: FeeType) => {
    switch (type) {
      case 'REGISTRATION':
        return {label: 'Ø±Ø³ÙˆÙ… Ø§Ù„ØªØ³Ø¬ÙŠÙ„', icon: 'ðŸ“', color: '#8B5CF6'};
      case 'TUITION':
        return {label: 'Ø§Ù„Ø±Ø³ÙˆÙ… Ø§Ù„Ø¯Ø±Ø§Ø³ÙŠØ©', icon: 'ðŸŽ"', color: Colors.primary};
      case 'EXAM':
        return {label: 'Ø±Ø³ÙˆÙ… Ø§Ù„Ø§Ù…ØªØ­Ø§Ù†', icon: 'ðŸ“‹', color: '#0891B2'};
      case 'MATERIALS':
        return {label: 'Ø±Ø³ÙˆÙ… Ø§Ù„Ù…ÙˆØ§Ø¯', icon: 'ðŸ"š', color: Colors.warning};
      case 'CERTIFICATE':
        return {label: 'Ø±Ø³ÙˆÙ… Ø§Ù„Ø´Ù‡Ø§Ø¯Ø©', icon: 'ðŸ†', color: '#DB2777'};
      default:
        return {label: 'Ø£Ø®Ø±Ù‰', icon: 'ðŸ'°', color: Colors.textLight};
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

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

  const filteredPayments =
    selectedFilter === 'ALL'
      ? payments
      : payments.filter(p => p.status === selectedFilter);

  const paymentStatuses: {id: PaymentStatus | 'ALL'; label: string; emoji: string}[] = [
    {id: 'ALL', label: 'Ø§Ù„ÙƒÙ„', emoji: 'ðŸ“‹'},
    {id: PaymentStatus.PENDING, label: 'Ù…Ø¹Ù„Ù‚', emoji: 'â³'},
    {id: PaymentStatus.COMPLETED, label: 'Ù…ÙƒØªÙ…Ù„', emoji: 'âœ…'},
    {id: PaymentStatus.CANCELLED, label: 'Ù…Ù„ØºÙŠ', emoji: 'âœ•'},
    {id: PaymentStatus.REFUNDED, label: 'Ù…Ø³ØªØ±Ø¯', emoji: 'â†©'},
  ];

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payments.reduce((sum, p) => sum + p.paidAmount, 0);
  const pendingAmount = totalAmount - paidAmount;
  const completedCount = payments.filter(p => p.status === 'COMPLETED').length;
  const pendingCount = payments.filter(p => p.status === 'PENDING').length;
  const paidPct = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  /* â”€â”€â”€ Loading â”€â”€â”€ */
  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.loadingText}>Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* â”€â”€â”€ Error â”€â”€â”€ */
  if (error) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerBox}>
          <View style={s.errorIconBox}><Text style={s.errorIconTxt}>âš ï¸</Text></View>
          <Text style={s.errorTitle}>Ø®Ø·Ø£ ÙÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª</Text>
          <Text style={s.errorMsg}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadPayments}>
            <Text style={s.retryBtnText}>Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBack} style={s.backLink}>
            <Text style={s.backLinkText}>â† Ø§Ù„Ø¹ÙˆØ¯Ø©</Text>
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

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• HERO HEADER â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <View style={s.hero}>
          {/* Top bar */}
          <View style={s.heroTopBar}>
            <TouchableOpacity style={s.heroBackBtn} onPress={onBack}>
              <Text style={s.heroBackArrow}>â†’</Text>
            </TouchableOpacity>
            <View style={s.heroTitleArea}>
              <Text style={s.heroTitle}>Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª</Text>
              <Text style={s.heroSub}>Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø±Ø³ÙˆÙ… ÙˆØ§Ù„Ù…Ø³ØªØ­Ù‚Ø§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ©</Text>
            </View>
            {onNavigateToPaymentDueDates && (
              <TouchableOpacity
                style={s.heroDatesBtn}
                onPress={onNavigateToPaymentDueDates}>
                <Text style={s.heroDatesIcon}>ðŸ“…</Text>
                <Text style={s.heroDatesText}>Ø§Ù„Ù…ÙˆØ§Ø¹ÙŠØ¯</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Hero amounts */}
          <View style={s.heroAmounts}>
            <View style={s.heroAmountItem}>
              <Text style={s.heroAmountValue}>{formatCurrency(totalAmount)}</Text>
              <Text style={s.heroAmountLabel}>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨</Text>
            </View>
            <View style={s.heroAmountDivider} />
            <View style={s.heroAmountItem}>
              <Text style={[s.heroAmountValue, {color: '#34D399'}]}>
                {formatCurrency(paidAmount)}
              </Text>
              <Text style={s.heroAmountLabel}>Ø§Ù„Ù…Ø¯ÙÙˆØ¹</Text>
            </View>
            <View style={s.heroAmountDivider} />
            <View style={s.heroAmountItem}>
              <Text style={[s.heroAmountValue, {color: '#FCD34D'}]}>
                {formatCurrency(pendingAmount)}
              </Text>
              <Text style={s.heroAmountLabel}>Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={s.heroProgressArea}>
            <View style={s.heroProgressBg}>
              <View style={[s.heroProgressFill, {width: `${paidPct}%`}]} />
            </View>
            <View style={s.heroProgressLabels}>
              <Text style={s.heroProgressPct}>{paidPct}% Ù…Ø¯ÙÙˆØ¹</Text>
              <Text style={s.heroProgressPct}>{100 - paidPct}% Ù…ØªØ¨Ù‚ÙŠ</Text>
            </View>
          </View>
        </View>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• STATS ROW â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <View style={s.statsRow}>
          {[
            {num: payments.length, label: 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ', color: Colors.primary, bg: Colors.infoLight},
            {num: completedCount, label: 'Ù…ÙƒØªÙ…Ù„', color: Colors.primaryLight, bg: Colors.successLight},
            {num: pendingCount, label: 'Ù…Ø¹Ù„Ù‚', color: Colors.warning, bg: Colors.warningLight},
            {num: payments.filter(p => p.status === 'CANCELLED').length, label: 'Ù…Ù„ØºÙŠ', color: Colors.error, bg: Colors.errorLight},
          ].map((item, i) => (
            <View key={i} style={[s.statCard, {backgroundColor: item.bg}]}>
              <Text style={[s.statNum, {color: item.color}]}>{item.num}</Text>
              <Text style={[s.statLabel, {color: item.color}]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• FILTER CHIPS â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <View style={s.filterWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterContent}>
            {paymentStatuses.map(st => {
              const isActive = selectedFilter === st.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  style={[s.chip, isActive && s.chipActive]}
                  onPress={() => setSelectedFilter(st.id)}>
                  <Text style={s.chipEmoji}>{st.emoji}</Text>
                  <Text style={[s.chipText, isActive && s.chipTextActive]}>
                    {st.label}
                  </Text>
                  {isActive && (
                    <View style={s.chipCount}>
                      <Text style={s.chipCountText}>
                        {st.id === 'ALL'
                          ? payments.length
                          : payments.filter(p => p.status === st.id).length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• PAYMENTS LIST â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <View style={s.listSection}>
          <View style={s.listHeader}>
            <Text style={s.listHeaderCount}>
              {filteredPayments.length} Ø¯ÙØ¹Ø©
            </Text>
            <Text style={s.listHeaderTitle}>Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª</Text>
          </View>

          {filteredPayments.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyEmoji}>ðŸ’³</Text>
              <Text style={s.emptyTitle}>Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø¯ÙÙˆØ¹Ø§Øª</Text>
              <Text style={s.emptyMsg}>
                {selectedFilter === 'ALL'
                  ? 'Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø£ÙŠ Ù…Ø¯ÙÙˆØ¹Ø§Øª'
                  : `Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø¯ÙÙˆØ¹Ø§Øª Ø¨Ø­Ø§Ù„Ø© "${getStatusMeta(selectedFilter as PaymentStatus).label}"`}
              </Text>
            </View>
          ) : (
            <View style={s.paymentsList}>
              {filteredPayments.map(payment => {
                const statusMeta = getStatusMeta(payment.status);
                const feeMeta = getFeeTypeMeta(payment.fee.type);
                const remaining = payment.amount - payment.paidAmount;
                const payPct =
                  payment.amount > 0
                    ? Math.round((payment.paidAmount / payment.amount) * 100)
                    : 0;

                return (
                  <View
                    key={payment.id}
                    style={[s.payCard, {borderLeftColor: statusMeta.color}]}>

                    {/* Row 1: icon + title + status */}
                    <View style={s.payCardTop}>
                      <View style={[s.payTypeCircle, {backgroundColor: feeMeta.color + '18'}]}>
                        <Text style={s.payTypeIcon}>{feeMeta.icon}</Text>
                      </View>
                      <View style={s.payTitleArea}>
                        <Text style={s.payName} numberOfLines={1}>
                          {payment.fee.name}
                        </Text>
                        <Text style={[s.payFeeType, {color: feeMeta.color}]}>
                          {feeMeta.label}
                        </Text>
                      </View>
                      <View style={[s.statusBadge, {backgroundColor: statusMeta.bg}]}>
                        <Text style={s.statusBadgeEmoji}>{statusMeta.icon}</Text>
                        <Text style={[s.statusBadgeText, {color: statusMeta.color}]}>
                          {statusMeta.label}
                        </Text>
                      </View>
                    </View>

                    {/* Row 2: amounts */}
                    <View style={s.payAmountsRow}>
                      <View style={s.payAmountItem}>
                        <Text style={s.payAmountLbl}>Ø§Ù„Ù…Ø·Ù„ÙˆØ¨</Text>
                        <Text style={s.payAmountVal}>
                          {formatCurrency(payment.amount)}
                        </Text>
                      </View>
                      <View style={s.payAmountSep} />
                      <View style={s.payAmountItem}>
                        <Text style={s.payAmountLbl}>Ø§Ù„Ù…Ø¯ÙÙˆØ¹</Text>
                        <Text style={[s.payAmountVal, {color: Colors.primaryLight}]}>
                          {formatCurrency(payment.paidAmount)}
                        </Text>
                      </View>
                      {remaining > 0 && (
                        <>
                          <View style={s.payAmountSep} />
                          <View style={s.payAmountItem}>
                            <Text style={s.payAmountLbl}>Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ</Text>
                            <Text style={[s.payAmountVal, {color: Colors.warning}]}>
                              {formatCurrency(remaining)}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>

                    {/* Mini progress */}
                    {payment.amount > 0 && (
                      <View style={s.miniProgressWrap}>
                        <View style={s.miniProgressBg}>
                          <View
                            style={[
                              s.miniProgressFill,
                              {
                                width: `${payPct}%`,
                                backgroundColor: statusMeta.color,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[s.miniProgressTxt, {color: statusMeta.color}]}>
                          {payPct}%
                        </Text>
                      </View>
                    )}

                    {/* Row 3: date + academic year */}
                    <View style={s.payMeta}>
                      <View style={s.payMetaChip}>
                        <Text style={s.payMetaChipTxt}>
                          ðŸŽ“ {payment.fee.academicYear}
                        </Text>
                      </View>
                      <Text style={s.payMetaDate}>
                        ðŸ“… {formatDate(payment.createdAt)}
                      </Text>
                    </View>

                    {/* Notes */}
                    {payment.notes ? (
                      <Text style={s.payNotes} numberOfLines={2}>
                        ðŸ’¬ {payment.notes}
                      </Text>
                    ) : null}

                    {/* Pay button */}
                    {payment.status === 'PENDING' && remaining > 0 && (
                      <TouchableOpacity
                        style={s.payNowBtn}
                        onPress={() => handleMakePayment(payment)}
                        activeOpacity={0.8}>
                        <Text style={s.payNowBtnText}>ðŸ’³  Ø¯ÙØ¹ Ø§Ù„Ø¢Ù†</Text>
                        <Text style={s.payNowBtnAmount}>
                          {formatCurrency(remaining)}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STYLES
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scroll: {flex: 1},
  scrollContent: {paddingBottom: 32},

  /* Loading / Error */
  centerBox: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32},
  loadingText: {marginTop: 14, fontSize: 15, color: Colors.textLight},
  errorIconBox: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.errorLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  errorIconTxt: {fontSize: 32},
  errorTitle: {fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8},
  errorMsg: {fontSize: 14, color: Colors.textLight, textAlign: 'center', lineHeight: 22, marginBottom: 24},
  retryBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 14, marginBottom: 12,
    shadowColor: Colors.primary, shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  retryBtnText: {color: Colors.white, fontSize: 15, fontWeight: '700'},
  backLink: {paddingVertical: 8},
  backLinkText: {color: Colors.primary, fontSize: 14, fontWeight: '600'},

  /* â”€â”€ Hero â”€â”€ */
  hero: {
    backgroundColor: Colors.primaryDark,
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  heroBackBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBackArrow: {fontSize: 18, color: Colors.white, fontWeight: '700'},
  heroTitleArea: {flex: 1, alignItems: 'flex-end', marginRight: 12},
  heroTitle: {fontSize: 22, fontWeight: '800', color: Colors.white},
  heroSub: {fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2},
  heroDatesBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  heroDatesIcon: {fontSize: 16},
  heroDatesText: {fontSize: 12, color: Colors.white, fontWeight: '600'},

  heroAmounts: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16, padding: 16, marginBottom: 16,
  },
  heroAmountItem: {flex: 1, alignItems: 'center'},
  heroAmountValue: {fontSize: 15, fontWeight: '800', color: Colors.white, marginBottom: 4},
  heroAmountLabel: {fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '500'},
  heroAmountDivider: {width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)'},

  heroProgressArea: {gap: 6},
  heroProgressBg: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4, overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%', backgroundColor: '#34D399', borderRadius: 4,
  },
  heroProgressLabels: {flexDirection: 'row', justifyContent: 'space-between'},
  heroProgressPct: {fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600'},

  /* â”€â”€ Stats Row â”€â”€ */
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: -14,
    marginBottom: 16,
  },
  statCard: {
    flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statNum: {fontSize: 20, fontWeight: '800'},
  statLabel: {fontSize: 11, fontWeight: '600', marginTop: 2},

  /* â”€â”€ Filter â”€â”€ */
  filterWrap: {marginBottom: 16, paddingLeft: 16},
  filterContent: {gap: 8, paddingRight: 16},
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.borderMedium,
  },
  chipActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  chipEmoji: {fontSize: 14},
  chipText: {fontSize: 13, fontWeight: '600', color: Colors.textLight},
  chipTextActive: {color: Colors.white},
  chipCount: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 10, minWidth: 22, alignItems: 'center',
  },
  chipCountText: {fontSize: 11, fontWeight: '700', color: Colors.white},

  /* â”€â”€ List â”€â”€ */
  listSection: {paddingHorizontal: 16},
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  listHeaderTitle: {fontSize: 17, fontWeight: '700', color: Colors.textPrimary},
  listHeaderCount: {
    fontSize: 13, fontWeight: '600', color: Colors.primary,
    backgroundColor: Colors.infoLight, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 10,
  },
  paymentsList: {gap: 12},

  /* â”€â”€ Payment Card â”€â”€ */
  payCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  payCardTop: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 14,
  },
  payTypeCircle: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  payTypeIcon: {fontSize: 22},
  payTitleArea: {flex: 1},
  payName: {fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right'},
  payFeeType: {fontSize: 12, fontWeight: '600', textAlign: 'right', marginTop: 2},
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  statusBadgeEmoji: {fontSize: 12},
  statusBadgeText: {fontSize: 12, fontWeight: '700'},

  payAmountsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 12,
    padding: 12, marginBottom: 10,
  },
  payAmountItem: {flex: 1, alignItems: 'center'},
  payAmountLbl: {fontSize: 11, color: Colors.textHint, fontWeight: '500', marginBottom: 4},
  payAmountVal: {fontSize: 14, fontWeight: '700', color: Colors.textPrimary},
  payAmountSep: {width: 1, height: 32, backgroundColor: Colors.borderMedium},

  miniProgressWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  miniProgressBg: {
    flex: 1, height: 6, backgroundColor: Colors.borderMedium,
    borderRadius: 3, overflow: 'hidden',
  },
  miniProgressFill: {height: '100%', borderRadius: 3},
  miniProgressTxt: {fontSize: 11, fontWeight: '700', minWidth: 34, textAlign: 'right'},

  payMeta: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  payMetaChip: {
    backgroundColor: Colors.background, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 8,
  },
  payMetaChipTxt: {fontSize: 12, color: Colors.textSecondary, fontWeight: '600'},
  payMetaDate: {fontSize: 12, color: Colors.textHint},

  payNotes: {
    fontSize: 12, color: Colors.textHint, fontStyle: 'italic',
    textAlign: 'right', lineHeight: 18, marginTop: 6,
  },

  payNowBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 12, marginTop: 12,
    shadowColor: Colors.primaryLight, shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  payNowBtnText: {fontSize: 15, fontWeight: '700', color: Colors.white},
  payNowBtnAmount: {fontSize: 14, fontWeight: '800', color: Colors.white},

  /* â”€â”€ Empty â”€â”€ */
  emptyBox: {
    alignItems: 'center', paddingVertical: 48,
    backgroundColor: Colors.white, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.borderMedium,
  },
  emptyEmoji: {fontSize: 56, marginBottom: 16},
  emptyTitle: {fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8},
  emptyMsg: {
    fontSize: 14, color: Colors.textHint, textAlign: 'center',
    lineHeight: 22, paddingHorizontal: 24,
  },
});

export default PaymentsScreen;
