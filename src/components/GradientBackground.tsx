// SOLID Principle: Single Responsibility - This component only handles gradient background
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../styles/colors';

interface GradientBackgroundProps {
  children: React.ReactNode;
}

const GradientBackground: React.FC<GradientBackgroundProps> = ({ children }) => {
  return (
    <View style={styles.container}>
      <View style={styles.gradient} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E8F8F5',
    // Adding some decorative circles for visual appeal
    opacity: 1,
  },
});

export default GradientBackground;
