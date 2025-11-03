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
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import DatePicker from '../components/DatePicker';
import Logo from '../components/Logo';
import { AuthService } from '../services/authService';

interface SignupScreenProps {
  onBack: () => void;
  onSignupSuccess?: () => void;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ 
  onBack, 
  onSignupSuccess 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [nationalId, setNationalId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleNext = async () => {
    if (currentStep === 1) {
      // التحقق من البيانات المدخلة في الخطوة الأولى
      if (!nationalId.trim() || !birthDate.trim()) {
        Alert.alert('خطأ', 'يرجى إدخال جميع البيانات المطلوبة');
        return;
      }
      
      setIsLoading(true);
      try {
        const result = await AuthService.verifyTrainee({
          nationalId,
          birthDate,
        });
        
        if (result.hasAccount) {
          Alert.alert(
            'حساب موجود',
            `مرحباً ${result.name}!\nلديك حساب بالفعل. هل تريد تسجيل الدخول؟`,
            [
              { text: 'إلغاء', style: 'cancel' },
              { 
                text: 'تسجيل الدخول', 
                onPress: () => onSignupSuccess && onSignupSuccess() 
              },
            ]
          );
        } else {
          Alert.alert(
            'تم التحقق بنجاح',
            `مرحباً ${result.name}!\nتم التحقق من بياناتك بنجاح.`,
            [{ text: 'متابعة', onPress: () => setCurrentStep(2) }]
          );
        }
      } catch (error: any) {
        Alert.alert('خطأ', error.message || 'حدث خطأ أثناء التحقق من البيانات');
      } finally {
        setIsLoading(false);
      }
    } else if (currentStep === 2) {
      // التحقق من رقم الهاتف
      if (!phone.trim()) {
        Alert.alert('خطأ', 'يرجى إدخال رقم الهاتف');
        return;
      }
      
      setIsLoading(true);
      try {
        const result = await AuthService.verifyPhone({
          nationalId,
          phone,
        });
        
        if (result.success) {
          Alert.alert(
            'تم التحقق بنجاح',
            'تم التحقق من رقم الهاتف بنجاح.',
            [{ text: 'متابعة', onPress: () => setCurrentStep(3) }]
          );
        }
      } catch (error: any) {
        Alert.alert('خطأ', error.message || 'حدث خطأ أثناء التحقق من رقم الهاتف');
      } finally {
        setIsLoading(false);
      }
    } else if (currentStep === 3) {
      // إنشاء كلمة المرور
      if (!password.trim() || !confirmPassword.trim()) {
        Alert.alert('خطأ', 'يرجى إدخال كلمة المرور والتأكيد');
        return;
      }
      
      if (password !== confirmPassword) {
        Alert.alert('خطأ', 'كلمة المرور وتأكيدها غير متطابقتين');
        return;
      }
      
      if (password.length < 6) {
        Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
      }
      
      setIsLoading(true);
      try {
        const result = await AuthService.createPassword({
          nationalId,
          birthDate,
          password,
        });
        
        if (result.success) {
          Alert.alert(
            'تم إنشاء الحساب بنجاح',
            'تم إنشاء حسابك بنجاح. يمكنك الآن تسجيل الدخول.',
            [{ 
              text: 'موافق', 
              onPress: () => onSignupSuccess && onSignupSuccess() 
            }]
          );
        }
      } catch (error: any) {
        let errorMessage = 'حدث خطأ أثناء إنشاء الحساب';
        if (error.message) {
          errorMessage = error.message;
        }
        Alert.alert('خطأ', errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= step && styles.stepCircleActive,
            ]}
          >
            <Text
              style={[
                styles.stepText,
                currentStep >= step && styles.stepTextActive,
              ]}
            >
              {step}
            </Text>
          </View>
          {step < 3 && (
            <View
              style={[
                styles.stepLine,
                currentStep > step && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.formContainer}>
            <Text style={styles.stepTitle}>التحقق من البيانات</Text>
            <Text style={styles.stepSubtitle}>
              يرجى إدخال رقم الهوية الوطنية وتاريخ الميلاد
            </Text>
            
            <CustomInput
              label="رقم الهوية الوطنية"
              value={nationalId}
              onChangeText={setNationalId}
              placeholder="أدخل رقم الهوية الوطنية"
              keyboardType="numeric"
              required
            />
            
            <DatePicker
              label="تاريخ الميلاد"
              value={birthDate}
              onChange={setBirthDate}
              placeholder="اختر تاريخ الميلاد"
              required
            />
          </View>
        );
      
      case 2:
        return (
          <View style={styles.formContainer}>
            <Text style={styles.stepTitle}>التحقق من رقم الهاتف</Text>
            <Text style={styles.stepSubtitle}>يرجى إدخال رقم هاتفك</Text>
            
            <CustomInput
              label="رقم الهاتف"
              value={phone}
              onChangeText={setPhone}
              placeholder="أدخل رقم الهاتف"
              keyboardType="phone-pad"
              required
            />
          </View>
        );
      
      case 3:
        return (
          <View style={styles.formContainer}>
            <Text style={styles.stepTitle}>إنشاء كلمة المرور</Text>
            <Text style={styles.stepSubtitle}>أنشئ كلمة مرور قوية</Text>
            
            <CustomInput
              label="كلمة المرور"
              value={password}
              onChangeText={setPassword}
              placeholder="أدخل كلمة المرور"
              secureTextEntry
              required
            />
            
            <CustomInput
              label="تأكيد كلمة المرور"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="أعد إدخال كلمة المرور"
              secureTextEntry
              required
            />
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Logo size="medium" showText={false} />
          <Text style={styles.title}>إنشاء حساب جديد</Text>
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Content */}
        {renderContent()}

        {/* Navigation */}
        <View style={styles.navigation}>
          {currentStep > 1 && (
            <View style={styles.buttonWrapper}>
              <CustomButton
                title="السابق"
                onPress={handlePrevious}
                variant="outline"
                size="large"
              />
            </View>
          )}
          <View style={styles.buttonWrapper}>
            <CustomButton
              title={
                currentStep === 1
                  ? 'التحقق'
                  : currentStep === 2
                  ? 'التالي'
                  : 'إنشاء الحساب'
              }
              onPress={handleNext}
              variant="primary"
              size="large"
              loading={isLoading}
            />
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 10,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 16,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSoft,
    borderWidth: 2,
    borderColor: Colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  stepTextActive: {
    color: Colors.white,
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  formContainer: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  navigation: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 8,
  },
});

export default SignupScreen;
