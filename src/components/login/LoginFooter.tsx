// LoginScreen — Footer component (signup + info note)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon, { AppIcons } from '../shared/Icon';
import { Colors } from '../../styles/colors';

interface Props {
  onNavigateToSignup?: () => void;
}

const LoginFooter: React.FC<Props> = ({ onNavigateToSignup }) => (
  <View>
    {/* Or divider */}
    <View style={s.orRow}>
      <View style={s.orLine} />
      <Text style={s.orText}>أو</Text>
      <View style={s.orLine} />
    </View>

    {/* Signup button */}
    <TouchableOpacity
      style={s.signupBtn}
      onPress={onNavigateToSignup}
      activeOpacity={0.8}
    >
      <Icon name="account-plus-outline" size={18} color={Colors.primary} style={{ marginLeft: 6 }} />
      <Text style={s.signupBtnText}>إنشاء حساب جديد</Text>
    </TouchableOpacity>

    {/* Info note */}
    <View style={s.noteBox}>
      <Icon name={AppIcons.info} size={16} color={Colors.primary} style={{ marginTop: 1 }} />
      <Text style={s.noteText}>
        يجب أن تكون مسجلاً في المركز مسبقاً للوصول إلى المنصة
      </Text>
    </View>
  </View>
);

const s = StyleSheet.create({
  orRow: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 20, gap: 10,
  },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.borderMedium },
  orText: { fontSize: 13, color: Colors.textHint, fontWeight: '600' },
  signupBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: 16, paddingVertical: 15,
  },
  signupBtnText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  noteBox: {
    flexDirection: 'row-reverse', alignItems: 'flex-start',
    backgroundColor: Colors.backgroundSoft, borderWidth: 1,
    borderColor: Colors.successBorder, borderRadius: 12,
    padding: 14, marginTop: 20, gap: 8,
  },
  noteText: {
    flex: 1, fontSize: 12, color: Colors.primaryDark,
    lineHeight: 19, textAlign: 'right',
  },
});

export default LoginFooter;
