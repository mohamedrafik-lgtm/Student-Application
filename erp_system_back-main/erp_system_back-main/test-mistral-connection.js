/**
 * اختبار اتصال Mistral AI
 * 
 * استخدام:
 * 1. تأكد من إضافة MISTRAL_API_KEY في ملف .env
 * 2. شغل: node test-mistral-connection.js
 */

require('dotenv').config();
const { Mistral } = require('@mistralai/mistralai');

async function testMistralConnection() {
  console.log('\n🔍 اختبار اتصال Mistral AI...\n');

  // 1. التحقق من وجود API Key
  const apiKey = process.env.MISTRAL_API_KEY;
  
  if (!apiKey) {
    console.error('❌ خطأ: MISTRAL_API_KEY غير موجود في ملف .env');
    console.log('\n📝 الحل:');
    console.log('   1. افتح ملف backend/.env');
    console.log('   2. أضف: MISTRAL_API_KEY=your-api-key-here');
    console.log('   3. احصل على API Key من: https://console.mistral.ai/api-keys/\n');
    process.exit(1);
  }

  console.log('✅ تم العثور على MISTRAL_API_KEY');
  console.log(`   المفتاح: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}\n`);

  // 2. محاولة الاتصال
  try {
    console.log('🔌 محاولة الاتصال بـ Mistral AI...');
    
    const mistral = new Mistral({
      apiKey: apiKey,
    });

    console.log('✅ تم إنشاء Mistral client بنجاح\n');

    // 3. اختبار بسيط
    console.log('💬 اختبار بسيط (نموذج Text)...');
    
    const response = await mistral.chat.complete({
      model: "mistral-large-latest",
      messages: [
        { role: 'user', content: 'قل مرحباً بالعربية في جملة واحدة' }
      ],
      maxTokens: 50
    });

    const reply = response.choices[0]?.message?.content;
    
    if (reply) {
      console.log('✅ نجح الاتصال!');
      console.log(`   الرد: ${reply}\n`);
    } else {
      console.error('❌ لم يتم استقبال رد من Mistral AI');
    }

  } catch (error) {
    console.error('❌ فشل الاتصال بـ Mistral AI:');
    console.error(`   الخطأ: ${error.message}\n`);
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('📝 السبب المحتمل: API Key غير صحيح');
      console.log('   الحل:');
      console.log('   1. تحقق من API Key في ملف .env');
      console.log('   2. أنشئ API Key جديد من: https://console.mistral.ai/api-keys/\n');
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      console.log('📝 السبب: تجاوزت الحصة المجانية');
      console.log('   الحل: أضف بطاقة ائتمان في Mistral Console\n');
    } else {
      console.log('📝 تحقق من:');
      console.log('   1. اتصال الإنترنت');
      console.log('   2. Firewall/Proxy settings');
      console.log('   3. رصيد الحساب في Mistral Console\n');
    }
    
    process.exit(1);
  }

  // 4. الخلاصة
  console.log('═══════════════════════════════════════');
  console.log('✅ الاختبار نجح! Mistral AI جاهز للعمل');
  console.log('═══════════════════════════════════════\n');
  console.log('الخطوات التالية:');
  console.log('1. شغل Backend: npm run start:dev');
  console.log('2. افتح صفحة تصحيح الاختبارات');
  console.log('3. ارفع صورة ورقة إجابة\n');
}

// تشغيل الاختبار
testMistralConnection().catch(console.error);
