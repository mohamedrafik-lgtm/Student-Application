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
import { API_CONFIG, getAllBranches } from '../services/apiConfig';
import { BranchService } from '../services/branchService';
import { BranchType } from '../types/auth';
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
  const [lastLoadInfo, setLastLoadInfo] = useState<string | null>(null);
  const [branchApplying, setBranchApplying] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<DocumentType | 'ALL'>('ALL');
  

  // Try to detect documents array in arbitrary response shapes
  const detectDocumentsInObject = (obj: any): TraineeDocument[] | null => {
    if (!obj || typeof obj !== 'object') return null;

    // helper to check if an array looks like documents
    const looksLikeDocs = (arr: any[]): boolean => {
      if (!Array.isArray(arr) || arr.length === 0) return false;
      const sample = arr[0];
      if (typeof sample !== 'object') return false;
      const keys = Object.keys(sample);
      // common keys for a document
      const docKeys = ['fileName', 'filePath', 'documentType', 'isVerified', 'uploadedAt'];
      const matches = docKeys.filter(k => keys.includes(k));
      return matches.length >= 2;
    };

    // Breadth-first search for arrays that look like documents
    const queue: any[] = [obj];
    const visited = new Set<any>();
    while (queue.length > 0) {
      const cur = queue.shift();
      if (!cur || typeof cur !== 'object' || visited.has(cur)) continue;
      visited.add(cur);

      for (const k of Object.keys(cur)) {
        const v = cur[k];
        if (Array.isArray(v)) {
          if (looksLikeDocs(v)) return v as TraineeDocument[];
          // also enqueue array items
          for (const item of v) if (typeof item === 'object') queue.push(item);
        } else if (typeof v === 'object' && v !== null) {
          queue.push(v);
        }
      }
    }

    return null;
  };

  // Dev helper: find array paths (breadth-first) with metadata
  const discoverArrayPaths = (obj: any, maxItems = 200) => {
    const results: Array<{ path: string; length: number; sampleKeys: string[] }> = [];
    if (!obj || typeof obj !== 'object') return results;

    const queue: Array<{ cur: any; path: string }> = [{ cur: obj, path: '' }];
    const visited = new Set<any>();

    while (queue.length > 0 && results.length < maxItems) {
      const { cur, path } = queue.shift()!;
      if (!cur || typeof cur !== 'object' || visited.has(cur)) continue;
      visited.add(cur);

      for (const k of Object.keys(cur)) {
        const v = cur[k];
        const childPath = path ? `${path}.${k}` : k;
        if (Array.isArray(v)) {
          const sample = v.find((it: any) => it && typeof it === 'object');
          const sampleKeys = sample ? Object.keys(sample).slice(0, 6) : [];
          results.push({ path: childPath, length: v.length, sampleKeys });
          // also enqueue array items
          for (const item of v) if (typeof item === 'object') queue.push({ cur: item, path: childPath + '[]' });
        } else if (typeof v === 'object' && v !== null) {
          queue.push({ cur: v, path: childPath });
        }
      }
    }

    return results;
  };

  // helper to read value by dotted path (supports [] suffix for items)
  const getByPath = (obj: any, path: string) => {
    if (!obj || !path) return null;
    const parts = path.split('.');
    let cur: any = obj;
    for (const p of parts) {
      if (!cur) return null;
      if (p.endsWith('[]')) {
        const key = p.slice(0, -2);
        cur = cur[key];
        if (Array.isArray(cur)) cur = cur; else return null;
      } else {
        cur = cur[p];
      }
    }
    return cur;
  };

  // Try a few common endpoints to fetch documents if profile didn't include them
  const tryAlternateDocumentEndpoints = async (token: string, traineeId?: number): Promise<TraineeDocument[] | null> => {
    if (!API_CONFIG.BASE_URL) return null;

    const candidates = [
      `${API_CONFIG.BASE_URL}/api/trainee-documents`,
      `${API_CONFIG.BASE_URL}/api/trainee-auth/profile/documents`,
    ];

    if (traineeId) candidates.push(`${API_CONFIG.BASE_URL}/api/trainee/${traineeId}/documents`);

    for (const url of candidates) {
      try {
        console.log('🔎 Trying fallback documents endpoint:', url);
        const resp = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        });
        if (!resp.ok) {
          console.log('Fallback endpoint returned status', resp.status, url);
          continue;
        }
        const body = await resp.json().catch(() => null);
        if (!body) continue;
        // try to detect documents in this body
        const found = detectDocumentsInObject(body) || (Array.isArray(body) && body.length && typeof body[0] === 'object' ? body : null);
        if (found && found.length > 0) return found as TraineeDocument[];
      } catch (err) {
        console.warn('Fallback endpoint error for', url, err);
        continue;
      }
    }

    return null;
  };

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
      setLastLoadInfo(null);
      // If base URL is not configured, we cannot call profile endpoint
      if (!API_CONFIG.BASE_URL) {
        console.warn('Documents: API_CONFIG.BASE_URL is empty - branch may not be selected');
        setLastLoadInfo('NO_BASE_URL');
        setDocuments([]);
        setIsLoading(false);
        return;
      }
      console.log('🔍 Loading documents...');
      const profileData = await AuthService.getProfile(accessToken);
      console.log('✅ Documents loaded successfully (raw):', profileData);

      // Normalize different possible response shapes from backend
      // Common shapes encountered:
      // - profileData.trainee.documents (expected)
      // - profileData.data.trainee.documents
      // - profileData.documents (unwrapped)
      // - profileData.data.documents
      const trainee = (profileData as any).trainee || (profileData as any).data?.trainee;
      let docs: TraineeDocument[] = [];

      if (trainee && Array.isArray(trainee.documents)) {
        docs = trainee.documents;
      } else if (Array.isArray((profileData as any).documents)) {
        docs = (profileData as any).documents;
      } else if (Array.isArray((profileData as any).data?.documents)) {
        docs = (profileData as any).data.documents;
      } else if (trainee && trainee.documents && typeof trainee.documents === 'object') {
        // sometimes backend returns an object keyed by id
        docs = Object.values(trainee.documents) as TraineeDocument[];
      }

      setProfile((profileData as any));
      // if we didn't find docs with the simple checks, try a deep detector
      if ((!docs || docs.length === 0)) {
        const found = detectDocumentsInObject(profileData);
        if (found && found.length > 0) {
          docs = found;
          console.log('🧭 Detected documents via deep scan, count=', docs.length);
        }
      }

      // If still empty, try a few common endpoints as a fallback
      if ((!docs || docs.length === 0)) {
        try {
          const fallback = await tryAlternateDocumentEndpoints(accessToken, (profileData as any)?.trainee?.id || (profileData as any)?.data?.trainee?.id);
          if (fallback && fallback.length > 0) {
            docs = fallback;
            console.log('🛠️ Fallback fetch found documents, count=', docs.length);
          }
        } catch (e) {
          console.warn('Fallback document fetch failed', e);
        }
      }

      setDocuments(docs || []);
      if ((!docs || docs.length === 0)) {
        setLastLoadInfo('NO_DOCUMENTS_FOUND');
      } else {
        setLastLoadInfo('DOCUMENTS_LOADED');
      }
      // attempt to discover array paths and auto-select a likely documents array
      try {
        const arrays = discoverArrayPaths(profileData);
        if ((!docs || docs.length === 0) && arrays.length > 0) {
          const preferred = ['trainee.documents', 'data.trainee.documents', 'data.documents', 'documents'];
          let chosenPath: string | null = null;
          for (const p of preferred) {
            const found = arrays.find(a => a.path === p || a.path.endsWith(p));
            if (found) { chosenPath = found.path; break; }
          }
          if (!chosenPath) {
            const docLike = arrays.find(a => (a.sampleKeys || []).some(k => ['fileName','filePath','documentType','uploadedAt'].includes(k)));
            chosenPath = docLike ? docLike.path : arrays[0].path;
          }

          try {
            const val = getByPath(profileData, chosenPath!);
            if (Array.isArray(val) && val.length > 0) {
              docs = val as TraineeDocument[];
              console.log('🟢 Auto-selected documents from path:', chosenPath, 'count=', docs.length);
            }
          } catch (e) {
            console.warn('Auto-select documents failed for path', chosenPath, e);
          }
        }
      } catch (e) {
        // ignore discover errors
      }
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
      setLastLoadInfo('LOAD_FAILED');
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

        {/* Developer inspector removed - documents are auto-discovered and shown by default */}

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

              {/* Informative hint about why the page might be empty */}
              {lastLoadInfo === 'NO_BASE_URL' && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.emptyStateMessage]}>لم يتم اختيار الفرع أو لم يتم إعداد عنوان الخادم (BASE_URL).</Text>
                  <Text style={[styles.emptyStateMessage, { marginTop: 6 }]}>يمكنك اختيار فرع لتعيين عنوان الخادم هنا:</Text>
                  <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    {getAllBranches().map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.branchButton, { backgroundColor: b.color || Colors.primary, marginRight: 8 }]}
                        onPress={async () => {
                          try {
                            setBranchApplying(true);
                            // set BASE_URL for selected branch
                            BranchService.setBranchUrl(b.id as BranchType);
                            // reload documents
                            await loadDocuments();
                          } catch (e) {
                            console.warn('Failed to apply branch', e);
                          } finally {
                            setBranchApplying(false);
                          }
                        }}
                      >
                        <Text style={{ color: Colors.white, fontWeight: '700' }}>{b.nameAr || b.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              {lastLoadInfo === 'NO_DOCUMENTS_FOUND' && (
                <Text style={[styles.emptyStateMessage, { marginTop: 12 }]}>تم تحميل الملف الشخصي لكن لا توجد مصفوفة وثائق في الاستجابة.</Text>
              )}
              {lastLoadInfo === 'LOAD_FAILED' && (
                <Text style={[styles.emptyStateMessage, { marginTop: 12 }]}>فشل تحميل البيانات. راجع اتصال الشبكة أو تحقق من الخادم. تحقق من وحدة التحكم لمزيد من التفاصيل.</Text>
              )}
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
    backgroundColor: Colors.cardBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  backButtonIcon: {
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  backButtonLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
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
    color: Colors.textPrimary,
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
    backgroundColor: Colors.cardBackground,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  branchButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
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
