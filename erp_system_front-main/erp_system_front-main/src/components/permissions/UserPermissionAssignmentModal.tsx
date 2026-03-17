import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaSave, FaKey, FaSearch, FaCalendarAlt, FaInfoCircle } from 'react-icons/fa';
import { useAvailablePermissions, useUserPermissionManager } from '../../hooks/usePermissions';
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
    loading, 
    assignPermission, 
    revokePermission,
    refetch 
  } = useUserPermissionManager(user?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [permissionStates, setPermissionStates] = useState<{[key: string]: {granted: boolean, reason?: string, expiresAt?: string}}>({});
  const [saving, setSaving] = useState(false);

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-blue-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <FaKey className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">إدارة الصلاحيات المباشرة</h2>
                <p className="text-green-100 text-sm">{user.name} - {user.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading || permissionsLoading ? (
            <div className="text-center py-8">
              <FaSpinner className="h-8 w-8 animate-spin text-green-600 mx-auto mb-2" />
              <p>جاري تحميل البيانات...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* معلومات المستخدم */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">معلومات المستخدم</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">الاسم:</span>
                    <span className="font-medium mr-2">{user.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">البريد:</span>
                    <span className="font-medium mr-2">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">الحالة:</span>
                    <span className={`font-medium mr-2 ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {user.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                </div>
              </div>

              {/* الصلاحيات المباشرة الحالية */}
              {userDirectPermissions.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <FaInfoCircle className="h-4 w-4" />
                    الصلاحيات المباشرة الحالية
                  </h3>
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
              )}

              {/* البحث والفلترة */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البحث في الصلاحيات
                  </label>
                  <div className="relative">
                    <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="ابحث عن صلاحية..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    التصنيف
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                <h3 className="font-semibold text-gray-900 mb-4">تعيين الصلاحيات المباشرة</h3>
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([category, categoryPermissions]: [string, any]) => (
                    <div key={category} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">{category}</h4>
                      <div className="space-y-3">
                        {categoryPermissions.map((permission: any) => (
                          <div
                            key={permission.id}
                            className={`
                              border rounded-lg p-4 transition-all
                              ${permissionStates[permission.id]?.granted 
                                ? 'border-green-500 bg-green-50' 
                                : 'border-gray-200 hover:border-gray-300'
                              }
                            `}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                id={`permission-${permission.id}`}
                                checked={permissionStates[permission.id]?.granted || false}
                                onChange={() => handlePermissionToggle(permission.id)}
                                disabled={permission.isSystem}
                                className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                              />
                              <div className="flex-1">
                                <label
                                  htmlFor={`permission-${permission.id}`}
                                  className={`cursor-pointer ${permission.isSystem ? 'opacity-50' : ''}`}
                                >
                                  <div className="font-medium text-gray-900">{permission.displayName}</div>
                                  <div className="text-sm text-gray-600">{permission.description}</div>
                                  <div className="text-xs font-mono text-gray-500 mt-1">
                                    {permission.resource}.{permission.action}
                                  </div>
                                  {permission.isSystem && (
                                    <div className="text-xs text-amber-600 mt-1">
                                      🔒 صلاحية النظام
                                    </div>
                                  )}
                                </label>

                                {/* السبب وتاريخ الانتهاء */}
                                {permissionStates[permission.id]?.granted && (
                                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        سبب التعيين (اختياري)
                                      </label>
                                      <input
                                        type="text"
                                        value={permissionStates[permission.id]?.reason || ''}
                                        onChange={(e) => handleReasonChange(permission.id, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        placeholder="سبب منح هذه الصلاحية..."
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <FaCalendarAlt className="inline h-3 w-3 mr-1" />
                                        تاريخ الانتهاء (اختياري)
                                      </label>
                                      <input
                                        type="date"
                                        value={permissionStates[permission.id]?.expiresAt || ''}
                                        onChange={(e) => handleExpirationChange(permission.id, e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ملاحظة */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <FaInfoCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
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
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || permissionsLoading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {saving ? (
              <>
                <FaSpinner className="h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <FaSave className="h-4 w-4" />
                حفظ الصلاحيات
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
