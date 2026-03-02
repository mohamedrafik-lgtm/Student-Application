// Screen for creating enrollment proof request
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestsService } from '../services/requestsService';
import { RequestType, CreateTraineeRequestDto } from '../types/requests';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
import ScreenHeader from '../components/shared/ScreenHeader';

interface EnrollmentProofScreenProps {
  accessToken: string;
  onBack: () => void;
}

const EnrollmentProofScreen: React.FC<EnrollmentProofScreenProps> = ({ accessToken, onBack }) => {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { Alert.alert('خطأ', 'يرجى كتابة سبب الطلب'); return; }
    try {
      setIsLoading(true);
      const requestData: CreateTraineeRequestDto = { type: RequestType.ENROLLMENT_PROOF, reason: reason.trim() };
      const response = await requestsService.createTraineeRequest(requestData, accessToken);
      if (response.success) {
        setReason('');
        Alert.alert('نجح', response.message || 'تم إرسال طلب إثبات القيد بنجاح', [{ text: 'موافق', onPress: () => onBack() }]);
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في إرسال الطلب');
    } finally { setIsLoading(false); }
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScreenHeader title="طلب إثبات قيد" subtitle="تقديم طلب إثبات قيد رسمي" onBack={onBack} />
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.formCard}>
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>سبب الطلب *</Text>
            <CustomInput value={reason} onChangeText={setReason} placeholder="مثالاً: مطلوب من الجهة المختصة، توثيق الحالة التدريبية..." multiline numberOfLines={6} textAlignVertical="top" />
          </View>
          <View style={s.buttonsRow}>
            <View style={s.btnWrap}><CustomButton title="إرسال" onPress={handleSubmit} loading={isLoading} variant="primary" size="large" /></View>
            <View style={s.btnWrap}><CustomButton title="إلغاء" onPress={onBack} variant="outline" size="large" /></View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { display: 'none' as any },
  headerRow: { display: 'none' as any },
  headerTitleArea: { display: 'none' as any },
  headerTitle: { fontSize: 0 },
  headerSubtitle: { fontSize: 0 },
  backBtn: { display: 'none' as any },
  backBtnText: { fontSize: 0 },
  headerSpacer: { display: 'none' as any },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  formCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 20,
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 14, elevation: 4,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  fieldGroup: { marginBottom: 24 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10, textAlign: 'right' },
  buttonsRow: { gap: 10, marginTop: 8 },
  btnWrap: { marginBottom: 4 },
});

export default EnrollmentProofScreen;
