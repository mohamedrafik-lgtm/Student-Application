'use client';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import toast from 'react-hot-toast';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { TibaModal } from '@/components/ui/tiba-modal';
import TibaDatePicker from '@/components/ui/tiba-date-picker';
import {
  AcademicCapIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  HomeModernIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface Classroom {
  id: number;
  name: string;
  classNumber: number;
  startDate?: string;
  endDate?: string;
}

interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
  numberOfClassrooms: number;
  classrooms: Classroom[];
}

const CARD_ACCENTS = [
  'border-t-blue-500',
  'border-t-emerald-500',
  'border-t-violet-500',
  'border-t-amber-500',
  'border-t-rose-500',
  'border-t-teal-500',
];

export default function ClassroomsPage() {
  const { hasPermission } = usePermissions();
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClassroom, setEditingClassroom] = useState<number | null>(null);
  const [classroomDates, setClassroomDates] = useState<{
    [key: number]: {
      name: string;
      startDate: string;
      endDate: string;
    }
  }>({});
  const [addingToProgram, setAddingToProgram] = useState<number | null>(null);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [addingLoading, setAddingLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ classroomId: number; classroomName: string; programId: number } | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const canView = hasPermission('dashboard.classrooms', 'view');
  const canEdit = hasPermission('dashboard.classrooms', 'edit');

  useEffect(() => {
    if (canView) {
      loadPrograms();
    }
  }, [canView]);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/programs');
      setPrograms(data);
    } catch (error) {
      console.error('Error loading programs:', error);
      toast.error('حدث خطأ في تحميل البرامج');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClassroom = async (programId: number) => {
    if (!newClassroomName.trim()) {
      toast.error('يرجى إدخال اسم الفصل');
      return;
    }
    try {
      setAddingLoading(true);
      const result = await fetchAPI(`/programs/${programId}/classrooms`, {
        method: 'POST',
        body: JSON.stringify({ name: newClassroomName.trim() }),
      });

      // تحديث البيانات المحلية
      setPrograms(prev =>
        prev.map(p =>
          p.id === programId
            ? {
                ...p,
                numberOfClassrooms: (p.numberOfClassrooms || 0) + 1,
                classrooms: [...(p.classrooms || []), result.classroom || result],
              }
            : p
        )
      );
      setAddingToProgram(null);
      setNewClassroomName('');
      toast.success('تم إضافة الفصل بنجاح');
    } catch (error) {
      console.error('Error adding classroom:', error);
      toast.error('حدث خطأ في إضافة الفصل');
    } finally {
      setAddingLoading(false);
    }
  };

  const handleDeleteClassroom = async () => {
    if (!deleteConfirm) return;
    const { classroomId, programId } = deleteConfirm;
    try {
      setDeletingLoading(true);
      await fetchAPI(`/programs/classrooms/${classroomId}`, {
        method: 'DELETE',
      });

      // تحديث البيانات المحلية
      setPrograms(prev =>
        prev.map(p =>
          p.id === programId
            ? {
                ...p,
                numberOfClassrooms: Math.max((p.numberOfClassrooms || 1) - 1, 0),
                classrooms: p.classrooms.filter(c => c.id !== classroomId),
              }
            : p
        )
      );
      setDeleteConfirm(null);
      toast.success('تم حذف الفصل بنجاح');
    } catch (error) {
      console.error('Error deleting classroom:', error);
      toast.error('حدث خطأ في حذف الفصل');
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleEditClassroom = (classroom: Classroom) => {
    setEditingClassroom(classroom.id);
    setClassroomDates({
      ...classroomDates,
      [classroom.id]: {
        name: classroom.name,
        startDate: classroom.startDate?.split('T')[0] || '',
        endDate: classroom.endDate?.split('T')[0] || '',
      },
    });
  };

  const handleSaveClassroomDates = async (classroomId: number) => {
    try {
      const dates = classroomDates[classroomId];
      
      // التحقق من اسم الفصل
      if (!dates.name || dates.name.trim() === '') {
        toast.error('اسم الفصل مطلوب');
        return;
      }
      
      const startDate = dates.startDate || '';
      const endDate = dates.endDate || '';

      // التحقق من صحة التواريخ
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (end <= start) {
          toast.error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
          return;
        }
      }

      await fetchAPI(`/programs/classrooms/${classroomId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: dates.name.trim(),
          startDate,
          endDate
        }),
      });

      // تحديث البيانات المحلية
      setPrograms(prevPrograms =>
        prevPrograms.map(program => ({
          ...program,
          classrooms: program.classrooms.map(c =>
            c.id === classroomId
              ? {
                  ...c,
                  name: dates.name.trim(),
                  startDate: startDate || undefined,
                  endDate: endDate || undefined
                }
              : c
          ),
        }))
      );

      setEditingClassroom(null);
      toast.success('تم تحديث بيانات الفصل بنجاح');
    } catch (error) {
      console.error('Error updating classroom:', error);
      toast.error('حدث خطأ في تحديث بيانات الفصل');
    }
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center max-w-sm">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XMarkIcon className="w-7 h-7 text-slate-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">غير مصرح</h2>
          <p className="text-sm text-slate-500">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="الفصول الدراسية" description="إدارة الفصول الدراسية لجميع البرامج التدريبية" breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الفصول الدراسية' }]} />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-slate-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-48" />
                  <div className="h-3 bg-slate-100 rounded w-32" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
                {[1, 2].map(j => (
                  <div key={j} className="h-20 bg-slate-100 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الفصول الدراسية"
        description="إدارة الفصول الدراسية لجميع البرامج التدريبية"
        breadcrumbs={[
          { label: 'لوحة التحكم', href: '/dashboard' },
          { label: 'الفصول الدراسية' },
        ]}
      />

      <div>
        <div className="space-y-4">
          {programs.map((program, idx) => (
            <div
              key={program.id}
              className={`bg-white rounded-xl border border-slate-200 border-t-4 ${CARD_ACCENTS[idx % CARD_ACCENTS.length]} shadow-sm`}
            >
              {/* Program Header */}
              <div className="p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AcademicCapIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{program.nameAr}</h3>
                      <p className="text-xs text-slate-400 truncate">{program.nameEn}</p>
                    </div>
                  </div>

                  {/* Edit Controls */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100">
                      <HomeModernIcon className="w-3.5 h-3.5" />
                      {program.classrooms?.length || 0} فصل
                    </span>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAddingToProgram(addingToProgram === program.id ? null : program.id);
                          setNewClassroomName('');
                        }}
                        leftIcon={<PlusIcon className="w-3.5 h-3.5" />}
                      >
                        إضافة فصل
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Add Classroom Form */}
              {addingToProgram === program.id && canEdit && (
                <div className="border-t border-slate-100 p-4 sm:p-5">
                  <div className="bg-blue-50/50 rounded-lg border border-blue-100 p-4">
                    <label className="block text-xs font-bold text-slate-700 mb-2">اسم الفصل الجديد</label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={newClassroomName}
                        onChange={(e) => setNewClassroomName(e.target.value)}
                        placeholder="مثال: الفصل الأول"
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddClassroom(program.id); }}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="flex-1 sm:flex-none"
                          onClick={() => handleAddClassroom(program.id)}
                          disabled={addingLoading}
                          leftIcon={addingLoading ? undefined : <PlusIcon className="w-3.5 h-3.5" />}
                        >
                          {addingLoading ? 'جاري...' : 'إضافة'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 sm:flex-none"
                          onClick={() => { setAddingToProgram(null); setNewClassroomName(''); }}
                          leftIcon={<XMarkIcon className="w-3.5 h-3.5" />}
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Classrooms Grid */}
              {program.classrooms && program.classrooms.length > 0 && (
                <div className="border-t border-slate-100 p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <BuildingOfficeIcon className="w-4 h-4 text-slate-500" />
                    <h4 className="text-xs font-bold text-slate-700">الفصول الحالية</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {program.classrooms.map((classroom) => (
                      <div
                        key={classroom.id}
                        className="rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white transition-colors"
                      >
                        {/* Classroom header */}
                        <div className="flex items-center justify-between p-3 pb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-[11px] font-bold">{classroom.classNumber}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-800 truncate">{classroom.name}</span>
                          </div>
                          {canEdit && editingClassroom !== classroom.id && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditClassroom(classroom)}
                                className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                                title="تعديل الفصل"
                              >
                                <PencilSquareIcon className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ classroomId: classroom.id, classroomName: classroom.name, programId: program.id })}
                                className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                title="حذف الفصل"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {editingClassroom === classroom.id ? (
                          <div className="p-3 pt-0 space-y-3">
                            {/* اسم الفصل */}
                            <div>
                              <label className="block text-[11px] font-medium text-slate-500 mb-1">اسم الفصل</label>
                              <input
                                type="text"
                                value={classroomDates[classroom.id]?.name || ''}
                                onChange={(e) =>
                                  setClassroomDates({
                                    ...classroomDates,
                                    [classroom.id]: {
                                      ...classroomDates[classroom.id],
                                      name: e.target.value,
                                    },
                                  })
                                }
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                placeholder="أدخل اسم الفصل"
                              />
                            </div>

                            {/* تاريخ البداية */}
                            <div>
                              <TibaDatePicker
                                label="تاريخ البداية"
                                value={classroomDates[classroom.id]?.startDate || ''}
                                onChange={(val) =>
                                  setClassroomDates({
                                    ...classroomDates,
                                    [classroom.id]: { ...classroomDates[classroom.id], startDate: val },
                                  })
                                }
                                size="sm"
                                clearable
                                placeholder="اختر تاريخ البداية"
                              />
                            </div>

                            {/* تاريخ النهاية */}
                            <div>
                              <TibaDatePicker
                                label="تاريخ النهاية"
                                value={classroomDates[classroom.id]?.endDate || ''}
                                onChange={(val) =>
                                  setClassroomDates({
                                    ...classroomDates,
                                    [classroom.id]: { ...classroomDates[classroom.id], endDate: val },
                                  })
                                }
                                size="sm"
                                clearable
                                placeholder="اختر تاريخ النهاية"
                              />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-1">
                              <Button size="sm" className="flex-1" onClick={() => handleSaveClassroomDates(classroom.id)} leftIcon={<CheckIcon className="w-3.5 h-3.5" />}>
                                حفظ
                              </Button>
                              <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingClassroom(null)} leftIcon={<XMarkIcon className="w-3.5 h-3.5" />}>
                                إلغاء
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="px-3 pb-3 flex items-center gap-3 text-[11px]">
                            {classroom.startDate && (
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                <CalendarDaysIcon className="w-3 h-3" />
                                من: {new Date(classroom.startDate).toLocaleDateString('ar-EG')}
                              </span>
                            )}
                            {classroom.endDate && (
                              <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-100">
                                <CalendarDaysIcon className="w-3 h-3" />
                                إلى: {new Date(classroom.endDate).toLocaleDateString('ar-EG')}
                              </span>
                            )}
                            {!classroom.startDate && !classroom.endDate && (
                              <span className="text-slate-400">غير محدد التواريخ</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {program.classrooms && program.classrooms.length === 0 && (
                <div className="border-t border-slate-100 p-5 text-center">
                  <p className="text-xs text-slate-400">لا توجد فصول دراسية لهذا البرنامج</p>
                </div>
              )}
            </div>
          ))}

          {programs.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="text-center py-16 px-6">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AcademicCapIcon className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1.5">لا توجد برامج تدريبية</h3>
                <p className="text-sm text-slate-500">قم بإضافة برامج تدريبية أولاً</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <TibaModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        variant="danger"
        size="sm"
        title="حذف الفصل الدراسي"
        subtitle={`هل أنت متأكد من حذف "${deleteConfirm?.classroomName}"؟`}
        icon={<ExclamationTriangleIcon className="w-6 h-6" />}
        footer={
          <div className="flex gap-2 w-full">
            <Button
              variant="danger"
              size="sm"
              className="flex-1"
              onClick={handleDeleteClassroom}
              disabled={deletingLoading}
              leftIcon={deletingLoading ? undefined : <TrashIcon className="w-3.5 h-3.5" />}
            >
              {deletingLoading ? 'جاري الحذف...' : 'حذف'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setDeleteConfirm(null)}
              disabled={deletingLoading}
            >
              إلغاء
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">سيتم حذف هذا الفصل نهائياً ولا يمكن التراجع عن هذا الإجراء.</p>
      </TibaModal>
    </div>
  );
}
