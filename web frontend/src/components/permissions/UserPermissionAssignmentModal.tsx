import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useAvailablePermissions, useUserPermissionManager } from '../../hooks/usePermissions';
import { Button } from '../../app/components/ui/Button';
import toast from 'react-hot-toast';

interface UserPermissionAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
}

export const UserPermissionAssignmentModal: React.FC<UserPermissionAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
}) => {
  const { permissions, loading: permissionsLoading } = useAvailablePermissions();
  const { 
    userDirectPermissions,
    userRoles,
    loading, 
    assignPermission, 
    revokePermission,
    refetch 
  } = useUserPermissionManager(user?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [permissionStates, setPermissionStates] = useState<{[key: string]: {granted: boolean, reason?: string, expiresAt?: string}}>({});
  const [saving, setSaving] = useState(false);

  // بناء مجموعة الصلاحيات القادمة من الأدوار
  const rolePermissionIds = React.useMemo(() => {
    const ids = new Set<string>();
    // من الأدوار المحملة عبر الـ hook
    userRoles?.forEach((ur: any) => {
      ur.role?.rolePermissions?.forEach((rp: any) => {
        if (rp.granted && rp.permission?.id) {
          ids.add(rp.permission.id);
        }
      });
    });
    // من أدوار المستخدم الممررة كـ prop
    user?.userRoles?.forEach((ur: any) => {
      ur.role?.rolePermissions?.forEach((rp: any) => {
        if (rp.granted && rp.permission?.id) {
          ids.add(rp.permission.id);
        }
      });
    });
    return ids;
  }, [userRoles, user?.userRoles]);

  useEffect(() => {
    if (userDirectPermissions) {
      const states: {[key: string]: {granted: boolean, reason?: string, expiresAt?: string}} = {};
      userDirectPermissions.forEach((up: any) => {
        states[up.permission.id] = {
          granted: up.granted,
          reason: up.reason || '',
          expiresAt: up.expiresAt ? new Date(up.expiresAt).toISOString().split('T')[0] : '',
        };
      });
      setPermissionStates(states);
    }
  }, [userDirectPermissions]);

  const handlePermissionToggle = (permissionId: string) => {
    setPermissionStates(prev => ({
      ...prev,
      [permissionId]: {
        granted: !prev[permissionId]?.granted,
        reason: prev[permissionId]?.reason || '',
        expiresAt: prev[permissionId]?.expiresAt || '',
      }
    }));
  };

  const handleReasonChange = (permissionId: string, reason: string) => {
    setPermissionStates(prev => ({
      ...prev,
      [permissionId]: {
        ...prev[permissionId],
        reason,
      }
    }));
  };

  const handleExpirationChange = (permissionId: string, expiresAt: string) => {
    setPermissionStates(prev => ({
      ...prev,
      [permissionId]: {
        ...prev[permissionId],
        expiresAt,
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // الحصول على الصلاحيات الحالية
      const currentPermissions = new Map(userDirectPermissions.map((up: any) => [up.permission.id, up]));
      
      // معالجة كل صلاحية محددة
      for (const [permissionId, state] of Object.entries(permissionStates)) {
        const currentPermission = currentPermissions.get(permissionId);
        
        if (state.granted && !currentPermission) {
          // إضافة صلاحية جديدة
          const expiresAt = state.expiresAt ? new Date(state.expiresAt) : undefined;
          await assignPermission(permissionId, true, state.reason, expiresAt);
        } else if (!state.granted && currentPermission) {
          // إزالة صلاحية موجودة
          await revokePermission(permissionId);
        } else if (state.granted && currentPermission && 
                  (currentPermission.reason !== state.reason || 
                   (currentPermission.expiresAt ? new Date(currentPermission.expiresAt).toISOString().split('T')[0] : '') !== state.expiresAt)) {
          // تحديث صلاحية موجودة
          const expiresAt = state.expiresAt ? new Date(state.expiresAt) : undefined;
          await revokePermission(permissionId);
          await assignPermission(permissionId, true, state.reason, expiresAt);
        }
      }

      toast.success('تم حفظ صلاحيات المستخدم بنجاح!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving user permissions:', error);
      toast.error(error.message || 'حدث خطأ أثناء حفظ الصلاحيات');
    } finally {
      setSaving(false);
    }
  };

  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = !searchTerm || 
      permission.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || permission.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(permissions.map(p => p.category).filter(Boolean))];
  const groupedPermissions = filteredPermissions.reduce((acc: any, permission: any) => {
    const category = permission.category || 'أخرى';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {});

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-tiba-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-tiba-gray-200 bg-tiba-primary-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                <KeyIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">إدارة الصلاحيات المباشرة</h2>
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
          {loading || permissionsLoading ? (
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

              {/* ملخص الصلاحيات الحالية */}
              {(rolePermissionIds.size > 0 || userDirectPermissions.length > 0) && (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {rolePermissionIds.size > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200">
                      <ShieldCheckIcon className="h-4 w-4" />
                      <span className="font-medium">{rolePermissionIds.size}</span> من الأدوار
                    </span>
                  )}
                  {userDirectPermissions.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tiba-primary-50 text-tiba-primary-700 border border-tiba-primary-200">
                      <CheckIcon className="h-4 w-4" />
                      <span className="font-medium">{userDirectPermissions.length}</span> مباشرة
                    </span>
                  )}
                  <span className="text-tiba-gray-400 text-xs">
                    الصلاحيات من الأدوار مؤشرة ولا يمكن إزالتها من هنا
                  </span>
                </div>
              )}

              {/* الصلاحيات المباشرة الحالية — التفاصيل */}
              {userDirectPermissions.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-tiba-gray-600 hover:text-tiba-gray-800 flex items-center gap-2">
                    <InformationCircleIcon className="h-4 w-4" />
                    عرض تفاصيل الصلاحيات المباشرة الحالية ({userDirectPermissions.length})
                  </summary>
                  <div className="mt-3 bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {userDirectPermissions.map((userPermission: any, index: number) => (
                      <div
                        key={userPermission.id || `user-permission-${index}`}
                        className={`p-2 rounded border text-sm ${
                          userPermission.granted 
                            ? 'bg-green-100 border-green-300 text-green-800' 
                            : 'bg-red-100 border-red-300 text-red-800'
                        }`}
                      >
                        <div className="font-medium">{userPermission.permission?.displayName || 'صلاحية غير معروفة'}</div>
                        <div className="text-xs opacity-75">
                          {userPermission.permission?.resource || 'مورد غير معروف'}.{userPermission.permission?.action || 'فعل غير معروف'}
                        </div>
                        {userPermission.reason && (
                          <div className="text-xs mt-1">السبب: {userPermission.reason}</div>
                        )}
                        {userPermission.expiresAt && (
                          <div className="text-xs mt-1">
                            ينتهي: {new Date(userPermission.expiresAt).toLocaleDateString('ar-SA')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                </details>
              )}

              {/* البحث والفلترة */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-tiba-gray-700 mb-1.5">
                    البحث في الصلاحيات
                  </label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-tiba-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pr-10 pl-4 py-2.5 border border-tiba-gray-300 rounded-lg text-sm transition-colors outline-none
                        focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500"
                      placeholder="ابحث عن صلاحية..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-tiba-gray-700 mb-1.5">
                    التصنيف
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-tiba-gray-300 rounded-lg text-sm transition-colors outline-none
                      focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500"
                  >
                    <option value="">جميع التصنيفات</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* قائمة الصلاحيات */}
              <div>
                <h3 className="font-semibold text-tiba-gray-800 mb-4">تعيين الصلاحيات المباشرة</h3>
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([category, categoryPermissions]: [string, any]) => (
                    <div key={category} className="bg-tiba-gray-50 rounded-lg p-4 border border-tiba-gray-200">
                      <h4 className="font-semibold text-tiba-gray-800 mb-3">{category}</h4>
                      <div className="space-y-3">
                        {categoryPermissions.map((permission: any) => {
                          const isFromRole = rolePermissionIds.has(permission.id);
                          const isDirectlyAssigned = permissionStates[permission.id]?.granted || false;
                          const isGranted = isFromRole || isDirectlyAssigned;

                          return (
                          <div
                            key={permission.id}
                            className={`
                              border rounded-lg p-4 transition-all
                              ${isDirectlyAssigned
                                ? 'border-tiba-primary-500 bg-tiba-primary-50' 
                                : isFromRole
                                  ? 'border-green-400 bg-green-50'
                                  : 'border-tiba-gray-200 hover:border-tiba-gray-300'
                              }
                            `}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                id={`permission-${permission.id}`}
                                checked={isGranted}
                                onChange={() => !isFromRole && handlePermissionToggle(permission.id)}
                                disabled={permission.isSystem || isFromRole}
                                className={`mt-1 h-4 w-4 rounded border-tiba-gray-300 ${
                                  isFromRole
                                    ? 'text-green-600 focus:ring-green-500 cursor-not-allowed'
                                    : 'text-tiba-primary-600 focus:ring-tiba-primary-500'
                                }`}
                              />
                              <div className="flex-1">
                                <label
                                  htmlFor={`permission-${permission.id}`}
                                  className={`cursor-pointer ${permission.isSystem || isFromRole ? 'opacity-75' : ''}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-tiba-gray-800">{permission.displayName}</span>
                                    {isFromRole && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 border border-green-200">
                                        <ShieldCheckIcon className="h-3 w-3" />
                                        من الدور
                                      </span>
                                    )}
                                    {isDirectlyAssigned && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-tiba-primary-100 text-tiba-primary-700 border border-tiba-primary-200">
                                        <CheckIcon className="h-3 w-3" />
                                        مباشرة
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-tiba-gray-600">{permission.description}</div>
                                  <div className="text-xs font-mono text-tiba-gray-500 mt-1">
                                    {permission.resource}.{permission.action}
                                  </div>
                                  {permission.isSystem && (
                                    <div className="text-xs text-tiba-warning-600 mt-1">
                                      🔒 صلاحية النظام
                                    </div>
                                  )}
                                </label>

                                {/* السبب وتاريخ الانتهاء */}
                                {permissionStates[permission.id]?.granted && (
                                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-sm font-medium text-tiba-gray-700 mb-1">
                                        سبب التعيين (اختياري)
                                      </label>
                                      <input
                                        type="text"
                                        value={permissionStates[permission.id]?.reason || ''}
                                        onChange={(e) => handleReasonChange(permission.id, e.target.value)}
                                        className="w-full px-3 py-2 border border-tiba-gray-300 rounded-lg text-sm
                                          focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none transition-colors"
                                        placeholder="سبب منح هذه الصلاحية..."
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-tiba-gray-700 mb-1">
                                        <CalendarDaysIcon className="inline h-3 w-3 mr-1" />
                                        تاريخ الانتهاء (اختياري)
                                      </label>
                                      <input
                                        type="date"
                                        value={permissionStates[permission.id]?.expiresAt || ''}
                                        onChange={(e) => handleExpirationChange(permission.id, e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 border border-tiba-gray-300 rounded-lg text-sm
                                          focus:ring-2 focus:ring-tiba-primary-500/20 focus:border-tiba-primary-500 outline-none transition-colors"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          );
                        })}
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
                      <li>الصلاحيات المباشرة تُطبّق على المستخدم مباشرة بغض النظر عن أدواره</li>
                      <li>يمكن استخدام السبب لتوثيق لماذا تم منح الصلاحية</li>
                      <li>تاريخ الانتهاء اختياري، إذا لم يتم تحديده ستكون الصلاحية دائمة</li>
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
            disabled={saving || loading || permissionsLoading}
            isLoading={saving}
            leftIcon={<KeyIcon className="h-4 w-4" />}
          >
            حفظ الصلاحيات
          </Button>
        </div>
      </div>
    </div>
  );
};
