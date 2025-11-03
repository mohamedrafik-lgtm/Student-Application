// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles login UI and basic validation
// 2. Open/Closed: Can be extended with new features without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for different concerns
// 4. Dependency Inversion: Depends on abstractions (components) not concretions

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/Logo';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { TraineeLoginRequest, TraineeLoginError, BranchType } from '../types/auth';
import { AuthService } from '../services/authService';
import { BranchService } from '../services/branchService';
import { Colors } from '../styles/colors';

const { width, height } = Dimensions.get('window');

interface LoginScreenProps {
  onLoginSuccess?: (loginData: any) => void;
  onNavigateToSignup?: () => void;
  onChangeBranch?: () => void;
  selectedBranch?: BranchType | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLoginSuccess, 
  onNavigateToSignup,
  onChangeBranch,
  selectedBranch
}) => {
  const [credentials, setCredentials] = useState<TraineeLoginRequest>({
    nationalId: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<TraineeLoginRequest>>({});

  // Simple fade in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Validation logic (Single Responsibility)
  const validateForm = (): boolean => {
    const newErrors: Partial<TraineeLoginRequest> = {};

    if (!credentials.nationalId.trim()) {
      newErrors.nationalId = 'الرقم القومي مطلوب';
    } else if (credentials.nationalId.length !== 14) {
      newErrors.nationalId = 'يجب إدخال 14 رقماً كما هو موجود في بطاقة الهوية';
    }

    if (!credentials.password.trim()) {
      newErrors.password = 'كلمة المرور مطلوبة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle login using real API
  const handleLogin = async () => {
    if (!validateForm()) return;

    console.log('🔐 Starting login process...');
    console.log('📝 Credentials:', { 
      nationalId: credentials.nationalId, 
      passwordLength: credentials.password.length 
    });

    setIsLoading(true);
    try {
      const response = await AuthService.login(credentials);
      console.log('✅ Login successful:', response);
      
      // Success - navigate to home screen
      if (onLoginSuccess) {
        onLoginSuccess(response);
      } else {
        // Fallback for testing
        Alert.alert(
          'نجح تسجيل الدخول',
          `مرحباً ${response.trainee.nameAr}\nتم تسجيل الدخول بنجاح`,
          [
            {
              text: 'موافق',
              onPress: () => {
                console.log('Access Token:', response.access_token);
                console.log('Trainee Info:', response.trainee);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Login failed:', error);
      const apiError = error as TraineeLoginError;
      
      // Handle different types of errors
      let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
      let errorTitle = 'خطأ في تسجيل الدخول';
      
      if (apiError.statusCode === 401) {
        errorMessage = 'الرقم القومي أو كلمة المرور غير صحيحة';
        errorTitle = 'بيانات خاطئة';
      } else if (apiError.statusCode === 0) {
        errorMessage = apiError.message; // Network error message
        errorTitle = 'خطأ في الاتصال';
      } else if (apiError.statusCode === 500) {
        errorMessage = 'خطأ في الخادم. حاول مرة أخرى لاحقاً';
        errorTitle = 'خطأ في الخادم';
      } else if (apiError.statusCode === 404) {
        errorMessage = 'عنوان الخادم غير صحيح. تحقق من الإعدادات';
        errorTitle = 'عنوان غير صحيح';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      console.log('🚨 Error details:', {
        statusCode: apiError.statusCode,
        message: apiError.message,
        error: apiError.error
      });
      
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsLoading(false);
      console.log('🏁 Login process finished');
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('نسيت كلمة المرور', 'سيتم إضافة هذه الميزة قريباً');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <Animated.View style={[styles.logoSection, { opacity: fadeAnim }]}>
            <Logo size="large" showText={true} />
          </Animated.View>

          {/* Main Login Card */}
          <Animated.View style={[styles.loginCard, { opacity: fadeAnim }]}>
            {/* Back to Branch Selection Button */}
            <View style={styles.headerSection}>
              <TouchableOpacity 
                style={styles.backToBranchButton}
                onPress={onChangeBranch || (() => {})}
                activeOpacity={0.7}
              >
                <Text style={styles.backToBranchIconText}>🏛️</Text>
                <Text style={[styles.backToBranchText, { marginLeft: 8 }]}>العودة لاختيار الفرع</Text>
              </TouchableOpacity>
            </View>

            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>مرحباً بك</Text>
              <Text style={styles.welcomeSubtitle}>في منصة المتدربين</Text>
              <Text style={styles.loginInstruction}>
                أدخل بياناتك للوصول إلى حسابك
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              {/* National ID Input */}
              <View style={styles.inputGroup}>
                <CustomInput
                  label="الرقم القومي"
                  placeholder="أدخل الرقم القومي (14 رقم)"
                  value={credentials.nationalId}
                  onChangeText={(text) => {
                    setCredentials(prev => ({ ...prev, nationalId: text }));
                    if (errors.nationalId) {
                      setErrors(prev => ({ ...prev, nationalId: undefined }));
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={14}
                  error={errors.nationalId}
                  required
                />
                <Text style={styles.inputHint}>
                  14 رقماً كما هو موجود في بطاقة الهوية
                </Text>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <CustomInput
                  label="كلمة المرور"
                  placeholder="أدخل كلمة المرور"
                  value={credentials.password}
                  onChangeText={(text) => {
                    setCredentials(prev => ({ ...prev, password: text }));
                    if (errors.password) {
                      setErrors(prev => ({ ...prev, password: undefined }));
                    }
                  }}
                  secureTextEntry
                  error={errors.password}
                  required
                />
              </View>

              {/* Login Button */}
              <View style={styles.buttonGroup}>
                <View style={styles.buttonWrapper}>
                  <CustomButton
                    title="تسجيل الدخول"
                    onPress={handleLogin}
                    loading={isLoading}
                    variant="primary"
                    size="large"
                  />
                </View>

                {/* Signup Button */}
                <View style={styles.buttonWrapper}>
                  <CustomButton
                    title="إنشاء حساب جديد"
                    onPress={onNavigateToSignup}
                    variant="outline"
                    size="large"
                  />
                </View>

                {/* Forgot Password */}
                <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
                  <Text style={styles.forgotPasswordText}>
                    نسيت كلمة المرور؟
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Additional Info */}
              <Text style={styles.additionalInfo}>
                يجب أن تكون مسجلاً في المركز مسبقاً
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    minHeight: height,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 0,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  headerSection: {
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  backToBranchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSoft,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    alignSelf: 'flex-start',
  },
  backToBranchIconText: {
    fontSize: 18,
  },
  backToBranchText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  welcomeSubtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
  },
  loginInstruction: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  formSection: {
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
    backgroundColor: Colors.primarySoft,
    padding: 10,
    borderRadius: 8,
    lineHeight: 18,
    fontStyle: 'italic',
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    flexWrap: 'wrap',
  },
  buttonGroup: {
    marginTop: 4,
  },
  buttonWrapper: {
    marginBottom: 8,
  },
  forgotButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  forgotPasswordText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  additionalInfo: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    backgroundColor: Colors.successSoft,
    padding: 12,
    borderRadius: 10,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: Colors.successSoft,
  },
});

export default LoginScreen;