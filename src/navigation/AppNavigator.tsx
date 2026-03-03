// SOLID Principles Applied:
// 1. Single Responsibility: This component only handles navigation logic
// 2. Open/Closed: Can be extended with new screens without modification
// 3. Dependency Inversion: Depends on abstractions (screens) not concretions

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import PaymentReminderModal from '../components/PaymentReminderModal';
import { AuthService } from '../services/authService';
import { TraineePayment } from '../types/auth';
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
import RegisterAttendanceScreen from '../screens/RegisterAttendanceScreen';
import AcademicResultsScreen from '../screens/AcademicResultsScreen';
import GradeAppealsScreen from '../screens/GradeAppealsScreen';
import SurveyScreen from '../screens/SurveyScreen';
import AssignmentsScreen from '../screens/AssignmentsScreen';
import { Colors } from '../styles/colors';
import { BranchService } from '../services/branchService';
import { BranchType } from '../types/auth';
import { Storage } from '../utils/storage';
import TopNavigationBar, { TopNavTab } from '../components/TopNavigationBar';

interface UserInfo {
  nameAr: string;
  nameEn: string;
  nationalId: string;
  accessToken: string;
  classroomId?: number;
  traineeId?: number;
}

type Screen = 'branch-selection' | 'login' | 'home' | 'profile' | 'documents' | 'payments' | 'signup' | 'schedule' | 'exams' | 'grades' | 'attendance' | 'training-contents' | 'requests-hub' | 'student-requests' | 'payment-deferral-requests' | 'create-payment-deferral' | 'exam-postponement' | 'sick-leave' | 'enrollment-proof' | 'certificate' | 'request-settings' | 'payment-due-dates' | 'register-attendance' | 'academic-results' | 'grade-appeals' | 'survey' | 'assignments';

const AppNavigator: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>('branch-selection');
  const [selectedBranch, setSelectedBranch] = useState<BranchType | null>(null);

  // Payment reminder modal state
  const [showPaymentReminder, setShowPaymentReminder] = useState(false);
  const [upcomingPayment, setUpcomingPayment] = useState<TraineePayment | null>(null);
  const [paymentDaysRemaining, setPaymentDaysRemaining] = useState(0);
  const [paymentReminderChecked, setPaymentReminderChecked] = useState(false);

  useEffect(() => {
    // Check if user is already logged in and has a saved branch
    initializeApp();
  }, []);

  // Check for upcoming payment due dates when user is authenticated
  const checkUpcomingPayments = useCallback(async (accessToken: string) => {
    if (paymentReminderChecked) { return; }
    try {
      const profileData = await AuthService.getProfile(accessToken);
      const payments = profileData?.trainee?.traineePayments || [];
      const now = new Date();
      const REMINDER_DAYS = 5;

      // Find pending payments with due dates within REMINDER_DAYS
      let closestPayment: TraineePayment | null = null;
      let closestDays = Infinity;

      for (const p of payments) {
        if (p.status !== 'PENDING' || !p.dueDate) { continue; }
        const remaining = p.amount - p.paidAmount;
        if (remaining <= 0) { continue; }
        const due = new Date(p.dueDate);
        const diffMs = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= REMINDER_DAYS && diffDays < closestDays) {
          closestDays = diffDays;
          closestPayment = p;
        }
      }

      if (closestPayment) {
        setUpcomingPayment(closestPayment);
        setPaymentDaysRemaining(closestDays);
        setShowPaymentReminder(true);
      }
    } catch (err) {
      console.log('Payment reminder check failed:', err);
    } finally {
      setPaymentReminderChecked(true);
    }
  }, [paymentReminderChecked]);

  useEffect(() => {
    if (isAuthenticated && userInfo?.accessToken && !paymentReminderChecked) {
      checkUpcomingPayments(userInfo.accessToken);
    }
  }, [isAuthenticated, userInfo, paymentReminderChecked, checkUpcomingPayments]);

  const initializeApp = async () => {
    try {
      setIsLoading(true);

      // 1. Restore branch
      const savedBranch = await BranchService.getSavedBranch();
      if (savedBranch) {
        setSelectedBranch(savedBranch);
      }

      // 2. Restore session
      const session = await Storage.getSession();
      if (session && session.accessToken && savedBranch) {
        setUserInfo({
          nameAr: session.nameAr,
          nameEn: session.nameEn,
          nationalId: session.nationalId,
          accessToken: session.accessToken,
          classroomId: session.classroomId,
          traineeId: session.traineeId,
        });
        setIsAuthenticated(true);
        setCurrentScreen('home');
      } else if (savedBranch) {
        setCurrentScreen('login');
      } else {
        setCurrentScreen('branch-selection');
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setCurrentScreen('branch-selection');
    } finally {
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

    // Persist session
    Storage.saveSession({
      accessToken: userData.accessToken,
      nameAr: userData.nameAr,
      nameEn: userData.nameEn,
      nationalId: userData.nationalId,
      classroomId: userData.classroomId,
      traineeId: userData.traineeId,
    }).catch(err => console.log('Failed to save session', err));
  };

  const handleLogout = async () => {
    setUserInfo(null);
    setIsAuthenticated(false);
    setCurrentScreen('login');
    await Storage.clearSession().catch(() => {});
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
    console.log('🔌 handleNavigateToGrades called');
    console.log('🔌 Setting currentScreen to grades');
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

  const handleNavigateToRegisterAttendance = () => {
    setCurrentScreen('register-attendance');
  };

  const handleBackToHomeFromRegisterAttendance = () => {
    setCurrentScreen('home');
  };

  const handleNavigateToAcademicResults = () => {
    setCurrentScreen('academic-results');
  };

  const handleBackToHomeFromAcademicResults = () => {
    setCurrentScreen('home');
  };

  const handleNavigateToGradeAppeals = () => {
    setCurrentScreen('grade-appeals');
  };

  const handleBackFromGradeAppeals = () => {
    setCurrentScreen('home');
  };

  const handleNavigateToSurvey = () => {
    setCurrentScreen('survey');
  };

  const handleBackFromSurvey = () => {
    setCurrentScreen('home');
  };

  const handleNavigateToAssignments = () => {
    setCurrentScreen('assignments');
  };

  const handleBackFromAssignments = () => {
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
      case 'grade-appeals':
        screenElement = (
          <GradeAppealsScreen
            accessToken={userInfo.accessToken}
            traineeId={userInfo.traineeId}
            onBack={handleBackFromGradeAppeals}
          />
        );
        break;
      case 'survey':
        screenElement = (
          <SurveyScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackFromSurvey}
          />
        );
        break;
      case 'assignments':
        screenElement = (
          <AssignmentsScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackFromAssignments}
          />
        );
        break;
      case 'register-attendance':
        screenElement = (
          <RegisterAttendanceScreen
            accessToken={userInfo.accessToken}
            onBack={handleBackToHomeFromRegisterAttendance}
          />
        );
        break;
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
      case 'academic-results':
        screenElement = (
          <AcademicResultsScreen
            accessToken={userInfo.accessToken}
            traineeId={userInfo.traineeId}
            onBack={handleBackToHomeFromAcademicResults}
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
            onNavigateToRegisterAttendance={handleNavigateToRegisterAttendance}
            onNavigateToAcademicResults={handleNavigateToAcademicResults}
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

        {/* Payment Reminder Modal */}
        <PaymentReminderModal
          visible={showPaymentReminder}
          payment={upcomingPayment}
          daysRemaining={paymentDaysRemaining}
          onClose={() => setShowPaymentReminder(false)}
          onViewDetails={() => {
            setShowPaymentReminder(false);
            setCurrentScreen('payments');
          }}
        />
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

