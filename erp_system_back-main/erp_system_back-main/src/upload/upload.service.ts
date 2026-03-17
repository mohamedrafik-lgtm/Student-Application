import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private configService: ConfigService,
    private cloudinaryService: CloudinaryService
  ) {
    // التأكد من وجود المجلدات الأساسية
    this.ensureDirectoryExists('uploads');
    this.ensureDirectoryExists('uploads/trainees');
    this.ensureDirectoryExists('uploads/news');
    this.ensureDirectoryExists('uploads/logos');
    this.ensureDirectoryExists('uploads/lectures');
    this.ensureDirectoryExists('uploads/idcards');
    this.ensureDirectoryExists('uploads/avatars');
  }

  // دالة للتأكد من وجود المجلد
  private ensureDirectoryExists(dirPath: string): void {
    const fullPath = join(process.cwd(), dirPath);
    if (!existsSync(fullPath)) {
      this.logger.log(`Creating directory: ${fullPath}`);
      mkdirSync(fullPath, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File, folder: string = ''): Promise<any> {
    if (!file) {
      this.logger.error('No file provided');
      throw new BadRequestException('لم يتم توفير ملف للرفع');
    }

    this.logger.log(`Processing uploaded file: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}`);

    // قائمة المجلدات المسموح بها
    const allowedFolders = ['logos', 'trainees', 'lectures', 'idcards', 'news', 'documents', 'avatars'];

    // تنظيف اسم المجلد وتحديد مجلد الوجهة
    let targetFolder = 'general';
    if (folder && allowedFolders.includes(folder)) {
      targetFolder = folder;
    }

    // ✅ تخزين ملفات المحاضرات محلياً دائماً
    if (targetFolder === 'lectures') {
      this.logger.log('📁 Storing lecture PDF locally (not using Cloudinary)');
      return this.uploadFileLocally(file, targetFolder);
    }

    // استخدام Cloudinary للملفات الأخرى
    try {
      const result = await this.cloudinaryService.uploadFile(file, targetFolder);
      this.logger.log(`File uploaded successfully to Cloudinary: ${result.url}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to upload to Cloudinary, falling back to local storage:', error);
      // في حالة فشل Cloudinary، استخدم التخزين المحلي كبديل
      return this.uploadFileLocally(file, targetFolder);
    }
  }

  getFileUrl(filename: string, folder: string = ''): string {
    let url = '/uploads';
    
    if (folder) {
      url += `/${folder}`;
    }
    
    return `${url}/${filename}`;
  }

  /**
   * رفع الملف محلياً كبديل في حالة فشل Cloudinary
   */
  private async uploadFileLocally(file: Express.Multer.File, folder: string): Promise<any> {
    this.logger.log('Using local storage as fallback');

    // إنشاء اسم فريد للملف
    const fileExtension = extname(file.originalname);
    const timestamp = Date.now();
    const uniqueId = uuidv4();
    const newFilename = `${timestamp}-${uniqueId}${fileExtension}`;

    // تحديد مسار الحفظ الكامل
    const uploadsFolderPath = join(process.cwd(), 'uploads');
    let savePath = uploadsFolderPath;
    let saveUrl = '';

    if (folder) {
      savePath = join(uploadsFolderPath, folder);
      saveUrl = `/${folder}`;
    }

    // التأكد من وجود المجلد
    try {
      await fs.mkdir(savePath, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create directory: ${savePath}`, error.stack);
      throw new BadRequestException(`فشل إنشاء مجلد الوجهة: ${error.message}`);
    }

    // حفظ الملف
    const filePath = join(savePath, newFilename);

    try {
      if (file.buffer) {
        this.logger.log(`Writing file buffer to: ${filePath}`);
        await fs.writeFile(filePath, file.buffer);
      } else {
        this.logger.error('File buffer is undefined');
        throw new BadRequestException('بيانات الملف غير متوفرة');
      }
    } catch (error) {
      this.logger.error(`Failed to save file: ${filePath}`, error.stack);
      throw new BadRequestException(`فشل في حفظ الملف: ${error.message}`);
    }

    // إرجاع معلومات الملف المحفوظ
    const fileUrl = `/uploads${saveUrl}/${newFilename}`;

    this.logger.log(`File saved locally: ${fileUrl}`);
    return {
      success: true,
      url: fileUrl,
      filename: newFilename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      isLocal: true, // علامة للتمييز بين الملفات المحلية و Cloudinary
    };
  }

  // دالة للتأكد من أن اسم المجلد آمن
  private getSafeFolder(folder: string): string {
    if (!folder) return '';

    // تنظيف اسم المجلد من أي أحرف غير آمنة
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');

    // التحقق من أن المجلد موجود
    this.ensureDirectoryExists(`uploads/${safeFolder}`);

    return safeFolder;
  }

  /**
   * حذف ملف (يدعم Cloudinary والتخزين المحلي)
   */
  async deleteFile(filePath: string, publicId?: string): Promise<boolean> {
    try {
      // إذا كان لدينا public_id، فهو ملف Cloudinary
      if (publicId) {
        return await this.cloudinaryService.deleteFile(publicId);
      }

      // إذا كان URL من Cloudinary
      if (filePath.includes('cloudinary.com')) {
        const extractedPublicId = this.cloudinaryService.extractPublicIdFromUrl(filePath);
        if (extractedPublicId) {
          return await this.cloudinaryService.deleteFile(extractedPublicId);
        }
      }

      // ملف محلي
      if (filePath.startsWith('/uploads/')) {
        const localPath = join(process.cwd(), filePath.substring(1));
        if (existsSync(localPath)) {
          await fs.unlink(localPath);
          this.logger.log(`Local file deleted: ${localPath}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Error deleting file:', error);
      return false;
    }
  }
}