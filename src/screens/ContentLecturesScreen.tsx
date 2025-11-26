// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles content lectures display
// 2. Open/Closed: Can be extended with new features without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for content details
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
import { lecturesService } from '../services/lecturesService';
import LectureViewScreen from './LectureViewScreen';
import {
  TrainingContentDetails,
  TrainingContentsError,
  Lecture,
  LectureType,
} from '../types/trainingContents';

interface ContentLecturesScreenProps {
  contentId: number;
  contentName: string;
  contentCode: string;
  accessToken: string;
  onBack: () => void;
}

const ContentLecturesScreen: React.FC<ContentLecturesScreenProps> = ({
  contentId,
  contentName,
  contentCode,
  accessToken,
  onBack,
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentDetails, setContentDetails] = useState<TrainingContentDetails | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(1); // الباب الأول مفتوح افتراضياً
  
  // Navigation state
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [showLectureView, setShowLectureView] = useState(false);

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

    // Load content details
    loadContentDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadContentDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Loading content details and lectures for:', contentId);
      
      // تحميل تفاصيل المادة
      const detailsResponse = await trainingContentsService.getTrainingContentDetails(contentId, accessToken);
      console.log('✅ Content details loaded successfully!');
      setContentDetails(detailsResponse);

      // تحميل المحاضرات
      const lecturesResponse = await lecturesService.getContentLectures(contentId, accessToken);
      console.log('✅ Lectures loaded successfully!', lecturesResponse.length);
      setLectures(lecturesResponse);

    } catch (error) {
      console.error('❌ Failed to load data:', error);
      const apiError = error as TrainingContentsError;
      
      let errorMessage = 'حدث خطأ أثناء تحميل البيانات';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      } else if (apiError.statusCode === 404) {
        errorMessage = 'لم يتم العثور على البيانات المطلوبة';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChapter = (chapterNumber: number) => {
    setExpandedChapter(expandedChapter === chapterNumber ? null : chapterNumber);
  };

  const handleViewLecture = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    setShowLectureView(true);
  };

  const handleBackFromLectureView = () => {
    setShowLectureView(false);
    setSelectedLecture(null);
  };

  const getLectureTypeText = (type: LectureType): string => {
    switch (type) {
      case 'VIDEO':
        return 'فيديو';
      case 'PDF':
        return 'ملف PDF';
      case 'BOTH':
        return 'فيديو وملف PDF';
      default:
        return type;
    }
  };

  const getLectureTypeIcon = (type: LectureType): string => {
    switch (type) {
      case 'VIDEO':
        return '▶️';
      case 'PDF':
        return '📄';
      case 'BOTH':
        return '📚';
      default:
        return '📖';
    }
  };

  // الحصول على محاضرات باب معين
  const getLecturesForChapter = (chapterNumber: number): Lecture[] => {
    return lectures
      .filter(lecture => lecture.chapter === chapterNumber)
      .sort((a, b) => a.order - b.order);
  };

  const renderLecturesForChapter = (chapterNumber: number) => {
    const chapterLectures = getLecturesForChapter(chapterNumber);

    if (chapterLectures.length === 0) {
      return (
        <View style={styles.noLecturesContainer}>
          <Text style={styles.noLecturesText}>لا توجد محاضرات في هذا الباب</Text>
        </View>
      );
    }

    return chapterLectures.map((lecture) => (
      <View key={lecture.id} style={styles.lectureCard}>
        <View style={styles.lectureHeader}>
          {/* Lecture Number Badge */}
          <View style={styles.lectureNumberBadge}>
            <Text style={styles.lectureNumberText}>#{lecture.order}</Text>
          </View>
          
          {/* Lecture Title */}
          <View style={styles.lectureTitleContainer}>
            <Text style={styles.lectureTitle}>{lecture.title}</Text>
            {lecture.description && (
              <Text style={styles.lectureDescription} numberOfLines={2}>
                {lecture.description}
              </Text>
            )}
          </View>
        </View>

        {/* Lecture Meta */}
        <View style={styles.lectureMeta}>
          <View style={styles.lectureTypeBadge}>
            <Text style={styles.lectureTypeIcon}>{getLectureTypeIcon(lecture.type)}</Text>
            <Text style={styles.lectureTypeText}>{getLectureTypeText(lecture.type)}</Text>
          </View>
        </View>

        {/* View Lecture Button */}
        <TouchableOpacity
          style={styles.viewLectureButton}
          onPress={() => handleViewLecture(lecture)}
          activeOpacity={0.8}
        >
          <Text style={styles.viewLectureButtonIcon}>👁️</Text>
          <Text style={styles.viewLectureButtonText}>عرض المحاضرة</Text>
        </TouchableOpacity>
      </View>
    ));
  };

  const renderChapter = (chapterNumber: number) => {
    const isExpanded = expandedChapter === chapterNumber;

    return (
      <View key={chapterNumber} style={styles.chapterContainer}>
        {/* Chapter Header */}
        <TouchableOpacity
          style={styles.chapterHeader}
          onPress={() => toggleChapter(chapterNumber)}
          activeOpacity={0.8}
        >
          <View style={styles.chapterTitleContainer}>
            <Text style={styles.chapterTitle}>الباب {chapterNumber}</Text>
            <Text style={styles.chapterLecturesCount}>
              {getLecturesForChapter(chapterNumber).length} محاضرة متاحة
            </Text>
          </View>
          <View style={[styles.chapterExpandIcon, isExpanded && styles.chapterExpandIconActive]}>
            <Text style={styles.chapterExpandIconText}>
              {isExpanded ? '▲' : '▼'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Chapter Lectures */}
        {isExpanded && (
          <Animated.View style={[styles.lecturesContainer, { opacity: fadeAnim }]}>
            {renderLecturesForChapter(chapterNumber)}
          </Animated.View>
        )}
      </View>
    );
  };

  // إذا تم اختيار محاضرة، عرض شاشة المحاضرة
  if (showLectureView && selectedLecture) {
    return (
      <LectureViewScreen
        lectureId={selectedLecture.id}
        accessToken={accessToken}
        onBack={handleBackFromLectureView}
        onBackToAllLectures={handleBackFromLectureView}
        onBackToAllContents={onBack}
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
          <Text style={styles.headerTitle}>محاضرات {contentName}</Text>
          <Text style={styles.headerSubtitle}>
            كود المقرر: {contentCode} • {contentDetails?._count.scheduleSlots || 0} محاضرة متاحة
          </Text>
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
            <Text style={styles.loadingText}>جاري تحميل المحاضرات...</Text>
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
              onPress={loadContentDetails}
              variant="outline"
              size="medium"
            />
          </Animated.View>
        )}

        {/* Chapters List */}
        {!isLoading && !error && contentDetails && (
          <Animated.View
            style={[
              styles.chaptersContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* عرض الأبواب حسب عدد chaptersCount */}
            {Array.from({ length: contentDetails.chaptersCount || 1 }, (_, i) =>
              renderChapter(i + 1)
            )}
          </Animated.View>
        )}

        {/* Empty State */}
        {!isLoading && !error && !contentDetails && (
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
            <Text style={styles.emptyTitle}>لا توجد محاضرات</Text>
            <Text style={styles.emptyDescription}>
              لا توجد محاضرات متاحة لهذه المادة في الوقت الحالي
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
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
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
  chaptersContainer: {
    gap: 16,
  },
  chapterContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    backgroundColor: Colors.backgroundSoft,
  },
  chapterTitleContainer: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'right',
  },
  chapterLecturesCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'right',
  },
  chapterExpandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chapterExpandIconActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  chapterExpandIconText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  lecturesContainer: {
    padding: 16,
    gap: 12,
    backgroundColor: Colors.background,
  },
  lectureCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  lectureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  lectureNumberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  lectureNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
  },
  lectureTitleContainer: {
    flex: 1,
  },
  lectureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  lectureMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'flex-end',
  },
  lectureTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  lectureTypeIcon: {
    fontSize: 12,
  },
  lectureTypeText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
  },
  viewLectureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  viewLectureButtonIcon: {
    fontSize: 14,
  },
  viewLectureButtonText: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '700',
  },
  noLecturesContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noLecturesText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  lectureDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 18,
  },
});

export default ContentLecturesScreen;