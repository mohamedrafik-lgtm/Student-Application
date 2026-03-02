import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {quizService} from '../services/quizService';
import {
  AvailableQuiz,
  QuizStatus,
  QuizError,
  StartQuizResponse,
  QuizAttemptAnswer,
} from '../types/quizzes';
import Icon from '../components/shared/Icon';
import ScreenHeader from '../components/shared/ScreenHeader';
import {Colors} from '../styles/colors';

interface ExamsScreenProps {
  accessToken: string;
  onBack: () => void;
}

const ExamsScreen: React.FC<ExamsScreenProps> = ({accessToken, onBack}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<AvailableQuiz[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | QuizStatus>(
    'all',
  );

  // Quiz taking state
  const [quizAttempt, setQuizAttempt] = useState<StartQuizResponse | null>(
    null,
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAttemptAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [quizResult, setQuizResult] = useState<any | null>(null);

  useEffect(() => {
    loadQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadQuizzes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Loading available quizzes...');
      const response = await quizService.getAvailableQuizzes(accessToken);
      console.log(
        'Quizzes loaded successfully!',
        response.quizzes?.length || 0,
      );

      if (response && response.quizzes && Array.isArray(response.quizzes)) {
        setQuizzes(response.quizzes);
      } else if (response && response.success === false) {
        const errorMessage =
          response.message || 'فشل في تحميل الاختبارات';
        setError(errorMessage);
        setQuizzes([]);
      } else {
        console.warn('Invalid response structure or no quizzes found');
        setQuizzes([]);
      }
    } catch (err) {
      console.error('Failed to load quizzes:', err);
      const apiError = err as QuizError;

      let errorMessage = 'حدث خطأ أثناء تحميل الاختبارات';
      if (apiError.statusCode === 401) {
        errorMessage =
          'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
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
    if (selectedFilter === 'all') return quizzes;
    return quizzes.filter(quiz => quiz.status === selectedFilter);
  };

  const getStatusColor = (status: QuizStatus) => {
    switch (status) {
      case QuizStatus.AVAILABLE:
        return Colors.primaryLight;
      case QuizStatus.COMPLETED:
        return Colors.info;
      case QuizStatus.UPCOMING:
        return Colors.accent;
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
        return 'check-circle';
      case QuizStatus.COMPLETED:
        return 'check-circle-outline';
      case QuizStatus.UPCOMING:
        return 'clock-outline';
      case QuizStatus.ENDED:
        return 'close-circle';
      default:
        return 'file-document-edit-outline';
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
          {text: 'إلغاء', style: 'cancel'},
          {text: 'بدء الاختبار', onPress: () => startQuiz(quiz)},
        ],
      );
    } else if (quiz.status === QuizStatus.COMPLETED && quiz.result) {
      Alert.alert(
        'نتيجة الاختبار',
        `الدرجة: ${quiz.result.score}\nالنسبة: ${quiz.result.percentage}%\n${quiz.result.passed ? 'ناجح' : 'راسب'}`,

        [{text: 'حسناً'}],
      );
    } else {
      Alert.alert(
        quiz.title,
        quiz.description || 'لا يمكن البدء في الاختبار حالياً',
        [{text: 'حسناً'}],
      );
    }
  };

  const startQuiz = async (quiz: AvailableQuiz) => {
    try {
      setIsLoading(true);
      console.log('Starting quiz:', quiz.id);
      const response = await quizService.startQuiz(quiz.id, accessToken);
      console.log('Quiz started successfully:', response);

      setQuizAttempt(response);
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setSelectedAnswer(null);
      setTimeRemaining(response.quiz.duration * 60);
    } catch (err) {
      console.error('Failed to start quiz:', err);
      const errorMessage =
        (err as any).message || 'فشل في بدء الاختبار';
      Alert.alert('خطأ', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = async (optionId: number) => {
    if (!quizAttempt) return;

    setSelectedAnswer(optionId);

    const currentQuestion =
      quizAttempt.quiz.questions[currentQuestionIndex];
    const newAnswer: QuizAttemptAnswer = {
      questionId: currentQuestion.question.id,
      selectedOptionId: optionId,
      answeredAt: new Date(),
    };

    const existingIndex = answers.findIndex(
      a => a.questionId === currentQuestion.question.id,
    );
    if (existingIndex >= 0) {
      const newAnswers = [...answers];
      newAnswers[existingIndex] = newAnswer;
      setAnswers(newAnswers);
    } else {
      setAnswers([...answers, newAnswer]);
    }

    try {
      await quizService.answerQuestion(
        {
          attemptId: quizAttempt.id,
          questionId: currentQuestion.question.id,
          selectedAnswer: optionId.toString(),
        },
        accessToken,
      );
      console.log('Answer saved successfully');
    } catch (err) {
      console.error('Failed to save answer:', err);
    }
  };

  const handleNextQuestion = () => {
    if (!quizAttempt) return;

    if (selectedAnswer !== null) {
      const currentQuestion =
        quizAttempt.quiz.questions[currentQuestionIndex];
      const newAnswer: QuizAttemptAnswer = {
        questionId: currentQuestion.question.id,
        selectedOptionId: selectedAnswer,
        answeredAt: new Date(),
      };

      const existingIndex = answers.findIndex(
        a => a.questionId === currentQuestion.question.id,
      );
      if (existingIndex >= 0) {
        const newAnswers = [...answers];
        newAnswers[existingIndex] = newAnswer;
        setAnswers(newAnswers);
      } else {
        setAnswers([...answers, newAnswer]);
      }
    }

    if (currentQuestionIndex < quizAttempt.quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const prevQuestion =
        quizAttempt?.quiz.questions[currentQuestionIndex - 1];
      const prevAnswer = answers.find(
        a => a.questionId === prevQuestion?.question.id,
      );
      setSelectedAnswer(prevAnswer?.selectedOptionId || null);
    }
  };

  const handleSubmitQuiz = () => {
    if (!quizAttempt) return;

    Alert.alert(
      'تسليم الاختبار',
      `هل أنت متأكد من تسليم الاختبار؟\n\nأجبت على ${answers.length} من ${quizAttempt.quiz.questions.length} سؤال`,
      [
        {text: 'إلغاء', style: 'cancel'},
        {text: 'تسليم', style: 'destructive', onPress: () => submitQuiz()},
      ],
    );
  };

  const submitQuiz = async () => {
    if (!quizAttempt) return;

    try {
      setIsLoading(true);
      console.log('Submitting quiz:', {
        attemptId: quizAttempt.id,
        answers: answers.length,
      });

      const result = await quizService.submitQuiz(
        quizAttempt.id,
        accessToken,
      );
      console.log('Quiz submitted successfully');

      setQuizResult(result);
      setQuizAttempt(null);
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      const errorMessage =
        (err as any).message || 'فشل في تسليم الاختبار';
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
        {text: 'البقاء في الاختبار', style: 'cancel'},
        {
          text: 'الخروج',
          style: 'destructive',
          onPress: () => setQuizAttempt(null),
        },
      ],
    );
  };

  const filteredQuizzes = getFilteredQuizzes();

  // ── Quiz Result Screen ──
  if (quizResult) {
    const isPassed = quizResult.passed === true;
    const scoreValue =
      typeof quizResult.score === 'number' ? quizResult.score : 0;
    const totalValue =
      typeof quizResult.totalPoints === 'number'
        ? quizResult.totalPoints
        : 0;
    const percentValue =
      typeof quizResult.percentage === 'number'
        ? quizResult.percentage
        : 0;
    const durationValue =
      typeof quizResult.duration === 'number'
        ? Math.floor(quizResult.duration / 60)
        : 0;

    return (
      <SafeAreaView style={s.container}>
        <ScrollView
          contentContainerStyle={s.resultScroll}
          showsVerticalScrollIndicator={false}>
          {/* Result Icon */}
          <View
            style={[
              s.resultIconBox,
              {backgroundColor: isPassed ? Colors.primary100 : Colors.errorLight},
            ]}>
            <Icon name={isPassed ? 'party-popper' : 'file-document-edit-outline'} size={52} color={isPassed ? Colors.primaryLight : Colors.accent} />
          </View>

          <Text style={s.resultTitle}>نتيجة الاختبار</Text>
          <Text style={s.resultSub}>تم تسليم الاختبار بنجاح</Text>

          {/* Score Card */}
          <View style={s.scoreCard}>
            <Text style={s.scorePct}>{percentValue}%</Text>
            <Text style={s.scoreLabel}>النسبة المئوية</Text>
          </View>

          {/* Details Grid */}
          <View style={s.detailsGrid}>
            <View style={s.detailItem}>
              <Icon name="chart-bar" size={28} color={Colors.primary} />
              <Text style={s.detailValue}>
                {scoreValue}/{totalValue}
              </Text>
              <Text style={s.detailLabel}>الدرجة</Text>
            </View>
            <View style={s.detailItem}>
              <Icon name="target" size={28} color={Colors.primary} />
              <Text style={s.detailValue}>
                {quizResult.quiz?.passingScore || 0}%
              </Text>
              <Text style={s.detailLabel}>درجة النجاح</Text>
            </View>
            <View style={s.detailItem}>
              <Icon name="clock-outline" size={28} color={Colors.primary} />
              <Text style={s.detailValue}>{durationValue} دقيقة</Text>
              <Text style={s.detailLabel}>الوقت المستغرق</Text>
            </View>
            <View style={s.detailItem}>
              <Icon name="help-circle-outline" size={28} color={Colors.primary} />
              <Text style={s.detailValue}>
                {quizResult.answers?.length || 0}
              </Text>
              <Text style={s.detailLabel}>عدد الأسئلة</Text>
            </View>
          </View>

          {/* Back Button */}
          <TouchableOpacity
            style={s.resultBackBtn}
            onPress={() => {
              setQuizResult(null);
              loadQuizzes();
            }}>
            <Text style={s.resultBackBtnText}>← العودة للاختبارات</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Quiz Taking Screen ──
  if (quizAttempt) {
    const currentQuestion =
      quizAttempt.quiz.questions[currentQuestionIndex];
    const progress =
      ((currentQuestionIndex + 1) / quizAttempt.quiz.questions.length) * 100;

    return (
      <SafeAreaView style={s.container}>
        {/* Quiz Header */}
        <View style={s.quizHeader}>
          <TouchableOpacity style={s.exitBtn} onPress={handleExitQuiz}>
            <Text style={s.exitBtnText}>✕ خروج</Text>
          </TouchableOpacity>
          <View style={s.quizProgressBox}>
            <Text style={s.quizProgressText}>
              السؤال {currentQuestionIndex + 1} من{' '}
              {quizAttempt.quiz.questions.length}
            </Text>
            <View style={s.progressBarBg}>
              <View
                style={[s.progressBarFill, {width: `${progress}%`}]}
              />
            </View>
          </View>
          <Text style={s.quizPoints}>{currentQuestion.points} نقطة</Text>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.quizContent}>
          {/* Question */}
          <View style={s.questionCard}>
            <View style={s.questionNumBadge}>
              <Text style={s.questionNumText}>
                السؤال {currentQuestion.order}
              </Text>
            </View>
            <Text style={s.questionText}>
              {currentQuestion.question.text}
            </Text>
            {currentQuestion.question.image && (
              <View style={s.questionImgBox}>
                <Icon name="image-outline" size={48} color={Colors.primary} />
                <Text style={s.questionImgPlaceholder}>صورة</Text>
              </View>
            )}
          </View>

          {/* Options */}
          <View style={s.optionsBox}>
            {currentQuestion.question.options.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  s.optionBtn,
                  selectedAnswer === option.id && s.optionBtnSelected,
                ]}
                onPress={() => handleAnswerSelect(option.id)}>
                <View
                  style={[
                    s.optionRadio,
                    selectedAnswer === option.id && s.optionRadioSelected,
                  ]}>
                  {selectedAnswer === option.id && (
                    <View style={s.optionRadioDot} />
                  )}
                </View>
                <Text
                  style={[
                    s.optionText,
                    selectedAnswer === option.id && s.optionTextSelected,
                  ]}>
                  {option.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={s.quizFooter}>
          <TouchableOpacity
            style={[
              s.navBtn,
              currentQuestionIndex === 0 && s.navBtnDisabled,
            ]}
            onPress={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}>
            <Text style={s.navBtnText}>← السابق</Text>
          </TouchableOpacity>

          {currentQuestionIndex <
          quizAttempt.quiz.questions.length - 1 ? (
            <TouchableOpacity
              style={[s.navBtn, s.navBtnPrimary]}
              onPress={handleNextQuestion}>
              <Text style={[s.navBtnText, s.navBtnTextLight]}>
                التالي →
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.navBtn, s.navBtnSubmit]}
              onPress={handleSubmitQuiz}>
              <Text style={[s.navBtnText, s.navBtnTextLight]}>
                تسليم الاختبار ✓
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Quiz List Screen ──
  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Text style={s.backArrow}>→</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>الاختبارات الإلكترونية</Text>
        </View>
        <View style={{width: 38}} />
      </View>

      {/* Filter Tabs */}
      {!isLoading && !error && quizzes.length > 0 && (
        <View style={s.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterContent}>
            <TouchableOpacity
              style={[
                s.filterChip,
                selectedFilter === 'all' && s.filterChipActive,
              ]}
              onPress={() => setSelectedFilter('all')}>
              <Text
                style={[
                  s.filterChipText,
                  selectedFilter === 'all' && s.filterChipTextActive,
                ]}>
                الكل ({quizzes.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.filterChip,
                selectedFilter === QuizStatus.AVAILABLE &&
                  s.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(QuizStatus.AVAILABLE)}>
              <Text
                style={[
                  s.filterChipText,
                  selectedFilter === QuizStatus.AVAILABLE &&
                    s.filterChipTextActive,
                ]}>
                متاح (
                {
                  quizzes.filter(q => q.status === QuizStatus.AVAILABLE)
                    .length
                }
                )
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.filterChip,
                selectedFilter === QuizStatus.COMPLETED &&
                  s.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(QuizStatus.COMPLETED)}>
              <Text
                style={[
                  s.filterChipText,
                  selectedFilter === QuizStatus.COMPLETED &&
                    s.filterChipTextActive,
                ]}>
                مكتمل (
                {
                  quizzes.filter(q => q.status === QuizStatus.COMPLETED)
                    .length
                }
                )
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.filterChip,
                selectedFilter === QuizStatus.UPCOMING &&
                  s.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(QuizStatus.UPCOMING)}>
              <Text
                style={[
                  s.filterChipText,
                  selectedFilter === QuizStatus.UPCOMING &&
                    s.filterChipTextActive,
                ]}>
                قريباً (
                {
                  quizzes.filter(q => q.status === QuizStatus.UPCOMING)
                    .length
                }
                )
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Loading */}
        {isLoading && (
          <View style={s.centerBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={s.loadingText}>جاري تحميل الاختبارات...</Text>
          </View>
        )}

        {/* Error */}
        {error && !isLoading && (
          <View style={s.centerBox}>
            <Icon name="alert-circle-outline" size={56} color="#F59E0B" />
            <Text style={s.errorMsg}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={loadQuizzes}>
              <Text style={s.retryBtnText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty */}
        {!isLoading && !error && quizzes.length === 0 && (
          <View style={s.centerBox}>
            <Icon name="file-document-edit-outline" size={56} color={Colors.primary} />
            <Text style={s.emptyTitle}>لا توجد اختبارات متاحة</Text>
            <Text style={s.emptyMsg}>
              لا توجد اختبارات إلكترونية متاحة لك في الوقت الحالي
            </Text>
          </View>
        )}

        {/* Quiz Cards */}
        {!isLoading && !error && filteredQuizzes.length > 0 && (
          <View style={s.quizList}>
            {filteredQuizzes.map(quiz => (
              <TouchableOpacity
                key={quiz.id}
                style={s.quizCard}
                onPress={() => handleQuizPress(quiz)}
                activeOpacity={0.7}>
                {/* Card Header */}
                <View style={s.quizCardHeader}>
                  <View style={s.quizTitleRow}>
                    <Icon name="file-document-edit-outline" size={22} color={Colors.primary} />
                    <Text style={s.quizTitle} numberOfLines={2}>
                      {quiz.title}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.statusBadge,
                      {
                        backgroundColor:
                          getStatusColor(quiz.status) + '18',
                      },
                    ]}>
                    <Icon name={getStatusIcon(quiz.status)} size={11} color={getStatusColor(quiz.status)} />
                    <Text
                      style={[
                        s.statusText,
                        {color: getStatusColor(quiz.status)},
                      ]}>
                      {getStatusText(quiz.status)}
                    </Text>
                  </View>
                </View>

                {/* Course */}
                <View style={s.courseRow}>
                  <Text style={s.courseLabel}>المقرر:</Text>
                  <Text style={s.courseText} numberOfLines={1}>
                    {quiz.trainingContent.name} (
                    {quiz.trainingContent.code})
                  </Text>
                </View>

                {/* Info Row */}
                <View style={s.infoRow}>
                  <View style={s.infoItem}>
                    <Icon name="clock-outline" size={14} color={Colors.primary} />
                    <Text style={s.infoText}>{quiz.duration} دقيقة</Text>
                  </View>
                  <View style={s.infoItem}>
                    <Icon name="help-circle-outline" size={14} color={Colors.primary} />
                    <Text style={s.infoText}>
                      {quiz._count.questions} سؤال
                    </Text>
                  </View>
                  <View style={s.infoItem}>
                    <Icon name="target" size={14} color={Colors.primary} />
                    <Text style={s.infoText}>
                      {quiz.passingScore}% نجاح
                    </Text>
                  </View>
                </View>

                {/* Dates */}
                <View style={s.datesRow}>
                  <View style={s.dateItem}>
                    <Text style={s.dateLabel}>من:</Text>
                    <Text style={s.dateText}>
                      {formatDate(quiz.startDate)}
                    </Text>
                  </View>
                  <View style={s.dateItem}>
                    <Text style={s.dateLabel}>إلى:</Text>
                    <Text style={s.dateText}>
                      {formatDate(quiz.endDate)}
                    </Text>
                  </View>
                </View>

                {/* Result Badge */}
                {quiz.status === QuizStatus.COMPLETED && quiz.result && (
                  <View
                    style={[
                      s.resultBadge,
                      {
                        backgroundColor: quiz.result.passed
                          ? Colors.primary100
                          : Colors.errorLight,
                      },
                    ]}>
                    <Text
                      style={[
                        s.resultBadgeText,
                        {
                          color: quiz.result.passed
                            ? Colors.primaryLight
                            : Colors.error,
                        },
                      ]}>
                      <Icon name={quiz.result.passed ? 'check-circle' : 'close-circle'} size={14} color={quiz.result.passed ? Colors.primaryLight : Colors.error} />{' '}
                      {quiz.result.passed ? 'ناجح' : 'راسب'} •{' '}
                      {quiz.result.percentage}%
                    </Text>
                  </View>
                )}

                {/* Action Hint */}
                {quiz.status === QuizStatus.AVAILABLE &&
                  quiz.canAttempt && (
                    <View style={s.actionHint}>
                      <Text style={s.actionHintText}>
                        اضغط للبدء في الاختبار
                      </Text>
                      <Text style={s.actionHintArrow}>→</Text>
                    </View>
                  )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No filter results */}
        {!isLoading &&
          !error &&
          quizzes.length > 0 &&
          filteredQuizzes.length === 0 && (
            <View style={s.centerBox}>
              <Icon name="magnify" size={56} color={Colors.primary} />
              <Text style={s.emptyTitle}>لا توجد نتائج</Text>
              <Text style={s.emptyMsg}>
                لا توجد اختبارات تطابق الفلتر المحدد
              </Text>
            </View>
          )}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textLight,
  },
  errorEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  errorMsg: {
    fontSize: 15,
    color: Colors.error,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMsg: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },

  /* Header - replaced by ScreenHeader */
  header: { display: 'none' as any },
  backBtn: { display: 'none' as any },
  backArrow: { fontSize: 0 },
  headerCenter: { display: 'none' as any },
  headerTitle: { fontSize: 0 },

  /* Filter */
  filterRow: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingVertical: 12,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textLight,
  },
  filterChipTextActive: {
    color: '#FFF',
  },

  /* Quiz List */
  quizList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  quizCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  quizCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  quizTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 8,
  },
  quizEmoji: {
    fontSize: 22,
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  statusIcon: {
    fontSize: 11,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  courseRow: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  courseLabel: {
    fontSize: 13,
    color: Colors.textLight,
    marginRight: 6,
  },
  courseText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  infoRow: {
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
    fontSize: 14,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginBottom: 4,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  resultBadge: {
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  resultBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  actionHintText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  actionHintArrow: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },

  /* Quiz Taking */
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  exitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.errorLight,
    borderRadius: 10,
  },
  exitBtnText: {
    color: Colors.error,
    fontWeight: '700',
    fontSize: 14,
  },
  quizProgressBox: {
    flex: 1,
    marginHorizontal: 16,
  },
  quizProgressText: {
    fontSize: 13,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  quizPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.backgroundSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quizContent: {
    padding: 20,
  },
  questionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  questionNumBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  questionNumText: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '700',
  },
  questionText: {
    fontSize: 17,
    color: Colors.textPrimary,
    lineHeight: 28,
    textAlign: 'right',
    fontWeight: '600',
  },
  questionImgBox: {
    marginTop: 16,
    padding: 40,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
  },
  questionImgPlaceholder: {
    fontSize: 48,
  },
  optionsBox: {
    gap: 12,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  optionBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.backgroundSoft,
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.borderDark,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    borderColor: Colors.primary,
  },
  optionRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: 'right',
    lineHeight: 24,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },

  /* Quiz Footer */
  quizFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 12,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.backgroundAlt,
    alignItems: 'center',
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnPrimary: {
    backgroundColor: Colors.primary,
  },
  navBtnSubmit: {
    backgroundColor: Colors.primaryLight,
  },
  navBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  navBtnTextLight: {
    color: '#FFF',
  },

  /* Result Screen */
  resultScroll: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  resultIcon: {
    fontSize: 52,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  resultSub: {
    fontSize: 15,
    color: Colors.textLight,
    marginBottom: 28,
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  scorePct: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 6,
  },
  scoreLabel: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '600',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
    width: '100%',
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  detailEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  resultBackBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  resultBackBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default ExamsScreen;
