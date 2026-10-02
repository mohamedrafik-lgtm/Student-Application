import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MemoryMonitorService {
  private readonly logger = new Logger(MemoryMonitorService.name);
  private monitoringInterval: NodeJS.Timeout;
  private memoryHistory: Array<{ timestamp: Date; usage: number }> = [];

  constructor() {
    this.startMonitoring();
  }

  /**
   * بدء مراقبة الذاكرة
   */
  private startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 15000); // فحص كل 15 ثانية
  }

  /**
   * فحص استخدام الذاكرة
   */
  private checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const memoryMB = Math.round(memUsage.rss / 1024 / 1024);
    const memoryPercentage = (memoryMB / 1024) * 100; // افتراض 1GB إجمالي

    // حفظ في التاريخ
    this.memoryHistory.push({
      timestamp: new Date(),
      usage: memoryMB
    });

    // الاحتفاظ بآخر 100 قراءة فقط
    if (this.memoryHistory.length > 100) {
      this.memoryHistory = this.memoryHistory.slice(-100);
    }

    // تحذيرات حسب مستوى الاستخدام
    if (memoryPercentage > 90) {
      this.logger.error(`🚨 CRITICAL: Memory usage ${memoryMB}MB (${memoryPercentage.toFixed(1)}%)`);
      this.performEmergencyCleanup();
    } else if (memoryPercentage > 80) {
      this.logger.warn(`⚠️ WARNING: Memory usage ${memoryMB}MB (${memoryPercentage.toFixed(1)}%)`);
      this.performRoutineCleanup();
    } else if (memoryPercentage > 70) {
      this.logger.warn(`📊 HIGH: Memory usage ${memoryMB}MB (${memoryPercentage.toFixed(1)}%)`);
    }
  }

  /**
   * تنظيف طارئ للذاكرة
   */
  private async performEmergencyCleanup() {
    try {
      this.logger.log('🚨 Performing emergency memory cleanup...');

      // 1. تنظيف جميع الملفات المؤقتة
      await this.cleanupAllTempFiles();

      // 2. تشغيل garbage collection
      if (global.gc) {
        global.gc();
        this.logger.log('🗑️ Emergency garbage collection triggered');
      }

      // 3. تنظيف تاريخ الذاكرة
      this.memoryHistory = this.memoryHistory.slice(-20);

      // 4. إشعار الخدمات الأخرى لتقليل الاستخدام
      // إرسال إشعار ضغط الذاكرة الحرج
      process.nextTick(() => {
        // يمكن إضافة logic إضافي هنا للتعامل مع الضغط الحرج
      });

      this.logger.log('✅ Emergency cleanup completed');

    } catch (error) {
      this.logger.error('❌ Emergency cleanup failed:', error);
    }
  }

  /**
   * تنظيف روتيني للذاكرة
   */
  private async performRoutineCleanup() {
    try {
      this.logger.log('🧹 Performing routine memory cleanup...');

      // تنظيف الملفات المؤقتة القديمة
      await this.cleanupOldTempFiles();

      // تشغيل garbage collection
      if (global.gc) {
        global.gc();
      }

      // إرسال تحذير ضغط الذاكرة
      process.nextTick(() => {
        // يمكن إضافة logic إضافي هنا للتعامل مع التحذير
      });

    } catch (error) {
      this.logger.error('❌ Routine cleanup failed:', error);
    }
  }

  /**
   * تنظيف جميع الملفات المؤقتة
   */
  private async cleanupAllTempFiles() {
    const tempDirs = [
      path.join(process.cwd(), 'temp'),
      path.join(process.cwd(), 'uploads', 'temp'),
      path.join(process.cwd(), 'temp', 'receipts'),
    ];

    let totalCleaned = 0;

    for (const dir of tempDirs) {
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir, { recursive: true });
          
          for (const file of files) {
            try {
              const filePath = path.join(dir, file.toString());
              if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
                totalCleaned++;
              }
            } catch (error) {
              // تجاهل أخطاء الملفات الفردية
            }
          }
        }
      } catch (error) {
        this.logger.error(`Error cleaning directory ${dir}:`, error);
      }
    }

    this.logger.log(`🗑️ Emergency cleanup: ${totalCleaned} files removed`);
  }

  /**
   * تنظيف الملفات المؤقتة القديمة
   */
  private async cleanupOldTempFiles() {
    const tempDirs = [
      path.join(process.cwd(), 'temp'),
      path.join(process.cwd(), 'uploads', 'temp'),
    ];

    let totalCleaned = 0;
    const now = Date.now();
    const MAX_FILES = 5000; // ✅ حد أقصى للملفات

    for (const dir of tempDirs) {
      try {
        if (fs.existsSync(dir)) {
          const files = await this.scanDirectorySafely(dir, MAX_FILES);
          
          // ✅ معالجة على دفعات
          const BATCH_SIZE = 100;
          for (let i = 0; i < files.length; i += BATCH_SIZE) {
            const batch = files.slice(i, i + BATCH_SIZE);
            
            for (const filePath of batch) {
              try {
                const stats = fs.statSync(filePath);
                
                if (stats.isFile() && now - stats.mtime.getTime() > 10 * 60 * 1000) { // 10 دقائق
                  fs.unlinkSync(filePath);
                  totalCleaned++;
                }
              } catch (error) {
                // تجاهل أخطاء الملفات الفردية
              }
            }
          }
        }
      } catch (error) {
        this.logger.error(`Error cleaning directory ${dir}:`, error);
      }
    }

    if (totalCleaned > 0) {
      this.logger.log(`🗑️ Routine cleanup: ${totalCleaned} old files removed`);
    }
  }

  /**
   * فحص المجلد بشكل آمن مع حد أقصى للملفات
   */
  private async scanDirectorySafely(dirPath: string, maxFiles: number): Promise<string[]> {
    const files: string[] = [];
    let count = 0;

    const scanRecursive = (currentPath: string) => {
      if (count >= maxFiles) return;

      try {
        const entries = fs.readdirSync(currentPath);
        
        for (const entry of entries) {
          if (count >= maxFiles) break;
          
          const fullPath = path.join(currentPath, entry);
          
          try {
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
              scanRecursive(fullPath);
            } else {
              files.push(fullPath);
              count++;
            }
          } catch (error) {
            // تجاهل أخطاء الملفات الفردية
          }
        }
      } catch (error) {
        // تجاهل أخطاء المجلدات
      }
    };

    scanRecursive(dirPath);
    return files;
  }

  /**
   * الحصول على حالة الذاكرة
   */
  getMemoryStatus() {
    const memUsage = process.memoryUsage();
    const memoryMB = Math.round(memUsage.rss / 1024 / 1024);
    const memoryPercentage = (memoryMB / 1024) * 100;

    // حساب المتوسط للدقائق الأخيرة
    const recentHistory = this.memoryHistory.slice(-20); // آخر 5 دقائق
    const averageUsage = recentHistory.length > 0 
      ? Math.round(recentHistory.reduce((sum, item) => sum + item.usage, 0) / recentHistory.length)
      : memoryMB;

    return {
      current: {
        rss: memoryMB,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        percentage: Math.round(memoryPercentage)
      },
      average: averageUsage,
      status: memoryPercentage > 90 ? 'critical' : 
              memoryPercentage > 80 ? 'warning' : 
              memoryPercentage > 70 ? 'high' : 'normal',
      history: this.memoryHistory.slice(-10), // آخر 10 قراءات
      recommendations: this.getRecommendations(memoryPercentage)
    };
  }

  /**
   * الحصول على توصيات بناءً على استخدام الذاكرة
   */
  private getRecommendations(memoryPercentage: number): string[] {
    const recommendations = [];

    if (memoryPercentage > 85) {
      recommendations.push('تجنب توليد PDF في الوقت الحالي');
      recommendations.push('تأجيل العمليات غير الضرورية');
      recommendations.push('إعادة تشغيل الخادم إذا أمكن');
    } else if (memoryPercentage > 75) {
      recommendations.push('تقليل عدد العمليات المتزامنة');
      recommendations.push('تنظيف الملفات المؤقتة');
    } else if (memoryPercentage > 65) {
      recommendations.push('مراقبة الاستخدام عن كثب');
    }

    return recommendations;
  }

  /**
   * تنظيف الموارد عند إغلاق التطبيق
   */
  onModuleDestroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}
