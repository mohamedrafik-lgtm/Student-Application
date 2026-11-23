import { apiClient } from './client';

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  color?: string;
  icon?: string;
  priority: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    userRoles: number;
  };
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  displayName: string;
  description?: string;
  category?: string;
  conditions?: any;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    rolePermissions: number;
    userPermissions: number;
  };
}

export interface UserPermissions {
  roles: string[];
  permissions: { [key: string]: boolean };
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
}

export interface UserRole {
  userId: string;
  roleId: string;
  assignedBy?: string;
  assignedAt: string;
  expiresAt?: string;
  isActive: boolean;
  conditions?: any;
  role: Role;
  assigner?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface UserPermission {
  userId: string;
  permissionId: string;
  granted: boolean;
  assignedBy?: string;
  assignedAt: string;
  expiresAt?: string;
  reason?: string;
  permission: Permission;
  assigner?: {
    id: string;
    name: string;
    email: string;
  };
}

// API functions for roles
export const rolesApi = {
  // الحصول على جميع الأدوار
  getAll: async (includeInactive?: boolean): Promise<Role[]> => {
    const params = includeInactive ? '?includeInactive=true' : '';
    const response = await apiClient.get(`/permissions/roles${params}`);
    return response.data;
  },

  // الحصول على دور محدد
  getById: async (id: string): Promise<Role> => {
    const response = await apiClient.get(`/permissions/roles/${id}`);
    return response.data;
  },

  // إنشاء دور جديد
  create: async (data: {
    name: string;
    displayName: string;
    description?: string;
    color?: string;
    icon?: string;
    priority?: number;
    isSystem?: boolean;
    isActive?: boolean;
  }): Promise<Role> => {
    const response = await apiClient.post('/permissions/roles', data);
    return response.data;
  },

  // تحديث دور
  update: async (id: string, data: {
    displayName?: string;
    description?: string;
    color?: string;
    icon?: string;
    priority?: number;
    isActive?: boolean;
  }): Promise<Role> => {
    const response = await apiClient.put(`/permissions/roles/${id}`, data);
    return response.data;
  },

  // حذف دور
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/permissions/roles/${id}`);
  },

  // تعيين صلاحيات للدور
  assignPermissions: async (roleId: string, data: {
    permissions: Array<{
      permissionId: string;
      granted: boolean;
    }>;
  }): Promise<void> => {
    await apiClient.post(`/permissions/roles/${roleId}/permissions`, data);
  },
};

// API functions for permissions
export const permissionsApi = {
  // الحصول على جميع الصلاحيات
  getAll: async (category?: string): Promise<Permission[]> => {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    const response = await apiClient.get(`/permissions/permissions${params}`);
    return response.data;
  },

  // الحصول على صلاحية محددة
  getById: async (id: string): Promise<Permission> => {
    const response = await apiClient.get(`/permissions/permissions/${id}`);
    return response.data;
  },

  // إنشاء صلاحية جديدة
  create: async (data: {
    resource: string;
    action: string;
    displayName: string;
    description?: string;
    category?: string;
    conditions?: any;
    isSystem?: boolean;
  }): Promise<Permission> => {
    const response = await apiClient.post('/permissions/permissions', data);
    return response.data;
  },

  // إنشاء عدة صلاحيات
  createBulk: async (permissions: Array<{
    resource: string;
    action: string;
    displayName: string;
    description?: string;
    category?: string;
    conditions?: any;
    isSystem?: boolean;
  }>): Promise<{ results: any[] }> => {
    const response = await apiClient.post('/permissions/permissions/bulk', { permissions });
    return response.data;
  },

  // تحديث صلاحية
  update: async (id: string, data: {
    displayName?: string;
    description?: string;
    category?: string;
    conditions?: any;
  }): Promise<Permission> => {
    const response = await apiClient.put(`/permissions/permissions/${id}`, data);
    return response.data;
  },

  // حذف صلاحية
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/permissions/permissions/${id}`);
  },
};

// API functions for user permissions
export const userPermissionsApi = {
  // الحصول على صلاحيات مستخدم
  getUserPermissions: async (userId: string): Promise<UserPermissions> => {
    const response = await apiClient.get(`/permissions/users/${userId}/permissions`);
    return response.data;
  },

  // الحصول على أدوار مستخدم
  getUserRoles: async (userId: string): Promise<UserRole[]> => {
    const response = await apiClient.get(`/permissions/users/${userId}/roles`);
    return response.data;
  },

  // الحصول على الصلاحيات المباشرة لمستخدم
  getUserDirectPermissions: async (userId: string): Promise<UserPermission[]> => {
    const response = await apiClient.get(`/permissions/users/${userId}/direct-permissions`);
    return response.data;
  },

  // تعيين دور لمستخدم
  assignRole: async (data: {
    userId: string;
    roleId: string;
    expiresAt?: string;
    conditions?: any;
  }): Promise<UserRole> => {
    const response = await apiClient.post('/permissions/assign-role', data);
    return response.data;
  },

  // تعيين عدة أدوار لمستخدم
  assignRolesBulk: async (data: {
    userId: string;
    roleIds: string[];
  }): Promise<{ results: any[] }> => {
    const response = await apiClient.post('/permissions/assign-roles/bulk', data);
    return response.data;
  },

  // إزالة دور من مستخدم
  revokeRole: async (userId: string, roleId: string): Promise<void> => {
    await apiClient.delete(`/permissions/users/${userId}/roles/${roleId}`);
  },

  // تعيين صلاحية مباشرة لمستخدم
  assignPermission: async (data: {
    userId: string;
    permissionId: string;
    granted?: boolean;
    expiresAt?: string;
    reason?: string;
  }): Promise<UserPermission> => {
    const response = await apiClient.post('/permissions/assign-permission', data);
    return response.data;
  },

  // تعيين عدة صلاحيات مباشرة لمستخدم
  assignPermissionsBulk: async (data: {
    userId: string;
    permissionIds: string[];
    granted?: boolean;
    reason?: string;
  }): Promise<{ results: any[] }> => {
    const response = await apiClient.post('/permissions/assign-permissions/bulk', data);
    return response.data;
  },

  // إزالة صلاحية مباشرة من مستخدم
  revokePermission: async (userId: string, permissionId: string): Promise<void> => {
    await apiClient.delete(`/permissions/users/${userId}/permissions/${permissionId}`);
  },

  // فحص صلاحية محددة لمستخدم
  checkPermission: async (userId: string, resource: string, action: string): Promise<{ hasPermission: boolean }> => {
    const response = await apiClient.get(`/permissions/check-permission/${userId}/${resource}/${action}`);
    return response.data;
  },

  // فحص دور محدد لمستخدم
  checkRole: async (userId: string, roleName: string): Promise<{ hasRole: boolean }> => {
    const response = await apiClient.get(`/permissions/check-role/${userId}/${roleName}`);
    return response.data;
  },
};

// API functions for statistics and logs
export const permissionStatsApi = {
  // الحصول على إحصائيات الصلاحيات
  getStats: async (): Promise<{
    totalRoles: number;
    activeRoles: number;
    totalPermissions: number;
    totalUsers: number;
  }> => {
    const response = await apiClient.get('/permissions/stats');
    return response.data;
  },

  // الحصول على سجل أنشطة الصلاحيات
  getLogs: async (filters?: {
    userId?: string;
    actorId?: string;
    action?: string;
    resourceType?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    const response = await apiClient.get(`/permissions/logs?${params.toString()}`);
    return response.data;
  },
};

// تصدير جميع APIs في كائن واحد
export const permissionsAPI = {
  roles: rolesApi,
  permissions: permissionsApi,
  users: userPermissionsApi,
  stats: permissionStatsApi,
};
