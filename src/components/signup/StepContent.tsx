// Signup — Step Content component (renders form fields per step)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CustomInput from '../CustomInput';
import DatePicker from '../DatePicker';
import { Colors } from '../../styles/colors';
import Icon, { AppIcons } from '../shared/Icon';

interface Props {
  step: number;
  nationalId: string;
  birthDate: string;
  phone: string;
  password: string;
  confirmPassword: string;
  onNationalIdChange: (t: string) => void;
  onBirthDateChange: (t: string) => void;
  onPhoneChange: (t: string) => void;
  onPasswordChange: (t: string) => void;
  onConfirmPasswordChange: (t: string) => void;
}

const STEPS: { icon: string; title: string; subtitle: string }[] = [
  { icon: 'card-account-details-outline', title: 'التحقق من البيانات', subtitle: 'يرجى إدخال رقم الهوية الوطنية وتاريخ الميلاد' },
  { icon: 'cellphone', title: 'التحقق من رقم الهاتف', subtitle: 'يرجى إدخال رقم هاتفك' },
  { icon: AppIcons.lock, title: 'إنشاء كلمة المرور', subtitle: 'أنشئ كلمة مرور قوية' },
];

const StepContent: React.FC<Props> = ({
  step, nationalId, birthDate, phone, password, confirmPassword,
  onNationalIdChange, onBirthDateChange, onPhoneChange, onPasswordChange, onConfirmPasswordChange,
}) => {
  const info = STEPS[step - 1];
  if (!info) return null;

  return (
    <View style={s.card}>
      <View style={s.titleRow}>
        <Icon name={info.icon} size={24} color={Colors.primary} />
        <Text style={s.title}>{info.title}</Text>
      </View>
      <Text style={s.subtitle}>{info.subtitle}</Text>

      {step === 1 && (
        <>
          <CustomInput label="رقم الهوية الوطنية" value={nationalId} onChangeText={onNationalIdChange}
            placeholder="أدخل رقم الهوية الوطنية" keyboardType="numeric" required />
          <DatePicker label="تاريخ الميلاد" value={birthDate} onChange={onBirthDateChange}
            placeholder="اختر تاريخ الميلاد" required />
        </>
      )}

      {step === 2 && (
        <CustomInput label="رقم الهاتف" value={phone} onChangeText={onPhoneChange}
          placeholder="أدخل رقم الهاتف" keyboardType="phone-pad" required />
      )}

      {step === 3 && (
        <>
          <CustomInput label="كلمة المرور" value={password} onChangeText={onPasswordChange}
            placeholder="أدخل كلمة المرور" secureTextEntry required />
          <CustomInput label="تأكيد كلمة المرور" value={confirmPassword} onChangeText={onConfirmPasswordChange}
            placeholder="أعد إدخال كلمة المرور" secureTextEntry required />
        </>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 22,
    marginBottom: 28,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 4,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  titleRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'center', gap: 8, marginBottom: 6,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textLight, textAlign: 'center', marginBottom: 22 },
});

export default StepContent;
