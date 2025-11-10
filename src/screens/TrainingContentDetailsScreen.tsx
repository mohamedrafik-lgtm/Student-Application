// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles displaying lectures for a training content
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
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';
import { Colors } from '../styles/colors';
import { trainingContentsService } from '../services/trainingContentsService';
import { API_CONFIG } from '../services/apiConfig';
import {
  TrainingContentDetailsScreenProps,
  TrainingContentsError,
  Lecture,
  LectureType,
} from '../types/trainingContents';
import LectureDetailsScreen from './LectureDetailsScreen';

const { width } = Dimensions.get('window');

const TrainingContentDetailsScreen: React.FC<TrainingContentDetailsScreenProps> = ({
  contentId,
  accessToken,
  onBack,
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [contentName, setContentName] = useState<string>('');
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);

  useEffect(() => {
    console.log('🎬 Component mounted/updated, contentId:', contentId);
    loadLectures();
    
    // Start animations immediately
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
  }, []);

  const loadLectures = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Loading lectures for content:', contentId);
      console.log('🔑 Access token:', accessToken ? 'Present' : 'Missing');
      console.log('🌐 API Base URL:', API_CONFIG.BASE_URL);
      
      const response = await trainingContentsService.getLecturesByContent(
        contentId,
        accessToken
      );
      
      console.log('✅ Lectures loaded successfully!');
      console.log('📊 Response type:', typeof response);
      console.log('📊 Is array:', Array.isArray(response));
      console.log('📊 Lectures count:', response.length);
      console.log('📊 Full response:', JSON.stringify(response, null, 2));
      console.log('📊 About to set lectures state with:', response.length, 'lectures');
      
      setLectures(response);
      console.log('✅ Lectures state updated');
      
      // Get content name from first lecture
      if (response.length > 0) {
        setContentName(response[0].content.name);
        console.log('📚 Content name set to:', response[0].content.name);
      } else {
        console.warn('⚠️ No lectures found in response');
        setContentName('المحتوى التدريبي');
      }
      
      console.log('🎯 Final state - lectures count:', response.length);
    } catch (error) {
      console.error('❌ Failed to load lectures:', error);
      const apiError = error as TrainingContentsError;
      
      let errorMessage = 'حدث خطأ أثناء تحميل المحاضرات';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      } else if (apiError.statusCode === 404) {
        errorMessage = 'لم يتم العثور على محاضرات لهذه المادة';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getLectureTypeIcon = (type: LectureType): string => {
    const icons: Record<LectureType, string> = {
      VIDEO: '🎥',
      PDF: '📄',
      BOTH: '📚',
      TEXT: '📝',
    };
    return icons[type] || '📖';
  };

  const getLectureTypeLabel = (type: LectureType): string => {
    const labels: Record<LectureType, string> = {
      VIDEO: 'فيديو',
      PDF: 'ملف PDF',
      BOTH: 'فيديو و PDF',
      TEXT: 'نص',
    };
    return labels[type] || type;
  };

  const toggleChapter = (chapter: number) => {
    setExpandedChapter(expandedChapter === chapter ? null : chapter);
  };

  const handleLecturePress = (lecture: Lecture) => {
    setSelectedLecture(lecture);
  };

  const handleBackFromLecture = () => {
    setSelectedLecture(null);
  };

  // If a lecture is selected, show lecture details screen
  if (selectedLecture) {
    return (
      <LectureDetailsScreen
        lecture={selectedLecture}
        accessToken={accessToken}
        onBack={handleBackFromLecture}
      />
    );
  }

  const handleOpenYoutube = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('خطأ', 'تعذر فتح رابط اليوتيوب');
    });
  };

  const handleOpenPDF = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('خطأ', 'تعذر فتح ملف PDF');
    });
  };

  // Group lectures by chapter
  const lecturesByChapter = lectures.reduce((acc, lecture) => {
    if (!acc[lecture.chapter]) {
      acc[lecture.chapter] = [];
    }
    acc[lecture.chapter].push(lecture);
    return acc;
  }, {} as Record<number, Lecture[]>);

  // Sort lectures within each chapter by order
  Object.keys(lecturesByChapter).forEach(chapter => {
    lecturesByChapter[Number(chapter)].sort((a, b) => a.order - b.order);
  });

  const totalChapters = Object.keys(lecturesByChapter).length;

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <View style={styles.backButtonContainer}>
            <Text style={styles.backButtonText}>←</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>المحاضرات</Text>
          <Text style={styles.headerSubtitle}>
            {contentName || 'المحتوى التدريبي'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </Animated.View>

      {/* Stats Bar */}
      {!isLoading && !error && lectures.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>📚</Text>
            <Text style={styles.statValue}>{totalChapters}</Text>
            <Text style={styles.statLabel}>باب</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>📝</Text>
            <Text style={styles.statValue}>{lectures.length}</Text>
            <Text style={styles.statLabel}>محاضرة</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🎥</Text>
            <Text style={styles.statValue}>
              {lectures.filter(l => l.youtubeUrl).length}
            </Text>
            <Text style={styles.statLabel}>فيديو</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>📄</Text>
            <Text style={styles.statValue}>
              {lectures.filter(l => l.pdfFile).length}
            </Text>
            <Text style={styles.statLabel}>PDF</Text>
          </View>
        </View>
      )}

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
              onPress={loadLectures}
              variant="outline"
              size="medium"
            />
          </Animated.View>
        )}

        {/* Empty State */}
        {!isLoading && !error && lectures.length === 0 && (
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

        {/* Lectures List - Grouped by Chapter */}
        {!isLoading && !error && lectures.length > 0 && (
          <Animated.View
            style={[
              styles.lecturesContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {Object.keys(lecturesByChapter)
              .sort((a, b) => Number(a) - Number(b))
              .map((chapterNum) => {
                const chapter = Number(chapterNum);
                const chapterLectures = lecturesByChapter[chapter];
                const isExpanded = expandedChapter === chapter;

                return (
                  <View key={chapter} style={styles.chapterCard}>
                    {/* Chapter Header */}
                    <TouchableOpacity
                      style={styles.chapterHeader}
                      onPress={() => toggleChapter(chapter)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.chapterInfo}>
                        <Text style={styles.chapterNumber}>
                          الباب {chapter}
                        </Text>
                        <Text style={styles.chapterCount}>
                          {chapterLectures.length} محاضرة
                        </Text>
                      </View>
                      <View style={styles.chapterExpandButton}>
                        <Text style={styles.chapterExpandIcon}>
                          {isExpanded ? '▲' : '▼'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Lectures List */}
                    {isExpanded && (
                      <Animated.View
                        style={[
                          styles.lecturesListContainer,
                          { opacity: fadeAnim },
                        ]}
                      >
                        {chapterLectures.map((lecture) => (
                          <TouchableOpacity
                            key={lecture.id}
                            style={styles.lectureCard}
                            onPress={() => handleLecturePress(lecture)}
                            activeOpacity={0.8}
                          >
                            {/* Lecture Header */}
                            <View style={styles.lectureHeader}>
                              <View style={styles.lectureNumberBadge}>
                                <Text style={styles.lectureNumber}>
                                  {lecture.order}
                                </Text>
                              </View>
                              <View style={styles.lectureInfo}>
                                <Text style={styles.lectureTitle}>
                                  {lecture.title}
                                </Text>
                                {lecture.description && (
                                  <Text style={styles.lectureDescription}>
                                    {lecture.description}
                                  </Text>
                                )}
                              </View>
                              <View style={styles.lectureTypeBadge}>
                                <Text style={styles.lectureTypeIcon}>
                                  {getLectureTypeIcon(lecture.type)}
                                </Text>
                              </View>
                            </View>

                            {/* Lecture Resources/Actions */}
                            <View style={styles.lectureActions}>
                              {lecture.youtubeUrl && (
                                <TouchableOpacity
                                  style={styles.actionButton}
                                  onPress={() => handleOpenYoutube(lecture.youtubeUrl!)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.actionIcon}>🎥</Text>
                                  <Text style={styles.actionLabel}>
                                    مشاهدة الفيديو
                                  </Text>
                                </TouchableOpacity>
                              )}
                              {lecture.pdfFile && (
                                <TouchableOpacity
                                  style={styles.actionButton}
                                  onPress={() => handleOpenPDF(lecture.pdfFile!)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.actionIcon}>📄</Text>
                                  <Text style={styles.actionLabel}>
                                    فتح PDF
                                  </Text>
                                </TouchableOpacity>
                              )}
                              {!lecture.youtubeUrl && !lecture.pdfFile && (
                                <View style={styles.noResourcesContainer}>
                                  <Text style={styles.noResourcesIcon}>📝</Text>
                                  <Text style={styles.noResourcesText}>
                                    محتوى نصي فقط
                                  </Text>
                                </View>
                              )}
                            </View>
                            
                            {/* Click Hint */}
                            <View style={styles.clickHint}>
                              <Text style={styles.clickHintText}>
                                اضغط لعرض التفاصيل
                              </Text>
                              <Text style={styles.clickHintArrow}>→</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </Animated.View>
                    )}
                  </View>
                );
              })}
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
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  headerSpacer: {
    width: 44,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
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
  lecturesContainer: {
    gap: 16,
  },
  chapterCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.primarySoft,
  },
  chapterInfo: {
    flex: 1,
  },
  chapterNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 4,
  },
  chapterCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  chapterExpandButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterExpandIcon: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  lecturesListContainer: {
    padding: 12,
    paddingTop: 8,
  },
  lectureCard: {
    backgroundColor: Colors.backgroundSoft,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  lectureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  lectureNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lectureNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
  },
  lectureInfo: {
    flex: 1,
    marginRight: 8,
  },
  lectureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
    textAlign: 'right',
  },
  lectureDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    textAlign: 'right',
  },
  lectureTypeBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  lectureTypeIcon: {
    fontSize: 18,
  },
  lectureActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  actionLabel: {
    fontSize: 13,
    color: Colors.white,
    fontWeight: '700',
  },
  noResourcesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  noResourcesIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  noResourcesText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  clickHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  clickHintText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  clickHintArrow: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '800',
  },
});

export default TrainingContentDetailsScreen;