// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles exams display and navigation
// 2. Open/Closed: Can be extended with new exam types without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for exams
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';
import { Colors } from '../styles/colors';
import { quizService } from '../services/quizService';
import { AvailableQuiz, QuizStatus, QuizError } from '../types/quizzes';

const { width } = Dimensions.get('window');

interface ExamsScreenProps {
  accessToken: string;
  onBack: () => void;
}

const ExamsScreen: React.FC<ExamsScreenProps> = ({ 
  accessToken, 
  onBack 
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<AvailableQuiz[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | QuizStatus>('all');

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

    // Load quizzes data
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Loading available quizzes...');
      
      const response = await quizService.getAvailableQuizzes(accessToken);
      
      console.log('✅ Quizzes loaded successfully!', response.quizzes?.length || 0);
      console.log('📊 Response structure:', {
        success: response.success,
        hasQuizzes: !!response.quizzes,
        quizzesType: typeof response.quizzes,
        quizzesLength: response.quizzes?.length,
        message: response.message
      });
      
      // التحقق من وجود البيانات قبل التعيين
      if (response && response.quizzes && Array.isArray(response.quizzes)) {
        setQuizzes(response.quizzes);
      } else if (response && response.success === false) {
        // إذا كان response.success = false، عرض رسالة الخطأ من الـ API
        const errorMessage = response.message || 'فشل في تحميل الاختبارات';
        setError(errorMessage);
        setQuizzes([]);
      } else {
        console.warn('⚠️ Invalid response structure or no quizzes found');
        setQuizzes([]);
      }

    } catch (error) {
      console.error('❌ Failed to load quizzes:', error);
      const apiError = error as QuizError;
      
      let errorMessage = 'حدث خطأ أثناء تحميل الاختبارات';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      } else if (apiError.statusCode === 404) {
        errorMessage = 'لم يتم العثور على اختبارات متاحة';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredQuizzes = () => {
    if (selectedFilter === 'all') {
      return quizzes;
    }
    return quizzes.filter(quiz => quiz.status === selectedFilter);
  };

  const getStatusColor = (status: QuizStatus) => {
    switch (status) {
      case QuizStatus.AVAILABLE:
        return Colors.success;
      case QuizStatus.COMPLETED:
        return Colors.info;
      case QuizStatus.UPCOMING:
        return Colors.warning;
      case QuizStatus.ENDED:
        return Colors.error;
      default:
        return Colors.textLight;
    }
  };

  const getStatusText = (status: QuizStatus) => {
    switch (status) {
      case QuizStatus.AVAILABLE:
        return 'متاح الآن';
      case QuizStatus.COMPLETED:
        return 'مكتمل';
      case QuizStatus.UPCOMING:
        return 'قريباً';
      case QuizStatus.ENDED:
        return 'منتهي';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: QuizStatus) => {
    switch (status) {
      case QuizStatus.AVAILABLE:
        return '✅';
      case QuizStatus.COMPLETED:
        return '✔️';
      case QuizStatus.UPCOMING:
        return '⏰';
      case QuizStatus.ENDED:
        return '❌';
      default:
        return '📝';
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleQuizPress = (quiz: AvailableQuiz) => {
    if (quiz.status === QuizStatus.AVAILABLE && quiz.canAttempt) {
      Alert.alert(
        quiz.title,
        `هل تريد البدء في الاختبار؟\n\nالمدة: ${quiz.duration} دقيقة\nعدد الأسئلة: ${quiz._count.questions}\nدرجة النجاح: ${quiz.passingScore}%`,
        [
          { text: 'إلغاء', style: 'cancel' },
          { 
            text: 'بدء الاختبار', 
            onPress: () => startQuiz(quiz)
          }
        ]
      );
    } else if (quiz.status === QuizStatus.COMPLETED && quiz.result) {
      Alert.alert(
        'نتيجة الاختبار',
        `الدرجة: ${quiz.result.score}\nالنسبة: ${quiz.result.percentage}%\n${quiz.result.passed ? '✅ ناجح' : '❌ راسب'}`,
        [{ text: 'حسناً' }]
      );
    } else {
      Alert.alert(
        quiz.title,
        quiz.description || 'لا يمكن البدء في الاختبار حالياً',
        [{ text: 'حسناً' }]
      );
    }
  };

  const startQuiz = async (quiz: AvailableQuiz) => {
    // TODO: Navigate to quiz screen
    Alert.alert('قريباً', 'سيتم إضافة صفحة الاختبار قريباً');
  };

  const filteredQuizzes = getFilteredQuizzes();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الاختبارات الإلكترونية</Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      {/* Filter Tabs */}
      {!isLoading && !error && quizzes.length > 0 && (
        <Animated.View style={[
          styles.filterContainer,
          { opacity: fadeAnim }
        ]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <TouchableOpacity
              style={[
                styles.filterTab,
                selectedFilter === 'all' && styles.filterTabActive
              ]}
              onPress={() => setSelectedFilter('all')}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === 'all' && styles.filterTabTextActive
              ]}>
                الكل ({quizzes.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                selectedFilter === QuizStatus.AVAILABLE && styles.filterTabActive
              ]}
              onPress={() => setSelectedFilter(QuizStatus.AVAILABLE)}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === QuizStatus.AVAILABLE && styles.filterTabTextActive
              ]}>
                متاح ({quizzes.filter(q => q.status === QuizStatus.AVAILABLE).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                selectedFilter === QuizStatus.COMPLETED && styles.filterTabActive
              ]}
              onPress={() => setSelectedFilter(QuizStatus.COMPLETED)}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === QuizStatus.COMPLETED && styles.filterTabTextActive
              ]}>
                مكتمل ({quizzes.filter(q => q.status === QuizStatus.COMPLETED).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                selectedFilter === QuizStatus.UPCOMING && styles.filterTabActive
              ]}
              onPress={() => setSelectedFilter(QuizStatus.UPCOMING)}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === QuizStatus.UPCOMING && styles.filterTabTextActive
              ]}>
                قريباً ({quizzes.filter(q => q.status === QuizStatus.UPCOMING).length})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      )}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading State */}
        {isLoading && (
          <Animated.View style={[
            styles.loadingContainer,
            { opacity: fadeAnim }
          ]}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>جاري تحميل الاختبارات...</Text>
          </Animated.View>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Animated.View style={[
            styles.errorContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <CustomButton
              title="إعادة المحاولة"
              onPress={loadQuizzes}
              variant="outline"
              size="medium"
            />
          </Animated.View>
        )}

        {/* Empty State */}
        {!isLoading && !error && quizzes.length === 0 && (
          <Animated.View style={[
            styles.emptyContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyTitle}>لا توجد اختبارات متاحة</Text>
            <Text style={styles.emptyDescription}>
              لا توجد اختبارات إلكترونية متاحة لك في الوقت الحالي
            </Text>
          </Animated.View>
        )}

        {/* Quizzes List */}
        {!isLoading && !error && filteredQuizzes.length > 0 && (
          <Animated.View style={[
            styles.quizzesContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            {filteredQuizzes.map((quiz, index) => (
              <TouchableOpacity
                key={quiz.id}
                style={styles.quizCard}
                onPress={() => handleQuizPress(quiz)}
                activeOpacity={0.7}
              >
                {/* Quiz Header */}
                <View style={styles.quizCardHeader}>
                  <View style={styles.quizTitleContainer}>
                    <Text style={styles.quizEmoji}>📝</Text>
                    <Text style={styles.quizTitle} numberOfLines={2}>
                      {quiz.title}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(quiz.status) + '20' }
                  ]}>
                    <Text style={styles.statusEmoji}>{getStatusIcon(quiz.status)}</Text>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(quiz.status) }
                    ]}>
                      {getStatusText(quiz.status)}
                    </Text>
                  </View>
                </View>

                {/* Course Info */}
                <View style={styles.courseInfo}>
                  <Text style={styles.courseLabel}>المقرر:</Text>
                  <Text style={styles.courseText}>
                    {quiz.trainingContent.name} ({quiz.trainingContent.code})
                  </Text>
                </View>

                {/* Quiz Info */}
                <View style={styles.quizInfo}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoIcon}>⏱️</Text>
                    <Text style={styles.infoText}>{quiz.duration} دقيقة</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoIcon}>❓</Text>
                    <Text style={styles.infoText}>{quiz._count.questions} سؤال</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoIcon}>🎯</Text>
                    <Text style={styles.infoText}>{quiz.passingScore}% نجاح</Text>
                  </View>
                </View>

                {/* Dates */}
                <View style={styles.datesContainer}>
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>من:</Text>
                    <Text style={styles.dateText}>{formatDate(quiz.startDate)}</Text>
                  </View>
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>إلى:</Text>
                    <Text style={styles.dateText}>{formatDate(quiz.endDate)}</Text>
                  </View>
                </View>

                {/* Result Badge (if completed) */}
                {quiz.status === QuizStatus.COMPLETED && quiz.result && (
                  <View style={[
                    styles.resultBadge,
                    { backgroundColor: quiz.result.passed ? Colors.success + '20' : Colors.error + '20' }
                  ]}>
                    <Text style={[
                      styles.resultText,
                      { color: quiz.result.passed ? Colors.success : Colors.error }
                    ]}>
                      {quiz.result.passed ? '✅ ناجح' : '❌ راسب'} • {quiz.result.percentage}%
                    </Text>
                  </View>
                )}

                {/* Action Hint */}
                {quiz.status === QuizStatus.AVAILABLE && quiz.canAttempt && (
                  <View style={styles.actionHint}>
                    <Text style={styles.actionHintText}>اضغط للبدء في الاختبار</Text>
                    <Text style={styles.actionHintArrow}>→</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* No Results for Filter */}
        {!isLoading && !error && quizzes.length > 0 && filteredQuizzes.length === 0 && (
          <Animated.View style={[
            styles.emptyContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>لا توجد نتائج</Text>
            <Text style={styles.emptyDescription}>
              لا توجد اختبارات تطابق الفلتر المحدد
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
  },
  filterScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  quizzesContainer: {
    gap: 16,
  },
  quizCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quizCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  quizTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  quizEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusEmoji: {
    fontSize: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  courseInfo: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  courseLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 6,
  },
  courseText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
  },
  quizInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
  },
  datesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  resultBadge: {
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  actionHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionHintText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  actionHintArrow: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: 'bold',
  },
});

export default ExamsScreen;
