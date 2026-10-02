import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { PuppeteerPdfService } from './puppeteer-pdf.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private puppeteerPdfService: PuppeteerPdfService,
  ) {}

  async generatePaymentReceiptPdf(payment: any): Promise<string | null> {
    try {
      console.log(`[PDF Generator] إنشاء إيصال للدفعة ${payment.id}`);
      
      // جلب الإعدادات
      const settings = await this.settingsService.getSettings();
      
      // جلب جميع المدفوعات للمتدرب لإنشاء تقرير كامل
      const allPayments = await this.prisma.traineePayment.findMany({
        where: { traineeId: payment.traineeId },
        include: {
          fee: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          trainee: {
            include: {
              program: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      // تحديد مسار الملف
      const uploadsDir = path.join(process.cwd(), 'uploads', 'receipts');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const fileName = `receipt-${payment.id}-${Date.now()}.pdf`;
      const filePath = path.join(uploadsDir, fileName);
      
      // إنشاء PDF مطابق لصفحة الطباعة باستخدام Puppeteer
      await this.createExactPrintPagePdfWithPuppeteer(payment.trainee, allPayments, settings, filePath);
      
      console.log(`[PDF Generator] ✅ تم إنشاء إيصال مطابق لصفحة الطباعة بنجاح: ${fileName}`);
      return filePath;
      
    } catch (error) {
      console.error(`[PDF Generator] ❌ خطأ في إنشاء الإيصال:`, error);
      return null;
    }
  }

  private async buildReceiptHtml(payment: any, settings: any, totalDebtInfo: any): Promise<string> {
    const now = new Date();
    const arabicDate = now.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const centerName = settings.centerName || 'مركز تدريب مهني';
    const paymentAmount = payment.paidAmount || 0;
    const receiptNumber = payment.id.toString().padStart(6, '0');
    
    // بناء جدول تفاصيل المدفوعات
    const paymentsTableRows = await this.buildPaymentsTableRows(payment.trainee.id);

    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقرير مدفوعات المتدرب</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            background: #f8f9fa;
            color: #333;
            direction: rtl;
            padding: 20px;
        }
        
        .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            position: relative;
        }
        
        .header::before {
            content: '🏛️';
            font-size: 3rem;
            display: block;
            margin-bottom: 10px;
        }
        
        .header h1 {
            font-size: 2rem;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .header .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
            margin-bottom: 5px;
        }
        
        .header .date {
            font-size: 0.9rem;
            opacity: 0.8;
        }
        
        .separator {
            height: 3px;
            background: linear-gradient(90deg, #667eea, #764ba2);
        }
        
        .content {
            padding: 30px;
        }
        
        .trainee-info {
            background: transparent;
            border-radius: 0;
            padding: 0;
            margin-bottom: 15px;
            border: none;
        }
        
        .trainee-info h2 {
            color: #667eea;
            margin-bottom: 8px;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 5px;
        }
        
        .info-grid {
            width: 100%;
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin: 20px 0;
        }
        
        .info-item {
            background: #f8f9fa;
            padding: 12px 15px;
            border-radius: 8px;
            border: 1px solid #ddd;
            flex: 1;
            text-align: center;
        }
        
        .info-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
            font-weight: 600;
            display: block;
        }
        
        .info-value {
            font-size: 14px;
            font-weight: normal;
            color: #333;
            line-height: 1.3;
        }
        
        /* تخطيط مضغوط لمعلومات المتدرب */
        .info-compact {
            background: transparent;
            padding: 0;
            border: none;
            text-align: right;
            font-size: 14px;
            line-height: 1.3;
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin: 20px 0;
        }
        
        .info-compact-item {
            display: flex;
            flex-direction: column;
            margin: 0;
            padding: 12px 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #ddd;
            flex: 1;
            text-align: center;
        }
        
        .info-compact-item strong {
            color: #666;
            font-weight: 600;
            display: block;
            font-size: 12px;
            margin-bottom: 5px;
        }
        
        .info-separator {
            display: none;
            font-weight: bold;
            margin: 0 15px;
        }
        
        .info-label {
            font-size: 0.9rem;
            color: #666;
            margin-bottom: 5px;
        }
        
        .info-value {
            font-weight: bold;
            color: #333;
            font-size: 1rem;
        }
        
        .payments-section h2 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.1rem;
            border-bottom: 2px solid #667eea;
            padding-bottom: 5px;
            text-align: right;
        }
        
        .payments-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border: 1px solid #ddd;
            border-radius: 0;
            overflow: hidden;
            box-shadow: none;
        }
        
        .payments-table th {
            background: white;
            color: #333;
            padding: 12px 8px;
            text-align: center;
            font-weight: bold;
            font-size: 13px;
            border-bottom: 2px solid #ddd;
            border-right: 1px solid #ddd;
        }
        
        .payments-table th:last-child {
            border-right: none;
        }
        
        .payments-table td {
            padding: 10px 8px;
            text-align: center;
            border-bottom: 1px solid #ddd;
            border-right: 1px solid #ddd;
            font-size: 12px;
        }
        
        .payments-table td:last-child {
            border-right: none;
        }
        
        .payments-table tbody tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        .payments-table tbody tr:hover {
            background: #e3f2fd;
        }
        
        .status-paid {
            background: #d4edda;
            color: #155724;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: bold;
        }
        
        .status-partial {
            background: #fff3cd;
            color: #856404;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: bold;
        }
        
        .status-pending {
            background: #f8d7da;
            color: #721c24;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: bold;
        }
        
        .total-row {
            background: #667eea !important;
            color: white !important;
            font-weight: bold;
        }
        
        .total-row td {
            border-bottom: none !important;
            font-size: 0.9rem;
        }
        
        .highlight-amount {
            color: #667eea;
            font-weight: bold;
            font-size: 1.1em;
        }
        
        @media print {
            body { 
                padding: 0;
                background: white;
            }
            .receipt-container {
                box-shadow: none;
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="header">
            <h1>${centerName}</h1>
            <div class="subtitle">تقرير مدفوعات المتدرب</div>
            <div class="date">تاريخ إصدار التقرير: ${arabicDate}</div>
        </div>
        
        <div class="separator"></div>
        
        <div class="content">
            <div class="trainee-info">
                <h2>🎓 معلومات المتدرب</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">اسم المتدرب</div>
                        <div class="info-value">${payment.trainee.nameAr}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">الرقم القومي</div>
                        <div class="info-value">${payment.trainee.nationalId || 'غير محدد'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">البرنامج التدريبي</div>
                        <div class="info-value">${payment.trainee.program?.nameAr || 'غير محدد'}</div>
                    </div>
                </div>
            </div>
            
            <div class="payments-section">
                <h2>💰 تفاصيل المدفوعات</h2>
                <table class="payments-table">
                    <thead>
                        <tr>
                            <th>اسم الرسوم</th>
                            <th>المبلغ الإجمالي</th>
                            <th>المبلغ المدفوع</th>
                            <th>المبلغ المتبقي</th>
                            <th>تاريخ الدفع</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paymentsTableRows}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  private async buildPaymentsTableRows(traineeId: number): Promise<string> {
    try {
      // جلب جميع مدفوعات المتدرب
      const payments = await this.prisma.traineePayment.findMany({
        where: { traineeId },
        include: {
          fee: true
        },
        orderBy: { createdAt: 'asc' }
      });

      let totalDue = 0;
      let totalPaid = 0;
      let rows = '';

      for (const payment of payments) {
        const remaining = payment.amount - payment.paidAmount;
        const paidDate = payment.paidAt ? 
          payment.paidAt.toLocaleDateString('ar-EG') : 
          'لم يتم الدفع بعد';

        let statusClass = 'status-pending';
        let statusText = 'مدفوع جزئياً';
        
        if (payment.status === 'PAID') {
          statusClass = 'status-paid';
          statusText = 'مدفوع';
        } else if (payment.status === 'PENDING') {
          statusClass = 'status-pending';
          statusText = 'غير مدفوع';
        } else if (payment.status === 'PARTIALLY_PAID') {
          statusClass = 'status-partial';
          statusText = 'مدفوع جزئياً';
        }

        rows += `
        <tr>
            <td>${payment.fee?.name || 'رسوم متنوعة'}</td>
            <td class="highlight-amount">${payment.amount.toLocaleString('ar-EG')} جنيه</td>
            <td class="highlight-amount">${payment.paidAmount.toLocaleString('ar-EG')} جنيه</td>
            <td class="highlight-amount">${remaining.toLocaleString('ar-EG')} جنيه</td>
            <td>${paidDate}</td>
            <td><span class="${statusClass}">${statusText}</span></td>
        </tr>`;

        totalDue += payment.amount;
        totalPaid += payment.paidAmount;
      }

      const totalRemaining = totalDue - totalPaid;

      // إضافة صف الإجمالي
      rows += `
      <tr class="total-row">
          <td><strong>الإجمالي</strong></td>
          <td><strong>${totalDue.toLocaleString('ar-EG')} جنيه</strong></td>
          <td><strong>${totalPaid.toLocaleString('ar-EG')} جنيه</strong></td>
          <td><strong>${totalRemaining.toLocaleString('ar-EG')} جنيه</strong></td>
          <td>-</td>
          <td>-</td>
      </tr>`;

      return rows;
    } catch (error) {
      console.error('خطأ في بناء جدول المدفوعات:', error);
      return '<tr><td colspan="6">خطأ في جلب البيانات</td></tr>';
    }
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
      console.error('خطأ في حساب حالة المديونية:', error);
      return {
        totalPaid: 0,
        totalRemaining: 0,
        totalDue: 0
      };
    }
  }


  
  private async buildPrintPageHTML(trainee: any, allPayments: any[], settings: any): Promise<string> {
    // إنشاء HTML مطابق 100% لصفحة الطباعة في localhost:3000/print/trainee-payments/[id]
    const now = new Date();
    const arabicDate = now.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const arabicTime = now.toLocaleTimeString('ar-EG');
    const centerName = settings.centerName || 'مركز تدريب مهني';
    
    // حساب الإجماليات
    const totalAmount = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = allPayments.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalRemaining = totalAmount - totalPaid;
    
    // دوال المساعدة
    const formatCurrency = (amount: number) => amount.toLocaleString('ar-EG') + ' ج.م';
    const formatDate = (date: any) => date ? new Date(date).toLocaleDateString('ar-EG') : '-';
    const getPaymentStatusText = (status: string) => {
      const statusMap = {
        'PENDING': 'قيد الانتظار',
        'PAID': 'مدفوع',
        'PARTIALLY_PAID': 'مدفوع جزئياً',
        'CANCELLED': 'ملغي'
      };
      return statusMap[status] || status;
    };
    const getStatusClass = (status: string) => {
      return status === 'PAID' ? 'status-paid' : 
             status === 'PARTIALLY_PAID' ? 'status-partial' : 'status-pending';
    };
    
    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>تقرير مدفوعات المتدرب</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: 'Cairo', 'Arial', sans-serif;
            direction: rtl;
            background: white;
            color: black;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .print-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #0A2647;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .logo {
            width: 100px;
            height: 100px;
            margin: 0 auto 15px;
            background: #f0f0f0;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
        }
        
        .title {
            font-size: 28px;
            font-weight: bold;
            color: #0A2647;
            margin: 15px 0;
        }
        
        .subtitle {
            font-size: 20px;
            color: #666;
            margin: 10px 0;
        }
        
        .date {
            font-size: 14px;
            color: #888;
            margin-top: 15px;
        }
        
        .section {
            margin: 25px 0;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #0A2647;
            margin-bottom: 12px;
            border-bottom: 2px solid #0A2647;
            padding-bottom: 5px;
            position: relative;
        }
        
        .section-title::before {
            margin-left: 8px;
        }
        
        .info-grid {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin: 20px 0;
        }
        
        .info-item {
            padding: 12px 15px;
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 8px;
            margin-bottom: 0;
            flex: 1;
            text-align: center;
        }
        
        .info-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
            font-weight: 600;
            display: block;
        }
        
        .info-value {
            font-size: 14px;
            font-weight: normal;
            color: #333;
            line-height: 1.3;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 12px;
            border: 1px solid #ddd;
        }
        
        .data-table th,
        .data-table td {
            border: 1px solid #ddd;
            padding: 10px 8px;
            text-align: center;
        }
        
        .data-table th {
            background: white;
            color: #333;
            font-weight: bold;
            font-size: 13px;
            border-bottom: 2px solid #ddd;
        }
        
        .data-table tr:nth-child(even) {
            background: #fafafa;
        }
        
        .data-table tbody tr:last-child {
            font-weight: bold;
            background-color: #f8f9fa;
            border-top: 2px solid #0A2647;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
            border: 1px solid #ccc;
        }
        
        .status-paid {
            background: #d4edda;
            color: #155724;
            border-color: #c3e6cb;
        }
        
        .status-partial {
            background: #fff3cd;
            color: #856404;
            border-color: #ffeaa7;
        }
        
        .status-pending {
            background: #f8d7da;
            color: #721c24;
            border-color: #f5c6cb;
        }
        
        .footer {
            text-align: center;
            border-top: 2px solid #ddd;
            padding-top: 15px;
            margin-top: 40px;
            font-size: 11px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="print-container">
        <div class="header">
            <div class="logo">🏦</div>
            <h1 class="title">${centerName}</h1>
            <h2 class="subtitle">تقرير مدفوعات المتدرب</h2>
            <div class="date">تاريخ إصدار التقرير: ${arabicDate}</div>
        </div>

        <div class="section">
            <h3 class="section-title">🎓 معلومات المتدرب</h3>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">اسم المتدرب</div>
                    <div class="info-value">${trainee?.nameAr || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">الرقم القومي</div>
                    <div class="info-value">${trainee?.nationalId || '-'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">البرنامج التدريبي</div>
                    <div class="info-value">${trainee?.program?.nameAr || '-'}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">💰 تفاصيل المدفوعات</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>اسم الرسوم</th>
                        <th>المبلغ الإجمالي</th>
                        <th>المبلغ المدفوع</th>
                        <th>المبلغ المتبقي</th>
                        <th>تاريخ الدفع</th>
                        <th>الحالة</th>
                    </tr>
                </thead>
                <tbody>
                    ${allPayments.map(p => {
                      const remainingAmount = p.amount - p.paidAmount;
                      return `
                        <tr>
                            <td>${p.fee?.name || '-'}</td>
                            <td>${formatCurrency(p.amount)}</td>
                            <td style="color: #059669;">${formatCurrency(p.paidAmount)}</td>
                            <td style="color: #dc2626;">${formatCurrency(remainingAmount)}</td>
                            <td>${p.paidAt ? formatDate(p.paidAt) : (p.status === 'PENDING' ? 'لم يدفع بعد' : '-')}</td>
                            <td>
                                <span class="status-badge ${getStatusClass(p.status)}">
                                    ${getPaymentStatusText(p.status)}
                                </span>
                            </td>
                        </tr>
                      `;
                    }).join('')}
                    <tr>
                        <td style="font-weight: bold;">الإجمالي</td>
                        <td style="font-weight: bold; color: #0A2647;">${formatCurrency(totalAmount)}</td>
                        <td style="font-weight: bold; color: #059669;">${formatCurrency(totalPaid)}</td>
                        <td style="font-weight: bold; color: #dc2626;">${formatCurrency(totalRemaining)}</td>
                        <td>-</td>
                        <td>-</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="footer">
            <div style="border-top: 1px solid #ccc; padding-top: 15px;">
                <p style="margin: 5px 0; font-weight: bold;">${centerName}</p>
                <p style="margin: 5px 0;">نظام إدارة المدفوعات</p>
                <p style="margin: 5px 0;">تم إنشاء هذا التقرير بتاريخ: ${now.toLocaleDateString('ar-EG')} - الساعة: ${arabicTime}</p>
                <p style="margin: 10px 0 0 0; font-size: 10px;">هذا التقرير سري ومخصص للاستخدام الداخلي فقط</p>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * إنشاء PDF مطابق تماماً لصفحة الطباعة - الحل الجذري
   */
  /**
   * إنشاء PDF باستخدام Puppeteer - حل احترافي مع دعم كامل للعربية
   */
  private async createExactPrintPagePdfWithPuppeteer(trainee: any, allPayments: any[], settings: any, outputPath: string): Promise<void> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        console.log(`[PDF Generator] محاولة إنشاء PDF باستخدام Puppeteer رقم ${attempt}/${maxRetries}`);

        // إنشاء HTML للإيصال
        const htmlContent = await this.puppeteerPdfService.createReceiptHtml(trainee, allPayments, settings);

        // إنشاء PDF باستخدام Puppeteer
        const success = await this.puppeteerPdfService.generatePdfFromHtml(htmlContent, outputPath);

        if (success) {
          console.log(`[PDF Generator] ✅ تم إنشاء PDF بنجاح باستخدام Puppeteer في المحاولة ${attempt}`);
          return;
        } else {
          throw new Error('Puppeteer PDF generation failed');
        }

      } catch (error) {
        console.error(`[PDF Generator] ❌ فشل في المحاولة ${attempt} مع Puppeteer:`, error.message);

        if (attempt === maxRetries) {
          console.error(`[PDF Generator] ❌ فشل في جميع المحاولات مع Puppeteer، سيتم إنشاء إيصال نصي بديل`);
          // إنشاء ملف نصي بديل
          await this.createTextReceiptFallback(trainee, allPayments, settings, outputPath);
          return;
        }

        // انتظار قبل المحاولة التالية
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * دالة آمنة لإنشاء PDF مع حماية من الأخطاء ومنع كراش السيرفر (احتياطية)
   */




  /**
   * إنشاء إيصال نصي بديل في حالة فشل PDF
   */
  private async createTextReceiptFallback(trainee: any, allPayments: any[], settings: any, outputPath: string): Promise<void> {
    try {
      console.log(`[PDF Generator] إنشاء إيصال نصي بديل`);

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

      // حساب إجمالي المدفوعات
      const totalPaid = allPayments.reduce((sum, payment) => sum + payment.paidAmount, 0);
      const totalDue = allPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const totalRemaining = totalDue - totalPaid;

      // إنشاء محتوى نصي
      const textContent = `
═══════════════════════════════════════════════════════════════
                    ${settings.centerName || 'مركز التدريب'}
═══════════════════════════════════════════════════════════════

                           إيصال دفع
                      Receipt #${allPayments[0]?.id.toString().padStart(6, '0') || '000000'}

───────────────────────────────────────────────────────────────

بيانات المتدرب:
الاسم: ${trainee.nameAr}
البرنامج: ${trainee.program?.nameAr || 'غير محدد'}
الرقم القومي: ${trainee.nationalId}

───────────────────────────────────────────────────────────────

تفاصيل المدفوعات:

${allPayments.map(payment => `
• ${payment.fee?.name || 'رسوم غير محددة'}
  المبلغ المطلوب: ${payment.amount} جنيه
  المبلغ المدفوع: ${payment.paidAmount} جنيه
  الحالة: ${payment.status === 'PAID' ? 'مدفوع' : payment.status === 'PARTIALLY_PAID' ? 'مدفوع جزئياً' : 'غير مدفوع'}
`).join('')}

───────────────────────────────────────────────────────────────

ملخص المدفوعات:
إجمالي المطلوب: ${totalDue} جنيه
إجمالي المدفوع: ${totalPaid} جنيه
المتبقي: ${totalRemaining} جنيه

───────────────────────────────────────────────────────────────

تاريخ الإصدار: ${arabicDate}
وقت الإصدار: ${arabicTime}

${settings.centerAddress || ''}
${settings.managerPhoneNumber || ''}

═══════════════════════════════════════════════════════════════
                    شكراً لثقتكم بنا
═══════════════════════════════════════════════════════════════
`;

      // تغيير امتداد الملف إلى .txt
      const textOutputPath = outputPath.replace('.pdf', '.txt');

      // كتابة الملف النصي
      fs.writeFileSync(textOutputPath, textContent, 'utf8');

      console.log(`[PDF Generator] ✅ تم إنشاء إيصال نصي بديل: ${textOutputPath}`);

    } catch (error) {
      console.error(`[PDF Generator] ❌ خطأ في إنشاء الإيصال النصي البديل:`, error);
      throw error;
    }
  }

  /**
   * بناء HTML مطابق تماماً لصفحة الطباعة
   */
  private buildExactPrintPageHTML(trainee: any, allPayments: any[], settings: any): string {
    const now = new Date();
    const arabicDate = now.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const centerName = settings?.centerName || 'مركز طيبة للتدريب المهني';
    
    // حساب الإجماليات
    const totals = this.calculatePaymentTotals(allPayments);
    
    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقرير مدفوعات المتدرب</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            direction: rtl;
            background: white;
            color: black;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .print-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #0A2647;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .logo {
            width: 100px;
            height: 100px;
            margin: 0 auto 15px;
            background: #f0f0f0;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
        }
        
        .title {
            font-size: 28px;
            font-weight: bold;
            color: #0A2647;
            margin: 15px 0;
        }
        
        .subtitle {
            font-size: 20px;
            color: #666;
            margin: 10px 0;
        }
        
        .date {
            font-size: 14px;
            color: #888;
            margin-top: 15px;
        }
        
        .section {
            margin: 25px 0;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #0A2647;
            margin-bottom: 15px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        
        .info-grid {
            display: table;
            width: 100%;
            table-layout: fixed;
            border-spacing: 10px 0;
            margin: 15px 0;
        }
        
        .info-item {
            display: table-cell;
            width: 33.33%;
            padding: 8px;
            background: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 5px;
            text-align: center;
            vertical-align: top;
        }
        
        .info-label {
            font-size: 11px;
            color: #666;
            margin-bottom: 3px;
        }
        
        .info-value {
            font-size: 13px;
            font-weight: bold;
            color: #333;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 11px;
        }
        
        .data-table th,
        .data-table td {
            border: 1px solid #ddd;
            padding: 8px 6px;
            text-align: right;
        }
        
        .data-table th {
            background: #f5f5f5;
            font-weight: bold;
            font-size: 12px;
        }
        
        .data-table tr:nth-child(even) {
            background: #fafafa;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
            border: 1px solid #ccc;
        }
        
        .status-paid {
            background: #d4edda;
            color: #155724;
            border-color: #c3e6cb;
        }
        
        .status-partial {
            background: #fff3cd;
            color: #856404;
            border-color: #ffeaa7;
        }
        
        .status-pending {
            background: #f8d7da;
            color: #721c24;
            border-color: #f5c6cb;
        }
        
        .footer {
            text-align: center;
            border-top: 2px solid #ddd;
            padding-top: 15px;
            margin-top: 40px;
            font-size: 11px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="print-container">
        <div class="header">
            <div class="logo">🏛️</div>
            <h1 class="title">${centerName}</h1>
            <h2 class="subtitle">تقرير مدفوعات المتدرب</h2>
            <div class="date">تاريخ إصدار التقرير: ${arabicDate}</div>
        </div>

        <div class="section">
            <h3 class="section-title">معلومات المتدرب</h3>
            <table style="width: 100%; border-spacing: 10px 0; margin: 15px 0;">
                <tr>
                    <td style="width: 33.33%; padding: 8px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; text-align: center;">
                        <div style="font-size: 11px; color: #666; margin-bottom: 3px;">اسم المتدرب</div>
                        <div style="font-size: 13px; font-weight: bold; color: #333;">${trainee?.nameAr || '-'}</div>
                    </td>
                    <td style="width: 33.33%; padding: 8px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; text-align: center;">
                        <div style="font-size: 11px; color: #666; margin-bottom: 3px;">الرقم القومي</div>
                        <div style="font-size: 13px; font-weight: bold; color: #333;">${trainee?.nationalId || '-'}</div>
                    </td>
                    <td style="width: 33.33%; padding: 8px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; text-align: center;">
                        <div style="font-size: 11px; color: #666; margin-bottom: 3px;">البرنامج التدريبي</div>
                        <div style="font-size: 13px; font-weight: bold; color: #333;">${trainee?.program?.nameAr || '-'}</div>
                    </td>
                </tr>
            </table>
        </div>

        <div class="section">
            <h3 class="section-title">تفاصيل المدفوعات</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>اسم الرسوم</th>
                        <th>المبلغ الإجمالي</th>
                        <th>المبلغ المدفوع</th>
                        <th>المبلغ المتبقي</th>
                        <th>تاريخ الدفع</th>
                        <th>الحالة</th>
                    </tr>
                </thead>
                <tbody>
                    ${allPayments.map(p => {
                      const remainingAmount = p.amount - p.paidAmount;
                      const status = this.getPaymentStatus(p);
                      const statusText = this.getPaymentStatusText(status);
                      const paymentDate = p.paidAmount > 0 ? 
                        new Date(p.updatedAt).toLocaleDateString('ar-EG') : '-';
                      
                      // تشخيص البيانات
                      console.log(`[PDF Debug] Payment ${p.id}: fee =`, p.fee);
                      
                      return `
                        <tr>
                          <td>${p.fee?.name || 'رسوم غير محددة'}</td>
                          <td>${p.amount.toFixed(0)} جنيه</td>
                          <td>${p.paidAmount.toFixed(0)} جنيه</td>
                          <td>${remainingAmount.toFixed(0)} جنيه</td>
                          <td>${paymentDate}</td>
                          <td><span class="status-badge status-${status}">${statusText}</span></td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>هذا التقرير تم إنشاؤه تلقائياً بواسطة نظام ${centerName}</p>
            <p style="margin: 10px 0 0 0; font-size: 10px;">هذا التقرير سري ومخصص للاستخدام الداخلي فقط</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * حساب إجماليات المدفوعات
   */
  private calculatePaymentTotals(allPayments: any[]): any {
    const totalAmount = allPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalPaid = allPayments.reduce((sum, payment) => sum + payment.paidAmount, 0);
    const totalRemaining = totalAmount - totalPaid;
    
    return {
      totalAmount,
      totalPaid,
      totalRemaining
    };
  }

  /**
   * تحديد حالة الدفع
   */
  private getPaymentStatus(payment: any): string {
    if (payment.paidAmount === 0) return 'pending';
    if (payment.paidAmount >= payment.amount) return 'paid';
    return 'partial';
  }

  /**
   * تحويل حالة الدفع إلى نص عربي
   */
  private getPaymentStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'paid': return 'مدفوع';
      case 'partial': return 'مدفوع جزئياً';
      default: return status;
    }
  }

  /**
   * إنشاء HTML للـ PDF مع تصميم أنيق
   */
  private async createStyledReceiptHTML(
    payment: any,
    trainee: any,
    settings: any
  ): Promise<string> {
    const now = new Date();
    const arabicDate = now.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
    const arabicTime = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const centerName = settings.centerName || 'مركز تدريب مهني';
    const receiptNumber = payment.id.toString().padStart(6, '0');
    
    // Calculate total debt information for the trainee
    const totalDebtInfo = await this.calculateTotalDebt(payment.traineeId);
    
    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إيصال دفع #${receiptNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Cairo', 'Arial', sans-serif;
            direction: rtl;
            text-align: right;
            background: #ffffff;
            color: #333;
            line-height: 1.6;
            font-size: 14px;
        }
        
        .receipt-container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        
        .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .header .subtitle {
            font-size: 18px;
            opacity: 0.9;
            margin-bottom: 15px;
        }
        
        .header .receipt-title {
            font-size: 24px;
            font-weight: 700;
            background: rgba(255,255,255,0.2);
            padding: 10px 20px;
            border-radius: 25px;
            display: inline-block;
        }
        
        .content {
            padding: 30px;
        }
        
        .receipt-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            border-right: 5px solid #667eea;
        }
        
        .receipt-info div {
            text-align: center;
        }
        
        .receipt-info .label {
            font-weight: 700;
            color: #667eea;
            font-size: 16px;
            margin-bottom: 5px;
        }
        
        .receipt-info .value {
            font-size: 18px;
            font-weight: 600;
        }
        
        .trainee-section {
            margin-bottom: 30px;
        }
        
        .section-title {
            background: #667eea;
            color: white;
            padding: 15px;
            font-size: 20px;
            font-weight: 700;
            text-align: center;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .info-grid {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 20px;
            width: 100%;
        }
        
        .info-item {
            flex: 1;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-right: 4px solid #667eea;
            min-width: 30%;
        }
        
        .info-item .label {
            font-weight: 700;
            color: #667eea;
            margin-bottom: 8px;
            font-size: 16px;
        }
        
        .info-item .value {
            font-size: 18px;
            font-weight: 600;
            color: #333;
        }
        
        .payment-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-radius: 10px;
            overflow: hidden;
        }
        
        .payment-table th {
            background: #667eea;
            color: white;
            padding: 15px;
            text-align: center;
            font-weight: 700;
            font-size: 18px;
        }
        
        .payment-table td {
            padding: 15px;
            text-align: center;
            border-bottom: 1px solid #eee;
            font-size: 16px;
        }
        
        .payment-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        .payment-table tr:hover {
            background: #e3f2fd;
        }
        
        .amount {
            font-weight: 700;
            color: #2e7d32;
            font-size: 18px;
        }
        
        .status {
            padding: 8px 15px;
            border-radius: 20px;
            font-weight: 700;
            color: white;
        }
        
        .status.paid {
            background: #4caf50;
        }
        
        .status.partial {
            background: #ff9800;
        }
        
        .status.pending {
            background: #f44336;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 25px;
            text-align: center;
            border-top: 3px solid #667eea;
            margin-top: 30px;
        }
        
        .footer .thanks {
            font-size: 22px;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 10px;
        }
        
        .footer .note {
            font-size: 14px;
            color: #666;
            font-style: italic;
        }
        
        .divider {
            width: 100%;
            height: 3px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="header">
            <h1>${centerName}</h1>
            <div class="subtitle">مركز تدريب مهني معتمد</div>
            <div class="receipt-title">إيصال دفع رسوم</div>
        </div>
        
        <div class="content">
            <div class="receipt-info">
                <div>
                    <div class="label">رقم الإيصال</div>
                    <div class="value">#${receiptNumber}</div>
                </div>
                <div>
                    <div class="label">تاريخ الإصدار</div>
                    <div class="value">${arabicDate}</div>
                </div>
                <div>
                    <div class="label">وقت الإصدار</div>
                    <div class="value">${arabicTime}</div>
                </div>
            </div>
            
            <div class="trainee-section">
                <div class="section-title">بيانات المتدرب</div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #ddd; text-align: center; line-height: 1.8;">
                    <span style="color: #666; font-weight: 600; font-size: 12px;">اسم المتدرب:</span>
                    <span style="color: #333; font-size: 14px; margin-left: 15px;">${payment.trainee?.nameAr || 'غير محدد'}</span>
                    <span style="color: #667eea; margin: 0 10px;">|</span>
                    <span style="color: #666; font-weight: 600; font-size: 12px;">الرقم القومي:</span>
                    <span style="color: #333; font-size: 14px; margin-left: 15px;">${payment.trainee?.nationalId || 'غير محدد'}</span>
                    <span style="color: #667eea; margin: 0 10px;">|</span>
                    <span style="color: #666; font-weight: 600; font-size: 12px;">البرنامج التدريبي:</span>
                    <span style="color: #333; font-size: 14px; margin-left: 15px;">${payment.trainee?.program?.nameAr || 'غير محدد'}</span>
                </div>
            </div>
            
            <div class="divider"></div>
            
            <div class="section-title">تفاصيل الدفع</div>
            
            <table class="payment-table">
                <thead>
                    <tr>
                        <th>البيان</th>
                        <th>المبلغ (جنيه)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>المبلغ المدفوع في هذه العملية</td>
                        <td class="amount">${payment.amount ? payment.amount.toLocaleString('ar-EG') : (payment.paidAmount || 0).toLocaleString('ar-EG')} جنيه</td>
                    </tr>
                    <tr>
                        <td>إجمالي المبالغ المدفوعة</td>
                        <td class="amount">${(totalDebtInfo.totalPaid || 0).toLocaleString('ar-EG')} جنيه</td>
                    </tr>
                    <tr>
                        <td>المتبقي من جميع الرسوم</td>
                        <td class="amount">${(totalDebtInfo.totalRemaining || 0).toLocaleString('ar-EG')} جنيه</td>
                    </tr>
                    <tr>
                        <td>حالة الدفع</td>
                        <td><span class="status ${this.getStatusClass(payment.status)}">${this.getStatusInArabic(payment.status)}</span></td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <div class="thanks">شكراً لثقتك في ${centerName}</div>
            <div class="note">هذا إيصال مُنتج آلياً ولا يحتاج ختم أو توقيع</div>
        </div>
    </div>
</body>
</html>
    `;
  }
  
  private getStatusInArabic(status: string): string {
    const statusMap = {
      'PAID': 'مدفوع بالكامل',
      'PARTIALLY_PAID': 'مدفوع جزئياً',
      'PENDING': 'في الانتظار',
      'CANCELLED': 'ملغي'
    };
    return statusMap[status] || status;
  }
  
  private getStatusClass(status: string): string {
    const statusClassMap = {
      'PAID': 'paid',
      'PARTIALLY_PAID': 'partial',
      'PENDING': 'pending',
      'CANCELLED': 'pending'
    };
    return statusClassMap[status] || 'pending';
  }

  /**
   * Calculate total debt information for a trainee
   */
  private async calculateTotalDebt(traineeId: number) {
    const payments = await this.prisma.traineePayment.findMany({
      where: { traineeId },
    });

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalRemaining = totalAmount - totalPaid;

    return {
      totalAmount,
      totalPaid,
      totalRemaining,
    };
  }

  /**
   * إنشاء إيصال PDF شامل للدفع الذكي
   */
  async createSmartPaymentReceipt(smartPaymentResult: any, settings: any): Promise<string | null> {
    try {
      console.log(`[PDF Generator Smart] إنشاء إيصال دفع ذكي شامل`);

      // جلب بيانات المتدرب من أول دفعة
      const firstPaymentId = smartPaymentResult.paymentDetails[0]?.paymentId;
      if (!firstPaymentId) {
        console.error('[PDF Generator Smart] No payment details found');
        return null;
      }

      const payment = await this.prisma.traineePayment.findUnique({
        where: { id: firstPaymentId },
        include: {
          trainee: { include: { program: true } },
          fee: true
        }
      });

      if (!payment) {
        console.error('[PDF Generator Smart] Payment not found');
        return null;
      }

      const trainee = payment.trainee;

      // جلب جميع المدفوعات للمتدرب (مثل PDF القديم)
      const allPayments = await this.prisma.traineePayment.findMany({
        where: { traineeId: trainee.id },
        include: {
          fee: {
            select: {
              id: true,
              name: true,
              amount: true,
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      // إنشاء محتوى HTML للإيصال الشامل مع جميع المدفوعات
      const htmlContent = this.generateSmartPaymentReceiptHTML(trainee, smartPaymentResult, settings, allPayments);

      // إنشاء PDF باستخدام Puppeteer
      const fileName = `smart_payment_receipt_${trainee.id}_${Date.now()}.pdf`;
      const outputPath = path.join(process.cwd(), 'uploads', 'receipts', fileName);

      // التأكد من وجود مجلد الإيصالات
      const receiptsDir = path.dirname(outputPath);
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }

      const success = await this.puppeteerPdfService.generatePdfFromHtml(htmlContent, outputPath);

      if (success) {
        console.log(`[PDF Generator Smart] ✅ Smart payment receipt created: ${outputPath}`);
        return outputPath;
      } else {
        console.error('[PDF Generator Smart] ❌ Failed to generate smart payment receipt');
        return null;
      }

    } catch (error) {
      console.error('[PDF Generator Smart] Error creating smart payment receipt:', error);
      return null;
    }
  }

  /**
   * إنشاء محتوى HTML لإيصال الدفع الذكي
   */
  private generateSmartPaymentReceiptHTML(trainee: any, smartPaymentResult: any, settings: any, allPayments: any[]): string {
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

    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>إيصال الدفع الذكي</title>
        <style>
            ${this.getSmartPaymentReceiptCSS()}
        </style>
    </head>
    <body>
        <div class="receipt-container">
            <!-- Header -->
            <div class="receipt-header">
                ${settings?.organizationLogo ? `<img src="${settings.organizationLogo}" alt="شعار المؤسسة" class="organization-logo">` : ''}
                <div class="organization-info">
                    <h1 class="organization-name">${settings?.centerName || settings?.organizationName || 'مركز التدريب'}</h1>
                    ${settings?.organizationPhone ? `<p class="organization-phone">📞 ${settings.organizationPhone}</p>` : ''}
                    ${settings?.organizationAddress ? `<p class="organization-address">📍 ${settings.organizationAddress}</p>` : ''}
                </div>
            </div>

            <!-- Title -->
            <div class="receipt-title">
                <h2>🎉 إيصال دفع ذكي شامل</h2>
                <p class="receipt-number">رقم الإيصال: #SMART_${Date.now()}</p>
            </div>

            <!-- Trainee Info -->
            <div class="trainee-info">
                <h3>📋 بيانات المتدرب</h3>
                <div class="trainee-details">
                    <div class="trainee-item">
                        <span class="trainee-label">الاسم:</span>
                        <span class="trainee-value">${trainee.nameAr}</span>
                    </div>
                    <div class="trainee-item">
                        <span class="trainee-label">البرنامج التدريبي:</span>
                        <span class="trainee-value">${trainee.program?.nameAr || 'غير محدد'}</span>
                    </div>
                </div>
            </div>

            <!-- Payment Summary -->
            <div class="payment-summary">
                <h3>💰 ملخص الدفع</h3>
                <table class="summary-table">
                    <tr><td><strong>إجمالي المبلغ المدفوع:</strong></td><td class="amount">${smartPaymentResult.totalAmountPaid?.toLocaleString('ar-EG')} جنيه</td></tr>
                    <tr><td><strong>المبلغ المتبقي غير المسدد:</strong></td><td class="amount remaining">${allPayments.reduce((sum, payment) => sum + (payment.amount - payment.paidAmount), 0).toLocaleString('ar-EG')} جنيه</td></tr>
                    <tr><td><strong>الرسوم المدفوعة كاملة:</strong></td><td>${smartPaymentResult.fullyPaidCount}</td></tr>
                    <tr><td><strong>الرسوم المدفوعة جزئياً:</strong></td><td>${smartPaymentResult.partiallyPaidCount}</td></tr>
                </table>
            </div>

            <!-- All Payments Details -->
            <div class="payment-details">
                <h3>📝 تفاصيل جميع الرسوم</h3>
                <table class="payments-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>اسم الرسم</th>
                            <th>المبلغ المطلوب</th>
                            <th>المبلغ المدفوع</th>
                            <th>المتبقي</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allPayments.map((payment: any, index: number) => {
                          const amount = Number(payment.amount) || 0;
                          const paidAmount = Number(payment.paidAmount) || 0;
                          const remainingAmount = amount - paidAmount;
                          
                          // تحديد إذا كان هذا الرسم تم دفعه في الدفع الذكي
                          const smartPaymentDetail = smartPaymentResult.paymentDetails.find((detail: any) => detail.paymentId === payment.id);
                          const isInSmartPayment = !!smartPaymentDetail;
                          
                          let status = '';
                          let statusClass = '';
                          if (paidAmount >= amount) {
                            status = 'مدفوع بالكامل';
                            statusClass = 'paid';
                          } else if (paidAmount > 0) {
                            status = 'مدفوع جزئياً';
                            statusClass = 'partial';
                          } else {
                            status = 'في الانتظار';
                            statusClass = 'pending';
                          }
                          
                          return `
                            <tr ${isInSmartPayment ? 'style="background-color: #e8f5e8; border-left: 4px solid #4caf50;"' : ''}>
                                <td>${index + 1}</td>
                                <td>
                                  ${payment.fee?.name || 'رسوم تدريب'}
                                  ${isInSmartPayment ? '<br><small style="color: #4caf50; font-weight: bold;">✅ مدفوع في هذه العملية</small>' : ''}
                                </td>
                                <td class="amount">${amount.toLocaleString('ar-EG')} جنيه</td>
                                <td class="amount">${paidAmount.toLocaleString('ar-EG')} جنيه</td>
                                <td class="amount ${remainingAmount > 0 ? 'remaining' : ''}">${remainingAmount.toLocaleString('ar-EG')} جنيه</td>
                                <td class="status ${statusClass}">${status}</td>
                            </tr>
                          `;
                        }).join('')}
                    </tbody>
                </table>
            </div>


            <!-- Date & Time -->
            <div class="receipt-footer">
                <div class="date-info">
                    <p><strong>📅 تاريخ الدفع:</strong> ${arabicDate}</p>
                    <p><strong>⏰ وقت الدفع:</strong> ${arabicTime}</p>
                </div>
                
                <div class="footer-note">
                    <p>✨ شكراً لك على ثقتك بنا</p>
                    <p class="generated-note">تم إنشاء هذا الإيصال تلقائياً</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * إنشاء CSS لإيصال الدفع الذكي
   */
  private getSmartPaymentReceiptCSS(): string {
    return `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: 'Cairo', 'Arial', sans-serif;
            direction: rtl;
            background: white;
            color: black;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .receipt-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        .receipt-header {
            text-align: center;
            border-bottom: 3px solid #0A2647;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
        }
        
        .organization-logo {
            width: 80px;
            height: 80px;
            border-radius: 50%;
        }
        
        .organization-info {
            text-align: center;
        }
        
        .organization-name {
            font-size: 28px;
            font-weight: bold;
            color: #0A2647;
            margin: 15px 0;
        }
        
        .organization-phone, .organization-address {
            font-size: 14px;
            color: #666;
            margin: 5px 0;
        }
        
        .receipt-title {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .receipt-title h2 {
            font-size: 24px;
            color: #0A2647;
            margin-bottom: 10px;
        }
        
        .receipt-number {
            font-size: 16px;
            color: #666;
        }
        
        .trainee-info, .payment-summary, .payment-details {
            margin: 25px 0;
            page-break-inside: avoid;
        }
        
        .trainee-info h3, .payment-summary h3, .payment-details h3 {
            font-size: 18px;
            font-weight: bold;
            color: #0A2647;
            margin-bottom: 15px;
            border-bottom: 2px solid #0A2647;
            padding-bottom: 5px;
        }
        
        .trainee-details {
            display: flex;
            justify-content: space-around;
            gap: 20px;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #ddd;
        }
        
        .trainee-item {
            flex: 1;
            text-align: center;
            background: white;
            padding: 15px;
            border-radius: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .trainee-label {
            display: block;
            font-weight: bold;
            color: #0A2647;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .trainee-value {
            display: block;
            font-size: 16px;
            color: #333;
            font-weight: 600;
        }
        
        .info-table, .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        .info-table td, .summary-table td {
            padding: 10px 15px;
            border: 1px solid #ddd;
        }
        
        .info-table td:first-child, .summary-table td:first-child {
            background: #f8f9fa;
            font-weight: bold;
            width: 30%;
        }
        
        .payments-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 13px;
        }
        
        .payments-table th,
        .payments-table td {
            border: 1px solid #ddd;
            padding: 12px 8px;
            text-align: center;
        }
        
        .payments-table th {
            background: #0A2647;
            color: white;
            font-weight: bold;
            font-size: 14px;
        }
        
        .payments-table tr:nth-child(even) {
            background: #fafafa;
        }
        
        .amount {
            font-weight: bold;
            color: #0A2647;
        }
        
        .status {
            font-weight: bold;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .status.paid {
            background: #d4edda;
            color: #155724;
        }
        
        .status.partial {
            background: #fff3cd;
            color: #856404;
        }
        
        .status.pending {
            background: #f8d7da;
            color: #721c24;
        }
        
        .amount.remaining {
            color: #dc3545;
            font-weight: bold;
        }
        
        
        .receipt-footer {
            border-top: 2px solid #ddd;
            padding-top: 20px;
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        
        .date-info p {
            margin: 5px 0;
            font-size: 14px;
        }
        
        .footer-note {
            text-align: center;
        }
        
        .footer-note p {
            margin: 5px 0;
        }
        
        .generated-note {
            font-size: 12px;
            color: #666;
            font-style: italic;
        }
    `;
  }

}