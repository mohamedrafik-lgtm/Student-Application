// Main hub for all requests (Payment Deferral & Free Requests)
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface RequestsHubScreenProps {
  accessToken: string;
  onBack: () => void;
  onNavigateToPaymentDeferral?: () => void;
  onNavigateToFreeRequests?: () => void;
  onNavigateToSettings?: () => void;
}

const RequestsHubScreen: React.FC<RequestsHubScreenProps> = ({
  onBack,
  onNavigateToPaymentDeferral,
  onNavigateToFreeRequests,
  onNavigateToSettings,
}) => {
  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.settingsBtn} onPress={() => onNavigateToSettings?.()}>
            <Text style={s.settingsBtnText}>⚙</Text>
          </TouchableOpacity>
          <View style={s.headerTitleArea}>
            <Text style={s.headerTitle}>الطلبات</Text>
            <Text style={s.headerSubtitle}>اختر نوع الطلب المراد تقديمه</Text>
          </View>
          <TouchableOpacity style={s.backBtn} onPress={onBack}><Text style={s.backBtnText}>→</Text></TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={s.content}>
        {/* Payment Deferral */}
        <TouchableOpacity
          style={s.categoryCard}
          onPress={() => onNavigateToPaymentDeferral?.()}
          activeOpacity={0.7}
        >
          <View style={[s.categoryAccent, { backgroundColor: '#F59E0B' }]} />
          <View style={s.categoryBody}>
            <View style={s.categoryHeader}>
              <Text style={s.categoryArrow}>←</Text>
              <View style={[s.categoryIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Text style={s.categoryIcon}>💰</Text>
              </View>
            </View>
            <Text style={s.categoryTitle}>طلبات تأجيل السداد</Text>
            <Text style={s.categoryDesc}>طلب تأجيل موعد سداد الرسوم الدراسية</Text>
          </View>
        </TouchableOpacity>

        {/* Free Requests */}
        <TouchableOpacity
          style={s.categoryCard}
          onPress={() => onNavigateToFreeRequests?.()}
          activeOpacity={0.7}
        >
          <View style={[s.categoryAccent, { backgroundColor: '#2563EB' }]} />
          <View style={s.categoryBody}>
            <View style={s.categoryHeader}>
              <Text style={s.categoryArrow}>←</Text>
              <View style={[s.categoryIconCircle, { backgroundColor: '#DBEAFE' }]}>
                <Text style={s.categoryIcon}>📋</Text>
              </View>
            </View>
            <Text style={s.categoryTitle}>الطلبات المجانية</Text>
            <Text style={s.categoryDesc}>إفادة، إثبات قيد، تأجيل اختبار، إجازة مرضية</Text>
          </View>
        </TouchableOpacity>
      </View>
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
  settingsBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F4F6FA', alignItems: 'center', justifyContent: 'center' },
  settingsBtnText: { fontSize: 18, color: '#6B7280' },
  content: { flex: 1, padding: 16, gap: 14 },
  categoryCard: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  categoryAccent: { width: 5, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  categoryBody: { flex: 1, padding: 20 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  categoryIconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  categoryIcon: { fontSize: 24 },
  categoryTitle: { fontSize: 18, fontWeight: '800', color: '#1A1D26', textAlign: 'right', marginBottom: 6 },
  categoryDesc: { fontSize: 14, color: '#8E95A2', lineHeight: 22, textAlign: 'right' },
  categoryArrow: { fontSize: 20, color: '#2563EB', fontWeight: '700' },
});

export default RequestsHubScreen;
