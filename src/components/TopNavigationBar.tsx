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
  | 'grades'
  | 'exams'
  | 'attendance'
  | 'documents'
  | 'payments'
  | 'profile'
  | 'training-contents'
  | 'requests-hub';

interface TopNavigationBarProps {
  currentTab: TopNavTab;
  onSelect: (tab: TopNavTab) => void;
  onLogout?: () => void;
  onNavigateToProfile?: () => void;
}

const TABS: { id: TopNavTab; label: string; icon?: string }[] = [
  { id: 'home', label: 'الرئيسية', icon: '🏠' },
  { id: 'schedule', label: 'الجدول', icon: '📅' },
  { id: 'training-contents', label: 'المحتوى التدريبي', icon: '📚' },
  { id: 'grades', label: 'الدرجات', icon: '📊' },
  { id: 'exams', label: 'الاختبارات', icon: '📝' },
  { id: 'attendance', label: 'الحضور', icon: '✅' },
  { id: 'requests-hub', label: 'الطلبات', icon: '📋' },
  { id: 'documents', label: 'الوثائق', icon: '📄' },
  { id: 'payments', label: 'المدفوعات', icon: '💰' },
  { id: 'profile', label: 'الملف', icon: '👤' },
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
              <Text style={styles.menuToggleIcon}>
                {isExpanded ? '✕' : '≡'}
              </Text>
            </TouchableOpacity>

            {/* Current Tab Display */}
            <View style={styles.currentTabContainer}>
              <Text style={styles.currentTabIcon}>
                {TABS.find(t => t.id === currentTab)?.icon || '🏠'}
              </Text>
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
              <Text style={styles.profileIcon}>👤</Text>
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
                  <Text style={styles.drawerCloseIcon}>✕</Text>
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
                  <View style={[
                    styles.menuItemIconContainer,
                    isActive && styles.menuItemIconContainerActive
                  ]}>
                    <Text style={[
                      styles.menuItemIcon,
                      isActive && styles.menuItemIconActive
                    ]}>
                      {tab.icon}
                    </Text>
                  </View>
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
              <View style={styles.logoutMenuItemIconContainer}>
                <Text style={styles.logoutMenuItemIcon}>🚪</Text>
              </View>
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
    backgroundColor: Colors.white,
    zIndex: 100,
  },
  container: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mainBar: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mainBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuToggleButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuToggleIcon: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '800',
  },
  currentTabContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.backgroundSoft,
    borderRadius: 12,
  },
  currentTabIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  currentTabLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.primarySoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  profileIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  profileText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'right',
  },
  // Modal and Drawer Styles
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Colors.white,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.primarySoft,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  drawerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  drawerCloseIcon: {
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  drawerScrollView: {
    flex: 1,
  },
  drawerContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 6,
    backgroundColor: Colors.backgroundSoft,
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: Colors.primarySoft,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  menuItemIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemIconContainerActive: {
    backgroundColor: Colors.primary,
  },
  menuItemIcon: {
    fontSize: 22,
  },
  menuItemIconActive: {
    fontSize: 22,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 16,
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
    right: 12,
    width: 4,
    height: '60%',
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 6,
    marginTop: 20,
    backgroundColor: Colors.errorSoft,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  logoutMenuItemIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutMenuItemIcon: {
    fontSize: 22,
    color: Colors.white,
  },
  logoutMenuItemLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.error,
    textAlign: 'right',
  },
});

export default TopNavigationBar;

