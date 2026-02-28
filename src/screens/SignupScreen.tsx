// Signup Screen - 3-step wizard (verify trainee → verify phone → create password)
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import DatePicker from '../components/DatePicker';
import Logo from '../components/Logo';
import { AuthService } from '../services/authService';

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

  const renderStepIndicator = () => (
    <View style={s.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={s.stepRow}>
          <View style={[s.stepCircle, currentStep >= step && s.stepCircleActive]}>
            <Text style={[s.stepNum, currentStep >= step && s.stepNumActive]}>{step}</Text>
          </View>
          {step < 3 && <View style={[s.stepLine, currentStep > step && s.stepLineActive]} />}
        </View>
      ))}
    </View>
  );

  const renderContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={s.formCard}>
            <Text style={s.stepTitle}>التحقق من البيانات</Text>
            <Text style={s.stepSubtitle}>يرجى إدخال رقم الهوية الوطنية وتاريخ الميلاد</Text>
            <CustomInput label="رقم الهوية الوطنية" value={nationalId} onChangeText={setNationalId} placeholder="أدخل رقم الهوية الوطنية" keyboardType="numeric" required />
            <DatePicker label="تاريخ الميلاد" value={birthDate} onChange={setBirthDate} placeholder="اختر تاريخ الميلاد" required />
          </View>
        );
      case 2:
        return (
          <View style={s.formCard}>
            <Text style={s.stepTitle}>التحقق من رقم الهاتف</Text>
            <Text style={s.stepSubtitle}>يرجى إدخال رقم هاتفك</Text>
            <CustomInput label="رقم الهاتف" value={phone} onChangeText={setPhone} placeholder="أدخل رقم الهاتف" keyboardType="phone-pad" required />
          </View>
        );
      case 3:
        return (
          <View style={s.formCard}>
            <Text style={s.stepTitle}>إنشاء كلمة المرور</Text>
            <Text style={s.stepSubtitle}>أنشئ كلمة مرور قوية</Text>
            <CustomInput label="كلمة المرور" value={password} onChangeText={setPassword} placeholder="أدخل كلمة المرور" secureTextEntry required />
            <CustomInput label="تأكيد كلمة المرور" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="أعد إدخال كلمة المرور" secureTextEntry required />
          </View>
        );
      default: return null;
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backBtnText}>→</Text></TouchableOpacity>
          <Logo size="medium" showText={false} />
          <Text style={s.title}>إنشاء حساب جديد</Text>
        </View>

        {renderStepIndicator()}
        {renderContent()}

        {/* Navigation Buttons */}
        <View style={s.navigation}>
          {currentStep > 1 && (
            <View style={s.navBtnWrap}><CustomButton title="السابق" onPress={() => setCurrentStep(currentStep - 1)} variant="outline" size="large" /></View>
          )}
          <View style={s.navBtnWrap}>
            <CustomButton
              title={currentStep === 1 ? 'التحقق' : currentStep === 2 ? 'التالي' : 'إنشاء الحساب'}
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  scrollContent: { flexGrow: 1, padding: 20 },
  header: { alignItems: 'center', marginBottom: 28, marginTop: 16 },
  backBtn: { alignSelf: 'flex-end', width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  backBtnText: { fontSize: 20, color: '#1A1D26', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1D26', textAlign: 'center', marginTop: 14 },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: '#2563EB' },
  stepNum: { fontSize: 15, fontWeight: '700', color: '#8E95A2' },
  stepNumActive: { color: '#FFF' },
  stepLine: { width: 50, height: 2, backgroundColor: '#E2E8F0', marginHorizontal: 6 },
  stepLineActive: { backgroundColor: '#2563EB' },
  formCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 22, marginBottom: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  stepTitle: { fontSize: 20, fontWeight: '800', color: '#1A1D26', textAlign: 'center', marginBottom: 6 },
  stepSubtitle: { fontSize: 14, color: '#8E95A2', textAlign: 'center', marginBottom: 22 },
  navigation: { flexDirection: 'row', marginBottom: 20, gap: 12 },
  navBtnWrap: { flex: 1 },
});

export default SignupScreen;
