#!/usr/bin/env node

/**
 * سكريبت اختبار إصلاح مشكلة IPC Channel Closed في WhatsApp
 * يتحقق من استقرار النظام وقدرته على إرسال الرسائل
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TEST_PHONE = '01012345678'; // رقم اختبار
const TEST_MESSAGE = 'اختبار إصلاح مشكلة IPC Channel - ' + new Date().toLocaleString('ar-EG');

// ألوان للطباعة
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testWhatsAppStatus() {
  try {
    log('🔍 فحص حالة نظام WhatsApp...', 'blue');
    const response = await axios.get(`${BASE_URL}/whatsapp/status`);
    
    if (response.data.isConnected && response.data.isReady) {
      log('✅ نظام WhatsApp متصل وجاهز', 'green');
      return true;
    } else {
      log('⚠️ نظام WhatsApp غير جاهز:', 'yellow');
      console.log(response.data);
      return false;
    }
  } catch (error) {
    log('❌ خطأ في فحص حالة WhatsApp:', 'red');
    console.error(error.message);
    return false;
  }
}

async function testSendMessage() {
  try {
    log('📤 اختبار إرسال رسالة...', 'blue');
    const response = await axios.post(`${BASE_URL}/whatsapp/send-message`, {
      phoneNumber: TEST_PHONE,
      message: TEST_MESSAGE
    });
    
    if (response.data.success) {
      log('✅ تم إرسال الرسالة بنجاح', 'green');
      return true;
    } else {
      log('❌ فشل في إرسال الرسالة:', 'red');
      console.log(response.data);
      return false;
    }
  } catch (error) {
    log('❌ خطأ في إرسال الرسالة:', 'red');
    console.error(error.response?.data || error.message);
    return false;
  }
}

async function testPasswordReset() {
  try {
    log('🔑 اختبار إرسال رسالة إعادة تعيين كلمة المرور...', 'blue');
    const response = await axios.post(`${BASE_URL}/auth/request-password-reset`, {
      phoneNumber: TEST_PHONE
    });
    
    if (response.data.success || response.status === 200) {
      log('✅ تم إرسال رسالة إعادة تعيين كلمة المرور', 'green');
      return true;
    } else {
      log('❌ فشل في إرسال رسالة إعادة تعيين كلمة المرور:', 'red');
      console.log(response.data);
      return false;
    }
  } catch (error) {
    log('❌ خطأ في إرسال رسالة إعادة تعيين كلمة المرور:', 'red');
    console.error(error.response?.data || error.message);
    return false;
  }
}

async function testStressTest() {
  log('🔄 اختبار الضغط - إرسال عدة رسائل متتالية...', 'blue');
  
  let successCount = 0;
  let failCount = 0;
  const totalTests = 5;
  
  for (let i = 1; i <= totalTests; i++) {
    try {
      const response = await axios.post(`${BASE_URL}/whatsapp/send-message`, {
        phoneNumber: TEST_PHONE,
        message: `اختبار ضغط رقم ${i} - ${new Date().toLocaleTimeString('ar-EG')}`
      });
      
      if (response.data.success) {
        log(`  ✅ اختبار ${i}/${totalTests} نجح`, 'green');
        successCount++;
      } else {
        log(`  ❌ اختبار ${i}/${totalTests} فشل`, 'red');
        failCount++;
      }
    } catch (error) {
      log(`  ❌ اختبار ${i}/${totalTests} فشل: ${error.message}`, 'red');
      failCount++;
    }
    
    // انتظار قصير بين الاختبارات
    await sleep(2000);
  }
  
  log(`📊 نتائج اختبار الضغط: ${successCount} نجح، ${failCount} فشل`, 
      successCount > failCount ? 'green' : 'red');
  
  return successCount > failCount;
}

async function runAllTests() {
  log('🚀 بدء اختبار إصلاح مشكلة IPC Channel Closed', 'blue');
  log('=' .repeat(50), 'blue');
  
  const results = {
    status: false,
    sendMessage: false,
    passwordReset: false,
    stressTest: false
  };
  
  // اختبار 1: فحص الحالة
  results.status = await testWhatsAppStatus();
  await sleep(2000);
  
  if (!results.status) {
    log('❌ النظام غير جاهز، توقف الاختبارات', 'red');
    return;
  }
  
  // اختبار 2: إرسال رسالة عادية
  results.sendMessage = await testSendMessage();
  await sleep(3000);
  
  // اختبار 3: إرسال رسالة إعادة تعيين كلمة المرور
  results.passwordReset = await testPasswordReset();
  await sleep(3000);
  
  // اختبار 4: اختبار الضغط
  results.stressTest = await testStressTest();
  
  // النتائج النهائية
  log('=' .repeat(50), 'blue');
  log('📋 ملخص نتائج الاختبار:', 'blue');
  log(`   🔍 فحص الحالة: ${results.status ? '✅ نجح' : '❌ فشل'}`, 
      results.status ? 'green' : 'red');
  log(`   📤 إرسال رسالة: ${results.sendMessage ? '✅ نجح' : '❌ فشل'}`, 
      results.sendMessage ? 'green' : 'red');
  log(`   🔑 إعادة تعيين كلمة المرور: ${results.passwordReset ? '✅ نجح' : '❌ فشل'}`, 
      results.passwordReset ? 'green' : 'red');
  log(`   🔄 اختبار الضغط: ${results.stressTest ? '✅ نجح' : '❌ فشل'}`, 
      results.stressTest ? 'green' : 'red');
  
  const successCount = Object.values(results).filter(r => r).length;
  const totalTests = Object.keys(results).length;
  
  log('=' .repeat(50), 'blue');
  
  if (successCount === totalTests) {
    log('🎉 جميع الاختبارات نجحت! إصلاح IPC يعمل بشكل ممتاز', 'green');
  } else if (successCount >= totalTests / 2) {
    log('⚠️ معظم الاختبارات نجحت، الإصلاح يعمل جيداً', 'yellow');
  } else {
    log('❌ معظم الاختبارات فشلت، قد تحتاج لمراجعة إضافية', 'red');
  }
  
  log(`📊 النتيجة النهائية: ${successCount}/${totalTests} اختبارات نجحت`, 
      successCount === totalTests ? 'green' : 'yellow');
}

// تشغيل الاختبارات
if (require.main === module) {
  runAllTests().catch(error => {
    log('❌ خطأ في تشغيل الاختبارات:', 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  testWhatsAppStatus,
  testSendMessage,
  testPasswordReset,
  testStressTest,
  runAllTests
};
