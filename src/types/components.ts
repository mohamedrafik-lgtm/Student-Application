// SOLID Principle: Interface Segregation - Component-specific interfaces

import { TextInputProps, TouchableOpacityProps } from 'react-native';

export interface CustomInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  required?: boolean;
  icon?: React.ReactNode;
  containerStyle?: object;
}

export interface CustomButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  icon?: React.ReactNode;
}
