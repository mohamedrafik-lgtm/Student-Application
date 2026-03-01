// Shared StatusBadge — small colored pill for status display
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
    borderRadius: 8, alignSelf: 'flex-start',
  },
  sm: { paddingHorizontal: 8, paddingVertical: 3 },
  md: { paddingHorizontal: 10, paddingVertical: 5 },
  label: { fontWeight: '700' },
  smText: { fontSize: 10 },
  mdText: { fontSize: 12 },
});

export default StatusBadge;
