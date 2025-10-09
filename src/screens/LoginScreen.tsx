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
            {/* Header with Back Button */}
            <View style={styles.headerSection}>
              <TouchableOpacity 
                style={styles.backToBranchButton}
                onPress={onChangeBranch || (() => {})}
                activeOpacity={0.7}
              >
                <View style={styles.backToBranchIcon}>
                  <Text style={styles.backToBranchIconText}>🏛️</Text>
                </View>
                <Text style={styles.backToBranchText}>العودة لاختيار الفرع</Text>
              </TouchableOpacity>
            </View>

            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>مرحباً بك</Text>
              <Text style={styles.welcomeSubtitle}>في منصة المتدربين</Text>
              <Text style={styles.loginInstruction}>
                أدخل بياناتك للوصول إلى حسابك
              </Text>
              
              {/* Branch Information */}
              {selectedBranch && (
                <View style={styles.branchInfoSection}>
                  <View style={styles.branchInfoCard}>
                    <View style={styles.branchInfoHeader}>
                      <Text style={styles.branchInfoTitle}>الفرع المختار</Text>
                      <TouchableOpacity 
                        style={styles.changeBranchButton}
                        onPress={onChangeBranch || (() => {})}
                      >
                        <Text style={styles.changeBranchText}>تغيير الفرع</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.branchDetails}>
                      <Text style={styles.branchIcon}>
                        {BranchService.getBranchInfo(selectedBranch).icon}
                      </Text>
                      <View style={styles.branchTextContainer}>
                        <Text style={styles.branchName}>
                          {BranchService.getBranchInfo(selectedBranch).nameAr}
                        </Text>
                        <Text style={styles.branchCity}>
                          {BranchService.getBranchInfo(selectedBranch).cityAr}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Branch Selection Button */}
            <View style={styles.branchSelectionSection}>
              <TouchableOpacity 
                style={styles.branchSelectionButton}
                onPress={onChangeBranch || (() => {})}
                activeOpacity={0.7}
              >
                <View style={styles.branchSelectionIcon}>
                  <Text style={styles.branchSelectionIconText}>🏛️</Text>
                </View>
                <View style={styles.branchSelectionTextContainer}>
                  <Text style={styles.branchSelectionTitle}>تغيير الفرع</Text>
                  <Text style={styles.branchSelectionSubtitle}>العودة لاختيار الفرع</Text>
                </View>
                <View style={styles.branchSelectionArrow}>
                  <Text style={styles.branchSelectionArrowText}>→</Text>
                </View>
              </TouchableOpacity>
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
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.background,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  keyboardAvoidingView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    minHeight: height,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 50,
    paddingTop: 30,
    paddingBottom: 20,
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 32,
    marginHorizontal: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    // Modern clean white card with purple shadow
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -1,
    lineHeight: 44,
    paddingHorizontal: 20,
  },
  welcomeSubtitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 30,
    paddingHorizontal: 20,
  },
  loginInstruction: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    flexWrap: 'wrap',
  },
  formSection: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
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
    gap: 20,
    marginTop: 12,
  },
  forgotButton: {
    alignItems: 'center',
    padding: 12,
  },
  forgotPasswordText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderMedium,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  additionalInfo: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    backgroundColor: Colors.successSoft,
    padding: 12,
    borderRadius: 10,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: Colors.successSoft,
    flexWrap: 'wrap',
  },
  // Branch Information Styles
  branchInfoSection: {
    marginTop: 20,
  },
  branchInfoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  branchInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  branchInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  changeBranchButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  changeBranchText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  branchDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  branchIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  branchTextContainer: {
    flex: 1,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  branchCity: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  // Back to Branch Selection Button Styles
  headerSection: {
    marginBottom: 20,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    width: '100%',
  },
  backToBranchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSoft,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    alignSelf: 'flex-start',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    minWidth: 200,
  },
  backToBranchIcon: {
    marginRight: 12,
  },
  backToBranchIconText: {
    fontSize: 18,
  },
  backToBranchText: {
    fontSize: 17,
    color: Colors.primary,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Branch Selection Button Styles
  branchSelectionSection: {
    marginBottom: 24,
  },
  branchSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSoft,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  branchSelectionIcon: {
    marginRight: 16,
  },
  branchSelectionIconText: {
    fontSize: 24,
  },
  branchSelectionTextContainer: {
    flex: 1,
  },
  branchSelectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  branchSelectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  branchSelectionArrow: {
    marginLeft: 12,
  },
  branchSelectionArrowText: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '700',
  },
  backButtonContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  backButton: {
    backgroundColor: Colors.backgroundSoft,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  backButtonText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    flexWrap: 'wrap',
  },
});

export default LoginScreen;