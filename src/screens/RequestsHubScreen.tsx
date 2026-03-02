// Main hub for all requests (Payment Deferral & Free Requests)
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
import ScreenHeader from '../components/shared/ScreenHeader';

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
      <ScreenHeader title="الطلبات" subtitle="اختر نوع الطلب المراد تقديمه" onBack={onBack} />

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
  header: { display: 'none' as any },
  headerRow: { display: 'none' as any },
  headerTitleArea: { display: 'none' as any },
  headerTitle: { fontSize: 0 },
  headerSubtitle: { fontSize: 0 },
  backBtn: { display: 'none' as any },
  backBtnText: { fontSize: 0 },
  settingsBtn: { display: 'none' as any },
  settingsBtnText: { fontSize: 0 },
  content: { flex: 1, padding: 16, gap: 14 },
  categoryCard: {
    backgroundColor: Colors.white, borderRadius: 20,
    overflow: 'hidden', flexDirection: 'row',
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 14, elevation: 5,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  categoryAccent: { width: 6 },
  categoryBody: { flex: 1, padding: 20 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  categoryIconCircle: { width: 56, height: 56, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  categoryIcon: { fontSize: 24 },
  categoryTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right', marginBottom: 6 },
  categoryDesc: { fontSize: 14, color: Colors.textHint, lineHeight: 22, textAlign: 'right' },
  categoryArrow: { fontSize: 20, color: Colors.primary, fontWeight: '700' },
});

export default RequestsHubScreen;
