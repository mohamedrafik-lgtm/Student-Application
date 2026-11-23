import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import { Permission } from '../../hooks/usePermissions';
import { permissionsAPI } from '../../app/lib/api/permissions';
import { Button } from '../../app/components/ui/Button';
import toast from 'react-hot-toast';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  permission?: Permission | null;
  mode: 'create' | 'edit';
}

const permissionCategories = [
  'إدارة المستخدمين',
  'إدارة المتدربين',
  'إدارة البرامج',
  'المحتوى التدريبي',
  'بنك الأسئلة',
  'الحضور والغياب',
  'النظام المالي',
  'التقارير',
  'إدارة النظام',
  'أخرى',
];

const commonActions = [
  'view',
  'create',
  'edit',
  'delete',
  'export',
  'manage',
  'approve',
  'reject',
];

const commonResources = [
  'dashboard.users',
  'dashboard.trainees',
  'dashboard.programs',
  'dashboard.training-contents',
  'dashboard.questions',
  'dashboard.attendance',
  'dashboard.financial',
  'dashboard.reports',
  'dashboard.settings',
  'dashboard.audit-logs',
  'dashboard.permissions',
];

export const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  permission,
  mode,
}) => {
  const [formData, setFormData] = useState({
    resource: '',
    action: '',
    displayName: '',
    description: '',
    category: '',
    isSystem: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (mode === 'edit' && permission) {
      setFormData({
        resource: permission.resource,
        action: permission.action,
        displayName: permission.displayName,
        description: permission.description || '',
        category: permission.category || '',
        isSystem: permission.isSystem,
      });
    } else {
      setFormData({
        resource: '',
        action: '',
        displayName: '',
        description: '',
        category: '',
        isSystem: false,
      });
    }
    setErrors({});
  }, [mode, permission, isOpen]);

  const validate = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.resource.trim()) {
      newErrors.resource = 'المورد مطلوب';
    }

    if (!formData.action.trim()) {
      newErrors.action = 'الفعل مطلوب';
    } else if (!/^[a-z_]+$/.test(formData.action)) {
      newErrors.action = 'الفعل يجب أن يحتوي على أحرف إنجليزية صغيرة و _ فقط';
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'الاسم المعروض مطلوب';
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
        await permissionsAPI.permissions.create(formData);
        toast.success('تم إنشاء الصلاحية بنجاح!');
      } else if (mode === 'edit' && permission) {
        await permissionsAPI.permissions.update(permission.id, {
          displayName: formData.displayName,
          description: formData.description,
          category: formData.category,
        });
        toast.success('تم تحديث الصلاحية بنجاح!');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving permission:', error);
      toast.error(error.message || 'حدث خطأ أثناء حفظ الصلاحية');
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
                <KeyIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">
                {mode === 'create' ? 'إنشاء صلاحية جديدة' : 'تعديل الصلاحية'}
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
            {/* المورد */}
            <div>
              <label className="block text-sm font-medium text-tiba-gray-700 mb-1.5">
                المورد <span className="text-tiba-danger-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.resource}
                  onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
                  disabled={mode === 'edit'}
                  className={`
                    w-full px-3.5 py-2.5 border rounded-lg text-sm transition-colors outline-none
                    focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500
                    ${errors.resource ? 'border-tiba-danger-400 bg-tiba-danger-50' : 'border-tiba-gray-300'}
                    ${mode === 'edit' ? 'bg-tiba-gray-100 cursor-not-allowed' : ''}
                  `}
                >
                  <option value="">اختر المورد</option>
                  {commonResources.map((resource) => (
                    <option key={resource} value={resource}>
                      {resource}
                    </option>
                  ))}
                </select>
                {formData.resource && (
                  <input
                    type="text"
                    value={formData.resource}
                    onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
                    disabled={mode === 'edit'}
                    className={`
                      mt-2 w-full px-3.5 py-2.5 border rounded-lg text-sm transition-colors outline-none
                      focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500
                      ${errors.resource ? 'border-tiba-danger-400 bg-tiba-danger-50' : 'border-tiba-gray-300'}
                      ${mode === 'edit' ? 'bg-tiba-gray-100 cursor-not-allowed' : ''}
                    `}
                    placeholder="أو اكتب موردًا مخصصًا"
                    dir="ltr"
                  />
                )}
              </div>
              {errors.resource && (
                <p className="mt-1 text-xs text-tiba-danger-600">{errors.resource}</p>
              )}
            </div>

            {/* الفعل */}
            <div>
              <label className="block text-sm font-medium text-tiba-gray-700 mb-1.5">
                الفعل <span className="text-tiba-danger-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  disabled={mode === 'edit'}
                  className={`
                    w-full px-3.5 py-2.5 border rounded-lg text-sm transition-colors outline-none
                    focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500
                    ${errors.action ? 'border-tiba-danger-400 bg-tiba-danger-50' : 'border-tiba-gray-300'}
                    ${mode === 'edit' ? 'bg-tiba-gray-100 cursor-not-allowed' : ''}
                  `}
                >
                  <option value="">اختر الفعل</option>
                  {commonActions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
                {formData.action && (
                  <input
                    type="text"
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                    disabled={mode === 'edit'}
                    className={`
                      mt-2 w-full px-3.5 py-2.5 border rounded-lg text-sm transition-colors outline-none
                      focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500
                      ${errors.action ? 'border-tiba-danger-400 bg-tiba-danger-50' : 'border-tiba-gray-300'}
                      ${mode === 'edit' ? 'bg-tiba-gray-100 cursor-not-allowed' : ''}
                    `}
                    placeholder="أو اكتب فعلاً مخصصًا"
                    dir="ltr"
                  />
                )}
              </div>
              {errors.action && (
                <p className="mt-1 text-xs text-tiba-danger-600">{errors.action}</p>
              )}
              {mode === 'edit' && (
                <p className="mt-1 text-xs text-tiba-gray-500">لا يمكن تغيير المورد والفعل بعد إنشاء الصلاحية</p>
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
                placeholder="مثال: عرض المستخدمين"
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
                placeholder="وصف مختصر للصلاحية..."
              />
            </div>

            {/* التصنيف */}
            <div>
              <label className="block text-sm font-medium text-tiba-gray-700 mb-1.5">
                التصنيف
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-tiba-gray-300 rounded-lg text-sm transition-colors outline-none
                  focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500"
              >
                <option value="">اختر التصنيف</option>
                {permissionCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* معاينة الصلاحية */}
            <div className="p-4 bg-tiba-gray-50 border border-tiba-gray-200 rounded-lg">
              <h4 className="text-xs font-medium text-tiba-gray-500 mb-2 uppercase tracking-wide">معاينة</h4>
              <div className="text-sm">
                <div className="font-mono text-tiba-primary-600">
                  {formData.resource || 'resource'}.{formData.action || 'action'}
                </div>
                <div className="font-medium text-tiba-gray-800 mt-1">
                  {formData.displayName || 'الاسم المعروض'}
                </div>
                {formData.category && (
                  <div className="text-xs text-tiba-gray-500 mt-1">
                    التصنيف: {formData.category}
                  </div>
                )}
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
            leftIcon={<KeyIcon className="h-4 w-4" />}
          >
            {mode === 'create' ? 'إنشاء الصلاحية' : 'تحديث الصلاحية'}
          </Button>
        </div>
      </div>
    </div>
  );
};
