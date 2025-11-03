/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

// Mock all dependencies before importing the component
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => <>{children}</>,
  SafeAreaView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('../src/services/authService', () => ({
  AuthService: {
    verifyTrainee: jest.fn(),
    verifyPhone: jest.fn(),
    createPassword: jest.fn(),
  },
}));

jest.mock('../src/components/CustomButton', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return ({ title, onPress }: any) => (
    <TouchableOpacity onPress={onPress}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
});

jest.mock('../src/components/CustomInput', () => {
  const React = require('react');
  const { Text, TextInput } = require('react-native');
  return ({ label, value, onChangeText }: any) => (
    <>
      {label && <Text>{label}</Text>}
      <TextInput value={value} onChangeText={onChangeText} />
    </>
  );
});

jest.mock('../src/components/DatePicker', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return ({ label, value, onChange }: any) => (
    <TouchableOpacity onPress={() => onChange('1990-01-01')}>
      <Text>{value || 'اختر التاريخ'}</Text>
    </TouchableOpacity>
  );
});

jest.mock('../src/components/Logo', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="logo" />;
});

const SignupScreen = require('../src/screens/SignupScreen').default;

describe('SignupScreen', () => {
  const mockOnBack = jest.fn();
  const mockOnSignupSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    let tree;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <SignupScreen onBack={mockOnBack} onSignupSuccess={mockOnSignupSuccess} />
      );
    });
    
    expect(tree).toBeTruthy();
    tree?.unmount();
  });

  it('renders without onSignupSuccess prop', () => {
    let tree;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <SignupScreen onBack={mockOnBack} />
      );
    });
    
    expect(tree).toBeTruthy();
    tree?.unmount();
  });

  it('renders header components', () => {
    let instance;
    ReactTestRenderer.act(() => {
      instance = ReactTestRenderer.create(
        <SignupScreen onBack={mockOnBack} onSignupSuccess={mockOnSignupSuccess} />
      );
    });

    const testRenderer = instance as any;
    const logoElements = testRenderer.root.findAllByProps({ testID: 'logo' });
    expect(logoElements.length).toBeGreaterThan(0);
    
    instance?.unmount();
  });

  it('renders step indicators', () => {
    let instance;
    ReactTestRenderer.act(() => {
      instance = ReactTestRenderer.create(
        <SignupScreen onBack={mockOnBack} onSignupSuccess={mockOnSignupSuccess} />
      );
    });

    const testRenderer = instance as any;
    const textElements = testRenderer.root.findAllByType(require('react-native').Text);
    const stepNumbers = textElements.filter(
      (element: any) => element.props.children === '1' || 
                        element.props.children === '2' || 
                        element.props.children === '3'
    );
    
    expect(stepNumbers.length).toBeGreaterThanOrEqual(3);
    
    instance?.unmount();
  });

  it('displays step 1 content by default', () => {
    let instance;
    ReactTestRenderer.act(() => {
      instance = ReactTestRenderer.create(
        <SignupScreen onBack={mockOnBack} onSignupSuccess={mockOnSignupSuccess} />
      );
    });

    const testRenderer = instance as any;
    const textElements = testRenderer.root.findAllByType(require('react-native').Text);
    const stepTitle = textElements.find(
      (element: any) => element.props.children === 'التحقق من البيانات'
    );
    
    expect(stepTitle).toBeTruthy();
    
    instance?.unmount();
  });

  it('renders navigation buttons', () => {
    let instance;
    ReactTestRenderer.act(() => {
      instance = ReactTestRenderer.create(
        <SignupScreen onBack={mockOnBack} onSignupSuccess={mockOnSignupSuccess} />
      );
    });

    const testRenderer = instance as any;
    const buttons = testRenderer.root.findAllByType(require('react-native').TouchableOpacity);
    
    expect(buttons.length).toBeGreaterThan(0);
    
    instance?.unmount();
  });
});
