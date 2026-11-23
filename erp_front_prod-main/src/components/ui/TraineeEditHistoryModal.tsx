'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { getTraineeEditHistory, TraineeEditHistoryResponse } from '@/lib/api/trainee-history';

interface TraineeEditHistoryModalProps {
  traineeId: number;
  traineeName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function TraineeEditHistoryModal({ traineeId, traineeName, isOpen, onClose }: TraineeEditHistoryModalProps) {
  const [data, setData] = useState<TraineeEditHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, traineeId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await getTraineeEditHistory(traineeId);
      setData(response);
    } catch (error: any) {
      toast.error(error.message || 'فشل في تحميل سجل التعديلات');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFieldLabel = (field: string): string => {
    const labels: { [key: string]: string } = {
      nameAr: 'الاسم بالعربية',
      nameEn: 'الاسم بالإنجليزية',
      phone: 'رقم الهاتف',
      email: 'البريد الإلكتروني',
      nationalId: 'الرقم القومي',
      address: 'العنوان',
      programId: 'البرنامج التدريبي',
      traineeStatus: 'حالة المتدرب',
      // أضف المزيد حسب الحاجة
    };
    return labels[field] || field;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            سجل التعديلات: {traineeName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">جاري التحميل...</p>
            </div>
          ) : data ? (
            <>
              {/* معلومات المنشئ والمحدث */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {data.trainee.createdBy && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <UserIcon className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-900">أنشأ بواسطة</span>
                    </div>
                    <p className="text-gray-700">{data.trainee.createdBy.name}</p>
                    <p className="text-sm text-gray-500">{formatDate(data.trainee.createdAt)}</p>
                  </div>
                )}
                {data.trainee.updatedBy && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <UserIcon className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-blue-900">آخر تعديل بواسطة</span>
                    </div>
                    <p className="text-gray-700">{data.trainee.updatedBy.name}</p>
                    <p className="text-sm text-gray-500">{formatDate(data.trainee.updatedAt)}</p>
                  </div>
                )}
              </div>

              {/* History List */}
              {data.history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>لا يوجد سجل تعديلات حتى الآن</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    سجل التعديلات ({data.count})
                  </h3>
                  {data.history.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              item.action === 'CREATE' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {item.action === 'CREATE' ? 'إنشاء' : 'تحديث'}
                            </span>
                            <span className="font-semibold text-gray-900">{item.user.name}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                            <ClockIcon className="h-4 w-4" />
                            <span>{formatDate(item.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {item.changes && item.changes.changedFields && Object.keys(item.changes.changedFields).length > 0 && (
                        <div className="mt-3 bg-white rounded border border-gray-200 p-3">
                          <p className="text-sm font-semibold text-gray-700 mb-2">التغييرات:</p>
                          <div className="space-y-2">
                            {Object.entries(item.changes.changedFields).map(([field, change]: [string, any]) => (
                              <div key={field} className="text-sm">
                                <span className="font-medium text-gray-700">{getFieldLabel(field)}:</span>
                                <div className="mr-4 mt-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-red-600 line-through">{String(change.before || '-')}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-green-600 font-medium">{String(change.after || '-')}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

