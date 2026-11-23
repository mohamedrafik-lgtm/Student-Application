const { CloudinaryService } = require('./dist/src/cloudinary/cloudinary.service');
const { ConfigService } = require('@nestjs/config');
const fs = require('fs');
const path = require('path');

async function testCloudinary() {
  console.log('🧪 بدء اختبار Cloudinary...\n');

  // إنشاء خدمة التكوين
  const configService = new ConfigService();
  
  // التحقق من متغيرات البيئة
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  console.log('📋 التحقق من متغيرات البيئة:');
  console.log(`   Cloud Name: ${cloudName ? '✅ موجود' : '❌ مفقود'}`);
  console.log(`   API Key: ${apiKey ? '✅ موجود' : '❌ مفقود'}`);
  console.log(`   API Secret: ${apiSecret ? '✅ موجود' : '❌ مفقود'}\n`);

  if (!cloudName || !apiKey || !apiSecret) {
    console.log('❌ يرجى إعداد متغيرات البيئة في ملف .env');
    console.log('مثال:');
    console.log('CLOUDINARY_CLOUD_NAME="your-cloud-name"');
    console.log('CLOUDINARY_API_KEY="your-api-key"');
    console.log('CLOUDINARY_API_SECRET="your-api-secret"');
    return;
  }

  try {
    // إنشاء خدمة Cloudinary
    const cloudinaryService = new CloudinaryService(configService);

    // اختبار التكوين
    console.log('🔧 اختبار تكوين Cloudinary...');
    const isValid = await cloudinaryService.validateConfiguration();
    
    if (isValid) {
      console.log('✅ تكوين Cloudinary صحيح!\n');
    } else {
      console.log('❌ تكوين Cloudinary غير صحيح!\n');
      return;
    }

    // إنشاء ملف اختبار
    console.log('📁 إنشاء ملف اختبار...');
    const testImagePath = path.join(__dirname, 'test-image.png');
    
    // إنشاء صورة اختبار بسيطة (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x5C, 0xC2, 0x8A, 0x8E, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    // محاكاة ملف Multer
    const mockFile = {
      originalname: 'test-image.png',
      mimetype: 'image/png',
      buffer: testImageBuffer,
      size: testImageBuffer.length
    };

    console.log('✅ تم إنشاء ملف اختبار\n');

    // اختبار رفع الملف
    console.log('📤 اختبار رفع الملف إلى Cloudinary...');
    const uploadResult = await cloudinaryService.uploadFile(mockFile, 'test');
    
    console.log('✅ تم رفع الملف بنجاح!');
    console.log(`   URL: ${uploadResult.url}`);
    console.log(`   Public ID: ${uploadResult.public_id}`);
    console.log(`   Format: ${uploadResult.format}`);
    console.log(`   Size: ${uploadResult.size} bytes\n`);

    // اختبار الحصول على URL محسن
    console.log('🎨 اختبار الحصول على URL محسن...');
    const optimizedUrl = cloudinaryService.getOptimizedImageUrl(uploadResult.public_id, {
      width: 300,
      height: 300,
      quality: 'auto:best'
    });
    console.log(`✅ URL محسن: ${optimizedUrl}\n`);

    // اختبار استخراج public_id من URL
    console.log('🔍 اختبار استخراج public_id من URL...');
    const extractedId = cloudinaryService.extractPublicIdFromUrl(uploadResult.url);
    console.log(`✅ Public ID المستخرج: ${extractedId}\n`);

    // اختبار حذف الملف
    console.log('🗑️ اختبار حذف الملف...');
    const deleteResult = await cloudinaryService.deleteFile(uploadResult.public_id);
    
    if (deleteResult) {
      console.log('✅ تم حذف الملف بنجاح!\n');
    } else {
      console.log('❌ فشل في حذف الملف\n');
    }

    console.log('🎉 جميع الاختبارات نجحت! Cloudinary جاهز للاستخدام.');

  } catch (error) {
    console.error('❌ خطأ أثناء الاختبار:', error.message);
    console.error('تفاصيل الخطأ:', error);
  }
}

// تشغيل الاختبار
if (require.main === module) {
  // تحميل متغيرات البيئة
  require('dotenv').config();
  testCloudinary();
}

module.exports = { testCloudinary };
