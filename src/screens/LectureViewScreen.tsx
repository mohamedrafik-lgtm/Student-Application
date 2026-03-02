// LectureViewScreen – displays a single lecture (video / PDF / info)
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
import { lecturesService } from '../services/lecturesService';
import { API_CONFIG } from '../services/apiConfig';
import ScreenHeader from '../components/shared/ScreenHeader';
import {
  LectureDetails,
  TrainingContentsError,
  LectureType,
} from '../types/trainingContents';

interface LectureViewScreenProps {
  lectureId: number;
  accessToken: string;
  onBack: () => void;
  onBackToAllLectures?: () => void;
  onBackToAllContents?: () => void;
}

const LectureViewScreen: React.FC<LectureViewScreenProps> = ({
  lectureId,
  accessToken,
  onBack,
  onBackToAllLectures,
  onBackToAllContents,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lectureDetails, setLectureDetails] = useState<LectureDetails | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    loadLectureDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLectureDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const logs: string[] = [];
      logs.push(`Loading lecture ID: ${lectureId}`);
      logs.push(`API URL: ${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LECTURE_DETAILS}/${lectureId}`);

      const response = await lecturesService.getLectureDetails(lectureId, accessToken);

      logs.push('Response received');
      logs.push(`Title: ${response.title}`);
      logs.push(`Type: ${response.type}`);
      logs.push(`YouTube: ${response.youtubeUrl || 'N/A'}`);
      logs.push(`PDF: ${response.pdfFile || 'N/A'}`);

      setDebugInfo(logs);
      setLectureDetails(response);
    } catch (error) {
      const logs: string[] = debugInfo.length > 0 ? [...debugInfo] : [];
      logs.push('ERROR');

      const apiError = error as TrainingContentsError;
      logs.push(`Status: ${apiError.statusCode || 'N/A'}`);
      logs.push(`Message: ${apiError.message || 'N/A'}`);
      setDebugInfo(logs);

      let errorMessage = 'حدث خطأ أثناء تحميل المحاضرة';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة';
      } else if (apiError.statusCode === 404) {
        errorMessage = `المحاضرة غير موجودة (ID: ${lectureId})`;
      } else if (apiError.statusCode === 0) {
        errorMessage = 'تعذر الاتصال بالخادم';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getLectureTypeText = (type: LectureType): string => {
    switch (type) {
      case 'VIDEO': return 'فيديو';
      case 'PDF': return 'ملف PDF';
      case 'BOTH': return 'فيديو وملف PDF';
      default: return type;
    }
  };

  const handleWatchVideo = async () => {
    if (!lectureDetails?.youtubeUrl) {
      Alert.alert('تنبيه', 'لا يوجد رابط فيديو لهذه المحاضرة');
      return;
    }
    try {
      await Linking.openURL(lectureDetails.youtubeUrl);
    } catch {
      Alert.alert('خطأ', 'لا يمكن فتح الفيديو');
    }
  };

  const handleDownloadPDF = () => {
    if (!lectureDetails?.pdfFile) {
      Alert.alert('تنبيه', 'لا يوجد ملف PDF لهذه المحاضرة');
      return;
    }
    Alert.alert('قريباً', 'ميزة تحميل PDF ستكون متاحة قريباً');
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader
        title={lectureDetails?.title || 'المحاضرة'}
        subtitle={lectureDetails ? `${lectureDetails.content.name} • الباب ${lectureDetails.chapter}` : undefined}
        onBack={onBack}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Loading */}
        {isLoading && (
          <View style={s.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={s.loadingText}>جاري تحميل المحاضرة...</Text>
          </View>
        )}

        {/* Error */}
        {error && !isLoading && (
          <View style={s.center}>
            <View style={s.errorCircle}><Text style={{ fontSize: 32 }}>⚠️</Text></View>
            <Text style={s.errorTitle}>فشل في تحميل المحاضرة</Text>
            <Text style={s.errorText}>{error}</Text>

            {/* Tech details */}
            <View style={s.errorDetails}>
              <Text style={s.errorDetailLabel}>تفاصيل تقنية:</Text>
              <Text style={s.errorDetailVal}>رقم المحاضرة: {lectureId}</Text>
              <Text style={s.errorDetailVal}>
                Access Token: {accessToken ? `${accessToken.substring(0, 20)}...` : 'غير موجود'}
              </Text>
              <Text style={s.errorDetailVal}>
                API URL: {`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LECTURE_DETAILS}/${lectureId}`}
              </Text>
            </View>

            <View style={{ gap: 10, width: '100%' }}>
              <CustomButton title="إعادة المحاولة" onPress={loadLectureDetails} variant="outline" size="medium" />
              <CustomButton title="رجوع" onPress={onBack} variant="secondary" size="medium" />
            </View>
          </View>
        )}

        {/* Content */}
        {!isLoading && !error && lectureDetails && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 16 }}>
            {/* Debug Panel (dev) */}
            {debugInfo.length > 0 && __DEV__ && (
              <View style={s.debugPanel}>
                <Text style={s.debugTitle}>معلومات التشخيص</Text>
                {debugInfo.map((log, i) => (
                  <Text key={i} style={s.debugText}>{log}</Text>
                ))}
              </View>
            )}

            {/* Video Section */}
            {lectureDetails.youtubeUrl && (
              <View style={s.card}>
                <View style={s.cardHeadRow}>
                  <View style={[s.cardHeadIcon, { backgroundColor: Colors.errorLight }]}>
                    <Text style={{ fontSize: 18 }}>▶️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardHeadTitle}>فيديو المحاضرة</Text>
                    <Text style={s.cardHeadSub}>مشاهدة فيديو المحاضرة</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.videoBtn} onPress={handleWatchVideo} activeOpacity={0.9}>
                  <View style={s.playCircle}>
                    <Text style={{ fontSize: 28, color: Colors.white, marginLeft: 3 }}>▶</Text>
                  </View>
                  <Text style={s.videoBtnText}>مشاهدة الفيديو</Text>
                  <Text style={s.videoBtnHint}>سيتم فتح الفيديو في YouTube</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* PDF Section */}
            {lectureDetails.pdfFile && (
              <View style={s.card}>
                <View style={s.cardHeadRow}>
                  <View style={[s.cardHeadIcon, { backgroundColor: Colors.infoLight }]}>
                    <Text style={{ fontSize: 18 }}>📄</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardHeadTitle}>مادة PDF</Text>
                    <Text style={s.cardHeadSub}>تحميل المادة العلمية</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.pdfBtn} onPress={handleDownloadPDF} activeOpacity={0.8}>
                  <Text style={{ fontSize: 16 }}>📥</Text>
                  <Text style={s.pdfBtnText}>تحميل ملف PDF</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Info Card */}
            <View style={s.card}>
              <Text style={s.sectionLabel}>معلومات المحاضرة</Text>
              <InfoRow label="رقم المحاضرة" value={`#${lectureDetails.order}`} />
              <InfoRow label="الباب" value={String(lectureDetails.chapter)} />
              <InfoRow label="نوع المحاضرة" value={getLectureTypeText(lectureDetails.type)} highlight />
              <View style={s.divider} />
              <Text style={s.subLabel}>المحتوى المتوفر</Text>
              <AvailRow label="فيديو" available={!!lectureDetails.youtubeUrl} />
              <AvailRow label="مادة PDF" available={!!lectureDetails.pdfFile} />
              <View style={s.divider} />
              <InfoRow label="المقرر" value={lectureDetails.content.name} />
              <InfoRow label="كود المقرر" value={lectureDetails.content.code} />
            </View>

            {/* Description */}
            {lectureDetails.description && (
              <View style={s.card}>
                <Text style={s.sectionLabel}>الوصف</Text>
                <Text style={s.descText}>{lectureDetails.description}</Text>
              </View>
            )}

            {/* Quick Actions */}
            {(onBackToAllLectures || onBackToAllContents) && (
              <View style={s.card}>
                <Text style={s.sectionLabel}>إجراءات سريعة</Text>
                {onBackToAllLectures && (
                  <TouchableOpacity style={s.actionRow} onPress={onBackToAllLectures} activeOpacity={0.7}>
                    <Text style={{ fontSize: 16 }}>📚</Text>
                    <Text style={s.actionText}>جميع المحاضرات</Text>
                    <Text style={{ fontSize: 14, color: Colors.textHint }}>←</Text>
                  </TouchableOpacity>
                )}
                {onBackToAllContents && (
                  <TouchableOpacity style={s.actionRow} onPress={onBackToAllContents} activeOpacity={0.7}>
                    <Text style={{ fontSize: 16 }}>📖</Text>
                    <Text style={s.actionText}>جميع المقررات</Text>
                    <Text style={{ fontSize: 14, color: Colors.textHint }}>←</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

/* ---------- helper components ---------- */
const InfoRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <View style={s.infoRow}>
    <Text style={s.infoLabel}>{label}</Text>
    {highlight ? (
      <View style={s.highlightBadge}><Text style={s.highlightText}>{value}</Text></View>
    ) : (
      <Text style={s.infoValue}>{value}</Text>
    )}
  </View>
);

const AvailRow = ({ label, available }: { label: string; available: boolean }) => (
  <View style={s.availRow}>
    <Text style={s.infoLabel}>{label}</Text>
    <View style={[s.availBadge, { backgroundColor: available ? Colors.successLight : Colors.errorLight }]}>
      <Text style={{ fontSize: 10 }}>{available ? '✅' : '❌'}</Text>
      <Text style={[s.availText, { color: available ? Colors.primaryLight : Colors.error }]}>
        {available ? 'متوفر' : 'غير متوفر'}
      </Text>
    </View>
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { display: 'none' as any },
  backBtn: { display: 'none' as any },
  backIcon: { fontSize: 0 },
  headerTitle: { fontSize: 0 },
  headerSub: { fontSize: 0 },
  orderBadge: { display: 'none' as any },
  orderBadgeText: { fontSize: 0 },
  scroll: { padding: 18, paddingBottom: 32 },
  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardHeadIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardHeadTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  cardHeadSub: { fontSize: 12, color: Colors.textHint, textAlign: 'right', marginTop: 2 },
  // Video button
  videoBtn: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  playCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.error,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: Colors.error, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  videoBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  videoBtnHint: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  // PDF button
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13, gap: 8,
  },
  pdfBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  // Info rows
  sectionLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 14 },
  subLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right', marginBottom: 10 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.background,
  },
  infoLabel: { fontSize: 13, color: Colors.textHint, fontWeight: '600' },
  infoValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  highlightBadge: { backgroundColor: Colors.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  highlightText: { fontSize: 12, color: Colors.primaryLight, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 12 },
  availRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8,
  },
  availBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, gap: 4,
  },
  availText: { fontSize: 12, fontWeight: '600' },
  descText: { fontSize: 14, color: Colors.textHint, lineHeight: 22, textAlign: 'right' },
  // Quick actions
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.backgroundAlt, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  actionText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  // States
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 16, fontSize: 14, color: Colors.textHint, fontWeight: '600' },
  errorCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.errorLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  errorTitle: { fontSize: 17, fontWeight: '700', color: Colors.error, textAlign: 'center', marginBottom: 8 },
  errorText: { fontSize: 14, color: Colors.error, textAlign: 'center', marginBottom: 16, lineHeight: 22 },
  errorDetails: {
    backgroundColor: Colors.backgroundAlt, borderRadius: 12, padding: 14, marginBottom: 20,
    width: '100%', borderWidth: 1, borderColor: Colors.borderLight,
  },
  errorDetailLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right', marginBottom: 8 },
  errorDetailVal: {
    fontSize: 11, color: Colors.textHint, textAlign: 'right', marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  // Debug
  debugPanel: {
    backgroundColor: Colors.textPrimary, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  debugTitle: { fontSize: 13, fontWeight: '700', color: Colors.primaryLight, marginBottom: 8, textAlign: 'right' },
  debugText: {
    fontSize: 10, color: Colors.borderMedium, marginBottom: 3, textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default LectureViewScreen;
