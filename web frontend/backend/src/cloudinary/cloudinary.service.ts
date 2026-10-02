import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export interface CloudinaryUploadResult {
  success: boolean;
  url: string;
  public_id: string;
  secure_url: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  width?: number;
  height?: number;
  format: string;
  resource_type: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
  private configLoaded = false;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // الإعداد الأولي من env (سيتم إعادة الإعداد من DB عند أول استخدام)
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
      this.configLoaded = true;
    }
    this.logger.log('Cloudinary service initialized');
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

  /** تحميل الإعدادات من قاعدة البيانات إن وُجدت */
  async ensureConfig(): Promise<boolean> {
    try {
      const settings = await this.prisma.developerSettings.findMany({
        where: { category: 'storage', isActive: true },
      });
      const getVal = (key: string) => {
        const s = settings.find(x => x.key === key);
        if (!s) return null;
        return s.isEncrypted ? this.decrypt(s.value) : s.value;
      };

      const dbCloudName = getVal('CLOUDINARY_CLOUD_NAME');
      const dbApiKey = getVal('CLOUDINARY_API_KEY');
      const dbApiSecret = getVal('CLOUDINARY_API_SECRET');

      const cloudName = dbCloudName || this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
      const apiKey = dbApiKey || this.configService.get<string>('CLOUDINARY_API_KEY');
      const apiSecret = dbApiSecret || this.configService.get<string>('CLOUDINARY_API_SECRET');

      if (cloudName && apiKey && apiSecret) {
        cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
        this.configLoaded = true;
        return true;
      }
      return false;
    } catch (err) {
      this.logger.warn('Could not load Cloudinary config from DB, using env');
      return this.configLoaded;
    }
  }

  /** التحقق من وضع التخزين الحالي */
  async getStorageMode(): Promise<'cloud' | 'local'> {
    try {
      const setting = await this.prisma.developerSettings.findUnique({
        where: { key: 'STORAGE_MODE', isActive: true },
      });
      if (setting) {
        return (setting.isEncrypted ? this.decrypt(setting.value) : setting.value) as 'cloud' | 'local';
      }
    } catch {}
    return 'cloud'; // الافتراضي = سحابي
  }

  /**
   * رفع ملف إلى Cloudinary
   */
  async uploadFile(
    file: Express.Multer.File, 
    folder: string = 'general'
  ): Promise<CloudinaryUploadResult> {
    if (!file) {
      throw new BadRequestException('لم يتم توفير ملف للرفع');
    }

    // تأكد من تحميل الإعدادات من DB أولاً
    await this.ensureConfig();

    this.logger.log(`Uploading file to Cloudinary: ${file.originalname}, size: ${file.size}`);

    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadOptions = {
          folder: `erp/${folder}`,
          resource_type: 'auto' as const,
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          // تحسينات للصور
          transformation: this.getTransformationByFolder(folder),
        };

        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
            if (error) {
              this.logger.error('Cloudinary upload error:', error);
              reject(error);
            } else if (result) {
              resolve(result);
            } else {
              reject(new Error('Unknown upload error'));
            }
          }
        ).end(file.buffer);
      });

      this.logger.log(`File uploaded successfully to Cloudinary: ${result.secure_url}`);

      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
        secure_url: result.secure_url,
        filename: result.original_filename || file.originalname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        width: result.width,
        height: result.height,
        format: result.format,
        resource_type: result.resource_type,
      };

    } catch (error) {
      this.logger.error('Failed to upload file to Cloudinary:', error);
      throw new BadRequestException(`فشل في رفع الملف: ${error.message}`);
    }
  }

  /**
   * حذف ملف من Cloudinary
   */
  async deleteFile(publicId: string): Promise<boolean> {
    try {
      this.logger.log(`Deleting file from Cloudinary: ${publicId}`);
      
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        this.logger.log(`File deleted successfully: ${publicId}`);
        return true;
      } else {
        this.logger.warn(`Failed to delete file: ${publicId}, result: ${result.result}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error deleting file from Cloudinary: ${publicId}`, error);
      return false;
    }
  }

  /**
   * الحصول على URL محسن للصورة
   */
  getOptimizedImageUrl(
    publicId: string, 
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
      format?: string;
    } = {}
  ): string {
    const {
      width = 800,
      height = 600,
      crop = 'limit',
      quality = 'auto:good',
      format = 'auto'
    } = options;

    return cloudinary.url(publicId, {
      width,
      height,
      crop,
      quality,
      format,
      fetch_format: 'auto',
      secure: true,
    });
  }

  /**
   * الحصول على تحويلات مخصصة حسب المجلد
   */
  private getTransformationByFolder(folder: string) {
    switch (folder) {
      case 'trainees':
        return [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ];
      
      case 'logos':
        return [
          { width: 500, height: 500, crop: 'limit' },
          { quality: 'auto:best' },
          { fetch_format: 'auto' }
        ];
      
      case 'idcards':
        return [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ];
      
      case 'news':
        return [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ];
      
      default:
        return [
          { width: 1024, height: 768, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ];
    }
  }

  /**
   * استخراج public_id من URL
   */
  extractPublicIdFromUrl(url: string): string | null {
    try {
      // مثال: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/erp/trainees/filename.jpg
      const regex = /\/v\d+\/(.+)\.[^.]+$/;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch (error) {
      this.logger.error('Error extracting public_id from URL:', error);
      return null;
    }
  }

  /**
   * التحقق من صحة إعدادات Cloudinary
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      const result = await cloudinary.api.ping();
      this.logger.log('Cloudinary configuration is valid');
      return result.status === 'ok';
    } catch (error) {
      this.logger.error('Cloudinary configuration is invalid:', error);
      return false;
    }
  }
}
