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
  restartCount?: number;
  lastError?: string;
}

@Injectable()
export class ImprovedWhatsAppService {
  private readonly logger = new Logger(ImprovedWhatsAppService.name);
  private baileysProcess: ChildProcess = null;
  private qrCode: string | null = null;
  private isReady = false;
  private isConnected = false;
  private phoneNumber: string | null = null;
  private lastActivity: Date | null = null;
  private authDir = './whatsapp-auth';
  
  // إضافات جديدة لتحسين الاستقرار
  private restartCount = 0;
  private maxRestartAttempts = 5;
  private restartTimeout: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastError: string | null = null;
  private isInitializing = false;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private settingsService: SettingsService,
    private pdfGeneratorService: PdfGeneratorService,
  ) {
    this.initializeClient();
    this.startHealthCheck();
  }

  // ✅ حل جديد: تنظيف الجلسات القديمة عند طلب QR
  private async cleanupOldSessions(): Promise<void> {
    try {
      this.logger.log('🧹 Cleaning up old WhatsApp sessions...');
      
      if (fs.existsSync(this.authDir)) {
        // حذف جميع ملفات الجلسة القديمة
        const files = fs.readdirSync(this.authDir);
        for (const file of files) {
          const filePath = path.join(this.authDir, file);
          try {
            fs.unlinkSync(filePath);
            this.logger.debug(`Deleted old session file: ${file}`);
          } catch (error) {
            this.logger.warn(`Failed to delete file ${file}:`, error.message);
          }
        }
        
        // إعادة إنشاء المجلد فارغاً
        fs.rmSync(this.authDir, { recursive: true, force: true });
        fs.mkdirSync(this.authDir, { recursive: true });
        
        this.logger.log('✅ Old sessions cleaned successfully');
      }
    } catch (error) {
      this.logger.error('❌ Failed to cleanup old sessions:', error);
    }
  }

  // ✅ حل جديد: تحسين إدارة العمليات
  private async cleanupProcess(): Promise<void> {
    try {
      // إلغاء المؤقتات القديمة
      if (this.restartTimeout) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = null;
      }

      // إنهاء العملية الحالية بشكل صحيح
      if (this.baileysProcess && !this.baileysProcess.killed) {
        this.logger.log('🔄 Terminating existing Baileys process...');
        
        // محاولة إنهاء لطيف أولاً
        this.baileysProcess.kill('SIGTERM');
        
        // انتظار 3 ثوان ثم إنهاء قسري إذا لم تنته
        setTimeout(() => {
          if (this.baileysProcess && !this.baileysProcess.killed) {
            this.logger.warn('🔪 Force killing Baileys process...');
            this.baileysProcess.kill('SIGKILL');
          }
        }, 3000);
      }

      // إعادة تعيين الحالة
      this.baileysProcess = null;
      this.isConnected = false;
      this.isReady = false;
      this.phoneNumber = null;
      this.qrCode = null;
      this.isInitializing = false;

    } catch (error) {
      this.logger.error('❌ Error during process cleanup:', error);
    }
  }

  // ✅ حل جديد: فحص صحة النظام
  private startHealthCheck(): void {
    // فحص كل دقيقة
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error('Health check failed:', error);
      }
    }, 60000);
  }

  private async performHealthCheck(): Promise<void> {
    // التحقق من حالة العملية
    if (this.baileysProcess && this.baileysProcess.killed) {
      this.logger.warn('🚨 Baileys process is dead, attempting restart...');
      await this.safeRestart();
    }

    // التحقق من تراكم الأخطاء
    if (this.restartCount > this.maxRestartAttempts) {
      this.logger.error('🚨 Too many restart attempts, stopping auto-restart');
      await this.cleanupProcess();
    }
  }

  // ✅ حل محسن: إعادة تشغيل آمنة
  private async safeRestart(): Promise<void> {
    if (this.isInitializing) {
      this.logger.warn('Already initializing, skipping restart');
      return;
    }

    this.restartCount++;
    this.logger.log(`🔄 Safe restart attempt ${this.restartCount}/${this.maxRestartAttempts}`);

    try {
      await this.cleanupProcess();
      
      // انتظار قصير قبل إعادة التشغيل
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.initializeClient();
    } catch (error) {
      this.logger.error('❌ Safe restart failed:', error);
      this.lastError = error.message;
    }
  }

  // ✅ حل محسن: تهيئة العميل مع تنظيف الجلسات
  async initializeClient(): Promise<void> {
    if (this.isInitializing) {
      this.logger.warn('Client is already initializing');
      return;
    }

    this.isInitializing = true;

    try {
      this.logger.log('🚀 Initializing WhatsApp client with session cleanup...');
      
      // تنظيف العملية السابقة
      await this.cleanupProcess();
      
      // إنشاء مجلد المصادقة إذا لم يكن موجوداً
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      // العثور على ملف المعالج
      let wrapperPath = path.join(__dirname, 'baileys-wrapper.mjs');
      
      if (!fs.existsSync(wrapperPath)) {
        wrapperPath = path.join(__dirname, '..', '..', '..', 'src', 'whatsapp', 'baileys-wrapper.mjs');
      }
      
      if (!fs.existsSync(wrapperPath)) {
        wrapperPath = path.join(process.cwd(), 'src', 'whatsapp', 'baileys-wrapper.mjs');
      }
      
      if (!fs.existsSync(wrapperPath)) {
        throw new Error(`Baileys wrapper not found at any expected path. Last tried: ${wrapperPath}`);
      }
      
      this.logger.log(`📁 Using Baileys wrapper at: ${wrapperPath}`);
      
      // إنشاء العملية الجديدة
      this.baileysProcess = spawn('node', [wrapperPath], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: process.env.NODE_ENV }
      });

      // ✅ معالجة محسنة للرسائل
      this.baileysProcess.on('message', (message: any) => {
        this.handleBaileysMessage(message);
      });

      // ✅ معالجة محسنة للمخرجات
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
          this.logger.debug('Baileys raw output:', data.toString());
        }
      });

      // ✅ معالجة محسنة للأخطاء
      this.baileysProcess.stderr.on('data', (data) => {
        const errorMsg = data.toString();
        this.lastError = errorMsg;
        this.logger.error('Baileys error:', errorMsg);
        
        // تصنيف الأخطاء واتخاذ إجراءات مناسبة
        if (errorMsg.includes('ECONNRESET') || errorMsg.includes('ETIMEDOUT')) {
          this.logger.warn('🌐 Network error detected, will retry...');
        } else if (errorMsg.includes('Unauthorized') || errorMsg.includes('401')) {
          this.logger.error('🚫 Authentication error, cleaning sessions...');
          this.cleanupOldSessions();
        }
      });

      // ✅ معالجة محسنة لإنهاء العملية
      this.baileysProcess.on('exit', (code, signal) => {
        this.logger.warn(`Baileys process exited with code ${code}, signal: ${signal}`);
        this.isConnected = false;
        this.isReady = false;
        this.isInitializing = false;
        
        // إعادة تشغيل ذكية حسب سبب الإنهاء
        if (code !== 0 && this.restartCount < this.maxRestartAttempts) {
          const delay = Math.min(5000 * Math.pow(2, this.restartCount), 30000); // Exponential backoff
          this.logger.log(`⏰ Scheduling restart in ${delay}ms...`);
          
          this.restartTimeout = setTimeout(() => {
            this.safeRestart();
          }, delay);
        } else if (this.restartCount >= this.maxRestartAttempts) {
          this.logger.error('🛑 Max restart attempts reached, manual intervention required');
        }
      });

      // ✅ معالجة أخطاء العملية
      this.baileysProcess.on('error', (error) => {
        this.logger.error('❌ Baileys process error:', error);
        this.lastError = error.message;
        this.isInitializing = false;
      });

    } catch (error) {
      this.logger.error('❌ Failed to initialize WhatsApp client:', error);
      this.lastError = error.message;
      this.isInitializing = false;
    }
  }

  // ✅ معالج رسائل محسن
  private handleBaileysMessage(message: any): void {
    const { type, data } = message;
    
    switch (type) {
      case 'qr-generated':
        this.qrCode = data.qrCode;
        this.logger.log('📱 QR Code generated successfully');
        break;
        
      case 'connected':
        this.isConnected = true;
        this.isReady = true;
        this.qrCode = null;
        this.phoneNumber = data.phoneNumber;
        this.lastActivity = new Date();
        this.restartCount = 0; // إعادة تعيين عداد الإعادة عند النجاح
        this.lastError = null;
        this.logger.log(`✅ WhatsApp connected successfully. Phone: +${this.phoneNumber}`);
        break;
        
      case 'connection-closed':
        this.isConnected = false;
        this.isReady = false;
        this.phoneNumber = null;
        this.logger.log('📴 WhatsApp connection closed');
        break;
        
      case 'error':
        this.lastError = data.error;
        this.logger.error('❌ Baileys error:', data.error);
        break;
        
      default:
        this.logger.debug('📨 Unknown message type:', type);
    }
  }

  // ✅ إضافة دالة لحذف الجلسات القديمة عند طلب QR جديد
  async generateQRWithSessionCleanup(): Promise<{ success: boolean; message: string; qrCode?: string }> {
    try {
      this.logger.log('🔄 Generating new QR with session cleanup...');
      
      if (this.isConnected) {
        return { success: false, message: 'WhatsApp متصل بالفعل' };
      }
      
      // تنظيف الجلسات القديمة أولاً
      await this.cleanupOldSessions();
      
      // إعادة تشغيل مع تنظيف
      await this.safeRestart();
      
      // انتظار توليد QR Code
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      if (this.qrCode) {
        return { 
          success: true, 
          message: 'تم إنشاء QR Code جديد بعد تنظيف الجلسات القديمة', 
          qrCode: this.qrCode 
        };
      } else {
        return { success: false, message: 'فشل في إنشاء QR Code بعد تنظيف الجلسات' };
      }
    } catch (error) {
      this.logger.error('❌ Failed to generate QR with cleanup:', error);
      return { success: false, message: 'فشل في إنشاء QR Code: ' + error.message };
    }
  }

  // ✅ حالة محسنة مع معلومات إضافية
  async getStatus(): Promise<WhatsAppStatus> {
    return {
      isReady: this.isReady,
      isConnected: this.isConnected,
      qrCode: this.qrCode,
      phoneNumber: this.phoneNumber,
      lastActivity: this.lastActivity,
      restartCount: this.restartCount,
      lastError: this.lastError,
    };
  }

  // ✅ إعادة تشغيل محسنة من الواجهة
  async restart(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('🔄 Manual restart requested...');
      this.restartCount = 0; // إعادة تعيين العداد للإعادة اليدوية
      await this.safeRestart();
      return { success: true, message: 'تم إعادة تشغيل WhatsApp بنجاح' };
    } catch (error) {
      this.logger.error('❌ Manual restart failed:', error);
      return { success: false, message: 'فشل في إعادة تشغيل WhatsApp: ' + error.message };
    }
  }

  // ✅ تسجيل خروج محسن مع تنظيف شامل
  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log('👋 Logging out from WhatsApp...');
      
      // إيقاف فحص الصحة
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      
      // تنظيف العملية
      await this.cleanupProcess();
      
      // حذف ملفات المصادقة
      await this.cleanupOldSessions();
      
      // إعادة تعيين جميع المتغيرات
      this.restartCount = 0;
      this.lastError = null;
      
      return { success: true, message: 'تم تسجيل الخروج وتنظيف جميع الجلسات بنجاح' };
    } catch (error) {
      this.logger.error('❌ Logout failed:', error);
      return { success: false, message: 'فشل في تسجيل الخروج: ' + error.message };
    }
  }

  // ✅ تنظيف عند إنهاء التطبيق
  async onModuleDestroy(): Promise<void> {
    this.logger.log('🧹 Cleaning up WhatsApp service...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
    }
    
    await this.cleanupProcess();
  }

  // باقي الدوال الأصلية مع تحسينات طفيفة...
  async isClientReallyReady(): Promise<boolean> {
    return this.isReady && 
           this.isConnected && 
           this.baileysProcess && 
           !this.baileysProcess.killed &&
           !this.isInitializing;
  }

  // ✅ الحصول على QR Code
  async getQRCode(): Promise<{ qrCode?: string; isReady: boolean; error?: string }> {
    try {
      if (this.isReady && this.isConnected) {
        return { isReady: true, qrCode: null };
      }

      if (this.qrCode) {
        return { qrCode: this.qrCode, isReady: false };
      }

      // إذا لم يكن هناك QR code، ابدأ عملية الاتصال
      if (!this.baileysProcess || this.baileysProcess.killed) {
        await this.initializeClient();
      }

      return { 
        qrCode: this.qrCode, 
        isReady: this.isReady,
        error: this.lastError 
      };
    } catch (error) {
      this.logger.error('❌ Failed to get QR code:', error);
      return { 
        isReady: false, 
        error: error.message 
      };
    }
  }

  // ✅ إرسال رسالة
  async sendMessage(phoneNumber: string, message: string, userId?: number): Promise<boolean> {
    try {
      if (!await this.isClientReallyReady()) {
        this.logger.warn('⚠️ WhatsApp client is not ready');
        return false;
      }

      // تنسيق رقم الهاتف
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.logger.warn('⏰ Message send timeout');
          resolve(false);
        }, 30000);

        this.baileysProcess.send({
          action: 'sendMessage',
          data: { to: formattedNumber, message }
        });

        const messageHandler = (response: any) => {
          if (response.action === 'sendMessage') {
            clearTimeout(timeout);
            this.baileysProcess.off('message', messageHandler);
            
            if (response.success) {
              this.logger.log(`✅ Message sent successfully to ${formattedNumber}`);
              
              // تسجيل في قاعدة البيانات (إذا كانت الخدمة متاحة)
              try {
                if (this.auditService) {
                  // استخدام method آخر أو تسجيل مباشر في قاعدة البيانات
                  this.logger.log(`📝 Message sent to ${formattedNumber} by user ${userId || 'system'}`);
                }
              } catch (auditError) {
                this.logger.warn('⚠️ Failed to log audit:', auditError.message);
              }
              
              resolve(true);
            } else {
              this.logger.error(`❌ Failed to send message: ${response.error}`);
              resolve(false);
            }
          }
        };

        this.baileysProcess.on('message', messageHandler);
      });
    } catch (error) {
      this.logger.error('❌ Send message error:', error);
      return false;
    }
  }

  // ✅ إرسال تأكيد الدفع
  async sendPaymentConfirmation(paymentId: number, userId?: number): Promise<boolean> {
    try {
      // الحصول على بيانات الدفعة
      const payment = await this.prisma.traineePayment.findUnique({
        where: { id: paymentId },
        include: {
          trainee: true,
          fee: {
            include: {
              program: true
            }
          }
        }
      });

      if (!payment) {
        this.logger.warn(`⚠️ Payment not found for payment ID: ${paymentId}`);
        return false;
      }

      if (!payment.trainee?.whatsapp) {
        this.logger.warn(`⚠️ Trainee WhatsApp not found for payment ID: ${paymentId}`);
        return false;
      }

      // إنشاء رسالة التأكيد
      const message = await this.generatePaymentConfirmationMessage(payment);
      
      // إرسال الرسالة
      const success = await this.sendMessage(payment.trainee.whatsapp, message, userId);
      
      if (success) {
        // تحديث ملاحظات الدفعة لتسجيل إرسال WhatsApp
        await this.prisma.traineePayment.update({
          where: { id: paymentId },
          data: { 
            notes: (payment.notes || '') + `\nتم إرسال تأكيد WhatsApp في ${new Date().toLocaleString('ar-EG')}`
          }
        });
      }

      return success;
    } catch (error) {
      this.logger.error('❌ Payment confirmation error:', error);
      return false;
    }
  }

  // ✅ معاينة نموذج تأكيد الدفع
  async previewPaymentSample(): Promise<{ message: string }> {
    const samplePayment = {
      id: 123,
      amount: 1500,
      createdAt: new Date(),
      trainee: {
        nameAr: 'أحمد محمد',
        whatsapp: '01012345678'
      },
      fee: {
        program: {
          name: 'برنامج البرمجة المتقدمة',
          price: 2000
        }
      }
    };

    const message = await this.generatePaymentConfirmationMessage(samplePayment as any);
    return { message };
  }

  // ✅ معاينة نموذج رسالة الترحيب
  async previewWelcomeSample(): Promise<{ message: string }> {
    const sampleTrainee = {
      nameAr: 'سارة أحمد',
      whatsapp: '01012345678'
    };

    const sampleCourse = {
      name: 'دورة التصميم الجرافيكي',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // بعد أسبوع
      duration: '3 أشهر'
    };

    const message = await this.generateWelcomeMessage(sampleTrainee as any, sampleCourse as any);
    return { message };
  }

  // ✅ إنشاء رسالة تأكيد الدفع
  private async generatePaymentConfirmationMessage(payment: any): Promise<string> {
    const settings = await this.settingsService?.getSettings();
    const centerName = settings?.centerName || 'مركز تيبا للتدريب';

    return `🎉 *تأكيد استلام الدفعة*

السلام عليكم ${payment.trainee.nameAr}،

تم استلام دفعتك بنجاح! 💰

📋 *تفاصيل الدفعة:*
• رقم الدفعة: #${payment.id}
• المبلغ: ${payment.amount} جنيه
• البرنامج: ${payment.fee.program.name}
• تاريخ الدفع: ${new Date(payment.createdAt).toLocaleDateString('ar-EG')}

✅ تم تسجيل دفعتك في النظام بنجاح.

شكراً لثقتكم في ${centerName} 🙏`;
  }

  // ✅ إنشاء رسالة الترحيب
  private async generateWelcomeMessage(trainee: any, course: any): Promise<string> {
    const settings = await this.settingsService?.getSettings();
    const centerName = settings?.centerName || 'مركز تيبا للتدريب';

    return `🎉 *أهلاً وسهلاً بك في ${centerName}*

مرحباً ${trainee.nameAr}! 👋

تم تسجيلك بنجاح في:
📚 *${course.name}*

📅 *معلومات الدورة:*
• تاريخ البدء: ${new Date(course.startDate).toLocaleDateString('ar-EG')}
• المدة: ${course.duration}

📍 سيتم إرسال تفاصيل إضافية قريباً.

نتطلع لرؤيتك معنا! 🚀`;
  }

  // ✅ تنسيق رقم الهاتف
  private formatPhoneNumber(phoneNumber: string): string {
    // إزالة جميع الرموز غير الرقمية
    let formatted = phoneNumber.replace(/\D/g, '');
    
    // إضافة كود الدولة المصري إذا لم يكن موجود
    if (formatted.startsWith('01')) {
      formatted = '2' + formatted;
    } else if (!formatted.startsWith('201')) {
      formatted = '201' + formatted;
    }
    
    return formatted + '@s.whatsapp.net';
  }
}
