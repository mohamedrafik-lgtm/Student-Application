// Screen for creating exam postponement request

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';
import { requestsService } from '../services/requestsService';
import { RequestType, ExamType, CreateTraineeRequestDto } from '../types/requests';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import DatePicker from '../components/DatePicker';

interface ExamPostponementScreenProps {
  accessToken: string;
  onBack: () => void;
}

const ExamPostponementScreen: React.FC<ExamPostponementScreenProps> = ({
  accessToken,
  onBack
}) => {
  const [examType, setExamType] = useState<'MIDTERM' | 'FINAL' | ''>('');
  const [examDate, setExamDate] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!examType) {
      Alert.alert('خطأ', 'يرجى اختيار نوع الاختبار');
      return;
    }
    if (!examDate) {
      Alert.alert('خطأ', 'يرجى اختيار تاريخ الاختبار');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('خطأ', 'يرجى كتابة سبب التأجيل');
      return;
    }

    try {
      setIsLoading(true);
      
      const requestData: CreateTraineeRequestDto = {
        type: RequestType.EXAM_POSTPONE,
        reason: reason.trim(),
        examType: examType as ExamType,
        examDate: examDate
      };
      
      console.log('📤 Submitting exam postponement request:', requestData);
      
      const response = await requestsService.createTraineeRequest(requestData, accessToken);
      
      if (response.success) {
        // تفريغ الحقول
        setExamType('');
        setExamDate('');
        setReason('');
        
        // عرض رسالة نجاح والعودة
        Alert.alert(
          'نجح',
          response.message || 'تم إرسال طلب تأجيل الاختبار بنجاح',
          [
            {
              text: 'موافق',
              onPress: () => onBack()
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ Failed to create request:', error);
      Alert.alert('خطأ', error.message || 'فشل في إرسال الطلب');
    } finally {
      setIsLoading(false);
    }
  };

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
          <Text style={styles.headerTitle}>🚀 طلب تأجيل اختبار</Text>
          <Text style={styles.headerSubtitle}>قدم طلب تأجيل لاختبار محدد</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          {/* Exam Type */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>نوع الاختبار *</Text>
            <View style={styles.examTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.examTypeButton,
                  examType === 'MIDTERM' && styles.examTypeButtonActive
                ]}
                onPress={() => setExamType('MIDTERM')}
              >
                <Text style={[
                  styles.examTypeButtonText,
                  examType === 'MIDTERM' && styles.examTypeButtonTextActive
                ]}>
                  ميد تيرم
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.examTypeButton,
                  examType === 'FINAL' && styles.examTypeButtonActive
                ]}
                onPress={() => setExamType('FINAL')}
              >
                <Text style={[
                  styles.examTypeButtonText,
                  examType === 'FINAL' && styles.examTypeButtonTextActive
                ]}>
                  نهائي
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Exam Date */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>تاريخ الاختبار الأصلي *</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datePickerText}>
                {examDate || 'mm/dd/yyyy'}
              </Text>
              <Text style={styles.datePickerIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          {/* Reason */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>سبب طلب التأجيل *</Text>
            <CustomInput
              value={reason}
              onChangeText={setReason}
              placeholder="اكتب سبب طلب تأجيل الاختبار..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <View style={styles.buttonWrapper}>
              <CustomButton
                title="إرسال الطلب"
                onPress={handleSubmit}
                loading={isLoading}
                variant="primary"
                size="large"
              />
            </View>
            <View style={styles.buttonWrapper}>
              <CustomButton
                title="إلغاء"
                onPress={onBack}
                variant="outline"
                size="large"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DatePicker
          label="تاريخ الاختبار"
          value={examDate || ''}
          onChange={(date) => {
            setExamDate(date);
            setShowDatePicker(false);
          }}
        />
      )}
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
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'right',
  },
  examTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  examTypeButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.backgroundSoft,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  examTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  examTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  examTypeButtonTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.borderMedium,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  datePickerText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  datePickerIcon: {
    fontSize: 20,
  },
  buttonsContainer: {
    marginTop: 8,
    gap: 12,
  },
  buttonWrapper: {
    width: '100%',
  },
});

export default ExamPostponementScreen;