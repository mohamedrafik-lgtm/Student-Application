import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

const execAsync = promisify(exec);

interface DbConfig {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private mysqlBinPath: string = '';

  constructor(private prisma: PrismaService) {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.ensureBackupDir();
    this.detectMysqlPath();
  }

  private ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      this.logger.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  /** اكتشاف مسار أدوات MySQL تلقائياً */
  private detectMysqlPath() {
    if (process.platform === 'win32') {
      // البحث في المسارات الشائعة لـ MySQL على Windows
      const commonPaths = [
        'C:\\Program Files\\MySQL\\MySQL Workbench 8.0 CE',
        'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin',
        'C:\\Program Files\\MySQL\\MySQL Server 8.1\\bin',
        'C:\\Program Files\\MySQL\\MySQL Server 8.2\\bin',
        'C:\\Program Files\\MySQL\\MySQL Server 8.3\\bin',
        'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin',
        'C:\\Program Files\\MySQL\\MySQL Server 9.0\\bin',
        'C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin',
        'C:\\Program Files (x86)\\MySQL\\MySQL Server 8.0\\bin',
        'C:\\xampp\\mysql\\bin',
        'C:\\wamp64\\bin\\mysql\\mysql8.0.31\\bin',
        'C:\\wamp\\bin\\mysql\\mysql8.0.31\\bin',
        'C:\\laragon\\bin\\mysql\\mysql-8.0.30-winx64\\bin',
      ];

      for (const binPath of commonPaths) {
        const mysqldumpPath = path.join(binPath, 'mysqldump.exe');
        if (fs.existsSync(mysqldumpPath)) {
          this.mysqlBinPath = binPath;
          this.logger.log(`Found MySQL bin at: ${binPath}`);
          return;
        }
      }

      // البحث الديناميكي في Program Files
      try {
        const programFiles = 'C:\\Program Files\\MySQL';
        if (fs.existsSync(programFiles)) {
          const dirs = fs.readdirSync(programFiles);
          for (const dir of dirs.sort().reverse()) {
            const binPath = path.join(programFiles, dir, 'bin');
            if (fs.existsSync(path.join(binPath, 'mysqldump.exe'))) {
              this.mysqlBinPath = binPath;
              this.logger.log(`Found MySQL bin at: ${binPath}`);
              return;
            }
          }
        }
      } catch (e) {
        // تجاهل أخطاء القراءة
      }

      this.logger.warn('MySQL bin path not found - mysqldump/mysql commands may fail. Set MYSQL_BIN_PATH env variable.');
    } else {
      // Linux / macOS - البحث في المسارات الشائعة
      const linuxPaths = [
        '/usr/bin',
        '/usr/local/bin',
        '/usr/local/mysql/bin',
        '/opt/mysql/bin',
        '/snap/bin',
      ];

      for (const binPath of linuxPaths) {
        if (fs.existsSync(path.join(binPath, 'mysqldump'))) {
          this.mysqlBinPath = binPath;
          this.logger.log(`Found MySQL bin at: ${binPath}`);
          return;
        }
      }

      // على Linux عادةً mysqldump موجود في PATH مباشرة
      this.logger.log('MySQL tools expected in system PATH (Linux/macOS)');
    }
  }

  /** الحصول على المسار الكامل لأداة MySQL */
  private getMysqlCommand(command: 'mysqldump' | 'mysql'): string {
    // أولاً: التحقق من متغير البيئة
    const envPath = process.env.MYSQL_BIN_PATH;
    if (envPath) {
      const fullPath = path.join(envPath, process.platform === 'win32' ? `${command}.exe` : command);
      if (fs.existsSync(fullPath)) {
        return `"${fullPath}"`;
      }
    }

    // ثانياً: استخدام المسار المكتشف تلقائياً
    if (this.mysqlBinPath) {
      return `"${path.join(this.mysqlBinPath, process.platform === 'win32' ? `${command}.exe` : command)}"`;
    }

    // ثالثاً: استخدام الاسم مباشرة (يعتمد على PATH)
    return command;
  }

  private getDbConfig(): DbConfig {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new BadRequestException('DATABASE_URL is not configured');
    }

    // Parse: mysql://user:password@host:port/database
    const parsed = new URL(dbUrl);
    return {
      host: parsed.hostname,
      port: parsed.port || '3306',
      user: parsed.username,
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace('/', ''),
    };
  }

  // ==================== إدارة النسخ الاحتياطية ====================

  async createBackup(userId: string, type: string = 'full', notes?: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${type}_${timestamp}.sql`;
    const filePath = path.join(this.backupDir, filename);

    // إنشاء سجل في قاعدة البيانات
    const backupLog = await this.prisma.backupLog.create({
      data: {
        filename,
        status: 'in_progress',
        type,
        createdBy: userId,
        notes,
      },
    });

    try {
      const config = this.getDbConfig();
      
      let dumpCommand: string;
      const mysqldump = this.getMysqlCommand('mysqldump');
      const passwordFlag = config.password ? ` -p"${config.password}"` : '';
      const baseCmd = `${mysqldump} -h ${config.host} -P ${config.port} -u ${config.user}${passwordFlag} ${config.database}`;

      switch (type) {
        case 'schema_only':
          dumpCommand = `${baseCmd} --no-data`;
          break;
        case 'data_only':
          dumpCommand = `${baseCmd} --no-create-info`;
          break;
        case 'full':
        default:
          dumpCommand = baseCmd;
          break;
      }

      dumpCommand += ` --single-transaction --quick --lock-tables=false > "${filePath}"`;

      this.logger.log(`Starting ${type} backup: ${filename}`);
      await execAsync(dumpCommand, { maxBuffer: 1024 * 1024 * 500 }); // 500MB buffer

      // التحقق من الملف
      const stats = fs.statSync(filePath);
      
      // تحديث السجل
      await this.prisma.backupLog.update({
        where: { id: backupLog.id },
        data: {
          status: 'completed',
          size: BigInt(stats.size),
        },
      });

      // تحديث آخر نسخة احتياطية في الإعدادات
      await this.updateLastBackupTime();

      // حذف النسخ الزائدة
      await this.cleanupOldBackups();

      this.logger.log(`Backup completed: ${filename} (${this.formatSize(Number(stats.size))})`);

      return {
        success: true,
        backup: {
          id: backupLog.id,
          filename,
          size: Number(stats.size),
          type,
          status: 'completed',
        },
      };
    } catch (error) {
      this.logger.error(`Backup failed: ${error.message}`);

      // حذف الملف الفاشل إن وجد
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await this.prisma.backupLog.update({
        where: { id: backupLog.id },
        data: {
          status: 'failed',
          error: error.message,
        },
      });

      throw new BadRequestException(`فشل إنشاء النسخة الاحتياطية: ${error.message}`);
    }
  }

  async restoreBackup(backupId: number) {
    const backup = await this.prisma.backupLog.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      throw new NotFoundException('النسخة الاحتياطية غير موجودة');
    }

    const filePath = path.join(this.backupDir, backup.filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('ملف النسخة الاحتياطية غير موجود على الخادم');
    }

    try {
      const config = this.getDbConfig();
      const mysqlCmd = this.getMysqlCommand('mysql');
      const passwordFlag = config.password ? ` -p"${config.password}"` : '';
      const restoreCommand = `${mysqlCmd} -h ${config.host} -P ${config.port} -u ${config.user}${passwordFlag} ${config.database} < "${filePath}"`;

      this.logger.log(`Starting restore from: ${backup.filename}`);
      await execAsync(restoreCommand, { maxBuffer: 1024 * 1024 * 500 });

      this.logger.log(`Restore completed from: ${backup.filename}`);

      // إصلاح حالة النسخ بعد الاستعادة (الاستعادة تعيد حالة in_progress)
      await this.fixBackupStatusesAfterRestore();

      return {
        success: true,
        message: 'تمت استعادة النسخة الاحتياطية بنجاح',
      };
    } catch (error) {
      this.logger.error(`Restore failed: ${error.message}`);
      throw new BadRequestException(`فشل استعادة النسخة الاحتياطية: ${error.message}`);
    }
  }

  async restoreFromFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('لم يتم رفع أي ملف');
    }

    try {
      const config = this.getDbConfig();
      
      // حفظ الملف مؤقتاً
      const tempPath = path.join(this.backupDir, `temp_restore_${Date.now()}.sql`);
      fs.writeFileSync(tempPath, file.buffer);

      const mysqlCmd = this.getMysqlCommand('mysql');
      const passwordFlag = config.password ? ` -p"${config.password}"` : '';
      const restoreCommand = `${mysqlCmd} -h ${config.host} -P ${config.port} -u ${config.user}${passwordFlag} ${config.database} < "${tempPath}"`;

      this.logger.log('Starting restore from uploaded file');
      await execAsync(restoreCommand, { maxBuffer: 1024 * 1024 * 500 });

      // حذف الملف المؤقت
      fs.unlinkSync(tempPath);

      this.logger.log('Restore from uploaded file completed');

      // إصلاح حالة النسخ بعد الاستعادة
      await this.fixBackupStatusesAfterRestore();

      return {
        success: true,
        message: 'تمت استعادة النسخة الاحتياطية من الملف المرفوع بنجاح',
      };
    } catch (error) {
      this.logger.error(`Restore from file failed: ${error.message}`);
      throw new BadRequestException(`فشل استعادة النسخة الاحتياطية: ${error.message}`);
    }
  }

  /**
   * بعد الاستعادة، ملف النسخة يحتوي على حالة in_progress لأن mysqldump يأخذ اللقطة أثناء الإنشاء
   * هذه الدالة تتحقق من الملفات وتصلح الحالات
   */
  private async fixBackupStatusesAfterRestore() {
    const inProgressBackups = await this.prisma.backupLog.findMany({
      where: { status: 'in_progress' },
    });

    for (const backup of inProgressBackups) {
      const filePath = path.join(this.backupDir, backup.filename);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          await this.prisma.backupLog.update({
            where: { id: backup.id },
            data: {
              status: 'completed',
              size: BigInt(stats.size),
            },
          });
          this.logger.log(`Fixed backup status after restore: ${backup.filename} → completed`);
        }
      }
    }
  }

  async getBackupList() {
    // تنظيف النسخ العالقة (أكثر من 10 دقائق في حالة in_progress)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const stuckBackups = await this.prisma.backupLog.findMany({
      where: {
        status: 'in_progress',
        createdAt: { lt: tenMinutesAgo },
      },
    });

    for (const backup of stuckBackups) {
      const filePath = path.join(this.backupDir, backup.filename);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          // الملف موجود وصالح - يعني النسخة نجحت (مثلاً بعد استعادة)
          await this.prisma.backupLog.update({
            where: { id: backup.id },
            data: {
              status: 'completed',
              size: BigInt(stats.size),
            },
          });
          continue;
        }
      }
      // الملف غير موجود أو فارغ - فشلت
      await this.prisma.backupLog.update({
        where: { id: backup.id },
        data: {
          status: 'failed',
          error: 'انتهت المهلة - تجاوزت النسخة الاحتياطية 10 دقائق بدون اكتمال',
        },
      });
    }

    const backups = await this.prisma.backupLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return backups.map((b) => ({
      ...b,
      size: Number(b.size),
      sizeFormatted: this.formatSize(Number(b.size)),
      fileExists: fs.existsSync(path.join(this.backupDir, b.filename)),
      elapsedSeconds: b.status === 'in_progress'
        ? Math.floor((Date.now() - new Date(b.createdAt).getTime()) / 1000)
        : null,
    }));
  }

  async deleteBackup(backupId: number) {
    const backup = await this.prisma.backupLog.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      throw new NotFoundException('النسخة الاحتياطية غير موجودة');
    }

    // حذف الملف
    const filePath = path.join(this.backupDir, backup.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // حذف السجل
    await this.prisma.backupLog.delete({ where: { id: backupId } });

    return { success: true, message: 'تم حذف النسخة الاحتياطية بنجاح' };
  }

  async downloadBackup(backupId: number) {
    const backup = await this.prisma.backupLog.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      throw new NotFoundException('النسخة الاحتياطية غير موجودة');
    }

    const filePath = path.join(this.backupDir, backup.filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('ملف النسخة الاحتياطية غير موجود');
    }

    return {
      filePath,
      filename: backup.filename,
    };
  }

  // ==================== إعدادات النسخ الاحتياطي التلقائي ====================

  async getSettings() {
    let settings = await this.prisma.backupSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.backupSettings.create({
        data: {
          autoBackup: false,
          frequency: 'daily',
          maxBackups: 7,
        },
      });
    }
    return settings;
  }

  async updateSettings(data: {
    autoBackup?: boolean;
    frequency?: string;
    maxBackups?: number;
    userId?: string;
  }) {
    const settings = await this.getSettings();

    const nextBackupAt = data.autoBackup !== false
      ? this.calculateNextBackup(data.frequency || settings.frequency)
      : null;

    return this.prisma.backupSettings.update({
      where: { id: settings.id },
      data: {
        autoBackup: data.autoBackup ?? settings.autoBackup,
        frequency: data.frequency ?? settings.frequency,
        maxBackups: data.maxBackups ?? settings.maxBackups,
        nextBackupAt,
        updatedBy: data.userId ? undefined : undefined,
      },
    });
  }

  // ==================== النسخ الاحتياطي التلقائي (Cron) ====================

  /** يعمل كل ساعة للتحقق من جدول النسخ الاحتياطي */
  @Cron('0 */1 * * *') // كل ساعة
  async runScheduledBackup() {
    const settings = await this.getSettings();
    
    if (!settings.autoBackup) {
      return;
    }

    // التحقق مما إذا حان وقت النسخ الاحتياطي
    if (settings.nextBackupAt && new Date() < settings.nextBackupAt) {
      return;
    }

    this.logger.log('Running scheduled backup...');

    try {
      // استخدام system كمنشئ للنسخة التلقائية
      // نبحث عن أول مستخدم admin
      const adminUser = await this.prisma.user.findFirst({
        where: { email: 'admin@codex.com' },
      });

      if (adminUser) {
        await this.createBackup(adminUser.id, 'full', 'نسخة احتياطية تلقائية');
      }

      // تحديث وقت النسخة القادمة
      await this.prisma.backupSettings.update({
        where: { id: settings.id },
        data: {
          lastBackupAt: new Date(),
          nextBackupAt: this.calculateNextBackup(settings.frequency),
        },
      });

      this.logger.log('Scheduled backup completed successfully');
    } catch (error) {
      this.logger.error(`Scheduled backup failed: ${error.message}`);
    }
  }

  // ==================== أدوات مساعدة ====================

  private async cleanupOldBackups() {
    const settings = await this.getSettings();
    const maxBackups = settings.maxBackups;

    const backups = await this.prisma.backupLog.findMany({
      where: { status: 'completed' },
      orderBy: { createdAt: 'desc' },
    });

    if (backups.length > maxBackups) {
      const toDelete = backups.slice(maxBackups);

      for (const backup of toDelete) {
        const filePath = path.join(this.backupDir, backup.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          this.logger.log(`Cleaned up old backup: ${backup.filename}`);
        }
        await this.prisma.backupLog.delete({ where: { id: backup.id } });
      }
    }
  }

  private async updateLastBackupTime() {
    const settings = await this.getSettings();
    await this.prisma.backupSettings.update({
      where: { id: settings.id },
      data: {
        lastBackupAt: new Date(),
        nextBackupAt: settings.autoBackup
          ? this.calculateNextBackup(settings.frequency)
          : settings.nextBackupAt,
      },
    });
  }

  private calculateNextBackup(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        const next = new Date(now);
        next.setMonth(next.getMonth() + 1);
        return next;
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
