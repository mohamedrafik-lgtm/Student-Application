'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Server, Cloud, MessageSquare, Cpu, HardDrive, Clock, Activity, CheckCircle2, XCircle, Shield } from 'lucide-react';
import { getSystemHealth, SystemHealthResponse } from '@/lib/system-health-api';
import { toast } from 'sonner';

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setRefreshing(true);
      }
      const data = await getSystemHealth();
      setHealth(data);
      if (showRefreshToast) {
        toast.success('تم تحديث حالة النظام');
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
      toast.error('فشل في جلب حالة النظام');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // تحديث تلقائي كل 30 ثانية
    const interval = setInterval(() => fetchHealth(), 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days} يوم، ${hours} ساعة`;
    } else if (hours > 0) {
      return `${hours} ساعة، ${minutes} دقيقة`;
    } else {
      return `${minutes} دقيقة`;
    }
  };

  const getStatusBadge = (connected: boolean, label: string = 'متصل') => {
    return connected ? (
      <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-sm">
        <CheckCircle2 className="w-3 h-3 ml-1" />
        {label}
      </Badge>
    ) : (
      <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-sm">
        <XCircle className="w-3 h-3 ml-1" />
        غير متصل
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">جاري تحميل حالة النظام...</p>
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">فشل في تحميل حالة النظام</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 -m-6 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
                <Activity className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  حالة النظام
                </h1>
                <p className="text-slate-600 mt-1">
                  معلومات فنية عن حالة النظام والخدمات المتصلة
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {health.healthy ? (
                <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white text-base px-6 py-2.5 shadow-lg shadow-green-500/30 border-0">
                  <CheckCircle2 className="w-5 h-5 ml-2" />
                  النظام يعمل بشكل طبيعي
                </Badge>
              ) : (
                <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white text-base px-6 py-2.5 shadow-lg shadow-red-500/30 border-0">
                  <XCircle className="w-5 h-5 ml-2" />
                  هناك مشاكل في النظام
                </Badge>
              )}
              <Button
                onClick={() => fetchHealth(true)}
                disabled={refreshing}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/30"
              >
                <RefreshCw className={`h-4 w-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>
          </div>

          {/* آخر تحديث */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              <span>آخر تحديث: {new Date(health.timestamp).toLocaleString('ar-EG')}</span>
            </div>
          </div>
        </div>

        {/* الحماية */}
        <div className="mb-6">
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            <CardContent className="p-8 relative z-10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-5">
                  <div className="bg-white/20 backdrop-blur-sm p-5 rounded-2xl shadow-2xl border border-white/30">
                    <Shield className="h-12 w-12 text-white drop-shadow-lg" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold mb-2 text-white drop-shadow-md">محمي بواسطة Cloudflare</h3>
                    <p className="text-white/90 text-base font-medium">
                      🛡️ حماية متقدمة على مدار الساعة ضد جميع أنواع التهديدات الإلكترونية والهجمات السيبرانية
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <Badge className="bg-green-500/90 backdrop-blur-sm text-white border-0 shadow-xl px-5 py-2.5 text-base font-bold">
                    <CheckCircle2 className="w-5 h-5 ml-2" />
                    نشط ومفعّل
                  </Badge>
                  <div className="flex items-center gap-2 text-sm text-white/95 font-medium bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                    <div className="w-2.5 h-2.5 bg-green-300 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    <span>الحماية الكاملة تعمل الآن</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/25 hover:bg-white/20 transition-all shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-base font-bold text-white">حماية من هجمات DDoS</span>
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed font-medium">
                    حماية تلقائية من الهجمات الموزعة والبوتات الضارة مع قدرة استيعاب غير محدودة
                  </p>
                </div>
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/25 hover:bg-white/20 transition-all shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-base font-bold text-white">جدار حماية WAF</span>
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed font-medium">
                    جدار حماية متقدم يمنع الثغرات الأمنية وحقن SQL والبرمجيات الخبيثة
                  </p>
                </div>
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/25 hover:bg-white/20 transition-all shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-base font-bold text-white">تشفير SSL/TLS</span>
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed font-medium">
                    تشفير شامل لجميع البيانات المتبادلة مع شهادات أمان محدثة تلقائياً
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* الخدمات */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* قاعدة البيانات */}
          <Card className="border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 rounded-xl shadow-md">
                    <Database className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-800">قاعدة البيانات</CardTitle>
                    <CardDescription className="text-slate-600">{health.database.type}</CardDescription>
                  </div>
                </div>
                {getStatusBadge(health.database.connected)}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">وقت الاستجابة</span>
                  <span className="text-sm font-bold text-blue-600">{health.database.responseTime}ms</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Redis */}
          <Card className="border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-br from-red-50 to-orange-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-red-500 to-red-600 p-2.5 rounded-xl shadow-md">
                    <Server className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-800">Redis</CardTitle>
                    <CardDescription className="text-slate-600">طابور الرسائل والذاكرة المؤقتة</CardDescription>
                  </div>
                </div>
                {getStatusBadge(health.redis.connected)}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {health.redis.connected ? (
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">وقت الاستجابة</span>
                    <span className="text-sm font-bold text-red-600">{health.redis.responseTime}ms</span>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{health.redis.error}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cloudinary */}
          <Card className="border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-br from-purple-50 to-pink-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-2.5 rounded-xl shadow-md">
                    <Cloud className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-800">Cloudinary</CardTitle>
                    <CardDescription className="text-slate-600">خدمة تخزين الصور والملفات</CardDescription>
                  </div>
                </div>
                {getStatusBadge(health.cloudinary.connected)}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {health.cloudinary.connected ? (
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">اسم الحساب</span>
                    <span className="text-sm font-bold text-purple-600">{health.cloudinary.cloudName}</span>
                  </div>
                ) : (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-700">{health.cloudinary.error}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp */}
          <Card className="border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-br from-green-50 to-emerald-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 p-2.5 rounded-xl shadow-md">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-800">WhatsApp</CardTitle>
                    <CardDescription className="text-slate-600">خدمة إرسال الرسائل</CardDescription>
                  </div>
                </div>
                {getStatusBadge(health.whatsapp.connected && health.whatsapp.ready, 'متصل وجاهز')}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">الحالة</span>
                  <span className={`text-sm font-bold ${health.whatsapp.ready ? 'text-green-600' : 'text-orange-600'}`}>
                    {health.whatsapp.ready ? 'جاهز للإرسال' : 'غير جاهز'}
                  </span>
                </div>
                {health.whatsapp.phoneNumber && (
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">رقم الهاتف</span>
                    <span className="text-sm font-bold text-green-600" dir="ltr">{health.whatsapp.phoneNumber}</span>
                  </div>
                )}
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">نوع التخزين</span>
                  <span className="text-sm font-bold text-green-600">
                    {health.whatsapp.storageType === 'database' ? '🗄️ قاعدة البيانات' : '📁 ملفات'}
                  </span>
                </div>
                {health.whatsapp.sessionsCount !== undefined && (
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">عدد الجلسات</span>
                    <span className="text-sm font-bold text-green-600">{health.whatsapp.sessionsCount}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* موارد النظام */}
        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="bg-gradient-to-br from-orange-50 to-amber-50 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-2.5 rounded-xl shadow-md">
                <Cpu className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-slate-800 text-xl">موارد الخادم</CardTitle>
                <CardDescription className="text-slate-600">استخدام موارد الخادم والنظام</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* RAM */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-sm text-blue-700 font-medium mb-3">
                  <HardDrive className="h-4 w-4" />
                  <span>استخدام الذاكرة (RAM)</span>
                </div>
                <div className="text-3xl font-bold text-blue-600 mb-2">{health.resources.memoryUsagePercent}%</div>
                <div className="text-sm text-blue-600 mb-3 font-medium">
                  {health.resources.memoryUsedMB} / {health.resources.memoryTotalMB} MB
                </div>
                <div className="w-full bg-blue-100 rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      health.resources.memoryUsagePercent > 80
                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                        : health.resources.memoryUsagePercent > 60
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                        : 'bg-gradient-to-r from-green-500 to-emerald-500'
                    }`}
                    style={{ width: `${health.resources.memoryUsagePercent}%` }}
                  />
                </div>
              </div>

              {/* CPU */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-sm text-purple-700 font-medium mb-3">
                  <Cpu className="h-4 w-4" />
                  <span>استخدام المعالج (CPU)</span>
                </div>
                <div className="text-3xl font-bold text-purple-600 mb-2">{health.resources.cpuUsagePercent}%</div>
                <div className="text-sm text-purple-600 mb-3 font-medium truncate" title={health.resources.platform}>
                  {health.resources.platform}
                </div>
                <div className="w-full bg-purple-100 rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      health.resources.cpuUsagePercent > 80
                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                        : health.resources.cpuUsagePercent > 60
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                        : 'bg-gradient-to-r from-green-500 to-emerald-500'
                    }`}
                    style={{ width: `${health.resources.cpuUsagePercent}%` }}
                  />
                </div>
              </div>

              {/* Uptime */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-sm text-green-700 font-medium mb-3">
                  <Clock className="h-4 w-4" />
                  <span>مدة التشغيل</span>
                </div>
                <div className="text-2xl font-bold text-green-600 mb-2 leading-tight">
                  {formatUptime(health.resources.uptimeSeconds)}
                </div>
                <div className="text-sm text-green-600 font-medium">
                  منذ آخر إعادة تشغيل
                </div>
              </div>

              {/* Node Version */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-5 rounded-xl border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-sm text-orange-700 font-medium mb-3">
                  <Server className="h-4 w-4" />
                  <span>إصدار Node.js</span>
                </div>
                <div className="text-2xl font-bold text-orange-600 mb-2" dir="ltr">{health.resources.nodeVersion}</div>
                <div className="text-sm text-orange-600 font-medium">
                  البيئة: {process.env.NODE_ENV || 'development'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

