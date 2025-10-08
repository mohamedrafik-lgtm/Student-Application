// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles profile display and navigation
// 2. Open/Closed: Can be extended with new features without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for different concerns
// 4. Dependency Inversion: Depends on abstractions (components) not concretions

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../services/authService';
import { TraineeProfile, TraineeProfileError } from '../types/auth';
import { Colors } from '../styles/colors';
import CustomButton from '../components/CustomButton';

const { width, height } = Dimensions.get('window');

interface ProfileScreenProps {
  accessToken: string;
  onBack: () => void;
  onNavigateToDocuments?: () => void;
  onNavigateToPayments?: () => void;
  onNavigateToSchedule?: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ 
  accessToken, 
  onBack,
  onNavigateToDocuments,
  onNavigateToPayments,
  onNavigateToSchedule
}) => {
  const [profile, setProfile] = useState<TraineeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile) {
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
    }
  }, [profile]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Loading profile...');
      const profileData = await AuthService.getProfile(accessToken);
      console.log('✅ Profile loaded successfully:', profileData);
      
      setProfile(profileData);
    } catch (error) {
      console.error('❌ Failed to load profile:', error);
      const apiError = error as TraineeProfileError;
      
      let errorMessage = 'حدث خطأ أثناء تحميل بيانات البروفايل';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      } else if (apiError.statusCode === 0) {
        errorMessage = apiError.message;
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    Alert.alert('تعديل البروفايل', 'سيتم إضافة هذه الميزة قريباً');
  };

  const handleViewDocuments = () => {
    if (onNavigateToDocuments) {
      onNavigateToDocuments();
    } else {
      Alert.alert('الوثائق', 'سيتم إضافة هذه الميزة قريباً');
    }
  };

  const handleViewPayments = () => {
    if (onNavigateToPayments) {
      onNavigateToPayments();
    } else {
      Alert.alert('المدفوعات', 'سيتم إضافة هذه الميزة قريباً');
    }
  };

  const handleViewSchedule = () => {
    if (onNavigateToSchedule) {
      onNavigateToSchedule();
    } else {
      Alert.alert('الجدول الدراسي', 'سيتم إضافة هذه الميزة قريباً');
    }
  };

  const handleViewAttendance = () => {
    Alert.alert('سجل الحضور', 'سيتم إضافة هذه الميزة قريباً');
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CURRENT':
        return Colors.success;
      case 'GRADUATE':
        return Colors.info;
      case 'WITHDRAWN':
        return Colors.error;
      default:
        return Colors.warning;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CURRENT':
        return 'مستمر';
      case 'GRADUATE':
        return 'خريج';
      case 'WITHDRAWN':
        return 'منسحب';
      case 'NEW':
        return 'مستجد';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>جاري تحميل بيانات البروفايل...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>خطأ في تحميل البروفايل</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <CustomButton
            title="إعادة المحاولة"
            onPress={loadProfile}
            variant="primary"
            size="large"
          />
          <CustomButton
            title="العودة"
            onPress={onBack}
            variant="outline"
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>لا توجد بيانات</Text>
          <Text style={styles.errorMessage}>لم يتم العثور على بيانات البروفايل</Text>
          <CustomButton
            title="العودة"
            onPress={onBack}
            variant="primary"
            size="large"
          />
        </View>
      </SafeAreaView>
    );
  }

  const { trainee } = profile;

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Background with Gradient */}
      <View style={styles.backgroundContainer}>
        <View style={styles.gradientOverlay} />
        <View style={styles.decorativeCircles}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Header Section */}
        <Animated.View style={[
          styles.headerSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <View style={styles.backButtonIcon}>
                <Text style={styles.backButtonText}>←</Text>
              </View>
              <Text style={styles.backButtonLabel}>العودة</Text>
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>الملف الشخصي</Text>
              <View style={styles.headerUnderline} />
            </View>
            
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <View style={styles.editButtonIcon}>
                <Text style={styles.editButtonText}>✏️</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Enhanced Profile Card with Gradient */}
          <View style={styles.profileCard}>
            <View style={styles.profileCardGradient} />
            
            <View style={styles.photoContainer}>
              <View style={styles.photoGlow} />
              {trainee.photoUrl ? (
                <Image source={{ uri: trainee.photoUrl }} style={styles.profilePhoto} />
              ) : (
                <View style={styles.defaultPhoto}>
                  <Text style={styles.defaultPhotoText}>
                    {trainee.nameAr.charAt(0)}
                  </Text>
                </View>
              )}
              <View style={styles.photoStatusIndicator} />
            </View>
            
            <View style={styles.basicInfo}>
              <Text style={styles.nameText}>{trainee.nameAr}</Text>
              <Text style={styles.nameEnText}>{trainee.nameEn}</Text>
              
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(trainee.traineeStatus) }
                ]}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>
                    {getStatusText(trainee.traineeStatus)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.profileStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>ID: {trainee.id}</Text>
                  <Text style={styles.statLabel}>معرف المتدرب</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{trainee.program.nameAr}</Text>
                  <Text style={styles.statLabel}>البرنامج</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Enhanced Quick Actions */}
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>الإجراءات السريعة</Text>
            <View style={styles.sectionTitleUnderline} />
          </View>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionCard} onPress={handleViewDocuments}>
              <View style={styles.quickActionCardGradient} />
              <View style={[styles.quickActionIcon, { backgroundColor: '#6366F1' }]}>
                <Text style={styles.quickActionEmoji}>📄</Text>
              </View>
              <Text style={styles.quickActionText}>الوثائق</Text>
              <Text style={styles.quickActionSubtext}>عرض الملفات</Text>
              <View style={styles.quickActionBadge}>
                <Text style={styles.quickActionBadgeText}>{trainee.documents?.length || 0}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleViewPayments}>
              <View style={styles.quickActionCardGradient} />
              <View style={[styles.quickActionIcon, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.quickActionEmoji}>💳</Text>
              </View>
              <Text style={styles.quickActionText}>المدفوعات</Text>
              <Text style={styles.quickActionSubtext}>سجل المدفوعات</Text>
              <View style={styles.quickActionBadge}>
                <Text style={styles.quickActionBadgeText}>{trainee.traineePayments?.length || 0}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleViewSchedule}>
              <View style={styles.quickActionCardGradient} />
              <View style={[styles.quickActionIcon, { backgroundColor: '#3B82F6' }]}>
                <Text style={styles.quickActionEmoji}>📅</Text>
              </View>
              <Text style={styles.quickActionText}>الجدول الدراسي</Text>
              <Text style={styles.quickActionSubtext}>المواعيد والجلسات</Text>
              <View style={styles.quickActionBadge}>
                <Text style={styles.quickActionBadgeText}>📚</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleViewAttendance}>
              <View style={styles.quickActionCardGradient} />
              <View style={[styles.quickActionIcon, { backgroundColor: '#10B981' }]}>
                <Text style={styles.quickActionEmoji}>📊</Text>
              </View>
              <Text style={styles.quickActionText}>الحضور</Text>
              <Text style={styles.quickActionSubtext}>سجل الحضور</Text>
              <View style={styles.quickActionBadge}>
                <Text style={styles.quickActionBadgeText}>{trainee.attendanceRecords?.length || 0}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleEditProfile}>
              <View style={styles.quickActionCardGradient} />
              <View style={[styles.quickActionIcon, { backgroundColor: '#8B5CF6' }]}>
                <Text style={styles.quickActionEmoji}>✏️</Text>
              </View>
              <Text style={styles.quickActionText}>تعديل</Text>
              <Text style={styles.quickActionSubtext}>تعديل البيانات</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Enhanced Personal Information */}
        <Animated.View style={[
          styles.infoSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>المعلومات الشخصية</Text>
            <View style={styles.sectionTitleUnderline} />
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Text style={styles.infoCardTitle}>👤 البيانات الأساسية</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <View style={styles.infoItemIcon}>
                  <Text style={styles.infoItemEmoji}>🆔</Text>
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoLabel}>الرقم القومي</Text>
                  <Text style={styles.infoValue}>{trainee.nationalId}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <View style={styles.infoItemIcon}>
                  <Text style={styles.infoItemEmoji}>🎂</Text>
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoLabel}>تاريخ الميلاد</Text>
                  <Text style={styles.infoValue}>{formatDate(trainee.birthDate)}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <View style={styles.infoItemIcon}>
                  <Text style={styles.infoItemEmoji}>⚧</Text>
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoLabel}>النوع</Text>
                  <Text style={styles.infoValue}>
                    {trainee.gender === 'MALE' ? 'ذكر' : 'أنثى'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <View style={styles.infoItemIcon}>
                  <Text style={styles.infoItemEmoji}>🌍</Text>
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoLabel}>الجنسية</Text>
                  <Text style={styles.infoValue}>{trainee.nationality}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <View style={styles.infoItemIcon}>
                  <Text style={styles.infoItemEmoji}>💍</Text>
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoLabel}>الحالة الاجتماعية</Text>
                  <Text style={styles.infoValue}>
                    {trainee.maritalStatus === 'SINGLE' ? 'أعزب' : 
                     trainee.maritalStatus === 'MARRIED' ? 'متزوج' :
                     trainee.maritalStatus === 'DIVORCED' ? 'مطلق' : 'أرمل'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Enhanced Contact Information */}
        <Animated.View style={[
          styles.infoSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>معلومات الاتصال</Text>
            <View style={styles.sectionTitleUnderline} />
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Text style={styles.infoCardTitle}>📞 بيانات التواصل</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <View style={styles.infoItemIcon}>
                  <Text style={styles.infoItemEmoji}>📱</Text>
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoLabel}>رقم الهاتف</Text>
                  <Text style={styles.infoValue}>{trainee.phone}</Text>
                </View>
              </View>
              
              {trainee.email && (
                <View style={styles.infoItem}>
                  <View style={styles.infoItemIcon}>
                    <Text style={styles.infoItemEmoji}>📧</Text>
                  </View>
                  <View style={styles.infoItemContent}>
                    <Text style={styles.infoLabel}>البريد الإلكتروني</Text>
                    <Text style={styles.infoValue}>{trainee.email}</Text>
                  </View>
                </View>
              )}
              
              <View style={styles.infoItem}>
                <View style={styles.infoItemIcon}>
                  <Text style={styles.infoItemEmoji}>🏠</Text>
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoLabel}>العنوان</Text>
                  <Text style={styles.infoValue}>{trainee.address}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <View style={styles.infoItemIcon}>
                  <Text style={styles.infoItemEmoji}>🏙️</Text>
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoLabel}>المدينة</Text>
                  <Text style={styles.infoValue}>{trainee.city}</Text>
                </View>
              </View>
              
              {trainee.governorate && (
                <View style={styles.infoItem}>
                  <View style={styles.infoItemIcon}>
                    <Text style={styles.infoItemEmoji}>🗺️</Text>
                  </View>
                  <View style={styles.infoItemContent}>
                    <Text style={styles.infoLabel}>المحافظة</Text>
                    <Text style={styles.infoValue}>{trainee.governorate}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Enhanced Program Information */}
        <Animated.View style={[
          styles.infoSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>معلومات البرنامج</Text>
            <View style={styles.sectionTitleUnderline} />
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Text style={styles.infoCardTitle}>🎓 البرنامج التدريبي</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <View style={styles.infoItemIcon}>
                  <Text style={styles.infoItemEmoji}>📚</Text>
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoLabel}>البرنامج</Text>
                  <Text style={styles.infoValue}>{trainee.program.nameAr}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <View style={styles.infoItemIcon}>
                  <Text style={styles.infoItemEmoji}>📅</Text>
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoLabel}>نوع البرنامج</Text>
                  <Text style={styles.infoValue}>
                    {trainee.programType === 'SUMMER' ? 'صيفي' :
                     trainee.programType === 'WINTER' ? 'شتوي' : 'عقد سنة'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <View style={styles.infoItemIcon}>
                  <Text style={styles.infoItemEmoji}>🎯</Text>
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoLabel}>الفرقة</Text>
                  <Text style={styles.infoValue}>
                    {trainee.classLevel === 'FIRST' ? 'الأولى' :
                     trainee.classLevel === 'SECOND' ? 'الثانية' :
                     trainee.classLevel === 'THIRD' ? 'الثالثة' : 'الرابعة'}
                  </Text>
                </View>
              </View>
              
              {trainee.academicYear && (
                <View style={styles.infoItem}>
                  <View style={styles.infoItemIcon}>
                    <Text style={styles.infoItemEmoji}>📆</Text>
                  </View>
                  <View style={styles.infoItemContent}>
                    <Text style={styles.infoLabel}>العام الدراسي</Text>
                    <Text style={styles.infoValue}>{trainee.academicYear}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Enhanced Guardian Information */}
        <Animated.View style={[
          styles.infoSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>معلومات ولي الأمر</Text>
            <View style={styles.sectionTitleUnderline} />
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Text style={styles.infoCardTitle}>👨‍👩‍👧‍👦 بيانات ولي الأمر</Text>
            </View>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <View style={styles.infoItemIcon}>
                  <Text style={styles.infoItemEmoji}>👤</Text>
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoLabel}>اسم ولي الأمر</Text>
                  <Text style={styles.infoValue}>{trainee.guardianName}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <View style={styles.infoItemIcon}>
                  <Text style={styles.infoItemEmoji}>📞</Text>
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoLabel}>رقم هاتف ولي الأمر</Text>
                  <Text style={styles.infoValue}>{trainee.guardianPhone}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <View style={styles.infoItemIcon}>
                  <Text style={styles.infoItemEmoji}>🤝</Text>
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoLabel}>صلة القرابة</Text>
                  <Text style={styles.infoValue}>{trainee.guardianRelation}</Text>
                </View>
              </View>
              
              {trainee.guardianJob && (
                <View style={styles.infoItem}>
                  <View style={styles.infoItemIcon}>
                    <Text style={styles.infoItemEmoji}>💼</Text>
                  </View>
                  <View style={styles.infoItemContent}>
                    <Text style={styles.infoLabel}>وظيفة ولي الأمر</Text>
                    <Text style={styles.infoValue}>{trainee.guardianJob}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
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
  decorativeCircles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -75,
  },
  circle3: {
    width: 100,
    height: 100,
    top: '30%',
    right: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textLight,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  headerSection: {
    marginBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButtonIcon: {
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 18,
    color: Colors.white,
    fontWeight: '700',
  },
  backButtonLabel: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerUnderline: {
    width: 60,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginTop: 8,
  },
  editButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  editButtonIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 16,
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  profileCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  photoContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  photoGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.white,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  defaultPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  defaultPhotoText: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.white,
  },
  photoStatusIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.success,
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  basicInfo: {
    alignItems: 'center',
    width: '100%',
  },
  nameText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  nameEnText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    marginHorizontal: 16,
  },
  quickActionsSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  sectionTitleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - 60) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  quickActionCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.primary,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionEmoji: {
    fontSize: 28,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  quickActionBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  infoSection: {
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  infoCardHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(99, 102, 241, 0.1)',
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  infoItemIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  infoItemEmoji: {
    fontSize: 24,
  },
  infoItemContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'right',
  },
  infoValue: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '700',
    textAlign: 'right',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default ProfileScreen;
