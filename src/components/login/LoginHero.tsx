// LoginScreen — Hero Section component
import React from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Logo from '../Logo';
import { Colors } from '../../styles/colors';

const { width } = Dimensions.get('window');

interface Props {
  opacity: Animated.Value;
}

const LoginHero: React.FC<Props> = ({ opacity }) => (
  <View style={s.heroBg}>
    <View style={s.blob1} />
    <View style={s.blob2} />
    <View style={s.blob3} />
    <Animated.View style={[s.heroContent, { opacity }]}>
      <Logo size="large" showText={false} />
      <Text style={s.heroTitle}>منصة المتدربين</Text>
      <Text style={s.heroSubtitle}>بوابتك نحو التعلم والتطور</Text>
    </Animated.View>
  </View>
);

const s = StyleSheet.create({
  heroBg: {
    backgroundColor: Colors.primaryDark,
    paddingTop: 60,
    paddingBottom: 70,
    alignItems: 'center',
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', top: -40, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  blob2: {
    position: 'absolute', top: 20, left: -60,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(13, 148, 136, 0.2)',
  },
  blob3: {
    position: 'absolute', bottom: -30, right: width * 0.3,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(167, 243, 208, 0.15)',
  },
  heroContent: { alignItems: 'center', zIndex: 2 },
  heroTitle: {
    fontSize: 26, fontWeight: '800', color: '#FFFFFF',
    marginTop: 14, letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.75)',
    marginTop: 6, letterSpacing: 0.3,
  },
});

export default LoginHero;
