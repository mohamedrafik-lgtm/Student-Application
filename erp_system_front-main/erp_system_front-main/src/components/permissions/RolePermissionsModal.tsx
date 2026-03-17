import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaSave, FaKey, FaCheck, FaSearch, FaExclamationTriangle, FaInfoCircle, FaLink } from 'react-icons/fa';
import { Role } from '../../hooks/usePermissions';
import { permissionsAPI } from '../../app/lib/api/permissions';
import {
  calculateFinalPermissions,
  validatePermissions,
  getImpliedPermissions,
  getRequiredPermissions
} from '../../utils/permissionDependencies';
import { PermissionDependencyHelper } from './PermissionDependencyHelper';
import toast from 'react-hot-toast';

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  role: Role | null;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  displayName: string;
  description?: string;
  category?: string;
  isSystem: boolean;
}

interface RolePermission {
  permissionId: string;
  granted: boolean;
}

export const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  role,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showDependencies, setShowDependencies] = useState(true);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    missingPermissions: string[];
    suggestions: string[];
  }>({ isValid: true, missingPermissions: [], suggestions: [] });

  // تحميل الصلاحيات عند فتح المودال
  useEffect(() => {
    if (isOpen && role) {
      loadPermissions();
      loadRolePermissions();
    }
  }, [isOpen, role]);

  const loadPermissions = async () => {
    setLoadingPermissions(true);
    try {
      const permissions = await permissionsAPI.permissions.getAll();
      setAllPermissions(permissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast.error('فشل في تحميل الصلاحيات');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const loadRolePermissions = async () => {
    if (!role) return;
    
    try {
      const roleData = await permissionsAPI.roles.getById(role.id);
      const permissions = roleData.rolePermissions?.map((rp: any) => ({
        permissionId: rp.permissionId,
        granted: rp.granted,
      })) || [];
      setRolePermissions(permissions);
    } catch (error) {
      console.error('Error loading role permissions:', error);
      toast.error('فشل في تحميل صلاحيات الدور');
    }
  };

  const isPermissionGranted = (permissionId: string): boolean => {
    const rolePermission = rolePermissions.find(rp => rp.permissionId === permissionId);
    return rolePermission?.granted || false;
  };

  const togglePermission = (permissionId: string) => {
    const currentlyGranted = isPermissionGranted(permissionId);
    const permission = allPermissions.find(p => p.id === permissionId);

    if (!permission) return;

    const permissionKey = `${permission.resource}.${permission.action}`;

    setRolePermissions(prev => {
      let newPermissions = [...prev];

      if (currentlyGranted) {
        // إزالة الصلاحية
        newPermissions = newPermissions.map(rp =>
          rp.permissionId === permissionId
            ? { ...rp, granted: false }
            : rp
        );
      } else {
        // إضافة الصلاحية
        const existing = newPermissions.find(rp => rp.permissionId === permissionId);
        if (existing) {
          newPermissions = newPermissions.map(rp =>
            rp.permissionId === permissionId
              ? { ...rp, granted: true }
              : rp
          );
        } else {
          newPermissions.push({ permissionId, granted: true });
        }

        // إضافة الصلاحيات المترابطة تلقائياً
        if (showDependencies) {
          const impliedPermissions = getImpliedPermissions(permissionKey);

          impliedPermissions.forEach(impliedPermKey => {
            const impliedPerm = allPermissions.find(p => `${p.resource}.${p.action}` === impliedPermKey);
            if (impliedPerm) {
              const existingImplied = newPermissions.find(rp => rp.permissionId === impliedPerm.id);
              if (existingImplied) {
                if (!existingImplied.granted) {
                  newPermissions = newPermissions.map(rp =>
                    rp.permissionId === impliedPerm.id
                      ? { ...rp, granted: true }
                      : rp
                  );
                }
              } else {
                newPermissions.push({ permissionId: impliedPerm.id, granted: true });
              }
            }
          });
        }
      }

      return newPermissions;
    });
  };

  // التحقق من صحة الصلاحيات عند تغييرها
  useEffect(() => {
    const grantedPermissions = rolePermissions
      .filter(rp => rp.granted)
      .map(rp => {
        const permission = allPermissions.find(p => p.id === rp.permissionId);
        return permission ? `${permission.resource}.${permission.action}` : '';
      })
      .filter(Boolean);

    const validation = validatePermissions(grantedPermissions);
    setValidationResult(validation);
  }, [rolePermissions, allPermissions]);

  const handleSave = async () => {
    if (!role) return;

    // تحذير إذا كانت هناك صلاحيات مطلوبة مفقودة
    if (!validationResult.isValid) {
      const confirmSave = window.confirm(
        `تحذير: هناك ${validationResult.missingPermissions.length} صلاحية مطلوبة مفقودة.\n\n` +
        `هذا قد يؤثر على عمل بعض الميزات بشكل صحيح.\n\n` +
        `هل تريد المتابعة والحفظ على أي حال؟`
      );

      if (!confirmSave) {
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        permissions: rolePermissions.map(rp => ({
          permissionId: rp.permissionId,
          granted: rp.granted,
        })),
      };

      console.log('Sending payload:', JSON.stringify(payload, null, 2));

      await permissionsAPI.roles.assignPermissions(role.id, payload);

      if (!validationResult.isValid) {
        toast.success('تم تحديث صلاحيات الدور مع تحذيرات!', {
          duration: 4000,
        });
      } else {
        toast.success('تم تحديث صلاحيات الدور بنجاح!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating role permissions:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحديث الصلاحيات');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setRolePermissions([]);
    setValidationResult({ isValid: true, missingPermissions: [], suggestions: [] });
    onClose();
  };

  // دالة للحصول على الصلاحيات المترابطة لصلاحية معينة
  const getRelatedPermissions = (permission: Permission) => {
    const permissionKey = `${permission.resource}.${permission.action}`;
    const required = getRequiredPermissions(permissionKey);
    const implied = getImpliedPermissions(permissionKey);

    return {
      required: required.map(reqKey => {
        const [resource, action] = reqKey.split('.');
        return allPermissions.find(p => p.resource === resource && p.action === action);
      }).filter(Boolean),
      implied: implied.map(impKey => {
        const [resource, action] = impKey.split('.');
        return allPermissions.find(p => p.resource === resource && p.action === action);
      }).filter(Boolean)
    };
  };

  // دالة للتحقق من كون الصلاحية مُضمنة تلقائياً
  const isImpliedPermission = (permissionId: string): boolean => {
    const permission = allPermissions.find(p => p.id === permissionId);
    if (!permission) return false;

    const permissionKey = `${permission.resource}.${permission.action}`;

    // البحث في جميع الصلاحيات الممنوحة لمعرفة إذا كانت هذه الصلاحية مُضمنة
    const grantedPermissions = rolePermissions
      .filter(rp => rp.granted && rp.permissionId !== permissionId)
      .map(rp => {
        const grantedPerm = allPermissions.find(p => p.id === rp.permissionId);
        return grantedPerm ? `${grantedPerm.resource}.${grantedPerm.action}` : '';
      })
      .filter(Boolean);

    return grantedPermissions.some(grantedKey => {
      const implied = getImpliedPermissions(grantedKey);
      return implied.includes(permissionKey);
    });
  };

  if (!isOpen || !role) return null;

  // منع تعديل صلاحيات مدير النظام الرئيسي
  const isSuperAdmin = role.name === 'super_admin';

  if (isSuperAdmin) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-500 to-orange-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <FaExclamationTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    دور محمي
                  </h2>
                  <p className="text-white/80 text-sm">
                    مدير النظام الرئيسي
                  </p>
                </div>
              </div>
              <button
                onClick={resetModal}
                className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaExclamationTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              لا يمكن تعديل الصلاحيات
            </h3>
            <p className="text-gray-600 mb-4">
              دور مدير النظام الرئيسي محمي ولا يمكن تعديل صلاحياته لأسباب أمنية.
              يحصل هذا الدور على جميع الصلاحيات تلقائياً.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-blue-700">
                <FaInfoCircle className="h-4 w-4" />
                <span className="text-sm font-medium">معلومة</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                يتم منح جميع الصلاحيات الجديدة لهذا الدور تلقائياً عند إنشائها
              </p>
            </div>
            <button
              onClick={resetModal}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              فهمت
            </button>
          </div>
        </div>
      </div>
    );
  }

  // فلترة الصلاحيات
  const filteredPermissions = allPermissions.filter(permission => {
    const matchesSearch = !searchTerm || 
      permission.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || permission.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // تجميع الصلاحيات حسب الفئة
  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    const category = permission.category || 'أخرى';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  // الحصول على جميع الفئات
  const categories = Array.from(new Set(allPermissions.map(p => p.category).filter(Boolean)));

  const grantedCount = rolePermissions.filter(rp => rp.granted).length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <FaKey className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  إدارة صلاحيات الدور
                </h2>
                <p className="text-white/80 text-sm">
                  {role.displayName} - {grantedCount} صلاحية ممنوحة
                </p>
              </div>
            </div>
            <button
              onClick={resetModal}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* البحث */}
            <div className="relative">
              <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ابحث في الصلاحيات..."
              />
            </div>

            {/* فلترة الفئات */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">جميع الفئات</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* خيارات إضافية */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showDependencies}
                  onChange={(e) => setShowDependencies(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <FaLink className="h-3 w-3 text-blue-500" />
                تطبيق الترابط التلقائي للصلاحيات
              </label>
            </div>

            {!validationResult.isValid && (
              <div className="flex items-center gap-2 text-amber-600">
                <FaExclamationTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {validationResult.missingPermissions.length} صلاحية مطلوبة مفقودة
                </span>
              </div>
            )}
          </div>

          {/* رسائل التحذير */}
          {!validationResult.isValid && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <FaExclamationTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-amber-800 mb-1">
                    صلاحيات مطلوبة مفقودة
                  </h4>
                  <ul className="text-xs text-amber-700 space-y-1">
                    {validationResult.suggestions.slice(0, 3).map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                    {validationResult.suggestions.length > 3 && (
                      <li className="text-amber-600">
                        ... و {validationResult.suggestions.length - 3} اقتراحات أخرى
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loadingPermissions ? (
            <div className="text-center py-8">
              <FaSpinner className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">جاري تحميل الصلاحيات...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* مساعد الترابطات */}
              <PermissionDependencyHelper
                allPermissions={allPermissions}
                selectedPermissions={rolePermissions.filter(rp => rp.granted).map(rp => rp.permissionId)}
                onPermissionToggle={togglePermission}
              />
              {Object.entries(groupedPermissions).map(([category, permissions]) => (
                <div key={category} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FaKey className="h-4 w-4 text-blue-500" />
                    {category} ({permissions.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.map((permission) => {
                      const isGranted = isPermissionGranted(permission.id);
                      const isImplied = isImpliedPermission(permission.id);
                      const relatedPerms = getRelatedPermissions(permission);

                      return (
                        <div
                          key={permission.id}
                          className={`
                            p-3 rounded-lg border-2 cursor-pointer transition-all relative
                            ${isGranted
                              ? isImplied
                                ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                                : 'bg-green-50 border-green-200 hover:border-green-300'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                            }
                          `}
                          onClick={() => togglePermission(permission.id)}
                        >
                          {/* مؤشر الصلاحية المُضمنة */}
                          {isImplied && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <FaLink className="h-2 w-2 text-white" />
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-gray-900">
                                  {permission.displayName}
                                </span>
                                {isGranted && (
                                  <FaCheck className={`h-3 w-3 ${isImplied ? 'text-blue-600' : 'text-green-600'}`} />
                                )}
                                {isImplied && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                    مُضمنة
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mb-1">
                                {permission.description}
                              </p>
                              <div className="text-xs font-mono text-gray-500 mb-2">
                                {permission.resource}.{permission.action}
                              </div>

                              {/* عرض الصلاحيات المترابطة */}
                              {(relatedPerms.required.length > 0 || relatedPerms.implied.length > 0) && (
                                <div className="text-xs space-y-1">
                                  {relatedPerms.required.length > 0 && (
                                    <div className="flex items-center gap-1 text-amber-600">
                                      <FaExclamationTriangle className="h-2.5 w-2.5" />
                                      <span>يتطلب: {relatedPerms.required.map(p => p?.displayName).join(', ')}</span>
                                    </div>
                                  )}
                                  {relatedPerms.implied.length > 0 && (
                                    <div className="flex items-center gap-1 text-blue-600">
                                      <FaInfoCircle className="h-2.5 w-2.5" />
                                      <span>يتضمن: {relatedPerms.implied.map(p => p?.displayName).join(', ')}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="ml-3">
                              <div
                                className={`
                                  w-5 h-5 rounded border-2 flex items-center justify-center
                                  ${isGranted
                                    ? isImplied
                                      ? 'bg-blue-500 border-blue-500'
                                      : 'bg-green-500 border-green-500'
                                    : 'border-gray-300'
                                  }
                                `}
                              >
                                {isGranted && (
                                  <FaCheck className="h-3 w-3 text-white" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span>{grantedCount} من {allPermissions.length} صلاحية ممنوحة</span>
              {showDependencies && (
                <span className="flex items-center gap-1 text-blue-600">
                  <FaLink className="h-3 w-3" />
                  الترابط مُفعل
                </span>
              )}
              {!validationResult.isValid && (
                <span className="flex items-center gap-1 text-amber-600">
                  <FaExclamationTriangle className="h-3 w-3" />
                  {validationResult.missingPermissions.length} مطلوبة
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={resetModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium order-2 sm:order-1"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className={`px-6 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors font-medium shadow-sm order-1 sm:order-2 ${
                  !validationResult.isValid
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                title={!validationResult.isValid ? 'تحذير: بعض الصلاحيات المطلوبة مفقودة - انقر للحفظ مع التحذير' : 'حفظ التغييرات'}
              >
                {loading ? (
                  <>
                    <FaSpinner className="h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : !validationResult.isValid ? (
                  <>
                    <FaExclamationTriangle className="h-4 w-4" />
                    حفظ مع التحذيرات
                  </>
                ) : (
                  <>
                    <FaSave className="h-4 w-4" />
                    حفظ التغييرات
                  </>
                )}
              </button>
            </div>
          </div>

          {/* شرح الرموز */}
          <div className="flex items-center gap-6 text-xs text-gray-500 pt-2 border-t border-gray-200">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>صلاحية مُختارة</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded relative">
                <FaLink className="h-1.5 w-1.5 text-white absolute top-0.5 right-0.5" />
              </div>
              <span>صلاحية مُضمنة تلقائياً</span>
            </div>
            <div className="flex items-center gap-1">
              <FaExclamationTriangle className="h-3 w-3 text-amber-500" />
              <span>صلاحية مطلوبة</span>
            </div>
            <div className="flex items-center gap-1">
              <FaInfoCircle className="h-3 w-3 text-blue-500" />
              <span>صلاحيات مُضمنة</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
