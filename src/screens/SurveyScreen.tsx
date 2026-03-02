// SurveyScreen — الاستبيان
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, Dimensions,
} from 'react-native';
import { Colors } from '../styles/colors';
import ScreenHeader from '../components/shared/ScreenHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ══════════════════════════════════ PROPS ══════════════════════════════════ */
interface Props {
  accessToken: string;
  onBack: () => void;
}

/* ══════════════════════════════════ COMPONENT ══════════════════════════════════ */
const SurveyScreen: React.FC<Props> = ({ accessToken, onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const onRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <View style={st.container}>
      <ScreenHeader
        title="الاستبيان"
        subtitle="شارك برأيك لتحسين العملية التدريبية"
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Empty State */}
          <View style={st.emptyContainer}>
            <Text style={st.emptyIcon}>📋</Text>
            <Text style={st.emptyTitle}>الاستبيان</Text>
            <Text style={st.emptyDesc}>
              لا توجد استبيانات متاحة حالياً
            </Text>
            <Text style={st.emptyHint}>
              سيتم إعلامك عند توفر استبيان جديد
            </Text>
          </View>
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

/* ══════════════════════════════════ STYLES ══════════════════════════════════ */
const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.borderLight,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.textHint,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SurveyScreen;
