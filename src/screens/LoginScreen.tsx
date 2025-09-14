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
import { TraineeLoginRequest, TraineeLoginError } from '../types/auth';
import { AuthService } from '../services/authService';

const { width, height } = Dimensions.get('window');

interface LoginScreenProps {
  onLoginSuccess?: (loginData: any) => void;
  onNavigateToSignup?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onNavigateToSignup }) => {
  const [credentials, setCredentials] = useState<TraineeLoginRequest>({
    nationalId: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<TraineeLoginRequest>>({});

  // Animation values - Simple and elegant
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start entrance animations with staggered timing
    Animated.sequence([
      // Logo appears first
      Animated.parallel([
        Animated.timing(logoScaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Then the form slides up
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Subtle pulse animation for the logo
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

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

  const handleCreateAccount = () => {
    Alert.alert('إنشاء حساب جديد', 'سيتم إضافة هذه الميزة قريباً');
  };

  const handleBackToAccountSelection = () => {
    Alert.alert('العودة لاختيار نوع الحساب', 'سيتم إضافة هذه الميزة قريباً');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Elegant Background with Gradient */}
      <View style={styles.backgroundContainer}>
        <View style={styles.gradientOverlay} />
        <View style={styles.backgroundPattern} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section with subtle animation */}
          <Animated.View style={[
            styles.logoSection,
            {
              opacity: fadeAnim,
              transform: [
                { scale: logoScaleAnim },
                { scale: pulseAnim }
              ]
            }
          ]}>
            <Logo size="large" showText={true} />
          </Animated.View>

          {/* Main Login Card */}
          <Animated.View style={[
            styles.loginCard,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}>
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
                <CustomButton
                  title="تسجيل الدخول"
                  onPress={handleLogin}
                  loading={isLoading}
                  variant="primary"
                  size="large"
                />

                {/* Signup Button */}
                <CustomButton
                  title="إنشاء حساب جديد"
                  onPress={onNavigateToSignup}
                  variant="outline"
                  size="large"
                />

                {/* Forgot Password */}
                <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
                  <Text style={styles.forgotPasswordText}>
                    نسيت كلمة المرور؟
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>أو</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Create Account Button */}
              <CustomButton
                title="إنشاء حساب جديد"
                onPress={handleCreateAccount}
                variant="outline"
                size="large"
              />

              {/* Additional Info */}
              <Text style={styles.additionalInfo}>
                يجب أن تكون مسجلاً في المركز مسبقاً
              </Text>
            </View>
          </Animated.View>

          {/* Back Button */}
          <Animated.View style={[styles.backButtonContainer, {
            opacity: fadeAnim,
          }]}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToAccountSelection}
            >
              <Text style={styles.backButtonText}>
                ← العودة لاختيار نوع الحساب
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    backgroundColor: '#0F172A',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    // Subtle pattern overlay
  },
  keyboardAvoidingView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    minHeight: height,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  loginCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    padding: 32,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    // Glass morphism effect
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
    lineHeight: 36,
    paddingHorizontal: 20,
  },
  welcomeSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366F1',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  loginInstruction: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    flexWrap: 'wrap',
  },
  formSection: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    padding: 10,
    borderRadius: 8,
    lineHeight: 18,
    fontStyle: 'italic',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    flexWrap: 'wrap',
  },
  buttonGroup: {
    gap: 16,
    marginTop: 8,
  },
  forgotButton: {
    alignItems: 'center',
    padding: 12,
  },
  forgotPasswordText: {
    fontSize: 15,
    color: '#6366F1',
    fontWeight: '600',
    textDecorationLine: 'underline',
    textAlign: 'center',
    lineHeight: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  additionalInfo: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    padding: 12,
    borderRadius: 10,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    flexWrap: 'wrap',
  },
  backButtonContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  backButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    flexWrap: 'wrap',
  },
});

export default LoginScreen;