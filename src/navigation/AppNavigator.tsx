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
import ScheduleScreen from '../screens/ScheduleScreen';
import ExamsScreen from '../screens/ExamsScreen';
import BranchSelectionScreen from '../screens/BranchSelectionScreen';
import { Colors } from '../styles/colors';
import { BranchService } from '../services/branchService';
import { BranchType } from '../types/auth';

interface UserInfo {
  nameAr: string;
  nameEn: string;
  nationalId: string;
  accessToken: string;
  classroomId?: number;
}

type Screen = 'branch-selection' | 'login' | 'home' | 'profile' | 'documents' | 'payments' | 'signup' | 'schedule' | 'exams';

const AppNavigator: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>('branch-selection');
  const [selectedBranch, setSelectedBranch] = useState<BranchType | null>(null);

  useEffect(() => {
    // Check if user is already logged in and has a saved branch
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      
      // التحقق من وجود فرع محفوظ
      const savedBranch = await BranchService.getSavedBranch();
      if (savedBranch) {
        setSelectedBranch(savedBranch);
        
        // الانتقال مباشرة لشاشة تسجيل الدخول بدون التحقق من الخادم
        // سيتم التحقق من الخادم عند محاولة تسجيل الدخول فعلياً
        setCurrentScreen('login');
      } else {
        // لا يوجد فرع محفوظ، عرض شاشة اختيار الفرع
        setCurrentScreen('branch-selection');
      }
      
      // التحقق من حالة تسجيل الدخول
      await checkAuthStatus();
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      setCurrentScreen('branch-selection');
    } finally {
      setIsLoading(false);
    }
  };

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
      classroomId: loginData.trainee.classroomId || loginData.trainee.classLevel || 1,
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

  const handleNavigateToSchedule = () => {
    setCurrentScreen('schedule');
  };

  const handleBackToProfileFromSchedule = () => {
    setCurrentScreen('profile');
  };

  const handleNavigateToExams = () => {
    setCurrentScreen('exams');
  };

  const handleBackToHomeFromExams = () => {
    setCurrentScreen('home');
  };

  const handleBranchSelected = (branch: BranchType) => {
    setSelectedBranch(branch);
    setCurrentScreen('login');
  };

  const handleSkipBranchSelection = () => {
    if (selectedBranch) {
      setCurrentScreen('login');
    }
  };

  const handleChangeBranch = async () => {
    try {
      await BranchService.resetBranch();
      setSelectedBranch(null);
      setCurrentScreen('branch-selection');
    } catch (error) {
      console.error('❌ Failed to change branch:', error);
    }
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

  // شاشة اختيار الفرع
  if (currentScreen === 'branch-selection') {
    return (
      <BranchSelectionScreen
        onBranchSelected={handleBranchSelected}
        onSkip={handleSkipBranchSelection}
      />
    );
  }

  if (isAuthenticated && userInfo) {
    if (currentScreen === 'exams') {
      return (
        <ExamsScreen
          accessToken={userInfo.accessToken}
          onBack={handleBackToHomeFromExams}
        />
      );
    }
    
    if (currentScreen === 'schedule') {
      return (
        <ScheduleScreen
          accessToken={userInfo.accessToken}
          classroomId={userInfo.classroomId}
          onBack={handleBackToProfileFromSchedule}
        />
      );
    }
    
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
          onNavigateToSchedule={handleNavigateToSchedule}
        />
      );
    }
    
    return (
      <HomeScreen
        userInfo={userInfo}
        onLogout={handleLogout}
        onNavigateToProfile={handleNavigateToProfile}
        onNavigateToSchedule={handleNavigateToSchedule}
        onNavigateToExams={handleNavigateToExams}
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
      onChangeBranch={handleChangeBranch}
      selectedBranch={selectedBranch}
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

