// Shared hook — fade-in animation on mount
import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export const useFadeIn = (duration = 400, delay = 0) => {
  const opacity = useRef(new Animated.Value(0)).current;

  const fadeIn = () => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  };

  const reset = () => {
    opacity.setValue(0);
  };

  return { opacity, fadeIn, reset };
};
