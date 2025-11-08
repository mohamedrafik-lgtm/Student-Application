// Refactored HomeScreen with modern layout, quick actions, upcoming classes,
// recent grades and notifications. Designed to be lightweight and use optional
// navigation callbacks passed from the navigator.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';
import { AuthService } from '../services/authService';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  userInfo?: {
    nameAr: string;
    nameEn: string;
    nationalId: string;
    photoUrl?: string;
    accessToken?: string;
  };
  onLogout?: () => void;
  onNavigateToSchedule?: () => void;
  onNavigateToExams?: () => void;
  onNavigateToGrades?: () => void;
  onNavigateToAttendance?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToDocuments?: () => void;
  onNavigateToPayments?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  userInfo,
  onLogout,
  onNavigateToSchedule,
  onNavigateToExams,
  onNavigateToGrades,
  onNavigateToAttendance,
  onNavigateToProfile,
  onNavigateToDocuments,
  onNavigateToPayments,
}) => {
  const [studentPhotoUrl, setStudentPhotoUrl] = useState<string | undefined>(userInfo?.photoUrl);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  const loadStudentPhoto = useCallback(async () => {
    try {
      if (!userInfo?.accessToken) return;
      const profile = await AuthService.getProfile(userInfo.accessToken);
      if (profile?.trainee?.photoUrl) setStudentPhotoUrl(profile.trainee.photoUrl);
    } catch (err) {
      // ignore failures (optional)
      console.log('Could not load profile photo', err);
    }
  }, [userInfo?.accessToken]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();

    if (!userInfo?.photoUrl) loadStudentPhoto();
  }, [fadeAnim, slideAnim, loadStudentPhoto, userInfo?.photoUrl]);

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تسجيل الخروج', style: 'destructive', onPress: onLogout },
    ]);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مساء الخير';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.headerCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}> 
          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              <Text style={styles.greetingText}>{getGreeting()}, {userInfo?.nameAr || 'متدرب'}</Text>
              <Text style={styles.headerSub}>مرحباً بك في لوحة المتدرب</Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.smallBtn} onPress={handleLogout}>
                <Text style={styles.smallBtnText}>تسجيل الخروج</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileBtn} onPress={() => onNavigateToProfile && onNavigateToProfile()}>
                {studentPhotoUrl ? (
                  <Image source={{ uri: studentPhotoUrl }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileDefault}><Text style={styles.profileDefaultText}>{userInfo?.nameAr?.charAt(0) || 'ط'}</Text></View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => onNavigateToSchedule && onNavigateToSchedule()}>
            <Text style={styles.quickActionIcon}>📅</Text>
            <Text style={styles.quickActionLabel} numberOfLines={2} ellipsizeMode="tail" allowFontScaling={false}>الجدول</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => onNavigateToExams && onNavigateToExams()}>
            <Text style={styles.quickActionIcon}>📝</Text>
            <Text style={styles.quickActionLabel} numberOfLines={2} ellipsizeMode="tail" allowFontScaling={false}>الاختبارات</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => onNavigateToGrades && onNavigateToGrades()}>
            <Text style={styles.quickActionIcon}>📊</Text>
            <Text style={styles.quickActionLabel} numberOfLines={2} ellipsizeMode="tail" allowFontScaling={false}>الدرجات</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={() => onNavigateToAttendance && onNavigateToAttendance()}>
            <Text style={styles.quickActionIcon}>✅</Text>
            <Text style={styles.quickActionLabel} numberOfLines={2} ellipsizeMode="tail" allowFontScaling={false}>الحضور</Text>
          </TouchableOpacity>
        </View>

        {/* Compact info cards removed per UX request */}

        {/* Upcoming classes */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}><Text style={styles.sectionHeaderIcon}>🕒</Text><Text style={styles.sectionTitle}>الحصص القادمة</Text></View>
          <View style={styles.sessionItem}><View style={styles.sessionLeft}><Text style={styles.sessionTime}>09:00</Text><Text style={styles.sessionSubject}>رياضيات</Text></View><View style={styles.sessionRight}><Text style={styles.sessionRoom}>قاعه 3</Text><Text style={styles.sessionTeacher}>أ. كريم</Text></View></View>
          <View style={styles.sessionItem}><View style={styles.sessionLeft}><Text style={styles.sessionTime}>11:00</Text><Text style={styles.sessionSubject}>إنجليزي</Text></View><View style={styles.sessionRight}><Text style={styles.sessionRoom}>قاعه 1</Text><Text style={styles.sessionTeacher}>أ. سارة</Text></View></View>
        </View>

        {/* Recent Grades */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}><Text style={styles.sectionHeaderIcon}>🏆</Text><Text style={styles.sectionTitle}>أحدث الدرجات</Text></View>
          <View style={styles.gradeCard}><View style={styles.gradeItem}><Text style={styles.gradeSubject}>رياضيات</Text><Text style={styles.gradeValue}>85%</Text></View><View style={styles.gradeItem}><Text style={styles.gradeSubject}>إنجليزي</Text><Text style={styles.gradeValue}>92%</Text></View></View>
        </View>

        {/* Notifications */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}><Text style={styles.sectionHeaderIcon}>🔔</Text><Text style={styles.sectionTitle}>الإشعارات</Text></View>
          <View style={styles.activityItem}><View style={styles.activityDot} /><Text style={styles.activityText}>لديك اختبار قريب في مادة التاريخ يوم 2025/11/12</Text></View>
          <View style={styles.activityItem}><View style={[styles.activityDot, { backgroundColor: Colors.warning }]} /><Text style={styles.activityText}>لم تقم برفع الوثائق المطلوبة، يرجى إكمالها.</Text></View>
        </View>

        <View style={{ height: 36 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 32 },
  headerCard: { backgroundColor: Colors.primary, padding: 16, margin: 16, borderRadius: 14, shadowColor: Colors.shadowDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerInfo: { flex: 1, paddingRight: 12 },
  greetingText: { color: Colors.white, fontSize: 20, fontWeight: '800', writingDirection: 'rtl', textAlign: 'right' },
  headerSub: { color: 'rgba(255,255,255,0.9)', marginTop: 4, writingDirection: 'rtl', textAlign: 'right' },
  headerActions: { alignItems: 'flex-end' },
  smallBtn: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 8 },
  smallBtnText: { color: Colors.white, fontSize: 12, writingDirection: 'rtl', textAlign: 'right' },
  profileBtn: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden', borderWidth: 2, borderColor: Colors.white },
  profileImage: { width: 52, height: 52 },
  profileDefault: { width: 52, height: 52, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  profileDefaultText: { color: Colors.primary, fontWeight: '800', fontSize: 20 },

  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 12 },
  quickActionButton: { flex: 1, minWidth: 72, backgroundColor: Colors.white, marginHorizontal: 6, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', shadowColor: Colors.shadowDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  quickActionIcon: { fontSize: 20, marginBottom: 6 },
  quickActionLabel: { fontSize: 12, color: Colors.textPrimary, fontWeight: '700', writingDirection: 'rtl', textAlign: 'center', flexWrap: 'wrap', lineHeight: 16, flexShrink: 1, minWidth: 0, includeFontPadding: false },

  cardsGridCompact: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 14 },
  infoCardCompact: { flex: 1, backgroundColor: Colors.white, marginHorizontal: 6, borderRadius: 12, padding: 12, alignItems: 'center', flexDirection: 'row', minWidth: 72 },
  cardIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cardIconEmoji: { fontSize: 20 },
  cardTextWrap: { flex: 1, alignItems: 'flex-end', minWidth: 0 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', writingDirection: 'rtl', flexWrap: 'wrap', lineHeight: 18, flexShrink: 1, includeFontPadding: false },
  cardStatus: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  cardDescription: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', writingDirection: 'rtl', flexWrap: 'wrap', lineHeight: 16, flexShrink: 1, includeFontPadding: false },
  cardError: { color: Colors.error },

  sectionBlock: { marginTop: 18, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionHeaderIcon: { fontSize: 18, marginRight: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, writingDirection: 'rtl', textAlign: 'right' },

  sessionItem: { backgroundColor: Colors.white, borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: Colors.shadowDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  sessionLeft: { alignItems: 'flex-end' },
  sessionRight: { alignItems: 'flex-start' },
  sessionTime: { fontSize: 16, fontWeight: '800', color: Colors.primary, writingDirection: 'rtl', textAlign: 'right' },
  sessionSubject: { fontSize: 14, color: Colors.textPrimary, writingDirection: 'rtl', textAlign: 'right', minWidth: 0, flexShrink: 1, includeFontPadding: false },
  sessionRoom: { fontSize: 13, color: Colors.textSecondary, writingDirection: 'rtl', textAlign: 'right' },
  sessionTeacher: { fontSize: 13, color: Colors.textSecondary, writingDirection: 'rtl', textAlign: 'right' },

  gradeCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 12, shadowColor: Colors.shadowDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  gradeItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  gradeSubject: { fontSize: 14, color: Colors.textPrimary, writingDirection: 'rtl', textAlign: 'right', minWidth: 0, flexShrink: 1, includeFontPadding: false },
  gradeValue: { fontSize: 14, fontWeight: '800', color: Colors.primary },

  activityItem: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.white, borderRadius: 12, padding: 12, marginBottom: 10, shadowColor: Colors.shadowDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success, marginRight: 12, marginTop: 6 },
  activityText: { flex: 1, fontSize: 13, color: Colors.textPrimary, writingDirection: 'rtl', textAlign: 'right', minWidth: 0, flexShrink: 1, includeFontPadding: false },
});

export default HomeScreen;

