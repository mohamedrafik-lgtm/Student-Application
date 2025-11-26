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
import GradesScreen from '../screens/GradesScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import BranchSelectionScreen from '../screens/BranchSelectionScreen';
import TrainingContentsScreen from '../screens/TrainingContentsScreen';
import StudentRequestsScreen from '../screens/StudentRequestsScreen';
import ExamPostponementScreen from '../screens/ExamPostponementScreen';
import SickLeaveScreen from '../screens/SickLeaveScreen';
import EnrollmentProofScreen from '../screens/EnrollmentProofScreen';
import CertificateScreen from '../screens/CertificateScreen';
import RequestsHubScreen from '../screens/RequestsHubScreen';
import PaymentDeferralRequestsScreen from '../screens/PaymentDeferralRequestsScreen';
import CreatePaymentDeferralScreen from '../screens/CreatePaymentDeferralScreen';
import RequestSettingsScreen from '../screens/RequestSettingsScreen';
import PaymentDueDatesScreen from '../screens/PaymentDueDatesScreen';
import { Colors } from '../styles/colors';
import { BranchService } from '../services/branchService';
import { BranchType } from '../types/auth';
import TopNavigationBar, { TopNavTab } from '../components/TopNavigationBar';

interface UserInfo {
  nameAr: string;
  nameEn: string;
  nationalId: string;
  accessToken: string;
  classroomId?: number;
  traineeId?: number;
}

type Screen = 'branch-selection' | 'login' | 'home' | 'profile' | 'documents' | 'payments' | 'signup' | 'schedule' | 'exams' | 'grades' | 'attendance' | 'training-contents' | 'requests-hub' | 'student-requests' | 'payment-deferral-requests' | 'create-payment-deferral' | 'exam-postponement' | 'sick-leave' | 'enrollment-proof' | 'certificate' | 'request-settings' | 'payment-due-dates';

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
      traineeId: loginData.trainee.id,
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

  const handleNavigateToPaymentDueDates = () => {
    setCurrentScreen('payment-due-dates');
  };

  const handleBackToPaymentsFromDueDates = () => {
    setCurrentScreen('payments');
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

  const handleNavigateToGrades = () => {
    console.log('🔍 handleNavigateToGrades called');
    console.log('🔍 Setting currentScreen to grades');
    setCurrentScreen('grades');
  };

  const handleBackToHomeFromGrades = () => {
    setCurrentScreen('home');
  };

  const handleNavigateToAttendance = () => {
    setCurrentScreen('attendance');
  };

  const handleBackToHomeFromAttendance = () => {
    setCurrentScreen('home');
  };

  const handleNavigateToTrainingContents = () => {
    setCurrentScreen('training-contents');
  };

  const handleBackToHomeFromTrainingContents = () => {
    setCurrentScreen('home');
  };

  const handleNavigateToRequestsHub = () => {
    setCurrentScreen('requests-hub');
  };

  const handleBackToHomeFromRequestsHub = () => {
    setCurrentScreen('home');
  };

  const handleNavigateToStudentRequests = () => {
    setCurrentScreen('student-requests');
  };

  const handleNavigateToPaymentDeferralRequests = () => {
    setCurrentScreen('payment-deferral-requests');
  };

  const handleBackToRequestsHub = () => {
    setCurrentScreen('requests-hub');
  };

  const handleNavigateToExamPostponement = () => {
    setCurrentScreen('exam-postponement');
  };

  const handleBackToStudentRequests = () => {
    setCurrentScreen('student-requests');
  };

  const handleNavigateToSickLeave = () => {
    setCurrentScreen('sick-leave');
  };

  const handleNavigateToEnrollmentProof = () => {
    setCurrentScreen('enrollment-proof');
  };

  const handleNavigateToCertificate = () => {
    setCurrentScreen('certificate');
  };

  const handleNavigateToCreatePaymentDeferral = () => {
    setCurrentScreen('create-payment-deferral');
  };

  const handleBackToPaymentDeferralRequests = () => {
    setCurrentScreen('payment-deferral-requests');
  };

  const handleNavigateToRequestSettings = () => {
    setCurrentScreen('request-settings');
  };

  const handleBackToRequestsHubFromSettings = () => {
    setCurrentScreen('requests-hub');
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
    // Render the requested screen into a container and show the bottom nav
    let screenElement: React.ReactElement | null = null;

    switch (currentScreen) {
      case 'attendance':
        screenElement = (
          <AttendanceScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackToHomeFromAttendance}
          />
        );
        break;
      case 'grades':
        screenElement = (
          <GradesScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackToHomeFromGrades}
          />
        );
        break;
      case 'training-contents':
        screenElement = (
          <TrainingContentsScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackToHomeFromTrainingContents}
          />
        );
        break;
      case 'requests-hub':
        screenElement = (
          <RequestsHubScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackToHomeFromRequestsHub}
            onNavigateToPaymentDeferral={handleNavigateToPaymentDeferralRequests}
            onNavigateToFreeRequests={handleNavigateToStudentRequests}
            onNavigateToSettings={handleNavigateToRequestSettings}
          />
        );
        break;
      case 'request-settings':
        screenElement = (
          <RequestSettingsScreen
            onBack={handleBackToRequestsHubFromSettings}
          />
        );
        break;
      case 'student-requests':
        screenElement = (
          <StudentRequestsScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackToRequestsHub}
            onNavigateToExamPostponement={handleNavigateToExamPostponement}
            onNavigateToSickLeave={handleNavigateToSickLeave}
            onNavigateToEnrollmentProof={handleNavigateToEnrollmentProof}
            onNavigateToCertificate={handleNavigateToCertificate}
          />
        );
        break;
      case 'payment-deferral-requests':
        screenElement = (
          <PaymentDeferralRequestsScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackToRequestsHub}
            onNavigateToCreateDeferral={handleNavigateToCreatePaymentDeferral}
          />
        );
        break;
      case 'create-payment-deferral':
        screenElement = (
          <CreatePaymentDeferralScreen
            accessToken={userInfo.accessToken}
            traineeId={userInfo.traineeId}
            onBack={handleBackToPaymentDeferralRequests}
          />
        );
        break;
      case 'certificate':
        screenElement = (
          <CertificateScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackToStudentRequests}
          />
        );
        break;
      case 'enrollment-proof':
        screenElement = (
          <EnrollmentProofScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackToStudentRequests}
          />
        );
        break;
      case 'sick-leave':
        screenElement = (
          <SickLeaveScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackToStudentRequests}
          />
        );
        break;
      case 'exam-postponement':
        screenElement = (
          <ExamPostponementScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackToStudentRequests}
          />
        );
        break;
      case 'exams':
        screenElement = (
          <ExamsScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackToHomeFromExams}
          />
        );
        break;
      case 'schedule':
        screenElement = (
          <ScheduleScreen
            accessToken={userInfo.accessToken}
            classroomId={userInfo.classroomId}
            onBack={handleBackToProfileFromSchedule}
          />
        );
        break;
      case 'payments':
        screenElement = (
          <PaymentsScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackToProfileFromPayments}
            onNavigateToPaymentDueDates={handleNavigateToPaymentDueDates}
          />
        );
        break;
      case 'payment-due-dates':
        screenElement = (
          <PaymentDueDatesScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackToPaymentsFromDueDates}
          />
        );
        break;
      case 'documents':
        screenElement = (
          <DocumentsScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackToProfile}
          />
        );
        break;
      case 'profile':
        screenElement = (
          <ProfileScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackToHome}
            onNavigateToDocuments={handleNavigateToDocuments}
            onNavigateToPayments={handleNavigateToPayments}
            onNavigateToSchedule={handleNavigateToSchedule}
          />
        );
        break;
      case 'home':
      default:
        screenElement = (
          <HomeScreen
            userInfo={userInfo}
            onNavigateToSchedule={handleNavigateToSchedule}
            onNavigateToExams={handleNavigateToExams}
            onNavigateToGrades={handleNavigateToGrades}
            onNavigateToAttendance={handleNavigateToAttendance}
            onNavigateToProfile={handleNavigateToProfile}
            onNavigateToTrainingContents={handleNavigateToTrainingContents}
            onNavigateToDocuments={handleNavigateToDocuments}
            onNavigateToPayments={handleNavigateToPayments}
            onNavigateToStudentRequests={handleNavigateToRequestsHub}
          />
        );
        break;
    }

    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <TopNavigationBar
          currentTab={currentScreen as TopNavTab}
          onSelect={(tab: TopNavTab) => setCurrentScreen(tab as Screen)}
          onLogout={handleLogout}
          onNavigateToProfile={handleNavigateToProfile}
        />
        {screenElement}
      </View>
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

