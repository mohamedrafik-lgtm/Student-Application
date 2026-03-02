// StudentRequestsScreen – free-type requests list + create buttons
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestsService } from '../services/requestsService';
import {
  StudentRequest, PaymentDeferralStatus, RequestError, REQUEST_TYPE_INFO,
} from '../types/requests';
import CustomButton from '../components/CustomButton';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
import ScreenHeader from '../components/shared/ScreenHeader';

interface StudentRequestsScreenProps {
  accessToken: string;
  onBack: () => void;
  onNavigateToExamPostponement?: () => void;
  onNavigateToSickLeave?: () => void;
  onNavigateToEnrollmentProof?: () => void;
  onNavigateToCertificate?: () => void;
}

const StudentRequestsScreen: React.FC<StudentRequestsScreenProps> = ({
  accessToken, onBack,
  onNavigateToExamPostponement, onNavigateToSickLeave,
  onNavigateToEnrollmentProof, onNavigateToCertificate,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await requestsService.getMyRequests(accessToken);
      if (Array.isArray(response)) {
        const freeRequests = response.filter(req => 'type' in req && !('feeId' in req));
        setRequests(freeRequests as any[]);
      } else {
        setError('صيغة استجابة غير صحيحة من الخادم');
      }
    } catch (err: any) {
      const apiError = err as RequestError;
      let msg = 'حدث خطأ أثناء تحميل الطلبات';
      if (apiError.statusCode === 401) msg = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      else if (apiError.statusCode === 404) msg = 'لم يتم العثور على طلبات';
      else if (apiError.message) msg = apiError.message;
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const statusColor = (status: PaymentDeferralStatus) => {
    switch (status) {
      case PaymentDeferralStatus.PENDING: return Colors.warning;
      case PaymentDeferralStatus.APPROVED: return Colors.primaryLight;
      case PaymentDeferralStatus.REJECTED: return Colors.error;
      default: return Colors.textHint;
    }
  };
  const statusLabel = (status: PaymentDeferralStatus) => {
    switch (status) {
      case PaymentDeferralStatus.PENDING: return 'قيد المراجعة';
      case PaymentDeferralStatus.APPROVED: return 'مقبول';
      case PaymentDeferralStatus.REJECTED: return 'مرفوض';
      default: return status;
    }
  };
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  const typeButtons: { icon: string; label: string; onPress?: () => void }[] = [
    { icon: '📋', label: 'إفادة', onPress: onNavigateToCertificate },
    { icon: '📄', label: 'إثبات قيد', onPress: onNavigateToEnrollmentProof },
    { icon: '🏥', label: 'إجازة مرضية', onPress: onNavigateToSickLeave },
    { icon: '📝', label: 'تأجيل اختبار', onPress: onNavigateToExamPostponement },
  ];

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="الطلبات المجانية" onBack={onBack} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Create Request Buttons */}
        {!isLoading && !error && (
          <Animated.View style={[s.typesGrid, { opacity: fadeAnim }]}>
            {typeButtons.map((t, i) => (
              <TouchableOpacity
                key={i}
                style={s.typeCard}
                activeOpacity={0.7}
                onPress={() => t.onPress && t.onPress()}
              >
                <View style={s.typeIcon}><Text style={{ fontSize: 22 }}>{t.icon}</Text></View>
                <Text style={s.typeLabel}>{t.label}</Text>
                <Text style={s.typeHint}>إنشاء طلب</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={s.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={s.loadingText}>جاري تحميل الطلبات...</Text>
          </View>
        )}

        {/* Error */}
        {error && !isLoading && (
          <View style={s.center}>
            <View style={s.errorCircle}><Icon name={AppIcons.warning} size={32} color={Colors.warning} /></View>
            <Text style={s.errorText}>{error}</Text>
            <CustomButton title="إعادة المحاولة" onPress={loadRequests} variant="outline" size="medium" />
          </View>
        )}

        {/* Requests List */}
        {!isLoading && !error && requests.length > 0 && (
          <Animated.View style={{ opacity: fadeAnim, gap: 12 }}>
            <Text style={s.sectionTitle}>طلباتك ({requests.length})</Text>
            {requests.map((request) => {
              const isTrainee = 'type' in request;
              let icon = '📋';
              let title = 'طلب';
              if (isTrainee) {
                const t = (request as any).type as keyof typeof REQUEST_TYPE_INFO;
                if (t && REQUEST_TYPE_INFO[t]) { icon = REQUEST_TYPE_INFO[t].icon; title = REQUEST_TYPE_INFO[t].nameAr; }
              }
              const sc = statusColor(request.status);
              return (
                <View key={request.id} style={s.reqCard}>
                  <View style={s.reqHeader}>
                    <View style={s.reqLeft}>
                      <View style={s.reqIcon}><Text style={{ fontSize: 20 }}>{icon}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.reqTitle}>{title}</Text>
                        <Text style={s.reqReason} numberOfLines={1}>{request.reason}</Text>
                      </View>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: sc + '15', borderColor: sc }]}>
                      <View style={[s.statusDot, { backgroundColor: sc }]} />
                      <Text style={[s.statusText, { color: sc }]}>{statusLabel(request.status)}</Text>
                    </View>
                  </View>

                  {/* Stats */}
                  <View style={s.statsRow}>
                    <View style={s.statBox}>
                      <Text style={s.statLabel}>الأيام</Text>
                      <Text style={s.statVal}>{request.requestedExtensionDays}</Text>
                    </View>
                    {request.requestedDeadline && (
                      <View style={s.statBox}>
                        <Text style={s.statLabel}>الموعد الجديد</Text>
                        <Text style={s.statVal}>{fmtDate(request.requestedDeadline)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Admin response */}
                  {request.adminResponse && (
                    <View style={s.adminBox}>
                      <Text style={s.adminLabel}>💬 رد الإدارة:</Text>
                      <Text style={s.adminText}>{request.adminResponse}</Text>
                    </View>
                  )}

                  {/* Reviewer */}
                  {request.reviewer && (
                    <View style={s.reviewerBox}>
                      <Text style={s.reviewerLabel}>👤 المراجع: {request.reviewer.name}</Text>
                      {request.reviewedAt && <Text style={s.reviewerDate}>{fmtDate(request.reviewedAt)}</Text>}
                    </View>
                  )}

                  <View style={s.reqFooter}>
                    <Text style={s.footerDate}>📅 {fmtDate(request.createdAt)}</Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* Empty */}
        {!isLoading && !error && requests.length === 0 && (
          <View style={s.center}>
            <Icon name={AppIcons.request} size={56} color={Colors.primary} style={{ marginBottom: 16 }} />
            <Text style={s.emptyTitle}>لا توجد طلبات</Text>
            <Text style={s.emptyDesc}>لا توجد طلبات لديك حالياً</Text>
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
  scroll: { padding: 18, paddingBottom: 32 },
  typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  typeCard: {
    width: '47%' as any, backgroundColor: Colors.white, borderRadius: 20, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.borderLight,
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  typeIcon: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  typeLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 3 },
  typeHint: { fontSize: 11, color: Colors.textHint },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 10 },
  reqCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: Colors.borderLight,
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.background },
  reqLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 10, gap: 12 },
  reqIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.warningLight, alignItems: 'center', justifyContent: 'center' },
  reqTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  reqReason: { fontSize: 12, color: Colors.textHint, textAlign: 'right', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: Colors.backgroundAlt, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight },
  statLabel: { fontSize: 11, color: Colors.textHint, marginBottom: 4 },
  statVal: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  adminBox: { backgroundColor: Colors.successLight, borderRadius: 10, padding: 12, marginBottom: 10 },
  adminLabel: { fontSize: 12, fontWeight: '700', color: Colors.primaryLight, marginBottom: 4, textAlign: 'right' },
  adminText: { fontSize: 13, color: Colors.textPrimary, textAlign: 'right', lineHeight: 20 },
  reviewerBox: { backgroundColor: Colors.infoLight, borderRadius: 10, padding: 12, marginBottom: 10 },
  reviewerLabel: { fontSize: 12, fontWeight: '600', color: Colors.primary, textAlign: 'right' },
  reviewerDate: { fontSize: 11, color: Colors.textHint, textAlign: 'right', marginTop: 2 },
  reqFooter: { paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.background },
  footerDate: { fontSize: 12, color: Colors.textHint, textAlign: 'right' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 16, fontSize: 14, color: Colors.textHint, fontWeight: '600' },
  errorCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.errorLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  errorText: { fontSize: 15, color: Colors.error, textAlign: 'center', marginBottom: 20, fontWeight: '600', lineHeight: 22 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: Colors.textHint, textAlign: 'center', lineHeight: 22 },
});

export default StudentRequestsScreen;
