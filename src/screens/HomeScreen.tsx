// HomeScreen  Refactored (components split into components/home/)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Animated, StatusBar } from 'react-native';
import { AuthService } from '../services/authService';
import { HomeService, GradeAppeal, AccessCheckResponse, AttendanceSummary } from '../services/homeService';
import { TraineeDocument } from '../types/auth';
import { Colors } from '../styles/colors';
import {
  HomeHeader, NotificationBanner, DashboardCards,
  QuickActions, VideoSection, AIAssistantSection, AppealsSection,
} from '../components/home';

interface HomeScreenProps {
  userInfo?: {
    nameAr: string;
    nameEn: string;
    nationalId: string;
    photoUrl?: string;
    accessToken?: string;
  };
  onNavigateToSchedule?: () => void;
  onNavigateToExams?: () => void;
  onNavigateToGrades?: () => void;
  onNavigateToAttendance?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToDocuments?: () => void;
  onNavigateToPayments?: () => void;
  onNavigateToTrainingContents?: () => void;
  onNavigateToStudentRequests?: () => void;
  onNavigateToRegisterAttendance?: () => void;
  onNavigateToAcademicResults?: () => void;
  onNavigateToDistributions?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  userInfo, onNavigateToSchedule, onNavigateToExams, onNavigateToGrades,
  onNavigateToAttendance, onNavigateToProfile, onNavigateToDocuments,
  onNavigateToPayments, onNavigateToTrainingContents, onNavigateToStudentRequests,
  onNavigateToRegisterAttendance, onNavigateToAcademicResults, onNavigateToDistributions,
}) => {
  const [studentPhotoUrl, setStudentPhotoUrl] = useState<string | undefined>(userInfo?.photoUrl);
  const [programName, setProgramName] = useState<string>('');
  const [financialSummary, setFinancialSummary] = useState({ totalAmount: 0, paidAmount: 0, remainingAmount: 0 });
  const [gradeAppeals, setGradeAppeals] = useState<GradeAppeal[]>([]);
  const [accessCheck, setAccessCheck] = useState<AccessCheckResponse | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [loadingAppeals, setLoadingAppeals] = useState(true);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [documents, setDocuments] = useState<TraineeDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingFinancials, setLoadingFinancials] = useState(true);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // جلب بيانات البروفايل كاملة: الصورة + اسم البرنامج + الوثائق + الأرقام المالية.
  // ملاحظة: لا يجوز ربط هذا الاستدعاء بوجود الصورة، لأن الحسابات المالية
  // تعتمد عليه أيضاً وكانت تُترك أصفاراً عند وجود صورة للمتدرب.
  const loadProfileData = useCallback(async () => {
    try {
      if (!userInfo?.accessToken) return;
      const profile = await AuthService.getProfile(userInfo.accessToken);
      const trainee = profile?.trainee;
      if (!trainee) return;

      if (trainee.photoUrl) setStudentPhotoUrl(trainee.photoUrl);

      if (Array.isArray(trainee.documents)) {
        setDocuments(trainee.documents);
      }

      if (trainee.program?.nameAr) {
        setProgramName(trainee.program.nameAr);
      }

      if (Array.isArray(trainee.traineePayments)) {
        // نفس منطق صفحة المدفوعات ونسخة الويب:
        // الإجمالي = مجموع amounts، المدفوع = مجموع paidAmount، المتبقي = الفرق.
        const totalAmount = trainee.traineePayments.reduce(
          (sum, payment) => sum + (Number(payment.amount) || 0), 0);

        const paidAmount = trainee.traineePayments.reduce((sum, payment) => {
          const explicitPaid = Number(payment.paidAmount) || 0;
          if (explicitPaid > 0) return sum + explicitPaid;

          // احتياط: الدفعات القديمة التي لا تحمل paidAmount — نعتبرها مسددة بالكامل
          const normalizedStatus = String(payment.status || '').toUpperCase();
          if (
            normalizedStatus === 'PAID' ||
            normalizedStatus === 'COMPLETED' ||
            normalizedStatus === 'PARTIALLY_PAID'
          ) {
            return sum + (Number(payment.amount) || 0);
          }
          return sum;
        }, 0);

        const remainingAmount = Math.max(totalAmount - paidAmount, 0);
        setFinancialSummary({ totalAmount, paidAmount, remainingAmount });
      }
    } catch (err) { console.log('Could not load profile data', err); }
    finally { setLoadingDocs(false); setLoadingFinancials(false); }
  }, [userInfo?.accessToken]);

  const loadGradeAppeals = useCallback(async () => {
    try {
      if (!userInfo?.accessToken) return;
      const appeals = await HomeService.getGradeAppeals(userInfo.accessToken);
      setGradeAppeals(appeals);
    } catch (err) { console.log('Could not load grade appeals', err); }
    finally { setLoadingAppeals(false); }
  }, [userInfo?.accessToken]);

  const loadAccessCheck = useCallback(async () => {
    try {
      if (!userInfo?.accessToken) return;
      const check = await HomeService.checkAccess(userInfo.accessToken);
      setAccessCheck(check);
    } catch (err) { console.log('Could not check access', err); }
    finally { setLoadingAccess(false); }
  }, [userInfo?.accessToken]);

  const loadAttendance = useCallback(async () => {
    try {
      if (!userInfo?.accessToken) return;
      const data = await HomeService.getAttendanceRecords(userInfo.accessToken);
      setAttendanceSummary(data.summary);
    } catch (err) { console.log('Could not load attendance', err); }
    finally { setLoadingAttendance(false); }
  }, [userInfo?.accessToken]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    loadProfileData();
    loadGradeAppeals();
    loadAccessCheck();
    loadAttendance();
  }, [fadeAnim, slideAnim, loadProfileData, loadGradeAppeals, loadAccessCheck, loadAttendance]);

  const hasGradeResults = gradeAppeals.length > 0;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <HomeHeader
            nameAr={userInfo?.nameAr}
            photoUrl={studentPhotoUrl}
            programName={programName}
            onProfilePress={onNavigateToProfile}
          />
        </Animated.View>

        {hasGradeResults && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <NotificationBanner onViewResults={onNavigateToAcademicResults} />
          </Animated.View>
        )}

        <Animated.View style={{ opacity: fadeAnim }}>
          <DashboardCards
            attendanceSummary={attendanceSummary}
            loadingAttendance={loadingAttendance}
            loadingAccess={loadingAccess}
            loadingFinancials={loadingFinancials}
            documents={documents}
            loadingDocs={loadingDocs}
            financialSummary={financialSummary}
            onAttendance={onNavigateToAttendance}
            onPayments={onNavigateToPayments}
            onDocuments={onNavigateToDocuments}
            onRegisterAttendance={onNavigateToRegisterAttendance}
          />
        </Animated.View>

        {onNavigateToTrainingContents && (
          <VideoSection onPress={onNavigateToTrainingContents} />
        )}

        <AIAssistantSection />

        {gradeAppeals.length > 0 && (
          <AppealsSection appeals={gradeAppeals} onViewAll={onNavigateToGrades} />
        )}

        <QuickActions
          onSchedule={onNavigateToSchedule}
          onRequests={onNavigateToStudentRequests}
          onContents={onNavigateToTrainingContents}
          onProfile={onNavigateToProfile}
          onPayments={onNavigateToPayments}
          onDocuments={onNavigateToDocuments}
          onDistributions={onNavigateToDistributions}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 32 },
});

export default HomeScreen;
