import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { DatabaseWhatsAppService } from './database-whatsapp.service';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';

export interface WhatsAppStatus {
  isReady: boolean;
  isConnected: boolean;
  qrCode?: string;
  phoneNumber?: string;
  lastActivity?: Date;
  storageType: 'file' | 'database';
}

/**
 * Unified WhatsApp Service - خدمة موحدة تدعم النظامين
 * 
 * يختار تلقائياً بين:
 * - File Storage (نظام الملفات)
 * - Database Storage (قاعدة البيانات)
 * 
 * بناءً على متغير البيئة: WHATSAPP_STORAGE_TYPE
 */
@Injectable()
export class UnifiedWhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(UnifiedWhatsAppService.name);
  private activeService: WhatsAppService | DatabaseWhatsAppService;
  private storageType: 'file' | 'database';

  constructor(
    private configService: ConfigService,
    private moduleRef: ModuleRef,
    @Inject('ACTIVE_WHATSAPP_SERVICE') activeService: any,
  ) {
    // اختيار نوع التخزين من متغيرات البيئة
    this.storageType = this.configService.get<string>('WHATSAPP_STORAGE_TYPE', 'database') as 'file' | 'database';
    this.activeService = activeService;
  }

  async onModuleInit() {
    this.logger.log(`🚀 Unified WhatsApp initialized with ${this.storageType.toUpperCase()} storage`);
  }

  /**
   * الحصول على QR Code
   */
  async getQRCode(): Promise<{ qrCode?: string; isReady: boolean }> {
    if (this.storageType === 'database') {
      return (this.activeService as DatabaseWhatsAppService).getQRCode();
    } else {
      const result = await (this.activeService as WhatsAppService).getQRCode();
      return { qrCode: result.qrCode, isReady: this.activeService['isReady'] || false };
    }
  }

  /**
   * الحصول على الحالة
   */
  async getStatus(): Promise<WhatsAppStatus> {
    const status = await this.activeService.getStatus();
    return {
      ...status,
      storageType: this.storageType
    };
  }

  /**
   * التحقق من جاهزية الواتساب
   */
  async isClientReallyReady(): Promise<boolean> {
    return this.activeService.isClientReallyReady();
  }

  /**
   * إرسال رسالة نصية
   */
  async sendMessage(phoneNumber: string, message: string, userId?: string): Promise<boolean> {
    return this.activeService.sendMessage(phoneNumber, message, userId);
  }

  /**
   * إرسال مستند/ملف
   */
  async sendDocument(
    phoneNumber: string, 
    documentPath: string, 
    fileName: string, 
    caption?: string, 
    userId?: string
  ): Promise<boolean> {
    return this.activeService.sendDocument(phoneNumber, documentPath, fileName, caption, userId);
  }

  /**
   * إرسال رسالة ترحيب
   */
  async sendWelcomeMessage(trainee: any): Promise<boolean> {
    if ('sendWelcomeMessage' in this.activeService) {
      return (this.activeService as any).sendWelcomeMessage(trainee);
    }
    
    // لن يصل هنا لأن كلا الـ services تحتوي على sendWelcomeMessage
    this.logger.warn('sendWelcomeMessage not found in active service');
    return false;
  }

  /**
   * إرسال بيانات الدخول لمنصة المتدربين
   */
  async sendPlatformCredentials(trainee: any): Promise<boolean> {
    if ('sendPlatformCredentials' in this.activeService) {
      return (this.activeService as any).sendPlatformCredentials(trainee);
    }
    this.logger.warn('sendPlatformCredentials not found in active service');
    return false;
  }

  /**
   * إرسال تأكيد دفع
   */
  async sendPaymentConfirmation(paymentId: number, userId?: string, amount?: number): Promise<boolean> {
    if ('sendPaymentConfirmation' in this.activeService) {
      return (this.activeService as any).sendPaymentConfirmation(paymentId, userId, amount);
    }
    
    this.logger.warn('sendPaymentConfirmation not found in active service');
    return false;
  }

  /**
   * إرسال تأكيد دفع ذكي
   */
  async sendSmartPaymentConfirmation(
    paymentId: number, 
    userId?: string, 
    totalAmount?: number, 
    smartPaymentResult?: any
  ): Promise<boolean> {
    if ('sendSmartPaymentConfirmation' in this.activeService) {
      return (this.activeService as any).sendSmartPaymentConfirmation(
        paymentId, 
        userId, 
        totalAmount, 
        smartPaymentResult
      );
    }
    
    this.logger.warn('sendSmartPaymentConfirmation not found in active service');
    return false;
  }

  /**
   * تنسيق رقم الهاتف
   */
  formatPhoneNumber(phone: string): string {
    // تنسيق موحد
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
    if (!cleaned.startsWith('20') && cleaned.startsWith('0')) cleaned = '20' + cleaned.substring(1);
    if (!cleaned.startsWith('20')) cleaned = '20' + cleaned;
    return cleaned + '@s.whatsapp.net';
  }

  /**
   * قطع الاتصال
   */
  async disconnect(): Promise<void> {
    if (this.storageType === 'database') {
      return (this.activeService as DatabaseWhatsAppService).disconnect();
    } else {
      // WhatsAppService لا يحتوي على disconnect، نقوم بإيقاف العملية
      this.logger.log('Disconnecting WhatsApp (file storage)...');
      if (this.activeService['baileysProcess']) {
        this.activeService['baileysProcess'].kill();
      }
    }
  }

  /**
   * معلومات نوع التخزين المستخدم
   */
  getStorageType(): 'file' | 'database' {
    return this.storageType;
  }

  /**
   * توليد QR Code جديد
   */
  async generateQR(): Promise<{ success: boolean; message: string; qrCode?: string }> {
    if ('generateQR' in this.activeService) {
      return (this.activeService as any).generateQR();
    }
    
    // fallback
    return {
      success: false,
      message: 'generateQR not implemented in active service'
    };
  }

  /**
   * إعادة تشغيل WhatsApp
   */
  async restart(): Promise<void> {
    if ('restart' in this.activeService) {
      return (this.activeService as any).restart();
    }
    
    this.logger.warn('restart not implemented in active service');
  }

  /**
   * معاينة نموذج رسالة الدفع
   */
  async previewPaymentSample(): Promise<any> {
    if ('previewPaymentSample' in this.activeService) {
      return (this.activeService as any).previewPaymentSample();
    }
    
    return { success: false, message: 'previewPaymentSample not implemented in active service' };
  }

  /**
   * معاينة نموذج رسالة الترحيب
   */
  async previewWelcomeSample(): Promise<any> {
    if ('previewWelcomeSample' in this.activeService) {
      return (this.activeService as any).previewWelcomeSample();
    }
    
    return { success: false, message: 'previewWelcomeSample not implemented in active service' };
  }

  /**
   * تسجيل الخروج من WhatsApp
   */
  async logout(): Promise<{ success: boolean; message: string }> {
    if ('logout' in this.activeService) {
      return (this.activeService as any).logout();
    }
    
    // fallback - استخدام disconnect
    await this.disconnect();
    return { success: true, message: 'تم تسجيل الخروج بنجاح' };
  }

  /**
   * التبديل بين أنواع التخزين (للإدارة)
   * ملاحظة: يتطلب إعادة تشغيل التطبيق لتطبيق التغيير
   */
  async switchStorageType(newType: 'file' | 'database'): Promise<void> {
    this.logger.warn(`⚠️ Storage type switching requires application restart`);
    this.logger.warn(`Please set WHATSAPP_STORAGE_TYPE=${newType} in .env and restart`);
    
    throw new Error('Storage type switching requires application restart. Please update WHATSAPP_STORAGE_TYPE in .env');
  }
}
