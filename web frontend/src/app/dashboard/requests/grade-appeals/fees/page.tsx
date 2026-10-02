'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchAPI } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Program {
  id: number;
  nameAr: string;
}

interface Fee {
  id: number;
  name: string;
  amount: number;
  type: string;
  programId: number;
  program: { id: number; nameAr: string };
}

interface FeeConfig {
  id: string;
  programId: number;
  feeId: number;
  program: { id: number; nameAr: string };
  fee: { id: number; name: string; amount: number; type: string };
}

export default function AppealFeesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [configs, setConfigs] = useState<FeeConfig[]>([]);
  const [selectedFees, setSelectedFees] = useState<Record<number, number | ''>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [programsRes, feesRes, configsRes] = await Promise.all([
        fetchAPI('/grade-appeals/fee-config/programs'),
        fetchAPI('/grade-appeals/fee-config/fees'),
        fetchAPI('/grade-appeals/fee-config/all'),
      ]);
      setPrograms(programsRes);
      setFees(feesRes);
      setConfigs(configsRes);

      // تعبئة الاختيارات الحالية
      const currentSelections: Record<number, number | ''> = {};
      programsRes.forEach((p: Program) => {
        const existing = configsRes.find((c: FeeConfig) => c.programId === p.id);
        currentSelections[p.id] = existing ? existing.feeId : '';
      });
      setSelectedFees(currentSelections);
    } catch (err: any) {
      setErrorMsg('فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg('');
    setTimeout(() => setErrorMsg(''), 5000);
  };

  const handleSave = async (programId: number) => {
    const feeId = selectedFees[programId];
    if (!feeId) return;

    try {
      setSaving(programId);
      await fetchAPI(`/grade-appeals/fee-config/${programId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeId: Number(feeId) }),
      });
      showSuccess('تم حفظ إعدادات الرسوم بنجاح');
      loadData();
    } catch (err: any) {
      showError(err.message || 'فشل في حفظ الإعدادات');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (programId: number) => {
    if (!confirm('هل أنت متأكد من حذف إعدادات رسوم التظلم لهذا البرنامج؟')) return;

    try {
      setDeleting(programId);
      await fetchAPI(`/grade-appeals/fee-config/${programId}`, {
        method: 'DELETE',
      });
      setSelectedFees(prev => ({ ...prev, [programId]: '' }));
      showSuccess('تم حذف الإعدادات بنجاح');
      loadData();
    } catch (err: any) {
      showError(err.message || 'فشل في حذف الإعدادات');
    } finally {
      setDeleting(null);
    }
  };

  const getConfigForProgram = (programId: number) => {
    return configs.find(c => c.programId === programId);
  };

  const getFeeTypeLabel = (type: string) => {
    switch (type) {
      case 'TUITION': return 'دراسية';
      case 'SERVICES': return 'خدمات';
      case 'TRAINING': return 'تدريب';
      case 'ADDITIONAL': return 'إضافية';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-tiba-primary-200 border-t-tiba-primary-600 mx-auto mb-3"></div>
          <p className="text-sm text-slate-500">جاري تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Tiba Gradient Header */}
      <div className="bg-gradient-to-l from-tiba-primary-600 via-tiba-primary-500 to-indigo-500 rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/20" />
          <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">رسوم التظلمات</h1>
              <p className="text-white/70 text-sm mt-0.5">إعداد القيد المالي الذي يُطبق عند رفض التظلم لكل برنامج</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <p className="text-xs text-white/80 leading-relaxed">
              📌 عند رفض تظلم متدرب، يتم تطبيق رسوم القيد المالي المحدد هنا على كل مادة مرفوضة.
              مثال: 50 جنيه × 3 مواد مرفوضة = <span className="font-bold">150 جنيه</span>
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          {errorMsg}
        </div>
      )}

      {/* Programs List */}
      <div className="space-y-3">
        {programs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p className="text-sm text-slate-500">لا توجد برامج تدريبية</p>
          </div>
        ) : (
          programs.map((program) => {
            const config = getConfigForProgram(program.id);
            const programFees = fees.filter(f => f.programId === program.id);
            const currentSelection = selectedFees[program.id];
            const hasChanged = config
              ? currentSelection !== config.feeId
              : currentSelection !== '' && currentSelection !== undefined;

            return (
              <div
                key={program.id}
                className={`bg-white rounded-2xl shadow-sm overflow-hidden border transition-colors ${
                  config ? 'border-emerald-200' : 'border-slate-200'
                }`}
              >
                {/* Program Header */}
                <div className={`px-5 py-3.5 flex items-center justify-between border-b ${
                  config ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      config ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}>
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">{program.nameAr}</h3>
                      <p className="text-[11px] text-slate-400">
                        {programFees.length} قيد مالي متاح
                      </p>
                    </div>
                  </div>

                  {config && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      مُعد
                    </span>
                  )}
                </div>

                {/* Fee Selection */}
                <div className="p-4">
                  {programFees.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-3">لا توجد قيود مالية لهذا البرنامج. يرجى إنشاء قيد مالي أولاً من صفحة الرسوم.</p>
                  ) : (
                    <>
                      <label className="text-xs font-semibold text-slate-500 mb-2 block">اختر القيد المالي لرسوم التظلم:</label>
                      <Select
                        value={currentSelection ? String(currentSelection) : ''}
                        onValueChange={(value) => {
                          setSelectedFees(prev => ({
                            ...prev,
                            [program.id]: value ? Number(value) : '',
                          }));
                        }}
                      >
                        <SelectTrigger className="w-full h-11 border-slate-200 rounded-xl bg-slate-50/50 focus:border-tiba-primary-300 focus:ring-tiba-primary-100">
                          <SelectValue placeholder="-- اختر القيد المالي --" />
                        </SelectTrigger>
                        <SelectContent>
                          {programFees.map((fee) => (
                            <SelectItem key={fee.id} value={String(fee.id)}>
                              {fee.name} - {fee.amount} جنيه ({getFeeTypeLabel(fee.type)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {config && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs text-amber-800">
                            <span className="font-bold">القيد الحالي:</span> {config.fee.name} - <span className="font-bold">{config.fee.amount} جنيه</span> لكل مادة مرفوضة
                          </p>
                        </div>
                      )}

                      {/* Buttons */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleSave(program.id)}
                          disabled={!currentSelection || saving === program.id || !hasChanged}
                          className={`flex-1 px-4 py-2 font-semibold rounded-xl text-xs transition-colors ${
                            !currentSelection || saving === program.id || !hasChanged
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-tiba-primary-600 to-indigo-600 hover:from-tiba-primary-700 hover:to-indigo-700 text-white shadow-md'
                          }`}
                        >
                          {saving === program.id ? 'جاري الحفظ...' : 'حفظ'}
                        </button>

                        {config && (
                          <button
                            onClick={() => handleDelete(program.id)}
                            disabled={deleting === program.id}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold rounded-xl text-xs transition-colors"
                          >
                            {deleting === program.id ? 'جاري الحذف...' : 'حذف'}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
