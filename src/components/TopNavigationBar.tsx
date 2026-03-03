// SOLID Principles Applied:
// 1. Single Responsibility: This component only handles top navigation UI
// 2. Open/Closed: Can be extended with new tabs without modification
// 3. Interface Segregation: Uses specific interfaces for different concerns

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Platform,
  ScrollView,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';

export type TopNavTab =
  | 'home'
  | 'schedule'
  | 'academic-results'
  | 'grade-appeals'
  | 'exams'
  | 'register-attendance'
  | 'documents'
  | 'payments'
  | 'payment-due-dates'
  | 'profile'
  | 'training-contents'
  | 'requests-hub'
  | 'survey'
  | 'assignments';

interface TopNavigationBarProps {
  currentTab: TopNavTab;
  onSelect: (tab: TopNavTab) => void;
  onLogout?: () => void;
  onNavigateToProfile?: () => void;
}

const TABS: { id: TopNavTab; label: string }[] = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'schedule', label: 'الجدول' },
  { id: 'training-contents', label: 'المحتوى التدريبي' },
  { id: 'academic-results', label: 'النتائج الدراسية' },
  { id: 'grade-appeals', label: 'تظلمات الدرجات' },
  { id: 'exams', label: 'الاختبارات' },
  { id: 'register-attendance', label: 'تسجيل الحضور' },
  { id: 'requests-hub', label: 'الطلبات' },
  { id: 'survey', label: 'الاستبيان' },
  { id: 'assignments', label: 'المهام والتكليفات' },
  { id: 'documents', label: 'الوثائق' },
  { id: 'payments', label: 'المدفوعات' },
  { id: 'payment-due-dates', label: 'مواعيد السداد' },
  { id: 'profile', label: 'الملف' },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75; // عرض القائمة 75% من الشاشة

const TopNavigationBar: React.FC<TopNavigationBarProps> = ({ 
  currentTab, 
  onSelect,
  onLogout,
  onNavigateToProfile
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const nextExpanded = !isExpanded;
    
    if (nextExpanded) {
      // فتح القائمة
      setIsExpanded(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // إغلاق القائمة
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsExpanded(false);
      });
    }
  };

  const handleSelect = (tab: TopNavTab) => {
    if (isExpanded) {
      toggleMenu();
    }
    onSelect(tab);
  };

  const handleLogout = () => {
    // Close menu if open
    if (isExpanded) {
      toggleMenu();
    }
    
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { 
        text: 'تسجيل الخروج', 
        style: 'destructive', 
        onPress: () => {
          onLogout && onLogout();
        }
      },
    ]);
  };

  const closeMenu = () => {
    if (isExpanded) {
      toggleMenu();
    }
  };

  // Animation values for drawer sliding from right
  const drawerTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [DRAWER_WIDTH, 0], // يبدأ من اليمين (موجب) وينزلق إلى 0
  });

  return (
    <>
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        {/* Main Navigation Bar */}
        <View style={styles.mainBar}>
          <View style={styles.mainBarContent}>
            {/* Menu Toggle Button */}
            <TouchableOpacity
              onPress={toggleMenu}
              style={styles.menuToggleButton}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700' }}>{isExpanded ? '✕' : '☰'}</Text>
            </TouchableOpacity>

            {/* Current Tab Display */}
            <View style={styles.currentTabContainer}>
              <Text style={styles.currentTabLabel} numberOfLines={1}>
                {TABS.find(t => t.id === currentTab)?.label || 'الرئيسية'}
              </Text>
            </View>

            {/* Profile Button */}
            <TouchableOpacity
              onPress={() => {
                // Close menu if open
                if (isExpanded) {
                  toggleMenu();
                }
                
                if (onNavigateToProfile) {
                  onNavigateToProfile();
                } else {
                  onSelect('profile');
                }
              }}
              style={styles.profileButton}
              activeOpacity={0.7}
            >
              <Text style={styles.profileText}>الملف</Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </SafeAreaView>

      {/* Side Drawer Menu */}
      <Modal
        visible={isExpanded}
        transparent={true}
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View style={styles.modalContainer}>
          {/* Overlay Background */}
          <TouchableWithoutFeedback onPress={closeMenu}>
            <Animated.View 
              style={[
                styles.overlay,
                {
                  opacity: overlayOpacity,
                }
              ]}
            />
          </TouchableWithoutFeedback>

          {/* Drawer Menu */}
        <Animated.View 
          style={[
              styles.drawer,
              {
                transform: [{ translateX: drawerTranslateX }],
              }
            ]}
          >
            <SafeAreaView style={styles.drawerSafeArea} edges={['top', 'right']}>
              {/* Drawer Header */}
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>القائمة</Text>
                <TouchableOpacity
                  onPress={closeMenu}
                  style={styles.drawerCloseButton}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: Colors.textPrimary, fontSize: 18, fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Drawer Content */}
          <ScrollView 
                style={styles.drawerScrollView}
                contentContainerStyle={styles.drawerContent}
            showsVerticalScrollIndicator={false}
          >
            {TABS.map((tab) => {
              const isActive = tab.id === currentTab;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  onPress={() => handleSelect(tab.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.menuItemLabel,
                    isActive && styles.menuItemLabelActive
                  ]}>
                    {tab.label}
                  </Text>
                  {isActive && <View style={styles.activeIndicator} />}
                </TouchableOpacity>
              );
            })}
            
            {/* Logout Menu Item */}
            <TouchableOpacity
              style={styles.logoutMenuItem}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutMenuItemLabel}>
                تسجيل الخروج
              </Text>
            </TouchableOpacity>
          </ScrollView>
            </SafeAreaView>
        </Animated.View>
      </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.primaryDark,
    zIndex: 100,
  },
  container: {
    backgroundColor: Colors.primaryDark,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  mainBar: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  mainBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuToggleButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentTabContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  currentTabLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    gap: 4,
  },
  profileText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Modal and Drawer Styles
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Colors.white,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  drawerSafeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: Colors.primaryDark,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  drawerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerScrollView: {
    flex: 1,
  },
  drawerContent: {
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginVertical: 3,
    backgroundColor: Colors.backgroundSoft,
  },
  menuItemActive: {
    backgroundColor: Colors.primarySoft,
    borderWidth: 1.5,
    borderColor: Colors.primary100,
  },
  menuItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItemIconContainerActive: {
    backgroundColor: Colors.primary,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  menuItemLabelActive: {
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  activeIndicator: {
    position: 'absolute',
    right: 10,
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginVertical: 3,
    marginTop: 16,
    backgroundColor: Colors.errorSoft,
  },
  logoutMenuItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutMenuItemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.error,
    textAlign: 'right',
  },
});

export default TopNavigationBar;

