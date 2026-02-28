// Request Settings Screen
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';

interface RequestSettingsScreenProps {
  onBack: () => void;
}

const RequestSettingsScreen: React.FC<RequestSettingsScreenProps> = ({ onBack }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [isRequestsEnabled, setIsRequestsEnabled] = useState(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSaveSettings = () => {
    Alert.alert('حفظ الإعدادات', `تم ${isRequestsEnabled ? 'تفعيل' : 'تعطيل'} استقبال الطلبات الجديدة`, [{ text: 'حسناً' }]);
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {/* Header */}
      <Animated.View style={[s.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={s.headerRow}>
          <View style={s.headerSpacer} />
          <View style={s.headerTitleArea}>
            <Text style={s.headerTitle}>إعدادات الطلبات</Text>
            <Text style={s.headerSubtitle}>التحكم في استقبال طلبات تأجيل السداد</Text>
          </View>
          <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backBtnText}>→</Text></TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section Header */}
        <Animated.View style={[s.sectionHeader, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.sectionTitle}>استقبال الطلبات الجديدة</Text>
          <Text style={s.sectionDesc}>التحكم في إمكانية إنشاء طلبات جديدة من قبل المتدربين</Text>
        </Animated.View>

        {/* Toggle Cards */}
        <Animated.View style={[s.toggleRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity
            style={[s.toggleCard, !isRequestsEnabled && s.toggleCardSelected]}
            onPress={() => setIsRequestsEnabled(false)}
            activeOpacity={0.7}
          >
            <View style={[s.toggleIconCircle, { backgroundColor: '#EF4444' }]}><Text style={s.toggleIconText}>✕</Text></View>
            <Text style={s.toggleCardTitle}>معطل</Text>
            <Text style={s.toggleCardLabel}>إيقاف الطلبات</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.toggleCard, isRequestsEnabled && s.toggleCardSelected]}
            onPress={() => setIsRequestsEnabled(true)}
            activeOpacity={0.7}
          >
            <View style={[s.toggleIconCircle, { backgroundColor: '#10B981' }]}><Text style={s.toggleIconText}>✓</Text></View>
            <Text style={s.toggleCardTitle}>مُفعّل</Text>
            <Text style={s.toggleCardLabel}>قبول الطلبات</Text>
            {isRequestsEnabled && (
              <View style={s.featureBadge}><Text style={s.featureBadgeText}>يمكن للمتدربين تقديم طلبات جديدة</Text></View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Status Card */}
        <Animated.View style={[
          s.statusCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          isRequestsEnabled ? s.statusCardEnabled : s.statusCardDisabled,
        ]}>
          <View style={s.statusHeader}>
            <View style={[s.statusDot, { backgroundColor: isRequestsEnabled ? '#10B981' : '#EF4444' }]} />
            <Text style={[s.statusTitle, { color: isRequestsEnabled ? '#10B981' : '#EF4444' }]}>
              الطلبات {isRequestsEnabled ? 'مُفعلة' : 'معطلة'}
            </Text>
          </View>
          {isRequestsEnabled && (
            <View style={s.statusList}>
              {['يمكن للمتدربين إنشاء طلبات تأجيل جديدة', 'ستصل الطلبات للمراجعة الإدارية', 'يمكن قبول أو رفض الطلبات'].map((text, i) => (
                <View key={i} style={s.statusItem}>
                  <Text style={s.statusBullet}>•</Text>
                  <Text style={s.statusItemText}>{text}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Save Button */}
        <View style={s.saveBtnWrap}>
          <CustomButton title="حفظ الإعدادات" onPress={handleSaveSettings} variant="primary" size="large" />
        </View>

        {/* Note */}
        <View style={s.noteCard}>
          <Text style={s.noteTitle}>ملاحظة</Text>
          <Text style={s.noteText}>
            عند تعطيل الطلبات، لن يتمكن المتدربين من إنشاء طلبات جديدة. لكن يمكنكم مشاهدة طلباتهم السابقة. الطلبات الموجودة يمكن للإدارة مراجعتها وقبولها أو رفضها في أي وقت.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  header: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#EEF2F6' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTitleArea: { flex: 1, alignItems: 'flex-end', marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1D26', textAlign: 'right' },
  headerSubtitle: { fontSize: 13, color: '#8E95A2', marginTop: 4, textAlign: 'right' },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F4F6FA', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 20, color: '#1A1D26', fontWeight: '600' },
  headerSpacer: { width: 38 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  sectionHeader: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1D26', textAlign: 'right', marginBottom: 6 },
  sectionDesc: { fontSize: 13, color: '#8E95A2', textAlign: 'right', lineHeight: 20 },
  toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  toggleCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 2, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, minHeight: 160 },
  toggleCardSelected: { borderColor: '#2563EB', backgroundColor: '#F0F5FF' },
  toggleIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  toggleIconText: { fontSize: 22, color: '#FFF', fontWeight: '800' },
  toggleCardTitle: { fontSize: 16, fontWeight: '800', color: '#1A1D26', marginBottom: 4 },
  toggleCardLabel: { fontSize: 13, color: '#8E95A2', marginBottom: 8 },
  featureBadge: { backgroundColor: '#E6F9F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 },
  featureBadgeText: { fontSize: 11, color: '#10B981', fontWeight: '600', textAlign: 'center' },
  statusCard: { borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1.5 },
  statusCardEnabled: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  statusCardDisabled: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  statusTitle: { fontSize: 16, fontWeight: '800', textAlign: 'right' },
  statusList: { gap: 8 },
  statusItem: { flexDirection: 'row', alignItems: 'flex-start' },
  statusBullet: { fontSize: 14, color: '#10B981', marginLeft: 8, fontWeight: '800' },
  statusItemText: { flex: 1, fontSize: 13, color: '#374151', textAlign: 'right', lineHeight: 20 },
  saveBtnWrap: { marginBottom: 16 },
  noteCard: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  noteTitle: { fontSize: 14, fontWeight: '800', color: '#2563EB', textAlign: 'right', marginBottom: 8 },
  noteText: { fontSize: 13, color: '#374151', textAlign: 'right', lineHeight: 22 },
});

export default RequestSettingsScreen;
