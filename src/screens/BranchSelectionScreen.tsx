// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles branch selection
// 2. Open/Closed: Can be extended with new branch features without modification
// 3. Interface Segregation: Uses specific interfaces for different concerns
// 4. Dependency Inversion: Depends on abstractions (services) not concretions

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BranchService } from '../services/branchService';
import { BranchType, BranchInfo } from '../types/auth';
import { Colors } from '../styles/colors';
import CustomButton from '../components/CustomButton';

const { width, height } = Dimensions.get('window');

interface BranchSelectionScreenProps {
  onBranchSelected: (branch: BranchType) => void;
  onSkip?: () => void; // للاختيار التلقائي إذا كان هناك فرع محفوظ
}

const BranchSelectionScreen: React.FC<BranchSelectionScreenProps> = ({
  onBranchSelected,
  onSkip
}) => {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<BranchType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [savedBranch, setSavedBranch] = useState<BranchType | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    initializeScreen();
  }, []);

  useEffect(() => {
    if (branches.length > 0) {
      // Start entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [branches]);

  const initializeScreen = async () => {
    try {
      setIsLoading(true);
      
      // الحصول على جميع الفروع
      const allBranches = BranchService.getAllBranches();
      setBranches(allBranches);
      
      // التحقق من وجود فرع محفوظ
      const saved = await BranchService.getSavedBranch();
      if (saved) {
        setSavedBranch(saved);
        setSelectedBranch(saved);
        
        // إذا كان هناك فرع محفوظ، يمكن تخطي الشاشة تلقائياً
        if (onSkip) {
          setTimeout(() => {
            onSkip();
          }, 2000); // انتظار قصير لعرض الشاشة
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize branch selection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBranchSelect = (branch: BranchType) => {
    setSelectedBranch(branch);
    
    // Animation feedback
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleContinue = async () => {
    if (!selectedBranch) {
      Alert.alert('اختيار الفرع', 'يرجى اختيار فرع قبل المتابعة');
      return;
    }

    try {
      setIsValidating(true);
      
      // حفظ الفرع المختار مباشرة بدون التحقق من الخادم
      await BranchService.saveSelectedBranch(selectedBranch);
      
      // الانتقال للشاشة التالية
      onBranchSelected(selectedBranch);
      
    } catch (error) {
      console.error('❌ Failed to save branch:', error);
      Alert.alert(
        'خطأ في حفظ الفرع',
        'حدث خطأ أثناء حفظ اختيار الفرع. يرجى المحاولة مرة أخرى.',
        [
          { text: 'إعادة المحاولة', onPress: () => handleContinue() },
          { text: 'إلغاء', style: 'cancel' }
        ]
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  const renderBranchCard = (branch: BranchInfo) => {
    const isSelected = selectedBranch === branch.id;
    const isSaved = savedBranch === branch.id;

    return (
      <TouchableOpacity
        key={branch.id}
        style={[
          styles.branchCard,
          isSelected && styles.branchCardSelected,
          isSaved && styles.branchCardSaved
        ]}
        onPress={() => handleBranchSelect(branch.id)}
        activeOpacity={0.8}
      >
        {/* Background Gradient */}
        <View style={[
          styles.branchCardGradient,
          { backgroundColor: isSelected ? branch.color : 'rgba(255, 255, 255, 0.1)' }
        ]} />
        
        {/* Branch Icon */}
        <View style={[
          styles.branchIcon,
          { backgroundColor: isSelected ? Colors.white : branch.color }
        ]}>
          <Text style={[
            styles.branchIconText,
            { color: isSelected ? branch.color : Colors.white }
          ]}>
            {branch.icon}
          </Text>
        </View>

        {/* Branch Info */}
        <View style={styles.branchInfo}>
          <Text style={[
            styles.branchName,
            isSelected && styles.branchNameSelected
          ]}>
            {branch.nameAr}
          </Text>
          
          <Text style={[
            styles.branchCity,
            isSelected && styles.branchCitySelected
          ]}>
            {branch.cityAr}
          </Text>
          
          <Text style={[
            styles.branchDescription,
            isSelected && styles.branchDescriptionSelected
          ]}>
            {branch.descriptionAr}
          </Text>
        </View>

        {/* Selection Indicator */}
        {isSelected && (
          <View style={styles.selectionIndicator}>
            <Text style={styles.selectionIndicatorText}>✓</Text>
          </View>
        )}

        {/* Saved Indicator */}
        {isSaved && !isSelected && (
          <View style={styles.savedIndicator}>
            <Text style={styles.savedIndicatorText}>محفوظ</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>جاري تحميل الفروع...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Background with Gradient */}
      <View style={styles.backgroundContainer}>
        <View style={styles.gradientOverlay} />
        <View style={styles.decorativeCircles}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <Animated.View style={[
          styles.headerSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>اختيار الفرع</Text>
            <View style={styles.headerUnderline} />
          </View>
          
          <Text style={styles.headerSubtitle}>
            اختر الفرع الذي تريد التسجيل فيه
          </Text>
          
          {savedBranch && (
            <View style={styles.savedBranchInfo}>
              <Text style={styles.savedBranchText}>
                لديك فرع محفوظ: {BranchService.getBranchInfo(savedBranch).nameAr}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Branches List */}
        <Animated.View style={[
          styles.branchesSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          {branches.map(renderBranchCard)}
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={[
          styles.actionsSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <CustomButton
            title={isValidating ? "جاري التحقق..." : "متابعة"}
            onPress={handleContinue}
            variant="primary"
            size="large"
            disabled={!selectedBranch || isValidating}
            loading={isValidating}
          />
          
          {savedBranch && (
            <CustomButton
              title="استخدام الفرع المحفوظ"
              onPress={handleSkip}
              variant="outline"
              size="large"
            />
          )}
        </Animated.View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
  },
  decorativeCircles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: Colors.primarySoft,
  },
  circle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -75,
  },
  circle3: {
    width: 100,
    height: 100,
    top: '30%',
    right: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerTitleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerUnderline: {
    width: 80,
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  savedBranchInfo: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  savedBranchText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '600',
    textAlign: 'center',
  },
  branchesSection: {
    marginBottom: 40,
  },
  branchCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  branchCardSelected: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
  },
  branchCardSaved: {
    borderColor: Colors.success,
  },
  branchCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
  },
  branchIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  branchIconText: {
    fontSize: 28,
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  branchNameSelected: {
    color: Colors.primary,
  },
  branchCity: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  branchCitySelected: {
    color: Colors.primary,
  },
  branchDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  branchDescriptionSelected: {
    color: Colors.textPrimary,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  selectionIndicatorText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  savedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savedIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  actionsSection: {
    gap: 16,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default BranchSelectionScreen;
