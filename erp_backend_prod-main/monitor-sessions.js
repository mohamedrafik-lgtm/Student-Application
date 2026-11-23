const { PrismaClient } = require('@prisma/client');

async function monitorSessions() {
  const prisma = new PrismaClient();
  
  console.log('\n🔍 مراقبة الجلسات كل 2 ثانية...');
  console.log('اضغط Ctrl+C لإيقاف المراقبة\n');
  
  let previousCount = -1;
  
  const monitor = setInterval(async () => {
    try {
      const count = await prisma.whatsAppSession.count();
      const timestamp = new Date().toLocaleTimeString('ar-EG');
      
      if (count !== previousCount) {
        if (previousCount === -1) {
          console.log(`[${timestamp}] 📊 عدد الجلسات: ${count}`);
        } else if (count > previousCount) {
          console.log(`[${timestamp}] ✅ زادت الجلسات: ${previousCount} → ${count} (+${count - previousCount})`);
        } else {
          console.log(`[${timestamp}] 🚨 نقصت الجلسات: ${previousCount} → ${count} (-${previousCount - count})`);
        }
        previousCount = count;
      }
    } catch (error) {
      console.error(`❌ خطأ في المراقبة:`, error.message);
    }
  }, 2000);
  
  // معالج لإيقاف المراقبة
  process.on('SIGINT', async () => {
    console.log('\n\n⏹️ إيقاف المراقبة...');
    clearInterval(monitor);
    await prisma.$disconnect();
    process.exit(0);
  });
}

monitorSessions();

