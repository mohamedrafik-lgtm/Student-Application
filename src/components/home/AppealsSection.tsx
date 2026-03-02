// Home — Grade Appeals section
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon, { AppIcons } from '../shared/Icon';
import { Colors } from '../../styles/colors';
import { GradeAppeal } from '../../services/homeService';

interface Props {
  appeals: GradeAppeal[];
  onViewAll?: () => void;
}

const statusMap: Record<string, { label: string; bg: string; color: string }> = {
  approved: { label: 'تمت الموافقة', bg: Colors.successLight, color: Colors.success },
  rejected: { label: 'مرفوض', bg: Colors.errorLight, color: Colors.error },
  pending:  { label: 'قيد المراجعة', bg: Colors.warningLight, color: Colors.warning },
};

const AppealsSection: React.FC<Props> = ({ appeals, onViewAll }) => (
  <View style={s.card}>
    <View style={s.header}>
      <Text style={s.title}>طلبات مراجعة الدرجات</Text>
      <View style={s.countBadge}><Text style={s.countText}>{appeals.length}</Text></View>
    </View>
    {appeals.slice(0, 3).map((a) => {
      const st = statusMap[a.status] || statusMap.pending;
      return (
        <View key={a.id} style={s.item}>
          <View style={[s.statusPill, { backgroundColor: st.bg }]}>
            <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
          </View>
          <View style={s.info}>
            <Text style={s.course}>المادة #{a.courseId}</Text>
            <Text style={s.grades}>الدرجة: {a.currentGrade} → {a.requestedGrade}</Text>
          </View>
        </View>
      );
    })}
    {appeals.length > 3 && (
      <TouchableOpacity style={s.viewAll} onPress={onViewAll}>
        <Text style={s.viewAllText}>عرض جميع الطلبات ({appeals.length})</Text>
      </TouchableOpacity>
    )}
  </View>
);

const s = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginTop: 14, backgroundColor: Colors.white,
    borderRadius: 20, padding: 16,
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginLeft: 8 },
  countBadge: {
    backgroundColor: Colors.primary, width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  countText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  item: {
    backgroundColor: Colors.backgroundAlt, borderRadius: 12, padding: 12, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
  },
  info: { flex: 1, alignItems: 'flex-end', marginRight: 8 },
  course: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  grades: { fontSize: 11, color: Colors.textLight, textAlign: 'right', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  viewAll: { alignItems: 'center', paddingTop: 8 },
  viewAllText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
});

export default AppealsSection;
