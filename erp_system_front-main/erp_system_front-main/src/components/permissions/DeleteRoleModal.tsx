import React, { useState } from 'react';
import { FaTimes, FaSpinner, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { Role } from '../../hooks/usePermissions';
import { permissionsAPI } from '../../app/lib/api/permissions';
import toast from 'react-hot-toast';

interface DeleteRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  role: Role | null;
}

export const DeleteRoleModal: React.FC<DeleteRoleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  role,
}) => {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (!role) return;

    if (confirmText !== role.name) {
      toast.error('يرجى كتابة اسم الدور للتأكيد');
      return;
    }

    setLoading(true);
    try {
      await permissionsAPI.roles.delete(role.id);
      toast.success('تم حذف الدور بنجاح!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast.error(error.message || 'حدث خطأ أثناء حذف الدور');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setConfirmText('');
    onClose();
  };

  if (!isOpen || !role) return null;

  const canDelete = !role.isSystem && role.name !== 'super_admin' && confirmText === role.name;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-500 to-red-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <FaExclamationTriangle className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">حذف الدور</h2>
            </div>
            <button
              onClick={resetModal}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {(role.isSystem || role.name === 'super_admin') ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaExclamationTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                لا يمكن حذف هذا الدور
              </h3>
              <p className="text-gray-600">
                {role.name === 'super_admin'
                  ? 'دور السوبر أدمن محمي ولا يمكن حذفه لأسباب أمنية.'
                  : 'هذا الدور جزء من النظام الأساسي ولا يمكن حذفه.'
                }
              </p>
            </div>
          ) : (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaTrash className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  هل أنت متأكد من حذف هذا الدور؟
                </h3>
                <p className="text-gray-600 mb-4">
                  ستفقد جميع البيانات المرتبطة بالدور "{role.displayName}" نهائياً ولن يمكن استرجاعها.
                </p>
              </div>

              {/* معلومات الدور */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                    style={{ backgroundColor: role.color }}
                  >
                    {role.icon}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{role.displayName}</div>
                    <div className="text-sm text-gray-500">{role.name}</div>
                  </div>
                </div>
                {role.description && (
                  <p className="text-sm text-gray-600">{role.description}</p>
                )}
                {role._count && (
                  <div className="mt-2 text-sm text-amber-600">
                    ⚠️ هذا الدور معين لـ {role._count.userRoles} مستخدم
                  </div>
                )}
              </div>

              {/* تأكيد الحذف */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اكتب "<span className="font-mono text-red-600">{role.name}</span>" للتأكيد:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder={role.name}
                  dir="ltr"
                />
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <FaExclamationTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-1">تحذير:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>سيتم حذف الدور نهائياً</li>
                      <li>سيفقد جميع المستخدمين هذا الدور</li>
                      <li>لا يمكن التراجع عن هذا الإجراء</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={resetModal}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
          {!role.isSystem && role.name !== 'super_admin' && (
            <button
              onClick={handleDelete}
              disabled={loading || !canDelete}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <FaSpinner className="h-4 w-4 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <FaTrash className="h-4 w-4" />
                  حذف الدور
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
