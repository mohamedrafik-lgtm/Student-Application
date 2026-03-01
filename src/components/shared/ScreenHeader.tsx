// Shared ScreenHeader — reusable across all screens
// Single Responsibility: Only header rendering with back button + title
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon, { AppIcons } from './Icon';
import { Colors } from '../../styles/colors';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

const ScreenHeader: React.FC<Props> = ({ title, subtitle, onBack, rightElement }) => (
  <View style={s.header}>
    <View style={s.row}>
      {/* Left spacer or right element */}
      <View style={s.side}>{rightElement}</View>

      {/* Title area */}
      <View style={s.center}>
        <Text style={s.title}>{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>

      {/* Back button */}
      <View style={s.side}>
        {onBack ? (
          <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Icon name={AppIcons.back} size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  </View>
);

const s = StyleSheet.create({
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: { width: 42, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center' },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 2,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ScreenHeader;
