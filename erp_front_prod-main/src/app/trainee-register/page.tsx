'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { traineeAPI } from '@/lib/trainee-api';
import {
  AcademicCapIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  UserIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import DatePicker from './components/DatePicker';

type RegisterStep = 'verify' | 'phone-verify' | 'create-password';

export default function TraineeRegisterPage() {
  const [currentStep, setCurrentStep] = useState<RegisterStep>('verify');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    nationalId: '',
    birthDate: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  // Verified trainee data
  const [traineeData, setTraineeData] = useState<{
    name: string;
    nationalId: string;
    hasAccount: boolean;
    phoneHint?: string;
  } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // تنسيق الرقم القومي (أرقام فقط، حد أقصى 14)
    if (e.target.name === 'nationalId') {
      value = value.replace(/\D/g, '').slice(0, 14);
    }
    
    // تنسيق رقم الهاتف (أرقام فقط، حد أقصى 11)
    if (e.target.name === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 11);
    }
    
    setFormData({
      ...formData,
      [e.target.name]: value
    });
    setError('');
  };

  // استخدام useCallback لمنع إعادة إنشاء function في كل render
  const handleDateChange = useCallback((date: string) => {
    setFormData(prev => ({ ...prev, birthDate: date }));
    setError('');
  }, []);

  const handleVerifyTrainee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // التحقق من صحة الرقم القومي
    if (formData.nationalId.length !== 14) {
      setError('الرقم القومي يجب أن يكون 14 رقماً');
      setLoading(false);
      return;
    }

    // التحقق من صحة تاريخ الميلاد
    if (!formData.birthDate) {
      setError('يرجى اختيار تاريخ الميلاد');
      setLoading(false);
      return;
    }

    try {
      // تحويل تاريخ الميلاد إلى صيغة ISO 8601
      const birthDateISO = new Date(formData.birthDate + 'T00:00:00.000Z').toISOString();
      
      // استخدام API المباشر
      const data = await traineeAPI.verifyTrainee(formData.nationalId, birthDateISO);
      setTraineeData(data);
      if (data.hasAccount) {
        setError('يوجد حساب مسجل مسبقاً بهذا الرقم القومي. يرجى استخدام تسجيل الدخول.');
      } else {
        setCurrentStep('phone-verify');
        setSuccess(`مرحباً ${data.name}! تم التحقق من بياناتك بنجاح. الآن يرجى التحقق من رقم الهاتف`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'لم يتم العثور على متدرب بهذه البيانات في سجلات المركز';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // التحقق من صحة رقم الهاتف
    if (formData.phone.length !== 11) {
      setError('رقم الهاتف يجب أن يكون 11 رقماً');
      setLoading(false);
      return;
    }

    try {
      // استخدام API المباشر
      await traineeAPI.verifyPhone(formData.nationalId, formData.phone);
      setCurrentStep('create-password');
      setSuccess('تم التحقق من رقم الهاتف بنجاح! يمكنك الآن إنشاء كلمة مرور');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'رقم الهاتف غير متطابق مع السجلات في المركز';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      setLoading(false);
      return;
    }

    try {
      // تحويل تاريخ الميلاد إلى صيغة ISO 8601
      const birthDateISO = new Date(formData.birthDate + 'T00:00:00.000Z').toISOString();
      
      // استخدام API المباشر
      await traineeAPI.createPassword(formData.nationalId, formData.password, formData.confirmPassword, birthDateISO);
      setSuccess('تم إنشاء الحساب بنجاح! سيتم توجيهك لتسجيل الدخول...');
      setTimeout(() => {
        window.location.href = '/trainee-auth';
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ في إنشاء الحساب';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-4 w-96 h-96 bg-emerald-400/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-1/3 -right-4 w-96 h-96 bg-teal-400/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-cyan-400/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4 border-4 border-emerald-100">
              <AcademicCapIcon className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              إنشاء حساب متدرب جديد
            </h1>
            <p className="text-gray-600 mb-4">
              {currentStep === 'verify' && 'تحقق من بياناتك المسجلة في المركز'}
              {currentStep === 'phone-verify' && 'تحقق من رقم الهاتف المسجل في المركز'}
              {currentStep === 'create-password' && 'أنشئ كلمة مرور آمنة لحسابك'}
            </p>
            
            {/* Important Notice */}
            {currentStep === 'verify' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <ShieldCheckIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-right">
                    <h4 className="font-medium text-blue-900 mb-2">⚠️ شروط إنشاء الحساب</h4>
                    <ul className="text-sm text-blue-800 leading-relaxed space-y-1">
                      <li>• يجب أن تكون طالباً مسجلاً في مركز طيبة للتدريب المهني</li>
                      <li>• الرقم القومي 14 رقماً كما في بطاقة الهوية</li>
                      <li>• حساب واحد فقط لكل رقم قومي</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep === 'verify' ? 'bg-emerald-600 border-emerald-600 text-white' : 
                  traineeData ? 'bg-emerald-100 border-emerald-600 text-emerald-600' : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}>
                  1
                </div>
                <div className={`w-8 h-0.5 ${traineeData ? 'bg-emerald-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep === 'phone-verify' ? 'bg-emerald-600 border-emerald-600 text-white' : 
                  currentStep === 'create-password' ? 'bg-emerald-100 border-emerald-600 text-emerald-600' :
                  'bg-gray-100 border-gray-300 text-gray-400'
                }`}>
                  2
                </div>
                <div className={`w-8 h-0.5 ${currentStep === 'create-password' ? 'bg-emerald-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep === 'create-password' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}>
                  3
                </div>
              </div>
            </div>
            
            {/* Step Labels */}
            <div className="flex items-center justify-between text-xs text-gray-600 px-2">
              <span className={currentStep === 'verify' ? 'text-emerald-600 font-medium' : ''}>
                البيانات
              </span>
              <span className={currentStep === 'phone-verify' ? 'text-emerald-600 font-medium' : ''}>
                الهاتف
              </span>
              <span className={currentStep === 'create-password' ? 'text-emerald-600 font-medium' : ''}>
                كلمة المرور
              </span>
            </div>
          </div>

          {/* Main Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            {/* Success Message */}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                  <span className="text-emerald-800">{success}</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                  <span className="text-red-800">{error}</span>
                </div>
              </div>
            )}

            {/* Step 1: Verify Trainee */}
            {currentStep === 'verify' && (
              <form onSubmit={handleVerifyTrainee} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الرقم القومي <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="nationalId"
                      value={formData.nationalId}
                      onChange={handleInputChange}
                      className={`w-full pr-12 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        formData.nationalId.length === 14 ? 'border-green-300 bg-green-50' : 
                        formData.nationalId.length > 0 && formData.nationalId.length < 14 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="أدخل الرقم القومي (14 رقم)"
                      required
                      maxLength={14}
                    />
                    {/* Status indicator */}
                    {formData.nationalId.length > 0 && (
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        {formData.nationalId.length === 14 ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${
                    formData.nationalId.length === 14 ? 'text-green-600' : 
                    formData.nationalId.length > 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {formData.nationalId.length === 14 ? '✓ الرقم القومي صحيح' : 
                     formData.nationalId.length > 0 ? `${formData.nationalId.length}/14 رقم` : 
                     'يجب إدخال 14 رقماً كما هو موجود في بطاقة الهوية'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاريخ الميلاد <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={formData.birthDate}
                    onChange={handleDateChange}
                    required
                    className="mb-2"
                  />
                  <p className="text-xs text-gray-500">
                    تاريخ الميلاد كما هو مسجل في بطاقة الهوية
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || formData.nationalId.length !== 14 || !formData.birthDate}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? 'جاري التحقق...' : 'التحقق من البيانات'}
                </button>

                <div className="text-center pt-4 border-t border-gray-200 space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">لديك حساب مسبقاً؟</p>
                    <Link
                      href="/trainee-auth"
                      className="text-emerald-600 hover:text-emerald-700 font-medium text-sm underline"
                    >
                      سجل دخولك من هنا
                    </Link>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-700 font-medium mb-1">📞 لست مسجلاً في المركز بعد؟</p>
                    <p className="text-xs text-gray-600 leading-relaxed mb-3">
                      تواصل مع إدارة مركز طيبة للتدريب المهني لإتمام عملية التسجيل كطالب أولاً، 
                      ثم يمكنك إنشاء حسابك على المنصة.
                    </p>
                    <a
                      href="https://wa.me/201010530142?text=السلام عليكم، أريد الاستفسار عن التسجيل في مركز طيبة للتدريب المهني"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors duration-300 shadow-sm hover:shadow-md"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.487"/>
                      </svg>
                      تواصل عبر واتساب
                    </a>
                  </div>
                </div>
              </form>
            )}

            {/* Step 2: Verify Phone Number */}
            {currentStep === 'phone-verify' && (
              <form onSubmit={handleVerifyPhone} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الهاتف <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <PhoneIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full pr-12 pl-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        formData.phone.length === 11 ? 'border-green-300 bg-green-50' : 
                        formData.phone.length > 0 && formData.phone.length < 11 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="أدخل رقم الهاتف (11 رقم)"
                      required
                      maxLength={11}
                    />
                    {/* Status indicator */}
                    {formData.phone.length > 0 && (
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        {formData.phone.length === 11 ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${
                    formData.phone.length === 11 ? 'text-green-600' : 
                    formData.phone.length > 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {formData.phone.length === 11 ? '✓ رقم الهاتف صحيح' : 
                     formData.phone.length > 0 ? `${formData.phone.length}/11 رقم` : 
                     'أدخل رقم الهاتف المسجل في المركز (11 رقم)'}
                  </p>
                </div>

                {/* Phone Hint */}
                {traineeData?.phoneHint && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-700 font-medium mb-1">💡 تلميح</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      رقم الهاتف المسجل في المركز ينتهي بـ: **{traineeData.phoneHint}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || formData.phone.length !== 11}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? 'جاري التحقق...' : 'التحقق من رقم الهاتف'}
                </button>

                <div className="text-center pt-4 border-t border-gray-200">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-700 font-medium mb-1">📞 رقم الهاتف غير صحيح؟</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      إذا كان رقم الهاتف المسجل في المركز غير صحيح، يرجى التواصل مع إدارة المركز لتحديثه
                    </p>
                  </div>
                </div>
              </form>
            )}

            {/* Step 3: Create Password */}
            {currentStep === 'create-password' && (
              <form onSubmit={handleCreatePassword} className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    مرحباً {traineeData?.name}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    تم التحقق من بياناتك بنجاح ✓
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    كلمة المرور الجديدة <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pr-12 pl-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="أدخل كلمة المرور"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تأكيد كلمة المرور <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full pr-12 pl-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="أعد إدخال كلمة المرور"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <p className="mb-1">متطلبات كلمة المرور:</p>
                  <ul className="space-y-1">
                    <li>• 6 أحرف على الأقل</li>
                    <li>• يجب أن تحتوي على حروف وأرقام</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
                </button>
              </form>
            )}
          </div>

          {/* Back to Auth Select */}
          <div className="text-center mt-6">
            <Link
              href="/auth-select"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-300"
            >
              <ArrowRightIcon className="w-4 h-4 rotate-180" />
              العودة لاختيار نوع الحساب
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
