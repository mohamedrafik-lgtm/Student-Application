'use client';

import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CommissionData) => Promise<void>;
  marketingEmployeeId: number;
  marketingEmployeeName: string;
  traineeId: number;
  traineeName: string;
  type: 'FIRST_CONTACT' | 'SECOND_CONTACT';
}

interface CommissionData {
  marketingEmployeeId: number;
  traineeId: number;
  type: 'FIRST_CONTACT' | 'SECOND_CONTACT';
  amount: number;
  description?: string;
}

export default function CommissionModal({
  isOpen,
  onClose,
  onSubmit,
  marketingEmployeeId,
  marketingEmployeeName,
  traineeId,
  traineeName,
  type,
}: CommissionModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('يرجى إدخال قيمة العمولة الصحيحة');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        marketingEmployeeId,
        traineeId,
        type,
        amount: parseFloat(amount),
        description: description.trim() || undefined,
      });
      
      // إعادة تعيين النموذج
      setAmount('');
      setDescription('');
      onClose();
      toast.success('تم إنشاء العمولة بنجاح');
    } catch (error) {
      console.error('Error creating commission:', error);
      toast.error('حدث خطأ أثناء إنشاء العمولة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setAmount('');
      setDescription('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              إضافة عمولة جديدة
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {type === 'FIRST_CONTACT' ? 'تواصل أول' : 'تواصل ثاني'}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* معلومات الموظف والمتدرب */}
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">تفاصيل العملية</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">موظف التسويق:</span>
                  <span className="font-medium">{marketingEmployeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">المتدرب:</span>
                  <span className="font-medium">{traineeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">نوع العمولة:</span>
                  <span className="font-medium">
                    {type === 'FIRST_CONTACT' ? 'تواصل أول' : 'تواصل ثاني'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* قيمة العمولة */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              قيمة العمولة *
            </label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max="999999.99"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="أدخل قيمة العمولة"
              required
              disabled={isLoading}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              الحد الأدنى: 0.01 جنيه | الحد الأقصى: 999,999.99 جنيه
            </p>
          </div>

          {/* وصف العمولة */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              وصف العمولة (اختياري)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="أدخل وصفاً للعمولة (اختياري)"
              disabled={isLoading}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !amount}
              className="flex-1"
            >
              {isLoading ? 'جاري الإنشاء...' : 'إنشاء العمولة'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
