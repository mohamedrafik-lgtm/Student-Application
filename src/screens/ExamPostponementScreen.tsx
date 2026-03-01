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
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={s.headerSpacer} />
          <View style={s.headerTitleArea}>
            <Text style={s.headerTitle}>طلب تأجيل اختبار</Text>
            <Text style={s.headerSubtitle}>تقديم طلب تأجيل اختبار رسمي</Text>
          </View>
          <TouchableOpacity style={s.backBtn} onPress={onBack}><Icon name={AppIcons.back} size={20} color={Colors.primary} /></TouchableOpacity>
        </View>
      </View>
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
  header: { backgroundColor: Colors.white, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTitleArea: { flex: 1, alignItems: 'flex-end', marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right' },
  headerSubtitle: { fontSize: 13, color: Colors.textHint, marginTop: 4, textAlign: 'right' },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 20, color: Colors.textPrimary, fontWeight: '600' },
  headerSpacer: { width: 38 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  formCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  fieldGroup: { marginBottom: 24 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10, textAlign: 'right' },
  toggleRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  toggleBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.background, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.borderMedium },
  toggleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textLight },
  toggleBtnTextActive: { color: Colors.white },
  buttonsRow: { gap: 10, marginTop: 8 },
  btnWrap: { marginBottom: 4 },
});

export default ExamPostponementScreen;
