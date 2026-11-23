import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule'; // تم تعطيلها مؤقتاً
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WhatsAppMonitorService {
  private readonly logger = new Logger(WhatsAppMonitorService.name);
  private readonly authDir = './whatsapp-auth';
  private readonly maxSessionAge = 7 * 24 * 60 * 60 * 1000; // 7 أيام
  private readonly maxLogFileSize = 10 * 1024 * 1024; // 10 MB

  // ✅ تنظيف دوري للجلسات القديمة (كل يوم في الساعة 3 صباحاً)
  // @Cron('0 3 * * *') // تم تعطيلها مؤقتاً
  async cleanupOldSessions(): Promise<void> {
    try {
      this.logger.log('🧹 Starting scheduled session cleanup...');

      if (!fs.existsSync(this.authDir)) {
        this.logger.log('📁 Auth directory does not exist, skipping cleanup');
        return;
      }

      const files = fs.readdirSync(this.authDir);
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.authDir, file);
        
        try {
          const stats = fs.statSync(filePath);
          const fileAge = Date.now() - stats.mtime.getTime();

          // حذف الملفات القديمة أو الفاسدة
          if (fileAge > this.maxSessionAge || 
              stats.size === 0 || 
              (file.endsWith('.json') && stats.size < 10)) {
            
            fs.unlinkSync(filePath);
            cleanedCount++;
            this.logger.debug(`🗑️ Cleaned old session file: ${file}`);
          }
        } catch (error) {
          this.logger.warn(`⚠️ Error checking file ${file}:`, error.message);
          // محاولة حذف الملف المعطوب
          try {
            fs.unlinkSync(filePath);
            cleanedCount++;
          } catch (deleteError) {
            this.logger.error(`❌ Failed to delete corrupted file ${file}:`, deleteError.message);
          }
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`✅ Cleaned ${cleanedCount} old/corrupted session files`);
      } else {
        this.logger.log('✅ No cleanup needed - all session files are valid');
      }

    } catch (error) {
      this.logger.error('❌ Scheduled session cleanup failed:', error);
    }
  }

  // ✅ مراقبة استخدام المساحة (كل ساعة)
  // @Cron(CronExpression.EVERY_HOUR) // تم تعطيلها مؤقتاً
  async monitorDiskUsage(): Promise<void> {
    try {
      if (!fs.existsSync(this.authDir)) {
        return;
      }

      const files = fs.readdirSync(this.authDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(this.authDir, file);
        try {
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        } catch (error) {
          // تجاهل الأخطاء في قراءة الملفات
        }
      }

      // تحويل إلى MB
      const totalSizeMB = totalSize / (1024 * 1024);

      if (totalSizeMB > 50) { // تحذير إذا تجاوز 50 MB
        this.logger.warn(`⚠️ WhatsApp session directory size is ${totalSizeMB.toFixed(2)} MB`);
        
        // تنظيف تلقائي إذا تجاوز 100 MB
        if (totalSizeMB > 100) {
          this.logger.warn('🧹 Auto-cleaning due to excessive size...');
          await this.forceCleanupAllSessions();
        }
      }

    } catch (error) {
      this.logger.error('❌ Disk usage monitoring failed:', error);
    }
  }

  // ✅ تنظيف قسري لجميع الجلسات
  async forceCleanupAllSessions(): Promise<{ success: boolean; message: string; filesRemoved: number }> {
    try {
      this.logger.log('🧹 Force cleaning all WhatsApp sessions...');

      if (!fs.existsSync(this.authDir)) {
        return {
          success: true,
          message: 'Auth directory does not exist',
          filesRemoved: 0
        };
      }

      const files = fs.readdirSync(this.authDir);
      let removedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.authDir, file);
        try {
          fs.unlinkSync(filePath);
          removedCount++;
          this.logger.debug(`🗑️ Removed: ${file}`);
        } catch (error) {
          this.logger.warn(`⚠️ Failed to remove ${file}:`, error.message);
        }
      }

      // إعادة إنشاء المجلد فارغاً
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
      }
      fs.mkdirSync(this.authDir, { recursive: true });

      this.logger.log(`✅ Force cleanup completed - removed ${removedCount} files`);

      return {
        success: true,
        message: `تم حذف ${removedCount} ملف جلسة`,
        filesRemoved: removedCount
      };

    } catch (error) {
      this.logger.error('❌ Force cleanup failed:', error);
      return {
        success: false,
        message: 'فشل في تنظيف الجلسات: ' + error.message,
        filesRemoved: 0
      };
    }
  }

  // ✅ فحص صحة ملفات الجلسة
  async validateSessionFiles(): Promise<{
    valid: number;
    invalid: number;
    corrupted: string[];
    recommendations: string[];
  }> {
    try {
      if (!fs.existsSync(this.authDir)) {
        return {
          valid: 0,
          invalid: 0,
          corrupted: [],
          recommendations: ['📁 مجلد الجلسات غير موجود - سيتم إنشاؤه عند الحاجة']
        };
      }

      const files = fs.readdirSync(this.authDir);
      let validCount = 0;
      let invalidCount = 0;
      const corruptedFiles: string[] = [];
      const recommendations: string[] = [];

      for (const file of files) {
        const filePath = path.join(this.authDir, file);
        
        try {
          const stats = fs.statSync(filePath);
          
          // فحص حجم الملف
          if (stats.size === 0) {
            invalidCount++;
            corruptedFiles.push(file + ' (empty file)');
            continue;
          }

          // فحص ملفات JSON
          if (file.endsWith('.json')) {
            try {
              const content = fs.readFileSync(filePath, 'utf8');
              JSON.parse(content);
              validCount++;
            } catch (jsonError) {
              invalidCount++;
              corruptedFiles.push(file + ' (invalid JSON)');
            }
          } else {
            validCount++;
          }

          // فحص عمر الملف
          const fileAge = Date.now() - stats.mtime.getTime();
          if (fileAge > this.maxSessionAge) {
            recommendations.push(`📅 ${file} قديم جداً (${Math.floor(fileAge / (24 * 60 * 60 * 1000))} يوم)`);
          }

        } catch (error) {
          invalidCount++;
          corruptedFiles.push(file + ' (inaccessible)');
        }
      }

      // إضافة توصيات
      if (corruptedFiles.length > 0) {
        recommendations.push(`🧹 يُنصح بتنظيف ${corruptedFiles.length} ملف فاسد`);
      }

      if (files.length === 0) {
        recommendations.push('📱 لا توجد جلسات محفوظة - ستحتاج مسح QR Code جديد');
      } else if (validCount === 0 && invalidCount > 0) {
        recommendations.push('🚨 جميع ملفات الجلسة فاسدة - يُنصح بتنظيف شامل');
      }

      return {
        valid: validCount,
        invalid: invalidCount,
        corrupted: corruptedFiles,
        recommendations
      };

    } catch (error) {
      this.logger.error('❌ Session validation failed:', error);
      return {
        valid: 0,
        invalid: 0,
        corrupted: [],
        recommendations: ['❌ فشل في فحص ملفات الجلسة']
      };
    }
  }

  // ✅ إحصائيات مفصلة عن الجلسات
  async getSessionStatistics(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile: string | null;
    newestFile: string | null;
    avgFileAge: number;
    recommendations: string[];
  }> {
    try {
      if (!fs.existsSync(this.authDir)) {
        return {
          totalFiles: 0,
          totalSize: 0,
          oldestFile: null,
          newestFile: null,
          avgFileAge: 0,
          recommendations: ['📁 لا يوجد مجلد جلسات']
        };
      }

      const files = fs.readdirSync(this.authDir);
      let totalSize = 0;
      let oldestTime = Date.now();
      let newestTime = 0;
      let oldestFile: string | null = null;
      let newestFile: string | null = null;
      let totalAge = 0;
      let validFiles = 0;

      for (const file of files) {
        const filePath = path.join(this.authDir, file);
        
        try {
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
          
          const mtime = stats.mtime.getTime();
          totalAge += (Date.now() - mtime);
          validFiles++;

          if (mtime < oldestTime) {
            oldestTime = mtime;
            oldestFile = file;
          }

          if (mtime > newestTime) {
            newestTime = mtime;
            newestFile = file;
          }

        } catch (error) {
          // تجاهل الملفات التي لا يمكن قراءتها
        }
      }

      const avgFileAge = validFiles > 0 ? totalAge / validFiles : 0;
      const recommendations: string[] = [];

      // توصيات بناءً على الإحصائيات
      if (totalSize > 50 * 1024 * 1024) { // > 50 MB
        recommendations.push('💾 حجم ملفات الجلسة كبير - يُنصح بالتنظيف');
      }

      if (avgFileAge > 3 * 24 * 60 * 60 * 1000) { // > 3 أيام
        recommendations.push('📅 متوسط عمر الملفات كبير - قد تحتاج تحديث');
      }

      if (files.length > 20) {
        recommendations.push('📄 عدد ملفات الجلسة كثير - يُنصح بالتنظيف');
      }

      return {
        totalFiles: files.length,
        totalSize,
        oldestFile,
        newestFile,
        avgFileAge,
        recommendations
      };

    } catch (error) {
      this.logger.error('❌ Failed to get session statistics:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null,
        avgFileAge: 0,
        recommendations: ['❌ فشل في جمع الإحصائيات']
      };
    }
  }
}
