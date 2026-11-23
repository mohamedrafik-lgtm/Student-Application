/**
 * فحص سريع: تأكيد أن حذف TraineeAuth يمسح السجلات المرتبطة تلقائياً
 * (وضع القراءة فقط - لا يحذف شيئاً)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.traineeAuth.count();
  console.log(`📊 إجمالي حسابات المنصة: ${total}`);

  const sample = await prisma.traineeAuth.findFirst({
    select: { id: true, nationalId: true, isActive: true },
  });

  if (!sample) {
    console.log('لا توجد حسابات لاختبارها.');
    return;
  }

  const [sessions, tracking, heartbeats, pageVisits, activities, stats] =
    await Promise.all([
      prisma.traineeSession.count({ where: { traineeAuthId: sample.id } }),
      prisma.traineeTrackingSession.count({ where: { traineeAuthId: sample.id } }),
      prisma.traineeHeartbeat.count({ where: { session: { traineeAuthId: sample.id } } }),
      prisma.traineePageVisit.count({ where: { session: { traineeAuthId: sample.id } } }),
      prisma.traineeActivity.count({ where: { session: { traineeAuthId: sample.id } } }),
      prisma.traineeStats.count({ where: { traineeAuthId: sample.id } }),
    ]);

  console.log(`\n🔍 حساب عينة: ${sample.id} (${sample.nationalId})`);
  console.log(`   الجلسات:            ${sessions}`);
  console.log(`   جلسات التتبع:       ${tracking}`);
  console.log(`   النبضات:            ${heartbeats}`);
  console.log(`   زيارات الصفحات:     ${pageVisits}`);
  console.log(`   الأنشطة:            ${activities}`);
  console.log(`   سجلات الإحصائيات:   ${stats}`);
  console.log(
    `\nℹ️  عند حذف هذا الحساب، كل الأرقام أعلاه ستُحذف تلقائياً (Cascade في schema).`,
  );
}

main()
  .catch((e) => {
    console.error('خطأ:', e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });