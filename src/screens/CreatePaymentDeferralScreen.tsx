// Screen for creating payment deferral request

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';
import { API_CONFIG } from '../services/apiConfig';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';

interface CreatePaymentDeferralScreenProps {
  accessToken: string;
  traineeId?: number;
  onBack: () => void;
}

const CreatePaymentDeferralScreen: React.FC<CreatePaymentDeferralScreenProps> = ({
  accessToken,
  traineeId,
  onBack
}) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [extensionDays, setExtensionDays] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [showFeePicker, setShowFeePicker] = useState(false);

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPayments = async () => {
    if (!traineeId) {
      console.warn('⚠️ traineeId not provided');
      return;
    }

    try {
      setIsLoadingPayments(true);
      
      const url = `${API_CONFIG.BASE_URL}/api/finances/trainees/${traineeId}/payments`;
      console.log('🔍 Loading trainee payments from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Payments loaded:', data.length);
        setPayments(data);
      } else {
        console.error('❌ Failed to load payments:', response.status);
        Alert.alert('خطأ', 'فشل في تحميل قائمة الرسوم');
      }
    } catch (error) {
      console.error('❌ Error loading payments:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedPaymentId) {
      Alert.alert('خطأ', 'يرجى اختيار الرسم المطلوب تأجيله');
      return;
    }
    if (!extensionDays || isNaN(Number(extensionDays))) {
      Alert.alert('خطأ', 'يرجى إدخال عدد الأيام');
      return;
    }
    const days = Number(extensionDays);
    if (days < 1 || days > 90) {
      Alert.alert('خطأ', 'عدد الأيام يجب أن يكون بين 1 و 90');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('خطأ', 'يرجى كتابة سبب التأجيل');
      return;
    }

    try {
      setIsLoading(true);
      // TODO: إرسال للـ API
      // POST /api/deferral-requests
      Alert.alert('قريباً', 'سيتم إضافة الاتصال بالـ API');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPayment = payments.find(p => p.id === selectedPaymentId);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <View style={styles.backButtonContainer}>
            <Text style={styles.backButtonText}>←</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>طلب تأجيل سداد</Text>
          <Text style={styles.headerSubtitle}>قدم طلب تأجيل موعد سداد أحد الرسوم</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          {/* Fee Select Box */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>الرسم المطلوب تأجيله *</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setShowFeePicker(!showFeePicker)}
            >
              <Text style={[styles.selectText, !selectedPaymentId && styles.selectPlaceholder]}>
                {selectedPayment
                  ? `${selectedPayment.fee.name} - ${selectedPayment.fee.amount} جنيه`
                  : '-- اختر الرسم --'
                }
              </Text>
              <Text style={styles.selectIcon}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Picker List */}
          {showFeePicker && (
            <ScrollView
              style={styles.pickerSection}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {isLoadingPayments ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
              ) : (
                payments.map((payment, index) => (
                  <TouchableOpacity
                    key={payment.id}
                    style={[
                      styles.pickerItem,
                      index === payments.length - 1 && styles.pickerItemLast
                    ]}
                    onPress={() => {
                      setSelectedPaymentId(payment.id);
                      setShowFeePicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>
                      {payment.fee.name}
                    </Text>
                    <Text style={styles.pickerItemAmount}>
                      {payment.fee.amount} جنيه
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}

          {/* Extension Days */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>عدد الأيام المطلوب تأجيلها *</Text>
            <CustomInput
              value={extensionDays}
              onChangeText={setExtensionDays}
              placeholder="14"
              keyboardType="numeric"
            />
            <Text style={styles.hint}>الحد الأقصى 90 يوم</Text>
          </View>

          {/* Reason */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>سبب طلب التأجيل *</Text>
            <CustomInput
              value={reason}
              onChangeText={setReason}
              placeholder="اكتب سبب طلب التأجيل بوضوح (مثال: ظروف صحية، ظروف عائلية، ظروف مادية مؤقتة...)"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={styles.hint}>يجب أن يكون السبب واضحاً ومحدداً</Text>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>ℹ️ ملاحظات هامة:</Text>
            <View style={styles.infoList}>
              <Text style={styles.infoItem}>• سيتم مراجعة طلبك من قبل الإدارة</Text>
              <Text style={styles.infoItem}>• سيتطلب النتيجة المراجعة من قبل الماليات</Text>
              <Text style={styles.infoItem}>• في حالة القبول، سيتم تأجيل الموعد تلقائياً</Text>
              <Text style={styles.infoItem}>• بإمكانك متابعة حالة طلبك من صفحة الطلبات</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <CustomButton
              title="إرسال الطلب"
              onPress={handleSubmit}
              loading={isLoading}
              variant="primary"
              size="large"
            />
            <View style={{ height: 12 }} />
            <CustomButton
              title="إلغاء"
              onPress={onBack}
              variant="outline"
              size="large"
            />
          </View>
        </View>
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
    paddingVertical: 16,
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'right',
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 54,
  },
  selectText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  selectPlaceholder: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  selectIcon: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  pickerSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: 20,
    maxHeight: 300,
    overflow: 'hidden',
  },
  pickerLoading: {
    padding: 20,
    alignItems: 'center',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerItemLast: {
    borderBottomWidth: 0,
  },
  pickerItemText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  pickerItemAmount: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '800',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  noDataText: {
    padding: 20,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 12,
    textAlign: 'right',
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    fontSize: 13,
    color: '#0C4A6E',
    textAlign: 'right',
    lineHeight: 20,
  },
  buttonsContainer: {
    marginTop: 8,
  },
});

export default CreatePaymentDeferralScreen;