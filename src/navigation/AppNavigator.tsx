// SOLID Principles Applied:
// 1. Single Responsibility: This component only handles navigation logic
// 2. Open/Closed: Can be extended with new screens without modification
// 3. Dependency Inversion: Depends on abstractions (screens) not concretions

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import SignupScreen from '../screens/SignupScreen';
import { Colors } from '../styles/colors';

interface UserInfo {
  nameAr: string;
  nameEn: string;
  nationalId: string;
  accessToken: string;
}

type Screen = 'login' | 'home' | 'profile' | 'documents' | 'payments' | 'signup';

const AppNavigator: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');

  useEffect(() => {
    // Check if user is already logged in (from storage)
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // TODO: Check AsyncStorage for saved auth data
      // For now, we'll start with login screen
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (loginData: any) => {
    const userData: UserInfo = {
      nameAr: loginData.trainee.nameAr,
      nameEn: loginData.trainee.nameEn,
      nationalId: loginData.trainee.nationalId,
      accessToken: loginData.access_token,
    };
    
    setUserInfo(userData);
    setIsAuthenticated(true);
    setCurrentScreen('home');
    
    // TODO: Save to AsyncStorage
    console.log('User logged in successfully:', userData);
  };

  const handleLogout = () => {
    setUserInfo(null);
    setIsAuthenticated(false);
    setCurrentScreen('login');
    
    // TODO: Clear AsyncStorage
    console.log('User logged out');
  };

  const handleNavigateToProfile = () => {
    setCurrentScreen('profile');
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
  };

  const handleNavigateToDocuments = () => {
    setCurrentScreen('documents');
  };

  const handleBackToProfile = () => {
    setCurrentScreen('profile');
  };

  const handleNavigateToPayments = () => {
    setCurrentScreen('payments');
  };

  const handleBackToProfileFromPayments = () => {
    setCurrentScreen('profile');
  };

  const handleNavigateToSignup = () => {
    setCurrentScreen('signup');
  };

  const handleBackToLogin = () => {
    setCurrentScreen('login');
  };

  const handleSignupSuccess = () => {
    setCurrentScreen('login');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        {/* TODO: Add loading spinner */}
      </View>
    );
  }

  if (isAuthenticated && userInfo) {
    if (currentScreen === 'payments') {
      return (
        <PaymentsScreen
          accessToken={userInfo.accessToken}
          onBack={handleBackToProfileFromPayments}
        />
      );
    }
    
    if (currentScreen === 'documents') {
      return (
        <DocumentsScreen
          accessToken={userInfo.accessToken}
          onBack={handleBackToProfile}
        />
      );
    }
    
    if (currentScreen === 'profile') {
      return (
        <ProfileScreen
          accessToken={userInfo.accessToken}
          onBack={handleBackToHome}
          onNavigateToDocuments={handleNavigateToDocuments}
          onNavigateToPayments={handleNavigateToPayments}
        />
      );
    }
    
    return (
      <HomeScreen
        userInfo={userInfo}
        onLogout={handleLogout}
        onNavigateToProfile={handleNavigateToProfile}
      />
    );
  }

  if (currentScreen === 'signup') {
    return (
      <SignupScreen
        onBack={handleBackToLogin}
        onSignupSuccess={handleSignupSuccess}
      />
    );
  }

  return (
    <LoginScreen
      onLoginSuccess={handleLoginSuccess}
      onNavigateToSignup={handleNavigateToSignup}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigator;

