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
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';
import { Colors } from '../styles/colors';
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

let SafePdf: any = null;
if (Platform.OS === 'ios') {
  try {
    SafePdf = require('react-native-pdf').default;
  } catch {
    SafePdf = null;
  }
}

let SafeWebView: any = null;
try {
  SafeWebView = require('react-native-webview').WebView;
} catch {
  SafeWebView = null;
}

let SafeInAppBrowser: any = null;
try {
  SafeInAppBrowser = require('react-native-inappbrowser-reborn');
} catch {
  SafeInAppBrowser = null;
}

const LectureViewScreen: React.FC<LectureViewScreenProps> = ({
  lectureId,
  accessToken,
  onBack,
  onBackToAllLectures,
  onBackToAllContents,
}) => {
  const VIDEO_EMBEDDED_VIEWER_ENABLED = !!SafeWebView;
  const PDF_EMBEDDED_VIEWER_ENABLED = Platform.OS === 'ios' ? !!SafePdf : !!SafeWebView;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lectureDetails, setLectureDetails] = useState<LectureDetails | null>(null);
  const [activeViewer, setActiveViewer] = useState<'none' | 'video' | 'pdf'>('none');
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);

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

      const response = await lecturesService.getLectureDetails(lectureId, accessToken);
      setLectureDetails(response);
    } catch (error) {
      const apiError = error as TrainingContentsError;

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

  const extractYouTubeVideoId = (url: string): string => {
    const standardPattern = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/;
    const shortPattern = /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/;
    const embedPattern = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/;

    const match = url.match(standardPattern) || url.match(shortPattern) || url.match(embedPattern);
    return match && match[1] ? match[1] : '';
  };

  const getYouTubeInAppUrl = (url: string): string => {
    const videoId = extractYouTubeVideoId(url);

    if (!videoId) {
      return '';
    }

    // Keep playback inside a clean embedded player only.
    return `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1&controls=1&autoplay=0&fs=1`;
  };

  const normalizeExternalUrl = (rawUrl: string): string => {
    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl) {
      return '';
    }

    if (/^https?:\/\//i.test(trimmedUrl)) {
      return trimmedUrl;
    }

    if (/^www\./i.test(trimmedUrl)) {
      return `https://${trimmedUrl}`;
    }

    // Backend may return youtube links without scheme.
    if (/^(youtube\.com|m\.youtube\.com|youtu\.be)\//i.test(trimmedUrl)) {
      return `https://${trimmedUrl}`;
    }

    return trimmedUrl;
  };

  const getYouTubeExternalUrl = (url: string): string => {
    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      return `https://youtu.be/${videoId}`;
    }
    return normalizeExternalUrl(url);
  };

  const getYouTubeEmbedHtml = (embedUrl: string): string => `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: #000;
            overflow: hidden;
          }
          .player {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            border: 0;
          }
        </style>
      </head>
      <body>
        <iframe
          class="player"
          src="${embedUrl}"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
          frameborder="0"
        ></iframe>
      </body>
    </html>
  `;

  const getPdfUrl = (pdfFile: string): string => {
    if (pdfFile.startsWith('http')) {
      return pdfFile;
    }

    if (pdfFile.startsWith('/')) {
      return `${API_CONFIG.BASE_URL}${pdfFile}`;
    }

    return `${API_CONFIG.BASE_URL}/${pdfFile}`;
  };

  const getPdfInAppUrl = (url: string): string => {
    if (!url) {
      return '';
    }
    if (Platform.OS === 'ios') {
      return url;
    }
    // Android: render PDF inside app through Google Docs viewer WebView.
    return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
  };

  const pdfUrl = lectureDetails?.pdfFile ? getPdfUrl(lectureDetails.pdfFile) : '';
  const pdfInAppUrl = pdfUrl ? getPdfInAppUrl(pdfUrl) : '';
  const youtubeInAppUrl = lectureDetails?.youtubeUrl ? getYouTubeInAppUrl(lectureDetails.youtubeUrl) : '';
  const youtubeExternalUrl = lectureDetails?.youtubeUrl ? getYouTubeExternalUrl(lectureDetails.youtubeUrl) : '';

  const openExternalUrl = async (url: string, typeLabel: string) => {
    const resolvedUrl = normalizeExternalUrl(url);
    if (!resolvedUrl) {
      Alert.alert('رابط غير متاح', `لا يوجد رابط ${typeLabel} صالح حالياً.`);
      return;
    }

    try {
      const isWebUrl = /^https?:\/\//i.test(resolvedUrl);

      // canOpenURL may return false on some Android devices for valid web links.
      if (isWebUrl) {
        await Linking.openURL(resolvedUrl);
        return;
      }

      const supported = await Linking.canOpenURL(resolvedUrl);
      if (!supported) {
        Alert.alert('تعذر الفتح', `لا يمكن فتح ${typeLabel} على هذا الجهاز.`);
        return;
      }

      await Linking.openURL(resolvedUrl);
    } catch {
      Alert.alert('خطأ', `حدث خطأ أثناء فتح ${typeLabel}.`);
    }
  };

  const openInAppOrExternalUrl = async (url: string, typeLabel: string) => {
    const resolvedUrl = normalizeExternalUrl(url);
    if (!resolvedUrl) {
      Alert.alert('رابط غير متاح', `لا يوجد رابط ${typeLabel} صالح حالياً.`);
      return;
    }

    const isWebUrl = /^https?:\/\//i.test(resolvedUrl);
    if (!isWebUrl || !SafeInAppBrowser?.isAvailable || !SafeInAppBrowser?.open) {
      await openExternalUrl(resolvedUrl, typeLabel);
      return;
    }

    try {
      const available = await SafeInAppBrowser.isAvailable();
      if (!available) {
        await openExternalUrl(resolvedUrl, typeLabel);
        return;
      }

      await SafeInAppBrowser.open(resolvedUrl, {
        dismissButtonStyle: 'close',
        preferredBarTintColor: Colors.primary,
        preferredControlTintColor: Colors.white,
        showTitle: true,
        toolbarColor: Colors.primary,
        secondaryToolbarColor: Colors.primaryDark,
        navigationBarColor: Colors.backgroundDark,
        navigationBarDividerColor: Colors.borderLight,
        enableUrlBarHiding: true,
        enableDefaultShare: false,
        forceCloseOnRedirection: false,
      });
    } catch (inAppError) {
      console.log('In-app browser failed, fallback to external URL:', inAppError);
      await openExternalUrl(resolvedUrl, typeLabel);
    }
  };

  const closeViewer = () => {
    setActiveViewer('none');
    setVideoLoadError(null);
    setPdfLoadError(null);
  };

  if (VIDEO_EMBEDDED_VIEWER_ENABLED && activeViewer === 'video') {
    return (
      <SafeAreaView style={s.container}>
        <ScreenHeader
          title={lectureDetails?.title || 'فيديو المحاضرة'}
          subtitle="عرض الفيديو داخل التطبيق"
          onBack={closeViewer}
        />

        {SafeWebView && youtubeInAppUrl ? (
          <SafeWebView
            source={{ html: getYouTubeEmbedHtml(youtubeInAppUrl), baseUrl: 'https://www.youtube-nocookie.com' }}
            style={s.videoWebView}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            originWhitelist={['*']}
            startInLoadingState
            onShouldStartLoadWithRequest={(request: any) => {
              const url = request?.url || '';
              if (
                url.startsWith('about:blank') ||
                url.startsWith('data:') ||
                url.includes('youtube-nocookie.com/embed/') ||
                url.includes('youtube.com/embed/')
              ) {
                return true;
              }
              if (url.startsWith('intent:') || url.startsWith('vnd.youtube')) {
                return false;
              }
              openExternalUrl(url, 'الفيديو');
              return false;
            }}
            onHttpError={() => {
              setVideoLoadError('تعذر تحميل الفيديو داخل التطبيق.');
            }}
            onError={() => {
              setVideoLoadError('حدث خطأ أثناء تحميل الفيديو داخل التطبيق.');
            }}
            onRenderProcessGone={() => {
              setVideoLoadError('تم إيقاف عارض الفيديو تلقائياً بسبب ضغط الذاكرة.');
            }}
            renderLoading={() => (
              <View style={s.centeredViewer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={s.viewerLoadingText}>جاري تحميل الفيديو...</Text>
              </View>
            )}
          />
        ) : (
          <View style={s.centeredViewer}>
            <Text style={s.errorText}>رابط الفيديو غير صالح أو العارض غير متاح.</Text>
          </View>
        )}

        <View style={s.viewerFooter}>
          <CustomButton
            title="فتح على يوتيوب"
            onPress={() => openExternalUrl(youtubeExternalUrl, 'الفيديو')}
            variant="outline"
            size="medium"
          />
          {videoLoadError ? <Text style={s.viewerErrorText}>{videoLoadError}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  if (PDF_EMBEDDED_VIEWER_ENABLED && activeViewer === 'pdf') {
    return (
      <SafeAreaView style={s.container}>
        <ScreenHeader
          title={lectureDetails?.title || 'ملف PDF'}
          subtitle="عرض ملف PDF داخل التطبيق"
          onBack={closeViewer}
        />

        {Platform.OS === 'ios' && SafePdf && pdfUrl ? (
          <View style={s.pdfViewerWrap}>
            <SafePdf
              source={{ uri: pdfUrl, cache: true }}
              style={s.pdfViewer}
              trustAllCerts={false}
              onError={(pdfError: any) => {
                const message = pdfError?.message || 'تعذر تحميل ملف PDF';
                setPdfLoadError(message);
              }}
            />
          </View>
        ) : SafeWebView && pdfInAppUrl ? (
          <SafeWebView
            source={{ uri: pdfInAppUrl }}
            style={s.videoWebView}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            originWhitelist={["https://*", "http://*"]}
            onError={() => {
              setPdfLoadError('حدث خطأ أثناء تحميل PDF داخل التطبيق.');
            }}
            onHttpError={() => {
              setPdfLoadError('تعذر تحميل PDF داخل التطبيق.');
            }}
            onRenderProcessGone={() => {
              setPdfLoadError('تم إيقاف عارض PDF تلقائياً بسبب ضغط الذاكرة.');
            }}
            renderLoading={() => (
              <View style={s.centeredViewer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={s.viewerLoadingText}>جاري تحميل ملف PDF...</Text>
              </View>
            )}
          />
        ) : (
          <View style={s.centeredViewer}>
            <Text style={s.errorText}>عارض PDF غير متاح حالياً.</Text>
          </View>
        )}

        <View style={s.viewerFooter}>
          <CustomButton
            title="فتح PDF خارج التطبيق"
            onPress={() => openExternalUrl(pdfUrl, 'ملف PDF')}
            variant="outline"
            size="medium"
          />
          {pdfLoadError ? <Text style={s.viewerErrorText}>{pdfLoadError}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

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
            {/* Video Section */}
            {lectureDetails.youtubeUrl && (
              <View style={s.card}>
                <View style={s.cardHeadRow}>
                  <View style={[s.cardHeadIcon, { backgroundColor: Colors.errorLight }]}>
                    <Text style={{ fontSize: 18 }}>▶️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardHeadTitle}>فيديو المحاضرة</Text>
                    <Text style={s.cardHeadSub}>تشغيل الفيديو داخل التطبيق</Text>
                  </View>
                </View>
                <View style={s.fallbackBox}>
                  <Text style={s.fallbackText}>
                    {VIDEO_EMBEDDED_VIEWER_ENABLED
                      ? 'سيتم فتح الفيديو داخل عارض داخلي مخصص.'
                      : 'عارض الفيديو غير متاح حالياً، سيتم فتحه خارج التطبيق.'}
                  </Text>
                </View>

                <View style={{ marginTop: 10 }}>
                  <CustomButton
                    title={VIDEO_EMBEDDED_VIEWER_ENABLED ? 'تشغيل الفيديو' : 'فتح الفيديو'}
                    onPress={() => {
                      setVideoLoadError(null);
                      if (VIDEO_EMBEDDED_VIEWER_ENABLED) {
                        setActiveViewer('video');
                      } else {
                        openInAppOrExternalUrl(youtubeExternalUrl, 'الفيديو');
                      }
                    }}
                    variant="outline"
                    size="medium"
                  />
                </View>
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
                    <Text style={s.cardHeadSub}>عرض ملف PDF داخل التطبيق</Text>
                  </View>
                </View>
                {PDF_EMBEDDED_VIEWER_ENABLED && SafePdf && pdfUrl ? (
                  <View style={s.fallbackBox}>
                    <Text style={s.fallbackText}>سيتم فتح ملف PDF داخل عارض داخلي مخصص.</Text>
                  </View>
                ) : (
                  <View style={s.fallbackBox}>
                    <Text style={s.fallbackText}>
                      {PDF_EMBEDDED_VIEWER_ENABLED
                        ? 'سيتم عرض PDF داخل التطبيق.'
                        : 'عارض PDF غير متاح حالياً، سيتم فتحه خارج التطبيق.'}
                    </Text>
                  </View>
                )}

                <View style={{ marginTop: 10 }}>
                  <CustomButton
                    title={PDF_EMBEDDED_VIEWER_ENABLED ? 'عرض ملف PDF' : 'فتح ملف PDF'}
                    onPress={() => {
                      setPdfLoadError(null);
                      if (PDF_EMBEDDED_VIEWER_ENABLED) {
                        setActiveViewer('pdf');
                      } else {
                        openInAppOrExternalUrl(pdfUrl, 'ملف PDF');
                      }
                    }}
                    variant="outline"
                    size="medium"
                  />
                </View>
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
  fallbackBox: {
    borderRadius: 12,
    backgroundColor: Colors.errorLight,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: { fontSize: 13, fontWeight: '600', color: Colors.error, textAlign: 'center' },
  pdfFrame: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundAlt,
    minHeight: 480,
  },
  pdfView: {
    width: '100%',
    height: 480,
    backgroundColor: Colors.backgroundAlt,
  },
  pdfErrorText: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.error,
    textAlign: 'right',
    fontWeight: '600',
  },
  videoWebView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centeredViewer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
  },
  viewerLoadingText: {
    marginTop: 10,
    color: Colors.textHint,
    fontWeight: '600',
  },
  viewerFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  viewerErrorText: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.error,
    textAlign: 'right',
    fontWeight: '600',
  },
  pdfViewerWrap: {
    flex: 1,
    backgroundColor: Colors.backgroundAlt,
  },
  pdfViewer: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.backgroundAlt,
  },
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
});

export default LectureViewScreen;
