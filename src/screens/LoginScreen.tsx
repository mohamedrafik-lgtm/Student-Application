// Login Screen - handles login UI and validation
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/Logo';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { TraineeLoginRequest, TraineeLoginError, BranchType } from '../types/auth';
import { AuthService } from '../services/authService';

const { height } = Dimensions.get('window');

interface LoginScreenProps {
  onLoginSuccess?: (loginData: any) => void;
  onNavigateToSignup?: () => void;
  onChangeBranch?: () => void;
  selectedBranch?: BranchType | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onNavigateToSignup, onChangeBranch, selectedBranch }) => {
  const [credentials, setCredentials] = useState<TraineeLoginRequest>({ nationalId: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<TraineeLoginRequest>>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Partial<TraineeLoginRequest> = {};
    if (!credentials.nationalId.trim()) newErrors.nationalId = 'الرقم القومي مطلوب';
    else if (credentials.nationalId.length !== 14) newErrors.nationalId = 'يجب إدخال 14 رقماً كما هو موجود في بطاقة الهوية';
    if (!credentials.password.trim()) newErrors.password = 'كلمة المرور مطلوبة';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const response = await AuthService.login(credentials);
      if (onLoginSuccess) {
        onLoginSuccess(response);
      } else {
        Alert.alert('نجح تسجيل الدخول', `مرحباً ${response.trainee.nameAr}\nتم تسجيل الدخول بنجاح`);
      }
    } catch (error) {
      const apiError = error as TraineeLoginError;
      let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
      let errorTitle = 'خطأ في تسجيل الدخول';
      if (apiError.statusCode === 401) { errorMessage = 'الرقم القومي أو كلمة المرور غير صحيحة'; errorTitle = 'بيانات خاطئة'; }
      else if (apiError.statusCode === 0) { errorMessage = apiError.message; errorTitle = 'خطأ في الاتصال'; }
      else if (apiError.statusCode === 500) { errorMessage = 'خطأ في الخادم. حاول مرة أخرى لاحقاً'; errorTitle = 'خطأ في الخادم'; }
      else if (apiError.statusCode === 404) { errorMessage = 'عنوان الخادم غير صحيح. تحقق من الإعدادات'; errorTitle = 'عنوان غير صحيح'; }
      else if (apiError.message) errorMessage = apiError.message;
      Alert.alert(errorTitle, errorMessage);
    } finally { setIsLoading(false); }
  };

  const handleForgotPassword = () => { Alert.alert('نسيت كلمة المرور', 'سيتم إضافة هذه الميزة قريباً'); };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <Animated.View style={[s.logoSection, { opacity: fadeAnim }]}>
            <Logo size="large" showText={true} />
          </Animated.View>

          {/* Login Card */}
          <Animated.View style={[s.loginCard, { opacity: fadeAnim }]}>
            {/* Back to branch */}
            <TouchableOpacity style={s.branchBtn} onPress={onChangeBranch || (() => {})} activeOpacity={0.7}>
              <Text style={s.branchBtnText}>العودة لاختيار الفرع</Text>
              <View style={s.branchIconCircle}><Text style={s.branchIconText}>🏛️</Text></View>
            </TouchableOpacity>

            {/* Welcome */}
            <View style={s.welcomeSection}>
              <Text style={s.welcomeTitle}>مرحباً بك</Text>
              <Text style={s.welcomeSubtitle}>في منصة المتدربين</Text>
              <Text style={s.loginInstruction}>أدخل بياناتك للوصول إلى حسابك</Text>
            </View>

            {/* Form */}
            <View style={s.formSection}>
              <View style={s.inputGroup}>
                <CustomInput
                  label="الرقم القومي"
                  placeholder="أدخل الرقم القومي (14 رقم)"
                  value={credentials.nationalId}
                  onChangeText={(text) => {
                    setCredentials(prev => ({ ...prev, nationalId: text }));
                    if (errors.nationalId) setErrors(prev => ({ ...prev, nationalId: undefined }));
                  }}
                  keyboardType="numeric"
                  maxLength={14}
                  error={errors.nationalId}
                  required
                />
                <Text style={s.inputHint}>14 رقماً كما هو موجود في بطاقة الهوية</Text>
              </View>

              <View style={s.inputGroup}>
                <CustomInput
                  label="كلمة المرور"
                  placeholder="أدخل كلمة المرور"
                  value={credentials.password}
                  onChangeText={(text) => {
                    setCredentials(prev => ({ ...prev, password: text }));
                    if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  secureTextEntry
                  error={errors.password}
                  required
                />
              </View>

              <View style={s.btnGroup}>
                <View style={s.btnWrap}><CustomButton title="تسجيل الدخول" onPress={handleLogin} loading={isLoading} variant="primary" size="large" /></View>
                <View style={s.btnWrap}><CustomButton title="إنشاء حساب جديد" onPress={onNavigateToSignup} variant="outline" size="large" /></View>
                <TouchableOpacity onPress={handleForgotPassword} style={s.forgotBtn}>
                  <Text style={s.forgotBtnText}>نسيت كلمة المرور؟</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.additionalInfo}>يجب أن تكون مسجلاً في المركز مسبقاً</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 20, minHeight: height },
  logoSection: { alignItems: 'center', marginBottom: 28, paddingTop: 16 },
  loginCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 6 },
  branchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', backgroundColor: '#F4F6FA', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginBottom: 20 },
  branchIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  branchIconText: { fontSize: 16 },
  branchBtnText: { fontSize: 13, color: '#2563EB', fontWeight: '700' },
  welcomeSection: { alignItems: 'center', marginBottom: 24 },
  welcomeTitle: { fontSize: 28, fontWeight: '800', color: '#1A1D26', textAlign: 'center', marginBottom: 6 },
  welcomeSubtitle: { fontSize: 18, fontWeight: '700', color: '#2563EB', textAlign: 'center', marginBottom: 10 },
  loginInstruction: { fontSize: 14, color: '#8E95A2', textAlign: 'center', lineHeight: 20 },
  formSection: { marginTop: 4 },
  inputGroup: { marginBottom: 18 },
  inputHint: { fontSize: 12, color: '#8E95A2', textAlign: 'right', backgroundColor: '#F4F6FA', padding: 10, borderRadius: 8, lineHeight: 18, marginTop: 6 },
  btnGroup: { marginTop: 4 },
  btnWrap: { marginBottom: 8 },
  forgotBtn: { alignItems: 'center', paddingVertical: 12 },
  forgotBtnText: { fontSize: 14, color: '#2563EB', fontWeight: '600', textAlign: 'center' },
  additionalInfo: { fontSize: 12, color: '#8E95A2', textAlign: 'center', marginTop: 10, backgroundColor: '#F0FDF4', padding: 12, borderRadius: 10, lineHeight: 18, borderWidth: 1, borderColor: '#BBF7D0' },
});

export default LoginScreen;
