// TrainingContentsScreen – displays training contents (courses) for the student's program
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
import { trainingContentsService } from '../services/trainingContentsService';
import { AuthService } from '../services/authService';
import ContentLecturesScreen from './ContentLecturesScreen';
import {
  TrainingContent,
  TrainingContentsError,
} from '../types/trainingContents';

interface TrainingContentsScreenProps {
  accessToken: string;
  onBack: () => void;
}

const TrainingContentsScreen: React.FC<TrainingContentsScreenProps> = ({
  accessToken,
  onBack,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contents, setContents] = useState<TrainingContent[]>([]);
  const [_userProgramId, setUserProgramId] = useState<number | null>(null);
  const [userProgramName, setUserProgramName] = useState<string>('');

  // Navigation state
  const [selectedContent, setSelectedContent] = useState<TrainingContent | null>(null);
  const [showLectures, setShowLectures] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    loadUserProfileAndContents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserProfileAndContents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const profile = await AuthService.getProfile(accessToken);

      if (profile && profile.trainee && profile.trainee.programId) {
        const programId = profile.trainee.programId;
        setUserProgramId(programId);
        setUserProgramName(profile.trainee.program.nameAr);

        const response = await trainingContentsService.getTrainingContents(programId, accessToken);

        if (Array.isArray(response)) {
          setContents(response);
        } else {
          setContents([]);
        }
      } else {
        setError('لا يوجد برنامج مسجل للمستخدم');
      }
    } catch (error) {
      const apiError = error as TrainingContentsError;
      let errorMessage = 'حدث خطأ أثناء تحميل البيانات';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      } else if (apiError.statusCode === 404) {
        errorMessage = 'لم يتم العثور على مواد دراسية';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewLectures = (content: TrainingContent) => {
    setSelectedContent(content);
    setShowLectures(true);
  };

  const handleBackFromLectures = () => {
    setShowLectures(false);
    setSelectedContent(null);
  };

  const getTotalLectures = (content: TrainingContent): number => {
    return content.theorySessionsPerWeek + content.practicalSessionsPerWeek;
  };

  // Navigate to lectures screen if a content is selected
  if (showLectures && selectedContent) {
    return (
      <ContentLecturesScreen
        contentId={selectedContent.id}
        contentName={selectedContent.name}
        contentCode={selectedContent.code}
        accessToken={accessToken}
        onBack={handleBackFromLectures}
      />
    );
  }

  const renderContentCard = (content: TrainingContent) => {
    const totalLectures = getTotalLectures(content);
    return (
      <View key={content.id} style={s.card}>
        <View style={s.cardRow}>
          {/* Icon */}
          <View style={s.cardIcon}>
            <Text style={{ fontSize: 26 }}>📖</Text>
          </View>
          {/* Details */}
          <View style={s.cardInfo}>
            <Text style={s.cardName} numberOfLines={2}>{content.name}</Text>
            <Text style={s.cardCode}>{content.code}</Text>
            <View style={s.cardBadges}>
              <View style={s.badge}>
                <Text style={s.badgeText}>{totalLectures} محاضرة</Text>
              </View>
              <View style={[s.badge, { backgroundColor: '#EBF5FF' }]}>
                <Text style={[s.badgeText, { color: '#2563EB' }]}>{content._count.scheduleSlots} متاحة</Text>
              </View>
            </View>
          </View>
        </View>
        {/* Action */}
        <TouchableOpacity
          style={s.cardBtn}
          onPress={() => handleViewLectures(content)}
          activeOpacity={0.8}
        >
          <Text style={s.cardBtnText}>عرض المحاضرات</Text>
          <Text style={{ fontSize: 14, color: '#fff' }}>←</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={s.backBtn}>
          <Text style={s.backIcon}>→</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 14 }}>
          <Text style={s.headerTitle}>مقرراتك الدراسية</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Program Banner */}
        {!isLoading && !error && userProgramName !== '' && (
          <Animated.View style={[s.banner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={s.bannerIcon}>
              <Text style={{ fontSize: 24 }}>🎓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerLabel}>برنامجك التدريبي</Text>
              <Text style={s.bannerValue}>{userProgramName}</Text>
            </View>
          </Animated.View>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={s.loadingText}>جاري تحميل المحتوى التدريبي...</Text>
          </View>
        )}

        {/* Error */}
        {error && !isLoading && (
          <View style={s.center}>
            <View style={s.errorCircle}><Text style={{ fontSize: 32 }}>⚠️</Text></View>
            <Text style={s.errorText}>{error}</Text>
            <CustomButton title="إعادة المحاولة" onPress={loadUserProfileAndContents} variant="outline" size="medium" />
          </View>
        )}

        {/* Contents */}
        {!isLoading && !error && contents.length > 0 && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 14 }}>
            <Text style={s.sectionTitle}>المقررات الدراسية ({contents.length})</Text>
            {contents.map(renderContentCard)}
          </Animated.View>
        )}

        {/* Empty */}
        {!isLoading && !error && contents.length === 0 && !isLoading && (
          <View style={s.center}>
            <Text style={{ fontSize: 56, marginBottom: 16 }}>📚</Text>
            <Text style={s.emptyTitle}>لا يوجد محتوى تدريبي</Text>
            <Text style={s.emptyDesc}>لا يوجد مواد دراسية متاحة لبرنامجك في الوقت الحالي</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#F0F4FF',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 18, color: '#2563EB', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1D26', textAlign: 'right' },
  scroll: { padding: 18, paddingBottom: 32 },
  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  bannerIcon: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginLeft: 14,
  },
  bannerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginBottom: 2 },
  bannerValue: { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'right' },
  // Section
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1D26', textAlign: 'right', marginBottom: 10 },
  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  cardIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: '#F0F4FF',
    alignItems: 'center', justifyContent: 'center', marginLeft: 14,
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1A1D26', textAlign: 'right', marginBottom: 4, lineHeight: 22 },
  cardCode: { fontSize: 12, color: '#8E95A2', textAlign: 'right', marginBottom: 8 },
  cardBadges: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  badge: { backgroundColor: '#E8FAF0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#10B981' },
  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  cardBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  // States
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 16, fontSize: 14, color: '#8E95A2', fontWeight: '600' },
  errorCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  errorText: { fontSize: 15, color: '#EF4444', textAlign: 'center', marginBottom: 20, fontWeight: '600', lineHeight: 22 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1D26', textAlign: 'center', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#8E95A2', textAlign: 'center', lineHeight: 22 },
});

export default TrainingContentsScreen;
