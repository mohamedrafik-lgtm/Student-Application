// Home — AI Assistant section
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from '../shared/Icon';
import { Colors } from '../../styles/colors';

const AIAssistantSection: React.FC = () => (
  <View style={s.card}>
    <View style={s.header}>
      <Text style={s.title}>المساعد الذكي AI</Text>
      <View style={s.badge}><Text style={s.badgeText}>مرحباً</Text></View>
    </View>
    <Text style={s.subtitle}>يمكنك التحدث مع المساعد الذكي في أي وقت</Text>
    <Text style={s.desc}>
      تعمل على مفاهيم ومحتوى المنشأت الاستعداديه لمراجعاتك في المحاضرات
      {'\n'}الاتوقفين ستساعد من الايام على أسئلتك بالنصوص والاجابة لتحسين المحاضرات
      {'\n'}ومساعدتك في فهم المواد المعقدة خطوة بخطوة
    </Text>
    <View style={s.btnsRow}>
      <TouchableOpacity style={s.btn}>
        <Icon name="microphone" size={16} color={Colors.white} />
        <Text style={s.btnText}>تفاعل صوتي</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.btn, s.btnOutline]}>
        <Icon name="chat-outline" size={16} color={Colors.primary} />
        <Text style={[s.btnText, s.btnOutlineText]}>محادثة نصية</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const s = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginTop: 14, backgroundColor: Colors.white,
    borderRadius: 18, padding: 18,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginLeft: 8 },
  badge: { backgroundColor: Colors.backgroundSoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  subtitle: { fontSize: 12, color: Colors.primary, fontWeight: '600', textAlign: 'right', marginBottom: 6 },
  desc: { fontSize: 11, color: Colors.textLight, textAlign: 'right', lineHeight: 18, marginBottom: 14 },
  btnsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 6,
  },
  btnOutline: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.primary },
  btnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  btnOutlineText: { color: Colors.primary },
});

export default AIAssistantSection;
