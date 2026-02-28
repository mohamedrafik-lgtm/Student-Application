// Profile Screen - displays trainee profile with info sections
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, Dimensions, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../services/authService';
import { TraineeProfile, TraineeProfileError } from '../types/auth';
import CustomButton from '../components/CustomButton';

const { width } = Dimensions.get('window');

interface ProfileScreenProps {
  accessToken: string;
  onBack: () => void;
  onNavigateToDocuments?: () => void;
  onNavigateToPayments?: () => void;
  onNavigateToSchedule?: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ accessToken, onBack, onNavigateToDocuments, onNavigateToPayments, onNavigateToSchedule }) => {
  const [profile, setProfile] = useState<TraineeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => {
    if (profile) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [profile]);

  const loadProfile = async () => {
    try {
      setIsLoading(true); setError(null);
      const profileData = await AuthService.getProfile(accessToken);
      setProfile(profileData);
    } catch (error) {
      const apiError = error as TraineeProfileError;
      let errorMessage = 'حدث خطأ أثناء تحميل بيانات البروفايل';
      if (apiError.statusCode === 401) errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      else if (apiError.statusCode === 0) errorMessage = apiError.message;
      else if (apiError.message) errorMessage = apiError.message;
      setError(errorMessage);
    } finally { setIsLoading(false); }
  };

  const handleEditProfile = () => { Alert.alert('تعديل البروفايل', 'سيتم إضافة هذه الميزة قريباً'); };
  const handleViewDocuments = () => { onNavigateToDocuments ? onNavigateToDocuments() : Alert.alert('الوثائق', 'سيتم إضافة هذه الميزة قريباً'); };
  const handleViewPayments = () => { onNavigateToPayments ? onNavigateToPayments() : Alert.alert('المدفوعات', 'سيتم إضافة هذه الميزة قريباً'); };
  const handleViewSchedule = () => { onNavigateToSchedule ? onNavigateToSchedule() : Alert.alert('الجدول الدراسي', 'سيتم إضافة هذه الميزة قريباً'); };
  const handleViewAttendance = () => { Alert.alert('سجل الحضور', 'سيتم إضافة هذه الميزة قريباً'); };

  const formatDate = (dateString: string) => {
    try { return new Date(dateString).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return dateString; }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CURRENT': return '#10B981'; case 'GRADUATE': return '#3B82F6';
      case 'WITHDRAWN': return '#EF4444'; default: return '#F59E0B';
    }
  };
  const getStatusText = (status: string) => {
    switch (status) {
      case 'CURRENT': return 'مستمر'; case 'GRADUATE': return 'خريج';
      case 'WITHDRAWN': return 'منسحب'; case 'NEW': return 'مستجد'; default: return status;
    }
  };

  if (isLoading) {
    return (<SafeAreaView style={s.container}><View style={s.center}><ActivityIndicator size="large" color="#2563EB" /><Text style={s.centerText}>جاري تحميل بيانات البروفايل...</Text></View></SafeAreaView>);
  }
  if (error) {
    return (<SafeAreaView style={s.container}><View style={s.center}><Text style={s.errTitle}>خطأ في تحميل البروفايل</Text><Text style={s.centerText}>{error}</Text><CustomButton title="إعادة المحاولة" onPress={loadProfile} variant="primary" size="large" /><View style={{height:8}}/><CustomButton title="العودة" onPress={onBack} variant="outline" size="large" /></View></SafeAreaView>);
  }
  if (!profile) {
    return (<SafeAreaView style={s.container}><View style={s.center}><Text style={s.errTitle}>لا توجد بيانات</Text><CustomButton title="العودة" onPress={onBack} variant="primary" size="large" /></View></SafeAreaView>);
  }

  const { trainee } = profile;

  const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <View style={s.infoRow}>
      <View style={s.infoRowBody}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
      <View style={s.infoIconCircle}><Text style={s.infoIcon}>{icon}</Text></View>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.editBtn} onPress={handleEditProfile}><Text style={s.editBtnText}>✏️</Text></TouchableOpacity>
            <Text style={s.headerTitle}>الملف الشخصي</Text>
            <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backBtnText}>→</Text></TouchableOpacity>
          </View>
        </View>

        {/* Profile Card */}
        <Animated.View style={[s.profileCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={s.profileCardTop} />
          <View style={s.photoWrap}>
            {trainee.photoUrl ? (
              <Image source={{ uri: trainee.photoUrl }} style={s.profilePhoto} />
            ) : (
              <View style={s.defaultPhoto}><Text style={s.defaultPhotoText}>{trainee.nameAr.charAt(0)}</Text></View>
            )}
            <View style={s.onlineDot} />
          </View>
          <Text style={s.nameText}>{trainee.nameAr}</Text>
          <Text style={s.nameEnText}>{trainee.nameEn}</Text>
          <View style={[s.statusBadge, { backgroundColor: getStatusColor(trainee.traineeStatus) }]}>
            <View style={s.statusDot} />
            <Text style={s.statusText}>{getStatusText(trainee.traineeStatus)}</Text>
          </View>
          <View style={s.programBadge}><Text style={s.programBadgeText}>{trainee.program.nameAr}</Text></View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View style={[s.quickActionsWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.sectionTitle}>الإجراءات السريعة</Text>
          <View style={s.quickGrid}>
            {[
              { icon: '📄', label: 'الوثائق', sub: 'عرض الملفات', badge: trainee.documents?.length || 0, color: '#6366F1', onPress: handleViewDocuments },
              { icon: '💳', label: 'المدفوعات', sub: 'سجل المدفوعات', badge: trainee.traineePayments?.length || 0, color: '#F59E0B', onPress: handleViewPayments },
              { icon: '📅', label: 'الجدول', sub: 'المواعيد', badge: '📚', color: '#3B82F6', onPress: handleViewSchedule },
              { icon: '📊', label: 'الحضور', sub: 'سجل الحضور', badge: trainee.attendanceRecords?.length || 0, color: '#10B981', onPress: handleViewAttendance },
              { icon: '✏️', label: 'تعديل', sub: 'تعديل البيانات', badge: null, color: '#8B5CF6', onPress: handleEditProfile },
            ].map((a, i) => (
              <TouchableOpacity key={i} style={s.quickCard} onPress={a.onPress}>
                <View style={[s.quickCardIcon, { backgroundColor: a.color }]}><Text style={s.quickCardEmoji}>{a.icon}</Text></View>
                <Text style={s.quickCardLabel}>{a.label}</Text>
                <Text style={s.quickCardSub}>{a.sub}</Text>
                {a.badge !== null && <View style={s.quickCardBadge}><Text style={s.quickCardBadgeText}>{a.badge}</Text></View>}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Personal Info */}
        <Animated.View style={[s.infoSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.sectionTitle}>المعلومات الشخصية</Text>
          <View style={s.infoCard}>
            <Text style={s.infoCardHeader}>البيانات الأساسية</Text>
            <InfoRow icon="🆔" label="الرقم القومي" value={trainee.nationalId} />
            <InfoRow icon="🎂" label="تاريخ الميلاد" value={formatDate(trainee.birthDate)} />
            <InfoRow icon="⚧" label="النوع" value={trainee.gender === 'MALE' ? 'ذكر' : 'أنثى'} />
            <InfoRow icon="🌍" label="الجنسية" value={trainee.nationality} />
            <InfoRow icon="💍" label="الحالة الاجتماعية" value={trainee.maritalStatus === 'SINGLE' ? 'أعزب' : trainee.maritalStatus === 'MARRIED' ? 'متزوج' : trainee.maritalStatus === 'DIVORCED' ? 'مطلق' : 'أرمل'} />
          </View>
        </Animated.View>

        {/* Contact Info */}
        <Animated.View style={[s.infoSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.sectionTitle}>معلومات الاتصال</Text>
          <View style={s.infoCard}>
            <Text style={s.infoCardHeader}>بيانات التواصل</Text>
            <InfoRow icon="📱" label="رقم الهاتف" value={trainee.phone} />
            {trainee.email && <InfoRow icon="📧" label="البريد الإلكتروني" value={trainee.email} />}
            <InfoRow icon="🏠" label="العنوان" value={trainee.address} />
            <InfoRow icon="🏙️" label="المدينة" value={trainee.city} />
            {trainee.governorate && <InfoRow icon="🗺️" label="المحافظة" value={trainee.governorate} />}
          </View>
        </Animated.View>

        {/* Program Info */}
        <Animated.View style={[s.infoSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.sectionTitle}>معلومات البرنامج</Text>
          <View style={s.infoCard}>
            <Text style={s.infoCardHeader}>البرنامج التدريبي</Text>
            <InfoRow icon="📚" label="البرنامج" value={trainee.program.nameAr} />
            <InfoRow icon="📅" label="نوع البرنامج" value={trainee.programType === 'SUMMER' ? 'صيفي' : trainee.programType === 'WINTER' ? 'شتوي' : 'عقد سنة'} />
            <InfoRow icon="🎯" label="الفرقة" value={trainee.classLevel === 'FIRST' ? 'الأولى' : trainee.classLevel === 'SECOND' ? 'الثانية' : trainee.classLevel === 'THIRD' ? 'الثالثة' : 'الرابعة'} />
            {trainee.academicYear && <InfoRow icon="📆" label="العام الدراسي" value={trainee.academicYear} />}
          </View>
        </Animated.View>

        {/* Guardian Info */}
        <Animated.View style={[s.infoSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.sectionTitle}>معلومات ولي الأمر</Text>
          <View style={s.infoCard}>
            <Text style={s.infoCardHeader}>بيانات ولي الأمر</Text>
            <InfoRow icon="👤" label="اسم ولي الأمر" value={trainee.guardianName} />
            <InfoRow icon="📞" label="رقم هاتف ولي الأمر" value={trainee.guardianPhone} />
            <InfoRow icon="🤝" label="صلة القرابة" value={trainee.guardianRelation} />
            {trainee.guardianJob && <InfoRow icon="💼" label="وظيفة ولي الأمر" value={trainee.guardianJob} />}
          </View>
        </Animated.View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  centerText: { fontSize: 14, color: '#8E95A2', marginTop: 10, marginBottom: 16, textAlign: 'center' },
  errTitle: { fontSize: 18, fontWeight: '800', color: '#EF4444', marginBottom: 8, textAlign: 'center' },
  scrollContent: { paddingBottom: 32 },
  header: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#EEF2F6' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1D26' },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F4F6FA', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 20, color: '#1A1D26', fontWeight: '600' },
  editBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontSize: 16 },
  profileCard: { backgroundColor: '#FFF', borderRadius: 16, marginHorizontal: 16, marginTop: 16, marginBottom: 16, alignItems: 'center', paddingBottom: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4, overflow: 'hidden' },
  profileCardTop: { width: '100%', height: 80, backgroundColor: '#EFF6FF' },
  photoWrap: { marginTop: -44, marginBottom: 12, position: 'relative' },
  profilePhoto: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#FFF' },
  defaultPhoto: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF' },
  defaultPhotoText: { fontSize: 36, fontWeight: '800', color: '#FFF' },
  onlineDot: { position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFF' },
  nameText: { fontSize: 22, fontWeight: '800', color: '#1A1D26', textAlign: 'center', marginBottom: 2 },
  nameEnText: { fontSize: 14, color: '#8E95A2', textAlign: 'center', marginBottom: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 14, borderRadius: 20, marginBottom: 10 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF', marginRight: 6 },
  statusText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  programBadge: { backgroundColor: '#F4F6FA', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  programBadgeText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  quickActionsWrap: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1D26', textAlign: 'right', marginBottom: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickCard: { width: (width - 48) / 2, backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, position: 'relative' },
  quickCardIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickCardEmoji: { fontSize: 22 },
  quickCardLabel: { fontSize: 14, fontWeight: '700', color: '#1A1D26', marginBottom: 2 },
  quickCardSub: { fontSize: 11, color: '#8E95A2' },
  quickCardBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  quickCardBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  infoSection: { paddingHorizontal: 16, marginBottom: 16 },
  infoCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  infoCardHeader: { fontSize: 15, fontWeight: '800', color: '#374151', textAlign: 'right', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EEF2F6' },
  infoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 8 },
  infoRowBody: { flex: 1, alignItems: 'flex-end', marginRight: 12 },
  infoIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  infoIcon: { fontSize: 18 },
  infoLabel: { fontSize: 12, color: '#8E95A2', fontWeight: '600', marginBottom: 2, textAlign: 'right' },
  infoValue: { fontSize: 14, color: '#1A1D26', fontWeight: '700', textAlign: 'right' },
});

export default ProfileScreen;
