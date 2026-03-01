// Signup Screen — Refactored (components split into components/signup/)
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';
import Logo from '../components/Logo';
import { AuthService } from '../services/authService';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
import { StepIndicator, StepContent } from '../components/signup';

interface SignupScreenProps {
  onBack: () => void;
  onSignupSuccess?: () => void;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ onBack, onSignupSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [nationalId, setNationalId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!nationalId.trim() || !birthDate.trim()) { Alert.alert('خطأ', 'يرجى إدخال جميع البيانات المطلوبة'); return; }
      setIsLoading(true);
      try {
        const result = await AuthService.verifyTrainee({ nationalId, birthDate });
        if (result.hasAccount) {
          Alert.alert('حساب موجود', `مرحباً ${result.name}!\nلديك حساب بالفعل. هل تريد تسجيل الدخول؟`, [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'تسجيل الدخول', onPress: () => onSignupSuccess?.() },
          ]);
        } else {
          Alert.alert('تم التحقق بنجاح', `مرحباً ${result.name}!\nتم التحقق من بياناتك بنجاح.`, [
            { text: 'متابعة', onPress: () => setCurrentStep(2) },
          ]);
        }
      } catch (error: any) { Alert.alert('خطأ', error.message || 'حدث خطأ أثناء التحقق من البيانات'); }
      finally { setIsLoading(false); }
    } else if (currentStep === 2) {
      if (!phone.trim()) { Alert.alert('خطأ', 'يرجى إدخال رقم الهاتف'); return; }
      setIsLoading(true);
      try {
        const result = await AuthService.verifyPhone({ nationalId, phone });
        if (result.success) {
          Alert.alert('تم التحقق بنجاح', 'تم التحقق من رقم الهاتف بنجاح.', [{ text: 'متابعة', onPress: () => setCurrentStep(3) }]);
        }
      } catch (error: any) { Alert.alert('خطأ', error.message || 'حدث خطأ أثناء التحقق من رقم الهاتف'); }
      finally { setIsLoading(false); }
    } else if (currentStep === 3) {
      if (!password.trim() || !confirmPassword.trim()) { Alert.alert('خطأ', 'يرجى إدخال كلمة المرور والتأكيد'); return; }
      if (password !== confirmPassword) { Alert.alert('خطأ', 'كلمة المرور وتأكيدها غير متطابقتين'); return; }
      if (password.length < 6) { Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
      setIsLoading(true);
      try {
        const result = await AuthService.createPassword({ nationalId, birthDate, password });
        if (result.success) {
          Alert.alert('تم إنشاء الحساب بنجاح', 'تم إنشاء حسابك بنجاح. يمكنك الآن تسجيل الدخول.', [
            { text: 'موافق', onPress: () => onSignupSuccess?.() },
          ]);
        }
      } catch (error: any) { Alert.alert('خطأ', error.message || 'حدث خطأ أثناء إنشاء الحساب'); }
      finally { setIsLoading(false); }
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Icon name={AppIcons.back} size={20} color={Colors.primary} />
          </TouchableOpacity>
          <Logo size="medium" showText={false} />
          <Text style={s.title}>إنشاء حساب جديد</Text>
        </View>

        <StepIndicator currentStep={currentStep} />

        <StepContent
          step={currentStep}
          nationalId={nationalId} birthDate={birthDate} phone={phone}
          password={password} confirmPassword={confirmPassword}
          onNationalIdChange={setNationalId} onBirthDateChange={setBirthDate}
          onPhoneChange={setPhone} onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmPassword}
        />

        {/* Navigation */}
        <View style={s.navigation}>
          {currentStep > 1 && (
            <TouchableOpacity style={s.prevBtn} onPress={() => setCurrentStep(currentStep - 1)} activeOpacity={0.7}>
              <Icon name="arrow-right" size={18} color={Colors.primary} />
              <Text style={s.prevBtnText}>السابق</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.nextBtn, isLoading && s.nextBtnDisabled]}
            onPress={handleNext} activeOpacity={0.85} disabled={isLoading}
          >
            <Text style={s.nextBtnText}>
              {isLoading ? 'جاري التحميل...' : currentStep === 1 ? 'التحقق' : currentStep === 2 ? 'التالي' : 'إنشاء الحساب'}
            </Text>
            {!isLoading && <Icon name="arrow-left" size={18} color={Colors.white} />}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1, padding: 20 },
  header: { alignItems: 'center', marginBottom: 28, marginTop: 16 },
  backBtn: {
    alignSelf: 'flex-end', width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 6, elevation: 3, borderWidth: 1, borderColor: Colors.borderLight,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginTop: 14 },
  navigation: { flexDirection: 'row', marginBottom: 20, gap: 12 },
  prevBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 16,
    paddingVertical: 15, gap: 6,
  },
  prevBtnText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 15, gap: 6,
    shadowColor: Colors.shadowPrimary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 10, elevation: 5,
  },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnText: { fontSize: 16, fontWeight: '800', color: Colors.white },
});

export default SignupScreen;
