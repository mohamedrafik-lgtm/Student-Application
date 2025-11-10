# تصميم صفحة تفاصيل المحتوى التدريبي
## Training Content Details Screen Design

---

## 📋 نظرة عامة

### الهدف
إنشاء صفحة تفاصيل شاملة لعرض معلومات المادة التدريبية عند النقر عليها من صفحة [`TrainingContentsScreen`](src/screens/TrainingContentsScreen.tsx:1)

### المسار
`src/screens/TrainingContentDetailsScreen.tsx`

---

## 🎯 المتطلبات الوظيفية

### 1. عرض معلومات المادة الأساسية
- ✅ كود المادة (code)
- ✅ اسم المادة (name)
- ✅ اسم المدرب (instructor.name)
- ✅ البريد الإلكتروني للمدرب (instructor.email)
- ✅ عدد الفصول/الوحدات (chaptersCount)

### 2. معلومات البرنامج والفصل
- ✅ اسم البرنامج (program.nameAr)
- ✅ اسم الفصل الدراسي (classroom.name)
- ✅ رقم الفصل (classroom.classNumber)
- ✅ تاريخ البداية (classroom.startDate)
- ✅ تاريخ النهاية (classroom.endDate)

### 3. توزيع الدرجات
عرض تفصيلي لتوزيع الدرجات مع رسوم بيانية:
- 📊 أعمال السنة (yearWorkMarks)
- 📊 الدرجات العملية (practicalMarks)
- 📊 الدرجات التحريرية (writtenMarks)
- 📊 درجات الحضور (attendanceMarks)
- 📊 درجات الاختبارات القصيرة (quizzesMarks)
- 📊 درجات الامتحان النهائي (finalExamMarks)
- 📊 الإجمالي (مجموع كل الدرجات)

### 4. معلومات الجلسات
- 📅 عدد الجلسات النظرية أسبوعياً (theorySessionsPerWeek)
- 🔬 عدد الجلسات العملية أسبوعياً (practicalSessionsPerWeek)
- 📈 إجمالي الجلسات المجدولة (_count.scheduleSlots)

### 5. فريق التدريس
- 👨‍🏫 المدرب الرئيسي (instructor)
- 📝 مسجل الحضور النظري (theoryAttendanceRecorder)
- 🔬 مسجل الحضور العملي (practicalAttendanceRecorder)

### 6. إحصائيات إضافية (اختياري)
- ❓ عدد الأسئلة (_count.questions) - إذا تم تمرير includeQuestionCount=true

---

## 🏗️ البنية المعمارية

### 1. Types (التعريفات)

#### إضافة إلى `src/types/trainingContents.ts`:

```typescript
/**
 * Training Content Details Response
 * Response from GET /api/training-contents/{id}
 */
export interface TrainingContentDetails {
  // معلومات المادة التدريبية الأساسية
  id: number;
  code: string;
  name: string;
  programId: number;
  classroomId: number;
  instructorId: string;
  
  // معلومات مسجلي الحضور (اختياري)
  theoryAttendanceRecorderId: string | null;
  practicalAttendanceRecorderId: string | null;
  
  // معلومات الجلسات الأسبوعية
  theorySessionsPerWeek: number;
  practicalSessionsPerWeek: number;
  chaptersCount: number;
  
  // توزيع الدرجات
  yearWorkMarks: number;
  practicalMarks: number;
  writtenMarks: number;
  attendanceMarks: number;
  quizzesMarks: number;
  finalExamMarks: number;
  
  // تواريخ النظام
  createdAt: Date;
  updatedAt: Date;
  
  // العلاقات المُضمّنة
  instructor: Instructor;
  program: Program;
  classroom: Classroom;
  theoryAttendanceRecorder: Instructor | null;
  practicalAttendanceRecorder: Instructor | null;
  
  // الإحصائيات
  _count: {
    scheduleSlots: number;
    questions?: number;
  };
}

/**
 * Props for TrainingContentDetailsScreen
 */
export interface TrainingContentDetailsScreenProps {
  contentId: number;
  accessToken: string;
  onBack: () => void;
}
```

---

### 2. Service (الخدمة)

#### إضافة إلى `src/services/trainingContentsService.ts`:

```typescript
/**
 * الحصول على تفاصيل مادة تدريبية محددة
 * @param contentId - معرف المادة التدريبية
 * @param accessToken - رمز الوصول
 * @param includeQuestionCount - هل يتم تضمين عدد الأسئلة (اختياري)
 */
async getTrainingContentDetails(
  contentId: number,
  accessToken: string,
  includeQuestionCount: boolean = false
): Promise<TrainingContentDetails> {
  const queryParams = includeQuestionCount ? '?includeQuestionCount=true' : '';
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAINING_CONTENTS}/${contentId}${queryParams}`;
  
  console.log('🔍 Training Content Details API Request:', {
    url,
    contentId,
    includeQuestionCount,
    hasToken: !!accessToken,
  });

  const response = await TrainingContentsService.makeRequest<TrainingContentDetails>(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  console.log('📡 Training Content Details API Response:', {
    contentId: response.id,
    contentName: response.name,
    instructorName: response.instructor.name,
    totalMarks: response.yearWorkMarks + response.practicalMarks + 
                response.writtenMarks + response.attendanceMarks + 
                response.quizzesMarks + response.finalExamMarks,
  });

  return response;
}
```

---

### 3. Screen Component (مكون الشاشة)

#### ملف جديد: `src/screens/TrainingContentDetailsScreen.tsx`

**الميزات الرئيسية:**

1. **Header Section** - معلومات المادة الأساسية
   - كود المادة مع badge ملون
   - اسم المادة بخط كبير
   - معلومات المدرب مع أيقونة

2. **Stats Cards** - بطاقات إحصائية سريعة
   - عدد الفصول
   - إجمالي الدرجات
   - عدد الجلسات المجدولة
   - الجلسات الأسبوعية

3. **Marks Distribution Section** - توزيع الدرجات
   - بطاقات ملونة لكل نوع درجة
   - Progress bars لتوضيح النسب
   - إجمالي الدرجات مميز

4. **Program & Classroom Info** - معلومات البرنامج والفصل
   - اسم البرنامج
   - معلومات الفصل
   - التواريخ

5. **Teaching Team Section** - فريق التدريس
   - المدرب الرئيسي مع البريد الإلكتروني
   - مسجلي الحضور (إن وجدوا)

6. **Sessions Info** - معلومات الجلسات
   - الجلسات النظرية
   - الجلسات العملية
   - إجمالي الجلسات

---

## 🎨 تصميم الواجهة (UI Design)

### نظام الألوان

```typescript
const MARKS_COLORS = {
  yearWork: '#3B82F6',      // أزرق
  practical: '#10B981',     // أخضر
  written: '#F59E0B',       // برتقالي
  attendance: '#06B6D4',    // سماوي
  quizzes: '#8B5CF6',       // بنفسجي
  finalExam: '#EF4444',     // أحمر
};
```

### المكونات الرئيسية

#### 1. Header Card
```
┌─────────────────────────────────────┐
│  [←]    تفاصيل المادة التدريبية    │
├─────────────────────────────────────┤
│  [AB123]                            │
│  اسم المادة الدراسية               │
│  👨‍🏫 د. محمد أحمد                   │
│  📧 mohamed@example.com             │
└─────────────────────────────────────┘
```

#### 2. Quick Stats Grid
```
┌──────────┬──────────┬──────────┬──────────┐
│ 📚       │ 🎯       │ 📅       │ ⏰       │
│ 12 فصل  │ 100 درجة│ 24 جلسة  │ 6 أسبوعي│
└──────────┴──────────┴──────────┴──────────┘
```

#### 3. Marks Distribution
```
┌─────────────────────────────────────┐
│  توزيع الدرجات                      │
├─────────────────────────────────────┤
│  أعمال السنة        [████░░] 20    │
│  العملي             [███░░░] 15    │
│  التحريري           [█████░] 25    │
│  الحضور             [██░░░░] 10    │
│  اختبارات مصغرة     [███░░░] 15    │
│  الميد تيرم         [███░░░] 15    │
├─────────────────────────────────────┤
│  الإجمالي: 100 درجة                │
└─────────────────────────────────────┘
```

---

## 🔄 تدفق البيانات (Data Flow)

```
User Click on Content
        ↓
TrainingContentsScreen
        ↓
Navigate to TrainingContentDetailsScreen
        ↓
Load Content Details (API Call)
        ↓
Display Loading State
        ↓
Receive Data
        ↓
Update State
        ↓
Render UI with Animations
```

---

## 📱 حالات الشاشة (Screen States)

### 1. Loading State
```typescript
{isLoading && (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={Colors.primary} />
    <Text style={styles.loadingText}>
      جاري تحميل تفاصيل المادة...
    </Text>
  </View>
)}
```

### 2. Error State
```typescript
{error && (
  <View style={styles.errorContainer}>
    <Text style={styles.errorEmoji}>⚠️</Text>
    <Text style={styles.errorText}>{error}</Text>
    <CustomButton
      title="إعادة المحاولة"
      onPress={loadContentDetails}
      variant="outline"
    />
  </View>
)}
```

### 3. Success State
```typescript
{contentDetails && (
  <ScrollView>
    {/* Header */}
    {/* Stats Cards */}
    {/* Marks Distribution */}
    {/* Program Info */}
    {/* Teaching Team */}
    {/* Sessions Info */}
  </ScrollView>
)}
```

---

## 🎭 الرسوم المتحركة (Animations)

### Entrance Animations
```typescript
const fadeAnim = useRef(new Animated.Value(0)).current;
const slideAnim = useRef(new Animated.Value(30)).current;

useEffect(() => {
  Animated.parallel([
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }),
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }),
  ]).start();
}, [contentDetails]);
```

---

## 🔗 التكامل مع التنقل

### تحديث `AppNavigator.tsx`

```typescript
// إضافة الشاشة الجديدة إلى type Screen
type Screen = 
  | 'branch-selection' 
  | 'login' 
  | 'home'
  // ... existing screens
  | 'training-contents'
  | 'training-content-details';  // ← جديد

// إضافة state لتخزين contentId
const [selectedContentId, setSelectedContentId] = useState<number | null>(null);

// إضافة handler للتنقل
const handleNavigateToContentDetails = (contentId: number) => {
  setSelectedContentId(contentId);
  setCurrentScreen('training-content-details');
};

// إضافة case في switch statement
case 'training-content-details':
  if (selectedContentId) {
    screenElement = (
      <TrainingContentDetailsScreen
        contentId={selectedContentId}
        accessToken={userInfo.accessToken}
        onBack={() => setCurrentScreen('training-contents')}
      />
    );
  }
  break;
```

### تحديث `TrainingContentsScreen.tsx`

```typescript
// إضافة prop جديد
interface TrainingContentsScreenProps {
  accessToken: string;
  onBack: () => void;
  onNavigateToDetails?: (contentId: number) => void;  // ← جديد
}

// تحديث renderContentCard
const renderContentCard = (content: TrainingContent) => {
  return (
    <TouchableOpacity
      onPress={() => {
        if (onNavigateToDetails) {
          onNavigateToDetails(content.id);
        }
      }}
      // ... rest of the code
    >
```

---

## 📊 مكونات مساعدة (Helper Components)

### 1. MarkCard Component
```typescript
interface MarkCardProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  icon: string;
}

const MarkCard: React.FC<MarkCardProps> = ({
  label,
  value,
  maxValue,
  color,
  icon,
}) => {
  const percentage = (value / maxValue) * 100;
  
  return (
    <View style={styles.markCard}>
      <Text style={styles.markIcon}>{icon}</Text>
      <Text style={styles.markLabel}>{label}</Text>
      <Text style={[styles.markValue, { color }]}>{value}</Text>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${percentage}%`, backgroundColor: color }
          ]} 
        />
      </View>
    </View>
  );
};
```

### 2. StatCard Component
```typescript
interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  color = Colors.primary,
}) => {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
};
```

---

## ✅ قائمة المهام (Implementation Checklist)

### المرحلة 1: Types & Interfaces
- [ ] إضافة `TrainingContentDetails` interface
- [ ] إضافة `TrainingContentDetailsScreenProps` interface
- [ ] تحديث exports في `trainingContents.ts`

### المرحلة 2: Service Layer
- [ ] إضافة `getTrainingContentDetails` method
- [ ] إضافة معالجة الأخطاء
- [ ] إضافة logging للتصحيح

### المرحلة 3: Screen Component
- [ ] إنشاء `TrainingContentDetailsScreen.tsx`
- [ ] تنفيذ Loading State
- [ ] تنفيذ Error State
- [ ] تنفيذ Success State مع جميع الأقسام

### المرحلة 4: UI Components
- [ ] تصميم Header Section
- [ ] تصميم Stats Cards
- [ ] تصميم Marks Distribution
- [ ] تصميم Program Info
- [ ] تصميم Teaching Team
- [ ] تصميم Sessions Info

### المرحلة 5: Animations
- [ ] إضافة Fade In Animation
- [ ] إضافة Slide Animation
- [ ] إضافة Progress Bar Animations

### المرحلة 6: Navigation Integration
- [ ] تحديث `AppNavigator.tsx`
- [ ] تحديث `TrainingContentsScreen.tsx`
- [ ] اختبار التنقل

### المرحلة 7: Testing & Polish
- [ ] اختبار Loading State
- [ ] اختبار Error Handling
- [ ] اختبار عرض البيانات
- [ ] اختبار الرسوم المتحركة
- [ ] اختبار التنقل
- [ ] تحسين الأداء

---

## 🎯 معايير النجاح

✅ عرض جميع معلومات المادة بشكل واضح ومنظم
✅ تصميم جذاب ومتناسق مع باقي التطبيق
✅ رسوم متحركة سلسة
✅ معالجة شاملة للأخطاء
✅ تجربة مستخدم ممتازة
✅ كود نظيف ومنظم يتبع مبادئ SOLID
✅ توثيق شامل للكود

---

## 📝 ملاحظات إضافية

### الأمان
- التحقق من صلاحية الـ token
- معالجة أخطاء 401 (Unauthorized)
- معالجة أخطاء 404 (Not Found)

### الأداء
- استخدام `useNativeDriver` للرسوم المتحركة
- تحسين re-renders
- Lazy loading للصور (إن وجدت)

### إمكانية الوصول
- دعم قراء الشاشة
- ألوان متباينة
- أحجام خطوط مناسبة

---

**تاريخ التصميم**: 2025-11-10  
**المصمم**: Roo (AI Architect)  
**الحالة**: جاهز للتنفيذ ✅