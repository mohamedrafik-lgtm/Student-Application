// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles training contents display
// 2. Open/Closed: Can be extended with new features without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for training contents
// 4. Dependency Inversion: Depends on abstractions (services) not concretions

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';
import { Colors } from '../styles/colors';
import { trainingContentsService } from '../services/trainingContentsService';
import { AuthService } from '../services/authService';
import ContentLecturesScreen from './ContentLecturesScreen';
import {
  TrainingContent,
  TrainingContentsError,
} from '../types/trainingContents';

interface TrainingContentsScreenProps {
  accessToken: string;
  onBack: () => void;
}

const TrainingContentsScreen: React.FC<TrainingContentsScreenProps> = ({
  accessToken,
  onBack,
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contents, setContents] = useState<TrainingContent[]>([]);
  const [_userProgramId, setUserProgramId] = useState<number | null>(null);
  const [userProgramName, setUserProgramName] = useState<string>('');
  
  // Navigation state
  const [selectedContent, setSelectedContent] = useState<TrainingContent | null>(null);
  const [showLectures, setShowLectures] = useState(false);

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Load user profile and training contents data
    loadUserProfileAndContents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserProfileAndContents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load user profile first to get programId
      console.log('🔍 Loading user profile...');
      const profile = await AuthService.getProfile(accessToken);
      
      if (profile && profile.trainee && profile.trainee.programId) {
        const programId = profile.trainee.programId;
        setUserProgramId(programId);
        setUserProgramName(profile.trainee.program.nameAr);
        console.log('✅ User program loaded:', {
          programId: programId,
          programName: profile.trainee.program.nameAr
        });

        // Load training contents with programId
        console.log('🔍 Loading training contents for program:', programId);
        const response = await trainingContentsService.getTrainingContents(programId, accessToken);

        console.log('✅ Training contents loaded successfully!');
        console.log('📚 Contents count:', response.length || 0);

        if (Array.isArray(response)) {
          setContents(response);
        } else {
          setContents([]);
        }
      } else {
        console.warn('⚠️ No program found for user');
        setError('لا يوجد برنامج مسجل للمستخدم');
      }
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      const apiError = error as TrainingContentsError;
      
      let errorMessage = 'حدث خطأ أثناء تحميل البيانات';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      } else if (apiError.statusCode === 404) {
        errorMessage = 'لم يتم العثور على مواد دراسية';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewLectures = (content: TrainingContent) => {
    setSelectedContent(content);
    setShowLectures(true);
  };

  const handleBackFromLectures = () => {
    setShowLectures(false);
    setSelectedContent(null);
  };

  const getTotalLectures = (content: TrainingContent): number => {
    return content.theorySessionsPerWeek + content.practicalSessionsPerWeek;
  };

  const renderContentCard = (content: TrainingContent) => {
    const totalLectures = getTotalLectures(content);

    return (
      <View key={content.id} style={styles.contentCard}>
        {/* Lecture Count Badge */}
        <View style={styles.lectureCountBadge}>
          <Text style={styles.lectureCountText}>{totalLectures} محاضرة</Text>
        </View>

        {/* Book Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.bookIcon}>📖</Text>
        </View>

        {/* Content Name */}
        <Text style={styles.contentName} numberOfLines={2}>
          {content.name}
        </Text>

        {/* Content Code */}
        <Text style={styles.contentCode}>{content.code}</Text>

        {/* Classroom */}
        <View style={styles.classroomContainer}>
          <Text style={styles.classroomLabel}>الفصل الثاني</Text>
        </View>

        {/* Available Lectures Badge */}
        <View style={styles.availableBadge}>
          <Text style={styles.availableBadgeIcon}>📚</Text>
          <Text style={styles.availableBadgeText}>{content._count.scheduleSlots} متاحة</Text>
        </View>

        {/* View Lectures Button */}
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => handleViewLectures(content)}
          activeOpacity={0.8}
        >
          <Text style={styles.viewButtonIcon}>📖</Text>
          <Text style={styles.viewButtonText}>عرض المحاضرات</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // إذا تم اختيار مادة، عرض شاشة المحاضرات
  if (showLectures && selectedContent) {
    return (
      <ContentLecturesScreen
        contentId={selectedContent.id}
        contentName={selectedContent.name}
        contentCode={selectedContent.code}
        accessToken={accessToken}
        onBack={handleBackFromLectures}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <View style={styles.backButtonContainer}>
            <Text style={styles.backButtonText}>←</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>مقرراتك الدراسية</Text>
        </View>
        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading State */}
        {isLoading && (
          <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>جاري تحميل المحتوى التدريبي...</Text>
          </Animated.View>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Animated.View
            style={[
              styles.errorContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <CustomButton
              title="إعادة المحاولة"
              onPress={loadUserProfileAndContents}
              variant="outline"
              size="medium"
            />
          </Animated.View>
        )}

        {/* Program Banner */}
        {!isLoading && !error && userProgramName && (
          <Animated.View
            style={[
              styles.programBanner,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.programBannerContent}>
              <View style={styles.programBannerTextContainer}>
                <Text style={styles.programBannerTitle}>برنامجك التدريبي</Text>
                <Text style={styles.programBannerSubtitle}>مساعد خدمات صحية</Text>
              </View>
              <View style={styles.programBannerIcon}>
                <Text style={styles.programBannerIconText}>🎓</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Contents Grid */}
        {!isLoading && !error && contents.length > 0 && (
          <Animated.View
            style={[
              styles.contentsGrid,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {contents.map(renderContentCard)}
          </Animated.View>
        )}

        {/* Empty State */}
        {!isLoading && !error && contents.length === 0 && (
          <Animated.View
            style={[
              styles.emptyContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>لا يوجد محتوى تدريبي</Text>
            <Text style={styles.emptyDescription}>
              لا يوجد مواد دراسية متاحة لبرنامجك في الوقت الحالي
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.primary,
    fontWeight: '800',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 96,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  programBanner: {
    marginBottom: 24,
  },
  programBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#10B981',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  programBannerTextContainer: {
    flex: 1,
  },
  programBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 4,
    textAlign: 'right',
  },
  programBannerSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    textAlign: 'right',
  },
  programBannerIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  programBannerIconText: {
    fontSize: 28,
  },
  contentsGrid: {
    gap: 16,
  },
  contentCard: {
    width: '100%', // عرض كامل - كل كارد في سطر لوحده
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lectureCountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  lectureCountText: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '700',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  bookIcon: {
    fontSize: 32,
  },
  contentName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
    minHeight: 40,
  },
  contentCode: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 12,
  },
  classroomContainer: {
    backgroundColor: Colors.backgroundSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  classroomLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    gap: 4,
  },
  availableBadgeIcon: {
    fontSize: 12,
  },
  availableBadgeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    width: '100%',
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  viewButtonIcon: {
    fontSize: 14,
  },
  viewButtonText: {
    fontSize: 13,
    color: Colors.white,
    fontWeight: '700',
  },
});

export default TrainingContentsScreen;
