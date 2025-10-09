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

const { width } = Dimensions.get('window');

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
        <Text style={styles.breakdownTitle}>تفاصيل الدرجات:</Text>
        {gradeTypes.map((gradeType) => {
          const typeInfo = GRADE_TYPE_INFO[gradeType];
          const earned = content.grades[gradeType];
          const max = content.maxMarks[gradeType];
          const percentage = max > 0 ? (earned / max) * 100 : 0;

          return (
            <View key={gradeType} style={styles.gradeTypeRow}>
              <View style={styles.gradeTypeInfo}>
                <Text style={styles.gradeTypeIcon}>{typeInfo.icon}</Text>
                <Text style={styles.gradeTypeLabel}>{typeInfo.labelAr}</Text>
              </View>
              <View style={styles.gradeTypeValues}>
                <Text style={styles.gradeTypeMarks}>
                  {formatGrade(earned, max)}
                </Text>
                <Text style={[
                  styles.gradeTypePercentage,
                  { color: getGradeColor(percentage) }
                ]}>
                  {percentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderContentCard = (content: ContentWithGrades, classroomId: number) => {
    const isExpanded = expandedContent === content.content.id;
    
    return (
      <TouchableOpacity
        key={content.content.id}
        style={styles.contentCard}
        onPress={() => toggleContent(content.content.id)}
        activeOpacity={0.7}
      >
        {/* Content Header */}
        <View style={styles.contentHeader}>
          <View style={styles.contentInfo}>
            <Text style={styles.contentCode}>{content.content.code}</Text>
            <Text style={styles.contentName}>{content.content.name}</Text>
          </View>
          <View style={styles.contentGrade}>
            <Text style={[
              styles.contentPercentage,
              { color: getGradeColor(content.percentage) }
            ]}>
              {content.percentage.toFixed(1)}%
            </Text>
            <Text style={styles.contentTotal}>
              {formatGrade(content.grades.totalMarks, content.maxMarks.total)}
            </Text>
          </View>
        </View>

        {/* Grade Status */}
        <View style={styles.gradeStatusContainer}>
          <View style={[
            styles.gradeStatusBadge,
            { backgroundColor: getGradeColor(content.percentage) + '20' }
          ]}>
            <Text style={[
              styles.gradeStatusText,
              { color: getGradeColor(content.percentage) }
            ]}>
              {getGradeStatus(content.percentage)}
            </Text>
          </View>
          <Text style={styles.expandIcon}>
            {isExpanded ? '▲' : '▼'}
          </Text>
        </View>

        {/* Expanded Details */}
        {isExpanded && renderGradeBreakdown(content)}
      </TouchableOpacity>
    );
  };

  const renderClassroomCard = (classroomData: ClassroomWithContents) => {
    const isExpanded = expandedClassroom === classroomData.classroom.id;
    
    return (
      <View key={classroomData.classroom.id} style={styles.classroomCard}>
        {/* Classroom Header */}
        <TouchableOpacity
          style={styles.classroomHeader}
          onPress={() => toggleClassroom(classroomData.classroom.id)}
          activeOpacity={0.7}
        >
          <View style={styles.classroomInfo}>
            <Text style={styles.classroomName}>
              {classroomData.classroom.name}
            </Text>
            <Text style={styles.classroomStats}>
              {classroomData.stats.contentCount} مادة • {classroomData.stats.percentage.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.classroomGrade}>
            <Text style={[
              styles.classroomPercentage,
              { color: getGradeColor(classroomData.stats.percentage) }
            ]}>
              {classroomData.stats.percentage.toFixed(1)}%
            </Text>
            <Text style={styles.classroomTotal}>
              {formatGrade(classroomData.stats.totalEarned, classroomData.stats.totalMax)}
            </Text>
          </View>
        </TouchableOpacity>

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
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الدرجات</Text>
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
              <View style={styles.overallStatsHeader}>
                <Text style={styles.overallStatsTitle}>الإحصائيات العامة</Text>
                <Text style={styles.traineeName}>{gradesData.trainee.nameAr}</Text>
              </View>
              
              <View style={styles.overallStatsContent}>
                <View style={styles.overallStatItem}>
                  <Text style={styles.overallStatValue}>
                    {gradesData.overallStats.percentage.toFixed(1)}%
                  </Text>
                  <Text style={styles.overallStatLabel}>النسبة الإجمالية</Text>
                </View>
                
                <View style={styles.overallStatItem}>
                  <Text style={styles.overallStatValue}>
                    {formatGrade(gradesData.overallStats.totalEarned, gradesData.overallStats.totalMax)}
                  </Text>
                  <Text style={styles.overallStatLabel}>إجمالي الدرجات</Text>
                </View>
                
                <View style={styles.overallStatItem}>
                  <Text style={styles.overallStatValue}>
                    {gradesData.overallStats.totalContents}
                  </Text>
                  <Text style={styles.overallStatLabel}>عدد المواد</Text>
                </View>
              </View>

              <View style={[
                styles.overallStatusBadge,
                { backgroundColor: getGradeColor(gradesData.overallStats.percentage) + '20' }
              ]}>
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
  gradesContainer: {
    gap: 20,
  },
  overallStatsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  overallStatsHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  overallStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  traineeName: {
    fontSize: 16,
    color: '#6B7280',
  },
  overallStatsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  overallStatItem: {
    alignItems: 'center',
  },
  overallStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  overallStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  overallStatusBadge: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  overallStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  classroomsContainer: {
    gap: 16,
  },
  classroomsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  classroomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  classroomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  classroomInfo: {
    flex: 1,
  },
  classroomName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  classroomStats: {
    fontSize: 14,
    color: '#6B7280',
  },
  classroomGrade: {
    alignItems: 'flex-end',
  },
  classroomPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  classroomTotal: {
    fontSize: 14,
    color: '#6B7280',
  },
  classroomContents: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  contentCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contentInfo: {
    flex: 1,
    marginRight: 12,
  },
  contentCode: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  contentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  contentGrade: {
    alignItems: 'flex-end',
  },
  contentPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contentTotal: {
    fontSize: 14,
    color: '#6B7280',
  },
  gradeStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gradeStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  gradeStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 16,
    color: '#6B7280',
  },
  gradeBreakdown: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  gradeTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  gradeTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gradeTypeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  gradeTypeLabel: {
    fontSize: 14,
    color: '#1F2937',
  },
  gradeTypeValues: {
    alignItems: 'flex-end',
  },
  gradeTypeMarks: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  gradeTypePercentage: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default GradesScreen;
