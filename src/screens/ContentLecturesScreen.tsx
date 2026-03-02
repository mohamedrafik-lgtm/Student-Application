// ContentLecturesScreen – lectures grouped by chapter for a selected course
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
import Icon, { AppIcons } from '../components/shared/Icon';
import { trainingContentsService } from '../services/trainingContentsService';
import { lecturesService } from '../services/lecturesService';
import LectureViewScreen from './LectureViewScreen';
import ScreenHeader from '../components/shared/ScreenHeader';
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentDetails, setContentDetails] = useState<TrainingContentDetails | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(1);

  // Navigation state
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [showLectureView, setShowLectureView] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    loadContentDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadContentDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const detailsResponse = await trainingContentsService.getTrainingContentDetails(contentId, accessToken);
      setContentDetails(detailsResponse);

      const lecturesResponse = await lecturesService.getContentLectures(contentId, accessToken);
      setLectures(lecturesResponse);
    } catch (error) {
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
      case 'VIDEO': return 'فيديو';
      case 'PDF': return 'ملف PDF';
      case 'BOTH': return 'فيديو وملف PDF';
      default: return type;
    }
  };

  const getLectureTypeIcon = (type: LectureType): string => {
    switch (type) {
      case 'VIDEO': return '▶️';
      case 'PDF': return '📄';
      case 'BOTH': return '📚';
      default: return '📖';
    }
  };

  const getLectureTypeColor = (type: LectureType): string => {
    switch (type) {
      case 'VIDEO': return Colors.error;
      case 'PDF': return Colors.primary;
      case 'BOTH': return Colors.secondary;
      default: return Colors.textHint;
    }
  };

  const getLectureTypeBg = (type: LectureType): string => {
    switch (type) {
      case 'VIDEO': return Colors.errorLight;
      case 'PDF': return Colors.infoLight;
      case 'BOTH': return Colors.backgroundSoft;
      default: return Colors.background;
    }
  };

  const getLecturesForChapter = (chapterNumber: number): Lecture[] => {
    return lectures
      .filter(lecture => lecture.chapter === chapterNumber)
      .sort((a, b) => a.order - b.order);
  };

  // Navigate to lecture view if selected
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
    <SafeAreaView style={s.container}>
      <ScreenHeader title={contentName} subtitle={`كود: ${contentCode} • ${contentDetails?._count.scheduleSlots || 0} محاضرة`} onBack={onBack} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Loading */}
        {isLoading && (
          <View style={s.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={s.loadingText}>جاري تحميل المحاضرات...</Text>
          </View>
        )}

        {/* Error */}
        {error && !isLoading && (
          <View style={s.center}>
            <View style={s.errorCircle}><Text style={{ fontSize: 32 }}>⚠️</Text></View>
            <Text style={s.errorText}>{error}</Text>
            <CustomButton title="إعادة المحاولة" onPress={loadContentDetails} variant="outline" size="medium" />
          </View>
        )}

        {/* Chapters */}
        {!isLoading && !error && contentDetails && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 14 }}>
            {Array.from({ length: contentDetails.chaptersCount || 1 }, (_, i) => {
              const chapterNum = i + 1;
              const chapterLectures = getLecturesForChapter(chapterNum);
              const isExpanded = expandedChapter === chapterNum;
              return (
                <View key={chapterNum} style={s.chapterCard}>
                  {/* Chapter header */}
                  <TouchableOpacity style={s.chapterHeader} onPress={() => toggleChapter(chapterNum)} activeOpacity={0.7}>
                    <View style={s.chapterLeft}>
                      <View style={s.chapterNum}>
                        <Text style={s.chapterNumText}>{chapterNum}</Text>
                      </View>
                      <View>
                        <Text style={s.chapterTitle}>الباب {chapterNum}</Text>
                        <Text style={s.chapterCount}>{chapterLectures.length} محاضرة</Text>
                      </View>
                    </View>
                    <View style={[s.expandIcon, isExpanded && s.expandIconActive]}>
                      <Icon name={isExpanded ? AppIcons.chevronUp : AppIcons.chevronDown} size={12} color={isExpanded ? Colors.primary : Colors.textHint} />
                    </View>
                  </TouchableOpacity>

                  {/* Lectures */}
                  {isExpanded && (
                    <View style={s.lecturesList}>
                      {chapterLectures.length === 0 ? (
                        <Text style={s.noLectures}>لا توجد محاضرات في هذا الباب</Text>
                      ) : (
                        chapterLectures.map(lecture => (
                          <TouchableOpacity
                            key={lecture.id}
                            style={s.lectureItem}
                            onPress={() => handleViewLecture(lecture)}
                            activeOpacity={0.7}
                          >
                            <View style={s.lectureRow}>
                              <View style={s.lectureOrder}>
                                <Text style={s.lectureOrderText}>{lecture.order}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={s.lectureTitle}>{lecture.title}</Text>
                                {lecture.description ? (
                                  <Text style={s.lectureDesc} numberOfLines={2}>{lecture.description}</Text>
                                ) : null}
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                                  <View style={[s.typeBadge, { backgroundColor: getLectureTypeBg(lecture.type) }]}>
                                    <Text style={{ fontSize: 10 }}>{getLectureTypeIcon(lecture.type)}</Text>
                                    <Text style={[s.typeBadgeText, { color: getLectureTypeColor(lecture.type) }]}>
                                      {getLectureTypeText(lecture.type)}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                              <Text style={{ fontSize: 14, color: Colors.textHint, marginRight: 4 }}>←</Text>
                            </View>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* Empty */}
        {!isLoading && !error && !contentDetails && (
          <View style={s.center}>
            <Text style={{ fontSize: 56, marginBottom: 16 }}>📚</Text>
            <Text style={s.emptyTitle}>لا توجد محاضرات</Text>
            <Text style={s.emptyDesc}>لا توجد محاضرات متاحة لهذه المادة في الوقت الحالي</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { display: 'none' as any },
  backBtn: { display: 'none' as any },
  backIcon: { fontSize: 0 },
  headerTitle: { fontSize: 0 },
  headerSub: { fontSize: 0 },
  scroll: { padding: 18, paddingBottom: 32 },
  // Chapter
  chapterCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  chapterLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chapterNum: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  chapterNumText: { fontSize: 15, fontWeight: '800', color: Colors.white },
  chapterTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  chapterCount: { fontSize: 12, color: Colors.textHint, textAlign: 'right', marginTop: 2 },
  expandIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
  },
  expandIconActive: { backgroundColor: Colors.infoLight },
  lecturesList: { backgroundColor: Colors.backgroundAlt, padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  noLectures: { fontSize: 13, color: Colors.textHint, textAlign: 'center', paddingVertical: 16 },
  // Lecture item
  lectureItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  lectureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lectureOrder: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.successLight,
    alignItems: 'center', justifyContent: 'center',
  },
  lectureOrderText: { fontSize: 13, fontWeight: '700', color: Colors.primaryLight },
  lectureTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  lectureDesc: { fontSize: 12, color: Colors.textHint, textAlign: 'right', marginTop: 3, lineHeight: 18 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, gap: 4,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  // States
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 16, fontSize: 14, color: Colors.textHint, fontWeight: '600' },
  errorCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.errorLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  errorText: { fontSize: 15, color: Colors.error, textAlign: 'center', marginBottom: 20, fontWeight: '600', lineHeight: 22 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: Colors.textHint, textAlign: 'center', lineHeight: 22 },
});

export default ContentLecturesScreen;
