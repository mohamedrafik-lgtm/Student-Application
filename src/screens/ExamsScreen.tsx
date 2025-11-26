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
import { AvailableQuiz, QuizStatus, QuizError, StartQuizResponse, QuizAttemptAnswer } from '../types/quizzes';

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
  
  // Quiz taking state
  const [quizAttempt, setQuizAttempt] = useState<StartQuizResponse | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAttemptAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [quizResult, setQuizResult] = useState<any | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    try {
      setIsLoading(true);
      console.log('🚀 Starting quiz:', quiz.id);
      
      const response = await quizService.startQuiz(quiz.id, accessToken);
      
      console.log('✅ Quiz started successfully:', response);
      
      // Set quiz attempt and start quiz taking mode
      setQuizAttempt(response);
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setSelectedAnswer(null);
      setTimeRemaining(response.quiz.duration * 60); // Convert to seconds
      
    } catch (error) {
      console.error('❌ Failed to start quiz:', error);
      const errorMessage = (error as any).message || 'فشل في بدء الاختبار';
      Alert.alert('خطأ', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAnswerSelect = async (optionId: number) => {
    if (!quizAttempt) return;
    
    setSelectedAnswer(optionId);
    
    // Save to local state immediately
    const currentQuestion = quizAttempt.quiz.questions[currentQuestionIndex];
    const newAnswer: QuizAttemptAnswer = {
      questionId: currentQuestion.question.id,
      selectedOptionId: optionId,
      answeredAt: new Date()
    };
    
    // Update or add answer
    const existingIndex = answers.findIndex(a => a.questionId === currentQuestion.question.id);
    if (existingIndex >= 0) {
      const newAnswers = [...answers];
      newAnswers[existingIndex] = newAnswer;
      setAnswers(newAnswers);
    } else {
      setAnswers([...answers, newAnswer]);
    }
    
    // Send answer to API immediately
    try {
      await quizService.answerQuestion({
        attemptId: quizAttempt.id,
        questionId: currentQuestion.question.id,
        selectedAnswer: optionId.toString()
      }, accessToken);
      
      console.log('✅ Answer saved successfully');
    } catch (error) {
      console.error('❌ Failed to save answer:', error);
      // Don't show error to user, just log it
    }
  };
  
  const handleNextQuestion = () => {
    if (!quizAttempt) return;
    
    // Save current answer
    if (selectedAnswer !== null) {
      const currentQuestion = quizAttempt.quiz.questions[currentQuestionIndex];
      const newAnswer: QuizAttemptAnswer = {
        questionId: currentQuestion.question.id,
        selectedOptionId: selectedAnswer,
        answeredAt: new Date()
      };
      
      // Update or add answer
      const existingIndex = answers.findIndex(a => a.questionId === currentQuestion.question.id);
      if (existingIndex >= 0) {
        const newAnswers = [...answers];
        newAnswers[existingIndex] = newAnswer;
        setAnswers(newAnswers);
      } else {
        setAnswers([...answers, newAnswer]);
      }
    }
    
    // Move to next question
    if (currentQuestionIndex < quizAttempt.quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
    }
  };
  
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      // Load previous answer if exists
      const prevQuestion = quizAttempt?.quiz.questions[currentQuestionIndex - 1];
      const prevAnswer = answers.find(a => a.questionId === prevQuestion?.question.id);
      setSelectedAnswer(prevAnswer?.selectedOptionId || null);
    }
  };
  
  const handleSubmitQuiz = () => {
    if (!quizAttempt) return;
    
    Alert.alert(
      'تسليم الاختبار',
      `هل أنت متأكد من تسليم الاختبار؟\n\nأجبت على ${answers.length} من ${quizAttempt.quiz.questions.length} سؤال`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تسليم',
          style: 'destructive',
          onPress: () => submitQuiz()
        }
      ]
    );
  };
  
  const submitQuiz = async () => {
    if (!quizAttempt) return;
    
    try {
      setIsLoading(true);
      
      console.log('📤 Submitting quiz:', {
        attemptId: quizAttempt.id,
        answers: answers.length
      });
      
      const result = await quizService.submitQuiz(quizAttempt.id, accessToken);
      
      console.log('✅ Quiz submitted successfully');
      
      // Show results screen
      setQuizResult(result);
      setQuizAttempt(null);
      
    } catch (error) {
      console.error('❌ Failed to submit quiz:', error);
      const errorMessage = (error as any).message || 'فشل في تسليم الاختبار';
      Alert.alert('خطأ', errorMessage.toString());
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExitQuiz = () => {
    Alert.alert(
      'الخروج من الاختبار',
      'هل أنت متأكد من الخروج؟ سيتم حفظ إجاباتك.',
      [
        { text: 'البقاء في الاختبار', style: 'cancel' },
        {
          text: 'الخروج',
          style: 'destructive',
          onPress: () => setQuizAttempt(null)
        }
      ]
    );
  };

  const filteredQuizzes = getFilteredQuizzes();

  // If quiz result is available, show results screen
  if (quizResult) {
    const isPassed = quizResult.passed === true;
    const scoreValue = typeof quizResult.score === 'number' ? quizResult.score : 0;
    const totalValue = typeof quizResult.totalPoints === 'number' ? quizResult.totalPoints : 0;
    const percentValue = typeof quizResult.percentage === 'number' ? quizResult.percentage : 0;
    const durationValue = typeof quizResult.duration === 'number' ? Math.floor(quizResult.duration / 60) : 0;
    
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.resultScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Result Icon */}
          <View style={[styles.resultIconContainer, { backgroundColor: isPassed ? Colors.successSoft : Colors.errorSoft }]}>
            <Text style={styles.resultIcon}>{isPassed ? '🎉' : '📝'}</Text>
          </View>

          {/* Result Title */}
          <Text style={styles.resultTitle}>نتيجة الاختبار</Text>
          
          <Text style={styles.resultSubtitle}>تم تسليم الاختبار بنجاح</Text>

          {/* Score Card */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scorePercentage}>{percentValue}%</Text>
              <Text style={styles.scoreLabel}>النسبة المئوية</Text>
            </View>
          </View>

          {/* Details Cards */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailCard}>
              <Text style={styles.detailIcon}>📊</Text>
              <Text style={styles.detailValue}>{scoreValue}/{totalValue}</Text>
              <Text style={styles.detailLabel}>الدرجة</Text>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailIcon}>🎯</Text>
              <Text style={styles.detailValue}>{quizResult.quiz?.passingScore || 0}%</Text>
              <Text style={styles.detailLabel}>درجة النجاح</Text>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailIcon}>⏱️</Text>
              <Text style={styles.detailValue}>{durationValue} دقيقة</Text>
              <Text style={styles.detailLabel}>الوقت المستغرق</Text>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailIcon}>❓</Text>
              <Text style={styles.detailValue}>{quizResult.answers?.length || 0}</Text>
              <Text style={styles.detailLabel}>عدد الأسئلة</Text>
            </View>
          </View>


          {/* Back Button */}
          <TouchableOpacity
            style={styles.backToListButton}
            onPress={() => {
              setQuizResult(null);
              loadQuizzes();
            }}
          >
            <Text style={styles.backToListButtonText}>← العودة للاختبارات</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // If quiz is in progress, show quiz taking UI
  if (quizAttempt) {
    const currentQuestion = quizAttempt.quiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quizAttempt.quiz.questions.length) * 100;
    
    return (
      <SafeAreaView style={styles.container}>
        {/* Quiz Header */}
        <View style={styles.quizHeader}>
          <TouchableOpacity style={styles.exitButton} onPress={handleExitQuiz}>
            <Text style={styles.exitButtonText}>✕ خروج</Text>
          </TouchableOpacity>
          <View style={styles.quizProgress}>
            <Text style={styles.quizProgressText}>
              السؤال {currentQuestionIndex + 1} من {quizAttempt.quiz.questions.length}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
          <Text style={styles.quizPoints}>{currentQuestion.points} نقطة</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.quizContent}>
          {/* Question */}
          <View style={styles.questionCard}>
            <Text style={styles.questionNumber}>السؤال {currentQuestion.order}</Text>
            <Text style={styles.questionText}>{currentQuestion.question.text}</Text>
            
            {currentQuestion.question.image && (
              <View style={styles.questionImageContainer}>
                <Text style={styles.questionImagePlaceholder}>🖼️ صورة</Text>
              </View>
            )}
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {currentQuestion.question.options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  selectedAnswer === option.id && styles.optionButtonSelected
                ]}
                onPress={() => handleAnswerSelect(option.id)}
              >
                <View style={[
                  styles.optionRadio,
                  selectedAnswer === option.id && styles.optionRadioSelected
                ]}>
                  {selectedAnswer === option.id && <View style={styles.optionRadioDot} />}
                </View>
                <Text style={[
                  styles.optionText,
                  selectedAnswer === option.id && styles.optionTextSelected
                ]}>
                  {option.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.quizFooter}>
          <TouchableOpacity
            style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
            onPress={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <Text style={styles.navButtonText}>← السابق</Text>
          </TouchableOpacity>

          {currentQuestionIndex < quizAttempt.quiz.questions.length - 1 ? (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonPrimary]}
              onPress={handleNextQuestion}
            >
              <Text style={[styles.navButtonText, styles.navButtonTextPrimary]}>التالي →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonSubmit]}
              onPress={handleSubmitQuiz}
            >
              <Text style={[styles.navButtonText, styles.navButtonTextSubmit]}>تسليم الاختبار ✓</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Show quiz list
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
            {filteredQuizzes.map((quiz) => (
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
  // Quiz Taking Styles
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  exitButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  exitButtonText: {
    color: Colors.error,
    fontWeight: '700',
    fontSize: 15,
  },
  quizProgress: {
    flex: 1,
    marginHorizontal: 20,
  },
  quizProgressText: {
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  quizPoints: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 16,
  },
  // Result Screen Styles
  resultScrollContent: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  resultIcon: {
    fontSize: 64,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    color: Colors.textPrimary,
  },
  resultSubtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  scoreCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  scoreCircle: {
    alignItems: 'center',
  },
  scorePercentage: {
    fontSize: 56,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  detailsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  detailCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  detailIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  statusBadgeLarge: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 32,
  },
  statusBadgeText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
  },
  backToListButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  backToListButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    paddingVertical: 10,
    borderRadius: 12,
  },
  quizContent: {
    padding: 24,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  questionNumber: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '800',
    marginBottom: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  questionText: {
    fontSize: 20,
    color: Colors.textPrimary,
    lineHeight: 32,
    textAlign: 'right',
    fontWeight: '600',
  },
  questionImageContainer: {
    marginTop: 20,
    padding: 50,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  questionImagePlaceholder: {
    fontSize: 56,
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  optionButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    elevation: 6,
  },
  optionRadio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#D1D5DB',
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  optionRadioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
  },
  optionText: {
    flex: 1,
    fontSize: 17,
    color: Colors.textPrimary,
    textAlign: 'right',
    lineHeight: 26,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  quizFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonPrimary: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    elevation: 6,
  },
  navButtonSubmit: {
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
    shadowOpacity: 0.4,
    elevation: 6,
  },
  navButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  navButtonTextPrimary: {
    color: Colors.white,
  },
  navButtonTextSubmit: {
    color: Colors.white,
  },
});

export default ExamsScreen;
