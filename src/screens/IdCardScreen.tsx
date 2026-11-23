import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/shared/ScreenHeader';
import { Colors } from '../styles/colors';
import { IdCardStatus, traineePlatformService } from '../services/traineePlatformService';

export default function IdCardScreen({ accessToken, onBack }: { accessToken: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<IdCardStatus | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try { setStatus(await traineePlatformService.getIdCardStatus(accessToken)); }
    catch (e: any) { setError(e.message || 'تعذر تحميل حالة الكارنيه'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const label = status?.status === 'DELIVERED' ? 'تم التسليم' : status?.status === 'PRINTED' ? 'تم الطباعة' : status?.status === 'LOST' ? 'مفقود' : 'قيد الانتظار';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="كارنيه المتدرب" subtitle="حالة الطباعة والتسليم" onBack={onBack} />
      {loading ? <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View> :
      error ? <View style={styles.center}><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={load}><Text style={styles.retry}>إعادة المحاولة</Text></TouchableOpacity></View> :
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>حالة الكارنيه</Text>
          <Text style={styles.status}>{label}</Text>
          {status?.printedAt && <Text style={styles.detail}>تاريخ الطباعة: {new Date(status.printedAt).toLocaleDateString('ar-EG')}</Text>}
          {status?.deliveredAt && <Text style={styles.detail}>تاريخ التسليم: {new Date(status.deliveredAt).toLocaleDateString('ar-EG')}</Text>}
        </View>
        {status?.printRecords?.length ? status.printRecords.map(record => (
          <View key={record.id} style={styles.card}><Text style={styles.detail}>تمت الطباعة: {new Date(record.printedAt).toLocaleDateString('ar-EG')}</Text></View>
        )) : null}
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
  card: { backgroundColor: Colors.white, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: Colors.borderLight },
  label: { color: Colors.textSecondary, textAlign: 'right' },
  status: { color: Colors.primaryDark, fontSize: 22, fontWeight: '900', textAlign: 'right', marginTop: 6 },
  detail: { color: Colors.textSecondary, marginTop: 10, textAlign: 'right' },
});
