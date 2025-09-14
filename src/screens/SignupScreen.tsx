// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles user registration with step-by-step flow
// 2. Open/Closed: Can be extended with new steps without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for different step concerns
// 4. Dependency Inversion: Depends on abstractions (components) not concretions

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import DatePicker from '../components/DatePicker';
import Logo from '../components/Logo';
import { AuthService } from '../services/authService';
import { VerifyTraineeDto, VerifyTraineeResponse } from '../types/auth';

const { width, height } = Dimensions.get('window');

interface SignupScreenProps {
  onBack: () => void;
  onSignupSuccess?: () => void;
}

// Step 1: Personal Information
interface PersonalInfo {
  nameAr: string;
  nameEn: string;
  nationalId: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE';
  nationality: string;
  religion: 'MUSLIM' | 'CHRISTIAN' | 'OTHER';
  maritalStatus: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
}

// Step 2: Contact Information
interface ContactInfo {
  phone: string;
  email?: string;
  whatsapp?: string;
  address: string;
  city: string;
  governorate?: string;
  country: string;
  landline?: string;
}

// Step 3: Guardian Information
interface GuardianInfo {
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  guardianEmail?: string;
  guardianJob?: string;
}

// Complete Signup Data
interface SignupData {
  personalInfo: PersonalInfo;
  contactInfo: ContactInfo;
  guardianInfo: GuardianInfo;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ 
  onBack, 
  onSignupSuccess 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [isCreatingPassword, setIsCreatingPassword] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerifyTraineeResponse | null>(null);
  const [phoneVerificationResult, setPhoneVerificationResult] = useState<boolean>(false);
  const [passwordCreationResult, setPasswordCreationResult] = useState<boolean>(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupData, setSignupData] = useState<SignupData>({
    personalInfo: {
      nameAr: '',
      nameEn: '',
      nationalId: '',
      birthDate: '',
      gender: 'MALE',
      nationality: '',
      religion: 'MUSLIM',
      maritalStatus: 'SINGLE',
    },
    contactInfo: {
      phone: '',
      email: '',
      whatsapp: '',
      address: '',
      city: '',
      governorate: '',
      country: '',
      landline: '',
    },
    guardianInfo: {
      guardianName: '',
      guardianRelation: '',
      guardianPhone: '',
      guardianEmail: '',
      guardianJob: '',
    },
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // Update progress animation
    Animated.timing(progressAnim, {
      toValue: currentStep / 3,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const handleNext = async () => {
    if (validateCurrentStep()) {
      if (currentStep === 1) {
        // التحقق من بيانات المتدرب في الخطوة الأولى
        await handleVerifyTrainee();
      } else if (currentStep === 2) {
        // التحقق من رقم الهاتف في الخطوة الثانية
        await handleVerifyPhone();
      } else if (currentStep === 3) {
        // إنشاء كلمة المرور في الخطوة الثالثة
        await handleCreatePassword();
      } else {
        handleSubmit();
      }
    }
  };

  const handleVerifyTrainee = async () => {
    try {
      setIsVerifying(true);
      
      const verifyData: VerifyTraineeDto = {
        nationalId: signupData.personalInfo.nationalId,
        birthDate: signupData.personalInfo.birthDate,
      };

      console.log('🔍 Verifying trainee data:', verifyData);
      const result = await AuthService.verifyTrainee(verifyData);
      console.log('✅ Verification result:', result);
      
      setVerificationResult(result);
      
      if (result.hasAccount) {
        // المتدرب لديه حساب بالفعل
        Alert.alert(
          'حساب موجود',
          `مرحباً ${result.name}!\nلديك حساب مسجل بالفعل في النظام.\nهل تريد تسجيل الدخول بدلاً من إنشاء حساب جديد؟`,
          [
            {
              text: 'إنشاء حساب جديد',
              style: 'cancel',
            },
            {
              text: 'تسجيل الدخول',
              onPress: () => {
                if (onSignupSuccess) {
                  onSignupSuccess(); // العودة لصفحة تسجيل الدخول
                }
              },
            },
          ]
        );
      } else {
        // المتدرب لا يملك حساب، يمكن المتابعة
        Alert.alert(
          'تم التحقق بنجاح',
          `مرحباً ${result.name}!\nتم التحقق من بياناتك بنجاح.\nيمكنك الآن المتابعة لإنشاء حسابك الجديد.`,
          [
            {
              text: 'متابعة',
              onPress: () => {
                setCurrentStep(2);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('❌ Verification failed:', error);
      const apiError = error as any;
      
      let errorMessage = 'حدث خطأ أثناء التحقق من البيانات';
      if (apiError.statusCode === 404) {
        errorMessage = 'لم يتم العثور على بيانات المتدرب في النظام';
      } else if (apiError.statusCode === 400) {
        errorMessage = 'البيانات المدخلة غير صحيحة';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      Alert.alert('خطأ في التحقق', errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyPhone = async () => {
    try {
      setIsVerifyingPhone(true);
      
      const verifyData = {
        nationalId: signupData.personalInfo.nationalId,
        phone: signupData.contactInfo.phone,
      };

      console.log('🔍 Verifying phone number:', verifyData);
      const result = await AuthService.verifyPhone(verifyData);
      console.log('✅ Phone verification result:', result);
      
      if (result.success) {
        setPhoneVerificationResult(true);
        Alert.alert(
          'تم التحقق بنجاح',
          result.message || 'تم التحقق من رقم الهاتف بنجاح.\nيمكنك الآن المتابعة للخطوة التالية.',
          [
            {
              text: 'متابعة',
              onPress: () => {
                setCurrentStep(3);
              },
            },
          ]
        );
      } else {
        Alert.alert('خطأ في التحقق', result.message || 'فشل في التحقق من رقم الهاتف');
      }
    } catch (error) {
      console.error('❌ Phone verification failed:', error);
      const apiError = error as any;
      
      let errorMessage = 'حدث خطأ أثناء التحقق من رقم الهاتف';
      if (apiError.statusCode === 404) {
        errorMessage = 'رقم الهاتف غير مسجل في النظام';
      } else if (apiError.statusCode === 400) {
        errorMessage = 'رقم الهاتف غير صحيح';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      Alert.alert('خطأ في التحقق', errorMessage);
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleCreatePassword = async () => {
    try {
      setIsCreatingPassword(true);
      
      const createPasswordData = {
        nationalId: signupData.personalInfo.nationalId,
        birthDate: signupData.personalInfo.birthDate,
        password: password,
      };

      console.log('🔍 Creating password:', createPasswordData);
      const result = await AuthService.createPassword(createPasswordData);
      console.log('✅ Password creation result:', result);
      
      if (result.success) {
        setPasswordCreationResult(true);
        Alert.alert(
          'تم إنشاء الحساب بنجاح',
          result.message || 'تم إنشاء حسابك بنجاح.\nيمكنك الآن تسجيل الدخول.',
          [
            {
              text: 'موافق',
              onPress: () => {
                if (onSignupSuccess) {
                  onSignupSuccess();
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('خطأ في إنشاء الحساب', result.message || 'فشل في إنشاء كلمة المرور');
      }
    } catch (error) {
      console.error('❌ Password creation failed:', error);
      const apiError = error as any;
      
      let errorMessage = 'حدث خطأ أثناء إنشاء كلمة المرور';
      if (apiError.statusCode === 404) {
        errorMessage = 'لم يتم العثور على بيانات المتدرب في النظام';
      } else if (apiError.statusCode === 400) {
        if (Array.isArray(apiError.message)) {
          errorMessage = apiError.message.join('\n');
        } else {
          errorMessage = apiError.message;
        }
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      Alert.alert('خطأ في إنشاء الحساب', errorMessage);
    } finally {
      setIsCreatingPassword(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return validatePersonalInfo();
      case 2:
        return validateContactInfo();
      case 3:
        return validatePasswordInfo();
      default:
        return false;
    }
  };

  const validatePersonalInfo = (): boolean => {
    const { nationalId, birthDate } = signupData.personalInfo;
    
    if (!nationalId.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال رقم الهوية الوطنية');
      return false;
    }
    if (!birthDate.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال تاريخ الميلاد');
      return false;
    }
    
    // التحقق من تنسيق تاريخ الميلاد
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDate)) {
      Alert.alert('خطأ', 'يرجى إدخال تاريخ الميلاد بالتنسيق الصحيح (YYYY-MM-DD)');
      return false;
    }
    
    return true;
  };

  const validateContactInfo = (): boolean => {
    const { phone } = signupData.contactInfo;
    
    if (!phone.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال رقم الهاتف');
      return false;
    }
    
    // التحقق من تنسيق رقم الهاتف
    const phoneRegex = /^[0-9+\-\s()]+$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert('خطأ', 'يرجى إدخال رقم هاتف صحيح');
      return false;
    }
    
    // التحقق من طول رقم الهاتف
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      Alert.alert('خطأ', 'رقم الهاتف يجب أن يكون بين 10 و 15 رقم');
      return false;
    }
    
    return true;
  };

  const validatePasswordInfo = (): boolean => {
    if (!password.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال كلمة المرور');
      return false;
    }
    
    if (!confirmPassword.trim()) {
      Alert.alert('خطأ', 'يرجى تأكيد كلمة المرور');
      return false;
    }
    
    // التحقق من طول كلمة المرور
    if (password.length < 6) {
      Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return false;
    }
    
    // التحقق من وجود حروف وأرقام
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    
    if (!hasLetters || !hasNumbers) {
      Alert.alert('خطأ', 'كلمة المرور يجب أن تحتوي على حروف وأرقام');
      return false;
    }
    
    // التحقق من تطابق كلمة المرور
    if (password !== confirmPassword) {
      Alert.alert('خطأ', 'كلمة المرور وتأكيدها غير متطابقتين');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      
      // TODO: Implement API call to create account
      console.log('Creating account with data:', signupData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'تم إنشاء الحساب بنجاح',
        'تم إنشاء حسابك بنجاح. يمكنك الآن تسجيل الدخول.',
        [
          {
            text: 'موافق',
            onPress: () => {
              if (onSignupSuccess) {
                onSignupSuccess();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePersonalInfo = (field: keyof PersonalInfo, value: string) => {
    setSignupData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value,
      },
    }));
  };

  const updateContactInfo = (field: keyof ContactInfo, value: string) => {
    setSignupData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        [field]: value,
      },
    }));
  };

  const updateGuardianInfo = (field: keyof GuardianInfo, value: string) => {
    setSignupData(prev => ({
      ...prev,
      guardianInfo: {
        ...prev.guardianInfo,
        [field]: value,
      },
    }));
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={styles.stepIndicatorContainer}>
        {[1, 2, 3].map((step) => (
          <View key={step} style={styles.stepIndicatorItem}>
            <View style={[
              styles.stepIndicatorCircle,
              currentStep >= step && styles.stepIndicatorCircleActive
            ]}>
              <Text style={[
                styles.stepIndicatorText,
                currentStep >= step && styles.stepIndicatorTextActive
              ]}>
                {step}
              </Text>
            </View>
            {step < 3 && (
              <View style={[
                styles.stepIndicatorLine,
                currentStep > step && styles.stepIndicatorLineActive
              ]} />
            )}
          </View>
        ))}
      </View>
      
      <View style={styles.progressBar}>
        <Animated.View style={[
          styles.progressFill,
          { width: progressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
          })}
        ]} />
      </View>
    </View>
  );

  const renderStep1 = () => (
    <Animated.View style={[
      styles.stepContainer,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }
    ]}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>التحقق من البيانات</Text>
        <Text style={styles.stepSubtitle}>يرجى إدخال رقم الهوية الوطنية وتاريخ الميلاد للتحقق من بياناتك</Text>
        {verificationResult && (
          <View style={styles.verificationStatus}>
            <Text style={styles.verificationStatusText}>
              ✅ تم التحقق من: {verificationResult.name}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.formContainer}>
        <CustomInput
          label="رقم الهوية الوطنية *"
          value={signupData.personalInfo.nationalId}
          onChangeText={(value) => updatePersonalInfo('nationalId', value)}
          placeholder="أدخل رقم الهوية الوطنية"
          icon="🆔"
          keyboardType="numeric"
        />

        <DatePicker
          label="تاريخ الميلاد"
          value={signupData.personalInfo.birthDate}
          onChange={(date) => updatePersonalInfo('birthDate', date)}
          required
          placeholder="اختر تاريخ الميلاد"
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>معلومات مهمة:</Text>
          <Text style={styles.infoBoxText}>
            • سيتم التحقق من بياناتك في النظام
          </Text>
          <Text style={styles.infoBoxText}>
            • تأكد من صحة البيانات المدخلة
          </Text>
          <Text style={styles.infoBoxText}>
            • إذا كان لديك حساب بالفعل، ستظهر لك خيارات إضافية
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View style={[
      styles.stepContainer,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }
    ]}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>التحقق من رقم الهاتف</Text>
        <Text style={styles.stepSubtitle}>يرجى إدخال رقم الهاتف للتحقق من صحته</Text>
        {phoneVerificationResult && (
          <View style={styles.verificationStatus}>
            <Text style={styles.verificationStatusText}>
              ✅ تم التحقق من رقم الهاتف بنجاح
            </Text>
          </View>
        )}
      </View>

      <View style={styles.formContainer}>
        <CustomInput
          label="رقم الهاتف *"
          value={signupData.contactInfo.phone}
          onChangeText={(value) => updateContactInfo('phone', value)}
          placeholder="أدخل رقم الهاتف"
          icon="📱"
          keyboardType="phone-pad"
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>معلومات مهمة:</Text>
          <Text style={styles.infoBoxText}>
            • سيتم التحقق من رقم الهاتف في النظام
          </Text>
          <Text style={styles.infoBoxText}>
            • تأكد من صحة رقم الهاتف المدخل
          </Text>
          <Text style={styles.infoBoxText}>
            • يجب أن يكون الرقم مسجل في بياناتك
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View style={[
      styles.stepContainer,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }
    ]}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>إنشاء كلمة المرور</Text>
        <Text style={styles.stepSubtitle}>يرجى إنشاء كلمة مرور قوية لحسابك</Text>
        {passwordCreationResult && (
          <View style={styles.verificationStatus}>
            <Text style={styles.verificationStatusText}>
              ✅ تم إنشاء كلمة المرور بنجاح
            </Text>
          </View>
        )}
      </View>

      <View style={styles.formContainer}>
        <CustomInput
          label="كلمة المرور *"
          value={password}
          onChangeText={setPassword}
          placeholder="أدخل كلمة المرور"
          icon="🔒"
          secureTextEntry
        />

        <CustomInput
          label="تأكيد كلمة المرور *"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="أعد إدخال كلمة المرور"
          icon="🔒"
          secureTextEntry
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>متطلبات كلمة المرور:</Text>
          <Text style={styles.infoBoxText}>
            • يجب أن تكون 6 أحرف على الأقل
          </Text>
          <Text style={styles.infoBoxText}>
            • يجب أن تحتوي على حروف وأرقام
          </Text>
          <Text style={styles.infoBoxText}>
            • يجب أن تتطابق كلمة المرور مع التأكيد
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return renderStep1();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Background with Gradient */}
      <View style={styles.backgroundContainer}>
        <View style={styles.gradientOverlay} />
        <View style={styles.decorativeCircles}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <Animated.View style={[
          styles.headerSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <View style={styles.backButtonIcon}>
              <Text style={styles.backButtonText}>←</Text>
            </View>
            <Text style={styles.backButtonLabel}>العودة</Text>
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <Logo size="medium" />
          </View>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>إنشاء حساب جديد</Text>
            <Text style={styles.headerSubtitle}>انضم إلى منصة المتدربين</Text>
          </View>
        </Animated.View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Current Step Content */}
        {renderCurrentStep()}

        {/* Navigation Buttons */}
        <Animated.View style={[
          styles.navigationSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.navigationButtons}>
            {currentStep > 1 && (
              <CustomButton
                title="السابق"
                onPress={handlePrevious}
                variant="outline"
                size="large"
                style={styles.navigationButton}
              />
            )}
            
            <CustomButton
              title={
                currentStep === 1 
                  ? (isVerifying ? 'جاري التحقق...' : 'التحقق من البيانات')
                  : currentStep === 2
                    ? (isVerifyingPhone ? 'جاري التحقق...' : 'التحقق من رقم الهاتف')
                    : currentStep === 3 
                      ? (isCreatingPassword ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب')
                      : 'التالي'
              }
              onPress={handleNext}
              variant="primary"
              size="large"
              style={styles.navigationButton}
              loading={isLoading || isVerifying || isVerifyingPhone || isCreatingPassword}
            />
          </View>
        </Animated.View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.backgroundDark,
  },
  decorativeCircles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -75,
  },
  circle3: {
    width: 100,
    height: 100,
    top: '30%',
    right: 50,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  headerSection: {
    marginBottom: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  backButtonIcon: {
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 18,
    color: Colors.white,
    fontWeight: '700',
  },
  backButtonLabel: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    fontWeight: '500',
  },
  stepIndicator: {
    marginBottom: 32,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIndicatorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorCircleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepIndicatorText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textLight,
  },
  stepIndicatorTextActive: {
    color: Colors.white,
  },
  stepIndicatorLine: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  stepIndicatorLineActive: {
    backgroundColor: Colors.primary,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  stepContainer: {
    marginBottom: 32,
  },
  stepHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    fontWeight: '500',
  },
  verificationStatus: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  verificationStatusText: {
    fontSize: 14,
    color: Colors.success,
    textAlign: 'center',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'right',
  },
  infoBoxText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
    textAlign: 'right',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  radioGroup: {
    marginTop: 16,
  },
  radioGroupLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  radioOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  radioOption: {
    flex: 1,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
  },
  radioOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radioOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  radioOptionTextActive: {
    color: Colors.white,
  },
  navigationSection: {
    marginBottom: 32,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  navigationButton: {
    flex: 1,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default SignupScreen;
