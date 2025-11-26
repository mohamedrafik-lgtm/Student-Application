// Payment Due Dates Screen
// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles payment due dates display
// 2. Open/Closed: Can be extended with new features without modification

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';

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

const PaymentDueDatesScreen: React.FC<PaymentDueDatesScreenProps> = ({ 
  onBack 
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Static data - will be replaced with API call
  const [programs] = useState<TrainingProgram[]>([
    {
      id: 1,
      nameAr: 'مساعد خدمات صحية',
      nameEn: 'Health services assistant',
      price: 12000,
    },
    {
      id: 2,
      nameAr: 'المساحة والإنشاءات',
      nameEn: 'Surveying and construction',
      price: 12000,
    },
    {
      id: 3,
      nameAr: 'مساعد خدمات صحية فبراير',
      nameEn: 'Health services assistant',
      price: 12000,
    },
  ]);

  const [selectedProgram, setSelectedProgram] = useState<number | null>(null);

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleSelectProgram = (programId: number) => {
    setSelectedProgram(programId);
    // TODO: Load payment due dates for selected program
  };

  const formatPrice = (price: number): string => {
    return price.toLocaleString('ar-EG') + ' ج.م';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <View style={styles.backButtonContainer}>
            <Text style={styles.backButtonText}>←</Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>مواعيد سداد الرسوم</Text>
          <Text style={styles.headerSubtitle}>
            إدارة مواعيد سداد الرسوم والإجراءات عند عدم السداد
          </Text>
        </View>
        
        <View style={styles.headerIconContainer}>
          <Text style={styles.headerIcon}>📅</Text>
        </View>
      </Animated.View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section: اختر البرنامج التدريبي */}
        <Animated.View style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>اختر البرنامج التدريبي</Text>
          </View>

          <View style={styles.programsContainer}>
            {programs.map((program) => (
              <TouchableOpacity
                key={program.id}
                style={[
                  styles.programCard,
                  selectedProgram === program.id && styles.programCardSelected
                ]}
                onPress={() => handleSelectProgram(program.id)}
                activeOpacity={0.8}
              >
                <View style={styles.programCardContent}>
                  <View style={[
                    styles.programIconContainer,
                    selectedProgram === program.id && styles.programIconContainerSelected
                  ]}>
                    <Text style={styles.programIcon}>📘</Text>
                  </View>
                  
                  <View style={styles.programInfo}>
                    <Text style={styles.programNameAr}>{program.nameAr}</Text>
                    <Text style={styles.programNameEn}>{program.nameEn}</Text>
                    <View style={styles.programPriceContainer}>
                      <Text style={styles.programPriceLabel}>السعر:</Text>
                      <Text style={styles.programPrice}>{formatPrice(program.price)}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Payment Due Dates Section - Shows when program is selected */}
        {selectedProgram && (
          <Animated.View style={[
            styles.dueDatesSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}>
            <View style={styles.dueDatesHeader}>
              <Text style={styles.dueDatesTitle}>مواعيد السداد</Text>
              <Text style={styles.dueDatesSubtitle}>
                البرنامج المحدد: {programs.find(p => p.id === selectedProgram)?.nameAr}
              </Text>
            </View>

            <View style={styles.comingSoonCard}>
              <Text style={styles.comingSoonIcon}>📅</Text>
              <Text style={styles.comingSoonText}>قريباً...</Text>
              <Text style={styles.comingSoonDescription}>
                سيتم عرض مواعيد السداد التفصيلية هنا
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  backButton: {
    width: 44,
    height: 44,
  },
  backButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.primary,
    fontWeight: '800',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: 4,
  },
  programsContainer: {
    gap: 16,
  },
  programCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  programCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    elevation: 8,
  },
  programCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  programIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  programIconContainerSelected: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
  },
  programIcon: {
    fontSize: 32,
  },
  programInfo: {
    flex: 1,
  },
  programNameAr: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: 4,
  },
  programNameEn: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: 8,
  },
  programPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  programPriceLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  programPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.success,
  },
  dueDatesSection: {
    marginBottom: 24,
  },
  dueDatesHeader: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  dueDatesTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: 4,
  },
  dueDatesSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  comingSoonCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  comingSoonIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  comingSoonText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 8,
  },
  comingSoonDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default PaymentDueDatesScreen;