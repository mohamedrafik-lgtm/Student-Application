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
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
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

interface TermGroup {
  classNumber: number;
  name: string;
  contents: TrainingContent[];
}

const TERM_LABELS: Record<number, string> = {
  1: 'الترم الأول',
  2: 'الترم الثاني',
  3: 'الترم الثالث',
  4: 'الترم الرابع',
  5: 'الترم الخامس',
  6: 'الترم السادس',
};

const TERM_ICONS: Record<number, string> = {
  1: '1️⃣',
  2: '2️⃣',
  3: '3️⃣',
  4: '4️⃣',
  5: '5️⃣',
  6: '6️⃣',
};

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
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);

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

  // Group contents by classroom.classNumber (semester/term)
  const termGroups: TermGroup[] = React.useMemo(() => {
    const grouped = new Map<number, TermGroup>();
    contents.forEach((c) => {
      const num = c.classroom?.classNumber ?? 0;
      if (!grouped.has(num)) {
        grouped.set(num, {
          classNumber: num,
          name: c.classroom?.name || TERM_LABELS[num] || `ترم ${num}`,
          contents: [],
        });
      }
      grouped.get(num)!.contents.push(c);
    });
    // Sort groups by classNumber ascending
    return Array.from(grouped.values()).sort((a, b) => a.classNumber - b.classNumber);
  }, [contents]);

  // Available term numbers for filter tabs
  const availableTerms = termGroups.map((g) => g.classNumber);

  // Filtered groups based on selected term
  const visibleGroups = selectedTerm === null
    ? termGroups
    : termGroups.filter((g) => g.classNumber === selectedTerm);

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
              <View style={[s.badge, { backgroundColor: Colors.infoLight }]}>
                <Text style={[s.badgeText, { color: Colors.primary }]}>{content._count.scheduleSlots} متاحة</Text>
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
          <Text style={{ fontSize: 14, color: Colors.white }}>←</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={s.backBtn}>
          <Icon name={AppIcons.forward} size={18} color={Colors.primary} />
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
            <ActivityIndicator size="large" color={Colors.primary} />
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

        {/* Term Filter Tabs */}
        {!isLoading && !error && termGroups.length > 1 && (
          <View style={s.termTabsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.termTabsRow}
            >
              <TouchableOpacity
                style={[s.termTab, selectedTerm === null && s.termTabActive]}
                onPress={() => setSelectedTerm(null)}
                activeOpacity={0.7}
              >
                <Text style={[s.termTabText, selectedTerm === null && s.termTabTextActive]}>الكل</Text>
                <View style={[s.termTabCount, selectedTerm === null && s.termTabCountActive]}>
                  <Text style={[s.termTabCountText, selectedTerm === null && s.termTabCountTextActive]}>
                    {contents.length}
                  </Text>
                </View>
              </TouchableOpacity>
              {termGroups.map((group) => (
                <TouchableOpacity
                  key={group.classNumber}
                  style={[s.termTab, selectedTerm === group.classNumber && s.termTabActive]}
                  onPress={() => setSelectedTerm(group.classNumber)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.termTabText, selectedTerm === group.classNumber && s.termTabTextActive]}>
                    {TERM_LABELS[group.classNumber] || `ترم ${group.classNumber}`}
                  </Text>
                  <View style={[s.termTabCount, selectedTerm === group.classNumber && s.termTabCountActive]}>
                    <Text style={[s.termTabCountText, selectedTerm === group.classNumber && s.termTabCountTextActive]}>
                      {group.contents.length}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Contents grouped by Term */}
        {!isLoading && !error && contents.length > 0 && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {visibleGroups.map((group) => (
              <View key={group.classNumber} style={s.termSection}>
                {/* Term Section Header */}
                <View style={s.termHeader}>
                  <View style={s.termHeaderLeft}>
                    <View style={s.termCountBadge}>
                      <Text style={s.termCountBadgeText}>{group.contents.length} مادة</Text>
                    </View>
                  </View>
                  <View style={s.termHeaderRight}>
                    <Text style={s.termIcon}>{TERM_ICONS[group.classNumber] || '📋'}</Text>
                    <View>
                      <Text style={s.termTitle}>{TERM_LABELS[group.classNumber] || `ترم ${group.classNumber}`}</Text>
                      <Text style={s.termSubtitle}>{group.name}</Text>
                    </View>
                  </View>
                </View>
                {/* Term Contents */}
                <View style={s.termCards}>
                  {group.contents.map(renderContentCard)}
                </View>
              </View>
            ))}
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary50,
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 18, color: Colors.primary, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  scroll: { padding: 18, paddingBottom: 32 },
  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  bannerIcon: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginLeft: 14,
  },
  bannerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginBottom: 2 },
  bannerValue: { fontSize: 16, fontWeight: '700', color: Colors.white, textAlign: 'right' },
  // Term Tabs
  termTabsWrapper: {
    marginBottom: 16,
  },
  termTabsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    paddingVertical: 2,
  },
  termTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    gap: 6,
  },
  termTabActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  termTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textLight,
  },
  termTabTextActive: {
    color: Colors.white,
  },
  termTabCount: {
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  termTabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  termTabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textLight,
  },
  termTabCountTextActive: {
    color: Colors.white,
  },
  // Term Section
  termSection: {
    marginBottom: 20,
  },
  termHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  termHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  termHeaderLeft: {
    alignItems: 'flex-start',
  },
  termIcon: {
    fontSize: 22,
  },
  termTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  termSubtitle: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: 1,
  },
  termCountBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  termCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondary,
  },
  termCards: {
    gap: 12,
  },
  // Section (legacy)
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 10 },
  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  cardIcon: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.primary50,
    alignItems: 'center', justifyContent: 'center', marginLeft: 14,
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 4, lineHeight: 22 },
  cardCode: { fontSize: 12, color: Colors.textHint, textAlign: 'right', marginBottom: 8 },
  cardBadges: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  badge: { backgroundColor: Colors.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600', color: Colors.primaryLight },
  cardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  cardBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
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

export default TrainingContentsScreen;
