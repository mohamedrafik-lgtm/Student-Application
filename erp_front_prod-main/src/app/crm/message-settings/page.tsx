'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '../../../hooks/usePermissions';
import { useRouter } from 'next/navigation';
import { FiSettings, FiCheck, FiLoader } from 'react-icons/fi';
import { HiOutlineNoSymbol } from 'react-icons/hi2';
import { TbArrowsShuffle } from 'react-icons/tb';
import { BiFirstPage } from 'react-icons/bi';
import { getCrmInboxSettings, updateCrmInboxSettings } from '../../lib/api/crm-inbox';

type DistributionMode = 'disabled' | 'round_robin' | 'first_claim';

const modes: { value: DistributionMode; title: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'disabled',
    title: 'معطّل',
    description: 'لا يتم توزيع المحادثات تلقائياً. جميع الرسائل تظهر لجميع الموظفين بدون تخصيص.',
    icon: <HiOutlineNoSymbol className="w-8 h-8" />,
    color: 'from-gray-500 to-gray-600',
  },
  {
    value: 'round_robin',
    title: 'توزيع بالتناوب',
    description: 'يتم تخصيص كل محادثة جديدة لموظف بالتناوب تلقائياً. المحادثة المخصصة تظهر فقط للموظف المعيّن.',
    icon: <TbArrowsShuffle className="w-8 h-8" />,
    color: 'from-blue-500 to-blue-600',
  },
  {
    value: 'first_claim',
    title: 'أول من يحجز',
    description: 'جميع المحادثات تظهر للجميع. أول موظف يرد أو يحجز المحادثة تصبح مخصصة له وتختفي من الآخرين.',
    icon: <BiFirstPage className="w-8 h-8" />,
    color: 'from-emerald-500 to-emerald-600',
  },
];

export default function MessageSettingsPage() {
  const { userPermissions, loading: permLoading } = usePermissions();
  const router = useRouter();

  const [currentMode, setCurrentMode] = useState<DistributionMode>('disabled');
  const [selectedMode, setSelectedMode] = useState<DistributionMode>('disabled');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!permLoading && !userPermissions?.hasPermission('crm.messages', 'view')) {
      router.replace('/crm');
    }
  }, [permLoading, userPermissions, router]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await getCrmInboxSettings();
      setCurrentMode(settings.distributionMode);
      setSelectedMode(settings.distributionMode);
    } catch {
      // لا يوجد إعدادات بعد
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userPermissions?.hasPermission('crm.messages', 'manage')) return;
    try {
      setSaving(true);
      await updateCrmInboxSettings(selectedMode);
      setCurrentMode(selectedMode);
      setSuccessMsg('تم حفظ الإعدادات بنجاح');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      // خطأ
    } finally {
      setSaving(false);
    }
  };

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FiLoader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const canManage = userPermissions?.hasPermission('crm.messages', 'manage');
  const hasChanges = selectedMode !== currentMode;

  return (
    <div className="h-full overflow-y-auto">
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8" dir="rtl">
      {/* العنوان */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
          <FiSettings className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تنظيم الرسائل</h1>
          <p className="text-gray-500 text-sm mt-1">اختر كيفية توزيع المحادثات الواردة على الموظفين</p>
        </div>
      </div>

      {/* رسالة النجاح */}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700">
          <FiCheck className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* بطاقات الأوضاع */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => canManage && setSelectedMode(mode.value)}
            disabled={!canManage}
            className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-right ${
              selectedMode === mode.value
                ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
            } ${!canManage ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {/* مؤشر الاختيار */}
            {selectedMode === mode.value && (
              <div className="absolute top-4 left-4 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <FiCheck className="w-4 h-4 text-white" />
              </div>
            )}

            {/* الأيقونة */}
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center text-white mb-4`}>
              {mode.icon}
            </div>

            {/* العنوان */}
            <h3 className={`text-lg font-bold mb-2 ${
              selectedMode === mode.value ? 'text-blue-700' : 'text-gray-900'
            }`}>
              {mode.title}
            </h3>

            {/* الوصف */}
            <p className="text-sm text-gray-500 leading-relaxed">
              {mode.description}
            </p>

            {/* شارة الوضع الحالي */}
            {currentMode === mode.value && (
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                الوضع الحالي
              </div>
            )}
          </button>
        ))}
      </div>

      {/* زر الحفظ */}
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
              hasChanges && !saving
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 hover:shadow-xl'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <FiLoader className="w-5 h-5 animate-spin" />
            ) : (
              <FiCheck className="w-5 h-5" />
            )}
            <span>حفظ التغييرات</span>
          </button>
        </div>
      )}

      {/* ملاحظة */}
      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-amber-800 text-sm leading-relaxed">
          <strong>ملاحظة:</strong> تغيير وضع التوزيع يؤثر فقط على المحادثات الجديدة. المحادثات المحجوزة حالياً لن تتأثر بالتغيير.
        </p>
      </div>
    </div>
    </div>
  );
}
