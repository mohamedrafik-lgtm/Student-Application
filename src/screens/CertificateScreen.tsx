// Screen for creating certificate request
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestsService } from '../services/requestsService';
import { RequestType, CreateTraineeRequestDto } from '../types/requests';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';

interface CertificateScreenProps {
  accessToken: string;
  onBack: () => void;
}

const CertificateScreen: React.FC<CertificateScreenProps> = ({ accessToken, onBack }) => {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { Alert.alert('خطأ', 'يرجى كتابة سبب الطلب'); return; }
    try {
      setIsLoading(true);
      const requestData: CreateTraineeRequestDto = { type: RequestType.CERTIFICATE, reason: reason.trim() };
      const response = await requestsService.createTraineeRequest(requestData, accessToken);
      if (response.success) {
        setReason('');
        Alert.alert('نجح', response.message || 'تم إرسال طلب الإفادة بنجاح', [{ text: 'موافق', onPress: () => onBack() }]);
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في إرسال الطلب');
    } finally { setIsLoading(false); }
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={s.headerSpacer} />
          <View style={s.headerTitleArea}>
            <Text style={s.headerTitle}>طلب إفادة</Text>
            <Text style={s.headerSubtitle}>تقديم طلب إفادة رسمية</Text>
          </View>
          <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backBtnText}>→</Text></TouchableOpacity>
        </View>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.formCard}>
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>سبب الطلب *</Text>
            <CustomInput value={reason} onChangeText={setReason} placeholder="مثالاً: للتقديم في دورة، للجهات الرسمية، إلخ..." multiline numberOfLines={6} textAlignVertical="top" />
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
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  header: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#EEF2F6' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTitleArea: { flex: 1, alignItems: 'flex-end', marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1D26', textAlign: 'right' },
  headerSubtitle: { fontSize: 13, color: '#8E95A2', marginTop: 4, textAlign: 'right' },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F4F6FA', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 20, color: '#1A1D26', fontWeight: '600' },
  headerSpacer: { width: 38 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  formCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  fieldGroup: { marginBottom: 24 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#1A1D26', marginBottom: 10, textAlign: 'right' },
  buttonsRow: { gap: 10, marginTop: 8 },
  btnWrap: { marginBottom: 4 },
});

export default CertificateScreen;
