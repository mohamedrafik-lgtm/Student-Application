// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles payments display and management
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
import { AuthService } from '../services/authService';
import { TraineeProfile, TraineePayment, PaymentStatus, FeeType } from '../types/auth';
import { Colors } from '../styles/colors';
import CustomButton from '../components/CustomButton';

const { width, height } = Dimensions.get('window');

interface PaymentsScreenProps {
  accessToken: string;
  onBack: () => void;
}

const PaymentsScreen: React.FC<PaymentsScreenProps> = ({ 
  accessToken, 
  onBack 
}) => {
  const [profile, setProfile] = useState<TraineeProfile | null>(null);
  const [payments, setPayments] = useState<TraineePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<PaymentStatus | 'ALL'>('ALL');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    loadPayments();
  }, []);

  useEffect(() => {
    if (payments.length > 0) {
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
  }, [payments]);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Loading payments...');
      const profileData = await AuthService.getProfile(accessToken);
      console.log('✅ Payments loaded successfully:', profileData);
      
      setProfile(profileData);
      setPayments(profileData.trainee.traineePayments || []);
    } catch (error) {
      console.error('❌ Failed to load payments:', error);
      const apiError = error as any;
      
      let errorMessage = 'حدث خطأ أثناء تحميل المدفوعات';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
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

  const handleViewPaymentDetails = (payment: TraineePayment) => {
    Alert.alert('تفاصيل الدفع', `تفاصيل الدفع لـ ${payment.fee.name}`);
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
        return Colors.warning;
      case 'COMPLETED':
        return Colors.success;
      case 'CANCELLED':
        return Colors.error;
      case 'REFUNDED':
        return Colors.info;
      default:
        return Colors.textSecondary;
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

  const filteredPayments = selectedFilter === 'ALL' 
    ? payments 
    : payments.filter(payment => payment.status === selectedFilter);

  const paymentStatuses: (PaymentStatus | 'ALL')[] = [
    'ALL',
    PaymentStatus.PENDING,
    PaymentStatus.COMPLETED,
    PaymentStatus.CANCELLED,
    PaymentStatus.REFUNDED
  ];

  // Calculate totals
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const paidAmount = payments.reduce((sum, payment) => sum + payment.paidAmount, 0);
  const pendingAmount = totalAmount - paidAmount;
  const completedPayments = payments.filter(p => p.status === 'COMPLETED').length;
  const pendingPayments = payments.filter(p => p.status === 'PENDING').length;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>جاري تحميل المدفوعات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>خطأ في تحميل المدفوعات</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <CustomButton
            title="إعادة المحاولة"
            onPress={loadPayments}
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
              <Text style={styles.headerTitle}>المدفوعات</Text>
              <View style={styles.headerUnderline} />
            </View>
            
            <TouchableOpacity style={styles.historyButton} onPress={handlePaymentHistory}>
              <View style={styles.historyButtonIcon}>
                <Text style={styles.historyButtonText}>📊</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Combined Payment Summary & Stats */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>ملخص المدفوعات</Text>
            </View>
            
            {/* Financial Summary */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{formatCurrency(totalAmount)}</Text>
                <Text style={styles.summaryLabel}>إجمالي المطلوب</Text>
              </View>
              
              <View style={styles.summaryDivider} />
              
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: Colors.success }]}>
                  {formatCurrency(paidAmount)}
                </Text>
                <Text style={styles.summaryLabel}>المدفوع</Text>
              </View>
              
              <View style={styles.summaryDivider} />
              
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: Colors.warning }]}>
                  {formatCurrency(pendingAmount)}
                </Text>
                <Text style={styles.summaryLabel}>المتبقي</Text>
              </View>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(paidAmount / totalAmount) * 100}%` }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round((paidAmount / totalAmount) * 100)}% مكتمل
              </Text>
            </View>

            {/* Payment Stats - Integrated */}
            <View style={styles.integratedStatsContainer}>
              <View style={styles.integratedStatItem}>
                <Text style={styles.integratedStatNumber}>{payments.length}</Text>
                <Text style={styles.integratedStatLabel}>إجمالي المدفوعات</Text>
              </View>
              <View style={styles.integratedStatDivider} />
              <View style={styles.integratedStatItem}>
                <Text style={[styles.integratedStatNumber, { color: Colors.success }]}>
                  {completedPayments}
                </Text>
                <Text style={styles.integratedStatLabel}>مكتملة</Text>
              </View>
              <View style={styles.integratedStatDivider} />
              <View style={styles.integratedStatItem}>
                <Text style={[styles.integratedStatNumber, { color: Colors.warning }]}>
                  {pendingPayments}
                </Text>
                <Text style={styles.integratedStatLabel}>معلقة</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Filter Section */}
        <Animated.View style={[
          styles.filterSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>تصفية المدفوعات</Text>
            <View style={styles.sectionTitleUnderline} />
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {paymentStatuses.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  selectedFilter === status && styles.filterChipActive
                ]}
                onPress={() => setSelectedFilter(status)}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedFilter === status && styles.filterChipTextActive
                ]}>
                  {status === 'ALL' ? 'الكل' : getPaymentStatusText(status as PaymentStatus)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Payments List */}
        <Animated.View style={[
          styles.paymentsSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              المدفوعات ({filteredPayments.length})
            </Text>
            <View style={styles.sectionTitleUnderline} />
          </View>
          
          {filteredPayments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>💰</Text>
              <Text style={styles.emptyStateTitle}>لا توجد مدفوعات</Text>
              <Text style={styles.emptyStateMessage}>
                {selectedFilter === 'ALL' 
                  ? 'لم يتم العثور على أي مدفوعات'
                  : `لا توجد مدفوعات بحالة ${getPaymentStatusText(selectedFilter as PaymentStatus)}`
                }
              </Text>
            </View>
          ) : (
            <View style={styles.paymentsGrid}>
              {filteredPayments.map((payment, index) => (
                <Animated.View
                  key={payment.id}
                  style={[
                    styles.paymentCard,
                    {
                      opacity: fadeAnim,
                      transform: [
                        { translateY: slideAnim },
                        { scale: scaleAnim }
                      ]
                    }
                  ]}
                >
                  <View style={styles.paymentCardGradient} />
                  
                  <View style={styles.paymentHeader}>
                    <View style={styles.paymentIcon}>
                      <Text style={styles.paymentIconText}>
                        {getFeeTypeIcon(payment.fee.type)}
                      </Text>
                    </View>
                    
                    <View style={styles.paymentStatus}>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getPaymentStatusColor(payment.status) }
                      ]}>
                        <Text style={styles.statusBadgeText}>
                          {getPaymentStatusText(payment.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.paymentContent}>
                    <Text style={styles.paymentTitle}>
                      {payment.fee.name}
                    </Text>
                    
                    <Text style={styles.paymentType}>
                      {getFeeTypeText(payment.fee.type)}
                    </Text>
                    
                    <View style={styles.paymentAmounts}>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>المبلغ المطلوب:</Text>
                        <Text style={styles.amountValue}>
                          {formatCurrency(payment.amount)}
                        </Text>
                      </View>
                      
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>المبلغ المدفوع:</Text>
                        <Text style={[styles.amountValue, { color: Colors.success }]}>
                          {formatCurrency(payment.paidAmount)}
                        </Text>
                      </View>
                      
                      {payment.amount > payment.paidAmount && (
                        <View style={styles.amountRow}>
                          <Text style={styles.amountLabel}>المتبقي:</Text>
                          <Text style={[styles.amountValue, { color: Colors.warning }]}>
                            {formatCurrency(payment.amount - payment.paidAmount)}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.paymentDetails}>
                      <Text style={styles.paymentDetail}>
                        📅 {formatDate(payment.createdAt)}
                      </Text>
                      <Text style={styles.paymentDetail}>
                        🎓 {payment.fee.academicYear}
                      </Text>
                    </View>
                    
                    {payment.notes && (
                      <Text style={styles.paymentNotes} numberOfLines={2}>
                        {payment.notes}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.paymentActions}>
                    {payment.status === 'PENDING' && payment.amount > payment.paidAmount && (
                      <TouchableOpacity
                        style={styles.payButton}
                        onPress={() => handleMakePayment(payment)}
                      >
                        <Text style={styles.payButtonText}>💳 دفع الآن</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              ))}
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
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.cardBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  backButtonIcon: {
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  backButtonLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
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
  historyButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: Colors.info,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  historyButtonIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyButtonText: {
    fontSize: 16,
  },
  summaryCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  summaryHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(99, 102, 241, 0.1)',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
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
  integratedStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  integratedStatItem: {
    alignItems: 'center',
  },
  integratedStatNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 4,
  },
  integratedStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  integratedStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.borderLight,
  },
  filterSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  sectionTitleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  filterScrollContent: {
    paddingHorizontal: 4,
  },
  filterChip: {
    backgroundColor: Colors.cardBackground,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  paymentsSection: {
    marginBottom: 32,
  },
  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  paymentsGrid: {
    gap: 16,
  },
  paymentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  paymentCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.primary,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIconText: {
    fontSize: 24,
  },
  paymentStatus: {
    alignItems: 'center',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  paymentContent: {
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'right',
  },
  paymentType: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    textAlign: 'right',
  },
  paymentAmounts: {
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentDetail: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
  },
  paymentNotes: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'right',
    lineHeight: 18,
  },
  paymentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  payButton: {
    width: '100%',
    backgroundColor: Colors.success,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default PaymentsScreen;
