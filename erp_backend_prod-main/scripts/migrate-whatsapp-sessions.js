#!/usr/bin/env node

/**
 * WhatsApp Sessions Migration Script
 * نقل الجلسات من الملفات إلى قاعدة البيانات
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const authDir = path.join(__dirname, '..', 'whatsapp-auth');

async function migrate() {
  console.log('🔄 Starting WhatsApp sessions migration...\n');

  // التحقق من وجود المجلد
  if (!fs.existsSync(authDir)) {
    console.log('❌ No whatsapp-auth directory found');
    console.log('   Nothing to migrate.');
    await prisma.$disconnect();
    return;
  }

  const files = fs.readdirSync(authDir);
  
  if (files.length === 0) {
    console.log('❌ No session files found in whatsapp-auth/');
    await prisma.$disconnect();
    return;
  }

  console.log(`📂 Found ${files.length} session files\n`);
  
  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    try {
      const filePath = path.join(authDir, file);
      const stats = fs.statSync(filePath);
      const data = fs.readFileSync(filePath, 'utf-8');
      
      await prisma.whatsAppSession.upsert({
        where: { key: file },
        create: {
          key: file,
          data: data
        },
        update: {
          data: data
        }
      });
      
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`✅ ${file.padEnd(40)} (${sizeKB} KB)`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${file.padEnd(40)} - ${error.message}`);
      failCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Migration Summary:`);
  console.log(`   - Total files: ${files.length}`);
  console.log(`   - Successful: ${successCount}`);
  console.log(`   - Failed: ${failCount}`);
  
  if (successCount > 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Set WHATSAPP_STORAGE_TYPE=database in .env');
    console.log('   2. Restart your application');
    console.log('   3. (Optional) Backup and delete whatsapp-auth/ folder');
  }
  
  await prisma.$disconnect();
}

// التحقق من اتصال قاعدة البيانات أولاً
prisma.$connect()
  .then(() => {
    console.log('✅ Database connected\n');
    return migrate();
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. DATABASE_URL is set correctly in .env');
    console.log('   2. Database is running');
    console.log('   3. Run: npx prisma db push');
    process.exit(1);
  });
