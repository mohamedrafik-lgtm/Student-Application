"use client";

import { useState } from "react";
import { X, Phone, Shield, Lock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'phone' | 'code' | 'password' | 'success';

export default function PasswordResetModal({ isOpen, onClose }: PasswordResetModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetForm = () => {
    setCurrentStep('phone');
    setPhoneNumber('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        // التحقق من حالة الأرشفة
        if (data.message?.includes('archived') || data.message?.includes('مؤرشف') || data.message?.includes('موقوف') || data.message?.includes('suspended') || data.message?.includes('deactivated') || data.isArchived) {
          throw new Error('تم إيقاف حسابك ولا يمكنك استعادة كلمة المرور. تواصل مع الإدارة لمزيد من المعلومات.');
        }
        throw new Error(data.message || 'حدث خطأ في الطلب');
      }

      setSuccess(data.message);
      setCurrentStep('code');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, resetCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'كود التحقق غير صحيح');
      }

      setSuccess(data.message);
      setCurrentStep('password');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber, 
          resetCode, 
          newPassword 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'فشل في إعادة تعيين كلمة المرور');
      }

      setSuccess(data.message);
      setCurrentStep('success');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 font-cairo" dir="rtl">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-[2rem] shadow-2xl shadow-slate-900/20 border border-slate-100 max-w-md w-full max-h-[90vh] overflow-y-auto z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                  <Lock className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">استعادة كلمة المرور</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">أعد تعيين كلمة المرور بأمان</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8">
              {/* Progress Steps */}
              <div className="flex items-center justify-center mb-10">
                <div className="flex items-center gap-3">
                  {/* Step 1 */}
                  <div className={`flex items-center justify-center w-12 h-12 rounded-2xl border-2 transition-all duration-300 ${
                    currentStep === 'phone' ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/30' :
                    ['code', 'password', 'success'].includes(currentStep) ? 'border-emerald-500 bg-emerald-500 text-white' : 
                    'border-slate-200 bg-slate-50 text-slate-400'
                  }`}>
                    <Phone className="w-5 h-5" />
                  </div>
                  
                  <div className={`w-10 h-1 rounded-full transition-all duration-300 ${
                    ['code', 'password', 'success'].includes(currentStep) ? 'bg-emerald-500' : 'bg-slate-100'
                  }`} />
                  
                  {/* Step 2 */}
                  <div className={`flex items-center justify-center w-12 h-12 rounded-2xl border-2 transition-all duration-300 ${
                    currentStep === 'code' ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/30' :
                    ['password', 'success'].includes(currentStep) ? 'border-emerald-500 bg-emerald-500 text-white' : 
                    'border-slate-200 bg-slate-50 text-slate-400'
                  }`}>
                    <Shield className="w-5 h-5" />
                  </div>
                  
                  <div className={`w-10 h-1 rounded-full transition-all duration-300 ${
                    ['password', 'success'].includes(currentStep) ? 'bg-emerald-500' : 'bg-slate-100'
                  }`} />
                  
                  {/* Step 3 */}
                  <div className={`flex items-center justify-center w-12 h-12 rounded-2xl border-2 transition-all duration-300 ${
                    currentStep === 'password' ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/30' :
                    currentStep === 'success' ? 'border-emerald-500 bg-emerald-500 text-white' : 
                    'border-slate-200 bg-slate-50 text-slate-400'
                  }`}>
                    <Lock className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Error Message */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-600"
                  >
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold mb-1">تعذر في العملية</h4>
                      <p className="text-sm font-medium leading-relaxed">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success Message */}
              <AnimatePresence mode="wait">
                {success && currentStep !== 'success' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-600"
                  >
                    <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold mb-1">تم بنجاح!</h4>
                      <p className="text-sm font-medium leading-relaxed">{success}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 1: Phone Number */}
              {currentStep === 'phone' && (
                <motion.form 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleRequestCode} 
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">
                      رقم الهاتف المرتبط بالحساب
                    </label>
                    <div className="relative group">
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="01012345678"
                        className="w-full pr-12 pl-4 py-4 bg-slate-50/50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-slate-900 font-bold text-lg transition-all outline-none shadow-sm text-right"
                        required
                        disabled={loading}
                        dir="ltr"
                      />
                      <Phone className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 mt-2">
                      سيتم إرسال كود التحقق إلى رقم WhatsApp المرتبط بحسابك
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !phoneNumber.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg shadow-blue-600/30 disabled:opacity-50 flex items-center justify-center mt-8"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>جاري الإرسال...</span>
                      </div>
                    ) : (
                      'إرسال كود التحقق'
                    )}
                  </button>
                </motion.form>
              )}

              {/* Step 2: Verification Code */}
              {currentStep === 'code' && (
                <motion.form 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleVerifyCode} 
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">
                      كود التحقق
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        className="w-full px-4 py-4 bg-slate-50/50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-slate-900 font-bold text-2xl tracking-[0.5em] text-center transition-all outline-none shadow-sm font-mono"
                        required
                        disabled={loading}
                        dir="ltr"
                      />
                    </div>
                    <p className="text-sm font-medium text-slate-500 mt-2 text-center">
                      أدخل الكود المرسل إلى WhatsApp ({phoneNumber})
                    </p>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      type="button"
                      onClick={() => setCurrentStep('phone')}
                      className="flex-1 bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold text-lg hover:bg-slate-200 transition-colors"
                      disabled={loading}
                    >
                      رجوع
                    </button>
                    <button
                      type="submit"
                      disabled={loading || resetCode.length !== 6}
                      className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg shadow-blue-600/30 disabled:opacity-50 flex items-center justify-center"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>تحقق...</span>
                        </div>
                      ) : (
                        'تحقق من الكود'
                      )}
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Step 3: New Password */}
              {currentStep === 'password' && (
                <motion.form 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleResetPassword} 
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">
                      كلمة المرور الجديدة
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الجديدة"
                      className="w-full px-4 py-4 bg-slate-50/50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-slate-900 font-bold text-lg transition-all outline-none shadow-sm"
                      required
                      disabled={loading}
                      minLength={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">
                      تأكيد كلمة المرور
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور"
                      className="w-full px-4 py-4 bg-slate-50/50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-slate-900 font-bold text-lg transition-all outline-none shadow-sm"
                      required
                      disabled={loading}
                      minLength={6}
                    />
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      type="button"
                      onClick={() => setCurrentStep('code')}
                      className="flex-1 bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold text-lg hover:bg-slate-200 transition-colors"
                      disabled={loading}
                    >
                      رجوع
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !newPassword || !confirmPassword}
                      className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg shadow-blue-600/30 disabled:opacity-50 flex items-center justify-center"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>جاري التحديث...</span>
                        </div>
                      ) : (
                        'تحديث كلمة المرور'
                      )}
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Step 4: Success */}
              {currentStep === 'success' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6 py-4"
                >
                  <div className="w-24 h-24 bg-emerald-50 border-4 border-emerald-100 rounded-full mx-auto flex items-center justify-center text-emerald-500 shadow-sm">
                    <CheckCircle className="w-12 h-12" />
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">تم بنجاح!</h3>
                    <p className="text-lg font-medium text-slate-600">تم تغيير كلمة المرور بنجاح</p>
                    <p className="text-sm font-medium text-slate-500 mt-2">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة</p>
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg shadow-blue-600/30 mt-8"
                  >
                    العودة لتسجيل الدخول
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
