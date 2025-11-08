import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Platform,
} from 'react-native';
import { Colors } from '../styles/colors';
import { theme } from '../styles/theme';

export type DrawerTab =
  | 'home'
  | 'schedule'
  | 'grades'
  | 'exams'
  | 'attendance'
  | 'documents'
  | 'payments'
  | 'profile';

interface RightDrawerMenuProps {
  currentTab: DrawerTab;
  onSelect: (tab: DrawerTab) => void;
}

const TABS: { id: DrawerTab; label: string; icon?: string }[] = [
  { id: 'home', label: 'الرئيسية', icon: '🏠' },
  { id: 'schedule', label: 'الجدول', icon: '📅' },
  { id: 'grades', label: 'الدرجات', icon: '📊' },
  { id: 'exams', label: 'الاختبارات', icon: '📝' },
  { id: 'attendance', label: 'سجل الحضور و الغياب', icon: '✅' },
  // renamed for clarity per user request
  { id: 'documents', label: 'الوثائق', icon: '📄' },
  { id: 'payments', label: 'المدفوعات', icon: '💰' },
  { id: 'profile', label: 'الملف', icon: '👤' },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const RightDrawerMenu: React.FC<RightDrawerMenuProps> = ({ currentTab, onSelect }) => {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open

  const toggle = (toOpen?: boolean) => {
    const next = typeof toOpen === 'boolean' ? toOpen : !open;
    setOpen(next);
    Animated.timing(anim, {
      toValue: next ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const handleSelect = (tab: DrawerTab) => {
    // close then navigate
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setOpen(false);
      onSelect(tab);
    });
  };

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH, SCREEN_WIDTH - Math.min(320, SCREEN_WIDTH * 0.75)],
  });

  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });

  return (
    <>
      {/* Floating menu button */}
      <View pointerEvents="box-none" style={styles.container}>
        <TouchableOpacity
          accessibilityLabel="Open menu"
          onPress={() => toggle()}
          activeOpacity={0.8}
          style={styles.menuButton}
        >
          <Text style={styles.menuButtonIcon}>≡</Text>
        </TouchableOpacity>
      </View>

      {/* Backdrop */}
      {open && (
        <Animated.View
          pointerEvents={open ? 'auto' : 'none'}
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <TouchableOpacity style={{ flex: 1 }} onPress={() => toggle(false)} />
        </Animated.View>
      )}

      {/* Drawer Panel */}
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX }] },
        ]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <View style={[styles.drawerHeader, { backgroundColor: Colors.primaryLight }]}> 
          <Text style={styles.drawerTitle}>القائمة</Text>
          <TouchableOpacity onPress={() => toggle(false)} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.itemsContainer}>
          {TABS.map((t) => {
            const active = t.id === currentTab;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.item, active && styles.itemActive]}
                onPress={() => handleSelect(t.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.itemIconWrap, active && styles.itemIconWrapActive]}>
                  <Text style={[styles.itemIcon, active && styles.itemIconActive]}>{t.icon}</Text>
                </View>
                <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.bottomSpacer} />
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: Platform.OS === 'ios' ? 28 : 20,
    zIndex: 40,
  },
  menuButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadowPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  menuButtonIcon: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 30,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: Math.min(320, SCREEN_WIDTH * 0.75),
    backgroundColor: Colors.white,
    zIndex: 50,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
    paddingTop: Platform.OS === 'ios' ? 72 : 24,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
    color: Colors.white,
  },
  itemsContainer: {
    paddingTop: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 8,
    marginVertical: 6,
  },
  itemActive: {
    backgroundColor: Colors.primaryGlow,
  },
  itemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(15,23,42,0.03)'
  },
  itemIconWrapActive: {
    backgroundColor: Colors.primary,
  },
  itemIcon: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  itemIconActive: {
    color: Colors.white,
  },
  itemLabel: {
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  itemLabelActive: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  bottomSpacer: {
    flex: 1,
  },
});

export default RightDrawerMenu;
