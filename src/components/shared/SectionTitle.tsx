// Shared SectionTitle — section heading with optional badge
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';
import { Colors } from '../../styles/colors';

interface Props {
  title: string;
  icon?: string;
  badge?: string | number;
  badgeColor?: string;
}

const SectionTitle: React.FC<Props> = ({ title, icon, badge, badgeColor = Colors.primary }) => (
  <View style={s.row}>
    {badge !== undefined ? (
      <View style={[s.badge, { backgroundColor: badgeColor + '18' }]}>  
        <Text style={[s.badgeText, { color: badgeColor }]}>{badge}</Text>
      </View>
    ) : null}
    <View style={s.titleArea}>
      <Text style={s.title}>{title}</Text>
    </View>
    {icon ? <Icon name={icon} size={20} color={Colors.primary} /> : null}
  </View>
);

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    marginBottom: 12, gap: 8,
  },
  titleArea: { flex: 1, alignItems: 'flex-end' },
  title: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right' },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
});

export default SectionTitle;
