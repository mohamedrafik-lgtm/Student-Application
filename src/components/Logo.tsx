import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Colors } from '../styles/colors';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', showText = true }) => {
  const dim = size === 'small' ? 64 : size === 'large' ? 110 : 88;
  return (
    <View style={s.container}>
      <View style={[s.ring, { width: dim + 24, height: dim + 24, borderRadius: (dim + 24) / 2 }]}>
        <View style={[s.circle, { width: dim, height: dim, borderRadius: dim / 2 }]}>
          <Image
            source={require('../../img/502585454_122235753458244801_413190920156398012_n-removebg-preview.png')}
            style={{ width: dim * 0.72, height: dim * 0.72 }}
            resizeMode="contain"
          />
        </View>
      </View>
      {showText && (
        <View style={s.textWrap}>
          <Text style={s.title}>منصة المتدربين</Text>
          <Text style={s.subtitle}>مركز طيبة التدريبي</Text>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { alignItems: 'center' },
  ring: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  circle: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  textWrap: { alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
});

export default Logo;