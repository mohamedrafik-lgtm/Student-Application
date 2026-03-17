import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaSave, FaPalette } from 'react-icons/fa';
import { Role } from '../../hooks/usePermissions';
import { permissionsAPI } from '../../app/lib/api/permissions';
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {mode === 'create' ? 'إنشاء دور جديد' : 'تعديل الدور'}
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* اسم الدور */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم الدور (مفتاح فريد) *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={mode === 'edit'} // لا يمكن تغيير اسم الدور عند التعديل
                className={`
                  w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  ${errors.name ? 'border-red-500' : 'border-gray-300'}
                  ${mode === 'edit' ? 'bg-gray-100 cursor-not-allowed' : ''}
                `}
                placeholder="مثال: manager"
                dir="ltr"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
              {mode === 'edit' && (
                <p className="mt-1 text-xs text-gray-500">لا يمكن تغيير اسم الدور بعد إنشائه</p>
              )}
            </div>

            {/* الاسم المعروض */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الاسم المعروض *
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className={`
                  w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  ${errors.displayName ? 'border-red-500' : 'border-gray-300'}
                `}
                placeholder="مثال: مدير"
              />
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
              )}
            </div>

            {/* الوصف */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الوصف
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="وصف مختصر للدور..."
              />
            </div>

            {/* اللون والأيقونة */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* اللون */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaPalette className="inline h-4 w-4 mr-1" />
                  لون الدور
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {roleColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`
                        w-12 h-12 rounded-lg ${color.class} border-2 transition-all
                        ${formData.color === color.value 
                          ? 'border-gray-800 ring-2 ring-gray-300' 
                          : 'border-gray-300 hover:border-gray-400'
                        }
                      `}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              {/* الأيقونة */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الأيقونة
                </label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الأولوية (0-1000)
              </label>
              <input
                type="number"
                min="0"
                max="1000"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                className={`
                  w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  ${errors.priority ? 'border-red-500' : 'border-gray-300'}
                `}
                placeholder="0"
              />
              {errors.priority && (
                <p className="mt-1 text-sm text-red-600">{errors.priority}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                الأولوية تحدد ترتيب الدور (الرقم الأكبر = أولوية أعلى)
              </p>
            </div>

            {/* حالة النشاط */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="mr-2 block text-sm text-gray-900">
                الدور نشط
              </label>
            </div>

            {/* معاينة الدور */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">معاينة:</h4>
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${formData.color}20`,
                  color: formData.color,
                  border: `1px solid ${formData.color}40`,
                }}
              >
                <span>{formData.icon}</span>
                {formData.displayName || 'اسم الدور'}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <FaSpinner className="h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <FaSave className="h-4 w-4" />
                {mode === 'create' ? 'إنشاء الدور' : 'تحديث الدور'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
