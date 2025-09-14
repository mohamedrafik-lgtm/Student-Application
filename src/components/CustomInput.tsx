// SOLID Principles Applied:
// 1. Single Responsibility: This component only handles input rendering and basic validation
// 2. Open/Closed: Can be extended with new props without modifying existing code
// 3. Liskov Substitution: Can be used anywhere a TextInput is expected
// 4. Interface Segregation: Uses specific props interface
// 5. Dependency Inversion: Depends on abstractions (props) not concretions

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
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
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}
      
      <View style={[
        styles.inputContainer,
        error && styles.inputError,
        textInputProps.editable === false && styles.inputDisabled
      ]}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        
        <TextInput
          style={[
            styles.input,
            icon ? styles.inputWithIcon : null,
          ]}
          placeholderTextColor={Colors.inputPlaceholder}
          {...textInputProps}
        />
      </View>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  labelContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'right',
    marginRight: 6,
    letterSpacing: -0.2,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  required: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 18,
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  inputDisabled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.7,
    borderColor: '#CBD5E1',
  },
  iconContainer: {
    marginLeft: 12,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    textAlign: 'right',
    paddingVertical: 14,
    writingDirection: 'rtl',
    minHeight: 22,
    fontWeight: '500',
    lineHeight: 22,
  },
  inputWithIcon: {
    paddingRight: 0,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 8,
    textAlign: 'right',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 10,
    borderRadius: 8,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    fontWeight: '500',
    flexWrap: 'wrap',
  },
});

export default CustomInput;
