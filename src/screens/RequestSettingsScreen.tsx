// Request Settings Screen
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '../components/CustomButton';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';

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
          <TouchableOpacity style={s.backBtn} onPress={onBack}><Icon name={AppIcons.back} size={20} color={Colors.primary} /></TouchableOpacity>
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
            <View style={[s.toggleIconCircle, { backgroundColor: Colors.error }]}><Icon name={AppIcons.close} size={22} color={Colors.white} /></View>
            <Text style={s.toggleCardTitle}>معطل</Text>
            <Text style={s.toggleCardLabel}>إيقاف الطلبات</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.toggleCard, isRequestsEnabled && s.toggleCardSelected]}
            onPress={() => setIsRequestsEnabled(true)}
            activeOpacity={0.7}
          >
            <View style={[s.toggleIconCircle, { backgroundColor: Colors.primaryLight }]}><Icon name={AppIcons.check} size={22} color={Colors.white} /></View>
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
            <View style={[s.statusDot, { backgroundColor: isRequestsEnabled ? Colors.primaryLight : Colors.error }]} />
            <Text style={[s.statusTitle, { color: isRequestsEnabled ? Colors.primaryLight : Colors.error }]}>
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.white, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTitleArea: { flex: 1, alignItems: 'flex-end', marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right' },
  headerSubtitle: { fontSize: 13, color: Colors.textHint, marginTop: 4, textAlign: 'right' },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 20, color: Colors.textPrimary, fontWeight: '600' },
  headerSpacer: { width: 38 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  sectionHeader: { backgroundColor: Colors.white, borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right', marginBottom: 6 },
  sectionDesc: { fontSize: 13, color: Colors.textHint, textAlign: 'right', lineHeight: 20 },
  toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  toggleCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 2, borderColor: Colors.borderMedium, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, minHeight: 160 },
  toggleCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.backgroundSoft },
  toggleIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  toggleIconText: { fontSize: 22, color: Colors.white, fontWeight: '800' },
  toggleCardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  toggleCardLabel: { fontSize: 13, color: Colors.textHint, marginBottom: 8 },
  featureBadge: { backgroundColor: Colors.successLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 },
  featureBadgeText: { fontSize: 11, color: Colors.primaryLight, fontWeight: '600', textAlign: 'center' },
  statusCard: { borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1.5 },
  statusCardEnabled: { backgroundColor: Colors.successLight, borderColor: Colors.successBorder },
  statusCardDisabled: { backgroundColor: Colors.errorLight, borderColor: Colors.errorBorder },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  statusTitle: { fontSize: 16, fontWeight: '800', textAlign: 'right' },
  statusList: { gap: 8 },
  statusItem: { flexDirection: 'row', alignItems: 'flex-start' },
  statusBullet: { fontSize: 14, color: Colors.primaryLight, marginLeft: 8, fontWeight: '800' },
  statusItemText: { flex: 1, fontSize: 13, color: Colors.textSecondary, textAlign: 'right', lineHeight: 20 },
  saveBtnWrap: { marginBottom: 16 },
  noteCard: { backgroundColor: Colors.infoLight, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.infoBorder },
  noteTitle: { fontSize: 14, fontWeight: '800', color: Colors.primary, textAlign: 'right', marginBottom: 8 },
  noteText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', lineHeight: 22 },
});

export default RequestSettingsScreen;
