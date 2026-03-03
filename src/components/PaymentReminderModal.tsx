// PaymentReminderModal – تذكير الطالب بموعد سداد القسط القادم
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { Colors } from '../styles/colors';
import { TraineePayment } from '../types/auth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PaymentReminderModalProps {
  visible: boolean;
  payment: TraineePayment | null;
  daysRemaining: number;
  onClose: () => void;
  onViewDetails: () => void;
}

const PaymentReminderModal: React.FC<PaymentReminderModalProps> = ({
  visible, payment, daysRemaining, onClose, onViewDetails,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      fadeAnim.setValue(0);
    }
  }, [visible, scaleAnim, fadeAnim]);

  if (!payment) { return null; }

  const remaining = payment.amount - payment.paidAmount;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch { return dateString; }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <Animated.View style={[s.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {/* Close button */}
          <TouchableOpacity style={s.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* Bell icon with badge */}
          <View style={s.bellWrapper}>
            <View style={s.bellCircle}>
              <Text style={s.bellIcon}>🔔</Text>
            </View>
            <View style={s.bellBadge}>
              <Text style={s.bellBadgeText}>{daysRemaining}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={s.title}>🚨 تذكير بالدفع</Text>
          <Text style={s.subtitle}>متبقي {daysRemaining} يوم فقط</Text>

          {/* Info Cards Grid */}
          <View style={s.cardsGrid}>
            {/* الرسوم المطلوبة */}
            <View style={[s.infoCard, s.infoCardLarge]}>
              <View style={s.infoCardHeader}>
                <Text style={s.infoCardHeaderIcon}>⚙️</Text>
                <Text style={s.infoCardLabel}>الرسوم المطلوبة</Text>
              </View>
              <Text style={s.infoCardValueBold} numberOfLines={2}>{payment.fee.name}</Text>
            </View>

            {/* المبلغ المتبقي */}
            <View style={s.infoCard}>
              <View style={s.infoCardHeader}>
                <Text style={s.infoCardHeaderIcon}>💰</Text>
                <Text style={s.infoCardLabel}>المبلغ المتبقي</Text>
              </View>
              <Text style={s.infoCardAmount}>{formatCurrency(remaining)} <Text style={s.currencyUnit}>ج.م</Text></Text>
            </View>

            {/* متبقي */}
            <View style={s.infoCard}>
              <View style={s.infoCardHeader}>
                <Text style={s.infoCardHeaderIcon}>⏳</Text>
                <Text style={s.infoCardLabel}>متبقي</Text>
              </View>
              <Text style={s.infoCardDays}>{daysRemaining}</Text>
              <Text style={s.infoCardDaysUnit}>يوم</Text>
            </View>

            {/* الموعد النهائي */}
            <View style={[s.infoCard, s.infoCardLarge]}>
              <View style={s.infoCardHeader}>
                <Text style={s.infoCardHeaderIcon}>📅</Text>
                <Text style={s.infoCardLabel}>الموعد النهائي</Text>
              </View>
              <Text style={s.infoCardDate}>{payment.dueDate ? formatDate(payment.dueDate) : '—'}</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={s.buttonsRow}>
            <TouchableOpacity style={s.primaryBtn} onPress={onViewDetails} activeOpacity={0.85}>
              <Text style={s.primaryBtnText}>💲  عرض التفاصيل والدفع  →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.secondaryBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={s.secondaryBtnText}>سأتذكر لاحقاً</Text>
            </TouchableOpacity>
          </View>

          {/* Footer hint */}
          <Text style={s.footerHint}>💡 يمكنك الدفع على دفعات متعددة • للاستفسار اتصل بالمركز</Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: SCREEN_WIDTH - 40,
    maxWidth: 420,
    backgroundColor: Colors.white,
    borderRadius: 28,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },

  // Close
  closeBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 16,
    color: Colors.textLight,
    fontWeight: '600',
  },

  // Bell
  bellWrapper: {
    marginBottom: 16,
    position: 'relative',
  },
  bellCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: 34,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.info,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  bellBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.white,
  },

  // Title
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
  },

  // Cards Grid
  cardsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E0EAFF',
    alignItems: 'center',
  },
  infoCardLarge: {
    minWidth: '45%',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  infoCardHeaderIcon: {
    fontSize: 14,
  },
  infoCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textLight,
  },
  infoCardValueBold: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoCardAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.info,
  },
  currencyUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  infoCardDays: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.info,
  },
  infoCardDaysUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
    marginTop: -2,
  },
  infoCardDate: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Buttons
  buttonsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  primaryBtn: {
    flex: 1.3,
    backgroundColor: Colors.info,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.info,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderMedium,
  },
  secondaryBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Footer
  footerHint: {
    fontSize: 11,
    color: Colors.textHint,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default PaymentReminderModal;
