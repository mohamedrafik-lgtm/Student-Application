// Screen for creating sick leave request

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';
import { requestsService } from '../services/requestsService';
import { RequestType, CreateTraineeRequestDto } from '../types/requests';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';

interface SickLeaveScreenProps {
  accessToken: string;
  onBack: () => void;
}

const SickLeaveScreen: React.FC<SickLeaveScreenProps> = ({
  accessToken,
  onBack
}) => {
  const [reason, setReason] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async () => {
    try {
      // طلب الإذن لفتح المعرض
      if (Platform.OS === 'android') {
        // في Android 13+ لا يحتاج permission
        // في الإصدارات الأقدم، يمكن إضافة PermissionsAndroid
      }

      // استخدام launchImageLibrary من react-native-image-picker
      // ملاحظة: يحتاج npm install react-native-image-picker
      
      // للتطوير السريع، سأستخدم طريقة بديلة
      Alert.alert(
        'اختيار صورة',
        'هل تريد:',
        [
          {
            text: 'من المعرض',
            onPress: () => {
              // TODO: فتح معرض الصور
              // سيتطلب: npm install react-native-image-picker
              Alert.alert('قريباً', 'يتطلب تثبيت react-native-image-picker\n\nسيتم إضافتها في التحديث القادم');
            }
          },
          {
            text: 'من الكاميرا',
            onPress: () => {
              Alert.alert('قريباً', 'يتطلب تثبيت react-native-image-picker');
            }
          },
          {
            text: 'إلغاء',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!reason.trim()) {
      Alert.alert('خطأ', 'يرجى كتابة سبب الإجازة المرضية');
      return;
    }

    try {
      setIsLoading(true);
      
      const requestData: CreateTraineeRequestDto = {
        type: RequestType.SICK_LEAVE,
        reason: reason.trim(),
        ...(attachmentUrl && { attachmentUrl })
      };
      
      console.log('📤 Submitting sick leave request:', requestData);
      
      const response = await requestsService.createTraineeRequest(requestData, accessToken);
      
      if (response.success) {
        // تفريغ الحقول
        setReason('');
        setAttachmentUrl('');
        
        // عرض رسالة نجاح والعودة
        Alert.alert(
          'نجح',
          response.message || 'تم إرسال طلب الإجازة المرضية بنجاح',
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
          <Text style={styles.headerTitle}>🏥 طلب إجازة مرضية</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          {/* Reason */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>سبب الإجازة المرضية *</Text>
            <CustomInput
              value={reason}
              onChangeText={setReason}
              placeholder="اكتب السبب..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* File Upload */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>مرفق (اختياري)</Text>
            <TouchableOpacity
              style={styles.fileUploadButton}
              onPress={handleFileUpload}
            >
              <Text style={styles.fileUploadText}>
                {attachmentUrl || 'No file chosen'}
              </Text>
              <View style={styles.chooseFileButton}>
                <Text style={styles.chooseFileText}>Choose File</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <View style={styles.buttonWrapper}>
              <CustomButton
                title="إرسال"
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
  fileUploadButton: {
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
  fileUploadText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  chooseFileButton: {
    backgroundColor: Colors.backgroundSoft,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chooseFileText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  buttonsContainer: {
    marginTop: 8,
    gap: 12,
  },
  buttonWrapper: {
    width: '100%',
  },
});

export default SickLeaveScreen;