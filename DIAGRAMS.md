# 📊 المخططات المعمارية - Student Application

## 📋 جدول المحتويات

1. [البنية المعمارية العامة](#البنية-المعمارية-العامة)
2. [معمارية الطبقات](#معمارية-الطبقات)
3. [تدفق المصادقة](#تدفق-المصادقة)
4. [معمارية الخدمات](#معمارية-الخدمات)
5. [تدفق البيانات](#تدفق-البيانات)
6. [بنية المكونات](#بنية-المكونات)
7. [تدفق التنقل](#تدفق-التنقل)

---

## 🏛️ البنية المعمارية العامة

```mermaid
graph TB
    subgraph "Presentation Layer"
        UI[User Interface]
        Screens[Screens]
        Components[Components]
    end
    
    subgraph "Business Logic Layer"
        Navigation[Navigation]
        StateManagement[State Management]
        Hooks[Custom Hooks]
    end
    
    subgraph "Data Layer"
        Services[Services]
        API[API Clients]
        Storage[Local Storage]
    end
    
    subgraph "External"
        Server1[Mansoura API]
        Server2[Zagazig API]
    end
    
    UI --> Screens
    Screens --> Components
    Screens --> Navigation
    Screens --> Hooks
    Hooks --> Services
    Navigation --> StateManagement
    Services --> API
    Services --> Storage
    API --> Server1
    API --> Server2
```

---

## 📚 معمارية الطبقات

```mermaid
graph TD
    subgraph "Layer 1: UI Layer"
        A1[Screens]
        A2[Components]
        A3[Styles]
    end
    
    subgraph "Layer 2: Business Logic"
        B1[Navigation]
        B2[Hooks]
        B3[Utils]
    end
    
    subgraph "Layer 3: Data Access"
        C1[Services]
        C2[Interfaces]
        C3[Types]
    end
    
    subgraph "Layer 4: Storage"
        D1[AsyncStorage]
        D2[API Config]
    end
    
    subgraph "Layer 5: External APIs"
        E1[REST APIs]
        E2[Authentication]
    end
    
    A1 --> B1
    A1 --> B2
    A2 --> B3
    B1 --> C1
    B2 --> C1
    C1 --> C2
    C1 --> C3
    C1 --> D1
    C1 --> D2
    D2 --> E1
    E1 --> E2
```

---

## 🔐 تدفق المصادقة

```mermaid
sequenceDiagram
    participant User
    participant App
    participant BranchService
    participant AuthService
    participant API
    participant Storage
    
    User->>App: تشغيل التطبيق
    App->>Storage: التحقق من فرع محفوظ
    
    alt لا يوجد فرع محفوظ
        App->>User: عرض شاشة اختيار الفرع
        User->>App: اختيار فرع
        App->>BranchService: حفظ الفرع
        BranchService->>Storage: حفظ في AsyncStorage
    end
    
    App->>User: عرض شاشة تسجيل الدخول
    User->>App: إدخال البيانات
    App->>AuthService: طلب تسجيل دخول
    AuthService->>API: POST /api/trainee-auth/login
    
    alt تسجيل دخول ناجح
        API-->>AuthService: Access Token + User Data
        AuthService->>Storage: حفظ Token
        AuthService-->>App: بيانات المستخدم
        App->>User: الانتقال للشاشة الرئيسية
    else فشل تسجيل الدخول
        API-->>AuthService: رسالة خطأ
        AuthService-->>App: رسالة خطأ
        App->>User: عرض رسالة خطأ
    end
```

---

## 🔧 معمارية الخدمات

```mermaid
graph TB
    subgraph "Services Layer"
        AS[AuthService]
        BS[BranchService]
        GS[GradesService]
        AtS[AttendanceService]
        QS[QuizService]
        RS[RequestsService]
        TS[TrainingContentsService]
    end
    
    subgraph "Configuration"
        AC[API Config]
        BC[Branch Config]
    end
    
    subgraph "Interfaces"
        IGS[IGradesService]
        IRS[IRequestsService]
    end
    
    subgraph "External APIs"
        API1[Mansoura Server]
        API2[Zagazig Server]
    end
    
    AS --> AC
    BS --> BC
    GS --> IGS
    GS --> AC
    RS --> IRS
    RS --> AC
    AtS --> AC
    QS --> AC
    TS --> AC
    
    AC --> API1
    AC --> API2
    BC --> API1
    BC --> API2
```

---

## 💾 تدفق البيانات - عرض الدرجات

```mermaid
sequenceDiagram
    participant User
    participant GradesScreen
    participant GradesService
    participant API
    participant Cache
    
    User->>GradesScreen: فتح شاشة الدرجات
    GradesScreen->>GradesScreen: عرض Loading
    
    GradesScreen->>GradesService: getMyGrades with token
    GradesService->>API: GET /api/trainee-auth/my-grades
    
    alt استجابة ناجحة
        API-->>GradesService: Grades Data
        GradesService->>GradesService: تطبيع البيانات
        GradesService-->>GradesScreen: Normalized Data
        GradesScreen->>Cache: حفظ في State
        GradesScreen->>User: عرض الدرجات
    else خطأ في الشبكة
        API-->>GradesService: Error Response
        GradesService-->>GradesScreen: Error Message
        GradesScreen->>User: عرض رسالة خطأ
    end
```

---

## 🎨 بنية المكونات

```mermaid
graph TD
    subgraph "App Root"
        App[App.tsx]
    end
    
    subgraph "Navigation"
        Nav[AppNavigator]
    end
    
    subgraph "Main Screens"
        Home[HomeScreen]
        Profile[ProfileScreen]
        Schedule[ScheduleScreen]
        Grades[GradesScreen]
        Attendance[AttendanceScreen]
        Exams[ExamsScreen]
    end
    
    subgraph "Reusable Components"
        Button[CustomButton]
        Input[CustomInput]
        TopNav[TopNavigationBar]
        Logo[Logo]
        Background[GradientBackground]
    end
    
    subgraph "Specialized Components"
        WeeklyView[WeeklyScheduleView]
        DailyView[DailySchedule]
        GradeCard[ContentCard]
        ClassCard[ClassroomCard]
    end
    
    App --> Nav
    Nav --> Home
    Nav --> Profile
    Nav --> Schedule
    Nav --> Grades
    Nav --> Attendance
    Nav --> Exams
    
    Home --> Button
    Home --> TopNav
    Profile --> Button
    Schedule --> WeeklyView
    Schedule --> DailyView
    Grades --> GradeCard
    Grades --> ClassCard
    
    WeeklyView --> Button
    DailyView --> Button
```

---

## 🧭 تدفق التنقل

```mermaid
stateDiagram-v2
    [*] --> BranchSelection: تشغيل التطبيق
    
    BranchSelection --> Login: اختيار فرع
    Login --> Home: تسجيل دخول ناجح
    Login --> Signup: إنشاء حساب
    Signup --> Login: اكتمال التسجيل
    
    Home --> Profile: عرض الملف الشخصي
    Home --> Schedule: عرض الجدول
    Home --> Grades: عرض الدرجات
    Home --> Attendance: عرض الحضور
    Home --> Exams: الاختبارات
    Home --> TrainingContents: المحتوى التدريبي
    Home --> RequestsHub: مركز الطلبات
    
    Profile --> Documents: المستندات
    Profile --> Payments: المدفوعات
    Profile --> Schedule: الجدول
    
    Payments --> PaymentDueDates: تواريخ الاستحقاق
    
    RequestsHub --> StudentRequests: الطلبات المجانية
    RequestsHub --> PaymentDeferralRequests: تأجيل السداد
    RequestsHub --> RequestSettings: الإعدادات
    
    StudentRequests --> ExamPostponement: تأجيل اختبار
    StudentRequests --> SickLeave: إجازة مرضية
    StudentRequests --> EnrollmentProof: إثبات قيد
    StudentRequests --> Certificate: إفادة
    
    PaymentDeferralRequests --> CreatePaymentDeferral: طلب جديد
    
    Profile --> Home: عودة
    Schedule --> Home: عودة
    Grades --> Home: عودة
    Attendance --> Home: عودة
    Exams --> Home: عودة
    TrainingContents --> Home: عودة
    Documents --> Profile: عودة
    Payments --> Profile: عودة
    RequestsHub --> Home: عودة
```

---

## 🔄 دورة حياة الطلب

```mermaid
stateDiagram-v2
    [*] --> CreateRequest: إنشاء طلب جديد
    
    CreateRequest --> Pending: تقديم الطلب
    
    Pending --> UnderReview: قيد المراجعة
    
    UnderReview --> Approved: موافقة
    UnderReview --> Rejected: رفض
    UnderReview --> NeedsMoreInfo: يحتاج معلومات إضافية
    
    NeedsMoreInfo --> UnderReview: إضافة معلومات
    
    Approved --> [*]: طلب مقبول
    Rejected --> [*]: طلب مرفوض
```

---

## 📱 معمارية الشاشات

```mermaid
graph TB
    subgraph "Authentication Screens"
        BS[BranchSelectionScreen]
        LS[LoginScreen]
        SS[SignupScreen]
    end
    
    subgraph "Main Screens"
        HS[HomeScreen]
        PS[ProfileScreen]
    end
    
    subgraph "Academic Screens"
        ScS[ScheduleScreen]
        GS[GradesScreen]
        AS[AttendanceScreen]
        ES[ExamsScreen]
        TS[TrainingContentsScreen]
    end
    
    subgraph "Management Screens"
        DS[DocumentsScreen]
        PayS[PaymentsScreen]
        PDS[PaymentDueDatesScreen]
    end
    
    subgraph "Requests Screens"
        RHS[RequestsHubScreen]
        SRS[StudentRequestsScreen]
        PDRS[PaymentDeferralRequestsScreen]
        CPDS[CreatePaymentDeferralScreen]
        EPS[ExamPostponementScreen]
        SLS[SickLeaveScreen]
        EnPS[EnrollmentProofScreen]
        CS[CertificateScreen]
        RSS[RequestSettingsScreen]
    end
    
    BS --> LS
    LS --> SS
    LS --> HS
    HS --> PS
    HS --> ScS
    HS --> GS
    HS --> AS
    HS --> ES
    HS --> TS
    HS --> RHS
    PS --> DS
    PS --> PayS
    PayS --> PDS
    RHS --> SRS
    RHS --> PDRS
    RHS --> RSS
    SRS --> EPS
    SRS --> SLS
    SRS --> EnPS
    SRS --> CS
    PDRS --> CPDS
```

---

## 🔄 تدفق عمل الاختبار الإلكتروني

```mermaid
sequenceDiagram
    participant User
    participant ExamsScreen
    participant QuizService
    participant API
    
    User->>ExamsScreen: عرض الاختبارات المتاحة
    ExamsScreen->>QuizService: getAvailableQuizzes
    QuizService->>API: GET /api/quizzes/trainee/available
    API-->>QuizService: قائمة الاختبارات
    QuizService-->>ExamsScreen: Quizzes Data
    ExamsScreen->>User: عرض القائمة
    
    User->>ExamsScreen: النقر على اختبار
    ExamsScreen->>User: تأكيد البدء
    User->>ExamsScreen: تأكيد
    
    ExamsScreen->>QuizService: startQuiz with quizId
    QuizService->>API: POST /api/quizzes/trainee/start
    API-->>QuizService: Attempt Data + Questions
    QuizService-->>ExamsScreen: Quiz Started
    
    loop لكل سؤال
        ExamsScreen->>User: عرض السؤال
        User->>ExamsScreen: اختيار إجابة
        ExamsScreen->>QuizService: answerQuestion
        QuizService->>API: POST /api/quizzes/trainee/answer
        API-->>QuizService: Answer Saved
    end
    
    User->>ExamsScreen: تسليم الاختبار
    ExamsScreen->>QuizService: submitQuiz
    QuizService->>API: POST /api/quizzes/trainee/submit
    API-->>QuizService: Quiz Result
    QuizService-->>ExamsScreen: Result Data
    ExamsScreen->>User: عرض النتيجة
```

---

## 💾 معمارية التخزين المحلي

```mermaid
graph TB
    subgraph "Application Layer"
        App[Application]
        Services[Services]
    end
    
    subgraph "Storage Layer"
        AS[AsyncStorage]
        Cache[In-Memory Cache]
    end
    
    subgraph "Stored Data"
        Branch[selected_branch]
        BranchTime[branch_selection_time]
        Token[access_token]
        User[user_info]
        Settings[app_settings]
    end
    
    App --> Services
    Services --> AS
    Services --> Cache
    
    AS --> Branch
    AS --> BranchTime
    AS --> Token
    AS --> User
    AS --> Settings
```

---

## 🎯 معمارية الخطأ والمعالجة

```mermaid
graph TD
    subgraph "Error Sources"
        Network[Network Errors]
        API[API Errors]
        Validation[Validation Errors]
        Auth[Auth Errors]
    end
    
    subgraph "Error Handling"
        Try[Try-Catch Blocks]
        Service[Service Layer Handling]
        Screen[Screen Layer Handling]
    end
    
    subgraph "User Feedback"
        Alert[Alert Dialogs]
        Toast[Toast Messages]
        ErrorScreen[Error Screens]
        Retry[Retry Buttons]
    end
    
    Network --> Try
    API --> Try
    Validation --> Try
    Auth --> Try
    
    Try --> Service
    Service --> Screen
    
    Screen --> Alert
    Screen --> Toast
    Screen --> ErrorScreen
    Screen --> Retry
    
    Retry --> Service
```

---

## 📊 نموذج البيانات - الدرجات

```mermaid
erDiagram
    Trainee ||--o{ ClassroomWithContents : has
    ClassroomWithContents ||--|| Classroom : contains
    ClassroomWithContents ||--o{ ContentWithGrades : contains
    ClassroomWithContents ||--|| ClassroomStats : has
    ContentWithGrades ||--|| Content : contains
    ContentWithGrades ||--|| Grades : has
    ContentWithGrades ||--|| MaxMarks : has
    
    Trainee {
        number id
        string nameAr
        string nameEn
        string nationalId
        Program program
    }
    
    Classroom {
        number id
        string name
    }
    
    ClassroomStats {
        number totalEarned
        number totalMax
        number percentage
        number contentCount
    }
    
    Content {
        number id
        string code
        string name
        number yearWorkMarks
        number practicalMarks
        number writtenMarks
        number attendanceMarks
        number quizzesMarks
        number finalExamMarks
    }
    
    Grades {
        number yearWorkMarks
        number practicalMarks
        number writtenMarks
        number attendanceMarks
        number quizzesMarks
        number finalExamMarks
        number totalMarks
    }
    
    MaxMarks {
        number yearWorkMarks
        number practicalMarks
        number writtenMarks
        number attendanceMarks
        number quizzesMarks
        number finalExamMarks
        number total
    }
```

---

## 🏗️ معمارية الطبقات - SOLID

```mermaid
graph TB
    subgraph "Single Responsibility"
        S1[AuthService: Authentication only]
        S2[GradesService: Grades only]
        S3[BranchService: Branch management only]
    end
    
    subgraph "Open/Closed"
        O1[Services: Extendable via interfaces]
        O2[Screens: New screens without modification]
    end
    
    subgraph "Liskov Substitution"
        L1[IGradesService Interface]
        L2[GradesService Implementation]
        L1 --> L2
    end
    
    subgraph "Interface Segregation"
        I1[Specific Interfaces]
        I2[Not monolithic interfaces]
    end
    
    subgraph "Dependency Inversion"
        D1[Screens depend on Services interfaces]
        D2[Services depend on API Config]
        D3[Not concrete implementations]
        D1 --> D2
        D2 --> D3
    end
```

---

## 🎭 معمارية الرسوم المتحركة

```mermaid
graph LR
    subgraph "Animation Types"
        Fade[Fade In/Out]
        Slide[Slide]
        Scale[Scale]
        Spring[Spring]
    end
    
    subgraph "Animation API"
        Animated[React Native Animated]
        Reanimated[Reanimated Library]
    end
    
    subgraph "Implementation"
        UseRef[useRef for values]
        UseEffect[useEffect for triggers]
        Native[useNativeDriver: true]
    end
    
    Fade --> Animated
    Slide --> Animated
    Scale --> Animated
    Spring --> Reanimated
    
    Animated --> UseRef
    Reanimated --> UseRef
    UseRef --> UseEffect
    UseEffect --> Native
```

---

## 🌐 معمارية الشبكة

```mermaid
graph TB
    subgraph "Client Side"
        Screen[Screens]
        Service[Services]
        Config[API Config]
    end
    
    subgraph "Network Layer"
        Fetch[Fetch API]
        Headers[Headers Management]
        Timeout[Timeout Control]
        Error[Error Handling]
    end
    
    subgraph "Server Side"
        API1[Mansoura API]
        API2[Zagazig API]
        Auth[Authentication]
        Endpoints[Endpoints]
    end
    
    Screen --> Service
    Service --> Config
    Config --> Fetch
    Fetch --> Headers
    Headers --> Timeout
    Timeout --> Error
    
    Error --> API1
    Error --> API2
    API1 --> Auth
    API2 --> Auth
    Auth --> Endpoints
```

---

**تاريخ الإنشاء:** 2025-11-26  
**الإصدار:** 1.0  
**المؤلف:** Roo AI Architect