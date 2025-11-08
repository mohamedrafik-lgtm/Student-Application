// SOLID Principles Applied:
// 1. Single Responsibility: This component only handles bottom navigation UI
// 2. Open/Closed: Can be extended with new tabs without modification
// 3. Interface Segregation: Uses specific interfaces for different concerns

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';
import { theme } from '../styles/theme';

export type TabType = 'home' | 'schedule' | 'grades' | 'exams' | 'attendance' | 'documents' | 'payments' | 'profile';

interface BottomNavigationBarProps {
  currentTab: TabType;
  onTabPress: (tab: TabType) => void;
}

interface TabItem {
  id: TabType;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { id: 'home', label: 'الرئيسية', icon: '🏠' },
  { id: 'schedule', label: 'الجدول', icon: '📅' },
  { id: 'grades', label: 'الدرجات', icon: '📊' },
  { id: 'exams', label: 'الاختبارات', icon: '📝' },
  { id: 'attendance', label: 'الحضور', icon: '✅' },
  { id: 'documents', label: 'الوثائق', icon: '📄' },
  { id: 'payments', label: 'المدفوعات', icon: '💰' },
  { id: 'profile', label: 'الملف', icon: '👤' },
];

const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  currentTab,
  onTabPress,
}) => {
  // Split tabs into two rows (4 tabs per row)
  const firstRow = TABS.slice(0, 4);
  const secondRow = TABS.slice(4);

  const renderTab = (tab: TabItem) => {
    const isActive = currentTab === tab.id;
    return (
      <TouchableOpacity
        key={tab.id}
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => onTabPress(tab.id)}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
          {tab.icon}
        </Text>
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
          {tab.label}
        </Text>
        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.row}>
          {firstRow.map(renderTab)}
        </View>
        {secondRow.length > 0 && (
          <View style={styles.row}>
            {secondRow.map(renderTab)}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.navigation.bottomBar.backgroundColor,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  container: {
    backgroundColor: theme.navigation.bottomBar.backgroundColor,
    height: theme.navigation.bottomBar.height,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    ...theme.navigation.bottomBar.shadow,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    position: 'relative',
    borderRadius: 12,
    minWidth: 60,
    maxWidth: 90,
  },
  tabActive: {
    backgroundColor: Colors.primarySoft,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabIconActive: {
    transform: [{ scale: 1.1 }],
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 3,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});

export default BottomNavigationBar;

