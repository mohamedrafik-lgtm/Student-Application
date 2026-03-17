'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { motion } from 'framer-motion';
import {
  FiWifi,
  FiWifiOff,
  FiRefreshCw,
  FiPhone,
  FiMessageSquare,
  FiZap,
  FiActivity,
  FiCheck,
  FiSend,
  FiUsers,
  FiDollarSign,
  FiTarget,
  FiShield,
  FiLogOut,
  FiSettings
} from 'react-icons/fi';
import { toast } from 'sonner';

interface WhatsAppStatus {
  isReady: boolean;
  isConnected: boolean;
  qrCode?: string;
  phoneNumber?: string;
  lastActivity?: Date;
}



function WhatsAppPageContent() {
  const [status, setStatus] = useState<WhatsAppStatus>({
    isReady: false,
    isConnected: false
  });
  const [qrCode, setQrCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('رسالة تجريبية');





  useEffect(() => {
    checkStatus();
    const interval = setInterval(() => {
      checkStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const { fetchAPI } = await import('@/lib/api');
      const statusData = await fetchAPI('/whatsapp/status');
      setStatus(statusData);
      
      if (statusData.isConnected && statusData.isReady) {
        setQrCode('');
        return;
      }
      
      if (!statusData.isConnected) {
        const qrData = await fetchAPI('/whatsapp/qr-code');
        if (qrData.qrCode) {
          setQrCode(qrData.qrCode);
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const handleGenerateQR = async () => {
    setLoading(true);
    try {
      const { fetchAPI } = await import('@/lib/api');
      const result = await fetchAPI('/whatsapp/generate-qr', {
        method: 'POST',
      });
      
      if (result.qrCode) {
        setQrCode(result.qrCode);
        toast.success('تم إنشاء QR Code جديد');
      } else {
        toast.error(result.message || 'فشل في إنشاء QR Code');
      }
    } catch (error) {
      console.error('Error generating QR:', error);
      toast.error('حدث خطأ أثناء إنشاء QR Code');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      const { fetchAPI } = await import('@/lib/api');
      const result = await fetchAPI('/whatsapp/restart', {
        method: 'POST',
      });
      
      if (result.success) {
        toast.success('تم إعادة تشغيل WhatsApp');
        setTimeout(checkStatus, 2000);
      } else {
        toast.error(result.message || 'فشل في إعادة التشغيل');
      }
    } catch (error) {
      console.error('Error restarting:', error);
      toast.error('حدث خطأ أثناء إعادة التشغيل');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      const { fetchAPI } = await import('@/lib/api');
      const result = await fetchAPI('/whatsapp/logout', {
        method: 'POST',
      });
      
      if (result.success) {
        toast.success('تم تسجيل الخروج من WhatsApp بنجاح');
        setStatus({
          isReady: false,
          isConnected: false
        });
        setQrCode('');
        setTimeout(checkStatus, 2000);
      } else {
        toast.error(result.message || 'فشل في تسجيل الخروج');
      }
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    } finally {
      setLoading(false);
    }
  };

  const handleForceReauth = async () => {
    setLoading(true);
    try {
      const { fetchAPI } = await import('@/lib/api');
      const result = await fetchAPI('/whatsapp/force-reauth', {
        method: 'POST',
      });
      
      if (result.success) {
        toast.success('تم إعادة تعيين الجلسة بنجاح');
        setStatus({
          isReady: false,
          isConnected: false
        });
        setQrCode('');
        setTimeout(checkStatus, 3000);
      } else {
        toast.error(result.message || 'فشل في إعادة التعيين');
      }
    } catch (error) {
      console.error('Error force reauth:', error);
      toast.error('حدث خطأ أثناء إعادة التعيين');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testPhone || !testMessage) {
      toast.error('يجب إدخال رقم الهاتف والرسالة');
      return;
    }

    if (!status.isReady || !status.isConnected) {
      toast.error('WhatsApp غير جاهز لإرسال الرسائل');
      return;
    }

    setLoading(true);
    try {
      const { sendTestMessage } = await import('@/app/lib/api/whatsapp');
      const result = await sendTestMessage({
        phoneNumber: testPhone,
        message: testMessage
      });
      
      if (result.success) {
        toast.success('تم إرسال الرسالة التجريبية بنجاح! ✅');
        setTestPhone('');
      } else {
        toast.error(result.message || 'فشل في إرسال الرسالة ❌');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('حدث خطأ أثناء إرسال الرسالة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header محسن */}
        <div className="bg-gradient-to-br from-green-600 via-blue-600 to-purple-700 rounded-3xl text-white p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <div className="bg-white/20 backdrop-blur-sm p-3 md:p-4 rounded-2xl shadow-lg">
                <FiMessageSquare className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">نظام WhatsApp الذكي</h1>
                <p className="text-white/90 text-base md:text-lg mb-3">منصة التواصل التلقائي مع المتدربين والمسوقين</p>
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs md:text-sm">
                    <FiUsers className="h-3 w-3 md:h-4 md:w-4 text-white" />
                    <span className="text-white">رسائل ترحيب تلقائية</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs md:text-sm">
                    <FiTarget className="h-3 w-3 md:h-4 md:w-4 text-white" />
                    <span className="text-white">إشعارات المسوقين</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs md:text-sm">
                    <FiDollarSign className="h-3 w-3 md:h-4 md:w-4 text-white" />
                    <span className="text-white">فواتير تلقائية للسداد</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-3">
              <div className={`flex items-center gap-3 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-sm ${
                status.isReady ? 'text-green-100' : status.isConnected ? 'text-yellow-100' : 'text-red-100'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  status.isConnected ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' : 'bg-red-400 animate-pulse shadow-lg shadow-red-400/50'
                }`}></div>
                <span className="font-medium">{status.isReady ? 'جاهز للعمل' : status.isConnected ? 'متصل' : 'غير متصل'}</span>
              </div>
              {status.isConnected && (
                <div className="text-white/80 text-sm">
                  📱 {status.phoneNumber || 'رقم غير محدد'}
                </div>
              )}
            </div>
          </div>
        </div>

        

        {/* البوت التفاعلي الذكي */}
        <div className="relative bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-6 lg:p-8 shadow-2xl border border-indigo-100 mb-8 overflow-hidden max-w-6xl mx-auto">

          {/* خلفية متحركة */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-r from-blue-200/30 to-purple-200/30 rounded-full"
              animate={{
                x: [0, 50, 0],
                y: [0, 30, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-r from-pink-200/30 to-indigo-200/30 rounded-full"
              animate={{
                x: [0, -30, 0],
                y: [0, -20, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
          </div>

          <div className="relative z-10">
            <div className="text-center mb-6">
              <motion.h2
                className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
              >
                🤖 مرحباً! أنا مساعدك الذكي
              </motion.h2>

              <motion.p
                className="text-lg text-gray-700 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3 }}
              >
                دعني أشرح لك كيف سيغير نظام WhatsApp الذكي طريقة عملك! ✨
              </motion.p>
            </div>

            {/* البوت الكرتوني المحسن */}
            <div className="grid lg:grid-cols-3 gap-8 items-start">

              {/* البوت الجديد */}
              <motion.div
                className="relative"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
              >
                <motion.div
                  className="relative"
                  animate={{
                    y: [0, -15, 0],
                    rotate: [0, 3, -3, 0]
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {/* جسم البوت المحسن */}
                  <div className="w-24 h-32 bg-gradient-to-b from-indigo-400 via-purple-500 to-pink-500 rounded-2xl relative shadow-xl">

                    {/* الرأس */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-gradient-to-b from-indigo-300 to-purple-400 rounded-full shadow-lg border-2 border-white">

                      {/* العيون المتحركة */}
                      <motion.div
                        className="absolute top-3 left-3 w-3 h-3 bg-white rounded-full shadow-inner"
                        animate={{
                          scaleY: [1, 0.1, 1],
                          x: [0, 2, 0, -2, 0]
                        }}
                        transition={{
                          scaleY: { duration: 3, repeat: Infinity },
                          x: { duration: 4, repeat: Infinity, delay: 1 }
                        }}
                      >
                        <motion.div
                          className="w-2 h-2 bg-indigo-900 rounded-full mt-0.5 ml-0.5"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </motion.div>

                      <motion.div
                        className="absolute top-3 right-3 w-3 h-3 bg-white rounded-full shadow-inner"
                        animate={{
                          scaleY: [1, 0.1, 1],
                          x: [0, -2, 0, 2, 0]
                        }}
                        transition={{
                          scaleY: { duration: 3, repeat: Infinity, delay: 0.2 },
                          x: { duration: 4, repeat: Infinity, delay: 1.2 }
                        }}
                      >
                        <motion.div
                          className="w-2 h-2 bg-indigo-900 rounded-full mt-0.5 ml-0.5"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
                        />
                      </motion.div>

                      {/* الفم المتحرك */}
                      <motion.div
                        className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-5 h-2 border-2 border-white rounded-full"
                        animate={{
                          scaleX: [1, 1.3, 1],
                          scaleY: [1, 0.8, 1]
                        }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                      />

                      {/* الهوائي المتطور */}
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-1 h-4 bg-gradient-to-t from-yellow-400 to-yellow-300 rounded-full">
                        <motion.div
                          className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-full"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.8, 1, 0.8],
                            boxShadow: [
                              "0 0 0px rgba(255,193,7,0)",
                              "0 0 20px rgba(255,193,7,0.8)",
                              "0 0 0px rgba(255,193,7,0)"
                            ]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </div>
                    </div>

                    {/* الشاشة التفاعلية */}
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-12 h-10 bg-gradient-to-b from-green-400 to-emerald-500 rounded-lg border-2 border-white shadow-inner">
                      <motion.div
                        className="w-full h-full bg-gradient-to-b from-green-300 to-emerald-400 rounded-lg flex items-center justify-center relative overflow-hidden"
                        animate={{
                          opacity: [0.9, 1, 0.9],
                          scale: [1, 1.02, 1]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <motion.div
                          animate={{
                            scale: [1, 1.2, 1],
                            rotate: [0, 5, -5, 0]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <FiMessageSquare className="text-white text-lg" />
                        </motion.div>

                        {/* تأثيرات الشاشة المحسنة */}
                        <motion.div
                          className="absolute inset-0 bg-white"
                          animate={{ opacity: [0, 0.4, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: 3 }}
                        />

                        {/* مؤشرات البيانات */}
                        <motion.div
                          className="absolute bottom-1 left-1 right-1 h-0.5 bg-white/60 rounded"
                          animate={{ scaleX: [0, 1, 0.3, 1, 0] }}
                          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                        />
                        <motion.div
                          className="absolute bottom-2 left-1 right-1 h-0.5 bg-white/40 rounded"
                          animate={{ scaleX: [0, 0.8, 0.2, 0.9, 0] }}
                          transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
                        />
                      </motion.div>
                    </div>

                    {/* الأذرع المتحركة */}
                    <motion.div
                      className="absolute top-10 -left-3 w-6 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full shadow-md"
                      animate={{
                        rotate: [0, 25, -10, 15, 0],
                        x: [0, 2, 0]
                      }}
                      transition={{ duration: 4, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute top-10 -right-3 w-6 h-2 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full shadow-md"
                      animate={{
                        rotate: [0, -25, 10, -15, 0],
                        x: [0, -2, 0]
                      }}
                      transition={{ duration: 4, repeat: Infinity, delay: 2 }}
                    />

                    {/* الأرجل */}
                    <div className="absolute -bottom-2 left-5 w-3 h-5 bg-gradient-to-b from-pink-500 to-purple-600 rounded-b-xl shadow-md"></div>
                    <div className="absolute -bottom-2 right-5 w-3 h-5 bg-gradient-to-b from-pink-500 to-purple-600 rounded-b-xl shadow-md"></div>

                    {/* أزرار التحكم */}
                    <motion.div
                      className="absolute top-20 left-1/2 transform -translate-x-1/2 flex gap-1"
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <div className="w-2 h-2 bg-red-400 rounded-full shadow-md"></div>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-md"></div>
                      <div className="w-2 h-2 bg-green-400 rounded-full shadow-md"></div>
                    </motion.div>
                  </div>

                  {/* تأثيرات الطاقة المحسنة */}
                  <motion.div
                    className="absolute -top-6 -right-6 w-4 h-4"
                    animate={{
                      scale: [0, 1.2, 0],
                      rotate: [0, 360],
                      opacity: [0, 0.8, 0]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: 2
                    }}
                  >
                    <div className="w-full h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full shadow-md"></div>
                  </motion.div>

                  <motion.div
                    className="absolute -bottom-4 -left-4 w-3 h-3"
                    animate={{
                      scale: [0, 1, 0],
                      y: [0, -10, 0],
                      opacity: [0, 1, 0]
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      delay: 1
                    }}
                  >
                    <div className="w-full h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full shadow-md"></div>
                  </motion.div>
                </motion.div>
              </motion.div>

              {/* المحادثة التفاعلية */}
              <div className="lg:col-span-2 space-y-4">

                {/* رسالة الترحيب */}
                <motion.div
                  className="relative"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 1, delay: 1 }}
                >
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-2xl rounded-bl-none shadow-lg relative">
                    <motion.div
                      animate={{
                        textShadow: [
                          "0 0 0px rgba(255,255,255,0)",
                          "0 0 15px rgba(255,255,255,0.4)",
                          "0 0 0px rgba(255,255,255,0)"
                        ]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <h3 className="text-xl font-bold mb-2 text-white">🎯 ماذا ستستفيد من نظامي؟</h3>
                      <p className="text-base leading-relaxed text-white">
                        سأجعل عملك أسهل وأكثر كفاءة! دعني أوضح لك كيف...
                      </p>
                    </motion.div>

                    {/* مؤشر الكتابة */}
                    <motion.div
                      className="flex items-center gap-2 mt-4"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <div className="flex gap-1">
                        <motion.div
                          className="w-2 h-2 bg-white/70 rounded-full"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-white/70 rounded-full"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-white/70 rounded-full"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                        />
                      </div>
                      <span className="text-white/80 text-sm">البوت يكتب...</span>
                    </motion.div>

                    <div className="absolute bottom-0 right-6 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[15px] border-t-purple-600 transform translate-y-full"></div>
                  </div>
                </motion.div>

                {/* قائمة الفوائد */}
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    {
                      icon: "🎉",
                      title: "ترحيب تلقائي للمتدربين",
                      desc: "رسالة ترحيب فورية مع كل التفاصيل المهمة",
                      color: "from-blue-500 to-cyan-500",
                      delay: 1.5
                    },
                    {
                      icon: "📊",
                      title: "تقارير ذكية للمسوقين",
                      desc: "إشعارات فورية مع إحصائيات الأداء",
                      color: "from-green-500 to-emerald-500",
                      delay: 2
                    },
                    {
                      icon: "💰",
                      title: "فواتير تلقائية للسداد",
                      desc: "إرسال فوري لفاتورة PDF مع تأكيد الدفع",
                      color: "from-purple-500 to-pink-500",
                      delay: 2.5
                    },
                    {
                      icon: "👤",
                      title: "بيانات حساب الموظف",
                      desc: "إرسال بيانات تسجيل الدخول فور إنشاء الحساب",
                      color: "from-orange-500 to-red-500",
                      delay: 3
                    }
                  ].map((benefit, index) => (
                    <motion.div
                      key={index}
                      className={`bg-gradient-to-r ${benefit.color} text-white p-3 rounded-xl shadow-md`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: benefit.delay }}
                      whileHover={{
                        scale: 1.02,
                        boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <motion.div
                          className="text-2xl"
                          animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                          }}
                          transition={{ duration: 2, repeat: Infinity, delay: benefit.delay }}
                        >
                          {benefit.icon}
                        </motion.div>
                        <div>
                          <h4 className="text-lg font-bold mb-1 text-white">{benefit.title}</h4>
                          <p className="text-white/90 text-sm leading-relaxed">{benefit.desc}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* رسالة الختام */}
                <motion.div
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-2xl shadow-lg text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, delay: 4 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <motion.div
                    animate={{
                      y: [0, -3, 0],
                      textShadow: [
                        "0 0 0px rgba(255,255,255,0)",
                        "0 0 15px rgba(255,255,255,0.5)",
                        "0 0 0px rgba(255,255,255,0)"
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <h3 className="text-lg font-bold mb-2 text-white">🚀 النتيجة؟</h3>
                    <p className="text-base text-white">
                      توفير الوقت • زيادة الكفاءة • تحسين التواصل • سعادة العملاء
                    </p>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* المحتوى الرئيسي - حالة الاتصال والتحكم */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* الجانب الأساسي */}
          <div className="xl:col-span-2 space-y-6">

            {/* حالة الاتصال */}
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="bg-white border-b border-gray-200">
                <CardTitle className="flex items-center gap-3 text-xl text-gray-900">
                  {status.isConnected ?
                    <FiWifi className="text-emerald-600 h-6 w-6" /> :
                    <FiWifiOff className="text-red-600 h-6 w-6" />
                  }
                  حالة اتصال النظام
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className={`relative overflow-hidden p-6 rounded-xl border-2 transition-all duration-300 ${
                    status.isConnected
                      ? 'bg-emerald-50 border-emerald-200 shadow-emerald-100/50 shadow-lg'
                      : 'bg-red-50 border-red-200 shadow-red-100/50 shadow-lg'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-gray-700 uppercase">حالة الاتصال</span>
                      <div className={`w-4 h-4 rounded-full ${status.isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    </div>
                    <div className={`text-2xl font-bold mb-2 ${status.isConnected ? 'text-emerald-800' : 'text-red-800'}`}>
                      {status.isConnected ? '✅ متصل بنجاح' : '❌ غير متصل'}
                    </div>
                    <p className="text-sm text-gray-600">
                      {status.isConnected ? 'الاتصال نشط وثابت' : 'يحتاج إعادة ربط'}
                    </p>
                  </div>

                  <div className={`relative overflow-hidden p-6 rounded-xl border-2 transition-all duration-300 ${
                    status.isReady
                      ? 'bg-emerald-50 border-emerald-200 shadow-emerald-100/50 shadow-lg'
                      : 'bg-orange-50 border-orange-200 shadow-orange-100/50 shadow-lg'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-gray-700 uppercase">جاهزية الإرسال</span>
                      <div className={`w-4 h-4 rounded-full ${status.isReady ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                    </div>
                    <div className={`text-2xl font-bold mb-2 ${status.isReady ? 'text-emerald-800' : 'text-orange-800'}`}>
                      {status.isReady ? '🚀 جاهز تماماً' : '⏳ في الانتظار'}
                    </div>
                    <p className="text-sm text-gray-600">
                      {status.isReady ? 'يمكن إرسال الرسائل' : 'ينتظر اكتمال الإعداد'}
                    </p>
                  </div>
                </div>

                {status.phoneNumber && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-500 p-3 rounded-xl">
                        <FiPhone className="text-white h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-blue-900 uppercase block">رقم الهاتف المربوط</span>
                        <div className="font-mono font-bold text-2xl text-blue-900 mt-1">+{status.phoneNumber}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button onClick={checkStatus} disabled={loading} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                    <FiRefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    تحديث
                  </Button>
                  <Button onClick={handleRestart} disabled={loading} variant="outline" size="sm" className="border-orange-300 text-orange-700">
                    <FiActivity className="w-4 h-4 mr-1" />
                    إعادة تشغيل
                  </Button>
                  <Button onClick={handleLogout} disabled={loading} variant="outline" size="sm" className="border-red-300 text-red-700">
                    <FiLogOut className="w-4 h-4 mr-1" />
                    خروج
                  </Button>
                  <Button onClick={handleForceReauth} disabled={loading} variant="outline" size="sm" className="border-purple-300 text-purple-700">
                    <FiZap className="w-4 h-4 mr-1" />
                    إعادة تعيين
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* قسم QR Code أو النجاح */}
            {!status.isConnected ? (
              <Card className="border-2 border-gray-200 shadow-lg">
                <CardHeader className="bg-white border-b border-gray-200">
                  <CardTitle className="flex items-center gap-3 text-xl text-gray-900">
                    <FiMessageSquare className="text-indigo-600" />
                    ربط حساب WhatsApp
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  {qrCode ? (
                    <div className="text-center space-y-6">
                      <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block shadow-lg">
                        <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 mx-auto rounded-lg" />
                      </div>
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 max-w-md mx-auto">
                        <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center justify-center gap-2">
                          <FiPhone className="w-5 h-5 text-blue-600" />
                          خطوات الربط
                        </h3>
                        <ol className="text-blue-900 space-y-3 text-sm">
                          <li className="flex items-center gap-3">
                            <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                            <span className="text-blue-900">افتح WhatsApp على هاتفك</span>
                          </li>
                          <li className="flex items-center gap-3">
                            <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                            <span className="text-blue-900">اذهب إلى الإعدادات ← الأجهزة المربوطة</span>
                          </li>
                          <li className="flex items-center gap-3">
                            <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                            <span className="text-blue-900">امسح الرمز أعلاه بالكاميرا</span>
                          </li>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="bg-gray-100 w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <FiWifiOff className="w-10 h-10 text-gray-500" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-700 mb-2">في انتظار الاتصال</h3>
                      <p className="text-sm text-gray-600 mb-6">اضغط لإنشاء رمز QR للربط</p>
                      <Button
                        onClick={handleGenerateQR}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                      >
                        {loading ? <FiRefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FiMessageSquare className="w-4 h-4 mr-2" />}
                        إنشاء QR Code
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-emerald-200 bg-emerald-50">
                <CardContent className="p-6 text-center">
                  <div className="bg-emerald-500 w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <FiCheck className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-900 mb-2">WhatsApp متصل بنجاح!</h3>
                  <p className="text-sm text-emerald-700 mb-4">النظام جاهز لإرسال الرسائل التلقائية</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/60 p-3 rounded-lg border border-emerald-200">
                      <FiUsers className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-emerald-900">رسائل ترحيب</p>
                    </div>
                    <div className="bg-white/60 p-3 rounded-lg border border-emerald-200">
                      <FiDollarSign className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-emerald-900">إيصالات PDF</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* اختبار الرسائل */}
            {status.isReady && status.isConnected && (
              <Card className="border-2 border-gray-200 shadow-lg">
                <CardHeader className="bg-white border-b border-gray-200">
                  <CardTitle className="flex items-center gap-3 text-xl text-gray-900">
                    <FiSend className="text-blue-600" />
                    اختبار إرسال الرسائل
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">📱 رقم الهاتف</label>
                      <Input
                        type="tel"
                        placeholder="ادخل رقم الهاتف"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        disabled={loading}
                        className="border border-gray-300 focus:border-blue-500 rounded-lg p-3 text-gray-900 placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">💬 محتوى الرسالة</label>
                      <Textarea
                        placeholder="اكتب رسالتك التجريبية هنا..."
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        disabled={loading}
                        rows={3}
                        className="border border-gray-300 focus:border-blue-500 rounded-lg p-3 text-sm resize-none text-gray-900 placeholder-gray-500"
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <Button
                      onClick={handleSendTestMessage}
                      disabled={loading || !testPhone || !testMessage}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                    >
                      {loading ? <FiRefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FiSend className="w-4 h-4 mr-2" />}
                      إرسال رسالة تجريبية
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* الشريط الجانبي */}
          <div className="space-y-6">

            {/* روابط سريعة */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FiSettings className="text-indigo-600 w-4 h-4" />
                إدارة سريعة
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-all"
                >
                  <div className="bg-emerald-500 p-2 rounded-lg">
                    <FiRefreshCw className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-xs font-semibold text-emerald-900">تحديث البيانات</span>
                  </div>
                </button>
              </div>
            </div>

            {/* معلومات تقنية */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FiShield className="text-gray-600 w-4 h-4" />
                المواصفات التقنية
              </h3>
              <div className="space-y-2">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <FiZap className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-900">تقنية Baileys</span>
                  </div>
                  <p className="text-xs text-blue-700">اتصال مباشر بـ WhatsApp</p>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-1">
                    <FiActivity className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-900">WebSocket</span>
                  </div>
                  <p className="text-xs text-emerald-700">إرسال فوري وسريع</p>
                </div>

                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-1">
                    <FiShield className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-900">التشفير الآمن</span>
                  </div>
                  <p className="text-xs text-purple-700">end-to-end encryption</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WhatsAppPage() {
  return (
    <ProtectedPage
      requiredPermission={{ resource: 'whatsapp', action: 'read' }}
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح لك بالوصول</h2>
            <p className="text-gray-600">لا تملك الصلاحية المطلوبة للوصول إلى إدارة الواتساب</p>
          </div>
        </div>
      }
    >
      <WhatsAppPageContent />
    </ProtectedPage>
  );
}
