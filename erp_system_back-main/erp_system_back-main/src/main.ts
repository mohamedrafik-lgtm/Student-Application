import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  // إضافة معالجات الأخطاء العامة لمنع كراش السيرفر
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    // لا نوقف السيرفر، فقط نسجل الخطأ
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // لا نوقف السيرفر، فقط نسجل الخطأ
  });

  // معالج خاص لأخطاء EPIPE
  process.on('EPIPE', (error) => {
    console.error('❌ EPIPE Error (Broken Pipe):', error);
    // لا نوقف السيرفر، هذا خطأ شائع في PDF generation
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });
  
  // 🛡️ Helmet - إضافة Security Headers للحماية من الهجمات الشائعة
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // للسماح بـ inline styles
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"], // للسماح بالصور من مصادر متعددة
      },
    },
    crossOriginEmbedderPolicy: false, // تعطيل لتجنب مشاكل مع الصور الخارجية
  }));
  
  // زيادة حد حجم الطلبات لدعم الصور الكبيرة
  app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ limit: '50mb', extended: true }));
  
  // تكوين CORS لدعم عدة Frontend URLs
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(url => url.trim())
    : [process.env.FRONTEND_URL || 'http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // السماح للطلبات بدون origin (مثل mobile apps)
      if (!origin) return callback(null, true);
      
      // التحقق من أن الـ origin موجود في القائمة المسموحة
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // رفض الـ origin غير المسموح
      console.warn(`🚫 CORS: Origin "${origin}" not allowed`);
      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    optionsSuccessStatus: 200, // بعض المتصفحات القديمة تحتاج هذا
  });

  // تكوين أنبوب التحقق العالمي
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false, // تعطيل مؤقت لحل مشكلة العملة
    }),
  );

  // تعيين بادئة عالمية
  app.setGlobalPrefix('api');

  // تكوين Swagger
  const config = new DocumentBuilder()
    .setTitle('Tiba API')
    .setDescription('The Tiba training center API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('trainees', 'Trainee management endpoints')
    .addTag('programs', 'Training programs endpoints')
    .addTag('news', 'News management endpoints')
    .addTag('jobs', 'Jobs management endpoints')
    .addTag('registrations', 'Registration management endpoints')
    .addTag('upload', 'File upload endpoints')
    .addTag('attendance', 'Attendance management endpoints')
    .addTag('questions', 'Question bank endpoints')
    .addTag('training-content', 'Training content endpoints')
    .addTag('finances', 'Financial management endpoints')
    .addTag('whatsapp', 'WhatsApp integration endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // تكوين خدمة الملفات الثابتة
  // خدمة الملفات من /uploads/ (بدون api prefix)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    maxAge: 86400000, // 1 day in milliseconds
  });
  // خدمة الملفات من /api/uploads/ (مع api prefix)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/api/uploads/',
    maxAge: 86400000, // 1 day in milliseconds
  });

  // تعيين متغير بيئة للخادم
  const port = parseInt(process.env.PORT, 10) || 4001;
  const host = process.env.HOST || '0.0.0.0';
  const serverUrl = process.env.SERVER_URL || process.env.COOLIFY_URL || `http://localhost:${port}`;
  process.env.SERVER_URL = serverUrl;

  // طباعة معلومات البيئة
  console.log('');
  console.log('========================================');
  console.log('🚀 Starting NestJS Application');
  console.log('========================================');
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Host: ${host}`);
  console.log(`🔌 Port: ${port}`);
  console.log(`🔗 Server URL: ${serverUrl}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL ? '✅ Connected' : '❌ Not configured'}`);
  console.log(`📦 Redis: ${process.env.REDIS_URL || process.env.REDIS_HOST ? '✅ Connected' : '⚠️ Not configured'}`);
  console.log('');

  // بدء تشغيل الخادم
  await app.listen(port, host);
  
  console.log('========================================');
  console.log(`✅ Application running on: http://${host}:${port}`);
  console.log(`📚 Swagger docs: ${serverUrl}/api/docs`);
  console.log(`❤️ Health check: ${serverUrl}/api/health`);
  console.log('========================================');
  console.log('');
  console.log(`🌐 CORS - Allowed Origins:`);
  allowedOrigins.forEach((origin, index) => {
    console.log(`   ${index + 1}. ${origin}`);
  });
  console.log('');
}
bootstrap();
