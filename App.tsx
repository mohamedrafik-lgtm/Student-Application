/**
 * Student App - Taiba Center
 * Login and Student Management System
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: App.tsx only handles app initialization
 * - Dependency Inversion: Uses abstractions (components) not concretions
 *
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import { Colors } from './src/styles/colors';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={Colors.background}
        translucent={false}
      />
      <LoginScreen />
    </SafeAreaProvider>
  );
}

export default App;
