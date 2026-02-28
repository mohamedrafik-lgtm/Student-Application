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

      console.log('🔍 Loading available quizzes...');
      const response = await quizService.getAvailableQuizzes(accessToken);
      console.log(
        '✅ Quizzes loaded successfully!',
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
        console.warn('⚠️ Invalid response structure or no quizzes found');
        setQuizzes([]);
      }
    } catch (err) {
      console.error('❌ Failed to load quizzes:', err);
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
        return '#10B981';
      case QuizStatus.COMPLETED:
        return '#3B82F6';
      case QuizStatus.UPCOMING:
        return '#F59E0B';
      case QuizStatus.ENDED:
        return '#EF4444';
      default:
        return '#8E95A2';
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
          {text: 'إلغاء', style: 'cancel'},
          {text: 'بدء الاختبار', onPress: () => startQuiz(quiz)},
        ],
      );
    } else if (quiz.status === QuizStatus.COMPLETED && quiz.result) {
      Alert.alert(
        'نتيجة الاختبار',
        `الدرجة: ${quiz.result.score}\nالنسبة: ${quiz.result.percentage}%\n${quiz.result.passed ? '✅ ناجح' : '❌ راسب'}`,
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
      console.log('🚀 Starting quiz:', quiz.id);
      const response = await quizService.startQuiz(quiz.id, accessToken);
      console.log('✅ Quiz started successfully:', response);

      setQuizAttempt(response);
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setSelectedAnswer(null);
      setTimeRemaining(response.quiz.duration * 60);
    } catch (err) {
      console.error('❌ Failed to start quiz:', err);
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
      console.log('✅ Answer saved successfully');
    } catch (err) {
      console.error('❌ Failed to save answer:', err);
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
      console.log('📤 Submitting quiz:', {
        attemptId: quizAttempt.id,
        answers: answers.length,
      });

      const result = await quizService.submitQuiz(
        quizAttempt.id,
        accessToken,
      );
      console.log('✅ Quiz submitted successfully');

      setQuizResult(result);
      setQuizAttempt(null);
    } catch (err) {
      console.error('❌ Failed to submit quiz:', err);
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
              {backgroundColor: isPassed ? '#D1FAE5' : '#FEE2E2'},
            ]}>
            <Text style={s.resultIcon}>{isPassed ? '🎉' : '📝'}</Text>
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
              <Text style={s.detailEmoji}>📊</Text>
              <Text style={s.detailValue}>
                {scoreValue}/{totalValue}
              </Text>
              <Text style={s.detailLabel}>الدرجة</Text>
            </View>
            <View style={s.detailItem}>
              <Text style={s.detailEmoji}>🎯</Text>
              <Text style={s.detailValue}>
                {quizResult.quiz?.passingScore || 0}%
              </Text>
              <Text style={s.detailLabel}>درجة النجاح</Text>
            </View>
            <View style={s.detailItem}>
              <Text style={s.detailEmoji}>⏱️</Text>
              <Text style={s.detailValue}>{durationValue} دقيقة</Text>
              <Text style={s.detailLabel}>الوقت المستغرق</Text>
            </View>
            <View style={s.detailItem}>
              <Text style={s.detailEmoji}>❓</Text>
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
                <Text style={s.questionImgPlaceholder}>🖼️ صورة</Text>
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
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={s.loadingText}>جاري تحميل الاختبارات...</Text>
          </View>
        )}

        {/* Error */}
        {error && !isLoading && (
          <View style={s.centerBox}>
            <Text style={s.errorEmoji}>⚠️</Text>
            <Text style={s.errorMsg}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={loadQuizzes}>
              <Text style={s.retryBtnText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty */}
        {!isLoading && !error && quizzes.length === 0 && (
          <View style={s.centerBox}>
            <Text style={s.emptyEmoji}>📝</Text>
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
                    <Text style={s.quizEmoji}>📝</Text>
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
                    <Text style={s.statusIcon}>
                      {getStatusIcon(quiz.status)}
                    </Text>
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
                    <Text style={s.infoIcon}>⏱️</Text>
                    <Text style={s.infoText}>{quiz.duration} دقيقة</Text>
                  </View>
                  <View style={s.infoItem}>
                    <Text style={s.infoIcon}>❓</Text>
                    <Text style={s.infoText}>
                      {quiz._count.questions} سؤال
                    </Text>
                  </View>
                  <View style={s.infoItem}>
                    <Text style={s.infoIcon}>🎯</Text>
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
                          ? '#D1FAE5'
                          : '#FEE2E2',
                      },
                    ]}>
                    <Text
                      style={[
                        s.resultBadgeText,
                        {
                          color: quiz.result.passed
                            ? '#10B981'
                            : '#EF4444',
                        },
                      ]}>
                      {quiz.result.passed ? '✅ ناجح' : '❌ راسب'} •{' '}
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
              <Text style={s.emptyEmoji}>🔍</Text>
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
    backgroundColor: '#F4F6FA',
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
    color: '#8E95A2',
  },
  errorEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  errorMsg: {
    fontSize: 15,
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: '#2563EB',
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
    color: '#1A1D26',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMsg: {
    fontSize: 14,
    color: '#8E95A2',
    textAlign: 'center',
    lineHeight: 22,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: '#2563EB',
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1D26',
  },

  /* Filter */
  filterRow: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    paddingVertical: 12,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F4F6FA',
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E95A2',
  },
  filterChipTextActive: {
    color: '#FFF',
  },

  /* Quiz List */
  quizList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  quizCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
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
    color: '#1A1D26',
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
    color: '#8E95A2',
    marginRight: 6,
  },
  courseText: {
    fontSize: 13,
    color: '#1A1D26',
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
    color: '#8E95A2',
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    marginBottom: 4,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: '#8E95A2',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#1A1D26',
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
    borderTopColor: '#EEF2F6',
  },
  actionHintText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  actionHintArrow: {
    fontSize: 16,
    color: '#2563EB',
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
    borderBottomColor: '#EEF2F6',
  },
  exitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
  },
  exitBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 14,
  },
  quizProgressBox: {
    flex: 1,
    marginHorizontal: 16,
  },
  quizProgressText: {
    fontSize: 13,
    color: '#1A1D26',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#EEF2F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  quizPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#F0F4FF',
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
    borderColor: '#EEF2F6',
  },
  questionNumBadge: {
    backgroundColor: '#2563EB',
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
    color: '#1A1D26',
    lineHeight: 28,
    textAlign: 'right',
    fontWeight: '600',
  },
  questionImgBox: {
    marginTop: 16,
    padding: 40,
    backgroundColor: '#F4F6FA',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF2F6',
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
    borderColor: '#EEF2F6',
  },
  optionBtnSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F4FF',
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    borderColor: '#2563EB',
  },
  optionRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: '#1A1D26',
    textAlign: 'right',
    lineHeight: 24,
  },
  optionTextSelected: {
    color: '#2563EB',
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
    borderTopColor: '#EEF2F6',
    gap: 12,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F4F6FA',
    alignItems: 'center',
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnPrimary: {
    backgroundColor: '#2563EB',
  },
  navBtnSubmit: {
    backgroundColor: '#10B981',
  },
  navBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1D26',
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
    color: '#1A1D26',
    marginBottom: 6,
    textAlign: 'center',
  },
  resultSub: {
    fontSize: 15,
    color: '#8E95A2',
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
    borderColor: '#EEF2F6',
  },
  scorePct: {
    fontSize: 48,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 6,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#8E95A2',
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
    borderColor: '#EEF2F6',
  },
  detailEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1D26',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#8E95A2',
  },
  resultBackBtn: {
    backgroundColor: '#2563EB',
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
