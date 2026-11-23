require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// نسخة مطابقة لدالة seed.ts للتحقق من سلوكها
async function ensurePermissionGranted(roleId, permissionId) {
  const existing = await prisma.rolePermission.findUnique({
    where: { roleId_permissionId: { roleId, permissionId } },
  });

  if (!existing) {
    await prisma.rolePermission.create({
      data: { roleId, permissionId, granted: true },
    });
    return 'created';
  }

  if (!existing.granted) {
    await prisma.rolePermission.update({
      where: { roleId_permissionId: { roleId, permissionId } },
      data: { granted: true },
    });
    return 'reactivated';
  }

  return 'existing';
}

(async () => {
  const rolesBefore = await prisma.role.count();
  const permsBefore = await prisma.rolePermission.count();

  const perms = await prisma.permission.findMany({
    where: {
      resource: 'dashboard.trainees',
      action: { in: ['delete', 'delete-debt'] },
    },
  });
  console.log('PERMS FOUND:', perms.map((p) => `${p.resource}.${p.action}`).join(' , '));

  let tempRole = null;
  try {
    tempRole = await prisma.role.create({
      data: { name: '__seed_perm_test__', displayName: 'دور اختبار مؤقت' },
    });

    const target = perms.find((p) => p.action === 'delete-debt');

    console.log('branch1 (created)     =>', await ensurePermissionGranted(tempRole.id, target.id));
    console.log('branch2 (existing)    =>', await ensurePermissionGranted(tempRole.id, target.id));

    await prisma.rolePermission.update({
      where: { roleId_permissionId: { roleId: tempRole.id, permissionId: target.id } },
      data: { granted: false },
    });
    console.log('branch3 (reactivated) =>', await ensurePermissionGranted(tempRole.id, target.id));

    const after = await prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId: tempRole.id, permissionId: target.id } },
    });
    console.log('granted after branch3 =>', after.granted);
  } finally {
    if (tempRole) {
      await prisma.rolePermission.deleteMany({ where: { roleId: tempRole.id } });
      await prisma.role.delete({ where: { id: tempRole.id } });
    }
  }

  const rolesAfter = await prisma.role.count();
  const permsAfter = await prisma.rolePermission.count();
  console.log(`CLEANUP: roles ${rolesBefore} -> ${rolesAfter} , rolePermissions ${permsBefore} -> ${permsAfter}`);

  const real = await prisma.rolePermission.findMany({
    where: {
      permission: { resource: 'dashboard.trainees', action: { in: ['delete', 'delete-debt'] } },
    },
    include: { role: true, permission: true },
  });
  console.log('=== REAL ROLES ===');
  for (const r of real) {
    console.log(`${r.role.name} | ${r.permission.resource}.${r.permission.action} | granted=${r.granted}`);
  }

  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('FAILED', e.message);
  await prisma.$disconnect();
  process.exit(1);
});