// Shared DataState — loading, error, empty states
// Single Responsibility: Only state displays (loading spinner, error card, empty card)
import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import Icon, { AppIcons } from './Icon';
import { Colors } from '../../styles/colors';

interface Props {
  isLoading?: boolean;
  loadingText?: string;
  error?: string | null;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  children?: React.ReactNode;
}

const DataState: React.FC<Props> = ({
  isLoading, loadingText = 'جاري التحميل...', error, onRetry,
  isEmpty, emptyIcon, emptyTitle = 'لا توجد بيانات', emptyMessage, children,
}) => {
  if (isLoading) {
    return (
      <View style={s.center}>
        <View style={s.loaderWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
        <Text style={s.loadingText}>{loadingText}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.center}>
        <View style={s.errorCircle}>
          <Icon name={AppIcons.warning} size={32} color={Colors.error} />
        </View>
        <Text style={s.errorText}>{error}</Text>
        {onRetry ? (
          <TouchableOpacity style={s.retryBtn} onPress={onRetry} activeOpacity={0.8}>
            <Icon name={AppIcons.refresh} size={16} color={Colors.white} />
            <Text style={s.retryText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={s.center}>
        <View style={s.emptyCircle}>
          <Icon name={emptyIcon || AppIcons.document} size={36} color={Colors.primary} />
        </View>
        <Text style={s.emptyTitle}>{emptyTitle}</Text>
        {emptyMessage ? <Text style={s.emptyMsg}>{emptyMessage}</Text> : null}
      </View>
    );
  }

  return <>{children}</>;
};

const s = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  loaderWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14, color: Colors.textLight, fontWeight: '600', textAlign: 'center',
  },
  errorCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.errorLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 15, fontWeight: '600', color: Colors.error,
    textAlign: 'center', marginBottom: 20, lineHeight: 22,
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, paddingHorizontal: 22, paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  emptyCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17, fontWeight: '700', color: Colors.textPrimary,
    textAlign: 'center', marginBottom: 6,
  },
  emptyMsg: {
    fontSize: 13, color: Colors.textLight, textAlign: 'center', lineHeight: 20,
  },
});

export default DataState;
