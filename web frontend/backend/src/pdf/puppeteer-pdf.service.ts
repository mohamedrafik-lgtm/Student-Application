import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PuppeteerPdfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PuppeteerPdfService.name);
  private browser: puppeteer.Browser | null = null;

  async onModuleInit() {
    try {
      this.logger.log('🚀 Initializing Puppeteer browser...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      this.logger.log('✅ Puppeteer browser initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Puppeteer browser:', error);
    }
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.logger.log('🔌 Puppeteer browser closed');
    }
  }

  /**
   * إنشاء PDF من HTML باستخدام Puppeteer
   */
  async generatePdfFromHtml(htmlContent: string, outputPath: string): Promise<boolean> {
    if (!this.browser) {
      this.logger.error('❌ Puppeteer browser not available');
      return false;
    }

    let page: puppeteer.Page | null = null;

    try {
      this.logger.log('📄 Creating PDF with Puppeteer...');
      
      page = await this.browser.newPage();
      
      // تعيين viewport للحصول على تخطيط صحيح
      await page.setViewport({ width: 1200, height: 1600 });
      
      // تعيين المحتوى HTML
      await page.setContent(htmlContent, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });

      // إنشاء PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        preferCSSPageSize: true
      });

      // حفظ الملف
      fs.writeFileSync(outputPath, pdfBuffer);
      
      this.logger.log(`✅ PDF created successfully: ${path.basename(outputPath)}`);
      return true;

    } catch (error) {
      this.logger.error('❌ Failed to create PDF with Puppeteer:', error);
      return false;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * الحصول على مسار اللوجو المحلي
   */
  private getLogoPath(logoFileName: string): string {
    if (!logoFileName) return '';

    // تحويل مسار اللوجو إلى مسار محلي مطلق
    const logoPath = path.join(process.cwd(), 'uploads', logoFileName);

    // التحقق من وجود الملف
    if (fs.existsSync(logoPath)) {
      // تحويل إلى data URL للاستخدام في PDF
      return `file://${logoPath.replace(/\\/g, '/')}`;
    }

    return '';
  }

  /**
   * تحويل الصورة إلى Base64 للاستخدام في PDF
   */
  private async getLogoAsBase64(logoFileName: string): Promise<string> {
    if (!logoFileName) return '';

    try {
      const logoPath = path.join(process.cwd(), 'uploads', logoFileName);

      if (fs.existsSync(logoPath)) {
        const imageBuffer = fs.readFileSync(logoPath);
        const ext = path.extname(logoFileName).toLowerCase();
        let mimeType = 'image/jpeg';

        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.webp') mimeType = 'image/webp';

        return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
      }
    } catch (error) {
      this.logger.error('Error converting logo to base64:', error);
    }

    return '';
  }

  /**
   * إنشاء HTML للإيصال مع نفس التصميم القديم تماماً
   */
  async createReceiptHtml(trainee: any, allPayments: any[], settings: any): Promise<string> {
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

    // حساب الإجماليات بشكل صحيح
    const totalPaid = allPayments.reduce((sum, payment) => {
      const paidAmount = Number(payment.paidAmount) || 0;
      return sum + paidAmount;
    }, 0);

    const totalDue = allPayments.reduce((sum, payment) => {
      const amount = Number(payment.amount) || 0;
      return sum + amount;
    }, 0);

    const totalRemaining = totalDue - totalPaid;

    // الحصول على اللوجو كـ Base64
    const logoBase64 = await this.getLogoAsBase64(settings.centerLogo);

    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إيصال دفع</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Cairo', Arial, sans-serif;
            direction: rtl;
            background: white;
            color: #333;
            line-height: 1.6;
            font-size: 14px;
        }
        
        .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #2c5aa0;
            padding-bottom: 20px;
            margin-bottom: 30px;
            position: relative;
        }

        .logo-container {
            margin-bottom: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .center-logo {
            max-width: 100px;
            max-height: 100px;
            width: auto;
            height: auto;
            border-radius: 12px;
            box-shadow: 0 6px 12px rgba(44, 90, 160, 0.2);
            border: 2px solid #2c5aa0;
            background: white;
            padding: 5px;
        }
        
        .center-name {
            font-size: 28px;
            font-weight: 700;
            color: #2c5aa0;
            margin-bottom: 10px;
        }
        
        .receipt-title {
            font-size: 24px;
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
        }
        
        .receipt-number {
            font-size: 16px;
            color: #666;
            background: #f8f9fa;
            padding: 8px 15px;
            border-radius: 5px;
            display: inline-block;
        }
        
        .info-section {
            margin: 30px 0;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 25px;
            border-radius: 12px;
            border-right: 5px solid #2c5aa0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .info-title {
            font-size: 20px;
            font-weight: 700;
            color: #2c5aa0;
            margin-bottom: 20px;
            text-align: center;
            border-bottom: 2px solid #2c5aa0;
            padding-bottom: 10px;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
        }

        .info-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            border: 1px solid #e9ecef;
        }

        .info-label {
            font-weight: 600;
            color: #6c757d;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }

        .info-value {
            color: #2c5aa0;
            font-weight: 700;
            font-size: 16px;
            word-break: break-word;
        }
        
        .payments-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .payments-table th {
            background: #2c5aa0;
            color: white;
            padding: 15px 10px;
            text-align: center;
            font-weight: 600;
            font-size: 14px;
        }
        
        .payments-table td {
            padding: 12px 10px;
            text-align: center;
            border-bottom: 1px solid #dee2e6;
        }
        
        .payments-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        .payments-table tr:hover {
            background: #e3f2fd;
        }
        
        .status-paid {
            background: #d4edda;
            color: #155724;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 12px;
        }
        
        .status-partial {
            background: #fff3cd;
            color: #856404;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 12px;
        }
        
        .status-pending {
            background: #f8d7da;
            color: #721c24;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 12px;
        }
        
        .summary-section {
            background: linear-gradient(135deg, #2c5aa0 0%, #1e3d72 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin: 30px 0;
            box-shadow: 0 8px 16px rgba(44, 90, 160, 0.3);
        }

        .summary-title {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 25px;
            text-align: center;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }

        .summary-item {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }

        .summary-label {
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 10px;
            opacity: 0.9;
        }

        .summary-value {
            font-size: 20px;
            font-weight: 700;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        .summary-total {
            background: rgba(255,255,255,0.15);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin-top: 15px;
            border: 2px solid rgba(255,255,255,0.3);
        }

        .summary-total .summary-label {
            font-size: 16px;
            margin-bottom: 8px;
        }

        .summary-total .summary-value {
            font-size: 24px;
            font-weight: 800;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #dee2e6;
            color: #666;
        }
        
        .footer-info {
            margin-bottom: 10px;
        }
        
        .thank-you {
            font-size: 18px;
            font-weight: 600;
            color: #2c5aa0;
            margin-top: 20px;
        }
        
        .amount {
            font-weight: 600;
            color: #2c5aa0;
            font-family: 'Cairo', monospace;
        }

        .payments-table td.amount {
            font-size: 14px;
            font-weight: 700;
        }

        @media print {
            body { print-color-adjust: exact; }
            .summary-section { break-inside: avoid; }
            .info-section { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <!-- Header -->
        <div class="header">
            ${logoBase64 ? `
                <div class="logo-container">
                    <img src="${logoBase64}" alt="شعار المركز" class="center-logo" />
                </div>
            ` : ''}
            <div class="center-name">${settings.centerName || 'مركز التدريب'}</div>
            <div class="receipt-title">إيصال دفع</div>
            <div class="receipt-number">رقم الإيصال: ${allPayments[0]?.id.toString().padStart(6, '0') || '000000'}</div>
        </div>

        <!-- Trainee Info -->
        <div class="info-section">
            <div class="info-title">بيانات المتدرب</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">الاسم</div>
                    <div class="info-value">${trainee.nameAr}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">البرنامج التدريبي</div>
                    <div class="info-value">${trainee.program?.nameAr || 'غير محدد'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">الرقم القومي</div>
                    <div class="info-value">${trainee.nationalId}</div>
                </div>
            </div>
        </div>

        <!-- Payments Table -->
        <table class="payments-table">
            <thead>
                <tr>
                    <th>اسم الرسوم</th>
                    <th>المبلغ المطلوب</th>
                    <th>المبلغ المدفوع</th>
                    <th>المتبقي</th>
                    <th>الحالة</th>
                </tr>
            </thead>
            <tbody>
                ${allPayments.map(payment => {
                  const amount = Number(payment.amount) || 0;
                  const paidAmount = Number(payment.paidAmount) || 0;
                  const remaining = amount - paidAmount;
                  let statusClass = 'status-pending';
                  let statusText = 'غير مدفوع';

                  if (paidAmount >= amount) {
                    statusClass = 'status-paid';
                    statusText = 'مدفوع';
                  } else if (paidAmount > 0) {
                    statusClass = 'status-partial';
                    statusText = 'مدفوع جزئياً';
                  }

                  return `
                    <tr>
                        <td>${payment.fee?.name || 'رسوم غير محددة'}</td>
                        <td class="amount">${amount.toLocaleString()} جنيه</td>
                        <td class="amount">${paidAmount.toLocaleString()} جنيه</td>
                        <td class="amount">${remaining.toLocaleString()} جنيه</td>
                        <td><span class="${statusClass}">${statusText}</span></td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>

        <!-- Summary -->
        <div class="summary-section">
            <div class="summary-title">ملخص المدفوعات</div>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-label">إجمالي المطلوب</div>
                    <div class="summary-value">${totalDue.toLocaleString()} جنيه</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">إجمالي المدفوع</div>
                    <div class="summary-value">${totalPaid.toLocaleString()} جنيه</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">المتبقي</div>
                    <div class="summary-value">${totalRemaining.toLocaleString()} جنيه</div>
                </div>
            </div>
            <div class="summary-total">
                <div class="summary-label">حالة الحساب</div>
                <div class="summary-value">${totalRemaining <= 0 ? '✅ مكتمل الدفع' : '⏳ يوجد مبلغ متبقي'}</div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-info">تاريخ الإصدار: ${arabicDate}</div>
            <div class="footer-info">وقت الإصدار: ${arabicTime}</div>
            ${settings.centerAddress ? `<div class="footer-info">${settings.centerAddress}</div>` : ''}
            ${settings.managerPhoneNumber ? `<div class="footer-info">هاتف: ${settings.managerPhoneNumber}</div>` : ''}
            <div class="thank-you">شكراً لثقتكم بنا</div>
        </div>
    </div>
</body>
</html>`;
  }
}
