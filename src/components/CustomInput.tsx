import React, { useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Colors } from '../styles/colors';
import { Typography } from '../styles/typography';
import { Spacing } from '../styles/spacing';
import { CustomInputProps } from '../types/components';

const CustomInput: React.FC<CustomInputProps> = ({
  label,
  error,
  required = false,
  icon,
  containerStyle,
  ...textInputProps
}) => {
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    textInputProps.onFocus && (textInputProps as any).onFocus();
  };
  const handleBlur = () => {
    Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    textInputProps.onBlur && (textInputProps as any).onBlur();
  };

  const borderColor = error
    ? Colors.error
    : borderAnim.interpolate({ inputRange: [0, 1], outputRange: [Colors.borderMedium, Colors.primary] });

  return (
    <View style={[s.container, containerStyle]}>
      {label && (
        <View style={s.labelRow}>
          <Text style={s.label}>{label}</Text>
          {required && <Text style={s.required}> *</Text>}
        </View>
      )}
      <Animated.View style={[s.inputWrap, { borderColor }, error && s.errorBorder, textInputProps.editable === false && s.disabledWrap]}>
        {icon && <View style={s.iconWrap}>{icon}</View>}
        <TextInput
          style={[s.input, icon ? s.inputWithIcon : null]}
          placeholderTextColor={Colors.inputPlaceholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...textInputProps}
        />
      </Animated.View>
      {error && (
        <View style={s.errorRow}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { marginBottom: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '700', color: '#111827', textAlign: 'right' },
  required: { color: Colors.error, fontSize: 14, fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 56,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  errorBorder: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  disabledWrap: { backgroundColor: Colors.borderLight, opacity: 0.7 },
  iconWrap: { marginLeft: 10, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1, fontSize: 15, color: Colors.textPrimary, textAlign: 'right', paddingVertical: 12,
  },
  inputWithIcon: { marginRight: 4 },
  errorRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5 },
  errorText: { fontSize: 12, color: Colors.error, fontWeight: '600', textAlign: 'right' },
});

export default CustomInput;