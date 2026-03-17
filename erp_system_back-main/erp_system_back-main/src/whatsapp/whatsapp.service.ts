import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qr-image';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import { PdfGeneratorService } from '../pdf/pdf-generator.service';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

export interface WhatsAppStatus {
  isReady: boolean;
  isConnected: boolean;
  qrCode?: string;
  phoneNumber?: string;
  lastActivity?: Date;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private baileysProcess: ChildProcess = null;
  private qrCode: string | null = null;
  private isReady = false;
  private isConnected = false;
  private phoneNumber: string | null = null;
  private lastActivity: Date | null = null;
  private authDir = './whatsapp-auth';

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private settingsService: SettingsService,
    private pdfGeneratorService: PdfGeneratorService,
  ) {
    // تحقق: فقط ابدأ التهيئة إذا كان هذا النوع المطلوب
    const storageType = process.env.WHATSAPP_STORAGE_TYPE || 'database';
    if (storageType === 'file') {
      this.logger.log('🗂️ File Storage mode - initializing...');
      this.initializeClient();
    } else {
      this.logger.log('⏩ File Storage skipped (using Database Storage)');
    }
  }

  async initializeClient() {
    try {
      // Ensure auth directory exists
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      // Spawn Baileys wrapper as ES Module
      // Use V2 wrapper if specified in env
      const wrapperVersion = process.env.WHATSAPP_WRAPPER_VERSION || 'v1';
      const wrapperFileName = wrapperVersion === 'v2' ? 'baileys-wrapper-v2.mjs' : 'baileys-wrapper.mjs';
      
      // Try different paths based on environment
      let wrapperPath = path.join(__dirname, wrapperFileName); // Production (dist folder)
      
      if (!fs.existsSync(wrapperPath)) {
        // Development - source path
        wrapperPath = path.join(__dirname, '..', '..', '..', 'src', 'whatsapp', wrapperFileName);
      }
      
      if (!fs.existsSync(wrapperPath)) {
        // Final fallback to project root
        wrapperPath = path.join(process.cwd(), 'src', 'whatsapp', wrapperFileName);
      }
      
      if (!fs.existsSync(wrapperPath)) {
        throw new Error(`Baileys wrapper not found at any of the expected paths. Last tried: ${wrapperPath}`);
      }
      
      this.logger.log(`Using wrapper version: ${wrapperVersion}`);
      
      this.logger.log(`Using Baileys wrapper at: ${wrapperPath}`);
      
      this.baileysProcess = spawn('node', [wrapperPath], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        cwd: process.cwd()
      });

      // Handle messages from Baileys process
      this.baileysProcess.on('message', (message: any) => {
        this.handleBaileysMessage(message);
      });

      // Handle process output
      this.baileysProcess.stdout.on('data', (data) => {
        try {
          const lines = data.toString().split('\n').filter(line => line.trim());
          lines.forEach(line => {
            try {
              const message = JSON.parse(line);
              this.handleBaileysMessage(message);
            } catch (e) {
              // Not JSON, probably debug output
              this.logger.debug('Baileys:', line);
            }
          });
        } catch (error) {
          this.logger.debug('Baileys output:', data.toString());
        }
      });

      this.baileysProcess.stderr.on('data', (data) => {
        this.logger.error('Baileys error:', data.toString());
      });

      this.baileysProcess.on('exit', (code, signal) => {
        this.logger.warn(`🚪 Baileys process exited with code ${code}, signal: ${signal}`);
        this.isConnected = false;
        this.isReady = false;
        
        // تنظيف المراجع
        this.baileysProcess = null;
        
        // إعادة التشغيل التلقائي إذا لم يكن إنهاءً مقصوداً
        if (code !== 0 && !signal) {
          this.logger.log('🔄 Attempting automatic restart...');
          setTimeout(() => {
            this.initializeClient().catch(err => {
              this.logger.error('Auto-restart failed:', err);
            });
          }, 5000);
        }
      });

      // معالج الأخطاء المحسن
      this.baileysProcess.on('error', (error) => {
        this.logger.error('❌ Baileys process error:', error);
        
        if ((error as any).code === 'ERR_IPC_CHANNEL_CLOSED') {
          this.logger.error('🔌 IPC channel closed, marking client as not ready');
          this.isConnected = false;
          this.isReady = false;
        }
      });

      // معالج قطع الاتصال
      this.baileysProcess.on('disconnect', () => {
        this.logger.warn('🔌 Baileys process disconnected');
        this.isConnected = false;
        this.isReady = false;
      });

    } catch (error) {
      this.logger.error('Failed to initialize WhatsApp client:', error);
    }
  }

  private handleBaileysMessage(message: any) {
    const { type, data } = message;
    
    switch (type) {
      case 'qr-generated':
        this.qrCode = data.qrCode;
        this.logger.log('QR Code generated');
        break;
      case 'connected':
        this.isConnected = true;
        this.isReady = true;
        this.qrCode = null;
        this.phoneNumber = data.phoneNumber;
        this.lastActivity = new Date();
        this.logger.log(`WhatsApp connected. Phone: ${this.phoneNumber}`);
        break;
      case 'connection-closed':
        this.isConnected = false;
        this.isReady = false;
        this.phoneNumber = null;
        this.logger.log('WhatsApp connection closed');
        break;
      case 'error':
        this.logger.error('Baileys error:', data.error);
        break;
    }
  }

  private async generateQRCodeDataURL(qr: string): Promise<string> {
    try {
      const qrCodeBuffer = QRCode.imageSync(qr, { type: 'png', size: 10 });
      const base64 = qrCodeBuffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      this.logger.error('Failed to generate QR code:', error);
      return null;
    }
  }

  async getStatus(): Promise<WhatsAppStatus> {
    return {
      isReady: this.isReady,
      isConnected: this.isConnected,
      qrCode: this.qrCode,
      phoneNumber: this.phoneNumber,
      lastActivity: this.lastActivity,
    };
  }

  async getQRCode(): Promise<{ qrCode: string | null }> {
    return { qrCode: this.qrCode };
  }

  async isClientReallyReady(): Promise<boolean> {
    // الفحوصات الأساسية
    if (!this.isReady || !this.isConnected) {
      return false;
    }

    // فحص العملية الفرعية
    if (!this.baileysProcess || this.baileysProcess.killed) {
      return false;
    }

    // فحص قناة IPC (هذا هو الإصلاح المهم)
    if (!this.baileysProcess.connected) {
      this.logger.warn('⚠️ IPC channel is closed, client not ready');
      return false;
    }

    return true;
  }

  async sendMessage(phoneNumber: string, message: string, userId?: string): Promise<boolean> {
    try {
      if (!await this.isClientReallyReady()) {
        throw new Error('WhatsApp client is not ready');
      }

      // فحص حالة قناة IPC قبل الإرسال
      if (!this.baileysProcess.connected) {
        this.logger.error('❌ IPC channel is closed');
        throw new Error('IPC channel is not available');
      }

      // Send message command to Baileys process
      this.baileysProcess.send({
        command: 'send-message',
        data: { phoneNumber, message }
      });
      
      this.lastActivity = new Date();
      this.logger.log(`Message sent successfully to ${phoneNumber}`);

      // Log to audit
      if (userId) {
        await this.auditService.log({
          action: 'WHATSAPP_MESSAGE_SENT',
          entity: 'WhatsApp',
          entityId: phoneNumber,
          details: { phoneNumber, message: message.substring(0, 100) },
          userId,
        });
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send message to ${phoneNumber}:`, error);
      
      // إذا كانت المشكلة في العملية أو IPC، حاول إعادة التشغيل
      if (error.message.includes('process') || 
          error.message.includes('IPC') || 
          error.message.includes('channel') ||
          (error as any).code === 'ERR_IPC_CHANNEL_CLOSED') {
        this.logger.warn('🔄 Attempting to restart WhatsApp client due to process error');
        this.initializeClient().catch(restartError => {
          this.logger.error('Failed to restart client:', restartError);
        });
      }
      
      // Log failure to audit
      if (userId) {
        try {
          await this.auditService.log({
            action: 'WHATSAPP_MESSAGE_FAILED',
            entity: 'WhatsApp',
            entityId: phoneNumber,
            details: { phoneNumber, error: error.message },
            userId,
          });
        } catch (auditError) {
          this.logger.warn('Failed to log audit:', auditError);
        }
      }
      
      return false;
    }
  }

  async sendDocument(phoneNumber: string, documentPath: string, fileName: string, caption?: string, userId?: string): Promise<boolean> {
    try {
      if (!await this.isClientReallyReady()) {
        throw new Error('WhatsApp client is not ready');
      }

      // Check if document file exists
      if (!fs.existsSync(documentPath)) {
        this.logger.warn(`Document file not found: ${documentPath}`);
        return false;
      }

      // فحص حالة قناة IPC قبل الإرسال
      if (!this.baileysProcess.connected) {
        this.logger.error('❌ IPC channel is closed for document sending');
        throw new Error('IPC channel is not available');
      }

      // Send document command to Baileys process
      this.baileysProcess.send({
        command: 'send-document',
        data: { phoneNumber, documentPath, fileName, caption }
      });
      
      this.lastActivity = new Date();
      this.logger.log(`Document sent successfully to ${phoneNumber}: ${fileName}`);

      // Log to audit
      if (userId) {
        await this.auditService.log({
          action: 'WHATSAPP_DOCUMENT_SENT',
          entity: 'WhatsAppDocument',
          entityId: phoneNumber,
          details: { phoneNumber, fileName, caption },
          userId,
        });
      }

      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send document to ${phoneNumber}:`, error);
      
      // إذا كانت المشكلة في العملية أو IPC، حاول إعادة التشغيل
      if (error.message.includes('process') || 
          error.message.includes('IPC') || 
          error.message.includes('channel') ||
          (error as any).code === 'ERR_IPC_CHANNEL_CLOSED') {
        this.logger.warn('🔄 Attempting to restart WhatsApp client due to process error in document sending');
        this.initializeClient().catch(restartError => {
          this.logger.error('Failed to restart client:', restartError);
        });
      }
      
      // Log failure to audit
      if (userId) {
        try {
          await this.auditService.log({
            action: 'WHATSAPP_DOCUMENT_FAILED',
            entity: 'WhatsAppDocument',
            entityId: phoneNumber,
            details: { phoneNumber, fileName, error: error.message },
            userId,
          });
        } catch (auditError) {
          this.logger.warn('Failed to log audit:', auditError);
        }
      }
      
      return false;
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Handle Egyptian numbers
    if (cleaned.startsWith('010') || cleaned.startsWith('011') || cleaned.startsWith('012') || cleaned.startsWith('015')) {
      cleaned = '2' + cleaned;
    } else if (cleaned.startsWith('10') || cleaned.startsWith('11') || cleaned.startsWith('12') || cleaned.startsWith('15')) {
      cleaned = '20' + cleaned;
    } else if (!cleaned.startsWith('2')) {
      cleaned = '2' + cleaned;
    }

    return cleaned;
  }

  async sendWelcomeMessage(trainee: any): Promise<boolean> {
    try {
      const settings = await this.settingsService.getSettings();
      const message = await this.buildWelcomeMessage(trainee, settings);

      const success = await this.sendMessage(trainee.phone, message);

      if (success && settings.centerLogo) {
        // Try to send logo
        await this.sendLogo(trainee.phone, settings.centerLogo);
      }

      return success;
    } catch (error) {
      this.logger.error('Failed to send welcome message:', error);
      return false;
    }
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

  async sendPlatformCredentials(trainee: any): Promise<boolean> {
    try {
      const settings = await this.settingsService.getSettings();
      const message = this.buildPlatformCredentialsMessage(trainee, settings);
      return await this.sendMessage(trainee.phone, message);
    } catch (error) {
      this.logger.error('Failed to send platform credentials:', error);
      return false;
    }
  }

  private buildPlatformCredentialsMessage(trainee: any, settings: any): string {
    return `🔐 بيانات الدخول لمنصة المتدربين
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
  }

  private getYearArabic(year: string): string {
    const yearMap = {
      FIRST: 'الأول',
      SECOND: 'الثاني',
      THIRD: 'الثالث',
      FOURTH: 'الرابع'
    };
    return yearMap[year] || year;
  }

  private async sendLogo(phoneNumber: string, logoPath: string): Promise<boolean> {
    try {
      if (!await this.isClientReallyReady()) {
        return false;
      }

      // Check if logo file exists
      const fullPath = path.join(process.cwd(), 'uploads', logoPath);
      if (!fs.existsSync(fullPath)) {
        this.logger.warn(`Logo file not found: ${fullPath}`);
        return false;
      }

      // فحص حالة قناة IPC قبل الإرسال
      if (!this.baileysProcess.connected) {
        this.logger.error('❌ IPC channel is closed for logo sending');
        throw new Error('IPC channel is not available');
      }

      // Send logo via Baileys process
      this.baileysProcess.send({
        command: 'send-image',
        data: { phoneNumber, imagePath: fullPath, caption: '🏢 لوجو المركز' }
      });

      this.logger.log(`Logo sent successfully to ${phoneNumber}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send logo to ${phoneNumber}:`, error);
      
      // إذا كانت المشكلة في العملية أو IPC، حاول إعادة التشغيل
      if (error.message.includes('process') || 
          error.message.includes('IPC') || 
          error.message.includes('channel') ||
          (error as any).code === 'ERR_IPC_CHANNEL_CLOSED') {
        this.logger.warn('🔄 Attempting to restart WhatsApp client due to process error in logo sending');
        this.initializeClient().catch(restartError => {
          this.logger.error('Failed to restart client:', restartError);
        });
      }
      
      return false;
    }
  }

  async restart(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('Restarting WhatsApp client...');
      
      if (this.baileysProcess && !this.baileysProcess.killed) {
        this.baileysProcess.kill();
        this.baileysProcess = null;
      }
      
      this.isReady = false;
      this.isConnected = false;
      this.qrCode = null;
      this.phoneNumber = null;
      
      setTimeout(() => this.initializeClient(), 2000);
      
      return { success: true, message: 'تم إعادة تشغيل WhatsApp بنجاح' };
    } catch (error) {
      this.logger.error('Failed to restart WhatsApp client:', error);
      return { success: false, message: 'فشل في إعادة تشغيل WhatsApp' };
    }
  }

  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('Logging out from WhatsApp...');
      
      if (this.baileysProcess && !this.baileysProcess.killed) {
        this.baileysProcess.kill();
        this.baileysProcess = null;
      }
      
      // Clear auth files
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
      }
      
      this.isReady = false;
      this.isConnected = false;
      this.qrCode = null;
      this.phoneNumber = null;
      
      return { success: true, message: 'تم تسجيل الخروج بنجاح' };
    } catch (error) {
      this.logger.error('Failed to logout from WhatsApp:', error);
      return { success: false, message: 'فشل في تسجيل الخروج' };
    }
  }

  async generateQR(): Promise<{ success: boolean; message: string; qrCode?: string }> {
    try {
      if (this.isConnected) {
        return { success: false, message: 'WhatsApp متصل بالفعل' };
      }
      
      await this.restart();
      
      // Wait for QR code generation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      if (this.qrCode) {
        return { success: true, message: 'تم إنشاء QR Code جديد', qrCode: this.qrCode };
      } else {
        return { success: false, message: 'فشل في إنشاء QR Code' };
      }
    } catch (error) {
      this.logger.error('Failed to generate QR code:', error);
      return { success: false, message: 'فشل في إنشاء QR Code' };
    }
  }

  async sendPaymentConfirmation(paymentId: number, userId?: string, currentPaymentAmount?: number): Promise<boolean> {
    try {
      console.log(`[WhatsApp Payment] Starting payment confirmation for ID ${paymentId}`);
      
      // التحقق من حالة الاتصال أولاً
      if (!await this.isClientReallyReady()) {
        this.logger.error(`[WhatsApp Payment] Client not ready for payment confirmation ${paymentId}`);
        return false;
      }

      // جلب بيانات الدفعة من قاعدة البيانات
      const payment = await this.prisma.traineePayment.findUnique({
        where: { id: paymentId },
        include: {
          trainee: {
            include: {
              program: true
            }
          },
          fee: true
        }
      });

      if (!payment) {
        this.logger.error(`[WhatsApp Payment] Payment ${paymentId} not found`);
        return false;
      }

      console.log(`[WhatsApp Payment] Payment details: ID=${payment.id}, Status=${payment.status}, PaidAmount=${payment.paidAmount}, TotalAmount=${payment.amount}`);
      console.log(`[WhatsApp Payment] Fee details: Name=${payment.fee?.name}, ID=${payment.fee?.id}`);
      console.log(`[WhatsApp Payment] Trainee details: Name=${payment.trainee?.nameAr}, Phone=${payment.trainee?.phone}`);

      // التحقق من وجود مبلغ مدفوع (وليس بالضرورة مدفوع بالكامل)
      if (payment.paidAmount <= 0) {
        this.logger.error(`[WhatsApp Payment] No amount paid for payment ${paymentId}. Paid Amount: ${payment.paidAmount}`);
        return false;
      }

      if (!payment.trainee?.phone) {
        this.logger.error(`[WhatsApp Payment] Trainee ${payment.trainee?.nameAr || 'Unknown'} has no phone number`);
        return false;
      }

      // تنسيق رقم الهاتف
      const formattedPhone = this.formatPhoneNumber(payment.trainee.phone);
      console.log(`[WhatsApp Payment] Sending confirmation to ${payment.trainee.nameAr} at ${formattedPhone}`);

      const settings = await this.settingsService.getSettings();
      const message = await this.buildPaymentConfirmationMessage(payment, settings, currentPaymentAmount);
      
      // إرسال رسالة النص أولاً
      const messageSuccess = await this.sendMessage(formattedPhone, message, userId);
      
      if (!messageSuccess) {
        console.error(`[WhatsApp Payment] ❌ Failed to send text message to ${payment.trainee.nameAr} (${formattedPhone})`);
        return false;
      }

      console.log(`[WhatsApp Payment] ✅ Text message sent successfully to ${payment.trainee.nameAr} (${formattedPhone})`);
      
      // توليد وإرسال ملف الإيصال مع طريقة بديلة
      try {
        console.log(`[WhatsApp Payment] Generating receipt file for payment ${paymentId}`);
        let receiptPath = await this.pdfGeneratorService.generatePaymentReceiptPdf(payment);
        let fileName: string;
        let receiptCaption: string;
        let isTextReceipt = false;
        
        // إذا فشل PDF، تحقق من وجود ملف نصي بديل
        if (!receiptPath || !fs.existsSync(receiptPath)) {
          console.log(`[WhatsApp Payment] PDF generation failed, checking for text fallback`);
          const textPath = receiptPath ? receiptPath.replace('.pdf', '.txt') : null;
          if (textPath && fs.existsSync(textPath)) {
            console.log(`[WhatsApp Payment] Found text fallback receipt: ${textPath}`);
            receiptPath = textPath;
            isTextReceipt = true;
          } else {
            console.log(`[WhatsApp Payment] No fallback receipt found, will send text message only`);
            receiptPath = null;
          }
        }
        
        if (receiptPath && fs.existsSync(receiptPath)) {
          console.log(`[WhatsApp Payment] Receipt file generated successfully: ${receiptPath} (${isTextReceipt ? 'TEXT' : 'PDF'})`);
          
          // إنشاء اسم الملف حسب النوع
          if (isTextReceipt) {
            fileName = `إيصال_دفع_${payment.trainee.nameAr.replace(/\s+/g, '_')}_${payment.id}.txt`;
            receiptCaption = `📄 إيصال الدفع (نص) رقم #${payment.id.toString().padStart(6, '0')}`;
          } else {
            fileName = `إيصال_دفع_${payment.trainee.nameAr.replace(/\s+/g, '_')}_${payment.id}.pdf`;
            receiptCaption = `📄 إيصال الدفع رقم #${payment.id.toString().padStart(6, '0')}`;
          }
          
          // إرسال ملف الإيصال
          const receiptSuccess = await this.sendDocument(formattedPhone, receiptPath, fileName, receiptCaption, userId);
          
          if (receiptSuccess) {
            console.log(`[WhatsApp Payment] ✅ Receipt file (${isTextReceipt ? 'TEXT' : 'PDF'}) sent successfully to ${payment.trainee.nameAr} (${formattedPhone})`);
          } else {
            console.error(`[WhatsApp Payment] ⚠️ Receipt generation succeeded but sending failed to ${payment.trainee.nameAr} (${formattedPhone})`);
          }
          
          // حذف ملف الإيصال المؤقت بعد الإرسال
          setTimeout(() => {
            try {
              if (fs.existsSync(receiptPath)) {
                fs.unlinkSync(receiptPath);
                console.log(`[WhatsApp Payment] Temporary receipt file deleted: ${receiptPath}`);
              }
            } catch (error) {
              console.error(`[WhatsApp Payment] Failed to delete temporary receipt file: ${receiptPath}`, error);
            }
          }, 15000); // حذف بعد 15 ثانية
          
        } else {
          console.error(`[WhatsApp Payment] ⚠️ Both PDF and text receipt generation failed for payment ${paymentId}`);
        }
      } catch (receiptError) {
        console.error(`[WhatsApp Payment] Exception during receipt generation/sending for payment ${paymentId}:`, receiptError);
        // لا نفشل العملية بالكامل إذا فشل الإيصال، الرسالة النصية تم إرسالها
      }
      
      return messageSuccess; // نجح إرسال الرسالة النصية على الأقل
    } catch (error) {
      this.logger.error(`[WhatsApp Payment] Exception in sendPaymentConfirmation for payment ${paymentId}:`, error);
      return false;
    }
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
    // استخدام المبلغ المدفوع في العملية الحالية إذا تم تمريره، وإلا استخدام المبلغ الكامل
    const actualPaidAmount = currentPaymentAmount || payment.paidAmount || 0;
    
    console.log(`[WhatsApp Message] Building message for payment ${payment.id}: current payment amount = ${currentPaymentAmount}, actual paid amount = ${actualPaidAmount}, total amount = ${payment.amount}`);
    
    // جلب إجمالي مديونية المتدرب الحالية
    const traineeId = payment.trainee.id;
    const totalDebtInfo = await this.calculateTraineeDebtStatus(traineeId);
    
    // نص حالة الدفع
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

  // حساب حالة مديونية المتدرب الكاملة
  private async calculateTraineeDebtStatus(traineeId: number): Promise<{ totalPaid: number; totalRemaining: number; totalDue: number }> {
    try {
      // جلب جميع مدفوعات المتدرب
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
        totalRemaining: Math.max(0, totalRemaining), // تأكيد عدم القيم السالبة
        totalDue
      };
    } catch (error) {
      console.error('خطأ في حساب حالة المديونية:', error);
      // إرجاع قيم افتراضية في حالة الخطأ
      return {
        totalPaid: 0,
        totalRemaining: 0,
        totalDue: 0
      };
    }
  }

  async previewPaymentSample(): Promise<{ message: string }> {
    try {
      const settings = await this.settingsService.getSettings();
      
      // بيانات دفعة تجريبية تطابق حالة المستخدم
      const samplePayment = {
        id: 15,
        amount: 1500,
        paidAmount: 10, // المبلغ الفعلي المدفوع - 10 جنيه كما ذكر المستخدم
        status: 'PARTIALLY_PAID',
        trainee: {
          id: 1,
          nameAr: 'سامح رفيق فتحي احمد خالد',
          phone: '01012345678',
          program: {
            nameAr: 'مساعد خدمات صحية'
          }
        },
        fee: {
          name: 'رسوم تدريب'
        }
      };
      
      // محاكاة مؤقتة لحساب المديونية للمعاينة
      const originalCalculateMethod = this.calculateTraineeDebtStatus;
      this.calculateTraineeDebtStatus = async (traineeId: number) => {
        return {
          totalPaid: 640, // إجمالي ما تم دفعه حتى الآن (320 + 320)
          totalRemaining: 860, // المتبقي
          totalDue: 1500 // إجمالي المطلوب
        };
      };
      
      // المبلغ المدفوع في العملية الحالية (مثال: 320 جنيه)
      const currentPaymentAmount = 320;
      const message = await this.buildPaymentConfirmationMessage(samplePayment, settings, currentPaymentAmount);
      
      // إعادة الدالة الأصلية
      this.calculateTraineeDebtStatus = originalCalculateMethod;
      
      return { message };
    } catch (error) {
      this.logger.error('Failed to preview payment message:', error);
      return { message: 'فشل في إنشاء معاينة رسالة الدفع' };
    }
  }

  async previewWelcomeSample(): Promise<{ message: string }> {
    try {
      const settings = await this.settingsService.getSettings();
      
      // Sample trainee data
      const sampleTrainee = {
        id: 123,
        nameAr: 'أحمد محمد علي',
        nameEn: 'Ahmed Mohamed Ali',
        phone: '01012345678',
        email: 'ahmed@example.com',
        enrollmentType: 'REGULAR',
        classLevel: 'FIRST',
        academicYear: '2024-2025',
        program: {
          id: 1,
          nameAr: 'دبلوم التسويق الرقمي',
          nameEn: 'Digital Marketing Diploma',
          price: 2500
        }
      };
      
      const message = await this.buildWelcomeMessage(sampleTrainee, settings);
      return { message };
    } catch (error) {
      this.logger.error('Failed to preview welcome message:', error);
      return { message: 'فشل في إنشاء معاينة الرسالة' };
    }
  }

  /**
   * إرسال تأكيد دفع ذكي شامل (رسالة نصية فقط - بدون PDF لتوفير الموارد)
   */
  async sendSmartPaymentConfirmation(paymentId: number, userId?: string, totalAmount?: number, smartPaymentResult?: any): Promise<boolean> {
    try {
      console.log(`[WhatsApp Smart Payment] Starting payment confirmation for payment ID ${paymentId}`);

      // جلب بيانات أول دفعة للحصول على بيانات المتدرب
      const payment = await this.prisma.traineePayment.findUnique({
        where: { id: paymentId },
        include: {
          trainee: { include: { program: true } },
          fee: true
        }
      });

      if (!payment || !payment.trainee?.phone) {
        console.error('[WhatsApp Smart Payment] Payment or phone not found');
        return false;
      }

      const trainee = payment.trainee;
      const formattedPhone = this.formatPhoneNumber(trainee.phone);

      if (!formattedPhone) {
        console.error(`[WhatsApp Smart Payment] Invalid phone number: ${trainee.phone}`);
        return false;
      }

      // التحقق من جاهزية الواتساب
      if (!await this.isClientReallyReady()) {
        console.error('[WhatsApp Smart Payment] WhatsApp client not ready');
        return false;
      }

      // جلب إعدادات النظام
      const settings = await this.settingsService.getSettings();

      // بناء رسالة شاملة للدفع الذكي
      const message = this.buildSmartPaymentMessage(trainee, smartPaymentResult, settings);

      // إرسال الرسالة النصية فقط (بدون PDF لتوفير الموارد)
      const messageSuccess = await this.sendMessage(formattedPhone, message, userId);
      if (!messageSuccess) {
        console.error(`[WhatsApp Smart Payment] Failed to send message to ${trainee.nameAr}`);
        return false;
      }

      console.log(`[WhatsApp Smart Payment] ✅ Message sent successfully to ${trainee.nameAr} (${formattedPhone})`);
      return true;

    } catch (error) {
      console.error(`[WhatsApp Smart Payment] Error in payment confirmation:`, error);
      return false;
    }
  }

  /**
   * إرسال رسالة بسيطة لدفع رسم محدد (بدون PDF)
   */
  async sendSimplePaymentConfirmation(paymentId: number, userId?: string): Promise<boolean> {
    try {
      console.log(`[WhatsApp Simple] Starting simple payment confirmation for payment ID ${paymentId}`);

      // جلب بيانات الدفع
      const payment = await this.prisma.traineePayment.findUnique({
        where: { id: paymentId },
        include: {
          trainee: { include: { program: true } },
          fee: true
        }
      });

      if (!payment || !payment.trainee?.phone) {
        console.error('[WhatsApp Simple] Payment or phone not found');
        return false;
      }

      const trainee = payment.trainee;
      const formattedPhone = this.formatPhoneNumber(trainee.phone);

      if (!formattedPhone) {
        console.error(`[WhatsApp Simple] Invalid phone number: ${trainee.phone}`);
        return false;
      }

      // التحقق من جاهزية الواتساب
      if (!await this.isClientReallyReady()) {
        console.error('[WhatsApp Simple] WhatsApp client not ready');
        return false;
      }

      // جلب إعدادات النظام
      const settings = await this.settingsService.getSettings();

      // بناء رسالة بسيطة
      const message = this.buildSimplePaymentMessage(trainee, payment, settings);

      // إرسال الرسالة النصية فقط
      const messageSuccess = await this.sendMessage(formattedPhone, message, userId);
      
      if (messageSuccess) {
        console.log(`[WhatsApp Simple] ✅ Simple message sent successfully to ${trainee.nameAr} (${formattedPhone})`);
        return true;
      } else {
        console.error(`[WhatsApp Simple] ❌ Failed to send message to ${trainee.nameAr}`);
        return false;
      }

    } catch (error) {
      console.error('[WhatsApp Simple] Error sending simple payment confirmation:', error);
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

  /**
   * بناء رسالة دفع ذكي شاملة
   */
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
      message += `⏳ *${smartPaymentResult.partiallyPaidCount} رسوم تم دفعها جزئياً*\n`;
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

  /**
   * إرسال الجدول الدراسي للمتدرب عبر واتساب
   */
  async sendScheduleToTrainee(traineeId: number, userId?: string): Promise<boolean> {
    try {
      // جلب بيانات المتدرب مع الجدول
      const trainee = await this.prisma.trainee.findUnique({
        where: { id: traineeId },
        include: { program: true }
      });

      if (!trainee || !trainee.phone) {
        this.logger.error('المتدرب غير موجود أو لا يملك رقم هاتف');
        return false;
      }

      // جلب الجدول (API endpoint موجود في trainee-platform)
      const scheduleResponse = await fetch(`${process.env.API_URL || 'http://localhost:4000'}/api/trainee-platform/trainee/${traineeId}/schedule`);
      const scheduleData = await scheduleResponse.json();

      if (!scheduleData.success || !scheduleData.schedule) {
        this.logger.error('فشل جلب الجدول الدراسي');
        return false;
      }

      // بناء رسالة الجدول
      const settings = await this.settingsService.getSettings();
      const message = this.buildScheduleMessage(trainee, scheduleData.schedule, scheduleData.classroom, settings);

      // إرسال الرسالة
      const formattedPhone = this.formatPhoneNumber(trainee.phone);
      const success = await this.sendMessage(formattedPhone, message, userId);

      if (success) {
        await this.auditService.log({
          action: 'WHATSAPP_SCHEDULE_SENT',
          entity: 'WhatsApp',
          entityId: String(traineeId),
          details: { traineeId, traineeName: trainee.nameAr },
          userId: userId || 'system',
        });
      }

      return success;
    } catch (error) {
      this.logger.error('فشل إرسال الجدول:', error);
      return false;
    }
  }

  /**
   * بناء رسالة الجدول الدراسي
   */
  private buildScheduleMessage(trainee: any, schedule: any, classroom: any, settings: any): string {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayNames = {
      SUNDAY: 'الأحد',
      MONDAY: 'الاثنين',
      TUESDAY: 'الثلاثاء',
      WEDNESDAY: 'الأربعاء',
      THURSDAY: 'الخميس',
      FRIDAY: 'الجمعة',
      SATURDAY: 'السبت'
    };

    let message = `📚 *جدولك الدراسي الأسبوعي*\n\n`;
    message += `👤 *الطالب:* ${trainee.nameAr}\n`;
    message += `🎓 *البرنامج:* ${trainee.program?.nameAr}\n`;
    if (classroom) {
      message += `📖 *الفصل:* ${classroom.name}\n`;
    }
    message += `\n${'━'.repeat(30)}\n\n`;

    days.forEach(day => {
      const daySlots = schedule[day];
      if (daySlots && daySlots.length > 0) {
        message += `📅 *${dayNames[day]}*\n`;
        daySlots.forEach((slot: any, index: number) => {
          const startTime = slot.startTime.substring(0, 5);
          const endTime = slot.endTime.substring(0, 5);
          const type = slot.type === 'THEORY' ? '📖 نظري' : '🔬 عملي';
          message += `   ${index + 1}. ${slot.content.name}\n`;
          message += `      ⏰ ${startTime} - ${endTime}\n`;
          message += `      ${type}\n`;
          if (slot.location || slot.distributionRoom) {
            const location = slot.distributionRoom ? slot.distributionRoom.roomName : slot.location;
            message += `      📍 ${location}\n`;
          }
          message += `\n`;
        });
        message += `\n`;
      }
    });

    message += `${'━'.repeat(30)}\n`;
    message += `🏫 *${settings.centerName || 'مركز التدريب'}*\n`;
    message += `\n💙 نتمنى لك رحلة تعليمية مثمرة!`;

    return message;
  }
}