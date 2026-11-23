import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;

  constructor(private prisma: PrismaService) {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.ensureBackupDir();
  }

  private ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      this.logger.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  private getDbName(): string {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new BadRequestException('DATABASE_URL is not configured');
    const parsed = new URL(dbUrl);
    return parsed.pathname.replace('/', '');
  }

  // ==================== دوال مساعدة لتوليد SQL ====================

  private escapeValue(val: any): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number' || typeof val === 'bigint') return String(val);
    if (typeof val === 'boolean') return val ? '1' : '0';
    if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
    if (Buffer.isBuffer(val)) return `X'${val.toString('hex')}'`;
    // escape string for MySQL
    const str = String(val)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\0/g, '\\0');
    return `'${str}'`;
  }

  private async getAllTables(): Promise<string[]> {
    const dbName = this.getDbName();
    const tables: { table_name: string }[] = await this.prisma.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = '${dbName}' AND table_type = 'BASE TABLE' ORDER BY table_name`,
    );
    return tables.map(t => t.table_name || (t as any).TABLE_NAME);
  }

  private async getCreateTableSQL(tableName: string): Promise<string> {
    const result: any[] = await this.prisma.$queryRawUnsafe(`SHOW CREATE TABLE \`${tableName}\``);
    return result[0]?.['Create Table'] || '';
  }

  private async getTableRows(tableName: string): Promise<any[]> {
    return this.prisma.$queryRawUnsafe(`SELECT * FROM \`${tableName}\``);
  }

  // ==================== إنشاء النسخة الاحتياطية ====================

  async createBackup(userId: string, type: string = 'full', notes?: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${type}_${timestamp}.sql`;
    const filePath = path.join(this.backupDir, filename);

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
      this.logger.log(`Starting ${type} backup via Prisma: ${filename}`);
      const tables = await this.getAllTables();
      const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });

      // Header
      stream.write(`-- Tiba ERP Backup (Prisma-based)\n`);
      stream.write(`-- Generated: ${new Date().toISOString()}\n`);
      stream.write(`-- Type: ${type}\n`);
      stream.write(`-- Database: ${this.getDbName()}\n\n`);
      stream.write(`SET FOREIGN_KEY_CHECKS = 0;\n`);
      stream.write(`SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n`);
      stream.write(`SET AUTOCOMMIT = 0;\nSTART TRANSACTION;\n\n`);

      for (const table of tables) {
        try {
          // Schema
          if (type !== 'data_only') {
            stream.write(`-- ==================== ${table} ====================\n\n`);
            stream.write(`DROP TABLE IF EXISTS \`${table}\`;\n`);
            const createSQL = await this.getCreateTableSQL(table);
            if (createSQL) {
              stream.write(`${createSQL};\n\n`);
            }
          }

          // Data
          if (type !== 'schema_only') {
            const rows = await this.getTableRows(table);
            if (rows.length > 0) {
              if (type === 'data_only') {
                stream.write(`-- ==================== ${table} ====================\n\n`);
              }
              // Get columns from first row
              const columns = Object.keys(rows[0]);
              const colList = columns.map(c => `\`${c}\``).join(', ');

              // Write in batches of 500 rows
              const batchSize = 500;
              for (let i = 0; i < rows.length; i += batchSize) {
                const batch = rows.slice(i, i + batchSize);
                stream.write(`INSERT INTO \`${table}\` (${colList}) VALUES\n`);
                const valueLines = batch.map(row => {
                  const vals = columns.map(col => this.escapeValue(row[col]));
                  return `(${vals.join(', ')})`;
                });
                stream.write(valueLines.join(',\n') + ';\n\n');
              }
            }
          }
        } catch (tableErr) {
          stream.write(`-- ERROR exporting table ${table}: ${(tableErr as Error).message}\n\n`);
          this.logger.warn(`Error exporting table ${table}: ${(tableErr as Error).message}`);
        }
      }

      stream.write(`COMMIT;\nSET FOREIGN_KEY_CHECKS = 1;\n`);

      // Wait for stream to finish
      await new Promise<void>((resolve, reject) => {
        stream.end(() => resolve());
        stream.on('error', reject);
      });

      const stats = fs.statSync(filePath);

      await this.prisma.backupLog.update({
        where: { id: backupLog.id },
        data: {
          status: 'completed',
          size: BigInt(stats.size),
        },
      });

      await this.updateLastBackupTime();
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
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

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

  // ==================== استعادة النسخة الاحتياطية ====================

  async restoreBackup(backupId: number) {
    const backup = await this.prisma.backupLog.findUnique({ where: { id: backupId } });
    if (!backup) throw new NotFoundException('النسخة الاحتياطية غير موجودة');

    const filePath = path.join(this.backupDir, backup.filename);
    if (!fs.existsSync(filePath)) throw new NotFoundException('ملف النسخة الاحتياطية غير موجود على الخادم');

    try {
      this.logger.log(`Starting restore from: ${backup.filename}`);
      await this.executeSqlFile(filePath);
      this.logger.log(`Restore completed from: ${backup.filename}`);
      await this.fixBackupStatusesAfterRestore();
      return { success: true, message: 'تمت استعادة النسخة الاحتياطية بنجاح' };
    } catch (error) {
      this.logger.error(`Restore failed: ${error.message}`);
      throw new BadRequestException(`فشل استعادة النسخة الاحتياطية: ${error.message}`);
    }
  }

  async restoreFromFile(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('لم يتم رفع أي ملف');

    const tempPath = path.join(this.backupDir, `temp_restore_${Date.now()}.sql`);
    try {
      fs.writeFileSync(tempPath, file.buffer);
      this.logger.log('Starting restore from uploaded file');
      await this.executeSqlFile(tempPath);
      this.logger.log('Restore from uploaded file completed');
      await this.fixBackupStatusesAfterRestore();
      return { success: true, message: 'تمت استعادة النسخة الاحتياطية من الملف المرفوع بنجاح' };
    } catch (error) {
      this.logger.error(`Restore from file failed: ${error.message}`);
      throw new BadRequestException(`فشل استعادة النسخة الاحتياطية: ${error.message}`);
    } finally {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  }

  /** تنفيذ ملف SQL عبر Prisma $executeRawUnsafe */
  private async executeSqlFile(filePath: string) {
    const sql = fs.readFileSync(filePath, 'utf8');

    // Split statements by semicolons (handling multi-line statements)
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      if (!stmt || stmt.startsWith('--')) continue;
      try {
        await this.prisma.$executeRawUnsafe(stmt);
      } catch (err) {
        // Skip comments and empty statements, log real errors
        if (!stmt.startsWith('--') && stmt.length > 5) {
          this.logger.warn(`Restore statement warning: ${(err as Error).message?.substring(0, 100)}`);
        }
      }
    }
  }

  private async fixBackupStatusesAfterRestore() {
    const inProgressBackups = await this.prisma.backupLog.findMany({ where: { status: 'in_progress' } });
    for (const backup of inProgressBackups) {
      const filePath = path.join(this.backupDir, backup.filename);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          await this.prisma.backupLog.update({
            where: { id: backup.id },
            data: { status: 'completed', size: BigInt(stats.size) },
          });
        }
      }
    }
  }

  // ==================== عرض وإدارة النسخ ====================

  async getBackupList() {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const stuckBackups = await this.prisma.backupLog.findMany({
      where: { status: 'in_progress', createdAt: { lt: tenMinutesAgo } },
    });

    for (const backup of stuckBackups) {
      const filePath = path.join(this.backupDir, backup.filename);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
          await this.prisma.backupLog.update({
            where: { id: backup.id },
            data: { status: 'completed', size: BigInt(stats.size) },
          });
          continue;
        }
      }
      await this.prisma.backupLog.update({
        where: { id: backup.id },
        data: { status: 'failed', error: 'انتهت المهلة - تجاوزت النسخة الاحتياطية 10 دقائق بدون اكتمال' },
      });
    }

    const backups = await this.prisma.backupLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
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
    const backup = await this.prisma.backupLog.findUnique({ where: { id: backupId } });
    if (!backup) throw new NotFoundException('النسخة الاحتياطية غير موجودة');

    const filePath = path.join(this.backupDir, backup.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await this.prisma.backupLog.delete({ where: { id: backupId } });
    return { success: true, message: 'تم حذف النسخة الاحتياطية بنجاح' };
  }

  async downloadBackup(backupId: number) {
    const backup = await this.prisma.backupLog.findUnique({ where: { id: backupId } });
    if (!backup) throw new NotFoundException('النسخة الاحتياطية غير موجودة');

    const filePath = path.join(this.backupDir, backup.filename);
    if (!fs.existsSync(filePath)) throw new NotFoundException('ملف النسخة الاحتياطية غير موجود');
    return { filePath, filename: backup.filename };
  }

  // ==================== إعدادات النسخ الاحتياطي التلقائي ====================

  async getSettings() {
    let settings = await this.prisma.backupSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.backupSettings.create({
        data: { autoBackup: false, frequency: 'daily', maxBackups: 7 },
      });
    }
    return settings;
  }

  async updateSettings(data: { autoBackup?: boolean; frequency?: string; maxBackups?: number; userId?: string }) {
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
      },
    });
  }

  // ==================== النسخ الاحتياطي التلقائي (Cron) ====================

  @Cron('0 */1 * * *')
  async runScheduledBackup() {
    const settings = await this.getSettings();
    if (!settings.autoBackup) return;
    if (settings.nextBackupAt && new Date() < settings.nextBackupAt) return;

    this.logger.log('Running scheduled backup...');
    try {
      const adminUser = await this.prisma.user.findFirst({ where: { email: 'admin@codex.com' } });
      if (adminUser) await this.createBackup(adminUser.id, 'full', 'نسخة احتياطية تلقائية');

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
    const backups = await this.prisma.backupLog.findMany({
      where: { status: 'completed' },
      orderBy: { createdAt: 'desc' },
    });

    if (backups.length > settings.maxBackups) {
      const toDelete = backups.slice(settings.maxBackups);
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
      case 'daily': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        const next = new Date(now);
        next.setMonth(next.getMonth() + 1);
        return next;
      default: return new Date(now.getTime() + 24 * 60 * 60 * 1000);
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
