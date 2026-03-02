import React, { useRef } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View, Animated } from 'react-native';
import { CustomButtonProps } from '../types/components';
import { Colors } from '../styles/colors';

const PRIMARY = Colors.primary;
const OUTLINE_COLOR = Colors.primary;

const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  disabled,
  onPress,
  ...touchableOpacityProps
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 2 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  };

  const containerStyle: any[] = [
    styles.base,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'outline' && styles.outline,
    size === 'small' && styles.sm,
    size === 'large' && styles.lg,
    (disabled || loading) && styles.disabled,
  ];

  const textStyle: any[] = [
    styles.label,
    variant === 'primary' && styles.labelPrimary,
    variant === 'secondary' && styles.labelSecondary,
    variant === 'outline' && styles.labelOutline,
    size === 'small' && styles.labelSm,
    size === 'large' && styles.labelLg,
  ];

  const spinnerColor = variant === 'outline' ? PRIMARY : '#FFFFFF';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
        {...touchableOpacityProps}
      >
        <View style={styles.inner}>
          {loading ? (
            <ActivityIndicator size="small" color={spinnerColor} />
          ) : (
            <>
              {icon && <View style={styles.iconWrap}>{icon}</View>}
              <Text style={textStyle} numberOfLines={1}>{title}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 28,
    minHeight: 52,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primary: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  secondary: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accentDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: OUTLINE_COLOR,
  },
  sm: { paddingVertical: 10, paddingHorizontal: 20, minHeight: 40, borderRadius: 10 },
  lg: { paddingVertical: 18, paddingHorizontal: 36, minHeight: 58, borderRadius: 16 },
  disabled: { opacity: 0.55 },
  label: { fontWeight: '700', fontSize: 15, letterSpacing: 0.1, textAlign: 'center' },
  labelPrimary: { color: '#FFFFFF' },
  labelSecondary: { color: '#FFFFFF' },
  labelOutline: { color: OUTLINE_COLOR },
  labelSm: { fontSize: 13 },
  labelLg: { fontSize: 17 },
  iconWrap: { marginHorizontal: 2 },
});

export default CustomButton;
