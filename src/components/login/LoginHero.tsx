import React from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Logo from '../Logo';
import { Colors } from '../../styles/colors';

const { width } = Dimensions.get('window');

interface Props { opacity: Animated.Value; }

const LoginHero: React.FC<Props> = ({ opacity }) => (
  <View style={s.heroBg}>
    <View style={s.blob1} />
    <View style={s.blob2} />
    <View style={s.blob3} />
    <View style={s.blob4} />
    <Animated.View style={[s.heroContent, { opacity }]}>
      <Logo size="large" showText={false} />
      <Text style={s.heroTitle}>منصة المتدربين</Text>
      <Text style={s.heroTagline}>طيبة للتعليم والتدريب</Text>
    </Animated.View>
  </View>
);

const s = StyleSheet.create({
  heroBg: {
    backgroundColor: Colors.primaryDark,
    paddingTop: 55,
    paddingBottom: 75,
    alignItems: 'center',
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', top: -50, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  blob2: {
    position: 'absolute', top: 30, left: -70,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
  },
  blob3: {
    position: 'absolute', bottom: -40, right: width * 0.25,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(167, 243, 208, 0.12)',
  },
  blob4: {
    position: 'absolute', bottom: 10, left: width * 0.1,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  heroContent: { alignItems: 'center', zIndex: 2 },
  heroTitle: {
    fontSize: 28, fontWeight: '800', color: '#FFFFFF',
    marginTop: 16, letterSpacing: 0.3,
  },
  heroTagline: {
    fontSize: 14, color: 'rgba(255,255,255,0.7)',
    marginTop: 6, letterSpacing: 0.5,
  },
});

export default LoginHero;