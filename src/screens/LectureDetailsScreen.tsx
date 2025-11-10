import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';
import {
  LectureDetailsScreenProps,
  LectureType,
} from '../types/trainingContents';

const { width } = Dimensions.get('window');

const LectureDetailsScreen: React.FC<LectureDetailsScreenProps> = ({
  lecture,
  accessToken,
  onBack,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
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
  }, []);

  const getLectureTypeIcon = (type: LectureType): string => {
    const icons: Record<LectureType, string> = {
      VIDEO: '🎥',
      PDF: '📄',
      BOTH: '📚',
      TEXT: '📝',
    };
    return icons[type] || '📖';
  };

  const getLectureTypeLabel = (type: LectureType): string => {
    const labels: Record<LectureType, string> = {
      VIDEO: 'محاضرة فيديو',
      PDF: 'محاضرة PDF',
      BOTH: 'فيديو و PDF',
      TEXT: 'محاضرة نصية',
    };
    return labels[type] || type;
  };

  const handleOpenYoutube = () => {
    if (lecture.youtubeUrl) {
      Linking.openURL(lecture.youtubeUrl).catch(() => {
        Alert.alert('خطأ', 'تعذر فتح رابط اليوتيوب');
      });
    }
  };

  const handleOpenPDF = () => {
    if (lecture.pdfFile) {
      Linking.openURL(lecture.pdfFile).catch(() => {
        Alert.alert('خطأ', 'تعذر فتح ملف PDF');
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <View style={styles.backButtonContainer}>
            <Text style={styles.backButtonText}>←</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>تفاصيل المحاضرة</Text>
          <Text style={styles.headerSubtitle}>{lecture.content.name}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.lectureInfoCard}>
            <View style={styles.lectureHeader}>
              <View style={styles.lectureNumberBadge}>
                <Text style={styles.lectureNumberText}>{lecture.order}</Text>
              </View>
              <View style={styles.lectureHeaderInfo}>
                <Text style={styles.chapterLabel}>الباب {lecture.chapter}</Text>
                <Text style={styles.lectureTitle}>{lecture.title}</Text>
              </View>
              <View style={styles.lectureTypeBadge}>
                <Text style={styles.lectureTypeIcon}>{getLectureTypeIcon(lecture.type)}</Text>
              </View>
            </View>

            {lecture.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>الوصف:</Text>
                <Text style={styles.descriptionText}>{lecture.description}</Text>
              </View>
            )}

            <View style={styles.typeContainer}>
              <Text style={styles.typeLabel}>نوع المحاضرة:</Text>
              <Text style={styles.typeValue}>{getLectureTypeLabel(lecture.type)}</Text>
            </View>
          </View>

          <View style={styles.actionsSection}>
            <Text style={styles.actionsSectionTitle}>المحتوى المتاح</Text>
            
            {lecture.youtubeUrl && (
              <TouchableOpacity style={styles.actionCard} onPress={handleOpenYoutube} activeOpacity={0.8}>
                <View style={styles.actionIconContainer}>
                  <Text style={styles.actionIcon}>🎥</Text>
                </View>
                <View style={styles.actionInfo}>
                  <Text style={styles.actionTitle}>مشاهدة الفيديو</Text>
                  <Text style={styles.actionSubtitle}>فتح على يوتيوب</Text>
                </View>
                <Text style={styles.actionArrow}>→</Text>
              </TouchableOpacity>
            )}

            {lecture.pdfFile && (
              <TouchableOpacity style={styles.actionCard} onPress={handleOpenPDF} activeOpacity={0.8}>
                <View style={styles.actionIconContainer}>
                  <Text style={styles.actionIcon}>📄</Text>
                </View>
                <View style={styles.actionInfo}>
                  <Text style={styles.actionTitle}>فتح ملف PDF</Text>
                  <Text style={styles.actionSubtitle}>عرض المحتوى</Text>
                </View>
                <Text style={styles.actionArrow}>→</Text>
              </TouchableOpacity>
            )}

            {!lecture.youtubeUrl && !lecture.pdfFile && (
              <View style={styles.noContentCard}>
                <Text style={styles.noContentIcon}>📝</Text>
                <Text style={styles.noContentText}>هذه المحاضرة تحتوي على محتوى نصي فقط</Text>
              </View>
            )}
          </View>

          <View style={styles.courseInfoCard}>
            <Text style={styles.courseInfoTitle}>معلومات المادة</Text>
            <View style={styles.courseInfoRow}>
              <Text style={styles.courseInfoLabel}>كود المادة:</Text>
              <Text style={styles.courseInfoValue}>{lecture.content.code}</Text>
            </View>
            <View style={styles.courseInfoRow}>
              <Text style={styles.courseInfoLabel}>اسم المادة:</Text>
              <Text style={styles.courseInfoValue}>{lecture.content.name}</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, shadowColor: Colors.shadowDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6 },
  backButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  backButtonContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primary + '30' },
  backButtonText: { fontSize: 24, color: Colors.primary, fontWeight: '800' },
  headerTitleContainer: { flex: 1, alignItems: 'center', marginHorizontal: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
  headerSpacer: { width: 44 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },
  contentContainer: { gap: 20 },
  lectureInfoCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.borderLight, shadowColor: Colors.shadowDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  lectureHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  lectureNumberBadge: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  lectureNumberText: { fontSize: 20, fontWeight: '800', color: Colors.white },
  lectureHeaderInfo: { flex: 1 },
  chapterLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', marginBottom: 6 },
  lectureTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, lineHeight: 28, textAlign: 'right' },
  lectureTypeBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primary + '30' },
  lectureTypeIcon: { fontSize: 22 },
  descriptionContainer: { marginBottom: 16, padding: 16, backgroundColor: Colors.backgroundSoft, borderRadius: 12 },
  descriptionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  descriptionText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, textAlign: 'right' },
  typeContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  typeLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  typeValue: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
  actionsSection: { gap: 12 },
  actionsSectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.borderLight, shadowColor: Colors.shadowDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  actionIconContainer: { width: 56, height: 56, borderRadius: 14, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  actionIcon: { fontSize: 28 },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  actionSubtitle: { fontSize: 13, color: Colors.textSecondary },
  actionArrow: { fontSize: 24, color: Colors.primary, fontWeight: '800', marginLeft: 12 },
  noContentCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight },
  noContentIcon: { fontSize: 48, marginBottom: 12 },
  noContentText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  courseInfoCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: Colors.borderLight, shadowColor: Colors.shadowDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  courseInfoTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 16 },
  courseInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  courseInfoLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  courseInfoValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: 12 },
});

export default LectureDetailsScreen;