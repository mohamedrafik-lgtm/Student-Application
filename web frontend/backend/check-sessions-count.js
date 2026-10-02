const { PrismaClient } = require('@prisma/client');

async function checkSessions() {
  const prisma = new PrismaClient();
  
  try {
    const count = await prisma.whatsAppSession.count();
    console.log('\n📊 عدد الجلسات في قاعدة البيانات:', count);
    
    if (count > 0) {
      const sessions = await prisma.whatsAppSession.findMany({
        select: {
          key: true,
          createdAt: true,
          updatedAt: true
        },
        take: 5
      });
      
      console.log('\n🔑 أول 5 مفاتيح:');
      sessions.forEach(s => {
        console.log(`  - ${s.key} (تم التحديث: ${s.updatedAt.toLocaleString('ar-EG')})`);
      });
    } else {
      console.log('\n⚠️ لا توجد جلسات محفوظة في قاعدة البيانات!');
    }
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessions();

