import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';

@Injectable()
export class OptimizedPdfGeneratorService {
  private readonly logger = new Logger(OptimizedPdfGeneratorService.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  /**
   * توليد PDF محسن للذاكرة المحدودة مع إعادة المحاولة (باستخدام Puppeteer)
   */
  async generatePaymentReceiptPdf(payment: any): Promise<string | null> {
    let attempts = 0;
    const maxAttempts = 3;
    let browser: puppeteer.Browser | null = null;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        this.logger.log(`🔄 PDF generation attempt ${attempts}/${maxAttempts} for payment ${payment.id}`);
        
        // فحص الذاكرة المتاحة
        const memUsage = process.memoryUsage();
        const memoryMB = (memUsage.rss / 1024 / 1024).toFixed(2);
        this.logger.log(`📊 Memory usage: ${memoryMB}MB`);
        
        // تنظيف الذاكرة قبل المحاولة
        if (global.gc) {
          global.gc();
          this.logger.log('🗑️ Garbage collection triggered before PDF generation');
        }
        
        // إذا كانت الذاكرة مرتفعة جداً، انتظر قليلاً وحاول مرة أخرى
        if (memUsage.rss > 850 * 1024 * 1024) { // 850MB
          if (attempts < maxAttempts) {
            this.logger.warn(`⚠️ Memory usage high (${memoryMB}MB), waiting before retry...`);
            await this.waitAndCleanup(2000 * attempts); // انتظار متزايد
            continue;
          } else {
            this.logger.error('❌ Memory usage too high after all attempts');
            return null;
          }
        }

        // إنشاء مجلد مؤقت
        const tempDir = path.join(process.cwd(), 'temp', 'receipts');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // تنظيف الملفات القديمة أولاً لتوفير مساحة
        await this.cleanupOldFiles(tempDir);

        // استخدام HTML مبسط لتوفير الذاكرة
        const htmlContent = await this.buildSimpleReceiptHTML(payment);
        
        const fileName = `receipt_${payment.id}_${Date.now()}.pdf`;
        const outputPath = path.join(tempDir, fileName);

        // توليد PDF باستخدام Puppeteer (أكثر أماناً وحداثة)
        browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote',
          ],
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        await page.pdf({
          path: outputPath,
          format: 'A4',
          margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
          printBackground: true,
        });

        await browser.close();
        browser = null;

        // التحقق من وجود الملف
        if (!fs.existsSync(outputPath)) {
          throw new Error('PDF file was not created');
        }

        // فحص حجم الملف
        const stats = fs.statSync(outputPath);
        this.logger.log(`✅ PDF created: ${outputPath} (${(stats.size / 1024).toFixed(2)}KB)`);

        return outputPath;

      } catch (error) {
        this.logger.error(`❌ PDF generation attempt ${attempts} failed:`, error);
        
        // إغلاق المتصفح إذا كان مفتوحاً
        if (browser) {
          try {
            await browser.close();
          } catch (e) {
            // تجاهل أخطاء الإغلاق
          }
          browser = null;
        }
        
        // تنظيف الذاكرة بعد الفشل
        if (global.gc) {
          global.gc();
        }
        
        // إذا لم تكن المحاولة الأخيرة، انتظر وحاول مرة أخرى
        if (attempts < maxAttempts) {
          await this.waitAndCleanup(1000 * attempts);
          continue;
        }
      }
    }
    
    this.logger.error(`❌ PDF generation failed after ${maxAttempts} attempts`);
    return null;
  }

  /**
   * انتظار وتنظيف الذاكرة
   */
  private async waitAndCleanup(delayMs: number): Promise<void> {
    // تنظيف الملفات المؤقتة
    const tempDir = path.join(process.cwd(), 'temp', 'receipts');
    await this.cleanupOldFiles(tempDir);
    
    // تشغيل garbage collection
    if (global.gc) {
      global.gc();
    }
    
    // انتظار
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * بناء HTML مبسط لتوفير الذاكرة
   */
  private async buildSimpleReceiptHTML(payment: any): Promise<string> {
    const settings = await this.settingsService.getSettings();
    const now = new Date();
    const arabicDate = now.toLocaleDateString('ar-EG');
    const arabicTime = now.toLocaleTimeString('ar-EG');

    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>إيصال دفع</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 14px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .center-name { font-size: 24px; font-weight: bold; color: #0A2647; margin-bottom: 10px; }
            .receipt-title { font-size: 20px; font-weight: bold; color: #D35400; }
            .info-section { margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 5px; }
            .info-row:nth-child(even) { background-color: #f5f5f5; }
            .label { font-weight: bold; color: #333; }
            .value { color: #666; }
            .amount-section { background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center; }
            .amount { font-size: 18px; font-weight: bold; color: #0A2647; }
            .footer { margin-top: 30px; text-align: center; border-top: 1px solid #ccc; padding-top: 20px; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="center-name">${settings.centerName || 'مركز التدريب'}</div>
            <div class="receipt-title">إيصال دفع رقم #${payment.id.toString().padStart(6, '0')}</div>
        </div>

        <div class="info-section">
            <div class="info-row">
                <span class="label">اسم المتدرب:</span>
                <span class="value">${payment.trainee.nameAr}</span>
            </div>
            <div class="info-row">
                <span class="label">البرنامج:</span>
                <span class="value">${payment.trainee.program?.nameAr || 'غير محدد'}</span>
            </div>
            <div class="info-row">
                <span class="label">نوع الرسوم:</span>
                <span class="value">${payment.fee?.name || 'رسوم تدريب'}</span>
            </div>
            <div class="info-row">
                <span class="label">تاريخ الدفع:</span>
                <span class="value">${arabicDate} - ${arabicTime}</span>
            </div>
        </div>

        <div class="amount-section">
            <div class="amount">المبلغ المدفوع: ${payment.paidAmount.toLocaleString('ar-EG')} جنيه</div>
        </div>

        <div class="footer">
            <p>تم إنشاء هذا الإيصال تلقائياً بواسطة نظام ${settings.centerName || 'مركز التدريب'}</p>
            <p>التاريخ والوقت: ${arabicDate} - ${arabicTime}</p>
        </div>
    </body>
    </html>`;
  }

  /**
   * إنشاء PDF بطريقة بديلة (نص عادي) إذا فشلت الطريقة الأساسية
   */
  async generateFallbackTextReceipt(payment: any): Promise<string | null> {
    try {
      this.logger.log(`📄 Generating fallback text receipt for payment ${payment.id}`);
      
      const settings = await this.settingsService.getSettings();
      const now = new Date();
      const arabicDate = now.toLocaleDateString('ar-EG');
      const arabicTime = now.toLocaleTimeString('ar-EG');
      
      // إنشاء محتوى نصي للإيصال
      const receiptContent = `
إيصال دفع رقم #${payment.id.toString().padStart(6, '0')}
${settings.centerName || 'مركز التدريب'}
================================

اسم المتدرب: ${payment.trainee.nameAr}
البرنامج: ${payment.trainee.program?.nameAr || 'غير محدد'}
نوع الرسوم: ${payment.fee?.name || 'رسوم تدريب'}

المبلغ المدفوع: ${payment.paidAmount.toLocaleString('ar-EG')} جنيه
تاريخ الدفع: ${arabicDate} - ${arabicTime}

================================
تم إنشاء هذا الإيصال تلقائياً
${settings.centerName || 'مركز التدريب'}
      `;
      
      // حفظ كملف نصي
      const tempDir = path.join(process.cwd(), 'temp', 'receipts');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const fileName = `receipt_text_${payment.id}_${Date.now()}.txt`;
      const outputPath = path.join(tempDir, fileName);
      
      fs.writeFileSync(outputPath, receiptContent, 'utf8');
      
      this.logger.log(`✅ Fallback text receipt created: ${outputPath}`);
      return outputPath;
      
    } catch (error) {
      this.logger.error('❌ Fallback text receipt creation failed:', error);
      return null;
    }
  }

  /**
   * تنظيف الملفات القديمة لتوفير المساحة
   */
  private async cleanupOldFiles(directory: string): Promise<void> {
    try {
      if (!fs.existsSync(directory)) return;
      
      const files = fs.readdirSync(directory);
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const file of files) {
        try {
          const filePath = path.join(directory, file);
          const stats = fs.statSync(filePath);
          
          // حذف الملفات الأقدم من 20 دقيقة
          if (now - stats.mtime.getTime() > 20 * 60 * 1000) {
            fs.unlinkSync(filePath);
            cleanedCount++;
          }
        } catch (error) {
          // تجاهل أخطاء الملفات الفردية
        }
      }
      
      if (cleanedCount > 0) {
        this.logger.log(`🗑️ Cleaned up ${cleanedCount} old files from ${directory}`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up files:', error);
    }
  }
}
