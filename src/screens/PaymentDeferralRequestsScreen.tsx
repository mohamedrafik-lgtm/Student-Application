// PaymentDeferralRequestsScreen – payment deferral requests list
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestsService } from '../services/requestsService';
import {
  PaymentDeferralRequest, PaymentDeferralStatus, RequestError,
} from '../types/requests';
import CustomButton from '../components/CustomButton';
import { Colors } from '../styles/colors';
import ScreenHeader from '../components/shared/ScreenHeader';

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

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await requestsService.getMyDeferralRequests(accessToken);

      // Handle both array and wrapped responses: { data: [...] } or [...]
      let items: any[] = [];
      if (Array.isArray(response)) {
        items = response;
      } else if (response && typeof response === 'object') {
        const wrapped = response as any;
        if (Array.isArray(wrapped.data)) {
          items = wrapped.data;
        } else if (Array.isArray(wrapped.requests)) {
          items = wrapped.requests;
        } else if (Array.isArray(wrapped.items)) {
          items = wrapped.items;
        }
      }

      console.log('📝 Deferral Requests loaded:', items.length, 'items');
      setRequests(items as PaymentDeferralRequest[]);
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
      case PaymentDeferralStatus.PENDING: return Colors.warning;
      case PaymentDeferralStatus.APPROVED: return Colors.primaryLight;
      case PaymentDeferralStatus.REJECTED: return Colors.error;
      default: return Colors.textHint;
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
      <ScreenHeader title="طلبات تأجيل السداد" subtitle="متابعة طلبات تأجيل الدفعات" onBack={onBack} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Create button */}
        {!isLoading && !error && (
          <View>
            <TouchableOpacity
              style={s.createBtn}
              onPress={() => onNavigateToCreateDeferral && onNavigateToCreateDeferral()}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 18, color: Colors.white }}>＋</Text>
              <Text style={s.createBtnText}>إنشاء طلب تأجيل سداد جديد</Text>
            </TouchableOpacity>
          </View>
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
            <View style={s.errorCircle}><Text style={{ fontSize: 28 }}>⚠️</Text></View>
            <Text style={s.errorText}>{error}</Text>
            <CustomButton title="إعادة المحاولة" onPress={loadRequests} variant="outline" size="medium" />
          </View>
        )}

        {/* Requests */}
        {!isLoading && !error && requests.length > 0 && (
          <View style={{ gap: 12, marginTop: 16 }}>
            {requests.map((req) => {
              const color = sc(req.status);
              return (
                <View key={req.id} style={s.card}>
                  <View style={s.cardTop}>
                    <View style={s.cardLeft}>
                      <View style={s.cardIcon}><Text style={{ fontSize: 18 }}>💰</Text></View>
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
          </View>
        )}

        {/* Empty */}
        {!isLoading && !error && requests.length === 0 && (
          <View style={s.center}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>💳</Text>
            <Text style={s.emptyTitle}>لا توجد طلبات</Text>
            <Text style={s.emptyDesc}>لا توجد طلبات تأجيل سداد حالياً</Text>
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
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 15, gap: 10,
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  createBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  card: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: Colors.borderLight,
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.background },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 10, gap: 12 },
  cardIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.warningLight, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  cardAmount: { fontSize: 12, color: Colors.textHint, textAlign: 'right', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5 },
  statusText: { fontSize: 11, fontWeight: '700' },
  reason: { fontSize: 13, color: Colors.textPrimary, textAlign: 'right', marginBottom: 12, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: Colors.backgroundAlt, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight },
  statLabel: { fontSize: 11, color: Colors.textHint, marginBottom: 4 },
  statVal: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  adminBox: { backgroundColor: Colors.successLight, borderRadius: 10, padding: 12, marginBottom: 10 },
  adminLabel: { fontSize: 12, fontWeight: '700', color: Colors.primaryLight, marginBottom: 4, textAlign: 'right' },
  adminText: { fontSize: 13, color: Colors.textPrimary, textAlign: 'right', lineHeight: 20 },
  footer: { paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.background },
  footerDate: { fontSize: 12, color: Colors.textHint, textAlign: 'right' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 16, fontSize: 14, color: Colors.textHint, fontWeight: '600' },
  errorCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.errorLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  errorText: { fontSize: 15, color: Colors.error, textAlign: 'center', marginBottom: 20, fontWeight: '600', lineHeight: 22 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: Colors.textHint, textAlign: 'center', lineHeight: 22 },
});

export default PaymentDeferralRequestsScreen;
