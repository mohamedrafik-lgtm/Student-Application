import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

@Injectable()
export class MemoryOptimizedWhatsAppService {
  private readonly logger = new Logger(MemoryOptimizedWhatsAppService.name);
  private baileysProcess: ChildProcess = null;
  private qrCode: string | null = null;
  private isReady = false;
  private isConnected = false;
  private phoneNumber: string | null = null;
  private lastActivity: Date | null = null;
  private authDir = './whatsapp-auth';
  private memoryCheckInterval: NodeJS.Timeout;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private settingsService: SettingsService,
  ) {
    this.startMemoryMonitoring();
    this.initializeClient();
  }

  /**
   * مراقبة استخدام الذاكرة
   */
  private startMemoryMonitoring() {
    this.memoryCheckInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const memoryMB = (memUsage.rss / 1024 / 1024).toFixed(2);
      
      // إذا تجاوز استخدام الذاكرة 800MB، قم بتنظيفها
      if (memUsage.rss > 800 * 1024 * 1024) {
        this.logger.warn(`⚠️ High memory usage: ${memoryMB}MB - Triggering cleanup`);
        this.performMemoryCleanup();
      }
    }, 30000); // فحص كل 30 ثانية
  }

  /**
   * تنظيف الذاكرة
   */
  private performMemoryCleanup() {
    try {
      // تنظيف الملفات المؤقتة
      const tempDir = path.join(process.cwd(), 'temp');
      if (fs.existsSync(tempDir)) {
        this.cleanupTempFiles(tempDir);
      }

      // تشغيل garbage collection إذا كان متاحاً
      if (global.gc) {
        global.gc();
        this.logger.log('🗑️ Garbage collection triggered');
      }

      // إعادة تشغيل عملية Baileys إذا كانت تستهلك ذاكرة كثيرة
      if (this.baileysProcess && !this.baileysProcess.killed) {
        const memUsage = process.memoryUsage();
        if (memUsage.rss > 850 * 1024 * 1024) { // 850MB
          this.logger.warn('🔄 Restarting Baileys process due to high memory usage');
          this.restartBaileysProcess();
        }
      }

    } catch (error) {
      this.logger.error('Error during memory cleanup:', error);
    }
  }

  /**
   * تنظيف الملفات المؤقتة
   */
  private cleanupTempFiles(directory: string) {
    try {
      if (!fs.existsSync(directory)) return;

      const files = fs.readdirSync(directory, { recursive: true });
      const now = Date.now();
      let cleanedCount = 0;

      for (const file of files) {
        try {
          const filePath = path.join(directory, file.toString());
          if (fs.statSync(filePath).isFile()) {
            const stats = fs.statSync(filePath);
            
            // حذف الملفات الأقدم من 15 دقيقة
            if (now - stats.mtime.getTime() > 15 * 60 * 1000) {
              fs.unlinkSync(filePath);
              cleanedCount++;
            }
          }
        } catch (error) {
          // تجاهل أخطاء الملفات الفردية
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`🗑️ Cleaned up ${cleanedCount} temporary files`);
      }
    } catch (error) {
      this.logger.error('Error cleaning temp files:', error);
    }
  }

  /**
   * إعادة تشغيل عملية Baileys
   */
  private async restartBaileysProcess() {
    try {
      if (this.baileysProcess && !this.baileysProcess.killed) {
        this.baileysProcess.kill('SIGTERM');
        this.baileysProcess = null;
      }

      this.isReady = false;
      this.isConnected = false;
      
      // انتظار قليل قبل إعادة التشغيل
      setTimeout(() => {
        this.initializeClient();
      }, 3000);

    } catch (error) {
      this.logger.error('Error restarting Baileys process:', error);
    }
  }

  /**
   * تهيئة العميل مع تحسينات الذاكرة
   */
  async initializeClient() {
    try {
      this.logger.log('🚀 Initializing memory-optimized WhatsApp client...');
      
      // فحص الذاكرة قبل البدء
      const memUsage = process.memoryUsage();
      const memoryMB = (memUsage.rss / 1024 / 1024).toFixed(2);
      this.logger.log(`📊 Current memory usage: ${memoryMB}MB`);

      // إذا كانت الذاكرة مرتفعة جداً، لا تبدأ
      if (memUsage.rss > 900 * 1024 * 1024) {
        this.logger.error('❌ Memory usage too high to start WhatsApp client');
        return;
      }

      // إنشاء مجلد المصادقة
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      // العثور على ملف المعالج
      let wrapperPath = path.join(__dirname, 'memory-optimized-baileys-wrapper.mjs');
      
      if (!fs.existsSync(wrapperPath)) {
        wrapperPath = path.join(__dirname, '..', '..', '..', 'src', 'whatsapp', 'baileys-wrapper.mjs');
      }
      
      if (!fs.existsSync(wrapperPath)) {
        wrapperPath = path.join(process.cwd(), 'src', 'whatsapp', 'baileys-wrapper.mjs');
      }
      
      if (!fs.existsSync(wrapperPath)) {
        throw new Error(`Baileys wrapper not found at any expected path`);
      }

      // إنشاء العملية مع تحديد استخدام الذاكرة
      this.baileysProcess = spawn('node', [
        '--max-old-space-size=256', // تحديد الذاكرة إلى 256MB
        '--gc-interval=100',         // تشغيل garbage collection بشكل متكرر
        wrapperPath
      ], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: process.env.NODE_ENV }
      });

      // معالجة الرسائل من العملية
      this.baileysProcess.on('message', (message: any) => {
        this.handleBaileysMessage(message);
      });

      // معالجة المخرجات
      this.baileysProcess.stdout.on('data', (data) => {
        try {
          const lines = data.toString().split('\n').filter(line => line.trim());
          lines.forEach(line => {
            try {
              const message = JSON.parse(line);
              this.handleBaileysMessage(message);
            } catch (e) {
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
        this.baileysProcess = null;
        
        // إعادة التشغيل التلقائي مع فحص الذاكرة
        if (code !== 0 && !signal) {
          const memUsage = process.memoryUsage();
          if (memUsage.rss < 800 * 1024 * 1024) { // أقل من 800MB
            this.logger.log('🔄 Attempting automatic restart...');
            setTimeout(() => {
              this.initializeClient().catch(err => {
                this.logger.error('Auto-restart failed:', err);
              });
            }, 5000);
          } else {
            this.logger.warn('❌ Memory usage too high for auto-restart');
          }
        }
      });

      this.baileysProcess.on('error', (error) => {
        this.logger.error('❌ Baileys process error:', error);
        this.isConnected = false;
        this.isReady = false;
      });

    } catch (error) {
      this.logger.error('Failed to initialize memory-optimized WhatsApp client:', error);
    }
  }

  /**
   * معالجة رسائل Baileys
   */
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

  /**
   * إرسال رسالة مع فحص الذاكرة
   */
  async sendMessage(phoneNumber: string, message: string, userId?: string): Promise<boolean> {
    try {
      // فحص الذاكرة قبل الإرسال
      const memUsage = process.memoryUsage();
      if (memUsage.rss > 850 * 1024 * 1024) {
        this.logger.warn('❌ Memory usage too high for sending message');
        return false;
      }

      if (!await this.isClientReallyReady()) {
        throw new Error('WhatsApp client is not ready');
      }

      if (!this.baileysProcess.connected) {
        this.logger.error('❌ IPC channel is closed');
        throw new Error('IPC channel is not available');
      }

      this.baileysProcess.send({
        command: 'send-message',
        data: { phoneNumber, message }
      });
      
      this.lastActivity = new Date();
      this.logger.log(`Message sent successfully to ${phoneNumber}`);

      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send message to ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * إرسال تأكيد دفع محسن للذاكرة
   */
  async sendPaymentConfirmation(paymentId: number, userId?: string): Promise<boolean> {
    try {
      this.logger.log(`[Memory Optimized] Starting payment confirmation for ID ${paymentId}`);
      
      // فحص الذاكرة
      const memUsage = process.memoryUsage();
      const memoryMB = (memUsage.rss / 1024 / 1024).toFixed(2);
      
      if (memUsage.rss > 800 * 1024 * 1024) {
        this.logger.warn(`❌ Memory usage too high (${memoryMB}MB) for payment confirmation`);
        return false;
      }

      // التحقق من حالة WhatsApp
      if (!await this.isClientReallyReady()) {
        this.logger.error('❌ WhatsApp client not ready');
        return false;
      }

      // جلب بيانات الدفعة
      const payment = await this.prisma.traineePayment.findUnique({
        where: { id: paymentId },
        include: {
          trainee: { include: { program: true } },
          fee: true
        }
      });

      if (!payment || !payment.trainee?.phone) {
        this.logger.error('❌ Payment or phone not found');
        return false;
      }

      // بناء رسالة مبسطة
      const settings = await this.settingsService.getSettings();
      const message = this.buildSimplePaymentMessage(payment, settings);
      
      // إرسال الرسالة النصية فقط (بدون PDF لتوفير الذاكرة)
      const success = await this.sendMessage(payment.trainee.phone, message, userId);
      
      if (success) {
        this.logger.log(`✅ Payment confirmation sent to ${payment.trainee.nameAr}`);
      }

      return success;

    } catch (error) {
      this.logger.error(`❌ Memory optimized payment confirmation failed:`, error);
      return false;
    }
  }

  /**
   * بناء رسالة دفع مبسطة
   */
  private buildSimplePaymentMessage(payment: any, settings: any): string {
    const now = new Date();
    const arabicDate = now.toLocaleDateString('ar-EG');
    const arabicTime = now.toLocaleTimeString('ar-EG');

    return `🎉 تم تأكيد دفعتك بنجاح!

👤 ${payment.trainee.nameAr}
💰 المبلغ: ${payment.paidAmount.toLocaleString('ar-EG')} جنيه
📅 ${arabicDate} - ${arabicTime}
🏦 ${settings.centerName || 'مركز التدريب'}

رقم الإيصال: #${payment.id.toString().padStart(6, '0')}`;
  }

  /**
   * فحص حالة العميل
   */
  async isClientReallyReady(): Promise<boolean> {
    if (!this.isReady || !this.isConnected) {
      return false;
    }

    if (!this.baileysProcess || this.baileysProcess.killed) {
      return false;
    }

    if (!this.baileysProcess.connected) {
      return false;
    }

    return true;
  }

  /**
   * الحصول على حالة النظام
   */
  async getStatus() {
    const memUsage = process.memoryUsage();
    const memoryMB = (memUsage.rss / 1024 / 1024).toFixed(2);

    return {
      isReady: this.isReady,
      isConnected: this.isConnected,
      qrCode: this.qrCode,
      phoneNumber: this.phoneNumber,
      lastActivity: this.lastActivity,
      memoryUsage: `${memoryMB}MB`,
      processId: this.baileysProcess?.pid || null
    };
  }

  /**
   * تنظيف الموارد عند إغلاق التطبيق
   */
  onModuleDestroy() {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }

    if (this.baileysProcess && !this.baileysProcess.killed) {
      this.baileysProcess.kill();
    }
  }
}
