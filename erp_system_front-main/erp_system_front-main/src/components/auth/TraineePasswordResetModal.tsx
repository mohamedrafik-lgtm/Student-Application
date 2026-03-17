'use client';

import { useState, useEffect } from 'react';
import { traineeAPI } from '@/lib/trainee-api';
import { 
  XMarkIcon, 
  UserIcon, 
  PhoneIcon, 
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface TraineePasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ResetStep = 'verify' | 'code' | 'password' | 'success';

export default function TraineePasswordResetModal({ isOpen, onClose }: TraineePasswordResetModalProps) {
  const [currentStep, setCurrentStep] = useState<ResetStep>('verify');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [formData, setFormData] = useState({
    nationalId: '',
    phone: '',
    resetCode: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Timer للعد التنازلي
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeLeft]);

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

    // تنسيق كود التحقق (أرقام فقط، حد أقصى 6)
    if (e.target.name === 'resetCode') {
      value = value.replace(/\D/g, '').slice(0, 6);
    }
    
    setFormData({
      ...formData,
      [e.target.name]: value
    });
    setError('');
  };

  const handleVerifyTrainee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // استخدام API المباشر
      await traineeAPI.requestPasswordReset(formData.nationalId, formData.phone);
      setSuccess('تم إرسال كود التحقق عبر الواتساب بنجاح!');
      setCurrentStep('code');
      setTimeLeft(180); // 3 دقائق = 180 ثانية
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // استخدام API المباشر
      await traineeAPI.verifyResetCode(formData.nationalId, formData.resetCode);
      setSuccess('تم التحقق من الكود بنجاح!');
      setCurrentStep('password');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // التحقق من تطابق كلمات المرور
    if (formData.newPassword !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      setLoading(false);
      return;
    }

    try {
      // استخدام API المباشر
      await traineeAPI.resetPassword(formData.nationalId, formData.resetCode, formData.newPassword);
      setSuccess('تم تغيير كلمة المرور بنجاح!');
      setCurrentStep('success');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (timeLeft > 0) return;
    
    setLoading(true);
    setError('');

    try {
      // استخدام API المباشر
      await traineeAPI.requestPasswordReset(formData.nationalId, formData.phone);
      setSuccess('تم إعادة إرسال كود التحقق بنجاح!');
      setTimeLeft(180); // 3 دقائق
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setCurrentStep('verify');
    setFormData({
      nationalId: '',
      phone: '',
      resetCode: '',
      newPassword: '',
      confirmPassword: ''
    });
    setError('');
    setSuccess('');
    setTimeLeft(0);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            استعادة كلمة المرور
          </h3>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Progress Steps */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`flex items-center ${currentStep === 'verify' ? 'text-emerald-600' : currentStep === 'code' || currentStep === 'password' || currentStep === 'success' ? 'text-emerald-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'verify' ? 'bg-emerald-600 text-white' : currentStep === 'code' || currentStep === 'password' || currentStep === 'success' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  1
                </div>
                <span className="mr-2 text-sm font-medium">التحقق</span>
              </div>
              
              <div className={`flex items-center ${currentStep === 'code' ? 'text-emerald-600' : currentStep === 'password' || currentStep === 'success' ? 'text-emerald-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'code' ? 'bg-emerald-600 text-white' : currentStep === 'password' || currentStep === 'success' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  2
                </div>
                <span className="mr-2 text-sm font-medium">الكود</span>
              </div>
              
              <div className={`flex items-center ${currentStep === 'password' ? 'text-emerald-600' : currentStep === 'success' ? 'text-emerald-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'password' ? 'bg-emerald-600 text-white' : currentStep === 'success' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  3
                </div>
                <span className="mr-2 text-sm font-medium">كلمة المرور</span>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: currentStep === 'verify' ? '33%' : 
                         currentStep === 'code' ? '66%' : 
                         currentStep === 'password' || currentStep === 'success' ? '100%' : '0%' 
                }}
              ></div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                <span className="text-red-800 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                <span className="text-emerald-800 text-sm">{success}</span>
              </div>
            </div>
          )}

          {/* Step 1: Verify Trainee */}
          {currentStep === 'verify' && (
            <form onSubmit={handleVerifyTrainee} className="space-y-4">
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
                    className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="أدخل الرقم القومي (14 رقم)"
                    required
                    maxLength={14}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.nationalId.length}/14 رقم
                </p>
              </div>

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
                    className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="أدخل رقم الهاتف (11 رقم)"
                    required
                    maxLength={11}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.phone.length}/11 رقم
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || formData.nationalId.length !== 14 || formData.phone.length !== 11}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'جاري الإرسال...' : 'إرسال كود التحقق'}
              </button>

              <div className="text-center text-xs text-gray-500">
                سيتم إرسال كود التحقق عبر الواتساب لرقم الهاتف المسجل في المركز
              </div>
            </form>
          )}

          {/* Step 2: Verify Code */}
          {currentStep === 'code' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  كود التحقق <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="resetCode"
                    value={formData.resetCode}
                    onChange={handleInputChange}
                    className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center text-lg font-mono tracking-widest"
                    placeholder="000000"
                    required
                    maxLength={6}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  أدخل الكود المكون من 6 أرقام المرسل عبر الواتساب
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || formData.resetCode.length !== 6}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'جاري التحقق...' : 'تحقق من الكود'}
              </button>

              {/* Resend Code */}
              <div className="text-center">
                {timeLeft > 0 ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <ClockIcon className="w-4 h-4" />
                    <span>يمكن طلب كود جديد خلال {formatTime(timeLeft)}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors"
                  >
                    إعادة إرسال الكود
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Step 3: New Password */}
          {currentStep === 'password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور الجديدة <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="أدخل كلمة المرور الجديدة"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تأكيد كلمة المرور <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="أعد كتابة كلمة المرور"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>• كلمة المرور يجب أن تكون 6 أحرف على الأقل</p>
                <p>• يُفضل استخدام مزيج من الأحرف والأرقام</p>
              </div>

              <button
                type="submit"
                disabled={loading || formData.newPassword.length < 6 || formData.confirmPassword.length < 6}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
              </button>
            </form>
          )}

          {/* Step 4: Success */}
          {currentStep === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircleIcon className="w-8 h-8 text-emerald-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">
                تم تغيير كلمة المرور بنجاح!
              </h4>
              <p className="text-gray-600">
                يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة
              </p>
              <button
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300"
              >
                تسجيل الدخول الآن
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
