// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles lecture viewing
// 2. Open/Closed: Can be extended with new features without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for lecture details
// 4. Dependency Inversion: Depends on abstractions (services) not concretions

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
import { lecturesService } from '../services/lecturesService';
import { API_CONFIG } from '../services/apiConfig';
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
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lectureDetails, setLectureDetails] = useState<LectureDetails | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

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

    // Load lecture details
    loadLectureDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLectureDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const logs: string[] = [];
      logs.push(`🔍 Loading lecture ID: ${lectureId}`);
      logs.push(`🔑 Token: ${accessToken ? accessToken.substring(0, 30) + '...' : 'MISSING'}`);
      logs.push(`🌐 API URL: ${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LECTURE_DETAILS}/${lectureId}`);

      const response = await lecturesService.getLectureDetails(lectureId, accessToken);

      logs.push('✅ Response received!');
      logs.push(`📊 ID: ${response.id}`);
      logs.push(`📝 Title: ${response.title}`);
      logs.push(`📺 Type: ${response.type}`);
      logs.push(`🎬 YouTube: ${response.youtubeUrl || 'NULL'}`);
      logs.push(`📄 PDF: ${response.pdfFile || 'NULL'}`);
      logs.push(`📖 Content: ${response.content.name} (${response.content.code})`);
      
      setDebugInfo(logs);
      setLectureDetails(response);
    } catch (error) {
      const logs: string[] = debugInfo.length > 0 ? [...debugInfo] : [];
      logs.push('❌ ERROR OCCURRED!');
      
      const apiError = error as TrainingContentsError;
      logs.push(`⚠️ Status Code: ${apiError.statusCode || 'N/A'}`);
      logs.push(`⚠️ Message: ${apiError.message || 'N/A'}`);
      logs.push(`⚠️ Details: ${JSON.stringify(apiError.details || {}, null, 2)}`);
      
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
      case 'VIDEO':
        return 'فيديو';
      case 'PDF':
        return 'ملف PDF';
      case 'BOTH':
        return 'فيديو وملف PDF';
      default:
        return type;
    }
  };

  const handleWatchVideo = async () => {
    if (!lectureDetails?.youtubeUrl) {
      Alert.alert('تنبيه', 'لا يوجد رابط فيديو لهذه المحاضرة');
      return;
    }

    try {
      await Linking.openURL(lectureDetails.youtubeUrl);
    } catch (error) {
      Alert.alert('خطأ', 'لا يمكن فتح الفيديو');
    }
  };

  const handleDownloadPDF = () => {
    if (!lectureDetails?.pdfFile) {
      Alert.alert('تنبيه', 'لا يوجد ملف PDF لهذه المحاضرة');
      return;
    }
    
    // TODO: تحميل PDF أو فتحه
    Alert.alert('قريباً', 'ميزة تحميل PDF ستكون متاحة قريباً');
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
          <Text style={styles.headerTitle}>
            {lectureDetails?.title || 'المحاضرة'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {lectureDetails?.content.name} • الباب {lectureDetails?.chapter}
          </Text>
        </View>
        {lectureDetails && (
          <View style={styles.lectureNumberBadge}>
            <Text style={styles.lectureNumberText}>المحاضرة #{lectureDetails.order}</Text>
          </View>
        )}
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading State */}
        {isLoading && (
          <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>جاري تحميل المحاضرة...</Text>
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
            <Text style={styles.errorTitle}>فشل في تحميل المحاضرة</Text>
            <Text style={styles.errorText}>{error}</Text>
            
            {/* تفاصيل إضافية للمطور */}
            <View style={styles.errorDetails}>
              <Text style={styles.errorDetailsTitle}>تفاصيل تقنية:</Text>
              <Text style={styles.errorDetailsText}>رقم المحاضرة: {lectureId}</Text>
              <Text style={styles.errorDetailsText}>
                Access Token: {accessToken ? `${accessToken.substring(0, 20)}...` : 'غير موجود'}
              </Text>
              <Text style={styles.errorDetailsText}>
                API URL: {`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LECTURE_DETAILS}/${lectureId}`}
              </Text>
            </View>
            
            <CustomButton
              title="إعادة المحاولة"
              onPress={loadLectureDetails}
              variant="outline"
              size="medium"
            />
            <CustomButton
              title="رجوع"
              onPress={onBack}
              variant="secondary"
              size="medium"
            />
          </Animated.View>
        )}

        {/* Lecture Content */}
        {!isLoading && !error && lectureDetails && (
          <>
            {/* Debug Info Panel */}
            {debugInfo.length > 0 && (
              <Animated.View style={[styles.debugPanel, { opacity: fadeAnim }]}>
                <Text style={styles.debugTitle}>🔍 معلومات التشخيص</Text>
                {debugInfo.map((log, index) => (
                  <Text key={index} style={styles.debugText}>{log}</Text>
                ))}
              </Animated.View>
            )}

            <Animated.View
              style={[
                styles.lectureContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
            {/* Video Section */}
            {lectureDetails.youtubeUrl && (
              <View style={styles.videoSection}>
                <View style={styles.videoHeader}>
                  <Text style={styles.videoTitle}>فيديو المحاضرة</Text>
                  <View style={styles.videoIcon}>
                    <Text style={styles.videoIconText}>▶️</Text>
                  </View>
                </View>
                <Text style={styles.videoSubtitle}>مشاهدة فيديو المحاضرة</Text>
                
                {/* YouTube Video Button */}
                <TouchableOpacity
                  style={styles.videoButton}
                  onPress={handleWatchVideo}
                  activeOpacity={0.9}
                >
                  <View style={styles.playButtonLarge}>
                    <Text style={styles.playButtonIcon}>▶</Text>
                  </View>
                  <Text style={styles.videoButtonText}>مشاهدة الفيديو</Text>
                  <Text style={styles.videoButtonHint}>سيتم فتح الفيديو في YouTube</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* PDF Section */}
            {lectureDetails.pdfFile && (
              <View style={styles.pdfSection}>
                <View style={styles.pdfHeader}>
                  <Text style={styles.pdfTitle}>مادة PDF</Text>
                  <View style={styles.pdfIcon}>
                    <Text style={styles.pdfIconText}>📄</Text>
                  </View>
                </View>
                <Text style={styles.pdfSubtitle}>تحميل المادة العلمية</Text>
                
                <TouchableOpacity
                  style={styles.pdfButton}
                  onPress={handleDownloadPDF}
                  activeOpacity={0.8}
                >
                  <Text style={styles.pdfButtonIcon}>📥</Text>
                  <Text style={styles.pdfButtonText}>تحميل ملف PDF</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Lecture Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <Text style={styles.infoCardTitle}>معلومات المحاضرة</Text>
                <Text style={styles.infoCardIcon}>✅</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoValue}>#{lectureDetails.order}</Text>
                <Text style={styles.infoLabel}>رقم المحاضرة:</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoValue}>{lectureDetails.chapter}</Text>
                <Text style={styles.infoLabel}>الباب:</Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.lectureTypeBadge}>
                  <Text style={styles.lectureTypeBadgeText}>
                    {getLectureTypeText(lectureDetails.type)}
                  </Text>
                </View>
                <Text style={styles.infoLabel}>نوع المحاضرة:</Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>المحتوى المتوفر:</Text>
                
                <View style={styles.contentAvailabilityRow}>
                  <View style={[
                    styles.contentAvailabilityBadge,
                    lectureDetails.youtubeUrl ? styles.contentAvailable : styles.contentUnavailable
                  ]}>
                    <Text style={styles.contentAvailabilityIcon}>
                      {lectureDetails.youtubeUrl ? '▶️' : '❌'}
                    </Text>
                    <Text style={[
                      styles.contentAvailabilityText,
                      lectureDetails.youtubeUrl ? styles.contentAvailableText : styles.contentUnavailableText
                    ]}>
                      فيديو
                    </Text>
                  </View>
                  <Text style={styles.contentStatus}>
                    {lectureDetails.youtubeUrl ? 'متوفر' : 'غير متوفر'}
                  </Text>
                </View>

                <View style={styles.contentAvailabilityRow}>
                  <View style={[
                    styles.contentAvailabilityBadge,
                    lectureDetails.pdfFile ? styles.contentAvailable : styles.contentUnavailable
                  ]}>
                    <Text style={styles.contentAvailabilityIcon}>
                      {lectureDetails.pdfFile ? '📄' : '❌'}
                    </Text>
                    <Text style={[
                      styles.contentAvailabilityText,
                      lectureDetails.pdfFile ? styles.contentAvailableText : styles.contentUnavailableText
                    ]}>
                      مادة PDF
                    </Text>
                  </View>
                  <Text style={styles.contentStatus}>
                    {lectureDetails.pdfFile ? 'متوفر' : 'غير متوفر'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoValue}>{lectureDetails.content.name}</Text>
                <Text style={styles.infoLabel}>المقرر:</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoValue}>{lectureDetails.content.code}</Text>
                <Text style={styles.infoLabel}>كود المقرر:</Text>
              </View>
            </View>

            {/* Description */}
            {lectureDetails.description && (
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionTitle}>الوصف:</Text>
                <Text style={styles.descriptionText}>{lectureDetails.description}</Text>
              </View>
            )}

            {/* Quick Actions */}
            <View style={styles.quickActionsCard}>
              <Text style={styles.quickActionsTitle}>إجراءات سريعة</Text>
              
              {onBackToAllLectures && (
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={onBackToAllLectures}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickActionIcon}>📚</Text>
                  <Text style={styles.quickActionText}>جميع المحاضرات</Text>
                </TouchableOpacity>
              )}

              {onBackToAllContents && (
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={onBackToAllContents}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickActionIcon}>📖</Text>
                  <Text style={styles.quickActionText}>جميع المقررات</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
          </>
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
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  lectureNumberBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  lectureNumberText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: '700',
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
    marginBottom: 20,
    lineHeight: 24,
    fontWeight: '600',
  },
  debugPanel: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
    marginBottom: 12,
    textAlign: 'right',
  },
  debugText: {
    fontSize: 11,
    color: '#E5E7EB',
    marginBottom: 4,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorDetails: {
    backgroundColor: Colors.backgroundSoft,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'right',
  },
  errorDetailsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  lectureContainer: {
    gap: 20,
  },
  videoSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  videoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIconText: {
    fontSize: 16,
  },
  videoSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: 16,
  },
  videoButton: {
    width: '100%',
    minHeight: 220,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 4,
  },
  playButtonLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  playButtonIcon: {
    fontSize: 32,
    color: Colors.white,
    marginLeft: 4,
  },
  videoButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  videoButtonHint: {
    fontSize: 13,
    color: Colors.white,
    opacity: 0.7,
    textAlign: 'center',
  },
  pdfSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  pdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pdfTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  pdfIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfIconText: {
    fontSize: 16,
  },
  pdfSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: 16,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  pdfButtonIcon: {
    fontSize: 18,
  },
  pdfButtonText: {
    fontSize: 15,
    color: Colors.white,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  infoCardIcon: {
    fontSize: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'right',
  },
  infoValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  lectureTypeBadge: {
    backgroundColor: '#10B981' + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  lectureTypeBadgeText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '700',
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.borderMedium,
    marginVertical: 16,
  },
  infoSection: {
    marginBottom: 12,
  },
  infoSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: 12,
  },
  contentAvailabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  contentAvailabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  contentAvailable: {
    backgroundColor: '#10B981' + '20',
  },
  contentUnavailable: {
    backgroundColor: Colors.errorSoft,
  },
  contentAvailabilityIcon: {
    fontSize: 12,
  },
  contentAvailabilityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  contentAvailableText: {
    color: '#10B981',
  },
  contentUnavailableText: {
    color: Colors.error,
  },
  contentStatus: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  descriptionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'right',
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    textAlign: 'right',
  },
  quickActionsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'right',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: Colors.backgroundSoft,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  quickActionIcon: {
    fontSize: 18,
    marginLeft: 12,
  },
  quickActionText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
});

export default LectureViewScreen;