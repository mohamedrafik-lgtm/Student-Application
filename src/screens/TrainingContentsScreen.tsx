// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles training contents display and navigation
// 2. Open/Closed: Can be extended with new features without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for different concerns
// 4. Dependency Inversion: Depends on abstractions (components) not concretions

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';
import { Colors } from '../styles/colors';
import { trainingContentsService } from '../services/trainingContentsService';
import { AuthService } from '../services/authService';
import {
  TrainingContent,
  TrainingContentsError,
} from '../types/trainingContents';

const { width, height } = Dimensions.get('window');

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
  const [filteredContents, setFilteredContents] = useState<TrainingContent[]>([]);
  const [expandedContent, setExpandedContent] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'classroom'>('all');
  const [userProgramId, setUserProgramId] = useState<number | null>(null);
  const [userProgramName, setUserProgramName] = useState<string>('');

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
  }, []);

  const filterContentsByProgram = useCallback(() => {
    if (!userProgramId) {
      setFilteredContents([]);
      return;
    }

    // Filter contents by user's program
    let filtered = contents.filter(content => content.programId === userProgramId);
    
    console.log('📊 Filtered contents by program:', {
      programId: userProgramId,
      totalContents: contents.length,
      filteredCount: filtered.length
    });

    // If filter is by classroom, group by classroom
    if (selectedFilter === 'classroom') {
      // Already grouped by classroom in renderContentsList
      setFilteredContents(filtered);
    } else {
      setFilteredContents(filtered);
    }
  }, [userProgramId, contents, selectedFilter]);

  // Filter contents when programId or filter changes
  useEffect(() => {
    if (userProgramId !== null && contents.length > 0) {
      filterContentsByProgram();
    }
  }, [userProgramId, contents, selectedFilter, filterContentsByProgram]);

  const loadUserProfileAndContents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load user profile first to get programId
      console.log('🔍 Loading user profile...');
      const profile = await AuthService.getProfile(accessToken);
      
      if (profile && profile.trainee && profile.trainee.programId) {
        setUserProgramId(profile.trainee.programId);
        setUserProgramName(profile.trainee.program.nameAr);
        console.log('✅ User program loaded:', {
          programId: profile.trainee.programId,
          programName: profile.trainee.program.nameAr
        });
      } else {
        console.warn('⚠️ No program found for user');
        setError('لا يوجد برنامج مسجل للمستخدم');
        setIsLoading(false);
        return;
      }

      // Load training contents
      console.log('🔍 Loading training contents...');
      const response = await trainingContentsService.getTrainingContents(accessToken);

      console.log('✅ Training contents loaded successfully!');
      console.log('📚 Contents count (all):', response.length);

      setContents(response);
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      const apiError = error as any;
      
      let errorMessage = 'حدث خطأ أثناء تحميل البيانات';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      } else if (apiError.statusCode === 404) {
        errorMessage = 'لم يتم العثور على البيانات';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };



  const toggleContent = (contentId: number) => {
    setExpandedContent(expandedContent === contentId ? null : contentId);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Group filtered contents by classroom
  const groupedByClassroom = filteredContents.reduce((acc, content) => {
    const classroomId = content.classroomId;
    if (!acc[classroomId]) {
      acc[classroomId] = {
        classroom: content.classroom,
        contents: [],
      };
    }
    acc[classroomId].contents.push(content);
    return acc;
  }, {} as Record<number, { classroom: TrainingContent['classroom']; contents: TrainingContent[] }>);

  const renderContentCard = (content: TrainingContent) => {
    const isExpanded = expandedContent === content.id;

    return (
      <TouchableOpacity
        key={content.id}
        style={[styles.contentCard, isExpanded && styles.contentCardExpanded]}
        onPress={() => toggleContent(content.id)}
        activeOpacity={0.8}
      >
        {/* Content Header */}
        <View style={styles.contentHeader}>
          <View style={styles.contentInfo}>
            <View style={styles.contentCodeContainer}>
              <Text style={styles.contentCode}>{content.code}</Text>
            </View>
            <Text style={styles.contentName} numberOfLines={2}>
              {content.name}
            </Text>
            <View style={styles.contentMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>👨‍🏫</Text>
                <Text style={styles.metaText}>{content.instructor.name}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📚</Text>
                <Text style={styles.metaText}>{content.chaptersCount} فصل</Text>
              </View>
            </View>
          </View>
          <View style={styles.expandButtonContainer}>
            <View style={[styles.expandButton, isExpanded && styles.expandButtonActive]}>
              <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
            </View>
          </View>
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <Animated.View
            style={[
              styles.expandedContent,
              { opacity: fadeAnim }
            ]}
          >
            {/* Program and Classroom Info */}
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>البرنامج:</Text>
                <Text style={styles.detailValue}>{content.program.nameAr}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>الفصل:</Text>
                <Text style={styles.detailValue}>{content.classroom.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>تاريخ البداية:</Text>
                <Text style={styles.detailValue}>{formatDate(content.classroom.startDate)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>تاريخ النهاية:</Text>
                <Text style={styles.detailValue}>{formatDate(content.classroom.endDate)}</Text>
              </View>
            </View>

            {/* Marks Configuration */}
            <View style={styles.marksSection}>
              <Text style={styles.sectionTitle}>توزيع الدرجات</Text>
              <View style={styles.marksGrid}>
                <View style={styles.markItem}>
                  <Text style={styles.markLabel}>أعمال السنة</Text>
                  <Text style={styles.markValue}>{content.yearWorkMarks}</Text>
                </View>
                <View style={styles.markItem}>
                  <Text style={styles.markLabel}>العملي</Text>
                  <Text style={styles.markValue}>{content.practicalMarks}</Text>
                </View>
                <View style={styles.markItem}>
                  <Text style={styles.markLabel}>التحريري</Text>
                  <Text style={styles.markValue}>{content.writtenMarks}</Text>
                </View>
                <View style={styles.markItem}>
                  <Text style={styles.markLabel}>الحضور</Text>
                  <Text style={styles.markValue}>{content.attendanceMarks}</Text>
                </View>
                <View style={styles.markItem}>
                  <Text style={styles.markLabel}>اختبارات مصغرة</Text>
                  <Text style={styles.markValue}>{content.quizzesMarks}</Text>
                </View>
                <View style={styles.markItem}>
                  <Text style={styles.markLabel}>الميد تيرم</Text>
                  <Text style={styles.markValue}>{content.finalExamMarks}</Text>
                </View>
              </View>
              <View style={styles.totalMarks}>
                <Text style={styles.totalMarksLabel}>الإجمالي:</Text>
                <Text style={styles.totalMarksValue}>
                  {content.yearWorkMarks +
                    content.practicalMarks +
                    content.writtenMarks +
                    content.attendanceMarks +
                    content.quizzesMarks +
                    content.finalExamMarks}{' '}
                  درجة
                </Text>
              </View>
            </View>

            {/* Sessions Configuration */}
            <View style={styles.sessionsSection}>
              <Text style={styles.sectionTitle}>الجلسات الأسبوعية</Text>
              <View style={styles.sessionsRow}>
                <View style={styles.sessionItem}>
                  <Text style={styles.sessionIcon}>📖</Text>
                  <Text style={styles.sessionLabel}>نظري</Text>
                  <Text style={styles.sessionValue}>
                    {content.theorySessionsPerWeek} جلسة/أسبوع
                  </Text>
                </View>
                <View style={styles.sessionItem}>
                  <Text style={styles.sessionIcon}>🔬</Text>
                  <Text style={styles.sessionLabel}>عملي</Text>
                  <Text style={styles.sessionValue}>
                    {content.practicalSessionsPerWeek} جلسة/أسبوع
                  </Text>
                </View>
              </View>
            </View>

            {/* Instructors */}
            <View style={styles.instructorsSection}>
              <Text style={styles.sectionTitle}>المدربون</Text>
              <View style={styles.instructorItem}>
                <Text style={styles.instructorLabel}>المدرب الرئيسي:</Text>
                <Text style={styles.instructorName}>{content.instructor.name}</Text>
              </View>
              {content.practicalAttendanceRecorder && (
                <View style={styles.instructorItem}>
                  <Text style={styles.instructorLabel}>مسجل الحضور العملي:</Text>
                  <Text style={styles.instructorName}>
                    {content.practicalAttendanceRecorder.name}
                  </Text>
                </View>
              )}
              {content.theoryAttendanceRecorder && (
                <View style={styles.instructorItem}>
                  <Text style={styles.instructorLabel}>مسجل الحضور النظري:</Text>
                  <Text style={styles.instructorName}>
                    {content.theoryAttendanceRecorder.name}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}
      </TouchableOpacity>
    );
  };

  const renderContentsList = () => {
    if (selectedFilter === 'classroom') {
      return Object.values(groupedByClassroom).map((group) => (
        <View key={group.classroom.id} style={styles.groupSection}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupTitle}>{group.classroom.name}</Text>
            <Text style={styles.groupCount}>{group.contents.length} مادة</Text>
          </View>
          {group.contents.map(renderContentCard)}
        </View>
      ));
    } else {
      // Display all filtered contents (only user's program)
      return filteredContents.map(renderContentCard);
    }
  };

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
          <Text style={styles.headerTitle}>المحتوى التدريبي</Text>
          <Text style={styles.headerSubtitle}>
            {userProgramName || 'المواد الدراسية'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </Animated.View>

      {/* Filter Tabs */}
      {filteredContents.length > 0 && (
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'all' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}
            >
              الكل ({filteredContents.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'classroom' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('classroom')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'classroom' && styles.filterTextActive,
              ]}
            >
              حسب الفصل
            </Text>
          </TouchableOpacity>
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

        {/* Contents List */}
        {!isLoading && !error && filteredContents.length > 0 && (
          <Animated.View
            style={[
              styles.contentsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {renderContentsList()}
          </Animated.View>
        )}

        {/* Empty State */}
        {!isLoading && !error && userProgramId !== null && filteredContents.length === 0 && (
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
              {userProgramName 
                ? `لا يوجد مواد دراسية متاحة لبرنامج "${userProgramName}" في الوقت الحالي`
                : 'لا يوجد محتوى تدريبي متاح لك في الوقت الحالي'}
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterTabActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  filterTextActive: {
    color: Colors.primary,
    fontWeight: '800',
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
  contentsContainer: {
    gap: 16,
  },
  groupSection: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  groupCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  contentCard: {
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
    marginBottom: 12,
  },
  contentCardExpanded: {
    borderColor: Colors.primary + '40',
    shadowOpacity: 0.12,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    marginBottom: 8,
  },
  contentCode: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  contentName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: 12,
  },
  contentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metaIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  expandButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButtonActive: {
    backgroundColor: Colors.primarySoft,
  },
  expandIcon: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  marksSection: {
    marginBottom: 20,
    backgroundColor: Colors.backgroundSoft,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'right',
  },
  marksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  markItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  markLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  markValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  totalMarks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: Colors.primary + '40',
  },
  totalMarksLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  totalMarksValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  sessionsSection: {
    marginBottom: 20,
  },
  sessionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sessionItem: {
    flex: 1,
    backgroundColor: Colors.backgroundSoft,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sessionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  sessionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sessionValue: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  instructorsSection: {
    marginBottom: 8,
  },
  instructorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  instructorLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  instructorName: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
});

export default TrainingContentsScreen;

