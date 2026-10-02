import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useRoles, useUserPermissionManager } from '../../hooks/usePermissions';
import { Button } from '../../app/components/ui/Button';
import toast from 'react-hot-toast';

interface UserRoleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
}

export const UserRoleAssignmentModal: React.FC<UserRoleAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
}) => {
  const { roles, loading: rolesLoading } = useRoles();
  const { 
    userRoles, 
    loading, 
    assignRole, 
    revokeRole,
    refetch 
  } = useUserPermissionManager(user?.id);

  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [expirationDates, setExpirationDates] = useState<{[key: string]: string}>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userRoles) {
      const currentRoles = new Set(userRoles.map((ur: any) => ur.role.id));
      setSelectedRoles(currentRoles);
      
      const expDates: {[key: string]: string} = {};
      userRoles.forEach((ur: any) => {
        if (ur.expiresAt) {
          expDates[ur.role.id] = new Date(ur.expiresAt).toISOString().split('T')[0];
        }
      });
      setExpirationDates(expDates);
    }
  }, [userRoles]);

  const handleRoleToggle = (roleId: string) => {
    const newSelectedRoles = new Set(selectedRoles);
    if (newSelectedRoles.has(roleId)) {
      newSelectedRoles.delete(roleId);
      // إزالة تاريخ الانتهاء عند إلغاء تحديد الدور
      const newExpDates = { ...expirationDates };
      delete newExpDates[roleId];
      setExpirationDates(newExpDates);
    } else {
      newSelectedRoles.add(roleId);
    }
    setSelectedRoles(newSelectedRoles);
  };

  const handleExpirationChange = (roleId: string, date: string) => {
    setExpirationDates(prev => ({
      ...prev,
      [roleId]: date,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // الحصول على الأدوار الحالية
      const currentRoleIds = new Set(userRoles.map((ur: any) => ur.role.id));
      
      // تحديد الأدوار الجديدة التي يجب إضافتها
      const rolesToAdd = Array.from(selectedRoles).filter(roleId => !currentRoleIds.has(roleId));
      
      // تحديد الأدوار التي يجب إزالتها
      const rolesToRemove = Array.from(currentRoleIds).filter(roleId => !selectedRoles.has(roleId));

      // إضافة الأدوار الجديدة
      for (const roleId of rolesToAdd) {
        const expiresAt = expirationDates[roleId] ? new Date(expirationDates[roleId]) : undefined;
        await assignRole(roleId, expiresAt);
      }

      // إزالة الأدوار غير المحددة
      for (const roleId of rolesToRemove) {
        await revokeRole(roleId);
      }

      toast.success('تم حفظ أدوار المستخدم بنجاح!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving user roles:', error);
      toast.error(error.message || 'حدث خطأ أثناء حفظ الأدوار');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-tiba-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-tiba-gray-200 bg-tiba-primary-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">إدارة أدوار المستخدم</h2>
                <p className="text-white/80 text-sm">{user.name} - {user.email}</p>
              </div>
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading || rolesLoading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-tiba-primary-600 border-t-transparent mx-auto mb-2"></div>
              <p className="text-tiba-gray-600">جاري تحميل البيانات...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* معلومات المستخدم */}
              <div className="bg-tiba-gray-50 rounded-lg p-4 border border-tiba-gray-200">
                <h3 className="font-semibold text-tiba-gray-800 mb-2">معلومات المستخدم</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-tiba-gray-500">الاسم:</span>
                    <span className="font-medium mr-2 text-tiba-gray-800">{user.name}</span>
                  </div>
                  <div>
                    <span className="text-tiba-gray-500">البريد:</span>
                    <span className="font-medium mr-2 text-tiba-gray-800">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-tiba-gray-500">الحالة:</span>
                    <span className={`font-medium mr-2 ${user.isActive ? 'text-green-600' : 'text-tiba-danger-600'}`}>
                      {user.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                </div>
              </div>

              {/* الأدوار الحالية */}
              {userRoles.length > 0 && (
                <div className="bg-tiba-primary-50 rounded-lg p-4 border border-tiba-primary-200">
                  <h3 className="font-semibold text-tiba-primary-800 mb-2 flex items-center gap-2">
                    <InformationCircleIcon className="h-4 w-4" />
                    الأدوار الحالية
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {userRoles.map((userRole: any, index: number) => (
                      <span
                        key={userRole.id || `user-role-${index}`}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                        style={{
                          backgroundColor: `${userRole.role.color}20`,
                          color: userRole.role.color,
                          border: `1px solid ${userRole.role.color}40`,
                        }}
                      >
                        {userRole.role.displayName}
                        {userRole.expiresAt && (
                          <span className="text-xs opacity-75">
                            ({new Date(userRole.expiresAt).toLocaleDateString('ar-SA')})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* اختيار الأدوار */}
              <div>
                <h3 className="font-semibold text-tiba-gray-800 mb-4">تعيين الأدوار</h3>
                <div className="space-y-4">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className={`
                        border rounded-lg p-4 transition-all
                        ${selectedRoles.has(role.id) 
                          ? 'border-tiba-primary-500 bg-tiba-primary-50' 
                          : 'border-tiba-gray-200 hover:border-tiba-gray-300'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={`role-${role.id}`}
                          checked={selectedRoles.has(role.id)}
                          onChange={() => handleRoleToggle(role.id)}
                          disabled={role.isSystem && !selectedRoles.has(role.id)}
                          className="mt-1 h-4 w-4 text-tiba-primary-600 focus:ring-tiba-primary-500 border-tiba-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`role-${role.id}`}
                            className={`flex items-center gap-2 cursor-pointer ${
                              role.isSystem && !selectedRoles.has(role.id) ? 'opacity-50' : ''
                            }`}
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                              style={{ backgroundColor: role.color }}
                            >
                              {role.icon}
                            </div>
                            <div>
                              <div className="font-medium text-tiba-gray-800">{role.displayName}</div>
                              <div className="text-sm text-tiba-gray-600">{role.description}</div>
                              {role.isSystem && (
                                <div className="text-xs text-tiba-warning-600 mt-1">
                                  🔒 دور النظام
                                </div>
                              )}
                            </div>
                          </label>

                          {/* تاريخ الانتهاء */}
                          {selectedRoles.has(role.id) && (
                            <div className="mt-3">
                              <label className="block text-sm font-medium text-tiba-gray-700 mb-1">
                                <CalendarDaysIcon className="inline h-3 w-3 mr-1" />
                                تاريخ انتهاء الدور (اختياري)
                              </label>
                              <input
                                type="date"
                                value={expirationDates[role.id] || ''}
                                onChange={(e) => handleExpirationChange(role.id, e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full md:w-auto px-3 py-2 border border-tiba-gray-300 rounded-lg text-sm
                                  focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none transition-colors"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ملاحظة */}
              <div className="bg-tiba-warning-50 border border-tiba-warning-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <InformationCircleIcon className="h-4 w-4 text-tiba-warning-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-tiba-warning-800">
                    <p className="font-medium mb-1">ملاحظات مهمة:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>تاريخ الانتهاء اختياري، إذا لم يتم تحديده سيكون الدور دائماً</li>
                      <li>أدوار النظام محمية ولا يمكن إزالتها من بعض المستخدمين</li>
                      <li>سيتم تسجيل جميع التغييرات في سجل الأنشطة</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-tiba-gray-200 bg-tiba-gray-50 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || rolesLoading}
            isLoading={saving}
            leftIcon={<ShieldCheckIcon className="h-4 w-4" />}
          >
            حفظ الأدوار
          </Button>
        </div>
      </div>
    </div>
  );
};
