// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles documents display and management
// 2. Open/Closed: Can be extended with new features without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for different concerns
// 4. Dependency Inversion: Depends on abstractions (components) not concretions

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Alert,
  Linking,
} from 'react-native';
import * as AuthServiceModule from '../services/authService';
import { API_CONFIG } from '../services/apiConfig';
import { TraineeDocument } from '../types/auth';
import { Colors } from '../styles/colors';

interface Props {
  accessToken: string;
  onBack: () => void;
}

/*
  DocumentsScreen - إعادة بناء مبسطة
  - مسؤولية واحدة: جلب و عرض الوثائق
  - فصل الشبكة (fetchProfile) عن العرض
  - سلوك افتراضي آمن عند عدم وجود authService.getProfile
*/

const DocumentsScreen: React.FC<Props> = ({ accessToken, onBack }) => {
  const [docs, setDocs] = useState<TraineeDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // استخرج دالة getProfile إن وُجدت بأي شكل تصدير
  const resolveGetProfile = useCallback(() => {
    const m = AuthServiceModule as any;
    if (m.authService && typeof m.authService.getProfile === 'function') return m.authService.getProfile.bind(m.authService);
    if (m.default && typeof m.default.getProfile === 'function') return m.default.getProfile.bind(m.default);
    if (typeof m.getProfile === 'function') return m.getProfile.bind(m);
    return null;
  }, []);

  // محاولات مسارات profile شائعة (fallback)
  const manualFetchProfile = async (token?: string) => {
    if (!API_CONFIG.BASE_URL) return null;
    const endpoints = [
      '/api/trainee-auth/profile',
      '/api/trainee/profile',
      '/api/profile',
      '/api/trainee-auth/me',
    ];
    for (const ep of endpoints) {
      try {
        const url = `${API_CONFIG.BASE_URL}${ep}`;
        console.log('Documents: trying manual profile', url);
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) {
          console.log('Documents: manual profile status', res.status, url);
          continue;
        }
        const body = await res.json().catch(() => null);
        if (body) return body;
      } catch (e) {
        console.warn('Documents: manualFetchProfile error', e);
        continue;
      }
    }
    return null;
  };

  // استخراج مصفوفة الوثائق من هيكل الاستجابة الشائع
  const extractDocuments = (profileData: any): TraineeDocument[] => {
    if (!profileData) return [];
    // شائع: profileData.trainee.documents
    const trainee = profileData.trainee || profileData.data?.trainee || null;
    if (trainee && Array.isArray(trainee.documents)) return trainee.documents;
    // profileData.documents or profileData.data.documents
    if (Array.isArray(profileData.documents)) return profileData.documents;
    if (Array.isArray(profileData.data?.documents)) return profileData.data.documents;
    // sometimes documents are an object keyed by id
    if (trainee && trainee.documents && typeof trainee.documents === 'object') {
      return Object.values(trainee.documents);
    }
    // BFS simple detector: find first array containing objects with fileName or filePath
    const queue: any[] = [profileData];
    const visited = new Set<any>();
    while (queue.length) {
      const cur = queue.shift();
      if (!cur || typeof cur !== 'object' || visited.has(cur)) continue;
      visited.add(cur);
      for (const k of Object.keys(cur)) {
        const v = cur[k];
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
          const sample = v[0];
          if ('fileName' in sample || 'filePath' in sample) return v;
        }
        if (v && typeof v === 'object') queue.push(v);
      }
    }
    return [];
  };

  const fetchAndSetDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      // try service first
      const getProfile = resolveGetProfile();
      let profileData: any = null;
      if (getProfile) {
        try {
          profileData = await getProfile(accessToken);
          console.log('Documents: got profile from auth service');
        } catch (e) {
          console.warn('Documents: authService.getProfile failed', e);
          profileData = null;
        }
      } else {
        console.warn('Documents: authService.getProfile not available, using manual fetch');
      }

      if (!profileData) {
        profileData = await manualFetchProfile(accessToken);
        if (profileData) console.log('Documents: got profile via manual fetch');
      }

      if (!profileData) {
        throw new Error('تعذر الحصول على بيانات الملف الشخصي من الخادم');
      }

      const foundDocs = extractDocuments(profileData);
      console.log('Documents: extracted', foundDocs?.length || 0);
      setDocs(Array.isArray(foundDocs) ? foundDocs : []);
    } catch (e: any) {
      console.error('Documents: failed', e);
      setError(typeof e === 'string' ? e : e?.message || 'خطأ غير معروف');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndSetDocuments();
  }, []);

  const openUrl = async (url?: string) => {
    if (!url) {
      Alert.alert('خطأ', 'رابط الملف غير متوفر');
      return;
    }
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) {
        Alert.alert('خطأ', 'لا يمكن فتح الرابط الخارجي');
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      console.warn('Documents: openUrl failed', e);
      Alert.alert('خطأ', 'حدث خطأ أثناء فتح الملف');
    }
  };

  const renderItem = ({ item }: { item: TraineeDocument }) => {
    const title = item.fileName || item.documentType || 'وثيقة';
    const subtitle = item.notes || '';
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openUrl(item.filePath)}>
            <Text style={styles.actionText}>عرض</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.dlBtn]} onPress={() => Alert.alert('تحميل', 'ميزة التحميل قيد التطوير')}>
            <Text style={styles.actionText}>تحميل</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.title}>الوثائق</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.hint}>جاري تحميل الوثائق...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errTitle}>فشل التحميل</Text>
          <Text style={styles.hint}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={fetchAndSetDocuments}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      ) : docs.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.huge}>📄</Text>
          <Text style={styles.hint}>لا توجد وثائق</Text>
          <TouchableOpacity style={styles.retry} onPress={fetchAndSetDocuments}>
            <Text style={styles.retryText}>حاول مرة أخرى</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(it, i) => (it.id ? String(it.id) : `doc-${i}`)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { fontSize: 20, color: Colors.textPrimary },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  hint: { marginTop: 12, color: Colors.textSecondary, textAlign: 'center' },
  errTitle: { fontSize: 18, color: Colors.error, fontWeight: '700' },
  retry: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  huge: { fontSize: 64 },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  cardSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, textAlign: 'right' },
  actions: { flexDirection: 'row', marginLeft: 12 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(99,102,241,0.08)', marginLeft: 8 },
  dlBtn: { backgroundColor: 'rgba(16,185,129,0.08)' },
  actionText: { color: Colors.primary, fontWeight: '700' },
});

export default DocumentsScreen;
