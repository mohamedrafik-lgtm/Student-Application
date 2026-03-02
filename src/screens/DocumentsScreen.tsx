// Documents Screen - displays trainee documents
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AuthServiceModule from '../services/authService';
import { API_CONFIG } from '../services/apiConfig';
import { TraineeDocument } from '../types/auth';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
import ScreenHeader from '../components/shared/ScreenHeader';

interface Props {
  accessToken: string;
  onBack: () => void;
}

const DocumentsScreen: React.FC<Props> = ({ accessToken, onBack }) => {
  const [docs, setDocs] = useState<TraineeDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const resolveGetProfile = useCallback(() => {
    const m = AuthServiceModule as any;
    if (m.authService && typeof m.authService.getProfile === 'function') return m.authService.getProfile.bind(m.authService);
    if (m.default && typeof m.default.getProfile === 'function') return m.default.getProfile.bind(m.default);
    if (typeof m.getProfile === 'function') return m.getProfile.bind(m);
    return null;
  }, []);

  const manualFetchProfile = async (token?: string) => {
    if (!API_CONFIG.BASE_URL) return null;
    const endpoints = ['/api/trainee-auth/profile', '/api/trainee/profile', '/api/profile', '/api/trainee-auth/me'];
    for (const ep of endpoints) {
      try {
        const url = `${API_CONFIG.BASE_URL}${ep}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) continue;
        const body = await res.json().catch(() => null);
        if (body) return body;
      } catch { continue; }
    }
    return null;
  };

  const extractDocuments = (profileData: any): TraineeDocument[] => {
    if (!profileData) return [];
    const trainee = profileData.trainee || profileData.data?.trainee || null;
    if (trainee && Array.isArray(trainee.documents)) return trainee.documents;
    if (Array.isArray(profileData.documents)) return profileData.documents;
    if (Array.isArray(profileData.data?.documents)) return profileData.data.documents;
    if (trainee && trainee.documents && typeof trainee.documents === 'object') return Object.values(trainee.documents);
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
      const getProfile = resolveGetProfile();
      let profileData: any = null;
      if (getProfile) {
        try { profileData = await getProfile(accessToken); } catch { profileData = null; }
      }
      if (!profileData) profileData = await manualFetchProfile(accessToken);
      if (!profileData) throw new Error('تعذر الحصول على بيانات الملف الشخصي من الخادم');
      const foundDocs = extractDocuments(profileData);
      setDocs(Array.isArray(foundDocs) ? foundDocs : []);
    } catch (e: any) {
      setError(typeof e === 'string' ? e : e?.message || 'خطأ غير معروف');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAndSetDocuments(); }, []);

  const openUrl = async (url?: string) => {
    if (!url) { Alert.alert('خطأ', 'رابط الملف غير متوفر'); return; }
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) { Alert.alert('خطأ', 'لا يمكن فتح الرابط الخارجي'); return; }
      await Linking.openURL(url);
    } catch { Alert.alert('خطأ', 'حدث خطأ أثناء فتح الملف'); }
  };

  const renderItem = ({ item }: { item: TraineeDocument }) => {
    const title = item.fileName || item.documentType || 'وثيقة';
    const subtitle = item.notes || '';
    return (
      <View style={s.card}>
        <View style={s.cardLeft}>
          <View style={s.docIconCircle}><Icon name={AppIcons.document} size={20} color={Colors.primary} /></View>
        </View>
        <View style={s.cardBody}>
          <Text style={s.cardTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={s.cardSub} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
        <View style={s.cardActions}>
          <TouchableOpacity style={s.viewBtn} onPress={() => openUrl(item.filePath)}>
            <Text style={s.viewBtnText}>عرض</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.dlBtn} onPress={() => Alert.alert('تحميل', 'ميزة التحميل قيد التطوير')}>
            <Text style={s.dlBtnText}>تحميل</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScreenHeader title="الوثائق" subtitle="مستنداتك الرسمية" onBack={onBack} />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.centerText}>جاري تحميل الوثائق...</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorTitle}>فشل التحميل</Text>
          <Text style={s.centerText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchAndSetDocuments}>
            <Text style={s.retryBtnText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      ) : docs.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIconCircle}><Icon name={AppIcons.document} size={32} color={Colors.primary} /></View>
          <Text style={s.emptyTitle}>لا توجد وثائق</Text>
          <Text style={s.centerText}>لم يتم العثور على أي مستندات</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchAndSetDocuments}>
            <Text style={s.retryBtnText}>حاول مرة أخرى</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(it, i) => (it.id ? String(it.id) : `doc-${i}`)}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { display: 'none' as any },
  headerRow: { display: 'none' as any },
  headerTitleArea: { display: 'none' as any },
  headerTitle: { fontSize: 0 },
  headerSubtitle: { fontSize: 0 },
  backBtn: { display: 'none' as any },
  backBtnText: { fontSize: 0 },
  headerSpacer: { display: 'none' as any },
  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center',
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  cardLeft: { marginLeft: 14 },
  docIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary50, alignItems: 'center', justifyContent: 'center' },
  docIcon: { fontSize: 20 },
  cardBody: { flex: 1, alignItems: 'flex-end' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  cardSub: { fontSize: 12, color: Colors.textHint, marginTop: 4, textAlign: 'right' },
  cardActions: { flexDirection: 'column', gap: 6 },
  viewBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.backgroundSoft },
  viewBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  dlBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.successLight },
  dlBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primaryLight },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  centerText: { fontSize: 14, color: Colors.textHint, marginTop: 10, textAlign: 'center' },
  errorTitle: { fontSize: 18, fontWeight: '800', color: Colors.error, marginBottom: 4 },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.primary, borderRadius: 12 },
  retryBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  emptyIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary50, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
});

export default DocumentsScreen;
