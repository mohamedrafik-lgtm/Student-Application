// AssignmentsScreen — المهام والتكليفات (Static)
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import {Colors} from '../styles/colors';
import Icon from '../components/shared/Icon';
import ScreenHeader from '../components/shared/ScreenHeader';

const {width: SW} = Dimensions.get('window');

/* ═══════════════════════════════════ TYPES ═══════════════════════════════════ */
interface Props {
  accessToken: string;
  onBack: () => void;
}

type Tab = 'pending' | 'submitted';

/* ═══════════════════════════════════ DATA ═══════════════════════════════════ */
const TIPS: {title: string; desc: string; icon: string; color: string}[] = [
  {
    title: 'التخطيط المسبق',
    desc: 'اقرأ المهمة بعناية واكتب خطة عمل قبل البدء في التنفيذ',
    icon: 'lightbulb-outline',
    color: '#F59E0B',
  },
  {
    title: 'إدارة الوقت',
    desc: 'قسّم المهمة إلى أجزاء صغيرة واعمل عليها تدريجياً قبل الموعد النهائي',
    icon: 'clock-outline',
    color: '#3B82F6',
  },
  {
    title: 'الجودة أولاً',
    desc: 'راجع عملك قبل التسليم وتأكد من استيفاء جميع المتطلبات',
    icon: 'check-circle-outline',
    color: '#10B981',
  },
  {
    title: 'طلب المساعدة',
    desc: 'لا تتردد في سؤال المدرب إذا واجهت صعوبة في فهم المطلوب',
    icon: 'account-question-outline',
    color: '#8B5CF6',
  },
];

/* ═══════════════════════════════════ COMPONENT ═══════════════════════════════════ */
const AssignmentsScreen: React.FC<Props> = ({onBack}) => {
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  /* ─────────────── Tabs ─────────────── */
  const renderTabs = () => (
    <View style={st.tabsContainer}>
      <TouchableOpacity
        style={[st.tab, activeTab === 'pending' && st.tabActive]}
        onPress={() => setActiveTab('pending')}
        activeOpacity={0.7}>
        <Icon
          name="clock-outline"
          size={16}
          color={activeTab === 'pending' ? '#FFF' : Colors.textSecondary}
        />
        <Text
          style={[st.tabText, activeTab === 'pending' && st.tabTextActive]}>
          المهام المطلوبة
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[st.tab, activeTab === 'submitted' && st.tabActive]}
        onPress={() => setActiveTab('submitted')}
        activeOpacity={0.7}>
        <Icon
          name="check-circle-outline"
          size={16}
          color={activeTab === 'submitted' ? '#FFF' : Colors.textSecondary}
        />
        <Text
          style={[
            st.tabText,
            activeTab === 'submitted' && st.tabTextActive,
          ]}>
          المهام المسلمة
        </Text>
      </TouchableOpacity>
    </View>
  );

  /* ─────────────── Empty State ─────────────── */
  const renderEmpty = () => (
    <View style={st.emptyCard}>
      <View style={st.emptyIconCircle}>
        <Icon
          name={
            activeTab === 'pending'
              ? 'clipboard-text-outline'
              : 'clipboard-check-outline'
          }
          size={48}
          color={Colors.primary}
        />
      </View>
      <Text style={st.emptyTitle}>
        {activeTab === 'pending'
          ? 'لا توجد مهام مطلوبة حالياً'
          : 'لم يتم تسليم أي مهام بعد'}
      </Text>
      <Text style={st.emptyDesc}>
        {activeTab === 'pending'
          ? 'ستظهر المهام والتكليفات هنا عند إضافتها من المحاضرين'
          : 'عند تسليم المهام المطلوبة ستظهر هنا لمتابعة حالة التقييم'}
      </Text>
    </View>
  );

  /* ─────────────── Tips Section ─────────────── */
  const renderTips = () => (
    <View style={st.tipsSection}>
      <View style={st.tipsTitleRow}>
        <Icon name="lightbulb-on-outline" size={20} color="#F59E0B" />
        <Text style={st.tipsTitle}>نصائح لإنجاز المهام</Text>
      </View>
      {TIPS.map((tip, i) => (
        <View key={i} style={st.tipCard}>
          <View style={[st.tipIconCircle, {backgroundColor: tip.color + '18'}]}>
            <Icon name={tip.icon} size={20} color={tip.color} />
          </View>
          <View style={st.tipContent}>
            <Text style={st.tipTitle}>{tip.title}</Text>
            <Text style={st.tipDesc}>{tip.desc}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  /* ─────────────── Main Render ─────────────── */
  return (
    <View style={st.container}>
      <ScreenHeader
        title="المهام والتكليفات"
        subtitle="تابع مهامك وسلّم تكليفاتك في الوقت المحدد"
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}>
        <Animated.View style={{opacity: fadeAnim}}>
          {renderTabs()}
          {renderEmpty()}
          {renderTips()}
        </Animated.View>
        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
};

/* ═══════════════════════════════════ STYLES ═══════════════════════════════════ */
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

  /* Tabs */
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 40,
    alignItems: 'center',
    shadowColor: Colors.primaryDark,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  /* Tips */
  tipsSection: {
    marginTop: 4,
  },
  tipsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 14,
  },
  tipsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  tipCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  tipIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
  },
  tipContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'right',
  },
  tipDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: 'right',
  },
});

export default AssignmentsScreen;
