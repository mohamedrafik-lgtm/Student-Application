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
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/styles/colors';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={Colors.backgroundDark}
        translucent={false}
      />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
