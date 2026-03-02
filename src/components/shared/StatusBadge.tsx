// Shared StatusBadge  premium pill badge
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';
import { Colors } from '../../styles/colors';

interface Props {
  label: string;
  color?: string;
  backgroundColor?: string;
  icon?: string;
  size?: 'sm' | 'md';
}

const StatusBadge: React.FC<Props> = ({
  label, color = Colors.primary, backgroundColor = Colors.primarySoft, icon, size = 'sm',
}) => {
  const isSmall = size === 'sm';
  return (
    <View style={[s.badge, { backgroundColor }, isSmall ? s.sm : s.md]}>
      {icon ? <Icon name={icon} size={isSmall ? 12 : 14} color={color} /> : null}
      <Text style={[s.label, { color }, isSmall ? s.smText : s.mdText]}>{label}</Text>
    </View>
  );
};

const s = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, alignSelf: 'flex-start',
  },
  sm: { paddingHorizontal: 10, paddingVertical: 4 },
  md: { paddingHorizontal: 12, paddingVertical: 6 },
  label: { fontWeight: '700' },
  smText: { fontSize: 11 },
  mdText: { fontSize: 13 },
});

export default StatusBadge;