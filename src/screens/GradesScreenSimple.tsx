import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

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
          <Text style={s.backArrow}>→</Text>
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
    backgroundColor: '#F4F6FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: '#2563EB',
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
    color: '#1A1D26',
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
    color: '#1A1D26',
    marginBottom: 10,
  },
  desc: {
    fontSize: 15,
    color: '#8E95A2',
    textAlign: 'center',
    marginBottom: 24,
  },
  tokenBadge: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  tokenText: {
    fontSize: 13,
    color: '#8E95A2',
  },
});

export default GradesScreenSimple;
