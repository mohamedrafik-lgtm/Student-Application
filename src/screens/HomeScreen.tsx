// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles home UI and navigation
// 2. Open/Closed: Can be extended with new features without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for different concerns
// 4. Dependency Inversion: Depends on abstractions (components) not concretions

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/Logo';
import CustomButton from '../components/CustomButton';
import { Colors } from '../styles/colors';

const { width, height } = Dimensions.get('window');

interface HomeScreenProps {
  userInfo?: {
    nameAr: string;
    nameEn: string;
    nationalId: string;
  };
  onLogout?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToSchedule?: () => void;
  onNavigateToExams?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ 
  userInfo, 
  onLogout,
  onNavigateToProfile,
  onNavigateToSchedule,
  onNavigateToExams
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من رغبتك في تسجيل الخروج؟',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'تسجيل الخروج',
          style: 'destructive',
          onPress: onLogout,
        },
      ]
    );
  };

  const handleProfile = () => {
    if (onNavigateToProfile) {
      onNavigateToProfile();
    } else {
      Alert.alert('الملف الشخصي', 'سيتم إضافة هذه الميزة قريباً');
    }
  };

  const handleCourses = () => {
    Alert.alert('الكورسات', 'سيتم إضافة هذه الميزة قريباً');
  };

  const handleSchedule = () => {
    if (onNavigateToSchedule) {
      onNavigateToSchedule();
    } else {
      Alert.alert('الجدول الدراسي', 'سيتم إضافة هذه الميزة قريباً');
    }
  };

  const handleGrades = () => {
    Alert.alert('الدرجات', 'سيتم إضافة هذه الميزة قريباً');
  };

  const handleExams = () => {
    if (onNavigateToExams) {
      onNavigateToExams();
    } else {
      Alert.alert('الاختبارات الإلكترونية', 'سيتم إضافة هذه الميزة قريباً');
    }
  };

  const handleNotifications = () => {
    Alert.alert('الإشعارات', 'سيتم إضافة هذه الميزة قريباً');
  };

  const handleSettings = () => {
    Alert.alert('الإعدادات', 'سيتم إضافة هذه الميزة قريباً');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background */}
      <View style={styles.backgroundContainer}>
        <View style={styles.gradientOverlay} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <Animated.View style={[
          styles.headerSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <Logo size="medium" showText={false} />
          <Text style={styles.welcomeTitle}>
            مرحباً {userInfo?.nameAr || 'أهلاً وسهلاً'}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            في منصة المتدربين - مركز طيبة
          </Text>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View style={[
          styles.quickActionsSection,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}>
          <Text style={styles.sectionTitle}>الإجراءات السريعة</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionCard} onPress={handleProfile}>
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.primarySoft }]}>
                <Text style={styles.quickActionEmoji}>👤</Text>
              </View>
              <Text style={styles.quickActionText}>الملف الشخصي</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleCourses}>
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.secondarySoft }]}>
                <Text style={styles.quickActionEmoji}>📚</Text>
              </View>
              <Text style={styles.quickActionText}>الكورسات</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleSchedule}>
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.accentSoft }]}>
                <Text style={styles.quickActionEmoji}>📅</Text>
              </View>
              <Text style={styles.quickActionText}>الجدول</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleGrades}>
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.infoSoft }]}>
                <Text style={styles.quickActionEmoji}>📊</Text>
              </View>
              <Text style={styles.quickActionText}>الدرجات</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleExams}>
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.successSoft }]}>
                <Text style={styles.quickActionEmoji}>📝</Text>
              </View>
              <Text style={styles.quickActionText}>الاختبارات</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Main Features */}
        <Animated.View style={[
          styles.featuresSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <Text style={styles.sectionTitle}>الميزات الرئيسية</Text>
          
          <View style={styles.featuresList}>
            <TouchableOpacity style={styles.featureItem} onPress={handleNotifications}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureEmoji}>🔔</Text>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>الإشعارات</Text>
                <Text style={styles.featureDescription}>عرض الإشعارات والتحديثات</Text>
              </View>
              <Text style={styles.featureArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.featureItem} onPress={handleSettings}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureEmoji}>⚙️</Text>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>الإعدادات</Text>
                <Text style={styles.featureDescription}>تخصيص التطبيق</Text>
              </View>
              <Text style={styles.featureArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* User Info Card */}
        <Animated.View style={[
          styles.userInfoCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <Text style={styles.userInfoTitle}>معلومات الحساب</Text>
          <View style={styles.userInfoContent}>
            <View style={styles.userInfoRow}>
              <Text style={styles.userInfoLabel}>الاسم:</Text>
              <Text style={styles.userInfoValue}>{userInfo?.nameAr || 'غير محدد'}</Text>
            </View>
            <View style={styles.userInfoRow}>
              <Text style={styles.userInfoLabel}>الرقم القومي:</Text>
              <Text style={styles.userInfoValue}>{userInfo?.nationalId || 'غير محدد'}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Logout Button */}
        <Animated.View style={[
          styles.logoutSection,
          {
            opacity: fadeAnim,
          }
        ]}>
          <CustomButton
            title="تسجيل الخروج"
            onPress={handleLogout}
            variant="outline"
            size="large"
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.backgroundDark,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  quickActionsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 16,
    textAlign: 'right',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - 60) / 2,
    backgroundColor: Colors.glass,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionEmoji: {
    fontSize: 24,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  featuresSection: {
    marginBottom: 32,
  },
  featuresList: {
    backgroundColor: Colors.glass,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  featureArrow: {
    fontSize: 20,
    color: Colors.textLight,
    fontWeight: '300',
  },
  userInfoCard: {
    backgroundColor: Colors.glass,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'right',
  },
  userInfoContent: {
    gap: 12,
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  userInfoValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  logoutSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
});

export default HomeScreen;

