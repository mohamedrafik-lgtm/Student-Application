// GradientBackground  premium emerald background
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface Props { children: React.ReactNode; }

const GradientBackground: React.FC<Props> = ({ children }) => (
  <View style={s.container}>
    <View style={s.circle1} />
    <View style={s.circle2} />
    <View style={s.circle3} />
    {children}
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, position: 'relative', overflow: 'hidden' },
  circle1: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(5, 150, 105, 0.06)',
  },
  circle2: {
    position: 'absolute', bottom: 80, left: -80,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  circle3: {
    position: 'absolute', top: 200, right: -40,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(5, 150, 105, 0.04)',
  },
});

export default GradientBackground;