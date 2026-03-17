// Home — Quick Actions Grid
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon, { AppIcons } from '../shared/Icon';
import { Colors } from '../../styles/colors';

interface Props {
  onSchedule?: () => void;
  onRequests?: () => void;
  onContents?: () => void;
  onProfile?: () => void;
  onPayments?: () => void;
  onDocuments?: () => void;
}

const QuickActions: React.FC<Props> = ({
  onSchedule, onRequests, onContents, onProfile, onPayments, onDocuments,
}) => {
  return (
    <View style={s.section}>
      <Text style={s.title}>إجراءات سريعة</Text>

      <View style={s.grid2x2}>
        <QuickActionCard icon={AppIcons.profile} label="البيانات الشخصية" onPress={onProfile} />
        <QuickActionCard icon={AppIcons.payments} label="المدفوعات" onPress={onPayments} />
        <QuickActionCard icon={AppIcons.document} label="الوثائق" onPress={onDocuments} />
        <QuickActionCard icon={AppIcons.requests} label="الطلبات" onPress={onRequests} />
      </View>

      <TouchableOpacity style={s.wideAction} onPress={onContents} activeOpacity={0.8}>
        <View style={s.wideIconWrap}>
          <Icon name={AppIcons.content} size={22} color={Colors.primaryDark} />
        </View>
        <Text style={s.wideActionText}>المحتوى التعليمي</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.secondaryWideAction} onPress={onSchedule} activeOpacity={0.8}>
        <View style={s.wideIconWrap}>
          <Icon name={AppIcons.schedule} size={22} color={Colors.info} />
        </View>
        <Text style={s.secondaryWideActionText}>الجدول الدراسي</Text>
      </TouchableOpacity>
    </View>
  );
};

const QuickActionCard = ({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) => (
  <TouchableOpacity style={s.item} onPress={onPress} activeOpacity={0.7}>
    <View style={s.iconCircle}>
      <Icon name={icon} size={22} color={Colors.textSecondary} />
    </View>
    <Text style={s.label}>{label}</Text>
  </TouchableOpacity>
);

const s = StyleSheet.create({
  section: { marginHorizontal: 16, marginTop: 14 },
  title: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right', marginBottom: 12 },
  grid2x2: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  item: {
    width: '48.5%',
    backgroundColor: Colors.white, borderRadius: 18, paddingVertical: 16,
    alignItems: 'center', marginBottom: 10,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1, shadowRadius: 6, elevation: 1,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  iconCircle: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    backgroundColor: Colors.backgroundAlt,
  },
  label: { fontSize: 12, color: Colors.textPrimary, fontWeight: '700' },
  wideAction: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.borderLight,
    paddingVertical: 14, gap: 10,
  },
  wideIconWrap: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.backgroundSoft,
  },
  wideActionText: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  secondaryWideAction: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.infoLight, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.infoBorder,
    paddingVertical: 14, gap: 10, marginTop: 10,
  },
  secondaryWideActionText: { fontSize: 14, fontWeight: '800', color: Colors.info },
});

export default QuickActions;
