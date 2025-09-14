// SOLID Principle: Single Responsibility - This component only handles logo display
import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  showText = true 
}) => {
  const getLogoSize = () => {
    switch (size) {
      case 'small':
        return 60;
      case 'medium':
        return 80;
      case 'large':
        return 100;
      default:
        return 80;
    }
  };

  const logoSize = getLogoSize();

  return (
    <View style={[styles.container, !showText && styles.containerWithoutText]}>
      <View style={[
        styles.logoContainer,
        { width: logoSize, height: logoSize }
      ]}>
        {/* Outer glow ring */}
        <View style={[styles.glowRing, { width: logoSize + 20, height: logoSize + 20 }]} />
        
        {/* Main logo circle */}
        <View style={[styles.logoCircle, { width: logoSize, height: logoSize }]}>
          <Image
            source={require('../../img/502585454_122235753458244801_413190920156398012_n-removebg-preview.png')}
            style={[styles.logoImage, { width: logoSize * 0.75, height: logoSize * 0.75 }]}
            resizeMode="contain"
          />
        </View>
        
        {/* Status indicator dot */}
        <View style={styles.statusDot} />
      </View>
      
      {showText && (
        <Text style={styles.logoText}>
          مرحباً بك في منصة المتدربين
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerWithoutText: {
    marginBottom: 20,
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoCircle: {
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#6366F1',
  },
  logoImage: {
    borderRadius: 40,
  },
  statusDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  logoText: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 20,
    letterSpacing: -0.3,
    flexWrap: 'wrap',
  },
});

export default Logo;
