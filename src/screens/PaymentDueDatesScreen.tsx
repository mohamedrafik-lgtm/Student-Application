// PaymentDueDatesScreen – programs list + payment due dates
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';
import ScreenHeader from '../components/shared/ScreenHeader';

interface PaymentDueDatesScreenProps {
  accessToken: string;
  onBack: () => void;
}

interface TrainingProgram {
  id: number;
  nameAr: string;
  nameEn: string;
  price: number;
}

const PaymentDueDatesScreen: React.FC<PaymentDueDatesScreenProps> = ({ onBack }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [programs] = useState<TrainingProgram[]>([
    { id: 1, nameAr: 'مساعد خدمات صحية', nameEn: 'Health services assistant', price: 12000 },
    { id: 2, nameAr: 'المساحة والإنشاءات', nameEn: 'Surveying and construction', price: 12000 },
    { id: 3, nameAr: 'مساعد خدمات صحية فبراير', nameEn: 'Health services assistant', price: 12000 },
  ]);

  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handleSelectProgram = (programId: number) => {
    setSelectedProgram(programId);
  };

  const formatPrice = (price: number): string => price.toLocaleString('ar-EG') + ' ج.م';

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="مواعيد سداد الرسوم" subtitle="إدارة مواعيد سداد الرسوم والإجراءات" onBack={onBack} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Section title */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={s.sectionTitle}>اختر البرنامج التدريبي</Text>

          {/* Programs */}
          <View style={{ gap: 12 }}>
            {programs.map((p) => {
              const selected = selectedProgram === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[s.programCard, selected && s.programCardActive]}
                  onPress={() => handleSelectProgram(p.id)}
                  activeOpacity={0.8}
                >
                  <View style={[s.programIcon, selected && { backgroundColor: Colors.primary }]}>
                    <Icon name={AppIcons.book} size={22} color={selected ? Colors.white : Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.programName}>{p.nameAr}</Text>
                    <Text style={s.programNameEn}>{p.nameEn}</Text>
                    <View style={s.priceRow}>
                      <Text style={s.priceLabel}>السعر:</Text>
                      <Text style={s.priceVal}>{formatPrice(p.price)}</Text>
                    </View>
                  </View>
                  {selected && (
                    <View style={s.checkCircle}><Icon name={AppIcons.check} size={14} color={Colors.white} /></View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Due Dates */}
          {selectedProgram && (
            <View style={{ marginTop: 24 }}>
              <View style={s.dueDatesHeader}>
                <Text style={s.dueDateTitle}>مواعيد السداد</Text>
                <Text style={s.dueDateSub}>
                  البرنامج: {programs.find(p => p.id === selectedProgram)?.nameAr}
                </Text>
              </View>
              <View style={s.comingSoon}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}><Icon name={AppIcons.schedule} size={48} color={Colors.primary} /></Text>
                <Text style={s.comingSoonTitle}>قريباً...</Text>
                <Text style={s.comingSoonDesc}>سيتم عرض مواعيد السداد التفصيلية هنا</Text>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { display: 'none' as any },
  backBtn: { display: 'none' as any },
  backIcon: { fontSize: 0 },
  headerTitle: { fontSize: 0 },
  headerSub: { fontSize: 0 },
  headerIcon: { display: 'none' as any },
  scroll: { padding: 18, paddingBottom: 32 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 14 },
  programCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: Colors.borderLight,
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  programCardActive: { borderColor: Colors.primary, backgroundColor: Colors.backgroundSoft },
  programIcon: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.backgroundSoft,
    alignItems: 'center', justifyContent: 'center', marginLeft: 14,
  },
  programName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 2 },
  programNameEn: { fontSize: 12, color: Colors.textHint, textAlign: 'right', marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  priceLabel: { fontSize: 12, color: Colors.textHint },
  priceVal: { fontSize: 14, fontWeight: '700', color: Colors.primaryLight },
  checkCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  dueDatesHeader: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  dueDateTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 4 },
  dueDateSub: { fontSize: 13, color: Colors.textHint, textAlign: 'right' },
  comingSoon: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 40, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  comingSoonTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary, marginBottom: 6 },
  comingSoonDesc: { fontSize: 13, color: Colors.textHint, textAlign: 'center', lineHeight: 20 },
});

export default PaymentDueDatesScreen;
