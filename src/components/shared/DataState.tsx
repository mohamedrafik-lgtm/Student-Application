// Shared DataState — loading, error, empty states with premium styling
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
          <Icon name={AppIcons.warning} size={34} color={Colors.error} />
        </View>
        <Text style={s.errorTitle}>حدث خطأ</Text>
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
          <Icon name={emptyIcon || AppIcons.document} size={38} color={Colors.primary} />
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
    paddingVertical: 70,
    paddingHorizontal: 24,
  },
  loaderWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  loadingText: {
    fontSize: 14, color: Colors.textLight, fontWeight: '600', textAlign: 'center',
  },
  errorCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.errorLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 17, fontWeight: '800', color: Colors.textPrimary,
    textAlign: 'center', marginBottom: 6,
  },
  errorText: {
    fontSize: 14, fontWeight: '500', color: Colors.textSecondary,
    textAlign: 'center', marginBottom: 22, lineHeight: 22,
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  emptyCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17, fontWeight: '800', color: Colors.textPrimary,
    textAlign: 'center', marginBottom: 8,
  },
  emptyMsg: {
    fontSize: 14, color: Colors.textLight, textAlign: 'center', lineHeight: 22,
  },
});

export default DataState;
