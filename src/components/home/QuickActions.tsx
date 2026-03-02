// Home — Quick Actions Grid
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Icon, { AppIcons } from '../shared/Icon';
import { Colors } from '../../styles/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface QuickAction {
  icon: string;
  label: string;
  onPress?: () => void;
  bgColor: string;
  iconColor: string;
}

interface Props {
  onSchedule?: () => void;
  onExams?: () => void;
  onGrades?: () => void;
  onRequests?: () => void;
  onContents?: () => void;
  onProfile?: () => void;
}

const QuickActions: React.FC<Props> = ({
  onSchedule, onExams, onGrades, onRequests, onContents, onProfile,
}) => {
  const actions: QuickAction[] = [
    { icon: AppIcons.schedule, label: 'الجدول', onPress: onSchedule, bgColor: Colors.infoLight, iconColor: Colors.info },
    { icon: AppIcons.exams, label: 'الاختبارات', onPress: onExams, bgColor: Colors.warningLight, iconColor: Colors.warning },
    { icon: AppIcons.grades, label: 'الدرجات', onPress: onGrades, bgColor: Colors.backgroundSoft, iconColor: Colors.primary },
    { icon: AppIcons.requests, label: 'الطلبات', onPress: onRequests, bgColor: Colors.secondarySoft, iconColor: Colors.secondary },
    { icon: AppIcons.content, label: 'المحتوى', onPress: onContents, bgColor: Colors.errorLight, iconColor: Colors.error },
    { icon: AppIcons.profile, label: 'الملف', onPress: onProfile, bgColor: Colors.primary50, iconColor: Colors.primaryDark },
  ];

  return (
    <View style={s.section}>
      <Text style={s.title}>الوصول السريع</Text>
      <View style={s.grid}>
        {actions.map((a, i) => (
          <TouchableOpacity key={i} style={s.item} onPress={a.onPress} activeOpacity={0.7}>
            <View style={[s.iconCircle, { backgroundColor: a.bgColor }]}>
              <Icon name={a.icon} size={22} color={a.iconColor} />
            </View>
            <Text style={s.label}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  section: { marginHorizontal: 16, marginTop: 14 },
  title: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  item: {
    width: (SCREEN_WIDTH - 56) / 3,
    backgroundColor: Colors.white, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginBottom: 10,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1, shadowRadius: 6, elevation: 1,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  iconCircle: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  label: { fontSize: 12, color: Colors.textPrimary, fontWeight: '700' },
});

export default QuickActions;
