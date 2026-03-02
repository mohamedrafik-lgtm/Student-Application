// LoginScreen — Refactored (SOLID: components split into components/login/)
import React, { useState, useRef, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, KeyboardAvoidingView,
  Platform, TouchableOpacity, Text, Alert, Animated, Dimensions, StatusBar,
} from 'react-native';
import { TraineeLoginRequest, TraineeLoginError, BranchType } from '../types/auth';
import { AuthService } from '../services/authService';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
import { LoginHero } from '../components/login';
import LoginForm from '../components/login/LoginForm';
import LoginFooter from '../components/login/LoginFooter';

const { height } = Dimensions.get('window');

interface LoginScreenProps {
  onLoginSuccess?: (loginData: any) => void;
  onNavigateToSignup?: () => void;
  onChangeBranch?: () => void;
  selectedBranch?: BranchType | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess, onNavigateToSignup, onChangeBranch, selectedBranch,
}) => {
  const [credentials, setCredentials] = useState<TraineeLoginRequest>({ nationalId: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<TraineeLoginRequest>>({});

  // Animations
  const heroAnim    = useRef(new Animated.Value(0)).current;
  const cardAnim    = useRef(new Animated.Value(60)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const formAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(cardAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(formAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Validation ──
  const validateForm = (): boolean => {
    const e: Partial<TraineeLoginRequest> = {};
    if (!credentials.nationalId.trim()) e.nationalId = 'الرقم القومي مطلوب';
    else if (credentials.nationalId.length !== 14) e.nationalId = 'يجب إدخال 14 رقماً كما هو موجود في بطاقة الهوية';
    if (!credentials.password.trim()) e.password = 'كلمة المرور مطلوبة';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Login handler ──
  const handleLogin = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const response = await AuthService.login(credentials);
      onLoginSuccess
        ? onLoginSuccess(response)
        : Alert.alert('نجح تسجيل الدخول', `مرحباً ${response.trainee.nameAr}\nتم تسجيل الدخول بنجاح`);
    } catch (error) {
      const apiError = error as TraineeLoginError;
      let msg = 'حدث خطأ أثناء تسجيل الدخول';
      let title = 'خطأ في تسجيل الدخول';
      if (apiError.statusCode === 401) { msg = 'الرقم القومي أو كلمة المرور غير صحيحة'; title = 'بيانات خاطئة'; }
      else if (apiError.statusCode === 0)   { msg = apiError.message; title = 'خطأ في الاتصال'; }
      else if (apiError.statusCode === 500) { msg = 'خطأ في الخادم. حاول مرة أخرى لاحقاً'; title = 'خطأ في الخادم'; }
      else if (apiError.statusCode === 404) { msg = 'عنوان الخادم غير صحيح. تحقق من الإعدادات'; title = 'عنوان غير صحيح'; }
      else if (apiError.message) { msg = apiError.message; }
      Alert.alert(title, msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => Alert.alert('نسيت كلمة المرور', 'سيتم إضافة هذه الميزة قريباً');

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* ─── Hero ─── */}
      <LoginHero opacity={heroAnim} />

      {/* ─── Floating card ─── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kavFlex}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={[s.card, { opacity: cardOpacity, transform: [{ translateY: cardAnim }] }]}>
            {/* Branch pill */}
            <TouchableOpacity style={s.branchPill} onPress={onChangeBranch || (() => {})} activeOpacity={0.75}>
              <Icon name="office-building-outline" size={15} color={Colors.primary} />
              <Text style={s.branchPillText}>تغيير الفرع</Text>
            </TouchableOpacity>

            {/* Card header */}
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>تسجيل الدخول</Text>
              <Text style={s.cardSub}>أدخل بياناتك للمتابعة</Text>
            </View>

            <View style={s.divider} />

            {/* Form + Footer */}
            <Animated.View style={{ opacity: formAnim }}>
              <LoginForm
                nationalId={credentials.nationalId}
                password={credentials.password}
                errors={errors}
                isLoading={isLoading}
                onNationalIdChange={(text) => {
                  setCredentials(prev => ({ ...prev, nationalId: text }));
                  if (errors.nationalId) setErrors(prev => ({ ...prev, nationalId: undefined }));
                }}
                onPasswordChange={(text) => {
                  setCredentials(prev => ({ ...prev, password: text }));
                  if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                }}
                onLogin={handleLogin}
                onForgotPassword={handleForgotPassword}
              />
              <LoginFooter onNavigateToSignup={onNavigateToSignup} />
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primaryDark },
  kavFlex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40,
    minHeight: height * 0.62,
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 10,
  },
  branchPill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end',
    backgroundColor: Colors.backgroundSoft, paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 20, marginBottom: 22, gap: 6,
  },
  branchPillText: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  cardHeader: { alignItems: 'flex-end', marginBottom: 6 },
  cardTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right' },
  cardSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'right', marginTop: 4 },
  divider: { height: 1, backgroundColor: Colors.borderMedium, marginVertical: 20, borderRadius: 1 },
});

export default LoginScreen;
