// Screen for creating sick leave request
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestsService } from '../services/requestsService';
import { RequestType, CreateTraineeRequestDto } from '../types/requests';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';

interface SickLeaveScreenProps {
  accessToken: string;
  onBack: () => void;
}

const SickLeaveScreen: React.FC<SickLeaveScreenProps> = ({ accessToken, onBack }) => {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  const handleFileUpload = () => {
    Alert.alert(
      'رفع ملف',
      'ميزة رفع الملفات ستكون متاحة قريباً. حالياً يمكنك إرسال الطلب بدون مرفقات.',
      [{ text: 'حسناً' }]
    );
  };

  const handleSubmit = async () => {
    if (!reason.trim()) { Alert.alert('خطأ', 'يرجى كتابة سبب الطلب'); return; }
    try {
      setIsLoading(true);
      const requestData: CreateTraineeRequestDto = {
        type: RequestType.SICK_LEAVE,
        reason: reason.trim(),
        ...(attachmentUrl && { attachmentUrl }),
      };
      const response = await requestsService.createTraineeRequest(requestData, accessToken);
      if (response.success) {
        setReason('');
        setAttachmentUrl(null);
        Alert.alert('نجح', response.message || 'تم إرسال طلب الإجازة المرضية بنجاح', [{ text: 'موافق', onPress: () => onBack() }]);
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
            <Text style={s.headerTitle}>طلب إجازة مرضية</Text>
            <Text style={s.headerSubtitle}>تقديم طلب إجازة مرضية مع المستندات</Text>
          </View>
          <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backBtnText}>→</Text></TouchableOpacity>
        </View>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.formCard}>
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>سبب الإجازة المرضية *</Text>
            <CustomInput value={reason} onChangeText={setReason} placeholder="اكتب سبب الإجازة المرضية بالتفصيل..." multiline numberOfLines={6} textAlignVertical="top" />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>المستندات الداعمة</Text>
            <TouchableOpacity style={s.uploadBtn} onPress={handleFileUpload} activeOpacity={0.7}>
              <View style={s.uploadIconCircle}>
                <Text style={s.uploadIcon}>📎</Text>
              </View>
              <View style={s.uploadTextArea}>
                <Text style={s.uploadTitle}>{attachmentUrl ? 'تم اختيار ملف' : 'رفع مستند'}</Text>
                <Text style={s.uploadHint}>اضغط لاختيار صورة أو ملف PDF</Text>
              </View>
            </TouchableOpacity>
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
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', backgroundColor: '#F4F6FA', borderRadius: 12, padding: 16, borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  uploadIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0ECFF', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  uploadIcon: { fontSize: 18 },
  uploadTextArea: { flex: 1, alignItems: 'flex-end' },
  uploadTitle: { fontSize: 14, fontWeight: '700', color: '#2563EB', marginBottom: 2 },
  uploadHint: { fontSize: 12, color: '#8E95A2' },
  buttonsRow: { gap: 10, marginTop: 8 },
  btnWrap: { marginBottom: 4 },
});

export default SickLeaveScreen;
