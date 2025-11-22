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
  Image,
} from 'react-native';
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
  userInfo,
  onNavigateToSchedule,
  onNavigateToExams,
  onNavigateToGrades,
  onNavigateToAttendance,
  onNavigateToProfile,
  onNavigateToDocuments,
  onNavigateToPayments,
  onNavigateToTrainingContents,
  onNavigateToStudentRequests,
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


  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مساء الخير';
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <Animated.View style={[styles.headerCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}> 
          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              <Text style={styles.greetingText}>{getGreeting()}, {userInfo?.nameAr || 'متدرب'}</Text>
              <Text style={styles.headerSub}>مرحباً بك في لوحة المتدرب</Text>
              <Text style={styles.headerDescription}>
                يمكنك الوصول إلى جميع خدماتك التعليمية من خلال القائمة أعلاه
              </Text>
            </View>

            <View style={styles.headerActions}>
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
          <TouchableOpacity style={styles.quickActionButton} onPress={() => onNavigateToStudentRequests && onNavigateToStudentRequests()}>
            <Text style={styles.quickActionIcon}>📋</Text>
            <Text style={styles.quickActionLabel} numberOfLines={2} ellipsizeMode="tail" allowFontScaling={false}>الطلبات</Text>
          </TouchableOpacity>
        </View>

        {/* Training Contents Action */}
        {onNavigateToTrainingContents && (
          <View style={styles.trainingContentsAction}>
            <TouchableOpacity 
              style={styles.trainingContentsButton} 
              onPress={() => onNavigateToTrainingContents()}
              activeOpacity={0.8}
            >
              <View style={styles.trainingContentsIconContainer}>
                <Text style={styles.trainingContentsIcon}>📚</Text>
              </View>
              <View style={styles.trainingContentsTextContainer}>
                <Text style={styles.trainingContentsTitle}>المحتوى التدريبي</Text>
                <Text style={styles.trainingContentsSubtitle}>عرض المواد الدراسية</Text>
              </View>
              <Text style={styles.trainingContentsArrow}>→</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 36 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  headerCard: { 
    backgroundColor: Colors.primary, 
    padding: 24, 
    margin: 16, 
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 20, 
    minHeight: 140,
    shadowColor: Colors.shadowDark, 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.22, 
    shadowRadius: 16, 
    elevation: 8 
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    justifyContent: 'space-between',
    minHeight: 100,
  },
  headerInfo: { 
    flex: 1, 
    paddingRight: 16,
    justifyContent: 'center',
  },
  greetingText: { 
    color: Colors.white, 
    fontSize: 26, 
    fontWeight: '800', 
    writingDirection: 'rtl', 
    textAlign: 'right',
    marginBottom: 8,
  },
  headerSub: { 
    color: 'rgba(255,255,255,0.95)', 
    fontSize: 16,
    marginTop: 4, 
    marginBottom: 8,
    writingDirection: 'rtl', 
    textAlign: 'right',
    fontWeight: '600',
  },
  headerDescription: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 8,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 20,
  },
  headerActions: { 
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 16,
  },
  profileBtn: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    overflow: 'hidden', 
    borderWidth: 3, 
    borderColor: Colors.white,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  profileImage: { width: 64, height: 64 },
  profileDefault: { 
    width: 64, 
    height: 64, 
    backgroundColor: Colors.white, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  profileDefaultText: { 
    color: Colors.primary, 
    fontWeight: '800', 
    fontSize: 24 
  },

  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 12 },
  quickActionButton: { flex: 1, minWidth: 72, backgroundColor: Colors.white, marginHorizontal: 6, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', shadowColor: Colors.shadowDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  quickActionIcon: { fontSize: 20, marginBottom: 6 },
  quickActionLabel: { fontSize: 12, color: Colors.textPrimary, fontWeight: '700', writingDirection: 'rtl', textAlign: 'center', flexWrap: 'wrap', lineHeight: 16, flexShrink: 1, minWidth: 0, includeFontPadding: false },

  trainingContentsAction: { paddingHorizontal: 16, marginTop: 12 },
  trainingContentsButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 16, padding: 16, shadowColor: Colors.shadowDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: Colors.borderLight },
  trainingContentsIconContainer: { width: 50, height: 50, borderRadius: 12, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  trainingContentsIcon: { fontSize: 24 },
  trainingContentsTextContainer: { flex: 1 },
  trainingContentsTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4, writingDirection: 'rtl', textAlign: 'right' },
  trainingContentsSubtitle: { fontSize: 13, color: Colors.textSecondary, writingDirection: 'rtl', textAlign: 'right' },
  trainingContentsArrow: { fontSize: 20, color: Colors.primary, fontWeight: '800', marginLeft: 8 },

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

