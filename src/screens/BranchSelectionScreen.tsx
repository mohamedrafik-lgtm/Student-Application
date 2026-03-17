// Branch Selection Screen
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { BranchService } from '../services/branchService';
import { BranchType, BranchInfo } from '../types/auth';
import CustomButton from '../components/CustomButton';
import { Colors } from '../styles/colors';

interface BranchSelectionScreenProps {
  onBranchSelected: (branch: BranchType) => void;
  onSkip?: () => void;
}

const BranchSelectionScreen: React.FC<BranchSelectionScreenProps> = ({ onBranchSelected, onSkip }) => {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<BranchType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [savedBranch, setSavedBranch] = useState<BranchType | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => { initializeScreen(); }, []);

  useEffect(() => {
    if (branches.length > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [branches]);

  const initializeScreen = async () => {
    try {
      setIsLoading(true);
      const allBranches = BranchService.getAllBranches();
      setBranches(allBranches);
      const saved = await BranchService.getSavedBranch();
      if (saved) {
        setSavedBranch(saved);
        setSelectedBranch(saved);
        if (onSkip) setTimeout(() => onSkip(), 2000);
      }
    } catch (error) { console.error('Failed to initialize branch selection:', error); }
    finally { setIsLoading(false); }
  };

  const handleContinue = async () => {
    if (!selectedBranch) { Alert.alert('اختيار الفرع', 'يرجى اختيار فرع قبل المتابعة'); return; }
    try {
      setIsValidating(true);
      await BranchService.saveSelectedBranch(selectedBranch);
      onBranchSelected(selectedBranch);
    } catch (error) {
      Alert.alert('خطأ في حفظ الفرع', 'حدث خطأ أثناء حفظ اختيار الفرع. يرجى المحاولة مرة أخرى.', [
        { text: 'إعادة المحاولة', onPress: () => handleContinue() },
        { text: 'إلغاء', style: 'cancel' },
      ]);
    } finally { setIsValidating(false); }
  };

  const renderBranchCard = (branch: BranchInfo) => {
    const isSelected = selectedBranch === branch.id;
    const isSaved = savedBranch === branch.id;
    return (
      <TouchableOpacity
        key={branch.id}
        style={[s.branchCard, isSelected && s.branchCardSelected]}
        onPress={() => setSelectedBranch(branch.id)}
        activeOpacity={0.7}
      >
        <View style={s.branchCardInner}>
          <View style={[s.branchIcon, { backgroundColor: isSelected ? branch.color : Colors.infoLight }]}>
            <MaterialCommunityIcons
              name={branch.icon as any}
              size={24}
              color={isSelected ? Colors.white : branch.color}
            />
          </View>
          <View style={s.branchInfo}>
            <Text style={[s.branchName, isSelected && s.branchNameSelected]}>{branch.nameAr}</Text>
            <Text style={s.branchCity}>{branch.cityAr}</Text>
            <Text style={s.branchDesc}>{branch.descriptionAr}</Text>
          </View>
          {isSelected && (
            <View style={s.checkCircle}><Text style={s.checkText}>✓</Text></View>
          )}
          {isSaved && !isSelected && (
            <View style={s.savedBadge}><Text style={s.savedBadgeText}>محفوظ</Text></View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingCenter}><ActivityIndicator size="large" color={Colors.primary} /><Text style={s.loadingText}>جاري تحميل الفروع...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View style={[s.headerSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.headerTitle}>اختيار الفرع</Text>
          <View style={s.underline} />
          <Text style={s.headerSubtitle}>اختر الفرع الذي تريد التسجيل فيه</Text>
          {savedBranch && (
            <View style={s.savedInfo}>
              <Text style={s.savedInfoText}>لديك فرع محفوظ: {BranchService.getBranchInfo(savedBranch).nameAr}</Text>
            </View>
          )}
        </Animated.View>

        {/* Branch Cards */}
        <Animated.View style={[s.branchesSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {branches.map(renderBranchCard)}
        </Animated.View>

        {/* Actions */}
        <Animated.View style={[s.actionsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <CustomButton title={isValidating ? 'جاري التحقق...' : 'متابعة'} onPress={handleContinue} variant="primary" size="large" disabled={!selectedBranch || isValidating} loading={isValidating} />
          {savedBranch && <CustomButton title="استخدام الفرع المحفوظ" onPress={() => onSkip?.()} variant="outline" size="large" />}
        </Animated.View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1, padding: 20 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 15, color: Colors.textPrimary, marginTop: 14, textAlign: 'center' },
  headerSection: { alignItems: 'center', marginBottom: 32, marginTop: 20 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  underline: { width: 60, height: 3, backgroundColor: Colors.primary, borderRadius: 2, marginBottom: 12 },
  headerSubtitle: { fontSize: 15, color: Colors.textLight, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  savedInfo: { backgroundColor: Colors.backgroundSoft, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: Colors.successBorder },
  savedInfoText: { fontSize: 13, color: Colors.primary, fontWeight: '600', textAlign: 'center' },
  branchesSection: { marginBottom: 28 },
  branchCard: { backgroundColor: Colors.white, borderRadius: 20, marginBottom: 14, borderWidth: 2, borderColor: Colors.borderMedium, shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, overflow: 'hidden' },
  branchCardSelected: { borderColor: Colors.primary, shadowColor: Colors.primaryDark, shadowOpacity: 0.15 },
  branchCardInner: { padding: 20, flexDirection: 'row', alignItems: 'center' },
  branchIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginLeft: 16 },
  branchInfo: { flex: 1, alignItems: 'flex-end' },
  branchName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4, textAlign: 'right' },
  branchNameSelected: { color: Colors.primary },
  branchCity: { fontSize: 14, fontWeight: '600', color: Colors.textLight, marginBottom: 4, textAlign: 'right' },
  branchDesc: { fontSize: 13, color: Colors.textLight, lineHeight: 19, textAlign: 'right' },
  checkCircle: { position: 'absolute', top: 16, right: 16, width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  checkText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  savedBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  savedBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.white },
  actionsSection: { gap: 12 },
});

export default BranchSelectionScreen;
