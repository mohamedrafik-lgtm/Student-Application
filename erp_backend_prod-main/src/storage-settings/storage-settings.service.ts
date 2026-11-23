import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';

export interface StorageConfig {
  storageMode: 'cloud' | 'local';
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface MigrationProgress {
  status: 'idle' | 'running' | 'completed' | 'failed';
  total: number;
  done: number;
  failed: number;
  errors: string[];
  startedAt?: Date;
  completedAt?: Date;
}

// كل الحقول التي تحتوي على روابط Cloudinary في قاعدة البيانات
const CLOUDINARY_FIELDS = [
  { model: 'user', urlField: 'photoUrl', idField: null },
  { model: 'news', urlField: 'image', idField: 'imageCloudinaryId' },
  { model: 'trainee', urlField: 'photoUrl', idField: 'photoCloudinaryId' },
  { model: 'systemSettings', urlField: 'centerLogo', idField: 'centerLogoCloudinaryId' },
  { model: 'systemSettings', urlField: 'idCardBackgroundImage', idField: 'idCardBackgroundCloudinaryId' },
  { model: 'idCardDesign', urlField: 'backgroundImage', idField: 'backgroundImageCloudinaryId' },
  { model: 'traineeDocument', urlField: 'filePath', idField: 'cloudinaryId' },
  { model: 'traineeRequest', urlField: 'attachmentUrl', idField: 'attachmentCloudinaryId' },
  { model: 'paperAnswerSheet', urlField: 'scannedImageUrl', idField: 'scannedImageCloudinaryId' },
  { model: 'complaintSuggestion', urlField: 'attachmentUrl', idField: 'attachmentCloudinaryId' },
];

// Setting keys in developer_settings table
const STORAGE_MODE_KEY = 'STORAGE_MODE';
const CLOUDINARY_CLOUD_NAME_KEY = 'CLOUDINARY_CLOUD_NAME';
const CLOUDINARY_API_KEY_KEY = 'CLOUDINARY_API_KEY';
const CLOUDINARY_API_SECRET_KEY = 'CLOUDINARY_API_SECRET';

@Injectable()
export class StorageSettingsService {
  private readonly logger = new Logger(StorageSettingsService.name);
  private readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
  private migrationProgress: MigrationProgress = {
    status: 'idle', total: 0, done: 0, failed: 0, errors: [],
  };

  constructor(private prisma: PrismaService) {}

  // ==================== تشفير ====================

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(text: string): string {
    try {
      const parts = text.split(':');
      const iv = Buffer.from(parts.shift()!, 'hex');
      const encryptedText = parts.join(':');
      const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return text;
    }
  }

  // ==================== قراءة / كتابة إعداد ====================

  private async getSetting(key: string): Promise<string | null> {
    const setting = await this.prisma.developerSettings.findUnique({
      where: { key, isActive: true },
    });
    if (!setting) return null;
    return setting.isEncrypted ? this.decrypt(setting.value) : setting.value;
  }

  private async upsertSetting(key: string, value: string, encrypted: boolean, description: string) {
    const storedValue = encrypted ? this.encrypt(value) : value;
    const existing = await this.prisma.developerSettings.findUnique({ where: { key } });
    if (existing) {
      await this.prisma.developerSettings.update({
        where: { key },
        data: { value: storedValue, isEncrypted: encrypted, description, category: 'storage' },
      });
    } else {
      await this.prisma.developerSettings.create({
        data: { key, value: storedValue, isEncrypted: encrypted, description, category: 'storage', isActive: true },
      });
    }
  }

  // ==================== جلب الإعدادات ====================

  async getStorageConfig(): Promise<StorageConfig> {
    const [mode, cloudName, apiKey, apiSecret] = await Promise.all([
      this.getSetting(STORAGE_MODE_KEY),
      this.getSetting(CLOUDINARY_CLOUD_NAME_KEY),
      this.getSetting(CLOUDINARY_API_KEY_KEY),
      this.getSetting(CLOUDINARY_API_SECRET_KEY),
    ]);

    return {
      storageMode: (mode as 'cloud' | 'local') || 'local',
      cloudName: cloudName || process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: apiKey || process.env.CLOUDINARY_API_KEY || '',
      apiSecret: apiSecret || process.env.CLOUDINARY_API_SECRET || '',
    };
  }

  /** نسخة آمنة للفرونت (بدون apiSecret كامل) */
  async getStorageConfigSafe() {
    const config = await this.getStorageConfig();
    return {
      storageMode: config.storageMode,
      cloudName: config.cloudName,
      apiKey: config.apiKey,
      apiSecret: config.apiSecret ? '••••••••' + config.apiSecret.slice(-4) : '',
      hasCloudCredentials: !!(config.cloudName && config.apiKey && config.apiSecret),
    };
  }

  // ==================== حفظ الإعدادات ====================

  async saveStorageConfig(data: {
    storageMode: 'cloud' | 'local';
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
  }) {
    await this.upsertSetting(STORAGE_MODE_KEY, data.storageMode, false, 'وضع التخزين: cloud أو local');

    if (data.cloudName !== undefined) {
      await this.upsertSetting(CLOUDINARY_CLOUD_NAME_KEY, data.cloudName, false, 'اسم سحابة Cloudinary');
    }
    if (data.apiKey !== undefined) {
      await this.upsertSetting(CLOUDINARY_API_KEY_KEY, data.apiKey, true, 'مفتاح API Cloudinary');
    }
    if (data.apiSecret !== undefined && !data.apiSecret.startsWith('••••')) {
      await this.upsertSetting(CLOUDINARY_API_SECRET_KEY, data.apiSecret, true, 'السر الخاص بـ Cloudinary API');
    }

    return { success: true, message: 'تم حفظ إعدادات التخزين بنجاح' };
  }

  // ==================== تحليل الصور السحابية ====================

  async analyzeCloudImages(): Promise<{ total: number; models: { model: string; field: string; count: number }[] }> {
    const models: { model: string; field: string; count: number }[] = [];
    let total = 0;

    for (const field of CLOUDINARY_FIELDS) {
      try {
        const count = await (this.prisma as any)[field.model].count({
          where: {
            [field.urlField]: { contains: 'cloudinary.com' },
          },
        });
        if (count > 0) {
          models.push({ model: field.model, field: field.urlField, count });
          total += count;
        }
      } catch (err) {
        this.logger.warn(`Could not analyze ${field.model}.${field.urlField}: ${(err as Error).message}`);
      }
    }

    return { total, models };
  }

  // ==================== تحليل الملفات المحلية ====================

  async analyzeLocalFiles(): Promise<{ total: number; models: { model: string; field: string; count: number }[] }> {
    const models: { model: string; field: string; count: number }[] = [];
    let total = 0;

    for (const field of CLOUDINARY_FIELDS) {
      try {
        const count = await (this.prisma as any)[field.model].count({
          where: {
            [field.urlField]: { not: null, startsWith: '/uploads/' },
          },
        });
        if (count > 0) {
          models.push({ model: field.model, field: field.urlField, count });
          total += count;
        }
      } catch (err) {
        this.logger.warn(`Could not analyze local ${field.model}.${field.urlField}: ${(err as Error).message}`);
      }
    }

    return { total, models };
  }

  // ==================== النقل من المحلي للسحابة ====================

  async migrateLocalToCloud(): Promise<{ success: boolean; message: string }> {
    if (this.migrationProgress.status === 'running') {
      throw new BadRequestException('عملية النقل جارية بالفعل');
    }

    // التحقق من بيانات Cloudinary
    const config = await this.getStorageConfig();
    if (!config.cloudName || !config.apiKey || !config.apiSecret) {
      throw new BadRequestException('يجب إدخال بيانات Cloudinary أولاً');
    }

    this.migrationProgress = {
      status: 'running', total: 0, done: 0, failed: 0, errors: [], startedAt: new Date(),
    };

    const analysis = await this.analyzeLocalFiles();
    this.migrationProgress.total = analysis.total;

    if (analysis.total === 0) {
      this.migrationProgress.status = 'completed';
      this.migrationProgress.completedAt = new Date();
      await this.upsertSetting(STORAGE_MODE_KEY, 'cloud', false, 'وضع التخزين: cloud أو local');
      return { success: true, message: 'لا توجد ملفات محلية للنقل. تم التحويل إلى التخزين السحابي.' };
    }

    // تهيئة Cloudinary
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });

    this.runLocalToCloudMigration().catch(err => {
      this.logger.error('Local→Cloud migration failed:', err);
      this.migrationProgress.status = 'failed';
      this.migrationProgress.errors.push(err.message);
    });

    return {
      success: true,
      message: `بدأ رفع ${analysis.total} ملف من التخزين المحلي إلى Cloudinary...`,
    };
  }

  private async runLocalToCloudMigration() {
    const uploadsDir = path.join(process.cwd(), 'uploads');

    for (const fieldDef of CLOUDINARY_FIELDS) {
      try {
        const records = await (this.prisma as any)[fieldDef.model].findMany({
          where: {
            [fieldDef.urlField]: { not: null, startsWith: '/uploads/' },
          },
          select: { id: true, [fieldDef.urlField]: true },
        });

        for (const record of records) {
          const localUrl: string = record[fieldDef.urlField];
          if (!localUrl || !localUrl.startsWith('/uploads/')) continue;

          try {
            // تحديد المسار الفعلي للملف
            const relativePath = localUrl.replace(/^\/uploads\//, '');
            const absolutePath = path.join(uploadsDir, relativePath);

            if (!fs.existsSync(absolutePath)) {
              throw new Error(`الملف غير موجود: ${localUrl}`);
            }

            // تحديد المجلد على Cloudinary
            const folder = this.detectFolder(fieldDef.model, fieldDef.urlField);

            // رفع الملف إلى Cloudinary
            const result = await cloudinary.uploader.upload(absolutePath, {
              folder: `erp/${folder}`,
              resource_type: 'auto',
              use_filename: true,
              unique_filename: true,
            });

            // تحديث قاعدة البيانات
            const updateData: any = { [fieldDef.urlField]: result.secure_url };
            if (fieldDef.idField) {
              updateData[fieldDef.idField] = result.public_id;
            }

            await (this.prisma as any)[fieldDef.model].update({
              where: { id: record.id },
              data: updateData,
            });

            this.migrationProgress.done++;
            this.logger.log(`Uploaded ${fieldDef.model}#${record.id}: ${localUrl} → ${result.secure_url}`);
          } catch (err) {
            this.migrationProgress.failed++;
            const errMsg = `${fieldDef.model}#${record.id}: ${(err as Error).message}`;
            this.migrationProgress.errors.push(errMsg);
            this.logger.error(`Upload error: ${errMsg}`);
          }
        }
      } catch (err) {
        this.logger.error(`Error processing ${fieldDef.model}.${fieldDef.urlField}: ${(err as Error).message}`);
      }
    }

    if (this.migrationProgress.failed === 0) {
      await this.upsertSetting(STORAGE_MODE_KEY, 'cloud', false, 'وضع التخزين: cloud أو local');
    }

    this.migrationProgress.status = this.migrationProgress.failed > 0 ? 'failed' : 'completed';
    this.migrationProgress.completedAt = new Date();

    this.logger.log(
      `Local→Cloud migration finished: ${this.migrationProgress.done} done, ${this.migrationProgress.failed} failed out of ${this.migrationProgress.total}`,
    );
  }

  // ==================== النقل من السحابة للمحلي ====================

  getMigrationProgress(): MigrationProgress {
    return { ...this.migrationProgress };
  }

  async migrateCloudToLocal(): Promise<{ success: boolean; message: string }> {
    if (this.migrationProgress.status === 'running') {
      throw new BadRequestException('عملية النقل جارية بالفعل');
    }

    this.migrationProgress = {
      status: 'running', total: 0, done: 0, failed: 0, errors: [], startedAt: new Date(),
    };

    // التحليل أولاً
    const analysis = await this.analyzeCloudImages();
    this.migrationProgress.total = analysis.total;

    if (analysis.total === 0) {
      this.migrationProgress.status = 'completed';
      this.migrationProgress.completedAt = new Date();
      // تحويل الوضع مباشرة
      await this.upsertSetting(STORAGE_MODE_KEY, 'local', false, 'وضع التخزين: cloud أو local');
      return { success: true, message: 'لا توجد صور سحابية للنقل. تم التحويل إلى التخزين المحلي.' };
    }

    // بدء النقل في الخلفية
    this.runMigration().catch(err => {
      this.logger.error('Migration failed:', err);
      this.migrationProgress.status = 'failed';
      this.migrationProgress.errors.push(err.message);
    });

    return {
      success: true,
      message: `بدأ نقل ${analysis.total} ملف من السحابة إلى التخزين المحلي...`,
    };
  }

  private async runMigration() {
    const uploadsDir = path.join(process.cwd(), 'uploads');

    for (const fieldDef of CLOUDINARY_FIELDS) {
      try {
        const records = await (this.prisma as any)[fieldDef.model].findMany({
          where: {
            [fieldDef.urlField]: { not: null, contains: 'cloudinary.com' },
          },
          select: { id: true, [fieldDef.urlField]: true },
        });

        for (const record of records) {
          const cloudUrl: string = record[fieldDef.urlField];
          if (!cloudUrl || !cloudUrl.includes('cloudinary.com')) continue;

          try {
            // تحديد المجلد المناسب
            const folder = this.detectFolder(fieldDef.model, fieldDef.urlField);
            const folderPath = path.join(uploadsDir, folder);
            if (!fs.existsSync(folderPath)) {
              fs.mkdirSync(folderPath, { recursive: true });
            }

            // تحميل الملف
            const ext = this.extractExtension(cloudUrl);
            const filename = `${Date.now()}-${uuidv4()}${ext}`;
            const filePath = path.join(folderPath, filename);

            await this.downloadFile(cloudUrl, filePath);

            // التحقق من صحة الملف
            const stats = fs.statSync(filePath);
            if (stats.size < 100) {
              throw new Error(`الملف صغير جداً (${stats.size} bytes) - ربما فشل التحميل`);
            }

            // تحديث قاعدة البيانات
            const newUrl = `/uploads/${folder}/${filename}`;
            const updateData: any = { [fieldDef.urlField]: newUrl };
            if (fieldDef.idField) {
              updateData[fieldDef.idField] = null;
            }

            await (this.prisma as any)[fieldDef.model].update({
              where: { id: record.id },
              data: updateData,
            });

            this.migrationProgress.done++;
            this.logger.log(`Migrated ${fieldDef.model}#${record.id}: ${cloudUrl} → ${newUrl}`);
          } catch (err) {
            this.migrationProgress.failed++;
            const errMsg = `${fieldDef.model}#${record.id}: ${(err as Error).message}`;
            this.migrationProgress.errors.push(errMsg);
            this.logger.error(`Migration error: ${errMsg}`);
          }
        }
      } catch (err) {
        this.logger.error(`Error processing ${fieldDef.model}.${fieldDef.urlField}: ${(err as Error).message}`);
      }
    }

    // اكتمل النقل
    if (this.migrationProgress.failed === 0) {
      // تحويل الوضع للمحلي فقط إذا لم يكن هناك أخطاء
      await this.upsertSetting(STORAGE_MODE_KEY, 'local', false, 'وضع التخزين: cloud أو local');
    }

    this.migrationProgress.status = this.migrationProgress.failed > 0 ? 'failed' : 'completed';
    this.migrationProgress.completedAt = new Date();

    this.logger.log(
      `Migration finished: ${this.migrationProgress.done} done, ${this.migrationProgress.failed} failed out of ${this.migrationProgress.total}`,
    );
  }

  // ==================== أدوات مساعدة ====================

  private detectFolder(model: string, field: string): string {
    if (model === 'trainee') return 'trainees';
    if (model === 'user') return 'avatars';
    if (model === 'news') return 'news';
    if (model === 'systemSettings' && field === 'centerLogo') return 'logos';
    if (model === 'systemSettings' && field === 'idCardBackgroundImage') return 'idcards';
    if (model === 'idCardDesign') return 'idcards';
    if (model === 'traineeDocument') return 'documents';
    if (model === 'traineeRequest') return 'documents';
    if (model === 'complaintSuggestion') return 'documents';
    if (model === 'officialLetter') return 'documents';
    if (model === 'boardMeetingMinute') return 'documents';
    if (model === 'paperAnswerSheet') return 'documents';
    return 'general';
  }

  private extractExtension(url: string): string {
    try {
      const urlPath = new URL(url).pathname;
      const ext = path.extname(urlPath);
      return ext || '.jpg';
    } catch {
      return '.jpg';
    }
  }

  private downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const file = fs.createWriteStream(dest);
      protocol.get(url, (response) => {
        // متابعة التحويلات Redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            file.close();
            fs.unlinkSync(dest);
            this.downloadFile(redirectUrl, dest).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          reject(new Error(`HTTP ${response.statusCode} عند تحميل ${url}`));
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve());
        });
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
    });
  }
}
