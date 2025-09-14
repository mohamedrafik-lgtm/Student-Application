// SOLID Principles Applied:
// 1. Single Responsibility: This screen only handles documents display and management
// 2. Open/Closed: Can be extended with new features without modifying existing code
// 3. Interface Segregation: Uses specific interfaces for different concerns
// 4. Dependency Inversion: Depends on abstractions (components) not concretions

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
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../services/authService';
import { TraineeProfile, TraineeDocument, DocumentType } from '../types/auth';
import { Colors } from '../styles/colors';
import CustomButton from '../components/CustomButton';

const { width, height } = Dimensions.get('window');

interface DocumentsScreenProps {
  accessToken: string;
  onBack: () => void;
}

const DocumentsScreen: React.FC<DocumentsScreenProps> = ({ 
  accessToken, 
  onBack 
}) => {
  const [profile, setProfile] = useState<TraineeProfile | null>(null);
  const [documents, setDocuments] = useState<TraineeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<DocumentType | 'ALL'>('ALL');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (documents.length > 0) {
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
  }, [documents]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Loading documents...');
      const profileData = await AuthService.getProfile(accessToken);
      console.log('✅ Documents loaded successfully:', profileData);
      
      setProfile(profileData);
      setDocuments(profileData.trainee.documents || []);
    } catch (error) {
      console.error('❌ Failed to load documents:', error);
      const apiError = error as any;
      
      let errorMessage = 'حدث خطأ أثناء تحميل الوثائق';
      if (apiError.statusCode === 401) {
        errorMessage = 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى';
      } else if (apiError.statusCode === 0) {
        errorMessage = apiError.message;
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDocument = async (document: TraineeDocument) => {
    try {
      if (document.filePath) {
        const supported = await Linking.canOpenURL(document.filePath);
        if (supported) {
          await Linking.openURL(document.filePath);
        } else {
          Alert.alert('خطأ', 'لا يمكن فتح هذا الملف');
        }
      } else {
        Alert.alert('خطأ', 'رابط الملف غير متوفر');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء فتح الملف');
    }
  };

  const handleDownloadDocument = (document: TraineeDocument) => {
    Alert.alert('تحميل الملف', 'سيتم إضافة هذه الميزة قريباً');
  };

  const handleUploadDocument = () => {
    Alert.alert('رفع وثيقة', 'سيتم إضافة هذه الميزة قريباً');
  };

  const getDocumentTypeText = (type: DocumentType): string => {
    switch (type) {
      case 'NATIONAL_ID':
        return 'بطاقة الهوية';
      case 'BIRTH_CERTIFICATE':
        return 'شهادة الميلاد';
      case 'QUALIFICATION_CERTIFICATE':
        return 'شهادة المؤهل';
      case 'MILITARY_SERVICE':
        return 'شهادة الخدمة العسكرية';
      case 'MEDICAL_CERTIFICATE':
        return 'الشهادة الطبية';
      case 'PHOTOS':
        return 'الصور الشخصية';
      case 'OTHER':
        return 'أخرى';
      default:
        return type;
    }
  };

  const getDocumentTypeIcon = (type: DocumentType): string => {
    switch (type) {
      case 'NATIONAL_ID':
        return '🆔';
      case 'BIRTH_CERTIFICATE':
        return '📋';
      case 'QUALIFICATION_CERTIFICATE':
        return '🎓';
      case 'MILITARY_SERVICE':
        return '🎖️';
      case 'MEDICAL_CERTIFICATE':
        return '🏥';
      case 'PHOTOS':
        return '📸';
      case 'OTHER':
        return '📄';
      default:
        return '📄';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const filteredDocuments = selectedFilter === 'ALL' 
    ? documents 
    : documents.filter(doc => doc.documentType === selectedFilter);

  const documentTypes: (DocumentType | 'ALL')[] = [
    'ALL',
    DocumentType.NATIONAL_ID,
    DocumentType.BIRTH_CERTIFICATE,
    DocumentType.QUALIFICATION_CERTIFICATE,
    DocumentType.MILITARY_SERVICE,
    DocumentType.MEDICAL_CERTIFICATE,
    DocumentType.PHOTOS,
    DocumentType.OTHER
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>جاري تحميل الوثائق...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>خطأ في تحميل الوثائق</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <CustomButton
            title="إعادة المحاولة"
            onPress={loadDocuments}
            variant="primary"
            size="large"
          />
          <CustomButton
            title="العودة"
            onPress={onBack}
            variant="outline"
            size="large"
          />
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
        {/* Enhanced Header Section */}
        <Animated.View style={[
          styles.headerSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <View style={styles.backButtonIcon}>
                <Text style={styles.backButtonText}>←</Text>
              </View>
              <Text style={styles.backButtonLabel}>العودة</Text>
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>الوثائق</Text>
              <View style={styles.headerUnderline} />
            </View>
            
            <TouchableOpacity style={styles.uploadButton} onPress={handleUploadDocument}>
              <View style={styles.uploadButtonIcon}>
                <Text style={styles.uploadButtonText}>📤</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Documents Stats */}
          <View style={styles.statsCard}>
            <View style={styles.statsContent}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{documents.length}</Text>
                <Text style={styles.statLabel}>إجمالي الوثائق</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {documents.filter(doc => doc.isVerified).length}
                </Text>
                <Text style={styles.statLabel}>موثق</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {documents.filter(doc => !doc.isVerified).length}
                </Text>
                <Text style={styles.statLabel}>غير موثق</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Filter Section */}
        <Animated.View style={[
          styles.filterSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>تصفية الوثائق</Text>
            <View style={styles.sectionTitleUnderline} />
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {documentTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  selectedFilter === type && styles.filterChipActive
                ]}
                onPress={() => setSelectedFilter(type)}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedFilter === type && styles.filterChipTextActive
                ]}>
                  {type === 'ALL' ? 'الكل' : getDocumentTypeText(type as DocumentType)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Documents List */}
        <Animated.View style={[
          styles.documentsSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              الوثائق ({filteredDocuments.length})
            </Text>
            <View style={styles.sectionTitleUnderline} />
          </View>
          
          {filteredDocuments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>📄</Text>
              <Text style={styles.emptyStateTitle}>لا توجد وثائق</Text>
              <Text style={styles.emptyStateMessage}>
                {selectedFilter === 'ALL' 
                  ? 'لم يتم رفع أي وثائق بعد'
                  : `لا توجد وثائق من نوع ${getDocumentTypeText(selectedFilter as DocumentType)}`
                }
              </Text>
              <CustomButton
                title="رفع وثيقة جديدة"
                onPress={handleUploadDocument}
                variant="primary"
                size="large"
              />
            </View>
          ) : (
            <View style={styles.documentsGrid}>
              {filteredDocuments.map((document, index) => (
                <Animated.View
                  key={document.id}
                  style={[
                    styles.documentCard,
                    {
                      opacity: fadeAnim,
                      transform: [
                        { translateY: slideAnim },
                        { scale: scaleAnim }
                      ]
                    }
                  ]}
                >
                  <View style={styles.documentCardGradient} />
                  
                  <View style={styles.documentHeader}>
                    <View style={styles.documentIcon}>
                      <Text style={styles.documentIconText}>
                        {getDocumentTypeIcon(document.documentType)}
                      </Text>
                    </View>
                    
                    <View style={styles.documentStatus}>
                      {document.isVerified ? (
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedBadgeText}>✓</Text>
                        </View>
                      ) : (
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingBadgeText}>⏳</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.documentContent}>
                    <Text style={styles.documentTitle}>
                      {getDocumentTypeText(document.documentType)}
                    </Text>
                    
                    <Text style={styles.documentFileName} numberOfLines={1}>
                      {document.fileName}
                    </Text>
                    
                    <View style={styles.documentDetails}>
                      <Text style={styles.documentDetail}>
                        📅 {formatDate(document.uploadedAt)}
                      </Text>
                      <Text style={styles.documentDetail}>
                        📏 {formatFileSize(document.fileSize)}
                      </Text>
                    </View>
                    
                    {document.notes && (
                      <Text style={styles.documentNotes} numberOfLines={2}>
                        {document.notes}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.documentActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleViewDocument(document)}
                    >
                      <Text style={styles.actionButtonText}>👁️ عرض</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.downloadButton]}
                      onPress={() => handleDownloadDocument(document)}
                    >
                      <Text style={styles.actionButtonText}>⬇️ تحميل</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ))}
            </View>
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
    backgroundColor: Colors.backgroundDark,
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
    backgroundColor: Colors.backgroundDark,
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
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
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
    color: Colors.textLight,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  headerSection: {
    marginBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButtonIcon: {
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 18,
    color: Colors.white,
    fontWeight: '700',
  },
  backButtonLabel: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerUnderline: {
    width: 60,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginTop: 8,
  },
  uploadButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  uploadButtonIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
  },
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  filterSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  sectionTitleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  filterScrollContent: {
    paddingHorizontal: 4,
  },
  filterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  documentsSection: {
    marginBottom: 32,
  },
  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  documentsGrid: {
    gap: 16,
  },
  documentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  documentCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.primary,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  documentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentIconText: {
    fontSize: 24,
  },
  documentStatus: {
    alignItems: 'center',
  },
  verifiedBadge: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  pendingBadge: {
    backgroundColor: Colors.warning,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  documentContent: {
    marginBottom: 16,
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'right',
  },
  documentFileName: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: 'right',
  },
  documentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  documentDetail: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
  },
  documentNotes: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'right',
    lineHeight: 18,
  },
  documentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  downloadButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default DocumentsScreen;
