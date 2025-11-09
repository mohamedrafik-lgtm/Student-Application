// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles grades display and navigation
// 2. Open/Closed: Can be extended with new grade types without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for grades
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
import { gradesService } from '../services/gradesService';
import { 
  GradesResponse, 
  ClassroomWithContents, 
  ContentWithGrades,
  GradeType,
  GRADE_TYPE_INFO,
  GradesError 
} from '../types/grades';

const { width, height } = Dimensions.get('window');

interface GradesScreenProps {
  accessToken: string;
  onBack: () => void;
}

const GradesScreen: React.FC<GradesScreenProps> = ({ 
  accessToken, 
  onBack 
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gradesData, setGradesData] = useState<GradesResponse | null>(null);
  const [expandedClassroom, setExpandedClassroom] = useState<number | null>(null);
  const [expandedContent, setExpandedContent] = useState<number | null>(null);

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

    // Load grades data
    loadGrades();
  }, []);

  const loadGrades = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Loading grades...');
      
      const response = await gradesService.getMyGrades(accessToken);
      
      console.log('✅ Grades loaded successfully!');
      console.log('📊 Response structure:', {
        success: response.success,
        hasData: !!response.data,
        traineeName: response.data?.trainee?.nameAr,
        overallPercentage: response.data?.overallStats?.percentage,
        classroomsCount: response.data?.classrooms?.length || 0
      });
      
      // التحقق من وجود البيانات قبل التعيين
      if (response.success && response.data) {
        setGradesData(response.data);
      } else if (response.success === false) {
        // إذا كان response.success = false، عرض رسالة الخطأ من الـ API
        const errorMessage = response.message || 'فشل في تحميل الدرجات';
        setError(errorMessage);
        setGradesData(null);
      } else {
        console.warn('⚠️ Invalid response structure or no grades found');
        setGradesData(null);
      }

    } catch (error) {
      console.error('❌ Failed to load grades:', error);
      const apiError = error as GradesError;
      
      let errorMessage = 'حدث خطأ أثناء تحميل الدرجات';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      } else if (apiError.statusCode === 404) {
        errorMessage = 'لم يتم العثور على درجات';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return '#10B981'; // أخضر
    if (percentage >= 80) return '#3B82F6'; // أزرق
    if (percentage >= 70) return '#F59E0B'; // برتقالي
    if (percentage >= 60) return '#EF4444'; // أحمر
    return '#6B7280'; // رمادي
  };

  const getGradeStatus = (percentage: number) => {
    if (percentage >= 90) return 'ممتاز';
    if (percentage >= 80) return 'جيد جداً';
    if (percentage >= 70) return 'جيد';
    if (percentage >= 60) return 'مقبول';
    return 'راسب';
  };

  const formatGrade = (earned: number, max: number) => {
    if (max === 0) return '0/0';
    return `${earned}/${max}`;
  };

  const toggleClassroom = (classroomId: number) => {
    setExpandedClassroom(expandedClassroom === classroomId ? null : classroomId);
    setExpandedContent(null); // إغلاق أي محتوى مفتوح
  };

  const toggleContent = (contentId: number) => {
    setExpandedContent(expandedContent === contentId ? null : contentId);
  };

  const renderProgressBar = (percentage: number, color: string) => {
    const progressWidth = Math.min(Math.max(percentage, 0), 100);
    
    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressWidth}%`,
                backgroundColor: color,
              }
            ]}
          />
        </View>
      </View>
    );
  };

  const renderGradeBreakdown = (content: ContentWithGrades) => {
    const gradeTypes = [
      GradeType.YEAR_WORK,
      GradeType.PRACTICAL,
      GradeType.WRITTEN,
      GradeType.ATTENDANCE,
      GradeType.QUIZZES,
      GradeType.FINAL_EXAM,
    ];

    return (
      <View style={styles.gradeBreakdown}>
        <View style={styles.breakdownHeader}>
          <Text style={styles.breakdownTitle}>تفاصيل الدرجات</Text>
          <View style={styles.breakdownDivider} />
        </View>
        <View style={styles.gradeTypesContainer}>
          {gradeTypes.map((gradeType, index) => {
            const typeInfo = GRADE_TYPE_INFO[gradeType];
            const earned = content.grades[gradeType];
            const max = content.maxMarks[gradeType];
            const percentage = max > 0 ? (earned / max) * 100 : 0;
            const color = getGradeColor(percentage);

            return (
              <View key={gradeType} style={styles.gradeTypeCard}>
                <View style={styles.gradeTypeHeader}>
                  <View style={[styles.gradeTypeIconContainer, { backgroundColor: color + '15' }]}>
                    <Text style={styles.gradeTypeIcon}>{typeInfo.icon}</Text>
                  </View>
                  <View style={styles.gradeTypeInfo}>
                    <Text style={styles.gradeTypeLabel}>{typeInfo.labelAr}</Text>
                    <Text style={styles.gradeTypeMarks}>
                      {formatGrade(earned, max)}
                    </Text>
                  </View>
                  <View style={styles.gradeTypePercentageContainer}>
                    <Text style={[
                      styles.gradeTypePercentage,
                      { color: color }
                    ]}>
                      {percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                {max > 0 && renderProgressBar(percentage, color)}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderContentCard = (content: ContentWithGrades, classroomId: number) => {
    const isExpanded = expandedContent === content.content.id;
    const gradeColor = getGradeColor(content.percentage);
    
    return (
      <TouchableOpacity
        key={content.content.id}
        style={[styles.contentCard, isExpanded && styles.contentCardExpanded]}
        onPress={() => toggleContent(content.content.id)}
        activeOpacity={0.8}
      >
        {/* Content Header with Gradient Effect */}
        <View style={[styles.contentHeader, { borderLeftColor: gradeColor }]}>
          <View style={styles.contentInfo}>
            <View style={styles.contentCodeContainer}>
              <Text style={styles.contentCode}>{content.content.code}</Text>
            </View>
            <Text style={styles.contentName} numberOfLines={2}>
              {content.content.name}
            </Text>
          </View>
          <View style={styles.contentGradeContainer}>
            <View style={[styles.contentPercentageCircle, { borderColor: gradeColor }]}>
              <Text style={[
                styles.contentPercentage,
                { color: gradeColor }
              ]}>
                {content.percentage.toFixed(0)}%
              </Text>
            </View>
            <Text style={styles.contentTotal}>
              {formatGrade(content.grades.totalMarks, content.maxMarks.total)}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.contentProgressContainer}>
          {renderProgressBar(content.percentage, gradeColor)}
        </View>

        {/* Grade Status and Expand */}
        <View style={styles.gradeStatusContainer}>
          <View style={[
            styles.gradeStatusBadge,
            { backgroundColor: gradeColor + '15', borderColor: gradeColor + '40' }
          ]}>
            <View style={[styles.gradeStatusDot, { backgroundColor: gradeColor }]} />
            <Text style={[
              styles.gradeStatusText,
              { color: gradeColor }
            ]}>
              {getGradeStatus(content.percentage)}
            </Text>
          </View>
          <View style={[styles.expandButton, isExpanded && styles.expandButtonActive]}>
            <Text style={styles.expandIcon}>
              {isExpanded ? '▲' : '▼'}
            </Text>
          </View>
        </View>

        {/* Expanded Details with Animation */}
        {isExpanded && (
          <Animated.View 
            style={[
              styles.expandedContent,
              { opacity: fadeAnim }
            ]}
          >
            {renderGradeBreakdown(content)}
          </Animated.View>
        )}
      </TouchableOpacity>
    );
  };

  const renderClassroomCard = (classroomData: ClassroomWithContents) => {
    const isExpanded = expandedClassroom === classroomData.classroom.id;
    const gradeColor = getGradeColor(classroomData.stats.percentage);
    
    return (
      <View key={classroomData.classroom.id} style={[styles.classroomCard, isExpanded && styles.classroomCardExpanded]}>
        {/* Classroom Header */}
        <TouchableOpacity
          style={[styles.classroomHeader, { borderLeftColor: gradeColor }]}
          onPress={() => toggleClassroom(classroomData.classroom.id)}
          activeOpacity={0.8}
        >
          <View style={styles.classroomHeaderContent}>
            <View style={styles.classroomInfo}>
              <View style={styles.classroomNameContainer}>
                <Text style={styles.classroomName}>
                  {classroomData.classroom.name}
                </Text>
                <View style={[styles.classroomIndicator, { backgroundColor: gradeColor }]} />
              </View>
              <View style={styles.classroomStatsContainer}>
                <View style={styles.classroomStatItem}>
                  <Text style={styles.classroomStatIcon}>📚</Text>
                  <Text style={styles.classroomStats}>
                    {classroomData.stats.contentCount} مادة
                  </Text>
                </View>
                <View style={styles.classroomStatDivider} />
                <View style={styles.classroomStatItem}>
                  <Text style={styles.classroomStatIcon}>📊</Text>
                  <Text style={styles.classroomStats}>
                    {classroomData.stats.percentage.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.classroomGradeContainer}>
              <View style={[styles.classroomPercentageCircle, { backgroundColor: gradeColor + '15', borderColor: gradeColor }]}>
                <Text style={[
                  styles.classroomPercentage,
                  { color: gradeColor }
                ]}>
                  {classroomData.stats.percentage.toFixed(0)}%
                </Text>
              </View>
              <Text style={styles.classroomTotal}>
                {formatGrade(classroomData.stats.totalEarned, classroomData.stats.totalMax)}
              </Text>
            </View>
            <View style={[styles.classroomExpandButton, isExpanded && styles.classroomExpandButtonActive]}>
              <Text style={styles.classroomExpandIcon}>
                {isExpanded ? '▲' : '▼'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Progress Bar for Classroom */}
        <View style={styles.classroomProgressContainer}>
          {renderProgressBar(classroomData.stats.percentage, gradeColor)}
        </View>

        {/* Classroom Contents */}
        {isExpanded && (
          <Animated.View style={[
            styles.classroomContents,
            { opacity: fadeAnim }
          ]}>
            {classroomData.contents.map((content) => 
              renderContentCard(content, classroomData.classroom.id)
            )}
          </Animated.View>
        )}
      </View>
    );
  };

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
          activeOpacity={0.7}
        >
          <View style={styles.backButtonContainer}>
            <Text style={styles.backButtonText}>←</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>الدرجات</Text>
          <Text style={styles.headerSubtitle}>سجل الدرجات الأكاديمي</Text>
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
          <Animated.View style={[
            styles.loadingContainer,
            { opacity: fadeAnim }
          ]}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>جاري تحميل الدرجات...</Text>
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
              onPress={loadGrades}
              variant="outline"
              size="medium"
            />
          </Animated.View>
        )}

        {/* Grades Data */}
        {!isLoading && !error && gradesData && (
          <Animated.View style={[
            styles.gradesContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            {/* Overall Stats */}
            <View style={styles.overallStatsCard}>
              {/* Header Section */}
              <View style={styles.overallStatsHeader}>
                <View style={styles.overallStatsHeaderLeft}>
                  <View style={styles.overallStatsIconContainer}>
                    <Text style={styles.overallStatsIcon}>📊</Text>
                  </View>
                  <View>
                    <Text style={styles.overallStatsTitle}>الإحصائيات العامة</Text>
                    <Text style={styles.traineeName}>{gradesData.trainee.nameAr}</Text>
                  </View>
                </View>
                <View style={[styles.overallPercentageCircle, { 
                  backgroundColor: getGradeColor(gradesData.overallStats.percentage) + '15',
                  borderColor: getGradeColor(gradesData.overallStats.percentage)
                }]}>
                  <Text style={[
                    styles.overallPercentageText,
                    { color: getGradeColor(gradesData.overallStats.percentage) }
                  ]}>
                    {gradesData.overallStats.percentage.toFixed(0)}%
                  </Text>
                </View>
              </View>
              
              {/* Progress Bar */}
              <View style={styles.overallProgressContainer}>
                {renderProgressBar(gradesData.overallStats.percentage, getGradeColor(gradesData.overallStats.percentage))}
              </View>

              {/* Stats Grid */}
              <View style={styles.overallStatsGrid}>
                <View style={styles.overallStatCard}>
                  <View style={[styles.overallStatIcon, { backgroundColor: Colors.primary + '15' }]}>
                    <Text style={styles.overallStatIconText}>🎯</Text>
                  </View>
                  <Text style={styles.overallStatValue}>
                    {gradesData.overallStats.percentage.toFixed(1)}%
                  </Text>
                  <Text style={styles.overallStatLabel}>النسبة الإجمالية</Text>
                </View>
                
                <View style={styles.overallStatCard}>
                  <View style={[styles.overallStatIcon, { backgroundColor: Colors.accent + '15' }]}>
                    <Text style={styles.overallStatIconText}>⭐</Text>
                  </View>
                  <Text style={styles.overallStatValue}>
                    {formatGrade(gradesData.overallStats.totalEarned, gradesData.overallStats.totalMax)}
                  </Text>
                  <Text style={styles.overallStatLabel}>إجمالي الدرجات</Text>
                </View>
                
                <View style={styles.overallStatCard}>
                  <View style={[styles.overallStatIcon, { backgroundColor: Colors.secondary + '15' }]}>
                    <Text style={styles.overallStatIconText}>📚</Text>
                  </View>
                  <Text style={styles.overallStatValue}>
                    {gradesData.overallStats.totalContents}
                  </Text>
                  <Text style={styles.overallStatLabel}>عدد المواد</Text>
                </View>
              </View>

              {/* Status Badge */}
              <View style={[
                styles.overallStatusBadge,
                { 
                  backgroundColor: getGradeColor(gradesData.overallStats.percentage) + '15',
                  borderColor: getGradeColor(gradesData.overallStats.percentage) + '40'
                }
              ]}>
                <View style={[styles.overallStatusDot, { backgroundColor: getGradeColor(gradesData.overallStats.percentage) }]} />
                <Text style={[
                  styles.overallStatusText,
                  { color: getGradeColor(gradesData.overallStats.percentage) }
                ]}>
                  {getGradeStatus(gradesData.overallStats.percentage)}
                </Text>
              </View>
            </View>

            {/* Classrooms */}
            <View style={styles.classroomsContainer}>
              <Text style={styles.classroomsTitle}>الفصول الدراسية</Text>
              {gradesData.classrooms.map(renderClassroomCard)}
            </View>
          </Animated.View>
        )}

        {/* Empty State */}
        {!isLoading && !error && !gradesData && (
          <Animated.View style={[
            styles.emptyContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>لا توجد درجات متاحة</Text>
            <Text style={styles.emptyDescription}>
              لا توجد درجات متاحة لك في الوقت الحالي
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
  headerSubtitle: {
    fontSize: 13,
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
  gradesContainer: {
    gap: 24,
  },
  // Overall Stats Card
  overallStatsCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  overallStatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  overallStatsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  overallStatsIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  overallStatsIcon: {
    fontSize: 24,
  },
  overallStatsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  traineeName: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  overallPercentageCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  overallPercentageText: {
    fontSize: 20,
    fontWeight: '800',
  },
  overallProgressContainer: {
    marginBottom: 24,
  },
  overallStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  overallStatCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.backgroundSoft,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  overallStatIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  overallStatIconText: {
    fontSize: 20,
  },
  overallStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  overallStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  overallStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
  },
  overallStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  overallStatusText: {
    fontSize: 16,
    fontWeight: '800',
  },
  // Progress Bar
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: Colors.backgroundSoft,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Classrooms
  classroomsContainer: {
    gap: 20,
  },
  classroomsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'right',
  },
  classroomCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  classroomCardExpanded: {
    borderColor: Colors.primary + '40',
    shadowOpacity: 0.15,
  },
  classroomHeader: {
    borderLeftWidth: 4,
    padding: 20,
  },
  classroomHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  classroomInfo: {
    flex: 1,
    marginRight: 12,
  },
  classroomNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  classroomName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginRight: 8,
  },
  classroomIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  classroomStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  classroomStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classroomStatIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  classroomStats: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  classroomStatDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.borderMedium,
    marginHorizontal: 8,
  },
  classroomGradeContainer: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  classroomPercentageCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  classroomPercentage: {
    fontSize: 18,
    fontWeight: '800',
  },
  classroomTotal: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  classroomExpandButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classroomExpandButtonActive: {
    backgroundColor: Colors.primarySoft,
  },
  classroomExpandIcon: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  classroomProgressContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  classroomContents: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 20,
    paddingBottom: 8,
  },
  // Content Card
  contentCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  contentCardExpanded: {
    borderColor: Colors.primary + '40',
    shadowOpacity: 0.12,
  },
  contentHeader: {
    borderLeftWidth: 4,
    paddingLeft: 14,
    marginBottom: 16,
  },
  contentInfo: {
    flex: 1,
    marginRight: 12,
  },
  contentCodeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  contentCode: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  contentName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  contentGradeContainer: {
    alignItems: 'flex-end',
  },
  contentPercentageCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  contentPercentage: {
    fontSize: 16,
    fontWeight: '800',
  },
  contentTotal: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  contentProgressContainer: {
    marginBottom: 12,
    marginHorizontal: 2,
  },
  gradeStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gradeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  gradeStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  gradeStatusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButtonActive: {
    backgroundColor: Colors.primarySoft,
  },
  expandIcon: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  // Grade Breakdown
  gradeBreakdown: {
    marginTop: 4,
  },
  breakdownHeader: {
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'right',
  },
  breakdownDivider: {
    height: 2,
    backgroundColor: Colors.primarySoft,
    borderRadius: 1,
    width: 40,
    alignSelf: 'flex-end',
  },
  gradeTypesContainer: {
    gap: 12,
  },
  gradeTypeCard: {
    backgroundColor: Colors.backgroundSoft,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  gradeTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  gradeTypeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gradeTypeIcon: {
    fontSize: 18,
  },
  gradeTypeInfo: {
    flex: 1,
  },
  gradeTypeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  gradeTypeMarks: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  gradeTypePercentageContainer: {
    alignItems: 'flex-end',
  },
  gradeTypePercentage: {
    fontSize: 16,
    fontWeight: '800',
  },
});

export default GradesScreen;
