-- إضافة صلاحيات تقارير القيود والخزائن
-- تاريخ: 2025-10-18

-- 1. إضافة صلاحيات تقارير القيود المالية
INSERT INTO `Permission` (`resource`, `action`, `displayName`, `description`, `category`, `createdAt`, `updatedAt`)
VALUES
  ('finances.entries.reports', 'view', 'عرض تقارير القيود المالية', 'عرض وطباعة تقارير القيود المالية', 'النظام المالي', NOW(), NOW()),
  ('finances.entries.reports', 'export', 'تصدير تقارير القيود المالية', 'تصدير وطباعة تقارير القيود المالية', 'النظام المالي', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `displayName` = VALUES(`displayName`),
  `description` = VALUES(`description`),
  `updatedAt` = NOW();

-- 2. إضافة صلاحيات إدارة الخزائن
INSERT INTO `Permission` (`resource`, `action`, `displayName`, `description`, `category`, `createdAt`, `updatedAt`)
VALUES
  ('finances.safes', 'view', 'عرض الخزائن', 'عرض قائمة الخزائن ومعاملاتها', 'النظام المالي', NOW(), NOW()),
  ('finances.safes', 'create', 'إنشاء خزينة', 'إنشاء خزينة جديدة', 'النظام المالي', NOW(), NOW()),
  ('finances.safes', 'edit', 'تعديل الخزائن', 'تعديل بيانات الخزائن', 'النظام المالي', NOW(), NOW()),
  ('finances.safes', 'delete', 'حذف الخزائن', 'حذف الخزائن', 'النظام المالي', NOW(), NOW()),
  ('finances.safes.transactions', 'view', 'عرض معاملات الخزينة', 'عرض معاملات وحركة الخزينة', 'النظام المالي', NOW(), NOW()),
  ('finances.safes.transactions', 'create', 'إنشاء معاملة مالية', 'إنشاء إيداع أو سحب من الخزينة', 'النظام المالي', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `displayName` = VALUES(`displayName`),
  `description` = VALUES(`description`),
  `updatedAt` = NOW();

-- 3. إضافة الصلاحيات لدور المحاسب (accountant)
INSERT INTO `RolePermission` (`roleId`, `permissionId`, `granted`, `createdAt`, `updatedAt`)
SELECT 
  r.id as roleId,
  p.id as permissionId,
  1 as granted,
  NOW() as createdAt,
  NOW() as updatedAt
FROM `Role` r
CROSS JOIN `Permission` p
WHERE r.name = 'accountant'
  AND (
    p.resource LIKE 'finances.entries.reports%' OR
    p.resource LIKE 'finances.safes%'
  )
ON DUPLICATE KEY UPDATE
  `granted` = 1,
  `updatedAt` = NOW();

-- 4. إضافة الصلاحيات لدور مدير النظام (admin)
INSERT INTO `RolePermission` (`roleId`, `permissionId`, `granted`, `createdAt`, `updatedAt`)
SELECT 
  r.id as roleId,
  p.id as permissionId,
  1 as granted,
  NOW() as createdAt,
  NOW() as updatedAt
FROM `Role` r
CROSS JOIN `Permission` p
WHERE r.name = 'admin'
  AND (
    p.resource LIKE 'finances.entries.reports%' OR
    p.resource LIKE 'finances.safes%'
  )
ON DUPLICATE KEY UPDATE
  `granted` = 1,
  `updatedAt` = NOW();

-- 5. إضافة الصلاحيات لدور المدير الأعلى (super_admin)
INSERT INTO `RolePermission` (`roleId`, `permissionId`, `granted`, `createdAt`, `updatedAt`)
SELECT 
  r.id as roleId,
  p.id as permissionId,
  1 as granted,
  NOW() as createdAt,
  NOW() as updatedAt
FROM `Role` r
CROSS JOIN `Permission` p
WHERE r.name = 'super_admin'
  AND (
    p.resource LIKE 'finances.entries.reports%' OR
    p.resource LIKE 'finances.safes%'
  )
ON DUPLICATE KEY UPDATE
  `granted` = 1,
  `updatedAt` = NOW();

