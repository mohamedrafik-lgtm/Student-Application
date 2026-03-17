import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // إعادة توجيه المسارات القديمة للأخبار
  if (pathname.startsWith('/news/') && !pathname.match(/^\/news\/\d+$/)) {
    // استخراج slug من المسار
    const slug = pathname.split('/').pop();
    
    // إعادة توجيه مؤقت إلى الصفحة الرئيسية للأخبار
    return NextResponse.redirect(new URL('/news', request.url));
  }
  
  // التحقق من وجود توكن المصادقة
  const authToken = request.cookies.get('auth_token')?.value;
  
  // للتشخيص: طباعة معلومات عن الطلب والتوكن (في بيئة التطوير فقط)
  if (process.env.NODE_ENV === 'development') {
    console.log(`Middleware - Path: ${pathname}`);
    console.log(`Middleware - Auth Token exists: ${!!authToken}`);
    if (authToken) {
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        console.log(`Middleware - Token expires at: ${new Date(payload.exp * 1000)}`);
        console.log(`Middleware - Token is expired: ${payload.exp * 1000 < Date.now()}`);
      } catch (e) {
        console.log('Middleware - Invalid token format');
      }
    }
  }
  
  // إذا كان المستخدم مسجل الدخول ويحاول الوصول إلى صفحة تسجيل الدخول
  if (authToken && (pathname === '/login' || pathname === '/instructor-login')) {
    try {
      const tokenParts = authToken.split('.');
      if (tokenParts.length === 3) {
        const payload = tokenParts[1];
        const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        
        // ✅ حماية JSON.parse من الأخطاء
        try {
          const tokenData = JSON.parse(decodedPayload);
          
          // توجيه المستخدم حسب نوع حسابه
          if (tokenData.accountType === 'INSTRUCTOR') {
            console.log('Middleware - Instructor already logged in, redirecting to instructor-dashboard');
            return NextResponse.redirect(new URL('/instructor-dashboard', request.url));
          } else {
            console.log('Middleware - Staff already logged in, redirecting to dashboard');
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }
        } catch (parseError) {
          console.error('Middleware - Failed to parse token JSON:', parseError);
          // حذف التوكن المشوه
          const response = NextResponse.redirect(new URL('/login', request.url));
          response.cookies.delete('auth_token');
          return response;
        }
      }
    } catch (error) {
      console.error('Middleware - Error decoding token:', error);
      // حذف التوكن غير الصحيح
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_token');
      return response;
    }
  }

  // إذا لم يكن هناك توكن، قم بإعادة التوجيه إلى صفحة تسجيل الدخول
  if (!authToken && pathname.startsWith('/dashboard')) {
    console.log('Middleware - No auth token, redirecting to login');
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // إذا كان هناك توكن، تحقق من صحته للمسارات المحمية
  if (authToken && pathname.startsWith("/dashboard")) {
    try {
      // التحقق من صحة تنسيق التوكن فقط
      const tokenParts = authToken.split('.');
      
      if (tokenParts.length !== 3) {
        console.error('Middleware - Invalid token format');
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete('auth_token');
        return response;
      }
      
      const payload = tokenParts[1];
      const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      
      // ✅ حماية JSON.parse من الأخطاء
      try {
        const tokenData = JSON.parse(decodedPayload);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Middleware - Token data:', tokenData);
        }
        
        // التحقق من حالة الأرشفة
        if (tokenData.isArchived) {
          console.log('Middleware - Archived user trying to access /dashboard, redirecting to /login');
          const response = NextResponse.redirect(new URL("/login?account_archived=true", request.url));
          response.cookies.delete('auth_token');
          return response;
        }
        
        // التحقق من نوع الحساب - المحاضرون لا يمكنهم الوصول لـ /dashboard
        if (tokenData.accountType === 'INSTRUCTOR') {
          console.log('Middleware - Instructor trying to access /dashboard, redirecting to /instructor-dashboard');
          return NextResponse.redirect(new URL("/instructor-dashboard", request.url));
        }
        
        console.log('Middleware - Valid token, allowing access to dashboard');
        
      } catch (parseError) {
        console.error('Middleware - Failed to parse token JSON:', parseError);
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete('auth_token');
        return response;
      }
      
    } catch (error) {
      // إذا كان هناك خطأ في فك تشفير التوكن، قم بإعادة التوجيه إلى صفحة تسجيل الدخول
      console.error('Middleware - Error decoding token:', error);
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete('auth_token');
      return response;
    }
  }

  // حماية مسار لوحة تحكم المحاضرين
  if (authToken && pathname.startsWith("/instructor-dashboard")) {
    try {
      const tokenParts = authToken.split('.');
      
      if (tokenParts.length !== 3) {
        console.error('Middleware - Invalid token format');
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete('auth_token');
        return response;
      }
      
      const payload = tokenParts[1];
      const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      
      // ✅ حماية JSON.parse من الأخطاء
      try {
        const tokenData = JSON.parse(decodedPayload);
        
        // فقط المحاضرون يمكنهم الوصول لـ /instructor-dashboard
        if (tokenData.accountType !== 'INSTRUCTOR') {
          console.log('Middleware - Non-instructor trying to access /instructor-dashboard, redirecting to /dashboard');
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        
        console.log('Middleware - Valid instructor token, allowing access');
        
      } catch (parseError) {
        console.error('Middleware - Failed to parse token JSON:', parseError);
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete('auth_token');
        return response;
      }
      
    } catch (error) {
      console.error('Middleware - Error decoding token:', error);
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete('auth_token');
      return response;
    }
  }

  // إذا لم يكن هناك توكن للمسارات المحمية
  if (!authToken && pathname.startsWith("/instructor-dashboard")) {
    console.log('Middleware - No auth token, redirecting to login');
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ==================== حماية مسارات المتدربين ====================
  const traineeToken = request.cookies.get('trainee_token')?.value;
  
  // إذا المتدرب مسجل دخول ويحاول زيارة صفحة تسجيل الدخول → توجيهه للداشبورد
  if (pathname === '/trainee-auth') {
    if (traineeToken) {
      try {
        const tokenParts = traineeToken.split('.');
        if (tokenParts.length === 3) {
          const payload = tokenParts[1];
          const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
          const tokenData = JSON.parse(decodedPayload);
          
          // التحقق من عدم انتهاء صلاحية التوكن
          if (tokenData.exp && tokenData.exp * 1000 > Date.now()) {
            console.log('Middleware - Trainee already logged in, redirecting to trainee-dashboard');
            return NextResponse.redirect(new URL('/trainee-dashboard', request.url));
          }
        }
      } catch (error) {
        // توكن غير صالح → نتركه يدخل صفحة تسجيل الدخول
        console.log('Middleware - Invalid trainee token, allowing access to trainee-auth');
      }
    }
  }

  // إذا المتدرب يحاول الوصول لداشبورده بدون توكن → توجيهه لتسجيل الدخول
  if (pathname.startsWith('/trainee-dashboard')) {
    if (!traineeToken) {
      console.log('Middleware - No trainee token, redirecting to trainee-auth');
      return NextResponse.redirect(new URL('/trainee-auth', request.url));
    }
    
    // التحقق من صلاحية التوكن
    try {
      const tokenParts = traineeToken.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const payload = tokenParts[1];
      const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const tokenData = JSON.parse(decodedPayload);
      
      // التحقق من انتهاء الصلاحية
      if (tokenData.exp && tokenData.exp * 1000 < Date.now()) {
        console.log('Middleware - Trainee token expired, redirecting to trainee-auth');
        const response = NextResponse.redirect(new URL('/trainee-auth', request.url));
        response.cookies.delete('trainee_token');
        return response;
      }
      
      console.log('Middleware - Valid trainee token, allowing access');
    } catch (error) {
      console.log('Middleware - Invalid trainee token, redirecting to trainee-auth');
      const response = NextResponse.redirect(new URL('/trainee-auth', request.url));
      response.cookies.delete('trainee_token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/instructor-dashboard/:path*", "/login", "/instructor-login", "/trainee-auth", "/trainee-dashboard/:path*"],
};
