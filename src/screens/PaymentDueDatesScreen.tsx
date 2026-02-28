// PaymentDueDatesScreen – programs list + payment due dates
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={s.backBtn}>
          <Text style={s.backIcon}>→</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginRight: 14 }}>
          <Text style={s.headerTitle}>مواعيد سداد الرسوم</Text>
          <Text style={s.headerSub}>إدارة مواعيد سداد الرسوم والإجراءات</Text>
        </View>
        <View style={s.headerIcon}><Text style={{ fontSize: 18 }}>📅</Text></View>
      </View>

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
                  <View style={[s.programIcon, selected && { backgroundColor: '#2563EB' }]}>
                    <Text style={{ fontSize: 22 }}>📘</Text>
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
                    <View style={s.checkCircle}><Text style={{ fontSize: 14, color: '#fff' }}>✓</Text></View>
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
                <Text style={{ fontSize: 48, marginBottom: 12 }}>📅</Text>
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
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#EEF2F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F0F4FF', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 18, color: '#2563EB', fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1A1D26', textAlign: 'right' },
  headerSub: { fontSize: 12, color: '#8E95A2', textAlign: 'right', marginTop: 2 },
  headerIcon: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#F0F4FF',
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: 18, paddingBottom: 32 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1D26', textAlign: 'right', marginBottom: 14 },
  // Program card
  programCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: '#EEF2F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  programCardActive: { borderColor: '#2563EB', backgroundColor: '#F7F9FF' },
  programIcon: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: '#F0F4FF',
    alignItems: 'center', justifyContent: 'center', marginLeft: 14,
  },
  programName: { fontSize: 15, fontWeight: '700', color: '#1A1D26', textAlign: 'right', marginBottom: 2 },
  programNameEn: { fontSize: 12, color: '#8E95A2', textAlign: 'right', marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  priceLabel: { fontSize: 12, color: '#8E95A2' },
  priceVal: { fontSize: 14, fontWeight: '700', color: '#10B981' },
  checkCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
  },
  // Due dates
  dueDatesHeader: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#EEF2F6',
  },
  dueDateTitle: { fontSize: 16, fontWeight: '700', color: '#1A1D26', textAlign: 'right', marginBottom: 4 },
  dueDateSub: { fontSize: 13, color: '#8E95A2', textAlign: 'right' },
  comingSoon: {
    backgroundColor: '#fff', borderRadius: 16, padding: 40, alignItems: 'center',
    borderWidth: 1, borderColor: '#EEF2F6',
  },
  comingSoonTitle: { fontSize: 18, fontWeight: '700', color: '#2563EB', marginBottom: 6 },
  comingSoonDesc: { fontSize: 13, color: '#8E95A2', textAlign: 'center', lineHeight: 20 },
});

export default PaymentDueDatesScreen;
