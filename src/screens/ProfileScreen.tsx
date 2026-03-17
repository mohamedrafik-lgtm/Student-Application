// Profile Screen - redesigned to mirror trainee web profile layout
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../services/authService';
import { TraineeProfile, TraineeProfileError } from '../types/auth';
import CustomButton from '../components/CustomButton';
import ScreenHeader from '../components/shared/ScreenHeader';
import { Colors } from '../styles/colors';
import { API_CONFIG } from '../services/apiConfig';

interface ProfileScreenProps {
  accessToken: string;
  onBack: () => void;
  onNavigateToDocuments?: () => void;
  onNavigateToPayments?: () => void;
  onNavigateToSchedule?: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  accessToken,
  onBack,
  onNavigateToDocuments,
  onNavigateToPayments,
  onNavigateToSchedule,
}) => {
  const [profile, setProfile] = useState<TraineeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!profile) {
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [profile, fadeAnim, slideAnim]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const profileData = await AuthService.getProfile(accessToken);
      setProfile(profileData);
    } catch (e) {
      const apiError = e as TraineeProfileError;
      let errorMessage = 'حدث خطأ أثناء تحميل بيانات البروفايل';

      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      } else if (apiError.statusCode === 0) {
        errorMessage = apiError.message;
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CURRENT':
        return '#10B981';
      case 'GRADUATE':
        return '#3B82F6';
      case 'WITHDRAWN':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CURRENT':
        return 'متدرب حالي';
      case 'GRADUATE':
        return 'خريج';
      case 'WITHDRAWN':
        return 'منسحب';
      case 'NEW':
        return 'مستجد';
      default:
        return status;
    }
  };

  const getEducationLabel = (education: string) => {
    const labels: Record<string, string> = {
      PREPARATORY: 'إعدادي',
      INDUSTRIAL_SECONDARY: 'ثانوي فني صناعي',
      COMMERCIAL_SECONDARY: 'ثانوي فني تجاري',
      AGRICULTURAL_SECONDARY: 'ثانوي فني زراعي',
      AZHAR_SECONDARY: 'ثانوي أزهري',
      GENERAL_SECONDARY: 'ثانوي عام',
      UNIVERSITY: 'بكالوريوس - ليسانس',
      INDUSTRIAL_APPRENTICESHIP: 'تلمذة صناعية',
    };

    return labels[education] || education || '—';
  };

  const getMaritalStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      SINGLE: 'أعزب',
      MARRIED: 'متزوج',
      DIVORCED: 'مطلق',
      WIDOWED: 'أرمل',
    };

    return labels[status] || status || '—';
  };

  const getReligionLabel = (religion: string) => {
    const labels: Record<string, string> = {
      ISLAM: 'الإسلام',
      CHRISTIANITY: 'المسيحية',
      JUDAISM: 'اليهودية',
    };

    return labels[religion] || religion || '—';
  };

  const getEnrollmentLabel = (type: string) => {
    if (type === 'REGULAR') return 'انتظام (حضور فعلي)';
    if (type === 'DISTANCE') return 'انتساب (أونلاين)';
    if (type === 'BOTH') return 'مدمج (حضور + أونلاين)';
    return type || '—';
  };

  const getClassLevelLabel = (level: string) => {
    if (level === 'FIRST') return 'الأولى';
    if (level === 'SECOND') return 'الثانية';
    if (level === 'THIRD') return 'الثالثة';
    if (level === 'FOURTH') return 'الرابعة';
    return level || '—';
  };

  const getSafeImageUrl = (photoUrl?: string) => {
    if (!photoUrl) return '';
    if (photoUrl.startsWith('http')) return photoUrl;
    if (photoUrl.startsWith('/')) return `${API_CONFIG.BASE_URL}${photoUrl}`;
    return `${API_CONFIG.BASE_URL}/${photoUrl}`;
  };

  const handleEditProfile = () => {
    Alert.alert('تعديل البروفايل', 'سيتم إضافة هذه الميزة قريباً');
  };

  const handleViewDocuments = () => {
    if (onNavigateToDocuments) {
      onNavigateToDocuments();
      return;
    }
    Alert.alert('الوثائق', 'سيتم إضافة هذه الميزة قريباً');
  };

  const handleViewPayments = () => {
    if (onNavigateToPayments) {
      onNavigateToPayments();
      return;
    }
    Alert.alert('المدفوعات', 'سيتم إضافة هذه الميزة قريباً');
  };

  const handleViewSchedule = () => {
    if (onNavigateToSchedule) {
      onNavigateToSchedule();
      return;
    }
    Alert.alert('الجدول الدراسي', 'سيتم إضافة هذه الميزة قريباً');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <ScreenHeader title="الملف الشخصي" subtitle="إدارة بياناتك الشخصية والأكاديمية" onBack={onBack} light />
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.centerText}>جاري تحميل بياناتك الشخصية...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={s.container}>
        <ScreenHeader title="الملف الشخصي" subtitle="إدارة بياناتك الشخصية والأكاديمية" onBack={onBack} light />
        <View style={s.center}>
          <Text style={s.errTitle}>خطأ في تحميل البروفايل</Text>
          <Text style={s.centerText}>{error}</Text>
          <CustomButton title="إعادة المحاولة" onPress={loadProfile} variant="primary" size="large" />
          <View style={{ height: 8 }} />
          <CustomButton title="العودة" onPress={onBack} variant="outline" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={s.container}>
        <ScreenHeader title="الملف الشخصي" subtitle="إدارة بياناتك الشخصية والأكاديمية" onBack={onBack} light />
        <View style={s.center}>
          <Text style={s.errTitle}>لا توجد بيانات</Text>
          <CustomButton title="العودة" onPress={onBack} variant="primary" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const { trainee } = profile;

  const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={s.detailItem}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value || '—'}</Text>
    </View>
  );

  const DetailSection = ({
    title,
    color,
    children,
  }: {
    title: string;
    color: string;
    children: React.ReactNode;
  }) => (
    <Animated.View style={[s.sectionCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[s.sectionTopBar, { backgroundColor: color }]} />
      <Text style={s.sectionHeader}>{title}</Text>
      <View style={s.sectionBody}>{children}</View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScreenHeader title="الملف الشخصي" subtitle="إدارة بياناتك الشخصية والأكاديمية" onBack={onBack} light />

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[s.profileCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={s.profileGradient} />
          <View style={s.photoWrap}>
            {trainee.photoUrl ? (
              <Image source={{ uri: getSafeImageUrl(trainee.photoUrl) }} style={s.profilePhoto} />
            ) : (
              <View style={s.defaultPhoto}>
                <Text style={s.defaultPhotoText}>{trainee.nameAr.charAt(0)}</Text>
              </View>
            )}
            <View style={s.onlineDot} />
          </View>

          <Text style={s.nameText}>{trainee.nameAr}</Text>
          <Text style={s.nameEnText}>{trainee.nameEn || 'الاسم بالإنجليزية غير متوفر'}</Text>

          <View style={[s.statusBadge, { backgroundColor: getStatusColor(trainee.traineeStatus) }]}>
            <Text style={s.statusText}>{getStatusText(trainee.traineeStatus)}</Text>
          </View>

          <View style={s.programBadge}>
            <Text style={s.programBadgeText}>{trainee.program?.nameAr || '—'}</Text>
          </View>
        </Animated.View>

        <Animated.View style={[s.quickInfoCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.quickInfoTitle}>معلومات سريعة</Text>
          <View style={s.quickInfoRow}>
            <Text style={s.quickInfoLabel}>الرقم القومي</Text>
            <Text style={s.quickInfoValue}>{trainee.nationalId || '—'}</Text>
          </View>
          <View style={s.quickInfoRow}>
            <Text style={s.quickInfoLabel}>تاريخ الميلاد</Text>
            <Text style={s.quickInfoValue}>{formatDate(trainee.birthDate)}</Text>
          </View>
          <View style={s.quickInfoRow}>
            <Text style={s.quickInfoLabel}>البرنامج التدريبي</Text>
            <Text style={s.quickInfoValue}>{trainee.program?.nameAr || '—'}</Text>
          </View>
        </Animated.View>

        <Animated.View style={[s.actionsWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.actionsTitle}>إجراءات سريعة</Text>
          <View style={s.actionsGrid}>
            <TouchableOpacity style={s.actionBtn} onPress={handleViewDocuments}>
              <Text style={s.actionEmoji}>📄</Text>
              <Text style={s.actionText}>الوثائق</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={handleViewPayments}>
              <Text style={s.actionEmoji}>💳</Text>
              <Text style={s.actionText}>المدفوعات</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={handleViewSchedule}>
              <Text style={s.actionEmoji}>📅</Text>
              <Text style={s.actionText}>الجدول</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={handleEditProfile}>
              <Text style={s.actionEmoji}>✏️</Text>
              <Text style={s.actionText}>تعديل</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <DetailSection title="البيانات الأساسية" color={Colors.primary}>
          <DetailRow label="الاسم بالعربية" value={trainee.nameAr} />
          <DetailRow label="الاسم بالإنجليزية" value={trainee.nameEn || '—'} />
          <DetailRow label="النوع" value={trainee.gender === 'MALE' ? 'ذكر' : 'أنثى'} />
          <DetailRow label="الحالة الاجتماعية" value={getMaritalStatusLabel(trainee.maritalStatus)} />
          <DetailRow label="الديانة" value={getReligionLabel(trainee.religion)} />
          <DetailRow label="المستوى التعليمي" value={getEducationLabel(trainee.educationType)} />
        </DetailSection>

        <DetailSection title="معلومات التواصل" color={Colors.info}>
          <DetailRow label="رقم الهاتف" value={trainee.phone || '—'} />
          <DetailRow label="البريد الإلكتروني" value={trainee.email || '—'} />
          <DetailRow label="العنوان" value={trainee.address || '—'} />
          <DetailRow label="المدينة" value={trainee.city || '—'} />
          <DetailRow label="المحافظة" value={trainee.governorate || '—'} />
        </DetailSection>

        <DetailSection title="التفاصيل الأكاديمية" color="#8B5CF6">
          <DetailRow label="تاريخ التسجيل بالمركز" value={formatDate(trainee.createdAt)} />
          <DetailRow label="نظام الدراسة" value={getEnrollmentLabel(trainee.enrollmentType)} />
          <DetailRow label="الفرقة" value={getClassLevelLabel(trainee.classLevel)} />
          <DetailRow label="العام الدراسي" value={trainee.academicYear || '—'} />
        </DetailSection>

        <DetailSection title="بيانات ولي الأمر" color={Colors.warning}>
          <DetailRow label="اسم ولي الأمر" value={trainee.guardianName || '—'} />
          <DetailRow label="رقم هاتف ولي الأمر" value={trainee.guardianPhone || '—'} />
          <DetailRow label="صلة القرابة" value={trainee.guardianRelation || '—'} />
          <DetailRow label="وظيفة ولي الأمر" value={trainee.guardianJob || '—'} />
        </DetailSection>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundAlt },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  centerText: { fontSize: 14, color: Colors.textLight, marginTop: 10, marginBottom: 16, textAlign: 'center' },
  errTitle: { fontSize: 18, fontWeight: '800', color: Colors.error, marginBottom: 8, textAlign: 'center' },
  scrollContent: { paddingBottom: 32, paddingHorizontal: 16 },

  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: 26,
    marginTop: 12,
    marginBottom: 14,
    alignItems: 'center',
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  profileGradient: {
    width: '100%',
    height: 108,
    backgroundColor: Colors.primary,
  },
  photoWrap: { marginTop: -52, marginBottom: 12, position: 'relative' },
  profilePhoto: { width: 106, height: 106, borderRadius: 53, borderWidth: 4, borderColor: Colors.white },
  defaultPhoto: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
  },
  defaultPhotoText: { fontSize: 40, fontWeight: '900', color: Colors.white },
  onlineDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  nameText: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary, textAlign: 'center', marginBottom: 3 },
  nameEnText: { fontSize: 13, color: Colors.textHint, textAlign: 'center', marginBottom: 12, fontWeight: '700' },
  statusBadge: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, marginBottom: 10 },
  statusText: { fontSize: 13, fontWeight: '800', color: Colors.white },
  programBadge: { backgroundColor: Colors.backgroundSoft, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  programBadgeText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },

  quickInfoCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  quickInfoTitle: { fontSize: 17, fontWeight: '900', color: Colors.textPrimary, textAlign: 'right', marginBottom: 12 },
  quickInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingVertical: 10,
  },
  quickInfoLabel: { fontSize: 12, color: Colors.textHint, fontWeight: '700' },
  quickInfoValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '800' },

  actionsWrap: { marginBottom: 14 },
  actionsTitle: { fontSize: 17, fontWeight: '900', color: Colors.textPrimary, textAlign: 'right', marginBottom: 10 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionBtn: {
    width: '48.5%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actionEmoji: { fontSize: 22, marginBottom: 6 },
  actionText: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },

  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  sectionTopBar: { height: 6, width: '100%' },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    textAlign: 'right',
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 14 },
  detailItem: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingVertical: 10,
    alignItems: 'flex-end',
  },
  detailLabel: { fontSize: 12, color: Colors.textHint, fontWeight: '700', marginBottom: 4 },
  detailValue: { fontSize: 15, color: Colors.textPrimary, fontWeight: '800', textAlign: 'right' },
});

export default ProfileScreen;
