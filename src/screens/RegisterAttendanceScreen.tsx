// RegisterAttendanceScreen - 6-digit attendance code entry with QR option
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Animated, ActivityIndicator, ScrollView, Dimensions, Alert,
} from 'react-native';
import { HomeService } from '../services/homeService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RegisterAttendanceScreenProps {
  accessToken: string;
  onBack: () => void;
}

type TabMode = 'code' | 'qr';

const CODE_LENGTH = 6;

const RegisterAttendanceScreen: React.FC<RegisterAttendanceScreenProps> = ({
  accessToken,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('code');
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleDigitChange = (index: number, value: string) => {
    // Only allow digits
    const sanitized = value.replace(/[^0-9]/g, '');
    if (sanitized.length > 1) {
      // Handle paste of full code
      const pastedDigits = sanitized.slice(0, CODE_LENGTH).split('');
      const newDigits = [...digits];
      pastedDigits.forEach((d, i) => {
        if (index + i < CODE_LENGTH) {
          newDigits[index + i] = d;
        }
      });
      setDigits(newDigits);
      const nextIndex = Math.min(index + pastedDigits.length, CODE_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      setErrorMessage(null);
      setSuccessMessage(null);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = sanitized;
    setDigits(newDigits);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Auto-advance to next input
    if (sanitized && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const getCode = () => digits.join('');

  const handleSubmit = async () => {
    const code = getCode();
    if (code.length !== CODE_LENGTH) {
      setErrorMessage('يرجى إدخال الكود المكون من 6 أرقام');
      triggerShake();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await HomeService.verifyAttendanceCode(accessToken, code);
      setSuccessMessage('تم تسجيل الحضور بنجاح ✅');
      setDigits(Array(CODE_LENGTH).fill(''));
    } catch (err: any) {
      const msg = err?.message || 'الكود غير صحيح أو منتهي الصلاحية';
      setErrorMessage(msg);
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setDigits(Array(CODE_LENGTH).fill(''));
    setErrorMessage(null);
    setSuccessMessage(null);
    inputRefs.current[0]?.focus();
  };

  const isFilled = digits.every(d => d !== '');

  return (
    <View style={s.container}>
      {/* ===== GREEN HEADER ===== */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backArrow}>→</Text>
          <Text style={s.backText}>العودة الرئيسية</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.headerRow}>
            <View style={s.qrIconBox}>
              <Text style={s.qrIconText}>▣</Text>
            </View>
            <Text style={s.headerTitle}>تسجيل الحضور</Text>
          </View>
          <Text style={s.headerSub}>أدخل كود الحضور أو امسح الكيو آر كود</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ===== WARNING BANNER ===== */}
        <Animated.View style={[s.warningBanner, { opacity: fadeAnim }]}>
          <View style={s.warningIcon}>
            <Text style={s.warningIconText}>⚠️</Text>
          </View>
          <View style={s.warningTextArea}>
            <Text style={s.warningTitle}>تنبيه هام</Text>
            <Text style={s.warningDesc}>
              أي محاولة تحايل على نظام الحضور أو تسجيل حضور من خارج مكان المحاضرة{' '}
              <Text style={s.warningHighlight}>لن يتم قبولها</Text>
            </Text>
            <Text style={s.warningDesc}>
              وسيتم <Text style={s.warningHighlight}>حظر المتدرب</Text> واتخاذ الإجراءات المقانية اللازمة بحقه
            </Text>
          </View>
        </Animated.View>

        {/* ===== TAB SWITCHER ===== */}
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'qr' && s.tabActive]}
            onPress={() => setActiveTab('qr')}
          >
            <Text style={s.tabCheckbox}>{activeTab === 'qr' ? '☑' : '☐'}</Text>
            <Text style={[s.tabText, activeTab === 'qr' && s.tabTextActive]}>مسح QR Code</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'code' && s.tabActive]}
            onPress={() => setActiveTab('code')}
          >
            <Text style={[s.tabText, activeTab === 'code' && s.tabTextActive]}># إدخال الكود</Text>
          </TouchableOpacity>
        </View>

        {/* ===== CODE ENTRY SECTION ===== */}
        {activeTab === 'code' && (
          <Animated.View style={[s.codeSection, { transform: [{ translateX: shakeAnim }] }]}>
            {/* Hash Icon */}
            <View style={s.hashCircle}>
              <Text style={s.hashText}>#</Text>
            </View>

            <Text style={s.codeTitle}>أدخل كود الحضور</Text>
            <Text style={s.codeSub}>أدخل الكود المكون من 6 أرقام المعروض أمامك</Text>

            {/* 6-Digit Input Boxes */}
            <View style={s.digitRow}>
              {digits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[
                    s.digitBox,
                    digit ? s.digitBoxFilled : null,
                    errorMessage ? s.digitBoxError : null,
                    successMessage ? s.digitBoxSuccess : null,
                  ]}
                  value={digit}
                  onChangeText={(val) => handleDigitChange(index, val)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                  autoFocus={index === 0}
                />
              ))}
            </View>

            {/* Error Message */}
            {errorMessage && (
              <View style={s.errorBanner}>
                <Text style={s.errorIcon}>⚠</Text>
                <Text style={s.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Success Message */}
            {successMessage && (
              <View style={s.successBanner}>
                <Text style={s.successIcon}>✅</Text>
                <Text style={s.successText}>{successMessage}</Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[s.submitBtn, (!isFilled || isSubmitting) && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!isFilled || isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={s.submitBtnText}>تسجيل الحضور</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ===== QR CODE SECTION ===== */}
        {activeTab === 'qr' && (
          <View style={s.qrSection}>
            <View style={s.qrPlaceholder}>
              <Text style={s.qrPlaceholderIcon}>📷</Text>
              <Text style={s.qrPlaceholderTitle}>مسح QR Code</Text>
              <Text style={s.qrPlaceholderSub}>وجّه الكاميرا نحو رمز QR المعروض في المحاضرة</Text>
              <TouchableOpacity style={s.qrOpenCameraBtn}>
                <Text style={s.qrOpenCameraText}>فتح الكاميرا</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ===== INSTRUCTIONS SECTION ===== */}
        <View style={s.instructionsCard}>
          <View style={s.instructionsHeader}>
            <Text style={s.instructionsIcon}>ℹ️</Text>
            <Text style={s.instructionsTitle}>تعليمات تسجيل الحضور</Text>
          </View>
          {[
            { num: '1', text: 'احصل على كود الحضور المكون من 6 أرقام أو QR Code من المحاضر', color: '#DC2626' },
            { num: '2', text: 'أدخل الكود يدوياً أو امسح QR Code بالكاميرا', color: '#DC2626' },
            { num: '3', text: 'سيتم تسجيل حضورك تلقائياً', color: '#0D9488' },
            { num: '4', text: 'يجب أن تكون متواجد في توقيتة المحاضرة لتسجيل الحضور', color: '#DC2626' },
          ].map((item, i) => (
            <View key={i} style={s.instructionRow}>
              <View style={[s.instructionNumCircle, { borderColor: item.color }]}>
                <Text style={[s.instructionNum, { color: item.color }]}>{item.num}</Text>
              </View>
              <Text style={s.instructionText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  // ===== HEADER =====
  header: {
    backgroundColor: '#0D9488',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  backArrow: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginLeft: 6,
  },
  backText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  qrIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  qrIconText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    textAlign: 'center',
  },

  // ===== SCROLL =====
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // ===== WARNING BANNER =====
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  warningIcon: {
    marginLeft: 10,
  },
  warningIconText: {
    fontSize: 20,
  },
  warningTextArea: {
    flex: 1,
    alignItems: 'flex-end',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'right',
    marginBottom: 4,
  },
  warningDesc: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    lineHeight: 20,
  },
  warningHighlight: {
    color: '#DC2626',
    fontWeight: '700',
  },

  // ===== TABS =====
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabCheckbox: {
    fontSize: 14,
    color: '#9CA3AF',
    marginRight: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#1F2937',
    fontWeight: '700',
  },

  // ===== CODE ENTRY =====
  codeSection: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  hashCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  hashText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0D9488',
  },
  codeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 6,
  },
  codeSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  digitRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  digitBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
  },
  digitBoxFilled: {
    borderColor: '#0D9488',
    backgroundColor: '#FFF',
  },
  digitBoxError: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  digitBoxSuccess: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },

  // ===== ERROR / SUCCESS =====
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorIcon: {
    fontSize: 14,
    color: '#DC2626',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  successIcon: {
    fontSize: 14,
    marginLeft: 8,
  },
  successText: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
    textAlign: 'center',
  },

  // ===== SUBMIT BUTTON =====
  submitBtn: {
    width: '100%',
    backgroundColor: '#0D9488',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },

  // ===== QR SECTION =====
  qrSection: {
    marginBottom: 16,
  },
  qrPlaceholder: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  qrPlaceholderIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  qrPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
  },
  qrPlaceholderSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  qrOpenCameraBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  qrOpenCameraText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // ===== INSTRUCTIONS =====
  instructionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  instructionsIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  instructionsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D9488',
    textAlign: 'right',
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  instructionNumCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  instructionNum: {
    fontSize: 12,
    fontWeight: '800',
  },
  instructionText: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    textAlign: 'right',
    lineHeight: 20,
  },
});

export default RegisterAttendanceScreen;
