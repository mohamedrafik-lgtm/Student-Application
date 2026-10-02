'use client';

import { useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/app/components/ui/Button';
import { TibaModal } from '@/components/ui/tiba-modal';
import { KeyIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface SecurityPinChangeModalProps {
  open: boolean;
  userId: string;
  onClose: () => void;
  onChanged: () => void;
}

export default function SecurityPinChangeModal({ open, userId, onClose, onChanged }: SecurityPinChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);

  const close = () => {
    setCurrentPassword('');
    setPin('');
    setConfirmation('');
    onClose();
  };

  const save = async () => {
    if (pin.length !== 4 || confirmation.length !== 4) {
      toast.error('مفتاح الأمان يجب أن يتكون من 4 أرقام');
      return;
    }
    if (pin !== confirmation) {
      toast.error('مفتاح الأمان وتأكيده غير متطابقين');
      return;
    }
    if (!currentPassword) {
      toast.error('أدخل كلمة مرور الحساب');
      return;
    }

    try {
      setSaving(true);
      await fetchAPI(`/users/${userId}/security-pin`, {
        method: 'PATCH',
        body: JSON.stringify({ pin, currentPassword }),
      });
      sessionStorage.setItem(`securityPinVerified:${userId}`, 'true');
      toast.success('تم تغيير مفتاح الأمان بنجاح');
      onChanged();
      close();
    } catch (error: any) {
      toast.error(error?.message || 'تعذر تغيير مفتاح الأمان');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TibaModal
      open={open}
      onClose={close}
      variant="warning"
      size="md"
      title="تغيير مفتاح الأمان"
      subtitle="أدخل كلمة مرور الحساب لتأكيد التغيير"
      icon={<KeyIcon className="h-6 w-6" />}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={close}>إلغاء</Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<KeyIcon className="h-4 w-4" />}
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? 'جارٍ الحفظ...' : 'حفظ المفتاح'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
          <LockClosedIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>لا تشارك مفتاح الأمان مع أي شخص.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">كلمة مرور الحساب</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">مفتاح الأمان الجديد</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
            className="mt-1.5 h-12 w-full rounded-lg border border-slate-300 text-center text-xl font-bold tracking-[0.7em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">تأكيد المفتاح</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, '').slice(0, 4))}
            className="mt-1.5 h-12 w-full rounded-lg border border-slate-300 text-center text-xl font-bold tracking-[0.7em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            autoComplete="new-password"
          />
        </div>
      </div>
    </TibaModal>
  );
}
