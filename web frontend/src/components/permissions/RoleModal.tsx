import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  SwatchIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { Role } from '../../hooks/usePermissions';
import { permissionsAPI } from '../../app/lib/api/permissions';
import { Button } from '../../app/components/ui/Button';
import toast from 'react-hot-toast';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  role?: Role | null; // للتعديل
  mode: 'create' | 'edit';
}

const roleColors = [
  { value: '#DC2626', label: 'أحمر', class: 'bg-red-600' },
  { value: '#7C3AED', label: 'بنفسجي', class: 'bg-purple-600' },
  { value: '#059669', label: 'أخضر', class: 'bg-green-600' },
  { value: '#0891B2', label: 'أزرق', class: 'bg-cyan-600' },
  { value: '#EA580C', label: 'برتقالي', class: 'bg-orange-600' },
  { value: '#6B7280', label: 'رمادي', class: 'bg-gray-600' },
  { value: '#9CA3AF', label: 'رمادي فاتح', class: 'bg-gray-400' },
  { value: '#1F2937', label: 'أسود', class: 'bg-gray-800' },
];

const roleIcons = [
  'FaUserShield',
  'FaUserCog',
  'FaUserTie',
  'FaChalkboardTeacher',
  'FaCalculator',
  'FaUser',
  'FaEye',
  'FaCrown',
  'FaGem',
  'FaStar',
];

export const RoleModal: React.FC<RoleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  role,
  mode,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    color: '#6B7280',
    icon: 'FaUser',
    priority: 0,
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (mode === 'edit' && role) {
      setFormData({
        name: role.name,
        displayName: role.displayName,
        description: role.description || '',
        color: role.color || '#6B7280',
        icon: role.icon || 'FaUser',
        priority: role.priority,
        isActive: role.isActive,
      });
    } else {
      setFormData({
        name: '',
        displayName: '',
        description: '',
        color: '#6B7280',
        icon: 'FaUser',
        priority: 0,
        isActive: true,
      });
    }
    setErrors({});
  }, [mode, role, isOpen]);

  const validate = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = 'اسم الدور مطلوب';
    } else if (!/^[a-z_]+$/.test(formData.name)) {
      newErrors.name = 'اسم الدور يجب أن يحتوي على أحرف إنجليزية صغيرة و _ فقط';
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'الاسم المعروض مطلوب';
    }

    if (formData.priority < 0 || formData.priority > 1000) {
      newErrors.priority = 'الأولوية يجب أن تكون بين 0 و 1000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      if (mode === 'create') {
        await permissionsAPI.roles.create(formData);
        toast.success('تم إنشاء الدور بنجاح!');
      } else if (mode === 'edit' && role) {
        await permissionsAPI.roles.update(role.id, {
          displayName: formData.displayName,
          description: formData.description,
          color: formData.color,
          icon: formData.icon,
          priority: formData.priority,
          isActive: formData.isActive,
        });
        toast.success('تم تحديث الدور بنجاح!');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving role:', error);
      toast.error(error.message || 'حدث خطأ أثناء حفظ الدور');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-tiba-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-tiba-gray-200 bg-tiba-primary-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">
                {mode === 'create' ? 'إنشاء دور جديد' : 'تعديل الدور'}
              </h2>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* اسم الدور */}
            <div>
              <label className="block text-sm font-medium text-tiba-gray-700 mb-1.5">
                اسم الدور (مفتاح فريد) <span className="text-tiba-danger-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={mode === 'edit'}
                className={`
                  w-full px-3.5 py-2.5 border rounded-lg text-sm transition-colors outline-none
                  focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500
                  ${errors.name ? 'border-tiba-danger-400 bg-tiba-danger-50' : 'border-tiba-gray-300'}
                  ${mode === 'edit' ? 'bg-tiba-gray-100 cursor-not-allowed text-tiba-gray-500' : ''}
                `}
                placeholder="مثال: manager"
                dir="ltr"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-tiba-danger-600">{errors.name}</p>
              )}
              {mode === 'edit' && (
                <p className="mt-1 text-xs text-tiba-gray-500">لا يمكن تغيير اسم الدور بعد إنشائه</p>
              )}
            </div>

            {/* الاسم المعروض */}
            <div>
              <label className="block text-sm font-medium text-tiba-gray-700 mb-1.5">
                الاسم المعروض <span className="text-tiba-danger-500">*</span>
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className={`
                  w-full px-3.5 py-2.5 border rounded-lg text-sm transition-colors outline-none
                  focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500
                  ${errors.displayName ? 'border-tiba-danger-400 bg-tiba-danger-50' : 'border-tiba-gray-300'}
                `}
                placeholder="مثال: مدير"
              />
              {errors.displayName && (
                <p className="mt-1 text-xs text-tiba-danger-600">{errors.displayName}</p>
              )}
            </div>

            {/* الوصف */}
            <div>
              <label className="block text-sm font-medium text-tiba-gray-700 mb-1.5">
                الوصف
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3.5 py-2.5 border border-tiba-gray-300 rounded-lg text-sm transition-colors outline-none
                  focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500"
                placeholder="وصف مختصر للدور..."
              />
            </div>

            {/* اللون والأيقونة */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* اللون */}
              <div>
                <label className="block text-sm font-medium text-tiba-gray-700 mb-1.5 flex items-center gap-1.5">
                  <SwatchIcon className="h-4 w-4 text-tiba-primary-500" />
                  لون الدور
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {roleColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`
                        w-10 h-10 rounded-lg ${color.class} border-2 transition-all
                        ${formData.color === color.value 
                          ? 'border-tiba-gray-800 ring-2 ring-tiba-primary-300 scale-110' 
                          : 'border-tiba-gray-200 hover:border-tiba-gray-400 hover:scale-105'
                        }
                      `}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              {/* الأيقونة */}
              <div>
                <label className="block text-sm font-medium text-tiba-gray-700 mb-1.5">
                  الأيقونة
                </label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-tiba-gray-300 rounded-lg text-sm transition-colors outline-none
                    focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500"
                >
                  {roleIcons.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* الأولوية */}
            <div>
              <label className="block text-sm font-medium text-tiba-gray-700 mb-1.5">
                الأولوية (0-1000)
              </label>
              <input
                type="number"
                min="0"
                max="1000"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                className={`
                  w-full px-3.5 py-2.5 border rounded-lg text-sm transition-colors outline-none
                  focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500
                  ${errors.priority ? 'border-tiba-danger-400 bg-tiba-danger-50' : 'border-tiba-gray-300'}
                `}
                placeholder="0"
              />
              {errors.priority && (
                <p className="mt-1 text-xs text-tiba-danger-600">{errors.priority}</p>
              )}
              <p className="mt-1 text-xs text-tiba-gray-500">
                الأولوية تحدد ترتيب الدور (الرقم الأكبر = أولوية أعلى)
              </p>
            </div>

            {/* حالة النشاط */}
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-tiba-primary-600 focus:ring-tiba-primary-500 border-tiba-gray-300 rounded"
              />
              <label htmlFor="isActive" className="text-sm text-tiba-gray-800 font-medium">
                الدور نشط
              </label>
            </div>

            {/* معاينة الدور */}
            <div className="p-4 bg-tiba-gray-50 border border-tiba-gray-200 rounded-lg">
              <h4 className="text-xs font-medium text-tiba-gray-500 mb-2 uppercase tracking-wide">معاينة</h4>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${formData.color}15`,
                  color: formData.color,
                  border: `1px solid ${formData.color}30`,
                }}
              >
                <span>{formData.icon}</span>
                {formData.displayName || 'اسم الدور'}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-tiba-gray-200 bg-tiba-gray-50 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={loading}
            leftIcon={<ShieldCheckIcon className="h-4 w-4" />}
          >
            {mode === 'create' ? 'إنشاء الدور' : 'تحديث الدور'}
          </Button>
        </div>
      </div>
    </div>
  );
};
