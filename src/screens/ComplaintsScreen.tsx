import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/shared/ScreenHeader';
import CustomButton from '../components/CustomButton';
import { Colors } from '../styles/colors';
import { TraineeComplaint, traineePlatformService } from '../services/traineePlatformService';

export default function ComplaintsScreen({ accessToken, onBack }: { accessToken: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<TraineeComplaint[]>([]);
  const [type, setType] = useState<'COMPLAINT' | 'SUGGESTION'>('COMPLAINT');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    setLoading(true);
    try { setItems(await traineePlatformService.getComplaints(accessToken)); }
    catch (e: any) { Alert.alert('خطأ', e.message || 'تعذر تحميل الشكاوى'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال العنوان والتفاصيل');
      return;
    }
    setSubmitting(true);
    try {
      await traineePlatformService.createComplaint(accessToken, { type, subject: subject.trim(), description: description.trim() });
      setSubject('');
      setDescription('');
      await load();
      Alert.alert('تم بنجاح', type === 'COMPLAINT' ? 'تم إرسال الشكوى' : 'تم إرسال الاقتراح');
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'تعذر إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="الشكاوى والاقتراحات" subtitle="إرسال المتابعة والردود" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.types}>
            <TouchableOpacity style={[styles.typeButton, type === 'COMPLAINT' && styles.typeActive]} onPress={() => setType('COMPLAINT')}><Text style={styles.typeText}>شكوى</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.typeButton, type === 'SUGGESTION' && styles.typeActive]} onPress={() => setType('SUGGESTION')}><Text style={styles.typeText}>اقتراح</Text></TouchableOpacity>
          </View>
          <TextInput value={subject} onChangeText={setSubject} placeholder="العنوان" style={styles.input} placeholderTextColor={Colors.textHint} />
          <TextInput value={description} onChangeText={setDescription} placeholder="التفاصيل" multiline numberOfLines={5} style={[styles.input, styles.multiline]} placeholderTextColor={Colors.textHint} />
          <CustomButton title="إرسال" onPress={submit} loading={submitting} />
        </View>
        {loading ? <ActivityIndicator color={Colors.primary} /> : items.map(item => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.title}>{item.subject}</Text>
            <Text style={styles.description}>{item.description}</Text>
            {item.adminResponse && <Text style={styles.response}>رد الإدارة: {item.adminResponse}</Text>}
            <Text style={styles.status}>{item.status === 'PENDING' ? 'قيد المراجعة' : item.status === 'IN_PROGRESS' ? 'جاري المعالجة' : item.status === 'RESOLVED' ? 'تم الحل' : 'مغلق'}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: Colors.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.borderLight },
  types: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeButton: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 10, backgroundColor: Colors.backgroundSoft },
  typeActive: { backgroundColor: Colors.primary },
  typeText: { color: Colors.textPrimary, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: Colors.borderMedium, borderRadius: 12, padding: 12, marginBottom: 10, color: Colors.textPrimary, textAlign: 'right' },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  title: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800', textAlign: 'right' },
  description: { color: Colors.textSecondary, marginTop: 6, textAlign: 'right' },
  response: { marginTop: 10, backgroundColor: Colors.successLight, borderRadius: 10, padding: 10, color: Colors.primaryDark, textAlign: 'right' },
  status: { marginTop: 8, color: Colors.textSecondary, fontSize: 12, textAlign: 'right' },
});
