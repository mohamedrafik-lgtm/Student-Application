// Screen for creating exam postponement request
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestsService } from '../services/requestsService';
import { RequestType, ExamType, CreateTraineeRequestDto } from '../types/requests';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import DatePicker from '../components/DatePicker';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
import ScreenHeader from '../components/shared/ScreenHeader';

interface ExamPostponementScreenProps {
  accessToken: string;
  onBack: () => void;
}

const ExamPostponementScreen: React.FC<ExamPostponementScreenProps> = ({ accessToken, onBack }) => {
  const [reason, setReason] = useState('');
  const [examType, setExamType] = useState<ExamType>(ExamType.MIDTERM);
  const [examDate, setExamDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { Alert.alert('خطأ', 'يرجى كتابة سبب الطلب'); return; }
    if (!examDate) { Alert.alert('خطأ', 'يرجى تحديد تاريخ الاختبار'); return; }
    try {
      setIsLoading(true);
      const requestData: CreateTraineeRequestDto = {
        type: RequestType.EXAM_POSTPONE,
        reason: reason.trim(),
        examType,
        examDate,
      };
      const response = await requestsService.createTraineeRequest(requestData, accessToken);
      if (response.success) {
        setReason('');
        setExamDate('');
        Alert.alert('نجح', response.message || 'تم إرسال طلب تأجيل الاختبار بنجاح', [{ text: 'موافق', onPress: () => onBack() }]);
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في إرسال الطلب');
    } finally { setIsLoading(false); }
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScreenHeader title="طلب تأجيل اختبار" subtitle="تقديم طلب تأجيل اختبار رسمي" onBack={onBack} />
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.formCard}>
          {/* Exam type toggle */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>نوع الاختبار *</Text>
            <View style={s.toggleRow}>
              <TouchableOpacity
                style={[s.toggleBtn, examType === ExamType.FINAL && s.toggleBtnActive]}
                onPress={() => setExamType(ExamType.FINAL)}
                activeOpacity={0.7}
              >
                <Text style={[s.toggleBtnText, examType === ExamType.FINAL && s.toggleBtnTextActive]}>نهائي</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleBtn, examType === ExamType.MIDTERM && s.toggleBtnActive]}
                onPress={() => setExamType(ExamType.MIDTERM)}
                activeOpacity={0.7}
              >
                <Text style={[s.toggleBtnText, examType === ExamType.MIDTERM && s.toggleBtnTextActive]}>ميد تيرم</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date picker */}
          <View style={s.fieldGroup}>
            <DatePicker
              label="تاريخ الاختبار *"
              value={examDate}
              onChange={(date: string) => setExamDate(date)}
              placeholder="اختر تاريخ الاختبار"
              required
            />
          </View>

          {/* Reason */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>سبب التأجيل *</Text>
            <CustomInput value={reason} onChangeText={setReason} placeholder="اكتب سبب طلب تأجيل الاختبار..." multiline numberOfLines={5} textAlignVertical="top" />
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
  toggleRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  toggleBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.background, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.borderMedium },
  toggleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textLight },
  toggleBtnTextActive: { color: Colors.white },
  buttonsRow: { gap: 10, marginTop: 8 },
  btnWrap: { marginBottom: 4 },
});

export default ExamPostponementScreen;
