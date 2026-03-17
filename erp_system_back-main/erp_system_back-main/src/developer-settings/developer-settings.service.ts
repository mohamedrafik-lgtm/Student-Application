import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeveloperSettingDto, UpdateDeveloperSettingDto } from './dto/developer-settings.dto';
import * as crypto from 'crypto';

@Injectable()
export class DeveloperSettingsService {
  private readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
  private readonly ENCRYPTION_IV_LENGTH = 16;

  constructor(private prisma: PrismaService) {}

  /**
   * تشفير القيمة
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ENCRYPTION_IV_LENGTH);
    const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * فك تشفير القيمة
   */
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
    } catch (error) {
      console.error('خطأ في فك التشفير:', error);
      return text; // إرجاع النص الأصلي إذا فشل فك التشفير
    }
  }

  /**
   * إنشاء إعداد جديد
   */
  async create(createDto: CreateDeveloperSettingDto, userEmail: string) {
    // التحقق من عدم وجود المفتاح مسبقاً
    const existing = await this.prisma.developerSettings.findUnique({
      where: { key: createDto.key },
    });

    if (existing) {
      throw new ConflictException(`الإعداد بالمفتاح "${createDto.key}" موجود مسبقاً`);
    }

    // تشفير القيمة إذا لزم الأمر
    const value = createDto.isEncrypted !== false 
      ? this.encrypt(createDto.value)
      : createDto.value;

    return this.prisma.developerSettings.create({
      data: {
        key: createDto.key,
        value,
        description: createDto.description,
        category: createDto.category || 'general',
        isEncrypted: createDto.isEncrypted !== false,
        isActive: createDto.isActive !== false,
        updatedBy: userEmail,
      },
    });
  }

  /**
   * جلب جميع الإعدادات (بدون القيم المشفرة)
   */
  async findAll(includeValues = false) {
    const settings = await this.prisma.developerSettings.findMany({
      orderBy: { category: 'asc' },
    });

    if (!includeValues) {
      // إخفاء القيم المشفرة
      return settings.map(setting => ({
        ...setting,
        value: setting.isEncrypted ? '***encrypted***' : setting.value,
      }));
    }

    // فك تشفير القيم
    return settings.map(setting => ({
      ...setting,
      value: setting.isEncrypted ? this.decrypt(setting.value) : setting.value,
    }));
  }

  /**
   * جلب إعداد محدد
   */
  async findOne(id: string, decrypted = true) {
    const setting = await this.prisma.developerSettings.findUnique({
      where: { id },
    });

    if (!setting) {
      throw new NotFoundException('الإعداد غير موجود');
    }

    if (decrypted && setting.isEncrypted) {
      return {
        ...setting,
        value: this.decrypt(setting.value),
      };
    }

    return setting;
  }

  /**
   * جلب إعداد بالمفتاح
   */
  async findByKey(key: string): Promise<string | null> {
    const setting = await this.prisma.developerSettings.findUnique({
      where: { key, isActive: true },
    });

    if (!setting) {
      return null;
    }

    return setting.isEncrypted ? this.decrypt(setting.value) : setting.value;
  }

  /**
   * تحديث إعداد
   */
  async update(id: string, updateDto: UpdateDeveloperSettingDto, userEmail: string) {
    const setting = await this.findOne(id, false);

    const data: any = {
      updatedBy: userEmail,
    };

    if (updateDto.value !== undefined) {
      // تشفير القيمة الجديدة إذا لزم الأمر
      const shouldEncrypt = updateDto.isEncrypted !== undefined 
        ? updateDto.isEncrypted 
        : setting.isEncrypted;
      
      data.value = shouldEncrypt ? this.encrypt(updateDto.value) : updateDto.value;
    }

    if (updateDto.description !== undefined) {
      data.description = updateDto.description;
    }

    if (updateDto.category !== undefined) {
      data.category = updateDto.category;
    }

    if (updateDto.isEncrypted !== undefined) {
      data.isEncrypted = updateDto.isEncrypted;
    }

    if (updateDto.isActive !== undefined) {
      data.isActive = updateDto.isActive;
    }

    return this.prisma.developerSettings.update({
      where: { id },
      data,
    });
  }

  /**
   * حذف إعداد
   */
  async remove(id: string) {
    await this.findOne(id, false);
    return this.prisma.developerSettings.delete({
      where: { id },
    });
  }

  /**
   * جلب GEMINI_API_KEY من قاعدة البيانات
   */
  async getGeminiApiKey(): Promise<string | null> {
    return this.findByKey('GEMINI_API_KEY');
  }
}
