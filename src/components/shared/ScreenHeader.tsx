// Shared ScreenHeader — premium emerald header used across all screens
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon, { AppIcons } from './Icon';
import { Colors } from '../../styles/colors';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  light?: boolean;
}

const ScreenHeader: React.FC<Props> = ({ title, subtitle, onBack, rightElement, light }) => {
  const bg = light ? Colors.white : Colors.primaryDark;
  const titleColor = light ? Colors.textPrimary : '#FFFFFF';
  const subtitleColor = light ? Colors.textLight : 'rgba(255,255,255,0.75)';
  const btnBg = light ? Colors.backgroundSoft : 'rgba(255,255,255,0.15)';
  const iconColor = light ? Colors.textPrimary : '#FFFFFF';

  return (
    <View style={[s.header, { backgroundColor: bg }]}>
      {!light && <View style={s.decorCircle1} />}
      {!light && <View style={s.decorCircle2} />}
      <View style={s.row}>
        {/* Left side: spacer or right element */}
        <View style={s.side}>{rightElement ?? <View style={s.placeholder} />}</View>

        {/* Center: title */}
        <View style={s.center}>
          <Text style={[s.title, { color: titleColor }]} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={[s.subtitle, { color: subtitleColor }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>

        {/* Right: back button */}
        <View style={s.side}>
          {onBack ? (
            <TouchableOpacity style={[s.backBtn, { backgroundColor: btnBg }]} onPress={onBack} activeOpacity={0.7}>
              <Icon name={AppIcons.back} size={20} color={iconColor} />
            </TouchableOpacity>
          ) : <View style={s.placeholder} />}
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -40,
    left: -20,
  },
  decorCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -30,
    right: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: { width: 42, alignItems: 'center' },
  placeholder: { width: 40 },
  center: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 3,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ScreenHeader;

