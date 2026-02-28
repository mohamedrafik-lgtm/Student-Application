// CreatePaymentDeferralScreen – form to create a payment deferral request
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_CONFIG } from '../services/apiConfig';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';

interface CreatePaymentDeferralScreenProps {
  accessToken: string;
  traineeId?: number;
  onBack: () => void;
}

const CreatePaymentDeferralScreen: React.FC<CreatePaymentDeferralScreenProps> = ({
  accessToken, traineeId, onBack,
}) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [extensionDays, setExtensionDays] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [showFeePicker, setShowFeePicker] = useState(false);

  useEffect(() => { loadPayments(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const loadPayments = async () => {
    if (!traineeId) return;
    try {
      setIsLoadingPayments(true);
      const url = `${API_CONFIG.BASE_URL}/api/finances/trainees/${traineeId}/payments`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });
      if (response.ok) { const data = await response.json(); setPayments(data); }
      else Alert.alert('خطأ', 'فشل في تحميل قائمة الرسوم');
    } catch { Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات'); }
    finally { setIsLoadingPayments(false); }
  };

  const handleSubmit = async () => {
    if (!selectedPaymentId) { Alert.alert('خطأ', 'يرجى اختيار الرسم المطلوب تأجيله'); return; }
    if (!extensionDays || isNaN(Number(extensionDays))) { Alert.alert('خطأ', 'يرجى إدخال عدد الأيام'); return; }
    const days = Number(extensionDays);
    if (days < 1 || days > 90) { Alert.alert('خطأ', 'عدد الأيام يجب أن يكون بين 1 و 90'); return; }
    if (!reason.trim()) { Alert.alert('خطأ', 'يرجى كتابة سبب التأجيل'); return; }
    try {
      setIsLoading(true);
      Alert.alert('قريباً', 'سيتم إضافة الاتصال بالـ API');
    } finally { setIsLoading(false); }
  };

  const selectedPayment = payments.find(p => p.id === selectedPaymentId);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={s.backBtn}>
          <Text style={s.backIcon}>→</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginRight: 14 }}>
          <Text style={s.headerTitle}>طلب تأجيل سداد</Text>
          <Text style={s.headerSub}>قدم طلب تأجيل موعد سداد أحد الرسوم</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll}>
        <View style={s.formCard}>
          {/* Fee Select */}
          <Text style={s.label}>الرسم المطلوب تأجيله *</Text>
          <TouchableOpacity style={s.selectBox} onPress={() => setShowFeePicker(!showFeePicker)}>
            <Text style={[s.selectText, !selectedPaymentId && { color: '#8E95A2' }]}>
              {selectedPayment ? `${selectedPayment.fee.name} - ${selectedPayment.fee.amount} جنيه` : '-- اختر الرسم --'}
            </Text>
            <Text style={{ fontSize: 12, color: '#8E95A2' }}>▼</Text>
          </TouchableOpacity>

          {/* Picker List */}
          {showFeePicker && (
            <ScrollView style={s.pickerList} showsVerticalScrollIndicator nestedScrollEnabled>
              {isLoadingPayments ? (
                <ActivityIndicator color="#2563EB" style={{ marginVertical: 20 }} />
              ) : (
                payments.map((p, i) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[s.pickerItem, i === payments.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => { setSelectedPaymentId(p.id); setShowFeePicker(false); }}
                  >
                    <Text style={s.pickerName}>{p.fee.name}</Text>
                    <View style={s.pickerAmountBadge}>
                      <Text style={s.pickerAmount}>{p.fee.amount} جنيه</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}

          {/* Days */}
          <Text style={[s.label, { marginTop: 20 }]}>عدد الأيام المطلوب تأجيلها *</Text>
          <CustomInput value={extensionDays} onChangeText={setExtensionDays} placeholder="14" keyboardType="numeric" />
          <Text style={s.hint}>الحد الأقصى 90 يوم</Text>

          {/* Reason */}
          <Text style={[s.label, { marginTop: 20 }]}>سبب طلب التأجيل *</Text>
          <CustomInput
            value={reason} onChangeText={setReason}
            placeholder="اكتب سبب طلب التأجيل بوضوح..."
            multiline numberOfLines={6} textAlignVertical="top"
          />
          <Text style={s.hint}>يجب أن يكون السبب واضحاً ومحدداً</Text>

          {/* Info */}
          <View style={s.infoBox}>
            <Text style={s.infoTitle}>ℹ️ ملاحظات هامة:</Text>
            <Text style={s.infoItem}>• سيتم مراجعة طلبك من قبل الإدارة</Text>
            <Text style={s.infoItem}>• سيتطلب النتيجة المراجعة من قبل الماليات</Text>
            <Text style={s.infoItem}>• في حالة القبول، سيتم تأجيل الموعد تلقائياً</Text>
            <Text style={s.infoItem}>• بإمكانك متابعة حالة طلبك من صفحة الطلبات</Text>
          </View>

          {/* Buttons */}
          <CustomButton title="إرسال الطلب" onPress={handleSubmit} loading={isLoading} variant="primary" size="large" />
          <View style={{ height: 12 }} />
          <CustomButton title="إلغاء" onPress={onBack} variant="outline" size="large" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#EEF2F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F0F4FF', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 18, color: '#2563EB', fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1A1D26', textAlign: 'right' },
  headerSub: { fontSize: 12, color: '#8E95A2', textAlign: 'right', marginTop: 2 },
  scroll: { padding: 18, paddingBottom: 32 },
  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#EEF2F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  label: { fontSize: 14, fontWeight: '700', color: '#1A1D26', marginBottom: 10, textAlign: 'right' },
  hint: { fontSize: 11, color: '#8E95A2', marginTop: 6, textAlign: 'right', fontStyle: 'italic' },
  selectBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#EEF2F6', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 14, backgroundColor: '#FAFBFD',
  },
  selectText: { fontSize: 14, color: '#1A1D26', fontWeight: '600', flex: 1, textAlign: 'right' },
  pickerList: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#2563EB',
    marginTop: 8, marginBottom: 8, maxHeight: 260,
  },
  pickerItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F4F6FA',
  },
  pickerName: { fontSize: 14, color: '#1A1D26', fontWeight: '600', flex: 1, textAlign: 'right' },
  pickerAmountBadge: { backgroundColor: '#E8FAF0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pickerAmount: { fontSize: 12, color: '#10B981', fontWeight: '700' },
  infoBox: {
    backgroundColor: '#EBF5FF', borderRadius: 12, padding: 16, marginTop: 20, marginBottom: 20,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#2563EB', marginBottom: 10, textAlign: 'right' },
  infoItem: { fontSize: 12, color: '#1E40AF', textAlign: 'right', lineHeight: 20, marginBottom: 4 },
});

export default CreatePaymentDeferralScreen;
