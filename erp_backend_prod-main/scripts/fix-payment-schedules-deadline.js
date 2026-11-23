/**
 * Script لإصلاح finalDeadline في جداول مواعيد السداد
 * يحسب finalDeadline = paymentEndDate + gracePeriodDays
 * حتى لو كان gracePeriodDays = 0
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPaymentSchedulesDeadlines() {
  console.log('🔧 بدء إصلاح مواعيد السداد النهائية...\n');

  try {
    // جلب جميع جداول المواعيد
    const schedules = await prisma.feePaymentSchedule.findMany({
      include: {
        fee: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`📊 وجد ${schedules.length} جدول موعد سداد\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const schedule of schedules) {
      // إذا كان هناك paymentEndDate ولكن finalDeadline = null
      if (schedule.paymentEndDate && !schedule.finalDeadline) {
        const endDate = new Date(schedule.paymentEndDate);
        const graceDays = schedule.gracePeriodDays || 0;
        endDate.setDate(endDate.getDate() + graceDays);

        await prisma.feePaymentSchedule.update({
          where: { id: schedule.id },
          data: { finalDeadline: endDate },
        });

        console.log(`✅ تم إصلاح: ${schedule.fee.name}`);
        console.log(`   paymentEndDate: ${schedule.paymentEndDate.toLocaleDateString('ar-EG')}`);
        console.log(`   gracePeriodDays: ${graceDays}`);
        console.log(`   finalDeadline الجديد: ${endDate.toLocaleDateString('ar-EG')}\n`);

        fixedCount++;
      } else if (schedule.finalDeadline) {
        console.log(`⏭️  تخطي: ${schedule.fee.name} (لديه موعد نهائي مسبقاً)`);
        skippedCount++;
      } else {
        console.log(`⚠️  تخطي: ${schedule.fee.name} (لا يوجد paymentEndDate)`);
        skippedCount++;
      }
    }

    console.log(`\n📊 الملخص:`);
    console.log(`   ✅ تم الإصلاح: ${fixedCount}`);
    console.log(`   ⏭️  تم التخطي: ${skippedCount}`);
    console.log(`   📝 الإجمالي: ${schedules.length}\n`);

    console.log('✅ اكتملت عملية الإصلاح بنجاح!');
  } catch (error) {
    console.error('❌ خطأ في عملية الإصلاح:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل
fixPaymentSchedulesDeadlines();