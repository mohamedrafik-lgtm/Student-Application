import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

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

  constructor(private configService: ConfigService) {
    // إعداد Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });

    this.logger.log('Cloudinary configured successfully');
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
