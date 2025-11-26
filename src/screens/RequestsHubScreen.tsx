// Main hub for all requests (Payment Deferral & Free Requests)

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';

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
  onNavigateToSettings
}) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <View style={styles.backButtonContainer}>
            <Text style={styles.backButtonText}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الطلبات</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => onNavigateToSettings && onNavigateToSettings()}
        >
          <View style={styles.settingsButtonContainer}>
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Payment Deferral Button */}
        <TouchableOpacity
          style={[styles.categoryButton, styles.paymentButton]}
          onPress={() => onNavigateToPaymentDeferral && onNavigateToPaymentDeferral()}
          activeOpacity={0.8}
        >
          <View style={styles.categoryIconContainer}>
            <Text style={styles.categoryIcon}>💰</Text>
          </View>
          <Text style={styles.categoryTitle}>طلبات تأجيل السداد</Text>
          <Text style={styles.categoryDescription}>
            طلب تأجيل موعد سداد الرسوم الدراسية
          </Text>
          <Text style={styles.categoryArrow}>→</Text>
        </TouchableOpacity>

        {/* Free Requests Button */}
        <TouchableOpacity
          style={[styles.categoryButton, styles.freeButton]}
          onPress={() => onNavigateToFreeRequests && onNavigateToFreeRequests()}
          activeOpacity={0.8}
        >
          <View style={styles.categoryIconContainer}>
            <Text style={styles.categoryIcon}>📋</Text>
          </View>
          <Text style={styles.categoryTitle}>الطلبات المجانية</Text>
          <Text style={styles.categoryDescription}>
            إفادة، إثبات قيد، تأجيل اختبار، إجازة مرضية
          </Text>
          <Text style={styles.categoryArrow}>→</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  settingsButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  categoryButton: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
  },
  paymentButton: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  freeButton: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
  },
  categoryIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  categoryIcon: {
    fontSize: 36,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'right',
  },
  categoryDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    textAlign: 'right',
  },
  categoryArrow: {
    position: 'absolute',
    top: 24,
    left: 24,
    fontSize: 24,
    color: Colors.primary,
    fontWeight: '800',
  },
});

export default RequestsHubScreen;