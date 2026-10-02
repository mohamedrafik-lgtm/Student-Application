'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  LockClosedIcon,
  DocumentTextIcon,
  CalendarIcon,
  AcademicCapIcon,
  HeartIcon,
  DocumentDuplicateIcon,
  BanknotesIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';
import { API_BASE_URL } from '@/lib/api';

const REQUEST_TYPE_LABELS = {
  EXAM_POSTPONE: { label: 'تأجيل اختبار', icon: CalendarIcon, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', href: '/trainee-dashboard/requests/exam-postpone' },
  SICK_LEAVE: { label: 'إجازة مرضية', icon: HeartIcon, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', href: '/trainee-dashboard/requests/sick-leave' },
  ENROLLMENT_PROOF: { label: 'إثبات قيد', icon: AcademicCapIcon, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', href: '/trainee-dashboard/requests/enrollment' },
  CERTIFICATE: { label: 'إفادة', icon: DocumentDuplicateIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', href: '/trainee-dashboard/requests/certificate' },
  MINISTRY_EXAM_DECLARATION: { label: 'إقرار دخول اختبار وزارة العمل', icon: DocumentTextIcon, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100', href: '/trainee-dashboard/requests/ministry-exam-declaration' },
};

const BLOCKED_WHEN_PENDING_TYPES = new Set([
  'EXAM_POSTPONE',
  'SICK_LEAVE',
  'ENROLLMENT_PROOF',
  'CERTIFICATE',
]);

export default function TraineeRequestsPage() {
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [generalRequests, setGeneralRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'payment'>('general');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const token = localStorage.getItem('trainee_token');
      
      // جلب طلبات تأجيل السداد
      const paymentRes = await fetch(`${API_BASE_URL}/deferral-requests/my-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const paymentData = await paymentRes.json();
      setPaymentRequests(paymentData || []);

      // جلب الطلبات العامة
      const generalRes = await fetch(`${API_BASE_URL}/trainee-requests/my-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const generalData = await generalRes.json();
      setGeneralRequests(generalData || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      PENDING: {
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        card: 'border-amber-200',
        icon: ClockIcon,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        label: 'قيد المراجعة',
      },
      APPROVED: {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        card: 'border-emerald-200',
        icon: CheckCircleIcon,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        label: 'تم القبول',
      },
      REJECTED: {
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        card: 'border-rose-200',
        icon: XCircleIcon,
        iconBg: 'bg-rose-100',
        iconColor: 'text-rose-600',
        label: 'تم الرفض',
      },
    };
    return configs[status as keyof typeof configs] || configs.PENDING;
  };

  const pendingGeneralRequestTypes = new Set(
    generalRequests
      .filter((request) => request.status === 'PENDING')
      .map((request) => request.type)
  );

  const lockedRequestTypeLabels = Array.from(BLOCKED_WHEN_PENDING_TYPES)
    .filter((type) => pendingGeneralRequestTypes.has(type))
    .map((type) => REQUEST_TYPE_LABELS[type as keyof typeof REQUEST_TYPE_LABELS]?.label || 'طلب سابق');

  const hasLockedRequestTypes = lockedRequestTypeLabels.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">جاري تحميل طلباتك...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <InboxIcon className="w-8 h-8 text-emerald-600" />
              طلباتي
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              إدارة ومتابعة جميع طلباتك الأكاديمية والمالية في مكان واحد.
            </p>
          </div>
          
          {/* Tabs */}
          <div className="flex p-1 bg-slate-100/80 backdrop-blur-sm rounded-xl border border-slate-200/60 w-fit">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'general'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <DocumentTextIcon className="w-4 h-4" />
              الطلبات العامة ({generalRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'payment'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <BanknotesIcon className="w-4 h-4" />
              تأجيل السداد ({paymentRequests.length})
            </button>
          </div>
        </div>
      </div>

      {/* General Requests Tab */}
      {activeTab === 'general' && (
        <div className="space-y-8">
          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <PlusIcon className="w-5 h-5 text-slate-500" />
              تقديم طلب جديد
            </h2>

            {hasLockedRequestTypes && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                  <LockClosedIcon className="w-4 h-4" />
                  لا يمكنك تكرار نفس نوع الطلب الآن
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  الأنواع المقفلة حالياً: {lockedRequestTypeLabels.join(' - ')}. يمكنك تقديم الأنواع الأخرى بشكل طبيعي.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.entries(REQUEST_TYPE_LABELS).map(([key, value]) => {
                const Icon = value.icon;
                const isLocked = BLOCKED_WHEN_PENDING_TYPES.has(key) && pendingGeneralRequestTypes.has(key);

                if (isLocked) {
                  return (
                    <div
                      key={key}
                      className="bg-slate-50 rounded-xl p-5 border border-slate-200 opacity-70 cursor-not-allowed flex flex-col items-center text-center"
                    >
                      <div className={`w-14 h-14 rounded-2xl ${value.bg} ${value.border} border flex items-center justify-center mb-4`}>
                        <Icon className={`w-7 h-7 ${value.color}`} />
                      </div>
                      <h3 className="font-bold text-slate-800 mb-1">{value.label}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <LockClosedIcon className="w-3 h-3" />
                        بانتظار الرد على طلب من نفس النوع
                      </p>
                    </div>
                  );
                }

                return (
                  <Link
                    key={key}
                    href={value.href}
                    className="bg-white rounded-xl p-5 border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all group flex flex-col items-center text-center"
                  >
                    <div className={`w-14 h-14 rounded-2xl ${value.bg} ${value.border} border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-7 h-7 ${value.color}`} />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">
                      {value.label}
                    </h3>
                    <p className="text-xs text-slate-500">انقر لتقديم الطلب</p>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Requests List */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-slate-500" />
              سجل الطلبات العامة
            </h2>
            
            {generalRequests.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <DocumentTextIcon className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">لا توجد طلبات</h3>
                <p className="text-slate-500 text-sm">لم تقم بتقديم أي طلبات عامة حتى الآن.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {generalRequests.map((request) => {
                  const typeInfo = REQUEST_TYPE_LABELS[request.type as keyof typeof REQUEST_TYPE_LABELS] || { label: 'طلب غير معروف', icon: DocumentTextIcon, color: 'text-slate-600', bg: 'bg-slate-50' };
                  const TypeIcon = typeInfo.icon;
                  const config = getStatusConfig(request.status);
                  const StatusIcon = config.icon;

                  return (
                    <div key={request.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                            <TypeIcon className={`w-6 h-6 ${typeInfo.color}`} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-lg">{typeInfo.label}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                              <CalendarIcon className="w-4 h-4" />
                              {new Date(request.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border ${config.badge}`}>
                            <StatusIcon className="w-4 h-4" />
                            {config.label}
                          </span>
                        </div>
                      </div>

                      {request.adminResponse && (
                        <div className="px-5 py-4 sm:px-6 bg-slate-50 border-t border-slate-100">
                          <p className="text-xs font-bold text-slate-700 mb-1.5">رد الإدارة:</p>
                          <p className="text-sm text-slate-600 leading-relaxed">{request.adminResponse}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Deferral Tab */}
      {activeTab === 'payment' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Link
              href="/trainee-dashboard/requests/new"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 font-bold shadow-sm transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              طلب تأجيل سداد جديد
            </Link>
          </div>

          {/* Requests Grid */}
          {paymentRequests.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <BanknotesIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">لا توجد طلبات تأجيل</h3>
              <p className="text-slate-500 text-sm mb-6">لم تقم بإنشاء أي طلبات لتأجيل السداد حتى الآن.</p>
              <Link
                href="/trainee-dashboard/requests/new"
                className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-5 py-2.5 rounded-xl hover:bg-emerald-100 font-bold transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                إنشاء طلب جديد
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {paymentRequests.map((request) => {
                const config = getStatusConfig(request.status);
                const StatusIcon = config.icon;

                return (
                  <div key={request.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                    
                    {/* Header */}
                    <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0 mt-1`}>
                          <StatusIcon className={`w-6 h-6 ${config.iconColor}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg mb-1">{request.fee.name}</h3>
                          <p className="text-sm text-slate-600 font-medium">
                            طلب تأجيل لمدة <span className="text-emerald-600 font-bold">{request.requestedExtensionDays} يوم</span>
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                            <ClockIcon className="w-4 h-4" />
                            تاريخ الطلب: {new Date(request.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border ${config.badge}`}>
                          <StatusIcon className="w-4 h-4" />
                          {config.label}
                        </span>
                        {request.status === 'APPROVED' && request.createdExceptionId && (
                          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md font-bold">
                            تم إنشاء الاستثناء
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="p-5 sm:p-6 bg-slate-50/50">
                      <p className="text-xs font-bold text-slate-700 mb-2">سبب طلب التأجيل:</p>
                      <p className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-lg border border-slate-200">
                        {request.reason}
                      </p>
                    </div>

                    {/* Admin Response */}
                    {request.adminResponse && (
                      <div className={`p-5 sm:p-6 border-t ${
                        request.status === 'APPROVED' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'
                      }`}>
                        <p className={`text-xs font-bold mb-2 ${
                          request.status === 'APPROVED' ? 'text-emerald-800' : 'text-rose-800'
                        }`}>
                          رد الإدارة:
                        </p>
                        <p className={`text-sm leading-relaxed ${
                          request.status === 'APPROVED' ? 'text-emerald-900' : 'text-rose-900'
                        }`}>
                          {request.adminResponse}
                        </p>
                        {request.reviewer && (
                          <div className={`mt-3 pt-3 border-t flex items-center gap-2 text-xs font-medium ${
                            request.status === 'APPROVED' ? 'border-emerald-200/60 text-emerald-700' : 'border-rose-200/60 text-rose-700'
                          }`}>
                            <span>المراجع: {request.reviewer.name}</span>
                            <span>•</span>
                            <span>{new Date(request.reviewedAt).toLocaleDateString('ar-EG')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}