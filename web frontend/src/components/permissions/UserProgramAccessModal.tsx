'use client';

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  BookOpenIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { fetchAPI } from '../../lib/api';
import { Button } from '../../app/components/ui/Button';
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-tiba-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-tiba-gray-200 bg-tiba-primary-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                <BookOpenIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  صلاحية الوصول للبرامج التدريبية
                </h3>
                <p className="text-white/80 text-sm">
                  {user?.name || 'المستخدم'} — تحديد البرامج التي يمكنه رؤية بياناتها
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[65vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-tiba-primary-600 border-t-transparent"></div>
              <span className="mr-3 text-tiba-gray-600">جاري تحميل البرامج...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Access Mode Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-tiba-gray-700">نوع الوصول:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccessMode('all')}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      accessMode === 'all'
                        ? 'border-tiba-primary-500 bg-tiba-primary-50 shadow-md'
                        : 'border-tiba-gray-200 hover:border-tiba-gray-300 bg-white'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        accessMode === 'all' ? 'bg-tiba-primary-500 text-white' : 'bg-tiba-gray-100 text-tiba-gray-400'
                      }`}
                    >
                      <GlobeAltIcon className="h-5 w-5" />
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${accessMode === 'all' ? 'text-tiba-primary-700' : 'text-tiba-gray-700'}`}>
                        كل البرامج
                      </p>
                      <p className="text-xs text-tiba-gray-500">وصول كامل بدون قيود</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccessMode('specific')}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      accessMode === 'specific'
                        ? 'border-tiba-warning-500 bg-tiba-warning-50 shadow-md'
                        : 'border-tiba-gray-200 hover:border-tiba-gray-300 bg-white'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        accessMode === 'specific' ? 'bg-tiba-warning-500 text-white' : 'bg-tiba-gray-100 text-tiba-gray-400'
                      }`}
                    >
                      <BookOpenIcon className="h-5 w-5" />
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${accessMode === 'specific' ? 'text-tiba-warning-700' : 'text-tiba-gray-700'}`}>
                        برامج محددة
                      </p>
                      <p className="text-xs text-tiba-gray-500">وصول مقيد ببرامج مختارة</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Programs List (shown only when specific) */}
              {accessMode === 'specific' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-tiba-gray-700">
                      اختر البرامج المسموحة ({selectedProgramIds.length} من {allPrograms.length}):
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="text-xs text-tiba-primary-600 hover:text-tiba-primary-800 font-medium"
                      >
                        تحديد الكل
                      </button>
                      <span className="text-tiba-gray-300">|</span>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="text-xs text-tiba-danger-500 hover:text-tiba-danger-700 font-medium"
                      >
                        إلغاء الكل
                      </button>
                    </div>
                  </div>

                  <div className="border border-tiba-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    {allPrograms.length === 0 ? (
                      <div className="p-6 text-center text-tiba-gray-500">
                        لا توجد برامج تدريبية
                      </div>
                    ) : (
                      allPrograms.map((program, index) => (
                        <label
                          key={program.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-tiba-gray-50 transition-colors ${
                            index !== allPrograms.length - 1 ? 'border-b border-tiba-gray-100' : ''
                          } ${selectedProgramIds.includes(program.id) ? 'bg-tiba-primary-50' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedProgramIds.includes(program.id)}
                            onChange={() => toggleProgram(program.id)}
                            className="w-5 h-5 text-tiba-primary-600 rounded border-tiba-gray-300 focus:ring-tiba-primary-500"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-tiba-gray-800">{program.nameAr}</span>
                            {program.nameEn && (
                              <span className="text-xs text-tiba-gray-400 mr-2">({program.nameEn})</span>
                            )}
                          </div>
                          {selectedProgramIds.includes(program.id) && (
                            <CheckCircleIcon className="h-4 w-4 text-tiba-primary-500" />
                          )}
                        </label>
                      ))
                    )}
                  </div>

                  {selectedProgramIds.length === 0 && (
                    <div className="bg-tiba-warning-50 border border-tiba-warning-200 rounded-lg p-3 flex items-center gap-2 text-tiba-warning-700 text-sm">
                      <BookOpenIcon className="h-4 w-4 flex-shrink-0" />
                      <span>يجب اختيار برنامج واحد على الأقل أو العودة لخيار "كل البرامج"</span>
                    </div>
                  )}
                </div>
              )}

              {/* Info box */}
              <div className="bg-tiba-primary-50 border border-tiba-primary-100 rounded-lg p-4 text-sm text-tiba-primary-700">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <InformationCircleIcon className="h-4 w-4" />
                  ملاحظة:
                </p>
                <ul className="list-disc list-inside space-y-1 text-tiba-primary-600">
                  <li>عند اختيار "كل البرامج" — المستخدم يرى جميع البيانات بدون قيود</li>
                  <li>عند تحديد برامج معينة — المستخدم يرى فقط بيانات المتدربين والدرجات والحضور والمالية المتعلقة بتلك البرامج</li>
                  <li>هذا التقييد يطبق على جميع صفحات النظام تلقائياً</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-tiba-gray-200 bg-tiba-gray-50 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            isLoading={saving}
            leftIcon={<BookOpenIcon className="h-4 w-4" />}
          >
            حفظ التغييرات
          </Button>
        </div>
      </div>
    </div>
  );
};
