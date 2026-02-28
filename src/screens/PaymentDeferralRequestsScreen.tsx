// PaymentDeferralRequestsScreen – payment deferral requests list
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestsService } from '../services/requestsService';
import {
  PaymentDeferralRequest, PaymentDeferralStatus, RequestError,
} from '../types/requests';
import CustomButton from '../components/CustomButton';

interface PaymentDeferralRequestsScreenProps {
  accessToken: string;
  onBack: () => void;
  onNavigateToCreateDeferral?: () => void;
}

const PaymentDeferralRequestsScreen: React.FC<PaymentDeferralRequestsScreenProps> = ({
  accessToken, onBack, onNavigateToCreateDeferral,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<PaymentDeferralRequest[]>([]);
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
      const response = await requestsService.getMyDeferralRequests(accessToken);
      if (Array.isArray(response)) setRequests(response as PaymentDeferralRequest[]);
      else setError('صيغة استجابة غير صحيحة من الخادم');
    } catch (err: any) {
      const apiError = err as RequestError;
      let msg = 'حدث خطأ أثناء تحميل الطلبات';
      if (apiError.statusCode === 401) msg = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      else if (apiError.message) msg = apiError.message;
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const sc = (status: PaymentDeferralStatus) => {
    switch (status) {
      case PaymentDeferralStatus.PENDING: return '#F59E0B';
      case PaymentDeferralStatus.APPROVED: return '#10B981';
      case PaymentDeferralStatus.REJECTED: return '#EF4444';
      default: return '#8E95A2';
    }
  };
  const sl = (status: PaymentDeferralStatus) => {
    switch (status) {
      case PaymentDeferralStatus.PENDING: return 'قيد المراجعة';
      case PaymentDeferralStatus.APPROVED: return 'مقبول';
      case PaymentDeferralStatus.REJECTED: return 'مرفوض';
      default: return status;
    }
  };
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={s.backBtn}>
          <Text style={s.backIcon}>→</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 14 }}>
          <Text style={s.headerTitle}>طلبات تأجيل السداد</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Create button */}
        {!isLoading && !error && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <TouchableOpacity
              style={s.createBtn}
              onPress={() => onNavigateToCreateDeferral && onNavigateToCreateDeferral()}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 18, color: '#fff' }}>➕</Text>
              <Text style={s.createBtnText}>إنشاء طلب تأجيل سداد جديد</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={s.loadingText}>جاري تحميل الطلبات...</Text>
          </View>
        )}

        {/* Error */}
        {error && !isLoading && (
          <View style={s.center}>
            <View style={s.errorCircle}><Text style={{ fontSize: 32 }}>⚠️</Text></View>
            <Text style={s.errorText}>{error}</Text>
            <CustomButton title="إعادة المحاولة" onPress={loadRequests} variant="outline" size="medium" />
          </View>
        )}

        {/* Requests */}
        {!isLoading && !error && requests.length > 0 && (
          <Animated.View style={{ opacity: fadeAnim, gap: 12, marginTop: 16 }}>
            {requests.map((req) => {
              const color = sc(req.status);
              return (
                <View key={req.id} style={s.card}>
                  <View style={s.cardTop}>
                    <View style={s.cardLeft}>
                      <View style={s.cardIcon}><Text style={{ fontSize: 20 }}>💰</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardTitle}>{req.fee?.name || 'رسم غير محدد'}</Text>
                        <Text style={s.cardAmount}>{req.fee?.amount || 0} جنيه</Text>
                      </View>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: color + '15', borderColor: color }]}>
                      <Text style={[s.statusText, { color }]}>{sl(req.status)}</Text>
                    </View>
                  </View>

                  <Text style={s.reason}>📝 {req.reason}</Text>

                  <View style={s.statsRow}>
                    <View style={s.statBox}>
                      <Text style={s.statLabel}>الأيام</Text>
                      <Text style={s.statVal}>{req.requestedExtensionDays}</Text>
                    </View>
                    {req.requestedDeadline && (
                      <View style={s.statBox}>
                        <Text style={s.statLabel}>الموعد</Text>
                        <Text style={s.statVal}>{fmtDate(req.requestedDeadline)}</Text>
                      </View>
                    )}
                  </View>

                  {req.adminResponse && (
                    <View style={s.adminBox}>
                      <Text style={s.adminLabel}>💬 الرد:</Text>
                      <Text style={s.adminText}>{req.adminResponse}</Text>
                    </View>
                  )}

                  <View style={s.footer}>
                    <Text style={s.footerDate}>📅 {fmtDate(req.createdAt)}</Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* Empty */}
        {!isLoading && !error && requests.length === 0 && (
          <View style={s.center}>
            <Text style={{ fontSize: 56, marginBottom: 16 }}>💰</Text>
            <Text style={s.emptyTitle}>لا توجد طلبات</Text>
            <Text style={s.emptyDesc}>لا توجد طلبات تأجيل سداد حالياً</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#EEF2F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F0F4FF', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 18, color: '#2563EB', fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1D26', textAlign: 'right' },
  scroll: { padding: 18, paddingBottom: 32 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 15, gap: 10,
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  createBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EEF2F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F4F6FA' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 10, gap: 12 },
  cardIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1A1D26', textAlign: 'right' },
  cardAmount: { fontSize: 12, color: '#8E95A2', textAlign: 'right', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5 },
  statusText: { fontSize: 11, fontWeight: '700' },
  reason: { fontSize: 13, color: '#1A1D26', textAlign: 'right', marginBottom: 12, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: '#FAFBFD', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EEF2F6' },
  statLabel: { fontSize: 11, color: '#8E95A2', marginBottom: 4 },
  statVal: { fontSize: 14, fontWeight: '700', color: '#1A1D26' },
  adminBox: { backgroundColor: '#E8FAF0', borderRadius: 10, padding: 12, marginBottom: 10 },
  adminLabel: { fontSize: 12, fontWeight: '700', color: '#10B981', marginBottom: 4, textAlign: 'right' },
  adminText: { fontSize: 13, color: '#1A1D26', textAlign: 'right', lineHeight: 20 },
  footer: { paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F4F6FA' },
  footerDate: { fontSize: 12, color: '#8E95A2', textAlign: 'right' },
  // States
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 16, fontSize: 14, color: '#8E95A2', fontWeight: '600' },
  errorCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  errorText: { fontSize: 15, color: '#EF4444', textAlign: 'center', marginBottom: 20, fontWeight: '600', lineHeight: 22 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1D26', textAlign: 'center', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#8E95A2', textAlign: 'center', lineHeight: 22 },
});

export default PaymentDeferralRequestsScreen;
