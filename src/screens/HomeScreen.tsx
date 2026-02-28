// HomeScreen - main dashboard matching the web design
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, Image, Dimensions, ActivityIndicator,
} from 'react-native';
import { AuthService } from '../services/authService';
import { HomeService, GradeAppeal, AccessCheckResponse, AttendanceSummary } from '../services/homeService';
import { TraineeDocument, DocumentType } from '../types/auth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HomeScreenProps {
  userInfo?: {
    nameAr: string;
    nameEn: string;
    nationalId: string;
    photoUrl?: string;
    accessToken?: string;
  };
  onNavigateToSchedule?: () => void;
  onNavigateToExams?: () => void;
  onNavigateToGrades?: () => void;
  onNavigateToAttendance?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToDocuments?: () => void;
  onNavigateToPayments?: () => void;
  onNavigateToTrainingContents?: () => void;
  onNavigateToStudentRequests?: () => void;
  onNavigateToRegisterAttendance?: () => void;
  onNavigateToAcademicResults?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  userInfo, onNavigateToSchedule, onNavigateToExams, onNavigateToGrades,
  onNavigateToAttendance, onNavigateToProfile, onNavigateToDocuments,
  onNavigateToPayments, onNavigateToTrainingContents, onNavigateToStudentRequests,
  onNavigateToRegisterAttendance, onNavigateToAcademicResults,
}) => {
  const [studentPhotoUrl, setStudentPhotoUrl] = useState<string | undefined>(userInfo?.photoUrl);
  const [gradeAppeals, setGradeAppeals] = useState<GradeAppeal[]>([]);
  const [accessCheck, setAccessCheck] = useState<AccessCheckResponse | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [loadingAppeals, setLoadingAppeals] = useState(true);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [documents, setDocuments] = useState<TraineeDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const DOC_TYPE_LABELS: Record<string, string> = {
    [DocumentType.NATIONAL_ID]: 'بطاقة الهوية',
    [DocumentType.BIRTH_CERTIFICATE]: 'شهادة الميلاد',
    [DocumentType.QUALIFICATION_CERTIFICATE]: 'شهادة المؤهل',
    [DocumentType.MILITARY_SERVICE]: 'التجنيد',
    [DocumentType.MEDICAL_CERTIFICATE]: 'الشهادة الطبية',
    [DocumentType.PHOTOS]: 'صورة شخصية',
    [DocumentType.OTHER]: 'أخرى',
  };

  // Required document types (excluding OTHER)
  const REQUIRED_DOC_TYPES = [
    DocumentType.NATIONAL_ID,
    DocumentType.BIRTH_CERTIFICATE,
    DocumentType.QUALIFICATION_CERTIFICATE,
    DocumentType.MILITARY_SERVICE,
    DocumentType.MEDICAL_CERTIFICATE,
    DocumentType.PHOTOS,
  ];

  const loadStudentPhoto = useCallback(async () => {
    try {
      if (!userInfo?.accessToken) return;
      const profile = await AuthService.getProfile(userInfo.accessToken);
      if (profile?.trainee?.photoUrl) setStudentPhotoUrl(profile.trainee.photoUrl);
      // Also extract documents from profile
      const trainee = profile?.trainee;
      if (trainee && Array.isArray(trainee.documents)) {
        setDocuments(trainee.documents);
      }
    } catch (err) { console.log('Could not load profile photo', err); }
    finally { setLoadingDocs(false); }
  }, [userInfo?.accessToken]);

  const loadGradeAppeals = useCallback(async () => {
    try {
      if (!userInfo?.accessToken) return;
      const appeals = await HomeService.getGradeAppeals(userInfo.accessToken);
      setGradeAppeals(appeals);
    } catch (err) {
      console.log('Could not load grade appeals', err);
    } finally {
      setLoadingAppeals(false);
    }
  }, [userInfo?.accessToken]);

  const loadAccessCheck = useCallback(async () => {
    try {
      if (!userInfo?.accessToken) return;
      const check = await HomeService.checkAccess(userInfo.accessToken);
      setAccessCheck(check);
    } catch (err) {
      console.log('Could not check access', err);
    } finally {
      setLoadingAccess(false);
    }
  }, [userInfo?.accessToken]);

  const loadAttendance = useCallback(async () => {
    try {
      if (!userInfo?.accessToken) return;
      const data = await HomeService.getAttendanceRecords(userInfo.accessToken);
      setAttendanceSummary(data.summary);
    } catch (err) {
      console.log('Could not load attendance', err);
    } finally {
      setLoadingAttendance(false);
    }
  }, [userInfo?.accessToken]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    if (!userInfo?.photoUrl) loadStudentPhoto();
    loadGradeAppeals();
    loadAccessCheck();
    loadAttendance();
  }, [fadeAnim, slideAnim, loadStudentPhoto, loadGradeAppeals, loadAccessCheck, loadAttendance, userInfo?.photoUrl]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? 'صباح الخير' : 'مساء الخير';
  };

  const pendingAppeals = gradeAppeals.filter(a => a.status === 'pending').length;
  const approvedAppeals = gradeAppeals.filter(a => a.status === 'approved').length;
  const hasGradeResults = gradeAppeals.length > 0;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ===== HEADER SECTION ===== */}
        <Animated.View style={[s.headerSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={s.headerTop}>
            <TouchableOpacity style={s.profileBtn} onPress={() => onNavigateToProfile?.()}>
              {studentPhotoUrl ? (
                <Image source={{ uri: studentPhotoUrl }} style={s.profileImage} />
              ) : (
                <View style={s.profileDefault}>
                  <Text style={s.profileDefaultText}>{userInfo?.nameAr?.charAt(0) || 'ط'}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={s.headerTextArea}>
              <View style={s.greetingRow}>
                <Text style={s.greetingEmoji}>👋</Text>
                <Text style={s.greetingName}>{getGreeting()} {userInfo?.nameAr?.split(' ')[0] || 'متدرب'}!</Text>
              </View>
              <Text style={s.headerSubtitle}>مرحباً بك في منصة المتدربين - طيبة للعلوم المنصورة</Text>
              <View style={s.helperBadge}>
                <Text style={s.helperBadgeText}>مساعد خدمات هميه</Text>
                <Text style={s.helperBadgeIcon}>⭐</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ===== NOTIFICATION BANNER ===== */}
        {hasGradeResults && (
          <Animated.View style={[s.notifBanner, { opacity: fadeAnim }]}>  
            <TouchableOpacity style={s.viewResultsBtn} onPress={() => onNavigateToAcademicResults?.()}>
              <Text style={s.viewResultsBtnIcon}>📋</Text>
              <Text style={s.viewResultsBtnText}>عرض النتائج</Text>
            </TouchableOpacity>
            <View style={s.notifTextArea}>
              <View style={s.notifRow}>
                <Text style={s.notifIcon}>✅</Text>
                <Text style={s.notifTitle}>تم إعلان نتائج الفترة الأولى</Text>
              </View>
              <Text style={s.notifSub}>نتائج الفصل الأول متاحة للعرض الآن</Text>
            </View>
          </Animated.View>
        )}

        {/* ===== DASHBOARD CARDS ===== */}
        <Animated.View style={[s.cardsSection, { opacity: fadeAnim }]}>
          {/* Row 1: Attendance + Financial Status */}
          <View style={s.cardsRow}>
            {/* Attendance Card */}
            <TouchableOpacity style={s.dashCard} onPress={() => onNavigateToAttendance?.()} activeOpacity={0.7}>
              <View style={s.cardHeader}>
                <View style={[s.cardIconCircle, { backgroundColor: '#E8F8F5' }]}>
                  <Text style={s.cardIconText}>✅</Text>
                </View>
                <Text style={s.cardTitle}>نسبة الحضور</Text>
              </View>
              <View style={s.attendanceContent}>
                {loadingAttendance ? (
                  <ActivityIndicator size="small" color="#0D9488" />
                ) : (
                  <>
                    <View style={[
                      s.attendanceCircle,
                      (attendanceSummary?.attendancePercentage ?? 0) < 75 && { borderColor: '#DC2626' },
                    ]}>
                      <Text style={[
                        s.attendancePercent,
                        (attendanceSummary?.attendancePercentage ?? 0) < 75 && { color: '#DC2626' },
                      ]}>
                        {attendanceSummary?.attendancePercentage ?? 0}%
                      </Text>
                    </View>
                    <Text style={s.cardSubInfo}>
                      {attendanceSummary?.present ?? 0} من {attendanceSummary?.total ?? 0} محاضرة
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* Financial Status Card */}
            <TouchableOpacity style={s.dashCard} onPress={() => onNavigateToPayments?.()} activeOpacity={0.7}>
              <View style={s.cardHeader}>
                <View style={[s.cardIconCircle, { backgroundColor: '#FFF8E1' }]}>
                  <Text style={s.cardIconText}>💰</Text>
                </View>
                <Text style={s.cardTitle}>الحالة المالية</Text>
              </View>
              <View style={s.financeContent}>
                {loadingAccess ? (
                  <ActivityIndicator size="small" color="#0D9488" />
                ) : (
                  <>
                    <View style={s.financeRow}>
                      <Text style={s.financeLabel}>الإجمالي</Text>
                      <Text style={s.financeAmount}>8000 ج.م</Text>
                    </View>
                    <View style={s.financeDivider} />
                    <View style={s.financeRow}>
                      <View style={[s.statusBadge, { backgroundColor: '#DCFCE7' }]}>
                        <Text style={[s.statusBadgeText, { color: '#16A34A' }]}>المتبقي</Text>
                      </View>
                      <Text style={[s.financeAmount, { color: '#DC2626' }]}>4400 ج.م</Text>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Row 2: Documents + Register Attendance */}
          <View style={s.cardsRow}>
            {/* Documents Card */}
            <TouchableOpacity style={s.dashCard} onPress={() => onNavigateToDocuments?.()} activeOpacity={0.7}>
              <View style={s.cardHeader}>
                <View style={[s.cardIconCircle, { backgroundColor: '#EDE9FE' }]}>
                  <Text style={s.cardIconText}>📄</Text>
                </View>
                <Text style={s.cardTitle}>الوثائق المطلوبة</Text>
              </View>
              <View style={s.docsContent}>
                {loadingDocs ? (
                  <ActivityIndicator size="small" color="#7C3AED" />
                ) : documents.length === 0 ? (
                  <>
                    <Text style={s.docsCount}>لا توجد وثائق مرفوعة</Text>
                    <View style={s.docsProgressBar}>
                      <View style={[s.docsProgressFill, { width: '0%' }]} />
                    </View>
                    <Text style={[s.docsCount, { fontSize: 11, color: '#9CA3AF', marginTop: 4 }]}>0 من {REQUIRED_DOC_TYPES.length} وثائق مطلوبة</Text>
                  </>
                ) : (
                  <>
                    <Text style={s.docsCount}>
                      {documents.length} من {REQUIRED_DOC_TYPES.length} وثائق مطلوبة
                    </Text>
                    <View style={s.docsProgressBar}>
                      <View style={[s.docsProgressFill, { width: `${Math.min(Math.round((documents.length / REQUIRED_DOC_TYPES.length) * 100), 100)}%` }]} />
                    </View>
                    <View style={s.docsStatusRow}>
                      {documents.slice(0, 2).map((doc) => (
                        <View key={doc.id} style={s.docsStatusItem}>
                          <View style={[s.docsStatusDot, { backgroundColor: doc.isVerified ? '#10B981' : '#F59E0B' }]} />
                          <Text style={s.docsStatusText} numberOfLines={1}>
                            {DOC_TYPE_LABELS[doc.documentType] || doc.fileName || 'وثيقة'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
                <TouchableOpacity style={s.docsLink} onPress={() => onNavigateToDocuments?.()}>
                  <Text style={s.docsLinkText}>عرض جميع الوثائق ←</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {/* Register Attendance Card */}
            <TouchableOpacity style={[s.dashCard, s.attendRegistCard]} onPress={() => onNavigateToRegisterAttendance?.()} activeOpacity={0.7}>
              <View style={s.cardHeader}>
                <Text style={s.attendRegTitle}>تسجيل الحضور</Text>
                <Text style={s.attendRegBadge}>متاح</Text>
              </View>
              <Text style={s.attendRegSub}>سجل حضورك عبر الكود أو مسح QR</Text>
              <View style={s.qrPlaceholder}>
                <View style={s.qrBox}>
                  <Text style={s.qrText}>QR</Text>
                </View>
              </View>
              <TouchableOpacity style={s.startNowBtn} onPress={() => onNavigateToRegisterAttendance?.()}>
                <Text style={s.startNowBtnText}>بدأ الآن</Text>
                <Text style={s.startNowArrow}>▶</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ===== TRAINING CONTENT (Video Section) ===== */}
        {onNavigateToTrainingContents && (
          <TouchableOpacity style={s.videoCard} onPress={() => onNavigateToTrainingContents()} activeOpacity={0.7}>
            <View style={s.videoCardInner}>
              <View style={s.videoThumbnail}>
                <View style={s.videoPlayBtn}>
                  <Text style={s.videoPlayIcon}>▶</Text>
                </View>
                <View style={s.videoOverlay}>
                  <Text style={s.videoTimestamp}>00:00 / 45:30</Text>
                </View>
              </View>
              <View style={s.videoInfo}>
                <Text style={s.videoTitle}>📚 المحتوى التدريبي</Text>
                <Text style={s.videoSub}>هل يمكنك شرح هذه المحاضرة مرة أخرى؟</Text>
                <View style={s.videoProgress}>
                  <View style={s.videoProgressBar}>
                    <View style={[s.videoProgressFill, { width: '35%' }]} />
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* ===== AI ASSISTANT SECTION ===== */}
        <View style={s.aiSection}>
          <View style={s.aiHeader}>
            <Text style={s.aiTitle}>المساعد الذكي AI</Text>
            <View style={s.aiBadge}>
              <Text style={s.aiBadgeText}>مرحباً</Text>
            </View>
          </View>
          <Text style={s.aiSubtitle}>يمكنك التحدث مع المساعد الذكي في أي وقت</Text>
          <Text style={s.aiDesc}>
            تعمل على مفاهيم ومحتوى المنشأت الاستعداديه لمراجعاتك في المحاضرات
            {'\n'}الاتوقفين ستساعد من الايام على أسئلتك بالنصوص والاجابة لتحسين المحاضرات
            {'\n'}ومساعدتك في فهم المواد المعقدة خطوة بخطوة
          </Text>
          <View style={s.aiButtonsRow}>
            <TouchableOpacity style={s.aiBtn}>
              <Text style={s.aiBtnIcon}>🎤</Text>
              <Text style={s.aiBtnText}>تفاعل صوتي</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.aiBtn, s.aiBtnOutline]}>
              <Text style={s.aiBtnIcon}>💬</Text>
              <Text style={[s.aiBtnText, s.aiBtnOutlineText]}>محادثة نصية</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== GRADE APPEALS SECTION ===== */}
        {gradeAppeals.length > 0 && (
          <View style={s.appealsSection}>
            <View style={s.appealsSectionHeader}>
              <Text style={s.appealsSectionTitle}>طلبات مراجعة الدرجات</Text>
              <View style={s.appealsCountBadge}>
                <Text style={s.appealsCountText}>{gradeAppeals.length}</Text>
              </View>
            </View>
            {gradeAppeals.slice(0, 3).map((appeal) => (
              <View key={appeal.id} style={s.appealItem}>
                <View style={s.appealRow}>
                  <View style={[
                    s.appealStatusBadge,
                    appeal.status === 'approved' && { backgroundColor: '#DCFCE7' },
                    appeal.status === 'rejected' && { backgroundColor: '#FEE2E2' },
                    appeal.status === 'pending' && { backgroundColor: '#FFF8E1' },
                  ]}>
                    <Text style={[
                      s.appealStatusText,
                      appeal.status === 'approved' && { color: '#16A34A' },
                      appeal.status === 'rejected' && { color: '#DC2626' },
                      appeal.status === 'pending' && { color: '#D97706' },
                    ]}>
                      {appeal.status === 'approved' ? 'تمت الموافقة' : appeal.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                    </Text>
                  </View>
                  <View style={s.appealInfo}>
                    <Text style={s.appealCourse}>المادة #{appeal.courseId}</Text>
                    <Text style={s.appealGrades}>الدرجة: {appeal.currentGrade} → {appeal.requestedGrade}</Text>
                  </View>
                </View>
              </View>
            ))}
            {gradeAppeals.length > 3 && (
              <TouchableOpacity style={s.viewAllAppeals} onPress={() => onNavigateToGrades?.()}>
                <Text style={s.viewAllAppealsText}>عرض جميع الطلبات ({gradeAppeals.length})</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ===== QUICK ACTIONS ===== */}
        <View style={s.quickSection}>
          <Text style={s.quickSectionTitle}>الوصول السريع</Text>
          <View style={s.quickGrid}>
            {[
              { icon: '📅', label: 'الجدول', onPress: onNavigateToSchedule, color: '#EFF6FF' },
              { icon: '📝', label: 'الاختبارات', onPress: onNavigateToExams, color: '#FFF8E1' },
              { icon: '📊', label: 'الدرجات', onPress: onNavigateToGrades, color: '#E8F8F5' },
              { icon: '📋', label: 'الطلبات', onPress: onNavigateToStudentRequests, color: '#EDE9FE' },
              { icon: '📚', label: 'المحتوى', onPress: onNavigateToTrainingContents, color: '#FFF1F2' },
              { icon: '👤', label: 'الملف', onPress: onNavigateToProfile, color: '#F0F9FF' },
            ].map((action, i) => (
              <TouchableOpacity key={i} style={s.quickItem} onPress={() => action.onPress?.()}>
                <View style={[s.quickIconCircle, { backgroundColor: action.color }]}>
                  <Text style={s.quickIcon}>{action.icon}</Text>
                </View>
                <Text style={s.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  // ===== CONTAINER =====
  container: {
    flex: 1,
    backgroundColor: '#E8F8F5',
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // ===== HEADER =====
  headerSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E8F8F5',
    marginRight: 12,
  },
  profileImage: {
    width: 52,
    height: 52,
  },
  profileDefault: {
    width: 52,
    height: 52,
    backgroundColor: '#E8F8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDefaultText: {
    color: '#0D9488',
    fontWeight: '800',
    fontSize: 20,
  },
  headerTextArea: {
    flex: 1,
    alignItems: 'flex-end',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  greetingEmoji: {
    fontSize: 20,
    marginLeft: 6,
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0D9488',
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginBottom: 8,
  },
  helperBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  helperBadgeText: {
    fontSize: 11,
    color: '#0D9488',
    fontWeight: '600',
    marginRight: 4,
  },
  helperBadgeIcon: {
    fontSize: 12,
  },

  // ===== NOTIFICATION BANNER =====
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  notifTextArea: {
    flex: 1,
    alignItems: 'flex-end',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  notifIcon: {
    fontSize: 14,
    marginLeft: 6,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D9488',
    textAlign: 'right',
  },
  notifSub: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'right',
  },
  viewResultsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewResultsBtnIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  viewResultsBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // ===== CARDS SECTION =====
  cardsSection: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dashCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  cardIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  cardIconText: {
    fontSize: 16,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'right',
  },

  // Attendance Card
  attendanceContent: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  attendanceCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  attendancePercent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D9488',
  },
  cardSubInfo: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Finance Card
  financeContent: {
    paddingVertical: 4,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  financeLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  financeAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  financeDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Documents Card
  docsContent: {
    paddingVertical: 4,
  },
  docsCount: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 6,
  },
  docsProgressBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  docsProgressFill: {
    height: 6,
    backgroundColor: '#0D9488',
    borderRadius: 3,
  },
  docsStatusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  docsStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docsStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },
  docsStatusText: {
    fontSize: 10,
    color: '#6B7280',
  },
  docsLink: {
    alignItems: 'flex-end',
  },
  docsLinkText: {
    fontSize: 11,
    color: '#0D9488',
    fontWeight: '600',
  },

  // Register Attendance Card
  attendRegistCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  attendRegTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'right',
  },
  attendRegBadge: {
    fontSize: 10,
    color: '#0D9488',
    fontWeight: '700',
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  attendRegSub: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'right',
    marginBottom: 8,
  },
  qrPlaceholder: {
    alignItems: 'center',
    marginBottom: 8,
  },
  qrBox: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  qrText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  startNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    paddingVertical: 8,
    borderRadius: 10,
  },
  startNowBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
  startNowArrow: {
    color: '#FFF',
    fontSize: 10,
  },

  // ===== VIDEO CARD =====
  videoCard: {
    marginHorizontal: 16,
    marginTop: 2,
    backgroundColor: '#1F2937',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  videoCardInner: {
    flexDirection: 'column',
  },
  videoThumbnail: {
    height: 140,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  videoPlayBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayIcon: {
    fontSize: 20,
    color: '#FFF',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    flexDirection: 'row',
  },
  videoTimestamp: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  videoInfo: {
    padding: 14,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'right',
    marginBottom: 4,
  },
  videoSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
    marginBottom: 8,
  },
  videoProgress: {
    marginTop: 4,
  },
  videoProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  videoProgressFill: {
    height: 4,
    backgroundColor: '#0D9488',
    borderRadius: 2,
  },

  // ===== AI ASSISTANT =====
  aiSection: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginLeft: 8,
  },
  aiBadge: {
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  aiBadgeText: {
    fontSize: 11,
    color: '#0D9488',
    fontWeight: '600',
  },
  aiSubtitle: {
    fontSize: 12,
    color: '#0D9488',
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 6,
  },
  aiDesc: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 14,
  },
  aiButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  aiBtnOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0D9488',
  },
  aiBtnIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  aiBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  aiBtnOutlineText: {
    color: '#0D9488',
  },

  // ===== GRADE APPEALS =====
  appealsSection: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  appealsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  appealsSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
    marginLeft: 8,
  },
  appealsCountBadge: {
    backgroundColor: '#0D9488',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appealsCountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  appealItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  appealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  appealInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 8,
  },
  appealCourse: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'right',
  },
  appealGrades: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 2,
  },
  appealStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  appealStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  viewAllAppeals: {
    alignItems: 'center',
    paddingTop: 8,
  },
  viewAllAppealsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },

  // ===== QUICK ACTIONS =====
  quickSection: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  quickSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'right',
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickItem: {
    width: (SCREEN_WIDTH - 56) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  quickIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickIcon: {
    fontSize: 20,
  },
  quickLabel: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '700',
  },
});

export default HomeScreen;
