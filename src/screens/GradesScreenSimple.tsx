import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import { Colors } from '../styles/colors';
import Icon, { AppIcons } from '../components/shared/Icon';

interface GradesScreenProps {
  accessToken: string;
  onBack: () => void;
}

const GradesScreenSimple: React.FC<GradesScreenProps> = ({
  accessToken,
  onBack,
}) => {
  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Icon name={AppIcons.back} size={18} color={Colors.primary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>الدرجات</Text>
        </View>
        <View style={{width: 38}} />
      </View>

      {/* Content */}
      <View style={s.content}>
        <Text style={s.emoji}>📊</Text>
        <Text style={s.title}>صفحة الدرجات</Text>
        <Text style={s.desc}>مرحباً بك في صفحة الدرجات!</Text>
        <View style={s.tokenBadge}>
          <Text style={s.tokenText}>
            Access Token: {accessToken ? 'موجود ✓' : 'غير موجود'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  desc: {
    fontSize: 15,
    color: Colors.textHint,
    textAlign: 'center',
    marginBottom: 24,
  },
  tokenBadge: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tokenText: {
    fontSize: 13,
    color: Colors.textHint,
  },
});

export default GradesScreenSimple;
