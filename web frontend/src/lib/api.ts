// ملف للتعامل مع طلبات API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
export const SERVER_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';

// دالة مساعدة للحصول على المسار الصحيح للصور والملفات
// الرابط في قاعدة البيانات يحدد مصدر الصورة: Cloudinary URL أو مسار محلي
export function getImageUrl(filePath: string | null): string {
  if (!filePath) return '/images/placeholder.png';

  // إذا كان URL كامل (Cloudinary أو أي مصدر خارجي)
  if (filePath.startsWith('http')) {
    return filePath;
  }

  // إذا كان مسار محلي يحتوي على uploads
  if (filePath.includes('uploads')) {
    const cleanPath = filePath.replace(/\/+/g, '/');
    const uploadsIdx = cleanPath.indexOf('uploads/');
    if (uploadsIdx !== -1) {
      const relativePart = cleanPath.substring(uploadsIdx + 'uploads/'.length);
      return `/backend-uploads/${relativePart}`;
    }
    const relativePath = cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath;
    return `/backend-uploads/${relativePath.replace(/^uploads\//, '')}`;
  }

  // في الحالات الأخرى، نفترض أنه اسم ملف في مجلد uploads
  return `/backend-uploads/${filePath}`;
}

// دالة مساعدة للتحقق من نوع الصورة
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('cloudinary.com');
}

// دالة مساعدة للحصول على URL محسن من Cloudinary
export function getOptimizedImageUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
  } = {}
): string {
  if (!isCloudinaryUrl(url)) {
    return getImageUrl(url);
  }

  const { width = 800, height = 600, quality = 'auto:good', format = 'auto' } = options;

  // استخراج الجزء الأساسي من URL
  const baseUrl = url.split('/upload/')[0] + '/upload/';
  const imagePath = url.split('/upload/')[1];

  // إنشاء URL محسن
  const transformations = [
    `w_${width}`,
    `h_${height}`,
    'c_limit',
    `q_${quality}`,
    `f_${format}`
  ].join(',');

  return `${baseUrl}${transformations}/${imagePath}`;
}

// دالة مساعدة للحصول على التوكن من التخزين المحلي أو Cookies
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    // التحقق من السياق - إذا كنا في صفحة المتدرب، نستخدم trainee_token
    const isTraineeDashboard = window.location.pathname.startsWith('/trainee-dashboard');
    const isInstructorDashboard = window.location.pathname.startsWith('/instructor-dashboard');
    
    let token: string | null = null;
    
    if (isTraineeDashboard) {
      // في صفحات المتدرب، نبحث عن trainee_token فقط
      token = localStorage.getItem('trainee_token');
    } else if (isInstructorDashboard) {
      // في صفحات المحاضر، نبحث في cookies أولاً ثم localStorage
      token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1] || localStorage.getItem('token') || localStorage.getItem('auth_token');
    } else {
      // في صفحات الإدارة، نبحث عن token أو auth_token
      token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    }
    
    console.log('getAuthToken - توكن المصادقة:', token ? 'موجود' : 'غير موجود');
    return token;
  }
  return null;
}

// دالة مساعدة للتعامل مع طلبات الـ API
export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // إضافة توكن المصادقة تلقائيًا إذا كان متاحًا
  const token = getAuthToken();
  console.log(`fetchAPI - طلب إلى: ${endpoint}`);
  
  if (token) {
    console.log('fetchAPI - تم إضافة توكن المصادقة إلى الطلب');
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('fetchAPI - لا يوجد توكن مصادقة! قد يفشل الطلب إذا كان المسار محميًا');
  }

  try {
    // Asegurarnos de que la URL esté correctamente formateada
    const finalEndpoint = endpoint.replace(/\/+/g, '/');
    
    const response = await fetch(`${API_BASE_URL}${finalEndpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      let errorMessage = `حدث خطأ أثناء الاتصال بالخادم: ${response.status} ${response.statusText}`;
      let errorData = null;
      
      // تشخيص خطأ المصادقة - معالجة محسنة
      if (response.status === 401) {
        console.error('fetchAPI - خطأ مصادقة (401 Unauthorized)');
        
        // التحقق من وجود توكن مصادقة في الطلب
        const hasAuthToken = options.headers?.Authorization || 
                           (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('auth_token')));
        
        // إذا كان هناك توكن ولكن تم رفضه، فهذا يعني انتهاء الجلسة
        if (hasAuthToken) {
          console.error('fetchAPI - التوكن منتهي الصلاحية أو غير صحيح');
          
          // استثناء endpoint تسجيل الدخول فقط
          const isLoginEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/trainee-auth/login');
          
          if (!isLoginEndpoint && typeof window !== 'undefined') {
            console.log('fetchAPI - تنظيف الجلسة المنتهية وإعادة التوجيه...');
            localStorage.removeItem('token');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
            
            // إعادة توجيه لصفحة تسجيل الدخول مع رسالة انتهاء الجلسة
            window.location.href = '/login?session_expired=true';
            return; // لا نريد متابعة المعالجة
          }
        }
        // إذا لم يكن هناك توكن، فهذا خطأ تسجيل دخول عادي وسنتركه يمر للمعالجة العادية
        console.log('fetchAPI - خطأ تسجيل دخول (بيانات غير صحيحة)');
      }
      
      // التحقق من حالة الأرشفة (403 Forbidden)
      if (response.status === 403) {
        try {
          const clonedResponse = response.clone();
          const forbiddenData = await clonedResponse.json();
          if (forbiddenData.isArchived || forbiddenData.message?.includes('archived') || forbiddenData.message?.includes('مؤرشف') || forbiddenData.message?.includes('موقوف') || forbiddenData.message?.includes('إيقاف')) {
            console.log('fetchAPI - الحساب مؤرشف، جاري طرد المستخدم...');
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
              document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
              window.location.href = '/login?account_archived=true';
              return;
            }
          }
        } catch (e) {
          // لا نفعل شيء إذا فشل parsing
        }
      }
      
      try {
        errorData = await response.json();
        if (errorData && errorData.message) {
          // ترجمة رسائل الخطأ الشائعة
          if (errorData.message.includes('User with this email already exists')) {
            errorMessage = 'البريد الإلكتروني مُستخدم بالفعل، يرجى استخدام بريد آخر';
          } else if (errorData.message.includes('User with this phone number already exists')) {
            errorMessage = 'رقم الهاتف مُستخدم بالفعل، يرجى استخدام رقم آخر';
          } else {
            errorMessage = errorData.message;
          }
        }
        
        if (errorData && errorData.errors) {
          // في حالة وجود أخطاء تحقق متعددة
          const validationErrors = Array.isArray(errorData.errors) 
            ? errorData.errors.map((e: any) => e.message || e).join(', ')
            : Object.values(errorData.errors).join(', ');
          
          errorMessage = `أخطاء في البيانات: ${validationErrors}`;
        }
      } catch (jsonError) {
        // إذا لم يكن الرد بتنسيق JSON، استخدم نص الخطأ العام
        console.error('Failed to parse error response:', jsonError);
      }
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).data = errorData;
      throw error;
    }

    // تحقق مما إذا كان هناك محتوى للرد
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      return { success: true };
    }
  } catch (error: any) {
    console.error('Error in fetchAPI:', error);
    
    // معالجة أخطاء الشبكة بشكل أفضل
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.error('fetchAPI - خطأ في الشبكة (انقطاع الاتصال)');
      throw new Error('تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
    } else if (error.name === 'AbortError') {
      console.error('fetchAPI - تم إلغاء الطلب بسبب انتهاء المهلة الزمنية');
      throw new Error('انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.');
    }
    throw error;
  }
}

// دالة لتحميل ملفات ثنائية (blob) مثل ZIP, PDF, إلخ
export async function downloadFile(endpoint: string): Promise<Blob> {
  const token = getAuthToken();
  console.log(`downloadFile - طلب تحميل من: ${endpoint}`);
  
  if (!token) {
    console.warn('downloadFile - لا يوجد توكن مصادقة!');
    throw new Error('يرجى تسجيل الدخول أولاً');
  }

  try {
    const finalEndpoint = endpoint.replace(/\/+/g, '/');
    
    const response = await fetch(`${API_BASE_URL}${finalEndpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    console.log('downloadFile - حالة الاستجابة:', response.status);

    if (!response.ok) {
      let errorMessage = `فشل تحميل الملف: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // إذا فشل تحليل JSON، استخدم الرسالة الافتراضية
      }
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    console.log('downloadFile - تم استلام الملف، الحجم:', blob.size);
    return blob;
  } catch (error: any) {
    console.error('خطأ في تحميل الملف:', error);
    throw error;
  }
}

// دالة مساعدة لرفع الملفات
export async function uploadFile(file: File, folder?: string) {
  console.log('بدء رفع الملف:', file.name, 'الحجم:', file.size, 'النوع:', file.type);
  
  const formData = new FormData();
  formData.append('file', file);

  // الحصول على رمز المصادقة
  const token = getAuthToken();
  console.log('تم الحصول على رمز المصادقة:', token ? 'موجود' : 'غير موجود');
  
  if (!token) {
    console.error('لا يوجد رمز مصادقة! لن يتم السماح برفع الملف.');
    throw new Error('يرجى تسجيل الدخول لرفع الملفات');
  }
  
  try {
    // إنشاء URL مع معلمة المجلد إذا تم تحديدها
    let uploadUrl = `${API_BASE_URL}/upload`;
    if (folder) {
      uploadUrl += `?folder=${encodeURIComponent(folder)}`;
    }
    
    console.log('إرسال طلب رفع الملف إلى:', uploadUrl);
    
    // إرسال الطلب مع رمز المصادقة في الرأس
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
      credentials: 'include'
    });
    
    console.log('استجابة الخادم:', response.status, response.statusText);

    if (!response.ok) {
      let errorData: any = {};
      let errorMessage = `فشل رفع الملف: ${response.status} ${response.statusText}`;
      
      try {
        errorData = await response.json();
        console.error('بيانات الخطأ من الخادم:', errorData);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        console.error('فشل تحليل بيانات الخطأ:', e);
      }
      
      // إضافة معلومات إضافية عن الملف للتشخيص
      const fileInfo = `نوع الملف: ${file.type}, الحجم: ${file.size} بايت`;
      throw new Error(`${errorMessage}. معلومات الملف: ${fileInfo}`);
    }

    // محاولة قراءة البيانات من الاستجابة
    let responseData;
    try {
      responseData = await response.json();
      console.log('بيانات استجابة رفع الملف:', responseData);
    } catch (e) {
      console.error('فشل تحليل بيانات الاستجابة:', e);
      throw new Error('فشل في قراءة استجابة الخادم بعد رفع الملف');
    }
    
    // التأكد من أن الاستجابة تحتوي على حقل url
    if (!responseData || !responseData.url) {
      console.error('استجابة الخادم لا تحتوي على حقل url:', responseData);
      throw new Error('استجابة الخادم لا تحتوي على مسار الصورة');
    }
    
    return responseData;
  } catch (error) {
    console.error('خطأ أثناء رفع الملف:', error);
    throw error;
  }
}

// Add this function to handle training content API calls
export async function fetchTrainingContents(includeQuestionCount = true) {
  return fetchAPI(`/training-contents?includeQuestionCount=${includeQuestionCount}`);
}

export async function generateTrainingContentCode() {
  return fetchAPI('/training-contents/generate-code');
}

export async function fetchTrainingContent(id: string) {
  return fetchAPI(`/training-contents/${id}`);
}

export async function createTrainingContent(data: any) {
  return fetchAPI('/training-contents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTrainingContent(id: string, data: any) {
  return fetchAPI(`/training-contents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTrainingContent(id: string) {
  return fetchAPI(`/training-contents/${id}`, {
    method: 'DELETE',
  });
}

// Dashboard API functions
export async function fetchDashboardStats() {
  return fetchAPI('/dashboard/stats');
}

export async function fetchDashboardCharts() {
  return fetchAPI('/dashboard/charts');
}

export async function fetchDashboardActivities() {
  return fetchAPI('/dashboard/activities');
}

export async function fetchComprehensiveDashboard() {
  return fetchAPI('/dashboard/comprehensive');
}

export async function fetchTraineesStats() {
  return fetchAPI('/trainees/stats');
}

export async function fetchProgramsStats() {
  return fetchAPI('/programs/stats');
}

export async function fetchAttendanceStats() {
  return fetchAPI('/attendance/stats');
}

export async function fetchLatestActivities(limit: number = 5) {
  return fetchAPI(`/audit-logs/recent?limit=${limit}`);
}

// Trainee Platform API functions
export async function fetchTraineePlatformAccounts(params: any = {}) {
  const queryString = new URLSearchParams(params).toString();
  return fetchAPI(`/trainee-platform/accounts?${queryString}`);
}

export async function fetchTraineePlatformStats(params: any = {}) {
  const queryString = new URLSearchParams(params).toString();
  return fetchAPI(`/trainee-platform/stats?${queryString}`);
}

export async function updateTraineeAccount(id: string, data: any) {
  return fetchAPI(`/trainee-platform/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function resetTraineePassword(id: string, newPassword: string) {
  return fetchAPI(`/trainee-platform/accounts/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  });
}

export async function toggleTraineeAccountStatus(id: string) {
  return fetchAPI(`/trainee-platform/accounts/${id}/toggle-status`, {
    method: 'PATCH',
  });
}