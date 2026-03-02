// Screen for creating sick leave request
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
      <ScreenHeader title="طلب إجازة مرضية" subtitle="تقديم طلب إجازة مرضية مع المستندات" onBack={onBack} />
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
                <Icon name={AppIcons.upload} size={18} color={Colors.primary} />
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
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', backgroundColor: Colors.background, borderRadius: 12, padding: 16, borderWidth: 1.5, borderColor: Colors.borderMedium, borderStyle: 'dashed' },
  uploadIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary50, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  uploadIcon: { fontSize: 18 },
  uploadTextArea: { flex: 1, alignItems: 'flex-end' },
  uploadTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
  uploadHint: { fontSize: 12, color: Colors.textHint },
  buttonsRow: { gap: 10, marginTop: 8 },
  btnWrap: { marginBottom: 4 },
});

export default SickLeaveScreen;
