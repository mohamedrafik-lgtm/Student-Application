import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/shared/ScreenHeader';
import { Colors } from '../styles/colors';
import { StudyMaterial, traineePlatformService } from '../services/traineePlatformService';

const statusText = {
  PENDING: 'لم يتم الاستلام',
  DELIVERED: 'تم الاستلام',
  RETURNED: 'تم الإرجاع',
  LOST: 'مسجل كمفقود',
};

export default function StudyMaterialsScreen({ accessToken, onBack }: { accessToken: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<StudyMaterial[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try { setItems(await traineePlatformService.getStudyMaterials(accessToken)); }
    catch (e: any) { setError(e.message || 'تعذر تحميل الأدوات الدراسية'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="الأدوات الدراسية" subtitle="حالة الأدوات المخصصة لبرنامجك" onBack={onBack} />
      {loading ? <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View> :
      error ? <View style={styles.center}><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={load}><Text style={styles.retry}>إعادة المحاولة</Text></TouchableOpacity></View> :
      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 && <Text style={styles.empty}>لا توجد أدوات دراسية مخصصة لبرنامجك حاليًا.</Text>}
        {items.map(item => {
          const status = item.delivery?.status || 'PENDING';
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>{item.name}</Text>
                <View style={[styles.badge, status === 'DELIVERED' && styles.delivered, status === 'LOST' && styles.lost]}>
                  <Text style={styles.badgeText}>{statusText[status]}</Text>
                </View>
              </View>
              {item.description && <Text style={styles.description}>{item.description}</Text>}
              {item.linkedFee && <Text style={styles.fee}>الرسم المرتبط: {item.linkedFee.name} · {item.linkedFee.amount} ج.م</Text>}
              {item.delivery?.status === 'DELIVERED' && <Text style={styles.detail}>الكمية المستلمة: {item.delivery.quantity}</Text>}
            </View>
          );
        })}
      </ScrollView>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: Colors.error, textAlign: 'center', marginBottom: 12 },
  retry: { color: Colors.primary, fontWeight: '800' },
  content: { padding: 16, gap: 12 },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: Colors.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.borderLight },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, color: Colors.textPrimary, fontSize: 16, fontWeight: '800', textAlign: 'right' },
  badge: { backgroundColor: Colors.warningLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  delivered: { backgroundColor: Colors.successLight },
  lost: { backgroundColor: Colors.errorLight },
  badgeText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '800' },
  description: { color: Colors.textSecondary, marginTop: 10, lineHeight: 20, textAlign: 'right' },
  fee: { marginTop: 10, backgroundColor: Colors.backgroundSoft, borderRadius: 10, padding: 10, color: Colors.textSecondary, textAlign: 'right' },
  detail: { marginTop: 8, color: Colors.textSecondary, textAlign: 'right' },
});
