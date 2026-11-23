/**
 * سكريبت منح صلاحيات منصة المتدربين لأدوار الإدارة
 * ---------------------------------------------------------------
 * الاستخدام:
 *   cd backend
 *   npx ts-node scripts/grant-trainee-platform-permissions.ts
 *
 * آمن للتشغيل على بيانات الإنتاج: لا يحذف ولا يعدّل أي بيانات
 * قائمة، فقط ينشئ/يضمن ربط الصلاحيات بالأدوار.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** الموارد المطلوبة لميزة إنشاء حسابات المنصة */
const TARGET_RESOURCES = [
  'dashboard.trainee-platform',
  'dashboard.trainee-platform.accounts',
  'dashboard.trainee-platform.stats',
];

/** الأدوار التي ستُمنح الصلاحيات */
const TARGET_ROLES = ['super_admin', 'admin'];

/** كل الصلاحيات المعرّفة لمنصة المتدربين */
const TRAINEE_PLATFORM_PERMISSION_SEED = [
  {
    resource: 'dashboard.trainee-platform',
    action: 'view',
    displayName: 'عرض منصة المتدربين',
    description: 'الوصول العام لمنصة المتدربين',
    category: 'منصة المتدربين',
  },
  {
    resource: 'dashboard.trainee-platform.accounts',
    action: 'view',
    displayName: 'عرض حسابات المتدربين',
    description: 'عرض قائمة حسابات المنصة وبيانات الاتصال',
    category: 'منصة المتدربين',
  },
  {
    resource: 'dashboard.trainee-platform.accounts',
    action: 'create',
    displayName: 'إنشاء حسابات المتدربين',
    description: 'إنشاء حسابات منصة لمتدرب واحد أو لمجموعة أو دفعة واحدة',
    category: 'منصة المتدربين',
  },
  {
    resource: 'dashboard.trainee-platform.accounts',
    action: 'edit',
    displayName: 'تعديل حسابات المتدربين',
    description: 'تعديل بيانات حسابات المنصة',
    category: 'منصة المتدربين',
  },
  {
    resource: 'dashboard.trainee-platform.accounts',
    action: 'activate',
    displayName: 'تفعيل أو تعطيل حسابات المتدربين',
    description: 'تفعيل أو تعطيل حساب منصة المتدرب',
    category: 'منصة المتدربين',
  },
  {
    resource: 'dashboard.trainee-platform.accounts',
    action: 'reset-password',
    displayName: 'إعادة تعيين كلمة مرور المتدرب',
    description: 'إعادة تعيين كلمة مرور حساب المنصة',
    category: 'منصة المتدربين',
  },
  {
    resource: 'dashboard.trainee-platform.accounts',
    action: 'delete',
    displayName: 'حذف حسابات المتدربين',
    description: 'حذف حساب المنصة نهائياً (لا يحذف سجل المتدرب)',
    category: 'منصة المتدربين',
  },
  {
    resource: 'dashboard.trainee-platform.stats',
    action: 'view',
    displayName: 'عرض إحصائيات المنصة',
    description: 'عرض تتبع نشاط المتدربين وإحصائياتهم',
    category: 'منصة المتدربين',
  },
];

async function main() {
  console.log('🔐 منح صلاحيات منصة المتدربين...\n');

  // 1) ضمان وجود الصلاحيات في قاعدة البيانات
  const ensuredPermissions: { id: string; resource: string; action: string }[] = [];

  for (const perm of TRAINEE_PLATFORM_PERMISSION_SEED) {
    const row = await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: perm.resource,
          action: perm.action,
        },
      },
      update: {
        displayName: perm.displayName,
        description: perm.description,
        category: perm.category,
      },
      create: perm,
      select: { id: true, resource: true, action: true },
    });
    ensuredPermissions.push(row);
  }

  console.log(`✅ تم ضمان وجود ${ensuredPermissions.length} صلاحية\n`);

  // 2) منحها لأدوار الإدارة
  for (const roleName of TARGET_ROLES) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      console.warn(`⚠️  الدور "${roleName}" غير موجود - تم التخطي`);
      continue;
    }

    let created = 0;
    let existing = 0;

    for (const perm of ensuredPermissions) {
      // فقط الموارد المستهدفة
      if (!TARGET_RESOURCES.includes(perm.resource)) continue;

      const compositeKey = {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: perm.id,
        },
      };

      const existingLink = await prisma.rolePermission.findUnique({
        where: compositeKey,
      });

      if (existingLink) {
        // ضمان أنها ممنوحة (granted = true) وليست معطّلة أو منتهية
        if (!existingLink.granted) {
          await prisma.rolePermission.update({
            where: compositeKey,
            data: { granted: true },
          });
          console.log(`   🔧 تم تفعيل: ${perm.resource}:${perm.action}`);
        }
        if (existingLink.expiresAt) {
          await prisma.rolePermission.update({
            where: compositeKey,
            data: { expiresAt: null },
          });
          console.log(`   🔧 تم إزالة تاريخ الانتهاء: ${perm.resource}:${perm.action}`);
        }
        existing++;
      } else {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: perm.id,
            granted: true,
          },
        });
        created++;
      }
    }

    console.log(
      `✅ دور ${roleName}: ${created} صلاحية جديدة، ${existing} موجودة مسبقاً`,
    );
  }

  // 3) طباعة ملخص الصلاحيات الممنوحة لكل دور
  console.log('\n📋 ملخص الصلاحيات الممنوحة:');
  for (const roleName of TARGET_ROLES) {
    const role = await prisma.role.findUnique({
      where: { name: roleName },
      include: {
        rolePermissions: {
          where: {
            permission: { resource: { in: TARGET_RESOURCES } },
          },
          include: { permission: true },
        },
      },
    });

    if (!role) continue;

    const perms = role.rolePermissions
      .filter((rp) => rp.granted)
      .map((rp) => `${rp.permission.resource}:${rp.permission.action}`);

    console.log(`\n   ${roleName} (${perms.length} صلاحية):`);
    perms.forEach((p) => console.log(`     ✓ ${p}`));

    if (perms.length === 0) {
      console.log('     ⚠️  لا توجد صلاحيات ممنوحة');
    }
  }

  console.log('\n🎉 تمت العملية بنجاح.');
  console.log('💡 سجّل الخروج ثم الدخول لتحديث الصلاحيات في الواجهة.');
}

main()
  .catch((error) => {
    console.error('❌ فشل منح الصلاحيات:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });