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
  onNavigateToAttendance?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToDocuments?: () => void;
  onNavigateToPayments?: () => void;
  onNavigateToTrainingContents?: () => void;
  onNavigateToStudentRequests?: () => void;
  onNavigateToRegisterAttendance?: () => void;
  onNavigateToAcademicResults?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  userInfo, onNavigateToSchedule, onNavigateToExams,
  onNavigateToAttendance, onNavigateToProfile, onNavigateToDocuments,
  onNavigateToPayments, onNavigateToTrainingContents, onNavigateToStudentRequests,
  onNavigateToRegisterAttendance, onNavigateToAcademicResults,
}) => {
  const [studentPhotoUrl, setStudentPhotoUrl] = useState<string | undefined>(userInfo?.photoUrl);
  const [gradeAppeals, setGradeAppeals] = useState<GradeAppeal[]>([]);
  const [accessCheck, setAccessCheck] = useState<AccessCheckResponse | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [loadingAppeals, setLoadingAppeals] = useState(true);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [documents, setDocuments] = useState<TraineeDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const loadStudentPhoto = useCallback(async () => {
    try {
      if (!userInfo?.accessToken) return;
      const profile = await AuthService.getProfile(userInfo.accessToken);
      if (profile?.trainee?.photoUrl) setStudentPhotoUrl(profile.trainee.photoUrl);
      const trainee = profile?.trainee;
      if (trainee && Array.isArray(trainee.documents)) setDocuments(trainee.documents);
    } catch (err) { console.log('Could not load profile photo', err); }
    finally { setLoadingDocs(false); }
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
    if (!userInfo?.photoUrl) loadStudentPhoto();
    loadGradeAppeals();
    loadAccessCheck();
    loadAttendance();
  }, [fadeAnim, slideAnim, loadStudentPhoto, loadGradeAppeals, loadAccessCheck, loadAttendance, userInfo?.photoUrl]);

  const hasGradeResults = gradeAppeals.length > 0;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <HomeHeader
            nameAr={userInfo?.nameAr}
            photoUrl={studentPhotoUrl}
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
            documents={documents}
            loadingDocs={loadingDocs}
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
          <AppealsSection appeals={gradeAppeals} />
        )}

        <QuickActions
          onSchedule={onNavigateToSchedule}
          onExams={onNavigateToExams}
          onRequests={onNavigateToStudentRequests}
          onContents={onNavigateToTrainingContents}
          onProfile={onNavigateToProfile}
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
