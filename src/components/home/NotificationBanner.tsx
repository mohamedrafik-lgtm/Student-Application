// Home — Notification Banner (grade results available)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon, { AppIcons } from '../shared/Icon';
import { Colors } from '../../styles/colors';

interface Props {
  onViewResults?: () => void;
}

const NotificationBanner: React.FC<Props> = ({ onViewResults }) => (
  <View style={s.banner}>
    <TouchableOpacity style={s.actionBtn} onPress={onViewResults}>
      <Icon name={AppIcons.grades} size={15} color={Colors.white} />
      <Text style={s.actionBtnText}>عرض النتائج</Text>
    </TouchableOpacity>
    <View style={s.textArea}>
      <View style={s.row}>
        <Icon name={AppIcons.check} size={16} color={Colors.primary} />
        <Text style={s.title}>تم إعلان نتائج الفترة الأولى</Text>
      </View>
      <Text style={s.sub}>نتائج الفصل الأول متاحة للعرض الآن</Text>
    </View>
  </View>
);

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 12,
    borderRadius: 18, padding: 14,
    borderWidth: 1.5, borderColor: Colors.successBorder,
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  textArea: { flex: 1, alignItems: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 6 },
  title: { fontSize: 14, fontWeight: '700', color: Colors.primary, textAlign: 'right' },
  sub: { fontSize: 11, color: Colors.textLight, textAlign: 'right' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, gap: 4,
  },
  actionBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
});

export default NotificationBanner;
