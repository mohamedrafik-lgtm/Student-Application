import React, { useState } from 'react';
import { FaInfoCircle, FaLink, FaExclamationTriangle, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { 
  getRequiredPermissions, 
  getImpliedPermissions, 
  validatePermissions,
  calculateFinalPermissions 
} from '../../utils/permissionDependencies';

interface Permission {
  id: string;
  resource: string;
  action: string;
  displayName: string;
  description?: string;
  category?: string;
}

interface PermissionDependencyHelperProps {
  allPermissions: Permission[];
  selectedPermissions: string[]; // IDs of selected permissions
  onPermissionToggle: (permissionId: string) => void;
}

export const PermissionDependencyHelper: React.FC<PermissionDependencyHelperProps> = ({
  allPermissions,
  selectedPermissions,
  onPermissionToggle,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // تحويل IDs إلى permission keys
  const selectedPermissionKeys = selectedPermissions
    .map(id => {
      const permission = allPermissions.find(p => p.id === id);
      return permission ? `${permission.resource}.${permission.action}` : '';
    })
    .filter(Boolean);

  // حساب الصلاحيات النهائية
  const finalPermissions = calculateFinalPermissions(selectedPermissionKeys);
  
  // التحقق من صحة الصلاحيات
  const validation = validatePermissions(selectedPermissionKeys);

  // الحصول على الصلاحيات المُضمنة
  const impliedPermissionKeys = finalPermissions.filter(key => !selectedPermissionKeys.includes(key));
  const impliedPermissions = impliedPermissionKeys.map(key => {
    const [resource, action] = key.split('.');
    return allPermissions.find(p => p.resource === resource && p.action === action);
  }).filter(Boolean);

  // الحصول على الصلاحيات المطلوبة المفقودة
  const missingPermissions = validation.missingPermissions.map(key => {
    const [resource, action] = key.split('.');
    return allPermissions.find(p => p.resource === resource && p.action === action);
  }).filter(Boolean);

  const handleAddMissingPermissions = () => {
    missingPermissions.forEach(permission => {
      if (permission && !selectedPermissions.includes(permission.id)) {
        onPermissionToggle(permission.id);
      }
    });
  };

  if (selectedPermissions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-600">
          <FaInfoCircle className="h-4 w-4" />
          <span className="text-sm">اختر صلاحيات لعرض الترابطات والتبعيات</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div 
        className="px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaLink className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-gray-900">ملخص الترابطات والتبعيات</span>
          </div>
          <div className="flex items-center gap-3">
            {!validation.isValid && (
              <span className="flex items-center gap-1 text-amber-600 text-sm">
                <FaExclamationTriangle className="h-3 w-3" />
                {validation.missingPermissions.length} مطلوبة
              </span>
            )}
            {impliedPermissions.length > 0 && (
              <span className="flex items-center gap-1 text-blue-600 text-sm">
                <FaInfoCircle className="h-3 w-3" />
                {impliedPermissions.length} مُضمنة
              </span>
            )}
            {isExpanded ? (
              <FaChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <FaChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* الصلاحيات المطلوبة المفقودة */}
          {!validation.isValid && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FaExclamationTriangle className="h-4 w-4 text-amber-500" />
                  <h4 className="font-medium text-amber-800">صلاحيات مطلوبة مفقودة</h4>
                </div>
                <button
                  onClick={handleAddMissingPermissions}
                  className="text-xs bg-amber-600 text-white px-2 py-1 rounded hover:bg-amber-700 transition-colors"
                >
                  إضافة الكل
                </button>
              </div>
              <div className="space-y-1">
                {missingPermissions.map((permission) => (
                  <div 
                    key={permission?.id}
                    className="flex items-center justify-between text-sm text-amber-700 bg-amber-100 rounded px-2 py-1"
                  >
                    <span>{permission?.displayName}</span>
                    <button
                      onClick={() => permission && onPermissionToggle(permission.id)}
                      className="text-xs text-amber-600 hover:text-amber-800"
                    >
                      إضافة
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* الصلاحيات المُضمنة تلقائياً */}
          {impliedPermissions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <FaInfoCircle className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium text-blue-800">صلاحيات مُضمنة تلقائياً</h4>
              </div>
              <div className="space-y-1">
                {impliedPermissions.map((permission) => (
                  <div 
                    key={permission?.id}
                    className="text-sm text-blue-700 bg-blue-100 rounded px-2 py-1"
                  >
                    {permission?.displayName}
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                هذه الصلاحيات ستُمنح تلقائياً بناءً على الصلاحيات المختارة
              </p>
            </div>
          )}

          {/* ملخص الإحصائيات */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h4 className="font-medium text-gray-800 mb-2">ملخص الإحصائيات</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{selectedPermissions.length}</div>
                <div className="text-gray-600">مُختارة</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{impliedPermissions.length}</div>
                <div className="text-gray-600">مُضمنة</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-600">{validation.missingPermissions.length}</div>
                <div className="text-gray-600">مطلوبة</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{finalPermissions.length}</div>
                <div className="text-gray-600">إجمالي</div>
              </div>
            </div>
          </div>

          {/* نصائح */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <FaInfoCircle className="h-4 w-4 text-indigo-500" />
              <h4 className="font-medium text-indigo-800">نصائح</h4>
            </div>
            <ul className="text-sm text-indigo-700 space-y-1">
              <li>• الصلاحيات المُضمنة تُمنح تلقائياً ولا تحتاج لاختيار منفصل</li>
              <li>• الصلاحيات المطلوبة ضرورية لعمل الصلاحيات المختارة</li>
              <li>• يمكن إيقاف الترابط التلقائي من الإعدادات أعلاه</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
