#!/usr/bin/env node

/**
 * اختبار الإصلاحات الجديدة للإنتاج
 * يختبر نظام Queue ومعالجة الأخطاء
 */

const axios = require('axios');

const BASE_URL = process.env.SERVER_URL || 'http://localhost:4000';
const API_URL = `${BASE_URL}/api`;

async function testProductionFixes() {
  console.log('🧪 بدء اختبار الإصلاحات الجديدة...\n');

  try {
    // 1. اختبار حالة الواتساب
    console.log('1️⃣ اختبار حالة الواتساب...');
    try {
      const response = await axios.get(`${API_URL}/whatsapp/status`);
      console.log('✅ حالة الواتساب:', response.data);
    } catch (error) {
      console.log('⚠️ خطأ في حالة الواتساب:', error.message);
    }

    // 2. اختبار إحصائيات Queue (إذا كان متاحاً)
    console.log('\n2️⃣ اختبار إحصائيات Queue...');
    try {
      const response = await axios.get(`${API_URL}/whatsapp/queue-stats`);
      console.log('✅ إحصائيات Queue:', response.data);
    } catch (error) {
      console.log('⚠️ Queue غير متاح (طبيعي إذا لم يتم تثبيت Redis):', error.message);
    }

    // 3. اختبار إرسال رسالة (إذا كان الواتساب متصل)
    console.log('\n3️⃣ اختبار إرسال رسالة اختبارية...');
    try {
      const testMessage = {
        phoneNumber: '01234567890', // رقم اختباري
        message: '🧪 رسالة اختبار للنظام الجديد - ' + new Date().toLocaleString('ar-EG')
      };

      const response = await axios.post(`${API_URL}/whatsapp/send-message`, testMessage);
      console.log('✅ تم إرسال رسالة اختبارية:', response.data);
    } catch (error) {
      console.log('⚠️ فشل إرسال الرسالة (طبيعي إذا لم يكن الواتساب متصل):', error.message);
    }

    // 4. اختبار معالجة الأخطاء
    console.log('\n4️⃣ اختبار معالجة الأخطاء...');
    try {
      // محاولة الوصول لنقطة نهاية غير موجودة
      await axios.get(`${API_URL}/non-existent-endpoint`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ معالجة الأخطاء تعمل بشكل صحيح (404 expected)');
      } else {
        console.log('⚠️ خطأ غير متوقع:', error.message);
      }
    }

    // 5. اختبار الصحة العامة للنظام
    console.log('\n5️⃣ اختبار الصحة العامة...');
    try {
      const response = await axios.get(`${API_URL}/health`);
      console.log('✅ النظام يعمل بشكل صحيح:', response.data);
    } catch (error) {
      // محاولة نقطة نهاية بديلة
      try {
        const response = await axios.get(`${BASE_URL}`);
        console.log('✅ الخادم يعمل (status:', response.status, ')');
      } catch (error2) {
        console.log('❌ الخادم لا يعمل:', error2.message);
      }
    }

    console.log('\n🎉 انتهى الاختبار!');
    console.log('\n📋 ملخص النتائج:');
    console.log('- إذا كانت جميع الاختبارات ✅ فالنظام جاهز');
    console.log('- إذا كان هناك ⚠️ تحقق من السجلات والإعدادات');
    console.log('- إذا كان هناك ❌ تحقق من تشغيل الخادم');

  } catch (error) {
    console.error('❌ خطأ عام في الاختبار:', error.message);
    console.log('\n🔧 تحقق من:');
    console.log('1. تشغيل الخادم على', BASE_URL);
    console.log('2. إعدادات الشبكة والجدار الناري');
    console.log('3. متغيرات البيئة');
  }
}

// تشغيل الاختبار
if (require.main === module) {
  testProductionFixes().catch(console.error);
}

module.exports = { testProductionFixes };
