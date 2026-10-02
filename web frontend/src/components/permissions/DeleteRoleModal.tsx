import React, { useState } from 'react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Role } from '../../hooks/usePermissions';
import { permissionsAPI } from '../../app/lib/api/permissions';
import { Button } from '../../app/components/ui/Button';
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-tiba-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-tiba-gray-200 bg-tiba-danger-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">حذف الدور</h2>
            </div>
            <button
              onClick={resetModal}
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {(role.isSystem || role.name === 'super_admin') ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-tiba-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExclamationTriangleIcon className="h-7 w-7 text-tiba-danger-600" />
              </div>
              <h3 className="text-lg font-semibold text-tiba-gray-800 mb-2">
                لا يمكن حذف هذا الدور
              </h3>
              <p className="text-tiba-gray-600 text-sm">
                {role.name === 'super_admin'
                  ? 'دور السوبر أدمن محمي ولا يمكن حذفه لأسباب أمنية.'
                  : 'هذا الدور جزء من النظام الأساسي ولا يمكن حذفه.'
                }
              </p>
            </div>
          ) : (
            <div>
              <div className="text-center mb-6">
              <div className="w-14 h-14 bg-tiba-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="h-7 w-7 text-tiba-danger-600" />
              </div>
              <h3 className="text-lg font-semibold text-tiba-gray-800 mb-2">
                هل أنت متأكد من حذف هذا الدور؟
              </h3>
              <p className="text-tiba-gray-600 text-sm mb-4">
                  ستفقد جميع البيانات المرتبطة بالدور "{role.displayName}" نهائياً ولن يمكن استرجاعها.
                </p>
              </div>

              {/* معلومات الدور */}
              <div className="bg-tiba-gray-50 rounded-lg p-4 mb-4 border border-tiba-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                    style={{ backgroundColor: role.color }}
                  >
                    {role.icon}
                  </div>
                  <div>
                    <div className="font-medium text-tiba-gray-800">{role.displayName}</div>
                    <div className="text-sm text-tiba-gray-500">{role.name}</div>
                  </div>
                </div>
                {role.description && (
                  <p className="text-sm text-tiba-gray-600">{role.description}</p>
                )}
                {role._count && (
                  <div className="mt-2 text-sm text-tiba-warning-600">
                    ⚠️ هذا الدور معين لـ {role._count.userRoles} مستخدم
                  </div>
                )}
              </div>

              {/* تأكيد الحذف */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-tiba-gray-700 mb-1.5">
                  اكتب "<span className="font-mono text-tiba-danger-600">{role.name}</span>" للتأكيد:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-tiba-gray-300 rounded-lg text-sm transition-colors outline-none
                    focus:ring-2 focus:ring-tiba-danger-500/20 focus:border-tiba-danger-500"
                  placeholder={role.name}
                  dir="ltr"
                />
              </div>

              <div className="bg-tiba-danger-50 border border-tiba-danger-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-tiba-danger-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-tiba-danger-800">
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
        <div className="px-6 py-4 border-t border-tiba-gray-200 bg-tiba-gray-50 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={resetModal}>
            إلغاء
          </Button>
          {!role.isSystem && role.name !== 'super_admin' && (
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={loading || !canDelete}
              isLoading={loading}
              leftIcon={<TrashIcon className="h-4 w-4" />}
            >
              حذف الدور
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
