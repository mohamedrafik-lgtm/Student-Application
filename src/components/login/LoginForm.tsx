// LoginScreen — Form component
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import CustomInput from '../CustomInput';
import Icon, { AppIcons } from '../shared/Icon';
import { Colors } from '../../styles/colors';

interface Props {
  nationalId: string;
  password: string;
  errors: { nationalId?: string; password?: string };
  isLoading: boolean;
  onNationalIdChange: (text: string) => void;
  onPasswordChange: (text: string) => void;
  onLogin: () => void;
  onForgotPassword: () => void;
}

const LoginForm: React.FC<Props> = ({
  nationalId, password, errors, isLoading,
  onNationalIdChange, onPasswordChange, onLogin, onForgotPassword,
}) => (
  <View>
    {/* National ID */}
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>رقم الهوية الوطنية <Text style={s.reqStar}>*</Text></Text>
      <View style={[s.inputRow, errors.nationalId ? s.inputRowError : null]}>
        <Icon name="card-account-details-outline" size={20} color={Colors.textHint} style={{ marginLeft: 10 }} />
        <CustomInput
          placeholder="14 رقماً كما هو في الهوية"
          value={nationalId}
          onChangeText={onNationalIdChange}
          keyboardType="numeric"
          maxLength={14}
          containerStyle={s.bareInput}
        />
      </View>
      {errors.nationalId ? (
        <View style={s.errRow}>
          <Icon name={AppIcons.warning} size={14} color={Colors.error} />
          <Text style={s.errText}>{errors.nationalId}</Text>
        </View>
      ) : null}
    </View>

    {/* Password */}
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>كلمة المرور <Text style={s.reqStar}>*</Text></Text>
      <View style={[s.inputRow, errors.password ? s.inputRowError : null]}>
        <Icon name={AppIcons.lock} size={20} color={Colors.textHint} style={{ marginLeft: 10 }} />
        <CustomInput
          placeholder="أدخل كلمة المرور"
          value={password}
          onChangeText={onPasswordChange}
          secureTextEntry
          containerStyle={s.bareInput}
        />
      </View>
      {errors.password ? (
        <View style={s.errRow}>
          <Icon name={AppIcons.warning} size={14} color={Colors.error} />
          <Text style={s.errText}>{errors.password}</Text>
        </View>
      ) : null}
    </View>

    {/* Forgot password */}
    <TouchableOpacity onPress={onForgotPassword} style={s.forgotRow} activeOpacity={0.7}>
      <Text style={s.forgotText}>نسيت كلمة المرور؟</Text>
    </TouchableOpacity>

    {/* Login button */}
    <TouchableOpacity
      style={[s.loginBtn, isLoading && s.loginBtnDisabled]}
      onPress={onLogin}
      activeOpacity={0.85}
      disabled={isLoading}
    >
      {isLoading ? (
        <Text style={s.loginBtnText}>جارٍ تسجيل الدخول…</Text>
      ) : (
        <>
          <Icon name="login" size={18} color={Colors.white} style={{ marginLeft: 6 }} />
          <Text style={s.loginBtnText}>تسجيل الدخول</Text>
        </>
      )}
    </TouchableOpacity>
  </View>
);

const s = StyleSheet.create({
  fieldWrap: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 14, fontWeight: '700', color: Colors.textPrimary,
    textAlign: 'right', marginBottom: 8,
  },
  reqStar: { color: Colors.error, fontSize: 15 },
  inputRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: Colors.backgroundSoft,
    borderWidth: 1.5, borderColor: Colors.borderMedium,
    borderRadius: 14, paddingHorizontal: 14, minHeight: 56,
  },
  inputRowError: {
    borderColor: Colors.error, backgroundColor: Colors.errorLight,
  },
  bareInput: { flex: 1, marginBottom: 0 },
  errRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    marginTop: 6, gap: 4,
  },
  errText: {
    fontSize: 12, color: Colors.error, textAlign: 'right', flex: 1,
  },
  forgotRow: { alignItems: 'flex-end', marginBottom: 22, marginTop: -4 },
  forgotText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 17,
    shadowColor: Colors.shadowPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 6,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: {
    fontSize: 17, fontWeight: '800', color: Colors.white, letterSpacing: 0.5,
  },
});

export default LoginForm;
