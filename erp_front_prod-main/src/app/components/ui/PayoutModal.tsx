'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { XMarkIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { SearchableSelect } from './Select';
import { fetchAPI } from '@/lib/api';

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PayoutData) => Promise<void>;
  commission: {
    id: number;
    amount: number;
    marketingEmployee: {
      name: string;
    };
    trainee: {
      nameAr: string;
    };
    type: 'FIRST_CONTACT' | 'SECOND_CONTACT';
  };
}

interface PayoutData {
  amount: number;
  fromSafeId: string;
  toSafeId: string;
  description: string;
}

interface Safe {
  id: string;
  name: string;
  category: string;
  balance: number;
  currency: string;
}

export default function PayoutModal({
  isOpen,
  onClose,
  onSubmit,
  commission,
}: PayoutModalProps) {
  const [amount, setAmount] = useState('');
  const [fromSafeId, setFromSafeId] = useState<string | null>(null);
  const [toSafeId, setToSafeId] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  // إنشاء الوصف التلقائي
  const generateDescription = () => {
    const contactType = commission.type === 'FIRST_CONTACT' ? 'التواصل الأول' : 'التواصل الثاني';
    return `صرف عمولة ${contactType} للموظف ${commission.marketingEmployee.name} عن المتدرب ${commission.trainee.nameAr}`;
  };
  const [isLoading, setIsLoading] = useState(false);
  const [safes, setSafes] = useState<Safe[]>([]);
  const [loadingSafes, setLoadingSafes] = useState(false);

  // جلب الخزائن وتعيين القيم الافتراضية
  useEffect(() => {
    if (isOpen) {
      fetchSafes();
      // تعيين مبلغ الصرف تلقائياً بقيمة العمولة
      setAmount(commission.amount.toString());
      // تعيين الوصف تلقائياً
      const autoDescription = generateDescription();
      console.log('🔍 Generated description:', autoDescription);
      setDescription(autoDescription);
    }
  }, [isOpen, commission]);

  const fetchSafes = async () => {
    try {
      setLoadingSafes(true);
      console.log('🔍 Fetching safes from /finances/safes');
      const response = await fetchAPI('/finances/safes');
      console.log('🔍 Safes response:', response);
      if (response.success) {
        setSafes(response.data);
        console.log('🔍 Safes set:', response.data);
      } else {
        setSafes(response || []);
        console.log('🔍 Safes set (fallback):', response);
      }
    } catch (error) {
      console.error('Error fetching safes:', error);
      toast.error('حدث خطأ أثناء جلب الخزائن');
    } finally {
      setLoadingSafes(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('يرجى إدخال قيمة الصرف الصحيحة');
      return;
    }

    if (parseFloat(amount) > commission.amount) {
      toast.error('قيمة الصرف لا يمكن أن تتجاوز قيمة العمولة');
      return;
    }

    if (!fromSafeId || !toSafeId) {
      toast.error('يرجى اختيار الخزائن');
      return;
    }

    if (fromSafeId === toSafeId) {
      toast.error('لا يمكن الصرف من وإلى نفس الخزينة');
      return;
    }

    // التحقق من رصيد الخزينة المصدر
    const fromSafe = safes.find(safe => safe.id === fromSafeId);
    if (fromSafe && fromSafe.balance < parseFloat(amount)) {
      toast.error(`رصيد الخزينة "${fromSafe.name}" غير كافٍ. الرصيد الحالي: ${fromSafe.balance.toLocaleString('ar-EG')} ${fromSafe.currency} والمطلوب: ${parseFloat(amount).toLocaleString('ar-EG')} ${fromSafe.currency}`);
      return;
    }

    // الوصف يتم إنشاؤه تلقائياً، لا حاجة للتحقق

    setIsLoading(true);
    try {
      await onSubmit({
        amount: parseFloat(amount),
        fromSafeId,
        toSafeId,
        description: description.trim(),
      });
      
      // إعادة تعيين النموذج
      setAmount('');
      setFromSafeId(null);
      setToSafeId(null);
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Error creating payout:', error);
      toast.error('حدث خطأ أثناء صرف العمولة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setAmount('');
      setFromSafeId(null);
      setToSafeId(null);
      setDescription('');
      onClose();
    }
  };

  // فلترة الخزائن حسب النوع
  const incomeSafes = safes.filter(safe => safe.category === 'INCOME');
  const expenseSafes = safes.filter(safe => safe.category === 'EXPENSE');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                صرف العمولة
              </h2>
              <p className="text-sm text-gray-600">
                العمولة #{commission.id}
              </p>
            </div>
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
          {/* معلومات العمولة */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">تفاصيل العمولة</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">موظف التسويق:</span>
                <span className="font-medium">{commission.marketingEmployee.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">المتدرب:</span>
                <span className="font-medium">{commission.trainee.nameAr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">نوع العمولة:</span>
                <span className="font-medium">
                  {commission.type === 'FIRST_CONTACT' ? 'تواصل أول' : 'تواصل ثاني'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">قيمة العمولة:</span>
                <span className="font-medium text-green-600">
                  {new Intl.NumberFormat('ar-EG', {
                    style: 'currency',
                    currency: 'EGP',
                  }).format(commission.amount)}
                </span>
              </div>
            </div>
          </div>

          {/* مبلغ الصرف */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              مبلغ الصرف
            </label>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-lg font-semibold text-green-600">
                {new Intl.NumberFormat('ar-EG', {
                  style: 'currency',
                  currency: 'EGP',
                }).format(parseFloat(amount) || 0)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              سيتم صرف كامل قيمة العمولة
            </p>
          </div>

          {/* الخزينة المصروف منها */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الخزينة المصروف منها (خزائن الدخل) *
            </label>
            <SearchableSelect
              options={incomeSafes.map(safe => ({
                value: safe.id,
                label: `${safe.name} (${new Intl.NumberFormat('ar-EG', {
                  style: 'currency',
                  currency: safe.currency,
                }).format(safe.balance)})`,
              }))}
              value={fromSafeId}
              onChange={setFromSafeId}
              placeholder={loadingSafes ? "جاري تحميل الخزائن..." : "اختر خزينة الدخل"}
              clearable
              disabled={isLoading || loadingSafes}
            />
          </div>

          {/* الخزينة المصروف إليها */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الخزينة المصروف إليها (خزائن المصروفات) *
            </label>
            <SearchableSelect
              options={expenseSafes.map(safe => ({
                value: safe.id,
                label: `${safe.name} (${new Intl.NumberFormat('ar-EG', {
                  style: 'currency',
                  currency: safe.currency,
                }).format(safe.balance)})`,
              }))}
              value={toSafeId}
              onChange={setToSafeId}
              placeholder={loadingSafes ? "جاري تحميل الخزائن..." : "اختر خزينة المصروفات"}
              clearable
              disabled={isLoading || loadingSafes}
            />
          </div>

          {/* وصف العملية */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              وصف العملية
            </label>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-800">{description || 'لا يوجد وصف'}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              الوصف يتم إنشاؤه تلقائياً بناءً على بيانات العمولة
            </p>
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
              disabled={isLoading || !fromSafeId || !toSafeId}
              className="flex-1"
            >
              {isLoading ? 'جاري الصرف...' : 'صرف العمولة'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
