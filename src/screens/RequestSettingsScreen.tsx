// Request Settings Screen
// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles request settings display

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';
import CustomButton from '../components/CustomButton';

interface RequestSettingsScreenProps {
  onBack: () => void;
}

const RequestSettingsScreen: React.FC<RequestSettingsScreenProps> = ({
  onBack
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // State - static for now
  const [isRequestsEnabled, setIsRequestsEnabled] = useState(true);

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

  const handleToggleRequests = (enabled: boolean) => {
    setIsRequestsEnabled(enabled);
  };

  const handleSaveSettings = () => {
    Alert.alert(
      'حفظ الإعدادات',
      `تم ${isRequestsEnabled ? 'تفعيل' : 'تعطيل'} استقبال الطلبات الجديدة`,
      [{ text: 'حسناً' }]
    );
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
          <Text style={styles.headerTitle}>إعدادات الطلبات</Text>
          <Text style={styles.headerSubtitle}>التحكم في استقبال طلبات تأجيل السداد</Text>
        </View>
        
        <View style={styles.headerIconContainer}>
          <Text style={styles.headerIcon}>⚙️</Text>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section: استقبال الطلبات الجديدة */}
        <Animated.View style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>استقبال الطلبات الجديدة</Text>
            <Text style={styles.sectionDescription}>
              التحكم في إمكانية إنشاء طلبات جديدة من قبل المتدربين
            </Text>
          </View>

          <View style={styles.toggleCardsContainer}>
            {/* Card 2: معطل - اليسار */}
            <TouchableOpacity
              style={[
                styles.toggleCard,
                !isRequestsEnabled && styles.toggleCardInactive
              ]}
              onPress={() => handleToggleRequests(false)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.toggleCardIcon,
                { backgroundColor: Colors.error }
              ]}>
                <Text style={styles.toggleCardIconText}>⊗</Text>
              </View>
              <Text style={styles.toggleCardTitle}>معطل ⊗</Text>
              <Text style={styles.toggleCardLabel}>إيقاف الطلبات</Text>
            </TouchableOpacity>

            {/* Card 1: مُفعّل - اليمين */}
            <TouchableOpacity
              style={[
                styles.toggleCard,
                isRequestsEnabled && styles.toggleCardActive
              ]}
              onPress={() => handleToggleRequests(true)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.toggleCardIcon,
                { backgroundColor: Colors.success }
              ]}>
                <Text style={styles.toggleCardIconText}>✓</Text>
              </View>
              <Text style={styles.toggleCardTitle}>مُفعّل ✓</Text>
              <Text style={styles.toggleCardLabel}>قبول الطلبات</Text>
              <View style={styles.toggleCardFeature}>
                <Text style={styles.toggleCardFeatureText}>
                  ✓ يمكن للمتدربين تقديم طلبات جديدة
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Status Card */}
        <Animated.View style={[
          styles.statusSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={[
            styles.statusCard,
            {
              backgroundColor: isRequestsEnabled ? Colors.successSoft : Colors.errorSoft,
              borderColor: isRequestsEnabled ? Colors.success : Colors.error,
            }
          ]}>
            <View style={styles.statusCardHeader}>
              <Text style={[
                styles.statusCardTitle,
                { color: isRequestsEnabled ? Colors.success : Colors.error }
              ]}>
                الطلبات {isRequestsEnabled ? 'مُفعلة' : 'معطلة'}
              </Text>
              <View style={[
                styles.statusCardIcon,
                { backgroundColor: isRequestsEnabled ? Colors.success : Colors.error }
              ]}>
                <Text style={styles.statusCardIconText}>
                  {isRequestsEnabled ? '✓' : '⊗'}
                </Text>
              </View>
            </View>

            {isRequestsEnabled && (
              <View style={styles.statusCardContent}>
                <View style={styles.statusCardItem}>
                  <Text style={styles.statusCardBullet}>•</Text>
                  <Text style={styles.statusCardItemText}>
                    يمكن للمتدربين إنشاء طلبات تأجيل جديدة
                  </Text>
                </View>
                <View style={styles.statusCardItem}>
                  <Text style={styles.statusCardBullet}>•</Text>
                  <Text style={styles.statusCardItemText}>
                    ستصل الطلبات للمراجعة الإدارية
                  </Text>
                </View>
                <View style={styles.statusCardItem}>
                  <Text style={styles.statusCardBullet}>•</Text>
                  <Text style={styles.statusCardItemText}>
                    يمكن قبول أو رفض الطلبات
                  </Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Save Button */}
        <Animated.View style={[
          styles.saveButtonContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <CustomButton
            title="حفظ الإعدادات 💾"
            onPress={handleSaveSettings}
            variant="primary"
            size="large"
          />
        </Animated.View>

        {/* Note */}
        <Animated.View style={[
          styles.noteContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteIcon}>💡</Text>
              <Text style={styles.noteTitle}>ملاحظة:</Text>
            </View>
            <Text style={styles.noteText}>
              عند تعطيل الطلبات، لن يتمكن المتدربين من إنشاء طلبات جديدة. لكن يمكنكم مشاهدة طلباتهم السابقة. الطلبات الموجودة يمكن للإدارة مراجعتها وقبولها أو رفضها في أي وقت.
            </Text>
          </View>
        </Animated.View>

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
    fontSize: 12,
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
    backgroundColor: Colors.backgroundSoft,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'right',
    lineHeight: 22,
  },
  toggleCardsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 200,
  },
  toggleCardActive: {
    borderColor: Colors.success,
    backgroundColor: Colors.successSoft,
    shadowColor: Colors.success,
    shadowOpacity: 0.2,
    elevation: 6,
  },
  toggleCardInactive: {
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  toggleCardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleCardIconText: {
    fontSize: 28,
    color: Colors.white,
    fontWeight: '800',
  },
  toggleCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  toggleCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  toggleCardFeature: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    width: '100%',
  },
  toggleCardFeatureText: {
    fontSize: 12,
    color: Colors.success,
    textAlign: 'center',
    fontWeight: '600',
  },
  statusSection: {
    marginBottom: 24,
  },
  statusCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCardIconText: {
    fontSize: 20,
    color: Colors.white,
    fontWeight: '800',
  },
  statusCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
    flex: 1,
    marginRight: 12,
  },
  statusCardContent: {
    gap: 12,
  },
  statusCardItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusCardBullet: {
    fontSize: 16,
    color: Colors.success,
    marginLeft: 8,
    fontWeight: '800',
  },
  statusCardItemText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'right',
    lineHeight: 22,
  },
  saveButtonContainer: {
    marginBottom: 24,
  },
  noteContainer: {
    marginBottom: 16,
  },
  noteCard: {
    backgroundColor: Colors.infoSoft,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.info + '40',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteIcon: {
    fontSize: 20,
    marginLeft: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.info,
  },
  noteText: {
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'right',
    lineHeight: 24,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default RequestSettingsScreen;