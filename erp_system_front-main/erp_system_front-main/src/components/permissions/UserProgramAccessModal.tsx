'use client';

import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaSave, FaBook, FaGlobeAmericas, FaCheckCircle } from 'react-icons/fa';
import { fetchAPI } from '../../lib/api';
import toast from 'react-hot-toast';

interface TrainingProgram {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface UserProgramAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
}

export const UserProgramAccessModal: React.FC<UserProgramAccessModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
}) => {
  const [allPrograms, setAllPrograms] = useState<TrainingProgram[]>([]);
  const [selectedProgramIds, setSelectedProgramIds] = useState<number[]>([]);
  const [accessMode, setAccessMode] = useState<'all' | 'specific'>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadData();
    }
  }, [isOpen, user?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      // جلب جميع البرامج والبرامج المسموحة للمستخدم بالتوازي
      const [programsRes, allowedRes] = await Promise.all([
        fetchAPI('/programs'),
        fetchAPI(`/users/${user.id}/allowed-programs`),
      ]);

      // البرامج قد تأتي كمصفوفة مباشرة أو داخل حقل
      const programs = Array.isArray(programsRes) ? programsRes : (programsRes?.data || programsRes?.programs || []);
      setAllPrograms(programs);

      const allowed = Array.isArray(allowedRes) ? allowedRes : (allowedRes?.data || []);
      if (allowed.length > 0) {
        setAccessMode('specific');
        setSelectedProgramIds(allowed.map((p: any) => p.id));
      } else {
        setAccessMode('all');
        setSelectedProgramIds([]);
      }
    } catch (err: any) {
      console.error('خطأ في جلب البيانات:', err);
      toast.error('فشل في جلب بيانات البرامج');
    } finally {
      setLoading(false);
    }
  };

  const toggleProgram = (programId: number) => {
    setSelectedProgramIds((prev) =>
      prev.includes(programId) ? prev.filter((id) => id !== programId) : [...prev, programId]
    );
  };

  const selectAll = () => {
    setSelectedProgramIds(allPrograms.map((p) => p.id));
  };

  const clearAll = () => {
    setSelectedProgramIds([]);
  };

  const handleSave = async () => {
    if (accessMode === 'specific' && selectedProgramIds.length === 0) {
      toast.error('يجب اختيار برنامج واحد على الأقل أو اختيار "كل البرامج"');
      return;
    }

    try {
      setSaving(true);
      const programIds = accessMode === 'all' ? [] : selectedProgramIds;
      await fetchAPI(`/users/${user.id}/allowed-programs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programIds }),
      });
      toast.success('تم تحديث صلاحية الوصول للبرامج بنجاح');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('خطأ في الحفظ:', err);
      toast.error('فشل في حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FaBook className="h-5 w-5" />
                صلاحية الوصول للبرامج التدريبية
              </h3>
              <p className="text-emerald-100 text-sm mt-1">
                {user?.name || 'المستخدم'} — تحديد البرامج التي يمكنه رؤية بياناتها
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[65vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FaSpinner className="animate-spin h-8 w-8 text-emerald-500" />
              <span className="mr-3 text-gray-600">جاري تحميل البرامج...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Access Mode Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">نوع الوصول:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccessMode('all')}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      accessMode === 'all'
                        ? 'border-emerald-500 bg-emerald-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        accessMode === 'all' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <FaGlobeAmericas className="h-5 w-5" />
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${accessMode === 'all' ? 'text-emerald-700' : 'text-gray-700'}`}>
                        كل البرامج
                      </p>
                      <p className="text-xs text-gray-500">وصول كامل بدون قيود</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccessMode('specific')}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      accessMode === 'specific'
                        ? 'border-amber-500 bg-amber-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        accessMode === 'specific' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <FaBook className="h-5 w-5" />
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${accessMode === 'specific' ? 'text-amber-700' : 'text-gray-700'}`}>
                        برامج محددة
                      </p>
                      <p className="text-xs text-gray-500">وصول مقيد ببرامج مختارة</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Programs List (shown only when specific) */}
              {accessMode === 'specific' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">
                      اختر البرامج المسموحة ({selectedProgramIds.length} من {allPrograms.length}):
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                      >
                        تحديد الكل
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        إلغاء الكل
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    {allPrograms.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        لا توجد برامج تدريبية
                      </div>
                    ) : (
                      allPrograms.map((program, index) => (
                        <label
                          key={program.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                            index !== allPrograms.length - 1 ? 'border-b border-gray-100' : ''
                          } ${selectedProgramIds.includes(program.id) ? 'bg-emerald-50' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedProgramIds.includes(program.id)}
                            onChange={() => toggleProgram(program.id)}
                            className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-800">{program.nameAr}</span>
                            {program.nameEn && (
                              <span className="text-xs text-gray-400 mr-2">({program.nameEn})</span>
                            )}
                          </div>
                          {selectedProgramIds.includes(program.id) && (
                            <FaCheckCircle className="h-4 w-4 text-emerald-500" />
                          )}
                        </label>
                      ))
                    )}
                  </div>

                  {selectedProgramIds.length === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-amber-700 text-sm">
                      <FaBook className="h-4 w-4 flex-shrink-0" />
                      <span>يجب اختيار برنامج واحد على الأقل أو العودة لخيار "كل البرامج"</span>
                    </div>
                  )}
                </div>
              )}

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                <p className="font-semibold mb-1">ملاحظة:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600">
                  <li>عند اختيار "كل البرامج" — المستخدم يرى جميع البيانات بدون قيود</li>
                  <li>عند تحديد برامج معينة — المستخدم يرى فقط بيانات المتدربين والدرجات والحضور والمالية المتعلقة بتلك البرامج</li>
                  <li>هذا التقييد يطبق على جميع صفحات النظام تلقائياً</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex items-center justify-between bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-2 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
          >
            {saving ? (
              <>
                <FaSpinner className="animate-spin h-4 w-4" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <FaSave className="h-4 w-4" />
                حفظ التغييرات
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
