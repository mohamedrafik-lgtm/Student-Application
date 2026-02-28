// HomeScreen - main dashboard with quick actions & greeting
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { AuthService } from '../services/authService';

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
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  userInfo, onNavigateToSchedule, onNavigateToExams, onNavigateToGrades,
  onNavigateToAttendance, onNavigateToProfile, onNavigateToDocuments,
  onNavigateToPayments, onNavigateToTrainingContents, onNavigateToStudentRequests,
}) => {
  const [studentPhotoUrl, setStudentPhotoUrl] = useState<string | undefined>(userInfo?.photoUrl);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  const loadStudentPhoto = useCallback(async () => {
    try {
      if (!userInfo?.accessToken) return;
      const profile = await AuthService.getProfile(userInfo.accessToken);
      if (profile?.trainee?.photoUrl) setStudentPhotoUrl(profile.trainee.photoUrl);
    } catch (err) { console.log('Could not load profile photo', err); }
  }, [userInfo?.accessToken]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
    if (!userInfo?.photoUrl) loadStudentPhoto();
  }, [fadeAnim, slideAnim, loadStudentPhoto, userInfo?.photoUrl]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? 'صباح الخير' : 'مساء الخير';
  };

  const quickActions = [
    { icon: '📅', label: 'الجدول', onPress: onNavigateToSchedule },
    { icon: '📝', label: 'الاختبارات', onPress: onNavigateToExams },
    { icon: '📊', label: 'الدرجات', onPress: onNavigateToGrades },
    { icon: '✅', label: 'الحضور', onPress: onNavigateToAttendance },
    { icon: '📋', label: 'الطلبات', onPress: onNavigateToStudentRequests },
  ];

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Greeting Card */}
        <Animated.View style={[s.greetingCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={s.greetingRow}>
            <View style={s.greetingInfo}>
              <Text style={s.greetingText}>{getGreeting()}, {userInfo?.nameAr || 'متدرب'}</Text>
              <Text style={s.greetingSub}>مرحباً بك في لوحة المتدرب</Text>
              <Text style={s.greetingDesc}>يمكنك الوصول إلى جميع خدماتك التعليمية من هنا</Text>
            </View>
            <TouchableOpacity style={s.profileBtn} onPress={() => onNavigateToProfile?.()}>
              {studentPhotoUrl ? (
                <Image source={{ uri: studentPhotoUrl }} style={s.profileImage} />
              ) : (
                <View style={s.profileDefault}><Text style={s.profileDefaultText}>{userInfo?.nameAr?.charAt(0) || 'ط'}</Text></View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <View style={s.quickActionsRow}>
          {quickActions.map((action, i) => (
            <TouchableOpacity key={i} style={s.quickActionBtn} onPress={() => action.onPress?.()}>
              <View style={s.quickActionIconCircle}><Text style={s.quickActionIcon}>{action.icon}</Text></View>
              <Text style={s.quickActionLabel} numberOfLines={1}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Training Contents */}
        {onNavigateToTrainingContents && (
          <TouchableOpacity style={s.trainingCard} onPress={() => onNavigateToTrainingContents()} activeOpacity={0.7}>
            <View style={s.trainingCardInner}>
              <Text style={s.trainingArrow}>←</Text>
              <View style={s.trainingTextArea}>
                <Text style={s.trainingTitle}>المحتوى التدريبي</Text>
                <Text style={s.trainingSub}>عرض المواد الدراسية</Text>
              </View>
              <View style={s.trainingIconCircle}><Text style={s.trainingIconText}>📚</Text></View>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ height: 36 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  scrollContent: { paddingBottom: 32 },
  greetingCard: { backgroundColor: '#2563EB', padding: 22, margin: 16, marginTop: 8, marginBottom: 20, borderRadius: 16, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 8 },
  greetingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  greetingInfo: { flex: 1, paddingRight: 14 },
  greetingText: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'right', marginBottom: 6 },
  greetingSub: { color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: '600', textAlign: 'right', marginBottom: 6 },
  greetingDesc: { color: 'rgba(255,255,255,0.78)', fontSize: 13, textAlign: 'right', lineHeight: 19 },
  profileBtn: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', borderWidth: 3, borderColor: '#FFF' },
  profileImage: { width: 56, height: 56 },
  profileDefault: { width: 56, height: 56, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  profileDefaultText: { color: '#2563EB', fontWeight: '800', fontSize: 22 },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 14 },
  quickActionBtn: { flex: 1, marginHorizontal: 4, backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  quickActionIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  quickActionIcon: { fontSize: 18 },
  quickActionLabel: { fontSize: 11, color: '#1A1D26', fontWeight: '700', textAlign: 'center' },
  trainingCard: { marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  trainingCardInner: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  trainingIconCircle: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  trainingIconText: { fontSize: 22 },
  trainingTextArea: { flex: 1, alignItems: 'flex-end', marginRight: 12 },
  trainingTitle: { fontSize: 15, fontWeight: '800', color: '#1A1D26', textAlign: 'right', marginBottom: 2 },
  trainingSub: { fontSize: 12, color: '#8E95A2', textAlign: 'right' },
  trainingArrow: { fontSize: 18, color: '#2563EB', fontWeight: '700', marginLeft: 4 },
});

export default HomeScreen;
