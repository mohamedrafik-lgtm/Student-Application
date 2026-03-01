// Main hub for all requests (Payment Deferral & Free Requests)
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';

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
            <Icon name={AppIcons.settings} size={18} color={Colors.textLight} />
          </TouchableOpacity>
          <View style={s.headerTitleArea}>
            <Text style={s.headerTitle}>الطلبات</Text>
            <Text style={s.headerSubtitle}>اختر نوع الطلب المراد تقديمه</Text>
          </View>
          <TouchableOpacity style={s.backBtn} onPress={onBack}><Icon name={AppIcons.back} size={20} color={Colors.primary} /></TouchableOpacity>
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
          <View style={[s.categoryAccent, { backgroundColor: Colors.warning }]} />
          <View style={s.categoryBody}>
            <View style={s.categoryHeader}>
              <Text style={s.categoryArrow}>←</Text>
              <View style={[s.categoryIconCircle, { backgroundColor: Colors.warningLight }]}>
                <Icon name={AppIcons.payments} size={24} color={Colors.warning} />
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
          <View style={[s.categoryAccent, { backgroundColor: Colors.primary }]} />
          <View style={s.categoryBody}>
            <View style={s.categoryHeader}>
              <Text style={s.categoryArrow}>←</Text>
              <View style={[s.categoryIconCircle, { backgroundColor: Colors.primary50 }]}>
                <Icon name={AppIcons.request} size={24} color={Colors.primary} />
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.white, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTitleArea: { flex: 1, alignItems: 'flex-end', marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right' },
  headerSubtitle: { fontSize: 13, color: Colors.textHint, marginTop: 4, textAlign: 'right' },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 20, color: Colors.textPrimary, fontWeight: '600' },
  settingsBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  settingsBtnText: { fontSize: 18, color: Colors.textLight },
  content: { flex: 1, padding: 16, gap: 14 },
  categoryCard: { backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden', flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  categoryAccent: { width: 5, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  categoryBody: { flex: 1, padding: 20 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  categoryIconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  categoryIcon: { fontSize: 24 },
  categoryTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right', marginBottom: 6 },
  categoryDesc: { fontSize: 14, color: Colors.textHint, lineHeight: 22, textAlign: 'right' },
  categoryArrow: { fontSize: 20, color: Colors.primary, fontWeight: '700' },
});

export default RequestsHubScreen;
