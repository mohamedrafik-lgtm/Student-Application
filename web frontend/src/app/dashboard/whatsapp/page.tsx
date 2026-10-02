'use client';

import { useState, useEffect } from 'react';
import { Card, CardStat, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/app/components/PageHeader';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import {
  WifiIcon,
  SignalSlashIcon,
  ArrowPathIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  BoltIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  QrCodeIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  MegaphoneIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { fetchAPI } from '@/lib/api';
import Link from 'next/link';

interface WhatsAppStatus {
  isReady: boolean;
  isConnected: boolean;
  qrCode?: string;
  phoneNumber?: string;
  lastActivity?: Date;
}



function WhatsAppPageContent() {
  const [status, setStatus] = useState<WhatsAppStatus>({ isReady: false, isConnected: false });
  const [qrCode, setQrCode] = useState<string>('');
  const [pairingPhoneLocalPart, setPairingPhoneLocalPart] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [pairingCodeExpiresIn, setPairingCodeExpiresIn] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('رسالة تجريبية');
  const pairingPhone = `2${pairingPhoneLocalPart}`;

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const statusData = await fetchAPI('/whatsapp/status');
      setStatus(statusData);
      if (statusData.isConnected && statusData.isReady) {
        setQrCode('');
        setPairingCode('');
        setPairingCodeExpiresIn(null);
        return;
      }
      if (!statusData.isConnected) {
        const qrData = await fetchAPI('/whatsapp/qr-code');
        if (qrData.qrCode) setQrCode(qrData.qrCode);
      }
    } catch (error) { console.error('Error checking status:', error); }
  };

  const handleGenerateQR = async () => {
    setLoading(true);
    try {
      const result = await fetchAPI('/whatsapp/generate-qr', { method: 'POST' });
      if (result.qrCode) {
        setQrCode(result.qrCode);
        setPairingCode('');
        setPairingCodeExpiresIn(null);
        toast.success('تم إنشاء QR Code جديد');
      }
      else { toast.error(result.message || 'فشل في إنشاء QR Code'); }
    } catch (error) {
      console.error('Error generating QR:', error);
      toast.error('حدث خطأ أثناء إنشاء QR Code');
    } finally { setLoading(false); }
  };

  const handleGeneratePairingCode = async () => {
    if (!pairingPhoneLocalPart.trim()) {
      toast.error('اكتب باقي رقم الهاتف بعد كود مصر 2');
      return;
    }

    setLoading(true);
    try {
      const result = await fetchAPI('/whatsapp/pairing-code', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: pairingPhone }),
      });

      if (result.success && result.pairingCode) {
        setPairingCode(result.pairingCode);
        setPairingCodeExpiresIn(typeof result.expiresInSeconds === 'number' ? result.expiresInSeconds : null);
        toast.success('تم إرسال طلب الربط بواتساب عن بعد');
      } else {
        toast.error(result.message || 'فشل في طلب الربط بواتساب عن بعد');
      }
    } catch (error) {
      console.error('Error generating pairing code:', error);
      toast.error('حدث خطأ أثناء طلب الربط بواتساب عن بعد');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      const result = await fetchAPI('/whatsapp/restart', { method: 'POST' });
      if (result.success) { toast.success('تم إعادة تشغيل WhatsApp'); setTimeout(checkStatus, 2000); }
      else { toast.error(result.message || 'فشل في إعادة التشغيل'); }
    } catch (error) {
      console.error('Error restarting:', error);
      toast.error('حدث خطأ أثناء إعادة التشغيل');
    } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      const result = await fetchAPI('/whatsapp/logout', { method: 'POST' });
      if (result.success) {
        toast.success('تم تسجيل الخروج من WhatsApp بنجاح');
        setStatus({ isReady: false, isConnected: false });
        setQrCode('');
        setPairingCode('');
        setPairingCodeExpiresIn(null);
        setTimeout(checkStatus, 2000);
      } else { toast.error(result.message || 'فشل في تسجيل الخروج'); }
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    } finally { setLoading(false); }
  };

  const handleForceReauth = async () => {
    setLoading(true);
    try {
      const result = await fetchAPI('/whatsapp/force-reauth', { method: 'POST' });
      if (result.success) {
        toast.success('تم إعادة تعيين الجلسة بنجاح');
        setStatus({ isReady: false, isConnected: false });
        setQrCode('');
        setPairingCode('');
        setPairingCodeExpiresIn(null);
        setTimeout(checkStatus, 3000);
      } else { toast.error(result.message || 'فشل في إعادة التعيين'); }
    } catch (error) {
      console.error('Error force reauth:', error);
      toast.error('حدث خطأ أثناء إعادة التعيين');
    } finally { setLoading(false); }
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
      const result = await fetchAPI('/whatsapp/send-test-message', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: testPhone, message: testMessage }),
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
    <div className="space-y-6">
      <PageHeader
        title="نظام WhatsApp"
        description="إدارة الاتصال والرسائل التلقائية"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'WhatsApp' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              status.isReady ? 'bg-tiba-secondary-100 text-tiba-secondary-700' :
              status.isConnected ? 'bg-tiba-warning-100 text-tiba-warning-700' :
              'bg-tiba-danger-100 text-tiba-danger-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                status.isReady ? 'bg-tiba-secondary-500 animate-pulse' :
                status.isConnected ? 'bg-tiba-warning-500' :
                'bg-tiba-danger-500'
              }`} />
              {status.isReady ? 'جاهز' : status.isConnected ? 'متصل' : 'غير متصل'}
            </span>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card size="sm">
          <CardStat
            icon={<WifiIcon className="w-6 h-6" />}
            title="حالة الاتصال"
            value={status.isConnected ? 'متصل' : 'غير متصل'}
            variant={status.isConnected ? 'secondary' : 'danger'}
          />
        </Card>
        <Card size="sm">
          <CardStat
            icon={<CheckCircleIcon className="w-6 h-6" />}
            title="جاهزية الإرسال"
            value={status.isReady ? 'جاهز' : 'غير جاهز'}
            variant={status.isReady ? 'secondary' : 'warning'}
          />
        </Card>
        <Card size="sm">
          <CardStat
            icon={<PhoneIcon className="w-6 h-6" />}
            title="رقم الهاتف"
            value={status.phoneNumber ? `+${status.phoneNumber}` : 'غير محدد'}
            variant="primary"
          />
        </Card>
        <Card size="sm">
          <CardStat
            icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
            title="الرسائل التلقائية"
            value={status.isReady ? 'مفعّل' : 'معطّل'}
            variant={status.isReady ? 'secondary' : 'default'}
          />
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/dashboard/whatsapp/campaigns">
          <Card hover className="group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-tiba-primary-100 text-tiba-primary-700 flex items-center justify-center group-hover:bg-tiba-primary-200 transition-colors">
                <MegaphoneIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-tiba-gray-800">الحملات</p>
                <p className="text-xs text-tiba-gray-500">إدارة حملات الرسائل</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/dashboard/whatsapp/campaigns/templates">
          <Card hover className="group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-tiba-secondary-100 text-tiba-secondary-700 flex items-center justify-center group-hover:bg-tiba-secondary-200 transition-colors">
                <DocumentTextIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-tiba-gray-800">القوالب</p>
                <p className="text-xs text-tiba-gray-500">قوالب الرسائل الجاهزة</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/dashboard/automation/payment-reminders">
          <Card hover className="group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-tiba-warning-100 text-tiba-warning-700 flex items-center justify-center group-hover:bg-tiba-warning-200 transition-colors">
                <CurrencyDollarIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-tiba-gray-800">تذكيرات الدفع</p>
                <p className="text-xs text-tiba-gray-500">إدارة تذكيرات السداد</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="xl:col-span-2 space-y-6">

          {/* Connection Status */}
          <Card size="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {status.isConnected ?
                  <WifiIcon className="w-5 h-5 text-tiba-secondary-600" /> :
                  <SignalSlashIcon className="w-5 h-5 text-tiba-danger-600" />
                }
                حالة اتصال النظام
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className={`p-4 rounded-lg border ${
                  status.isConnected
                    ? 'bg-tiba-secondary-50 border-tiba-secondary-200'
                    : 'bg-tiba-danger-50 border-tiba-danger-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-tiba-gray-600">حالة الاتصال</span>
                    <span className={`w-3 h-3 rounded-full ${status.isConnected ? 'bg-tiba-secondary-500' : 'bg-tiba-danger-500'}`} />
                  </div>
                  <p className={`text-lg font-bold ${status.isConnected ? 'text-tiba-secondary-700' : 'text-tiba-danger-700'}`}>
                    {status.isConnected ? 'متصل بنجاح' : 'غير متصل'}
                  </p>
                  <p className="text-xs text-tiba-gray-500 mt-1">
                    {status.isConnected ? 'الاتصال نشط وثابت' : 'يحتاج إعادة ربط'}
                  </p>
                </div>

                <div className={`p-4 rounded-lg border ${
                  status.isReady
                    ? 'bg-tiba-secondary-50 border-tiba-secondary-200'
                    : 'bg-tiba-warning-50 border-tiba-warning-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-tiba-gray-600">جاهزية الإرسال</span>
                    <span className={`w-3 h-3 rounded-full ${status.isReady ? 'bg-tiba-secondary-500' : 'bg-tiba-warning-500'}`} />
                  </div>
                  <p className={`text-lg font-bold ${status.isReady ? 'text-tiba-secondary-700' : 'text-tiba-warning-700'}`}>
                    {status.isReady ? 'جاهز تماماً' : 'في الانتظار'}
                  </p>
                  <p className="text-xs text-tiba-gray-500 mt-1">
                    {status.isReady ? 'يمكن إرسال الرسائل' : 'ينتظر اكتمال الإعداد'}
                  </p>
                </div>
              </div>

              {status.phoneNumber && (
                <div className="bg-tiba-primary-50 border border-tiba-primary-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-tiba-primary-100 flex items-center justify-center">
                      <PhoneIcon className="w-5 h-5 text-tiba-primary-700" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-tiba-primary-600 block">رقم الهاتف المربوط</span>
                      <span className="font-mono font-bold text-lg text-tiba-primary-800">+{status.phoneNumber}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={checkStatus} disabled={loading} size="sm" className="bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white">
                  <ArrowPathIcon className={`w-4 h-4 ml-1 ${loading ? 'animate-spin' : ''}`} />
                  تحديث
                </Button>
                <Button onClick={handleRestart} disabled={loading} variant="outline" size="sm">
                  <BoltIcon className="w-4 h-4 ml-1" />
                  إعادة تشغيل
                </Button>
                <Button onClick={handleLogout} disabled={loading} variant="outline" size="sm" className="border-tiba-danger-300 text-tiba-danger-700 hover:bg-tiba-danger-50">
                  <ArrowRightOnRectangleIcon className="w-4 h-4 ml-1" />
                  خروج
                </Button>
                <Button onClick={handleForceReauth} disabled={loading} variant="outline" size="sm">
                  <ArrowPathIcon className="w-4 h-4 ml-1" />
                  إعادة تعيين
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* QR Code / Connected */}
          {!status.isConnected ? (
            <Card size="lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCodeIcon className="w-5 h-5 text-tiba-primary-600" />
                  ربط حساب WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-tiba-primary-200 bg-tiba-primary-50 p-4">
                    <h4 className="text-sm font-semibold text-tiba-primary-800 mb-3 flex items-center gap-2">
                      <QrCodeIcon className="w-4 h-4" />
                      الربط عبر QR Code
                    </h4>
                    {qrCode ? (
                      <div className="text-center space-y-3">
                        <div className="bg-white p-3 rounded-lg border border-tiba-gray-200 inline-block">
                          <img src={qrCode} alt="WhatsApp QR Code" className="w-44 h-44 mx-auto rounded-lg" />
                        </div>
                        <ol className="text-tiba-primary-700 space-y-2 text-xs text-right">
                          <li>1. افتح WhatsApp على هاتفك</li>
                          <li>2. الأجهزة المربوطة ← ربط جهاز</li>
                          <li>3. امسح رمز QR الظاهر</li>
                        </ol>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-14 h-14 rounded-full bg-white mx-auto mb-2 flex items-center justify-center border border-tiba-gray-200">
                          <SignalSlashIcon className="w-7 h-7 text-tiba-gray-400" />
                        </div>
                        <p className="text-xs text-tiba-gray-600 mb-3">اضغط لإنشاء رمز QR للربط</p>
                        <Button
                          onClick={handleGenerateQR}
                          disabled={loading}
                          className="bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white"
                        >
                          {loading ? <ArrowPathIcon className="w-4 h-4 ml-1 animate-spin" /> : <QrCodeIcon className="w-4 h-4 ml-1" />}
                          إنشاء QR Code
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-tiba-secondary-200 bg-tiba-secondary-50 p-4">
                    <h4 className="text-sm font-semibold text-tiba-secondary-800 mb-3 flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4" />
                      طلب الربط بواتساب عن بعد
                    </h4>
                    <p className="text-xs text-tiba-secondary-700 mb-3">
                      كود الدولة الافتراضي هو مصر (2). اكتب باقي الرقم ثم اضغط طلب الربط.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-md border border-tiba-secondary-300 bg-tiba-secondary-100 px-3 text-sm font-semibold text-tiba-secondary-800">
                          2
                        </span>
                        <Input
                          type="tel"
                          inputMode="numeric"
                          placeholder="مثال: 01012345678"
                          value={pairingPhoneLocalPart}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, '');
                            const normalized = digitsOnly.startsWith('2') ? digitsOnly.slice(1) : digitsOnly;
                            setPairingPhoneLocalPart(normalized);
                          }}
                          disabled={loading}
                          className="bg-white"
                        />
                      </div>
                      <p className="text-[11px] text-tiba-gray-600">
                        سيتم الإرسال بهذا الرقم: {pairingPhone}
                      </p>
                      <Button
                        onClick={handleGeneratePairingCode}
                        disabled={loading || !pairingPhoneLocalPart.trim()}
                        className="w-full bg-tiba-secondary-600 hover:bg-tiba-secondary-700 text-white"
                      >
                        {loading ? <ArrowPathIcon className="w-4 h-4 ml-1 animate-spin" /> : <PhoneIcon className="w-4 h-4 ml-1" />}
                        طلب الربط بواتساب عن بعد
                      </Button>
                    </div>

                    {pairingCode && (
                      <div className="mt-4 bg-white border border-tiba-secondary-200 rounded-lg p-3 text-center">
                        <p className="text-xs text-tiba-secondary-600 mb-1">كود الربط عن بعد</p>
                        <p className="font-mono text-xl font-bold tracking-widest text-tiba-secondary-800">{pairingCode}</p>
                        <p className="text-xs text-tiba-gray-600 mt-2">
                          {pairingCodeExpiresIn
                            ? `صالح لمدة تقريبية ${Math.max(1, Math.ceil(pairingCodeExpiresIn / 60))} دقيقة`
                            : 'صالح لبضع دقائق حسب واتساب'}
                        </p>
                        <ol className="text-xs text-tiba-gray-600 mt-3 space-y-1 text-right">
                          <li>1. افتح WhatsApp على هاتفك</li>
                          <li>2. الأجهزة المربوطة ← الربط برقم الهاتف</li>
                          <li>3. أدخل الكود أعلاه لإكمال الربط</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-tiba-gray-500 mt-3 text-center">
                  اختر طريقة واحدة فقط للربط: QR Code أو طلب الربط بواتساب عن بعد.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card variant="secondary" size="lg">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-tiba-secondary-100 mx-auto mb-3 flex items-center justify-center">
                  <CheckCircleIcon className="w-7 h-7 text-tiba-secondary-600" />
                </div>
                <h4 className="text-base font-semibold text-tiba-secondary-800 mb-1">WhatsApp متصل بنجاح!</h4>
                <p className="text-sm text-tiba-secondary-600 mb-4">النظام جاهز لإرسال الرسائل التلقائية</p>
                <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                  <div className="bg-white/60 p-3 rounded-lg border border-tiba-secondary-200 text-center">
                    <UsersIcon className="w-5 h-5 text-tiba-secondary-600 mx-auto mb-1" />
                    <p className="text-xs font-medium text-tiba-secondary-800">رسائل ترحيب</p>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg border border-tiba-secondary-200 text-center">
                    <CurrencyDollarIcon className="w-5 h-5 text-tiba-secondary-600 mx-auto mb-1" />
                    <p className="text-xs font-medium text-tiba-secondary-800">إيصالات PDF</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Test Message */}
          {status.isReady && status.isConnected && (
            <Card size="lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PaperAirplaneIcon className="w-5 h-5 text-tiba-primary-600" />
                  اختبار إرسال الرسائل
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-tiba-gray-700 mb-1">رقم الهاتف</label>
                    <Input
                      type="tel"
                      placeholder="ادخل رقم الهاتف"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-tiba-gray-700 mb-1">محتوى الرسالة</label>
                    <Input
                      placeholder="اكتب رسالتك التجريبية..."
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSendTestMessage}
                  disabled={loading || !testPhone || !testMessage}
                  className="bg-tiba-primary-600 hover:bg-tiba-primary-700 text-white"
                >
                  {loading ? <ArrowPathIcon className="w-4 h-4 ml-1 animate-spin" /> : <PaperAirplaneIcon className="w-4 h-4 ml-1" />}
                  إرسال رسالة تجريبية
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card size="md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Cog6ToothIcon className="w-4 h-4 text-tiba-primary-600" />
                إدارة سريعة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center gap-3 p-2.5 bg-tiba-secondary-50 rounded-lg border border-tiba-secondary-200 hover:bg-tiba-secondary-100 transition-colors text-right"
              >
                <div className="w-8 h-8 rounded-lg bg-tiba-secondary-100 flex items-center justify-center shrink-0">
                  <ArrowPathIcon className="w-4 h-4 text-tiba-secondary-700" />
                </div>
                <span className="text-xs font-medium text-tiba-secondary-800">تحديث البيانات</span>
              </button>
            </CardContent>
          </Card>

          <Card size="md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BoltIcon className="w-4 h-4 text-tiba-gray-600" />
                المواصفات التقنية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="p-2.5 bg-tiba-primary-50 rounded-lg border border-tiba-primary-200">
                <div className="flex items-center gap-2 mb-0.5">
                  <BoltIcon className="w-3.5 h-3.5 text-tiba-primary-600" />
                  <span className="text-xs font-semibold text-tiba-primary-800">تقنية Baileys</span>
                </div>
                <p className="text-xs text-tiba-primary-600">اتصال مباشر بـ WhatsApp</p>
              </div>
              <div className="p-2.5 bg-tiba-secondary-50 rounded-lg border border-tiba-secondary-200">
                <div className="flex items-center gap-2 mb-0.5">
                  <ClockIcon className="w-3.5 h-3.5 text-tiba-secondary-600" />
                  <span className="text-xs font-semibold text-tiba-secondary-800">WebSocket</span>
                </div>
                <p className="text-xs text-tiba-secondary-600">إرسال فوري وسريع</p>
              </div>
              <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-0.5">
                  <ExclamationTriangleIcon className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-800">التشفير الآمن</span>
                </div>
                <p className="text-xs text-purple-600">end-to-end encryption</p>
              </div>
            </CardContent>
          </Card>
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
