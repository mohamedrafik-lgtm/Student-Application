// SurveyScreen — الاستبيانات
// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles survey listing and answering
// 2. Open/Closed: Can be extended with new survey features without modification

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
import ScreenHeader from '../components/shared/ScreenHeader';
import { surveyService } from '../services/surveyService';
import { Survey, SurveyQuestion, SurveyError } from '../types/surveys';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ══════════════════════════════════ PROPS ══════════════════════════════════ */
interface Props {
  accessToken: string;
  onBack: () => void;
}

/* ══════════════════════════════════ HELPERS ══════════════════════════════════ */
const getDaysRemaining = (endDate: string): number => {
  return Math.ceil(
    (new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  );
};

const getDeadlineInfo = (endDate: string) => {
  const days = getDaysRemaining(endDate);
  if (days <= 0) {
    return { text: 'آخر يوم', color: '#E11D48', bgColor: '#FFF1F2' };
  }
  if (days <= 3) {
    return { text: `${days} يوم متبقي`, color: '#E11D48', bgColor: '#FFF1F2' };
  }
  return { text: `${days} يوم متبقي`, color: '#059669', bgColor: '#ECFDF5' };
};

const formatArabicDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/* ══════════════════════════════════ COMPONENT ══════════════════════════════════ */
const SurveyScreen: React.FC<Props> = ({ accessToken, onBack }) => {
  // ─── State ───
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Answer modal state
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ─── Derived ───
  const availableSurveys = surveys.filter(s => !s.isAnswered);
  const answeredSurveys = surveys.filter(s => s.isAnswered);

  // ─── Load surveys ───
  const loadSurveys = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setError(null);
        const data = await surveyService.getMySurveys(accessToken);
        setSurveys(data);
      } catch (err: any) {
        const apiError = err as SurveyError;
        setError(apiError.message || 'حدث خطأ في تحميل الاستبيانات');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // ─── Refresh ───
  const onRefresh = () => {
    setIsRefreshing(true);
    loadSurveys(true);
  };

  // ─── Open survey for answering ───
  const handleOpenSurvey = (survey: Survey) => {
    setSelectedSurvey(survey);
    setAnswers({});
  };

  // ─── Close answer modal ───
  const handleCloseModal = () => {
    setSelectedSurvey(null);
    setAnswers({});
  };

  // ─── Select an option ───
  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  // ─── Submit answers ───
  const handleSubmit = async () => {
    if (!selectedSurvey) return;

    const totalQuestions = selectedSurvey.questions.length;
    const answeredCount = Object.keys(answers).length;
    const remaining = totalQuestions - answeredCount;

    if (remaining > 0) {
      Alert.alert(
        'تنبيه',
        `يجب الإجابة على جميع الأسئلة (${remaining} سؤال متبقي)`,
        [{ text: 'حسناً' }],
      );
      return;
    }

    try {
      setSubmitting(true);
      const answersArray = Object.entries(answers).map(
        ([questionId, optionId]) => ({ questionId, optionId }),
      );

      await surveyService.submitSurvey(
        selectedSurvey.id,
        { answers: answersArray },
        accessToken,
      );

      Alert.alert('نجاح', 'تم إرسال إجاباتك بنجاح، شكراً لمشاركتك!', [
        { text: 'حسناً' },
      ]);

      setSelectedSurvey(null);
      setAnswers({});
      loadSurveys(true);
    } catch (err: any) {
      const apiError = err as SurveyError;
      Alert.alert(
        'خطأ',
        apiError.message || 'حدث خطأ في إرسال الإجابات',
        [{ text: 'حسناً' }],
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ═══════════════════════════════ RENDER HELPERS ═══════════════════════════════

  const renderStats = () => (
    <View style={st.statsRow}>
      <View style={[st.statCard, { backgroundColor: '#ECFDF5' }]}>
        <View style={[st.statIconCircle, { backgroundColor: '#D1FAE5' }]}>
          <Icon name={AppIcons.document} size={20} color="#059669" />
        </View>
        <Text style={[st.statValue, { color: '#059669' }]}>
          {availableSurveys.length}
        </Text>
        <Text style={st.statLabel}>استبيانات متاحة</Text>
      </View>
      <View style={[st.statCard, { backgroundColor: '#F0FDFA' }]}>
        <View style={[st.statIconCircle, { backgroundColor: '#CCFBF1' }]}>
          <Icon name={AppIcons.check} size={20} color="#0D9488" />
        </View>
        <Text style={[st.statValue, { color: '#0D9488' }]}>
          {answeredSurveys.length}
        </Text>
        <Text style={st.statLabel}>تمت الإجابة عليها</Text>
      </View>
    </View>
  );

  const renderAvailableSurveyCard = (survey: Survey) => {
    const deadline = getDeadlineInfo(survey.endDate);
    return (
      <TouchableOpacity
        key={survey.id}
        style={st.availableCard}
        activeOpacity={0.7}
        onPress={() => handleOpenSurvey(survey)}
      >
        {/* Header row */}
        <View style={st.cardHeaderRow}>
          <View style={st.cardTitleArea}>
            <Text style={st.cardTitle} numberOfLines={2}>
              {survey.title}
            </Text>
          </View>
          <View
            style={[st.deadlineBadge, { backgroundColor: deadline.bgColor }]}
          >
            <Icon name={AppIcons.time} size={12} color={deadline.color} />
            <Text style={[st.deadlineText, { color: deadline.color }]}>
              {deadline.text}
            </Text>
          </View>
        </View>

        {/* Description */}
        {survey.description ? (
          <Text style={st.cardDescription} numberOfLines={2}>
            {survey.description}
          </Text>
        ) : null}

        {/* Footer info */}
        <View style={st.cardFooter}>
          <View style={st.cardFooterItem}>
            <Icon name={AppIcons.document} size={14} color={Colors.textLight} />
            <Text style={st.cardFooterText}>
              {survey._count.questions} سؤال
            </Text>
          </View>
          <View style={st.cardFooterItem}>
            <Icon name={AppIcons.time} size={14} color={Colors.textLight} />
            <Text style={st.cardFooterText}>
              حتى {formatArabicDate(survey.endDate)}
            </Text>
          </View>
        </View>

        {/* Action hint */}
        <View style={st.cardAction}>
          <Text style={st.cardActionText}>اضغط للمشاركة</Text>
          <Icon name={AppIcons.back} size={14} color="#059669" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderAnsweredSurveyCard = (survey: Survey) => (
    <View key={survey.id} style={st.answeredCard}>
      <View style={st.answeredIconCircle}>
        <Icon name={AppIcons.check} size={20} color="#059669" />
      </View>
      <View style={st.answeredInfo}>
        <Text style={st.answeredTitle} numberOfLines={1}>
          {survey.title}
        </Text>
        <Text style={st.answeredMeta}>
          تمت الإجابة • {survey._count.questions} سؤال
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={st.emptyContainer}>
      <Text style={st.emptyIcon}>📋</Text>
      <Text style={st.emptyTitle}>لا توجد استبيانات متاحة حالياً</Text>
      <Text style={st.emptyDesc}>ستظهر الاستبيانات هنا عند توفرها</Text>
    </View>
  );

  const renderError = () => (
    <View style={st.emptyContainer}>
      <Text style={st.emptyIcon}>⚠️</Text>
      <Text style={st.emptyTitle}>حدث خطأ</Text>
      <Text style={st.emptyDesc}>{error}</Text>
      <TouchableOpacity
        style={st.retryButton}
        onPress={() => loadSurveys()}
        activeOpacity={0.7}
      >
        <Text style={st.retryText}>إعادة المحاولة</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={st.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={st.loadingText}>جاري تحميل الاستبيانات...</Text>
    </View>
  );

  // ═══════════════════════════════ ANSWER MODAL ═══════════════════════════════

  const renderAnswerModal = () => {
    if (!selectedSurvey) return null;

    const totalQuestions = selectedSurvey.questions.length;
    const answeredCount = Object.keys(answers).length;
    const sortedQuestions = [...selectedSurvey.questions].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );

    return (
      <Modal
        visible={!!selectedSurvey}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <View style={st.modalContainer}>
          {/* ── Modal Header (fixed) ── */}
          <View style={st.modalHeader}>
            <View style={st.modalHeaderContent}>
              <TouchableOpacity
                style={st.modalCloseBtn}
                onPress={handleCloseModal}
                activeOpacity={0.7}
              >
                <Icon name={AppIcons.close} size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
              <View style={st.modalTitleArea}>
                <Text style={st.modalTitle} numberOfLines={2}>
                  {selectedSurvey.title}
                </Text>
                {selectedSurvey.description ? (
                  <Text style={st.modalSubtitle} numberOfLines={2}>
                    {selectedSurvey.description}
                  </Text>
                ) : null}
              </View>
              {/* spacer to balance close button */}
              <View style={{ width: 38 }} />
            </View>
            {/* Progress bar */}
            <View style={st.progressBarBg}>
              <View
                style={[
                  st.progressBarFill,
                  {
                    width:
                      totalQuestions > 0
                        ? `${(answeredCount / totalQuestions) * 100}%`
                        : '0%',
                  },
                ]}
              />
            </View>
            <Text style={st.progressText}>
              {answeredCount} / {totalQuestions} سؤال مُجاب
            </Text>
          </View>

          {/* ── Questions (scrollable) ── */}
          <ScrollView
            style={st.modalScroll}
            contentContainerStyle={st.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {sortedQuestions.map((question, index) =>
              renderQuestion(question, index),
            )}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* ── Modal Footer (fixed) ── */}
          <View style={st.modalFooter}>
            <TouchableOpacity
              style={st.cancelButton}
              onPress={handleCloseModal}
              activeOpacity={0.7}
            >
              <Text style={st.cancelButtonText}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                st.submitButton,
                submitting && st.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              activeOpacity={0.7}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={st.submitButtonText}>جاري الإرسال...</Text>
                </>
              ) : (
                <Text style={st.submitButtonText}>
                  إرسال الإجابات ({answeredCount}/{totalQuestions})
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderQuestion = (question: SurveyQuestion, index: number) => {
    const sortedOptions = [...question.options].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const selectedOptionId = answers[question.id];

    return (
      <View key={question.id} style={st.questionCard}>
        {/* Question number + text */}
        <View style={st.questionHeader}>
          <View style={st.questionNumberBadge}>
            <Text style={st.questionNumberText}>{index + 1}</Text>
          </View>
          <Text style={st.questionText}>{question.text}</Text>
        </View>

        {/* Options */}
        <View style={st.optionsContainer}>
          {sortedOptions.map(option => {
            const isSelected = selectedOptionId === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  st.optionRow,
                  isSelected && st.optionRowSelected,
                ]}
                onPress={() => handleSelectOption(question.id, option.id)}
                activeOpacity={0.7}
              >
                {/* Radio circle */}
                <View
                  style={[
                    st.radioCircle,
                    isSelected && st.radioCircleSelected,
                  ]}
                >
                  {isSelected && <View style={st.radioInner} />}
                </View>
                <Text
                  style={[
                    st.optionText,
                    isSelected && st.optionTextSelected,
                  ]}
                >
                  {option.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ═══════════════════════════════ MAIN RENDER ═══════════════════════════════

  return (
    <View style={st.container}>
      <ScreenHeader
        title="الاستبيانات"
        subtitle="شاركنا رأيك لتحسين خدماتنا"
        onBack={onBack}
      />

      {loading ? (
        renderLoading()
      ) : error && surveys.length === 0 ? (
        <ScrollView
          contentContainerStyle={st.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
        >
          {renderError()}
        </ScrollView>
      ) : surveys.length === 0 ? (
        <ScrollView
          contentContainerStyle={st.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {renderEmptyState()}
          </Animated.View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Stats */}
            {renderStats()}

            {/* Available Surveys */}
            {availableSurveys.length > 0 && (
              <View style={st.section}>
                <View style={st.sectionHeader}>
                  <View style={[st.sectionDot, { backgroundColor: '#059669' }]} />
                  <Text style={st.sectionTitle}>
                    استبيانات متاحة ({availableSurveys.length})
                  </Text>
                </View>
                {availableSurveys.map(renderAvailableSurveyCard)}
              </View>
            )}

            {/* Answered Surveys */}
            {answeredSurveys.length > 0 && (
              <View style={st.section}>
                <View style={st.sectionHeader}>
                  <View style={[st.sectionDot, { backgroundColor: '#0D9488' }]} />
                  <Text style={st.sectionTitle}>
                    تمت الإجابة ({answeredSurveys.length})
                  </Text>
                </View>
                {answeredSurveys.map(renderAnsweredSurveyCard)}
              </View>
            )}
          </Animated.View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Answer Modal */}
      {renderAnswerModal()}
    </View>
  );
};

/* ══════════════════════════════════ STYLES ══════════════════════════════════ */
const st = StyleSheet.create({
  // ─── Container ───
  container: {
    flex: 1,
    backgroundColor: Colors.borderLight,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // ─── Loading ───
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // ─── Empty / Error ───
  emptyContainer: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // ─── Stats ───
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // ─── Sections ───
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'flex-end',
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
  },

  // ─── Available Survey Card ───
  availableCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleArea: {
    flex: 1,
    marginLeft: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
    lineHeight: 26,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  deadlineText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'right',
    lineHeight: 22,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginBottom: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cardFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardFooterText: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },

  // ─── Answered Survey Card ───
  answeredCard: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  answeredIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  answeredInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  answeredTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: 2,
  },
  answeredMeta: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'right',
  },

  // ═══ Modal ═══
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // ─── Modal Header ───
  modalHeader: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleArea: {
    flex: 1,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'right',
    lineHeight: 28,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 20,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    fontWeight: '600',
  },

  // ─── Modal Scroll ───
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
  },

  // ─── Question Card ───
  questionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    marginBottom: 14,
    gap: 10,
  },
  questionNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'right',
    lineHeight: 24,
  },

  // ─── Options ───
  optionsContainer: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  optionRowSelected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  radioCircleSelected: {
    borderColor: '#059669',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#059669',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'right',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#059669',
    fontWeight: '700',
  },

  // ─── Modal Footer ───
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default SurveyScreen;
