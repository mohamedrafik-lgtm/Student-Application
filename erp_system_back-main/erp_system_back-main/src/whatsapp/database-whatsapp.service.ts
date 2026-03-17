import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import { PdfGeneratorService } from '../pdf/pdf-generator.service';
import * as QRCode from 'qr-image';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface WhatsAppStatus {
  isReady: boolean;
  isConnected: boolean;
  qrCode?: string;
  phoneNumber?: string;
  lastActivity?: Date;
  storageType: 'database'; // للتمييز عن نظام الملفات
}

/**
 * Database WhatsApp Service - يحفظ الجلسات في قاعدة البيانات
 * 
 * المزايا:
 * ✅ نسخ احتياطي تلقائي
 * ✅ مركزية البيانات
 * ✅ سهولة المشاركة بين instances
 * ✅ مثالي للـ containerization
 */
@Injectable()
export class DatabaseWhatsAppService {
  private readonly logger = new Logger(DatabaseWhatsAppService.name);
  private baileysProcess: ChildProcess = null;
  private qrCode: string | null = null;
  private isReady = false;
  private isConnected = false;
  private phoneNumber: string | null = null;
  private lastActivity: Date | null = null;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private settingsService: SettingsService,
    private pdfGeneratorService: PdfGeneratorService,
  ) {
    // تحقق: فقط ابدأ التهيئة إذا كان هذا النوع المطلوب
    const storageType = process.env.WHATSAPP_STORAGE_TYPE || 'database';
    if (storageType === 'database') {
      this.logger.log('🗄️ Database Storage mode - initializing...');
      this.initializeClient();
    } else {
      this.logger.log('⏩ Database Storage skipped (using File Storage)');
    }
  }

  async initializeClient() {
    try {
      // العثور على ملف wrapper
      let wrapperPath = path.join(__dirname, 'database-baileys-wrapper.mjs');
      
      if (!fs.existsSync(wrapperPath)) {
        wrapperPath = path.join(__dirname, '..', '..', '..', 'src', 'whatsapp', 'database-baileys-wrapper.mjs');
      }
      
      if (!fs.existsSync(wrapperPath)) {
        wrapperPath = path.join(process.cwd(), 'src', 'whatsapp', 'database-baileys-wrapper.mjs');
      }
      
      if (!fs.existsSync(wrapperPath)) {
        throw new Error(`Database Baileys wrapper not found. Last tried: ${wrapperPath}`);
      }
      
      this.logger.log(`📁 Using Database wrapper at: ${wrapperPath}`);
      
      this.baileysProcess = spawn('node', [wrapperPath], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL
        }
      });

      // Handle messages from Baileys process
      this.baileysProcess.on('message', (message: any) => {
        this.handleBaileysMessage(message);
      });

      this.baileysProcess.stdout.on('data', (data) => {
        try {
          const lines = data.toString().split('\n').filter(line => line.trim());
          lines.forEach(line => {
            try {
              const message = JSON.parse(line);
              this.handleBaileysMessage(message);
            } catch (e) {
              this.logger.debug('Baileys output:', line);
            }
          });
        } catch (error) {
          this.logger.debug('Baileys:', data.toString());
        }
      });

      this.baileysProcess.stderr.on('data', (data) => {
        this.logger.error('Baileys error:', data.toString());
      });

      this.baileysProcess.on('exit', (code, signal) => {
        this.logger.warn(`Baileys process exited with code ${code}, signal ${signal}`);
        this.isReady = false;
        this.isConnected = false;
        
        // إعادة تشغيل تلقائية
        setTimeout(() => this.initializeClient(), 5000);
      });

      // تهيئة العملية
      this.baileysProcess.send({ command: 'initialize' });
      
    } catch (error) {
      this.logger.error('Failed to initialize Database WhatsApp:', error);
      throw error;
    }
  }

  private handleBaileysMessage(message: any) {
    const { type, data } = message;
    
    switch (type) {
      case 'qr':
        this.qrCode = data.qrCode;
        this.isReady = false;
        this.logger.log('📱 QR Code generated (stored in database)');
        break;
        
      case 'ready':
        this.isReady = true;
        this.isConnected = true;
        this.phoneNumber = data.phoneNumber;
        this.lastActivity = new Date();
        this.logger.log(`✅ WhatsApp connected: ${this.phoneNumber} (Database mode)`);
        break;
        
      case 'disconnected':
        this.isConnected = false;
        this.isReady = false;
        this.logger.warn('❌ WhatsApp disconnected');
        break;

      case 'session-corrupted':
        this.logger.warn('🗑️ Session corrupted, database cleaned');
        this.qrCode = null;
        break;
        
      case 'error':
        this.logger.error('Baileys error:', data.error);
        break;
    }
  }

  async getQRCode(): Promise<{ qrCode?: string; isReady: boolean }> {
    return {
      qrCode: this.qrCode,
      isReady: this.isReady
    };
  }

  async getStatus(): Promise<WhatsAppStatus> {
    // جلب عدد الجلسات المحفوظة في قاعدة البيانات
    const sessionsCount = await this.prisma.whatsAppSession.count();
    
    this.logger.log(`📊 Database sessions count: ${sessionsCount}`);
    
    return {
      isReady: this.isReady,
      isConnected: this.isConnected,
      qrCode: this.qrCode,
      phoneNumber: this.phoneNumber,
      lastActivity: this.lastActivity,
      storageType: 'database'
    };
  }

  async isClientReallyReady(): Promise<boolean> {
    if (!this.baileysProcess || !this.baileysProcess.connected) {
      this.logger.error('❌ Baileys process not connected');
      return false;
    }

    if (!this.isConnected || !this.isReady) {
      this.logger.warn('⚠️ WhatsApp not ready or connected');
      return false;
    }

    return true;
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // إزالة جميع الرموز غير الرقمية
    let cleaned = phoneNumber.replace(/\D/g, '');

    // معالجة الأرقام المصرية
    if (cleaned.startsWith('010') || cleaned.startsWith('011') || 
        cleaned.startsWith('012') || cleaned.startsWith('015')) {
      cleaned = '2' + cleaned;
    } else if (cleaned.startsWith('10') || cleaned.startsWith('11') || 
               cleaned.startsWith('12') || cleaned.startsWith('15')) {
      cleaned = '20' + cleaned;
    } else if (!cleaned.startsWith('2')) {
      cleaned = '2' + cleaned;
    }

    return cleaned;
  }

  async sendMessage(phoneNumber: string, message: string, userId?: string): Promise<boolean> {
    try {
      if (!await this.isClientReallyReady()) {
        throw new Error('WhatsApp client is not ready');
      }

      if (!this.baileysProcess.connected) {
        this.logger.error('❌ IPC channel is closed');
        throw new Error('IPC channel is not available');
      }

      // تنسيق رقم الهاتف قبل الإرسال
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      this.logger.log(`📱 Phone formatted: ${phoneNumber} → ${formattedPhone}`);

      // انتظار الرد من Baileys process
      const result = await new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.logger.error('⏱️ Timeout waiting for message result from Baileys');
          reject(new Error('Message send timeout'));
        }, 30000);

        const messageHandler = (msg: any) => {
          this.logger.debug(`📨 Received message from Baileys: ${msg.type}`);
          
          if (msg.type === 'message-result') {
            this.logger.log(`✅ Got message-result: ${JSON.stringify(msg.data)}`);
            clearTimeout(timeout);
            this.baileysProcess.off('message', messageHandler);
            resolve(msg.data.success);
          } else if (msg.type === 'error' && msg.data.command === 'send-message') {
            clearTimeout(timeout);
            this.baileysProcess.off('message', messageHandler);
            reject(new Error(msg.data.error));
          }
        };

        this.baileysProcess.on('message', messageHandler);
        
        this.logger.log(`📤 Sending command to Baileys: send-message to ${formattedPhone}`);
        this.baileysProcess.send({
          command: 'send-message',
          data: { phoneNumber: formattedPhone, message }
        });
        this.logger.log('✅ Command sent to Baileys process');
      });

      if (result) {
        this.lastActivity = new Date();
        this.logger.log(`✅ Message sent to ${phoneNumber} (Database mode)`);

        // تسجيل في Audit
        if (userId) {
          await this.auditService.log({
            action: 'WHATSAPP_MESSAGE_SENT',
            entity: 'WhatsApp',
            entityId: phoneNumber,
            details: { phoneNumber, message: message.substring(0, 100), storageType: 'database' },
            userId,
          });
        }
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`❌ Failed to send message to ${phoneNumber}:`, error);
      return false;
    }
  }

  async sendDocument(phoneNumber: string, documentPath: string, fileName: string, caption?: string, userId?: string): Promise<boolean> {
    try {
      if (!await this.isClientReallyReady()) {
        throw new Error('WhatsApp client is not ready');
      }

      // تنسيق رقم الهاتف قبل الإرسال
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // انتظار الرد من Baileys process
      const result = await new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Document send timeout'));
        }, 60000); // دقيقة للملفات الكبيرة

        const messageHandler = (msg: any) => {
          if (msg.type === 'document-result') {
            clearTimeout(timeout);
            this.baileysProcess.off('message', messageHandler);
            resolve(msg.data.success);
          } else if (msg.type === 'error' && msg.data.command === 'send-document') {
            clearTimeout(timeout);
            this.baileysProcess.off('message', messageHandler);
            reject(new Error(msg.data.error));
          }
        };

        this.baileysProcess.on('message', messageHandler);
        
        this.baileysProcess.send({
          command: 'send-document',
          data: { phoneNumber: formattedPhone, documentPath, fileName, caption }
        });
      });

      if (result) {
        this.lastActivity = new Date();
        this.logger.log(`✅ Document sent to ${phoneNumber} (Database mode)`);

        if (userId) {
          await this.auditService.log({
            action: 'WHATSAPP_DOCUMENT_SENT',
            entity: 'WhatsApp',
            entityId: phoneNumber,
            details: { phoneNumber, fileName, storageType: 'database' },
            userId,
          });
        }
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`❌ Failed to send document to ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * تنظيف جميع الجلسات من قاعدة البيانات
   */
  async clearAllSessions(): Promise<void> {
    try {
      this.logger.log('🗑️ Clearing all WhatsApp sessions from database...');
      
      await this.prisma.whatsAppSession.deleteMany({});
      
      if (this.baileysProcess?.connected) {
        this.baileysProcess.send({ command: 'clear-sessions' });
      }
      
      this.qrCode = null;
      this.isReady = false;
      this.isConnected = false;
      this.phoneNumber = null;
      
      this.logger.log('✅ All database sessions cleared');
    } catch (error) {
      this.logger.error('❌ Failed to clear database sessions:', error);
      throw error;
    }
  }

  /**
   * الحصول على معلومات الجلسات المحفوظة
   */
  async getSessionsInfo(): Promise<{
    total: number;
    sessions: Array<{ key: string; createdAt: Date; updatedAt: Date; size: number }>;
    totalSize: number;
  }> {
    const sessions = await this.prisma.whatsAppSession.findMany({
      select: {
        key: true,
        createdAt: true,
        updatedAt: true,
        data: true
      }
    });

    const totalSize = sessions.reduce((sum, s) => sum + s.data.length, 0);

    return {
      total: sessions.length,
      sessions: sessions.map(s => ({
        key: s.key,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        size: s.data.length
      })),
      totalSize
    };
  }

  /**
   * توليد QR Code جديد
   */
  async generateQR(): Promise<{ success: boolean; message: string; qrCode?: string }> {
    try {
      this.logger.log('🔄 Generate QR requested...');
      
      // قطع الاتصال أولاً وتنظيف الجلسات
      this.logger.log('🗑️ Clearing all sessions...');
      await this.clearAllSessions();
      
      // إيقاف العملية الحالية
      if (this.baileysProcess) {
        this.logger.log('⏹️ Stopping current Baileys process...');
        this.baileysProcess.kill();
        this.baileysProcess = null;
      }
      
      // إعادة ضبط الحالة
      this.isConnected = false;
      this.isReady = false;
      this.qrCode = null;
      this.phoneNumber = null;
      
      // انتظر قليلاً
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // إعادة التهيئة
      this.logger.log('🔄 Reinitializing...');
      await this.initializeClient();
      
      // انتظر حتى يتم توليد QR Code (حتى 15 ثانية)
      this.logger.log('⏳ Waiting for QR Code...');
      let attempts = 0;
      while (!this.qrCode && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
        
        if (attempts % 4 === 0) {
          this.logger.log(`⏳ Still waiting... (${attempts * 0.5}s)`);
        }
      }
      
      if (this.qrCode) {
        this.logger.log('✅ QR Code generated successfully!');
        return {
          success: true,
          message: 'تم إنشاء QR Code جديد',
          qrCode: this.qrCode
        };
      } else {
        this.logger.error('❌ QR Code not generated after 15 seconds');
        return {
          success: false,
          message: 'لم يتم توليد QR Code. تحقق من logs الخادم.'
        };
      }
    } catch (error) {
      this.logger.error('❌ Generate QR error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * إعادة تشغيل WhatsApp
   */
  async restart(): Promise<void> {
    this.logger.log('🔄 Restarting WhatsApp (Database mode)...');
    
    if (this.baileysProcess) {
      this.baileysProcess.kill();
    }
    
    this.isReady = false;
    this.isConnected = false;
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.initializeClient();
  }

  /**
   * إرسال رسالة ترحيب للمتدرب الجديد
   */
  async sendWelcomeMessage(trainee: any): Promise<boolean> {
    try {
      const settings = await this.settingsService.getSettings();
      const message = await this.buildWelcomeMessage(trainee, settings);

      const success = await this.sendMessage(trainee.phone, message);
      
      this.logger.log(`Welcome message ${success ? 'sent' : 'failed'} to ${trainee.nameAr}`);
      return success;
    } catch (error) {
      this.logger.error('Failed to send welcome message:', error);
      return false;
    }
  }

  async sendPlatformCredentials(trainee: any): Promise<boolean> {
    try {
      const settings = await this.settingsService.getSettings();
      const message = `🔐 بيانات الدخول لمنصة المتدربين
━━━━━━━━━━━━━━━━━━━━━━
مرحباً ${trainee.nameAr} 👋

تم إنشاء حسابك على منصة المتدربين الخاصة بـ:
${settings.centerName || 'مركز طيبة للتدريب المهني'}

📱 بيانات الدخول:
👤 اسم المستخدم: ${trainee.nationalId}
🔑 كلمة المرور: ${trainee.nationalId}

⚠️ يُنصح بتغيير كلمة المرور بعد أول تسجيل دخول

📌 من خلال المنصة يمكنك:
• متابعة الحضور والغياب
• الاطلاع على المدفوعات
• تسجيل الحضور بالكود أو QR
• رفع الوثائق المطلوبة
━━━━━━━━━━━━━━━━━━━━━━
${settings.centerName || 'مركز طيبة للتدريب المهني'} 💙`;

      const success = await this.sendMessage(trainee.phone, message);
      this.logger.log(`Platform credentials ${success ? 'sent' : 'failed'} to ${trainee.nameAr}`);
      return success;
    } catch (error) {
      this.logger.error('Failed to send platform credentials:', error);
      return false;
    }
  }

  /**
   * إرسال تأكيد دفع
   */
  async sendPaymentConfirmation(paymentId: number, userId?: string, currentPaymentAmount?: number): Promise<boolean> {
    try {
      // جلب بيانات الدفعة
      const payment = await this.prisma.traineePayment.findUnique({
        where: { id: paymentId },
        include: {
          trainee: {
            include: { program: true }
          },
          fee: {
            include: { program: true }
          }
        }
      });

      if (!payment) {
        this.logger.warn(`Payment not found for ID: ${paymentId}`);
        return false;
      }

      if (!payment.trainee?.phone) {
        this.logger.warn(`Trainee phone not found for payment ID: ${paymentId}`);
        return false;
      }

      const settings = await this.settingsService.getSettings();
      const message = await this.buildPaymentConfirmationMessage(payment, settings, currentPaymentAmount);
      
      // إرسال الرسالة النصية أولاً
      const success = await this.sendMessage(payment.trainee.phone, message, userId);
      
      this.logger.log(`Payment confirmation ${success ? 'sent' : 'failed'} to ${payment.trainee.nameAr}`);

      // توليد وإرسال ملف PDF الإيصال
      if (success) {
        try {
          this.logger.log(`[PDF Receipt] Generating receipt for payment ${paymentId}`);
          let receiptPath = await this.pdfGeneratorService.generatePaymentReceiptPdf(payment);
          
          if (receiptPath && fs.existsSync(receiptPath)) {
            const fileName = `إيصال_دفع_${payment.trainee.nameAr.replace(/\s+/g, '_')}_${payment.id}.pdf`;
            const receiptCaption = `📄 إيصال الدفع رقم #${payment.id.toString().padStart(6, '0')}`;
            
            const receiptSuccess = await this.sendDocument(payment.trainee.phone, receiptPath, fileName, receiptCaption, userId);
            
            if (receiptSuccess) {
              this.logger.log(`[PDF Receipt] ✅ Receipt sent to ${payment.trainee.nameAr}`);
            } else {
              this.logger.warn(`[PDF Receipt] ⚠️ Failed to send receipt to ${payment.trainee.nameAr}`);
            }
            
            // حذف الملف المؤقت بعد 15 ثانية
            setTimeout(() => {
              try {
                if (fs.existsSync(receiptPath)) {
                  fs.unlinkSync(receiptPath);
                }
              } catch (e) { /* تجاهل */ }
            }, 15000);
          } else {
            this.logger.warn(`[PDF Receipt] PDF generation failed for payment ${paymentId}`);
          }
        } catch (receiptError) {
          this.logger.error(`[PDF Receipt] Error generating/sending receipt:`, receiptError);
          // لا نفشل العملية - الرسالة النصية تم إرسالها
        }
      }

      return success;
    } catch (error) {
      this.logger.error('Failed to send payment confirmation:', error);
      return false;
    }
  }

  /**
   * إرسال تأكيد دفع ذكي مع إيصال PDF
   */
  async sendSmartPaymentConfirmation(paymentId: number, userId?: string, totalAmount?: number, smartPaymentResult?: any): Promise<boolean> {
    try {
      this.logger.log(`[Smart Payment] Starting for payment ID ${paymentId}`);
      
      const payment = await this.prisma.traineePayment.findUnique({
        where: { id: paymentId },
        include: {
          trainee: {
            include: { program: true }
          },
          fee: { include: { program: true } }
        }
      });

      if (!payment?.trainee?.phone) {
        this.logger.warn('[Smart Payment] Payment or phone not found');
        return false;
      }

      const trainee = payment.trainee;
      const settings = await this.settingsService.getSettings();
      
      // بناء رسالة الدفع الذكي
      const message = this.buildSmartPaymentMessage(trainee, smartPaymentResult, settings);
      
      // إرسال الرسالة النصية
      const messageSuccess = await this.sendMessage(trainee.phone, message, userId);
      
      if (!messageSuccess) {
        this.logger.error(`[Smart Payment] Failed to send text to ${trainee.nameAr}`);
        return false;
      }

      this.logger.log(`[Smart Payment] ✅ Text message sent to ${trainee.nameAr}`);

      // توليد وإرسال إيصال PDF
      try {
        const receiptPath = await this.pdfGeneratorService.generatePaymentReceiptPdf(payment);
        if (receiptPath && fs.existsSync(receiptPath)) {
          const fileName = `إيصال_دفع_${trainee.nameAr.replace(/\s+/g, '_')}_${payment.id}.pdf`;
          const caption = `📄 إيصال الدفع رقم #${payment.id.toString().padStart(6, '0')}`;
          
          const sent = await this.sendDocument(trainee.phone, receiptPath, fileName, caption, userId);
          this.logger.log(`[Smart Payment] PDF receipt ${sent ? '✅ sent' : '⚠️ failed'} to ${trainee.nameAr}`);
          
          setTimeout(() => {
            try { if (fs.existsSync(receiptPath)) fs.unlinkSync(receiptPath); } catch (e) { /* تجاهل */ }
          }, 15000);
        }
      } catch (pdfError) {
        this.logger.error(`[Smart Payment] PDF error:`, pdfError);
      }

      return true;
    } catch (error) {
      this.logger.error('[Smart Payment] Error:', error);
      return false;
    }
  }

  /**
   * إرسال رسالة بسيطة لدفع رسم محدد مع إيصال PDF
   */
  async sendSimplePaymentConfirmation(paymentId: number, userId?: string): Promise<boolean> {
    try {
      this.logger.log(`[Simple Payment] Starting for payment ID ${paymentId}`);
      
      const payment = await this.prisma.traineePayment.findUnique({
        where: { id: paymentId },
        include: {
          trainee: {
            include: { program: true }
          },
          fee: { include: { program: true } }
        }
      });

      if (!payment?.trainee?.phone) {
        this.logger.warn('[Simple Payment] Payment or phone not found');
        return false;
      }

      const trainee = payment.trainee;
      const settings = await this.settingsService.getSettings();
      
      // بناء رسالة الدفع البسيطة
      const message = this.buildSimplePaymentMessage(trainee, payment, settings);
      
      // إرسال الرسالة النصية
      const messageSuccess = await this.sendMessage(trainee.phone, message, userId);
      
      if (messageSuccess) {
        this.logger.log(`[Simple Payment] ✅ Simple message sent to ${trainee.nameAr}`);
        
        // توليد وإرسال إيصال PDF
        try {
          const receiptPath = await this.pdfGeneratorService.generatePaymentReceiptPdf(payment);
          if (receiptPath && fs.existsSync(receiptPath)) {
            const fileName = `إيصال_دفع_${trainee.nameAr.replace(/\s+/g, '_')}_${payment.id}.pdf`;
            const caption = `📄 إيصال الدفع رقم #${payment.id.toString().padStart(6, '0')}`;
            
            const sent = await this.sendDocument(trainee.phone, receiptPath, fileName, caption, userId);
            this.logger.log(`[Simple Payment] PDF receipt ${sent ? '✅ sent' : '⚠️ failed'} to ${trainee.nameAr}`);
            
            setTimeout(() => {
              try { if (fs.existsSync(receiptPath)) fs.unlinkSync(receiptPath); } catch (e) { /* تجاهل */ }
            }, 15000);
          }
        } catch (pdfError) {
          this.logger.error(`[Simple Payment] PDF error:`, pdfError);
        }
        
        return true;
      } else {
        this.logger.error(`[Simple Payment] ❌ Failed to send text to ${trainee.nameAr}`);
        return false;
      }

    } catch (error) {
      this.logger.error('[Simple Payment] Error:', error);
      return false;
    }
  }

  /**
   * بناء رسالة دفع بسيطة لرسم محدد
   */
  private buildSimplePaymentMessage(trainee: any, payment: any, settings: any): string {
    const now = new Date();
    const arabicDate = now.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const arabicTime = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const remaining = payment.amount - payment.paidAmount;
    const isFullyPaid = remaining <= 0;

    let message = `✅ *تأكيد دفع ناجح*\n\n`;
    message += `👤 *المتدرب:* ${trainee.nameAr}\n`;
    message += `📚 *البرنامج:* ${trainee.program?.nameAr || 'غير محدد'}\n\n`;
    
    message += `📋 *تفاصيل الدفع:*\n`;
    message += `${'─'.repeat(25)}\n`;
    message += `💵 *الرسم:* ${payment.fee?.name}\n`;
    message += `💰 *المبلغ المدفوع:* ${payment.paidAmount?.toLocaleString('ar-EG')} جنيه\n`;
    message += `📊 *حالة الدفع:* ${isFullyPaid ? '✅ مدفوع بالكامل' : '⏳ مدفوع جزئياً'}\n`;
    
    if (!isFullyPaid) {
      message += `📌 *المتبقي:* ${remaining?.toLocaleString('ar-EG')} جنيه\n`;
    }

    message += `\n📅 *تاريخ الدفع:* ${arabicDate}\n`;
    message += `⏰ *وقت الدفع:* ${arabicTime}\n\n`;

    if (settings?.centerName || settings?.organizationName) {
      message += `🏢 *${settings.centerName || settings.organizationName}*\n`;
    }
    if (settings?.organizationPhone) {
      message += `📞 ${settings.organizationPhone}\n`;
    }

    message += `\n✨ شكراً لك على ثقتك بنا `;

    return message;
  }

  private async buildWelcomeMessage(trainee: any, settings: any): Promise<string> {
    const now = new Date();
    const arabicDate = now.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const arabicTime = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const registrationNumber = `#${trainee.id.toString().padStart(6, '0')}`;
    const enrollmentTypeArabic = {
      REGULAR: '🏢 حضوري',
      DISTANCE: '🖥️ أونلاين',
      BOTH: '🔄 مختلط'
    }[trainee.enrollmentType] || trainee.enrollmentType;

    // الحصول على سعر البرنامج الأساسي
    let programBaseFee = 'غير محدد';
    if (trainee.program?.price) {
      programBaseFee = `${trainee.program.price.toLocaleString('ar-EG')} جنيه`;
    }

    return `🎉 مرحباً بك ${trainee.nameAr}
✨ تهانينا! تم تسجيلك بنجاح في:
${settings.centerName || 'مركز طيبة للتدريب المهني'}
━━━━━━━━━━━━━━━━━━━━━━
📋 بيانات التسجيل:
🆔 رقم التسجيل: ${registrationNumber.replace('#', '')}
📚 البرنامج: ${trainee.program?.nameAr || 'غير محدد'}
💰 الرسوم الأساسية: ${programBaseFee}
━━━━━━━━━━━━━━━━━━━━━━
🌟 نتمنى لك رحلة تعليمية مثمرة!
${settings.centerName || 'مركز طيبة للتدريب المهني'} 💙`;
  }

  private async buildPaymentConfirmationMessage(payment: any, settings: any, currentPaymentAmount?: number): Promise<string> {
    const now = new Date();
    const arabicDate = now.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
    });
    const arabicTime = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const receiptNumber = `#${payment.id.toString().padStart(6, '0')}`;
    const actualPaidAmount = currentPaymentAmount || payment.paidAmount || 0;
    
    // جلب إجمالي مديونية المتدرب الحالية
    const traineeId = payment.trainee.id;
    const totalDebtInfo = await this.calculateTraineeDebtStatus(traineeId);
    
    const feeNameAr = payment.fee?.name || 'رسوم تدريب';
    const centerName = settings.centerName || 'مركز تدريب مهني';

    return `🌟 أهلاً وسهلاً ${payment.trainee.nameAr}
🎉 تهانينا! تم السداد بنجاح

✅ تم تسديد رسوم ${feeNameAr} بنجاح
📋 رقم المعاملة: ${receiptNumber}
📅 ${arabicDate} - ${arabicTime}

👤 بيانات الطالب: ${payment.trainee.nameAr} | 🎓 البرنامج: ${payment.trainee.program?.nameAr || 'غير محدد'}

💰 تفاصيل الدفع: ${actualPaidAmount.toLocaleString('ar-EG')} جنيه

📊 حالة المديونية: إجمالي المدفوع ${totalDebtInfo.totalPaid.toLocaleString('ar-EG')} جم | المتبقي ${totalDebtInfo.totalRemaining.toLocaleString('ar-EG')} جم

🏫 ${centerName}`;
  }

  private async calculateTraineeDebtStatus(traineeId: number): Promise<{ totalPaid: number; totalRemaining: number; totalDue: number }> {
    try {
      const payments = await this.prisma.traineePayment.findMany({
        where: { traineeId },
        include: { fee: true }
      });

      let totalDue = 0;
      let totalPaid = 0;

      payments.forEach(payment => {
        totalDue += payment.amount;
        totalPaid += payment.paidAmount;
      });

      const totalRemaining = totalDue - totalPaid;

      return {
        totalPaid,
        totalRemaining: Math.max(0, totalRemaining),
        totalDue
      };
    } catch (error) {
      this.logger.error('خطأ في حساب حالة المديونية:', error);
      return {
        totalPaid: 0,
        totalRemaining: 0,
        totalDue: 0
      };
    }
  }

  private buildSmartPaymentMessage(trainee: any, smartPaymentResult: any, settings: any): string {
    const now = new Date();
    const arabicDate = now.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const arabicTime = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });

    let message = `🎉 *تأكيد دفع ذكي ناجح*\n\n`;
    message += `👤 *المتدرب:* ${trainee.nameAr}\n`;
    message += `📚 *البرنامج:* ${trainee.program?.nameAr || 'غير محدد'}\n`;
    message += `💰 *إجمالي المبلغ المدفوع:* ${smartPaymentResult.totalAmountPaid?.toLocaleString('ar-EG')} جنيه\n`;
    message += `📋 *عدد الرسوم المسددة:* ${smartPaymentResult.processedPayments}\n\n`;

    message += `📝 *تفاصيل الرسوم المسددة:*\n`;
    message += `${'─'.repeat(25)}\n`;

    smartPaymentResult.paymentDetails.forEach((detail: any, index: number) => {
      message += `${index + 1}. *${detail.feeName}*\n`;
      message += `   💵 المبلغ المدفوع: ${detail.appliedAmount?.toLocaleString('ar-EG')} جنيه\n`;
      message += `   ✅ الحالة: ${detail.isFullyPaid ? 'مدفوعة كاملة' : 'مدفوعة جزئياً'}\n\n`;
    });

    if (smartPaymentResult.fullyPaidCount > 0) {
      message += `✅ *${smartPaymentResult.fullyPaidCount} رسوم تم دفعها كاملة*\n`;
    }

    if (smartPaymentResult.partiallyPaidCount > 0) {
      message += `📝 *${smartPaymentResult.partiallyPaidCount} رسوم مدفوعة جزئياً*\n`;
    }

    message += `\n📅 *التاريخ:* ${arabicDate} - ${arabicTime}\n`;
    message += `🏫 *${settings.centerName || 'مركز تدريب مهني'}*\n\n`;
    message += `📄 *سيتم إرسال إيصال PDF شامل تلقائياً...*`;

    return message;
  }

  async disconnect(): Promise<void> {
    try {
      this.logger.log('🔌 Disconnecting from WhatsApp (Database mode)...');
      
      if (this.baileysProcess) {
        this.baileysProcess.send({ command: 'shutdown' });
        
        setTimeout(() => {
          if (this.baileysProcess) {
            this.baileysProcess.kill();
          }
        }, 5000);
      }
      
      await this.clearAllSessions();
      
      this.isReady = false;
      this.isConnected = false;
      
      this.logger.log('✅ Disconnected successfully (Database sessions cleared)');
    } catch (error) {
      this.logger.error('❌ Disconnect error:', error);
      throw error;
    }
  }
}
