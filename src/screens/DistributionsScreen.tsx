import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/shared/ScreenHeader';
import Icon, { AppIcons } from '../components/shared/Icon';
import { Colors } from '../styles/colors';
import { Distribution, traineePlatformService } from '../services/traineePlatformService';

export default function DistributionsScreen({ accessToken, onBack }: { accessToken: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState('');
  const [items, setItems] = useState<Distribution[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await traineePlatformService.getDistributions(accessToken));
    } catch (e: any) {
      setError(e.message || 'تعذر تحميل التوزيعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const join = (roomId: string, roomName: string) => {
    Alert.alert('تأكيد الانضمام', `هل تريد الانضمام إلى ${roomName}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تأكيد', onPress: async () => {
        setJoining(roomId);
        try {
          await traineePlatformService.joinDistribution(accessToken, roomId);
          await load();
          Alert.alert('تم بنجاح', 'تم الانضمام إلى المجموعة');
        } catch (e: any) {
          Alert.alert('خطأ', e.message || 'تعذر الانضمام للمجموعة');
        } finally {
          setJoining('');
        }
      } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="توزيعات التدريب" subtitle="اختيار المجموعات الدراسية" onBack={onBack} />
      {loading ? <View style={styles.center}><ActivityIndicator color={Colors.primary} /><Text style={styles.text}>جاري تحميل التوزيعات...</Text></View> :
      error ? <View style={styles.center}><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={load}><Text style={styles.retry}>إعادة المحاولة</Text></TouchableOpacity></View> :
      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 && <Text style={styles.empty}>لا توجد توزيعات متاحة حاليًا.</Text>}
        {items.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={styles.row}>
              <Icon name="account-group" size={20} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.classroomName}</Text>
                <Text style={styles.meta}>{item.type === 'THEORY' ? 'نظري' : 'عملي'} · {item.academicYear}</Text>
              </View>
            </View>
            {item.rooms.map(room => (
              <TouchableOpacity
                key={room.id}
                style={[styles.room, item.joinedRoomId === room.id && styles.currentRoom]}
                disabled={room.isFull || joining === room.id}
                onPress={() => join(room.id, room.name)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.roomName}>{room.name}</Text>
                  <Text style={styles.meta}>{room.enrolledCount} / {room.capacity}</Text>
                </View>
                <Text style={[styles.status, room.isFull ? styles.full : null]}>
                  {item.joinedRoomId === room.id ? 'مجموعتك' : room.isFull ? 'مكتملة' : 'انضمام'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { marginTop: 10, color: Colors.textSecondary },
  error: { color: Colors.error, textAlign: 'center', marginBottom: 12 },
  retry: { color: Colors.primary, fontWeight: '800' },
  content: { padding: 16, gap: 12 },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: Colors.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.borderLight },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right' },
  meta: { color: Colors.textSecondary, fontSize: 12, marginTop: 3, textAlign: 'right' },
  room: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: Colors.backgroundSoft, marginTop: 8 },
  currentRoom: { borderWidth: 1, borderColor: Colors.primaryLight },
  roomName: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right' },
  status: { color: Colors.primary, fontWeight: '800' },
  full: { color: Colors.error },
});
