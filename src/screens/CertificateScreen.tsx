// Screen for creating certificate request

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
import { RequestType, CreateTraineeRequestDto } from '../types/requests';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';

interface CertificateScreenProps {
  accessToken: string;
  onBack: () => void;
}

const CertificateScreen: React.FC<CertificateScreenProps> = ({
  accessToken,
  onBack
}) => {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!reason.trim()) {
      Alert.alert('خطأ', 'يرجى كتابة سبب الطلب');
      return;
    }

    try {
      setIsLoading(true);
      
      const requestData: CreateTraineeRequestDto = {
        type: RequestType.CERTIFICATE,
        reason: reason.trim()
      };
      
      console.log('📤 Submitting certificate request:', requestData);
      
      const response = await requestsService.createTraineeRequest(requestData, accessToken);
      
      if (response.success) {
        // تفريغ الحقول
        setReason('');
        
        // عرض رسالة نجاح والعودة
        Alert.alert(
          'نجح',
          response.message || 'تم إرسال طلب الإفادة بنجاح',
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
          <Text style={styles.headerTitle}>📋 طلب إفادة</Text>
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
            <Text style={styles.fieldLabel}>سبب الطلب *</Text>
            <CustomInput
              value={reason}
              onChangeText={setReason}
              placeholder="مثالاً: للتقديم في دورة، للجهات الرسمية، إلخ..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
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
  buttonsContainer: {
    marginTop: 8,
    gap: 12,
  },
  buttonWrapper: {
    width: '100%',
  },
});

export default CertificateScreen;