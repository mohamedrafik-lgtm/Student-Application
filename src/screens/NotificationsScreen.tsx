import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/shared/ScreenHeader';
import { Colors } from '../styles/colors';
import { traineePlatformService } from '../services/traineePlatformService';

interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  date?: string;
  type: 'appeal' | 'request' | 'complaint' | 'payment' | 'grade';
}

const unwrap = (value: any) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.appeals)) return value.appeals;
  if (Array.isArray(value?.requests)) return value.requests;
  if (Array.isArray(value?.complaints)) return value.complaints;
  return [];
};

export default function NotificationsScreen({ accessToken, onBack }: { accessToken: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const load = async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    const results = await traineePlatformService.getNotifications(accessToken);
    const notifications: NotificationItem[] = [];

    const addItems = (result: PromiseSettledResult<any>, type: NotificationItem['type'], titleKey: string, detailKey: string, statusLabel: (status: string) => string) => {
      if (result.status !== 'fulfilled') return;
      unwrap(result.value).forEach((item: any) => {
        if (!item.status || item.status === 'PENDING') return;
        notifications.push({
          id: `${type}-${item.id}`,
          title: item.title || item.subject || titleKey,
          detail: `${detailKey}: ${statusLabel(item.status)}`,
          date: item.updatedAt || item.reviewedAt || item.createdAt,
          type,
        });
      });
    };

    addItems(results[0], 'appeal', 'تظلم درجة', 'حالة التظلم', status => status === 'ACCEPTED' ? 'تم القبول' : status === 'REJECTED' ? 'تم الرفض' : 'قيد المراجعة');
    addItems(results[1], 'request', 'طلب تأجيل سداد', 'حالة الطلب', status => status === 'APPROVED' ? 'تم القبول' : status === 'REJECTED' ? 'تم الرفض' : 'قيد المراجعة');
    addItems(results[2], 'request', 'طلب جديد', 'حالة الطلب', status => status === 'APPROVED' ? 'تم القبول' : status === 'REJECTED' ? 'تم الرفض' : 'قيد المراجعة');
    addItems(results[3], 'complaint', 'شكوى أو اقتراح', 'حالة المتابعة', status => status === 'RESOLVED' ? 'تم الحل' : status === 'IN_PROGRESS' ? 'جاري المعالجة' : status === 'CLOSED' ? 'مغلق' : 'قيد المراجعة');

    if (results[4].status === 'fulfilled') {
      const payments = results[4].value?.trainee?.traineePayments || [];
      payments.filter((payment: any) => payment.status === 'COMPLETED').forEach((payment: any) => {
        notifications.push({
          id: `payment-${payment.id}`,
          title: 'تم تسجيل سداد',
          detail: payment.fee?.name || 'دفعة مالية',
          date: payment.updatedAt || payment.paidAt || payment.createdAt,
          type: 'payment',
        });
      });
    }

    notifications.sort((a, b) => (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0));
    setItems(notifications);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="الإشعارات" subtitle="التحديثات والردود الجديدة" onBack={onBack} />
      {loading ? <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View> :
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[Colors.primary]} />}
      >
        {items.length === 0 && <Text style={styles.empty}>لا توجد إشعارات حالية.</Text>}
        {items.map(item => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.detail}>{item.detail}</Text>
            {item.date && <Text style={styles.date}>{new Date(item.date).toLocaleDateString('ar-EG')}</Text>}
          </View>
        ))}
      </ScrollView>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 40 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: Colors.borderLight },
  title: { color: Colors.textPrimary, fontSize: 15, fontWeight: '900', textAlign: 'right' },
  detail: { color: Colors.textSecondary, marginTop: 5, textAlign: 'right' },
  date: { color: Colors.textHint, fontSize: 11, marginTop: 8, textAlign: 'left' },
});
