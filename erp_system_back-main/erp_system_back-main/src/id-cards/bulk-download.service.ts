import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IdCardDesignsService } from '../id-card-designs/id-card-designs.service';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as QRCode from 'qrcode';
import * as https from 'https';
import * as http from 'http';

interface BulkDownloadDto {
  traineeIds?: number[];
  programId?: number;
  downloadAll?: boolean;
}

interface TraineeWithDesign {
  id: number;
  nameAr: string;
  nationalId: string;
  photoUrl?: string;
  program: {
    nameAr: string;
  };
  design: any; // تصميم الكارنيه
  qrCodeDataUrl?: string;
}

@Injectable()
export class BulkDownloadService {
  constructor(
    private prisma: PrismaService,
    private idCardDesignsService: IdCardDesignsService,
  ) {}

  async generateBulkPDF(dto: BulkDownloadDto) {
    console.log('بدء إنشاء PDF جماعي...');

    // جلب المتدربين حسب المعايير
    const trainees = await this.getTraineesForDownload(dto);
    
    if (trainees.length === 0) {
      throw new HttpException('لا توجد كارنيهات للتحميل', HttpStatus.NOT_FOUND);
    }

    console.log(`تم العثور على ${trainees.length} متدرب`);

    // إنشاء PDF مباشرة من صفحة الطباعة الجماعية
    const { filePath, fileName } = await this.createPDFFromPrintPage(trainees);

    return {
      filePath,
      fileName,
      totalCards: trainees.length,
    };
  }

  private async getTraineesForDownload(dto: BulkDownloadDto): Promise<TraineeWithDesign[]> {
    let whereCondition: any = {};

    if (dto.traineeIds && dto.traineeIds.length > 0) {
      whereCondition.id = { in: dto.traineeIds };
    } else if (dto.programId) {
      whereCondition.programId = dto.programId;
    } else if (!dto.downloadAll) {
      throw new HttpException('معايير التحديد غير صحيحة', HttpStatus.BAD_REQUEST);
    }

    // جلب المتدربين
    const trainees = await this.prisma.trainee.findMany({
      where: whereCondition,
      include: {
        program: {
          select: { nameAr: true }
        }
      },
      orderBy: [
        { program: { nameAr: 'asc' } },
        { nameAr: 'asc' }
      ]
    });

    // جلب التصميم المناسب لكل متدرب وإنشاء QR Code
    const traineesWithDesigns: TraineeWithDesign[] = [];

    for (const trainee of trainees) {
      try {
        // جلب التصميم المناسب
        const design = await this.idCardDesignsService.getDesignForTrainee(trainee.id);
        
        // إنشاء QR Code إذا كان هناك رقم قومي
        let qrCodeDataUrl: string | undefined;
        if (trainee.nationalId) {
          qrCodeDataUrl = await QRCode.toDataURL(trainee.nationalId, {
            width: 200,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
          });
        }

        traineesWithDesigns.push({
          ...trainee,
          design,
          qrCodeDataUrl,
        });

      } catch (error) {
        console.warn(`تعذر جلب تصميم للمتدرب ${trainee.nameAr}:`, error.message);
        // استخدام التصميم الافتراضي
        const defaultDesign = await this.idCardDesignsService.findDefault();
        traineesWithDesigns.push({
          ...trainee,
          design: defaultDesign,
        });
      }
    }

    return traineesWithDesigns;
  }

  private async generateHTML(trainees: TraineeWithDesign[], centerSettings: any): Promise<string> {
    const cardsHTML = [];

    for (const trainee of trainees) {
      const cardHTML = await this.generateSingleCardHTML(trainee, centerSettings);
      cardsHTML.push(`
        <div class="page">
          <div class="card-container">
            ${cardHTML}
          </div>
        </div>
      `);
    }

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>كارنيهات المتدربين</title>
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            background: white;
          }
          
          .page {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
          }
          
          .page:last-child {
            page-break-after: avoid;
          }
          
          .card-container {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .id-card {
            position: relative;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          }
          
          .id-card img {
            max-width: 100%;
            max-height: 100%;
            object-fit: cover;
          }
          
          /* أشكال الصور */
          .image-shape-circle {
            border-radius: 50% !important;
            overflow: hidden !important;
          }
          
          .image-shape-rounded {
            overflow: hidden !important;
          }
          
          .image-shape-square {
            border-radius: 0 !important;
          }
          
          /* إخفاء عناصر غير مرغوب فيها */
          .no-print {
            display: none !important;
          }
          
          /* ضمان positioning صحيح */
          .id-card {
            position: relative !important;
            overflow: hidden !important;
          }
          
          .id-card > div {
            position: absolute !important;
          }
        </style>
      </head>
      <body>
        ${cardsHTML.join('')}
      </body>
      </html>
    `;
  }

  private async generateSingleCardHTML(trainee: TraineeWithDesign, centerSettings: any): Promise<string> {
    const design = trainee.design;
    const elements = design.designData.elements || [];

    // حساب scale للحصول على مواضع صحيحة (نفس المنطق المستخدم في IdCardPreview)
    // نستخدم نفس دالة calculateCreditCardScale المستخدمة في الطباعة
    const STANDARD_ID_CARD_WIDTH = 323; // الأبعاد القياسية للكريديت كارد
    const scale = design.width === STANDARD_ID_CARD_WIDTH ? 1.0 : STANDARD_ID_CARD_WIDTH / design.width;
    
    console.log(`حساب Scale: عرض التصميم=${design.width}px, Scale المحسوب=${scale}`);

    // تحويل الصور إلى base64
    console.log(`معالجة كارنيه ${trainee.nameAr}...`);
    console.log(`صورة المتدرب: ${trainee.photoUrl ? 'موجودة' : 'غير موجودة'}`);
    console.log(`شعار المركز: ${centerSettings?.centerLogo ? 'موجود' : 'غير موجود'}`);
    console.log(`خلفية التصميم: ${design.backgroundImage ? 'موجودة' : 'غير موجودة'}`);
    
    const traineePhotoBase64 = trainee.photoUrl ? await this.convertImageToBase64(trainee.photoUrl) : null;
    const centerLogoBase64 = centerSettings?.centerLogo ? await this.convertImageToBase64(centerSettings.centerLogo) : null;
    const backgroundImageBase64 = design.backgroundImage ? await this.convertImageToBase64(design.backgroundImage) : null;

    console.log(`تحويل صورة المتدرب: ${traineePhotoBase64 ? 'نجح' : 'فشل'}`);
    if (!traineePhotoBase64 && trainee.photoUrl) {
      console.warn(`فشل تحويل صورة المتدرب: ${trainee.photoUrl}`);
    }
    
    console.log(`تحويل شعار المركز: ${centerLogoBase64 ? 'نجح' : 'فشل'}`);
    if (!centerLogoBase64 && centerSettings?.centerLogo) {
      console.warn(`فشل تحويل شعار المركز: ${centerSettings.centerLogo}`);
    }
    
    console.log(`تحويل خلفية التصميم: ${backgroundImageBase64 ? 'نجح' : 'فشل'}`);
    if (!backgroundImageBase64 && design.backgroundImage) {
      console.warn(`فشل تحويل خلفية التصميم: ${design.backgroundImage}`);
    }

    // إنشاء HTML للعناصر
    console.log(`عدد العناصر في التصميم: ${elements.length}`);
    elements.forEach((element, index) => {
      console.log(`العنصر ${index + 1}: نوع=${element.type}, id=${element.id}, content=${element.content}, dataSource=${element.data?.dataSource}`);
    });

    const elementsHTML = await Promise.all(elements.map(async (element, index) => {
      const style = `
        position: absolute;
        left: ${element.position.x * scale}px;
        top: ${element.position.y * scale}px;
        width: ${element.size.width * scale}px;
        height: ${element.size.height * scale}px;
        z-index: ${element.zIndex || 1};
        ${element.style?.color ? `color: ${element.style.color};` : ''}
        ${element.style?.fontSize ? `font-size: ${element.style.fontSize * scale}px;` : ''}
        ${element.style?.fontWeight ? `font-weight: ${element.style.fontWeight};` : ''}
        ${element.style?.textAlign ? `text-align: ${element.style.textAlign};` : ''}
        ${element.border?.enabled ? `border: ${element.border.width * scale}px ${element.border.style} ${element.border.color};` : ''}
        ${element.style?.padding ? `padding: ${element.style.padding * scale}px;` : ''}
        ${element.style?.borderRadius ? `border-radius: ${element.style.borderRadius * scale}px;` : ''}
      `;

      // إضافة شكل الصورة
      let shapeStyles = '';
      let shapeClass = '';
      if (element.imageShape) {
        shapeClass = `image-shape-${element.imageShape.type}`;
        if (element.imageShape.type === 'rounded') {
          shapeStyles = `border-radius: ${(element.imageShape.borderRadius || 10) * scale}px; overflow: hidden;`;
        } else if (element.imageShape.type === 'circle') {
          shapeStyles = 'border-radius: 50%; overflow: hidden;';
        }
      }

      switch (element.type) {
        case 'text':
          let content = element.content || '';
          console.log(`معالجة عنصر نص: id=${element.id}, content="${element.content}"`);
          
          // استبدال البيانات الديناميكية - فحص أولوية للـ ID ثم المحتوى
          if (element.id === 'name') {
            content = trainee.nameAr;
            console.log(`استبدال اسم المتدرب (بـ ID): ${content}`);
          } else if (element.id === 'nationalId') {
            content = trainee.nationalId || '';
            console.log(`استبدال الرقم القومي (بـ ID): ${content}`);
          } else if (element.id === 'program') {
            content = trainee.program?.nameAr || '';
            console.log(`استبدال البرنامج (بـ ID): ${content}`);
          } else if (element.id === 'traineeId') {
            content = trainee.id.toString();
            console.log(`استبدال رقم المتدرب (بـ ID): ${content} (ID الفعلي: ${trainee.id})`);
          } else if (element.id === 'centerName') {
            content = centerSettings?.centerName || '';
            console.log(`استبدال اسم المركز (بـ ID): ${content}`);
          } 
          // فحص المحتوى كـ fallback
          else if (element.content?.includes('اسم المتدرب') || element.content === 'اسم المتدرب') {
            content = trainee.nameAr;
            console.log(`استبدال اسم المتدرب (بالمحتوى): ${content}`);
          } else if (element.content?.includes('الرقم القومي') || element.content === 'الرقم القومي') {
            content = trainee.nationalId || '';
            console.log(`استبدال الرقم القومي (بالمحتوى): ${content}`);
          } else if (element.content?.includes('البرنامج') || element.content === 'البرنامج') {
            content = trainee.program?.nameAr || '';
            console.log(`استبدال البرنامج (بالمحتوى): ${content}`);
          } else if (element.content?.includes('رقم المتدرب') || element.content === 'رقم المتدرب') {
            content = trainee.id.toString();
            console.log(`استبدال رقم المتدرب (بالمحتوى): ${content} (ID الفعلي: ${trainee.id})`);
          } else if (element.content?.includes('اسم المركز') || element.content === 'اسم المركز') {
            content = centerSettings?.centerName || '';
            console.log(`استبدال اسم المركز (بالمحتوى): ${content}`);
          } else {
            console.log(`لم يتم استبدال النص، سيبقى كما هو: "${content}"`);
          }

          return `<div style="${style}">${content}</div>`;

        case 'image':
          console.log(`معالجة عنصر صورة: id=${element.id}, content=${element.content}, dataSource=${element.data?.dataSource}`);
          
          // صورة المتدرب - تحقق من عدة شروط
          const isTraineePhoto = (
            element.id === 'photo' || 
            element.content === 'trainee-photo' || 
            element.data?.dataSource === 'trainee-photo' ||
            (!element.content && !element.data?.imageUrl) // عنصر صورة فارغ = صورة متدرب
          );
          
          if (isTraineePhoto) {
            console.log(`تم التعرف على عنصر صورة المتدرب`);
            const imageSource = traineePhotoBase64 || trainee.photoUrl;
            console.log(`مصدر الصورة: ${imageSource ? 'موجود' : 'غير موجود'}`);
            
            if (imageSource) {
              const htmlResult = `<div style="${style} ${shapeStyles}" class="${shapeClass}">
                <img src="${imageSource}" alt="صورة المتدرب" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.parentNode.innerHTML='<div style=\\'display: flex; align-items: center; justify-content: center; background: #f3f4f6; color: #6b7280; font-size: 12px; text-align: center;\\'>صورة غير متاحة</div>'" />
              </div>`;
              console.log(`HTML صورة المتدرب تم إنشاؤه بنجاح`);
              return htmlResult;
            } else {
              console.log(`لا توجد صورة للمتدرب، سيتم إنشاء placeholder`);
              // placeholder إذا لم تكن هناك صورة
              return `<div style="${style} ${shapeStyles} display: flex; align-items: center; justify-content: center; background: #f3f4f6; color: #6b7280; font-size: 12px; text-align: center;" class="${shapeClass}">
                صورة غير متاحة
              </div>`;
            }
          } else {
            console.log(`عنصر صورة لكن ليس صورة متدرب`);
          }
          break;

        case 'logo':
          console.log(`معالجة عنصر شعار: id=${element.id}, content=${element.content}, dataSource=${element.data?.dataSource}`);
          
          // شعار المركز - تحقق من عدة شروط
          const isCenterLogo = (
            element.id === 'logo' || 
            element.content === 'center-logo' || 
            element.data?.dataSource === 'center-logo' ||
            element.type === 'logo' // أي عنصر من نوع logo
          );
          
          if (isCenterLogo) {
            const logoSource = centerLogoBase64 || centerSettings?.centerLogo;
            if (logoSource) {
              return `<div style="${style} ${shapeStyles}" class="${shapeClass}">
                <img src="${logoSource}" alt="شعار المركز" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.style.display='none'; this.parentNode.innerHTML='<div style=\\'display: flex; align-items: center; justify-content: center; background: #f3f4f6; color: #6b7280; font-size: 12px; text-align: center;\\'>شعار غير متاح</div>'" />
              </div>`;
            } else {
              // placeholder إذا لم يكن هناك شعار
              return `<div style="${style} ${shapeStyles} display: flex; align-items: center; justify-content: center; background: #f3f4f6; color: #6b7280; font-size: 12px; text-align: center;" class="${shapeClass}">
                شعار غير متاح
              </div>`;
            }
          }
          break;

        case 'qr':
          if (trainee.qrCodeDataUrl) {
            return `<div style="${style}">
              <img src="${trainee.qrCodeDataUrl}" alt="QR Code" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>`;
          }
          break;

        default:
          console.log(`نوع عنصر غير معروف: ${element.type}`);
          return '';
      }

      console.log(`العنصر ${index + 1} لم يتم معالجته (لا يطابق أي شرط)`);
      return '';
    }));

    // تصفية العناصر الفارغة
    const filteredElementsHTML = elementsHTML.filter(html => html);
    console.log(`تم إنشاء ${filteredElementsHTML.length} عنصر HTML من أصل ${elements.length} عنصر`);
    
    const finalHTML = filteredElementsHTML.join('');

    // خلفية الكارنيه
    const backgroundStyle = backgroundImageBase64 || design.backgroundImage
      ? `background-image: url('${backgroundImageBase64 || design.backgroundImage}'); background-size: cover; background-position: center;`
      : `background-color: ${design.backgroundColor || '#ffffff'};`;

    const cardHTML = `
      <div class="id-card" style="width: ${design.width * scale}px; height: ${design.height * scale}px; ${backgroundStyle}; position: relative; overflow: hidden;">
        ${finalHTML}
      </div>
    `;
    
    console.log(`HTML النهائي للكارنيه تم إنشاؤه، طول HTML: ${cardHTML.length} حرف`);
    
    return cardHTML;
  }

  private async createPDFFromPrintPage(trainees: TraineeWithDesign[]): Promise<{ filePath: string; fileName: string }> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    try {
      const page = await browser.newPage();
      
      // تعيين viewport مناسب
      await page.setViewport({ width: 1200, height: 800 });
      
      // إنشاء URL للطباعة الجماعية مع معرفات المتدربين
      const traineeIds = trainees.map(t => t.id).join(',');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const printUrl = `${frontendUrl}/print/id-cards/bulk?traineeIds=${traineeIds}`;
      
      console.log(`فتح صفحة الطباعة: ${printUrl}`);
      
      // فتح صفحة الطباعة الفعلية
      await page.goto(printUrl, { 
        waitUntil: 'networkidle0',
        timeout: 60000
      });

      // انتظار تحميل جميع الكارنيهات
      console.log('انتظار تحميل جميع الكارنيهات...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // إنشاء اسم الملف
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `كارنيهات-المتدربين-${trainees.length}-${timestamp}.pdf`;
      
      // مجلد التحميلات المؤقت
      const tempDir = path.join(process.cwd(), 'temp-downloads');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const filePath = path.join(tempDir, fileName);

      // إنشاء PDF من الصفحة الفعلية
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      });

      console.log(`تم إنشاء PDF من الصفحة الفعلية: ${filePath}`);
      return { filePath, fileName };

    } finally {
      await browser.close();
    }
  }

  private async createPDF(htmlContent: string, totalCards: number): Promise<{ filePath: string; fileName: string }> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    try {
      const page = await browser.newPage();
      
      // تعيين viewport أكبر
      await page.setViewport({ width: 1200, height: 800 });
      
      // بدلاً من تحميل HTML مخصص، نفتح صفحة الطباعة الفعلية
      console.log('فتح صفحة الطباعة الجماعية الفعلية...');
      
      // تعيين المحتوى
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 60000
      });

      // انتظار إضافي للتأكد من تحميل جميع الصور
      console.log('انتظار تحميل الصور...');
      
      // انتظار تحميل جميع الصور
      await page.evaluate(() => {
        return Promise.all(Array.from(document.images, img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', reject);
            setTimeout(reject, 10000); // timeout بعد 10 ثوان
          });
        }));
      }).catch(() => {
        console.warn('بعض الصور لم تحمل في الوقت المحدد');
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      // إنشاء اسم الملف
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `كارنيهات-المتدربين-${totalCards}-${timestamp}.pdf`;
      
      // مجلد التحميلات المؤقت
      const tempDir = path.join(process.cwd(), 'temp-downloads');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const filePath = path.join(tempDir, fileName);

      // إنشاء PDF
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      });

      console.log(`تم إنشاء PDF: ${filePath}`);
      return { filePath, fileName };

    } finally {
      await browser.close();
    }
  }

  async cleanupFile(filePath: string): Promise<void> {
    try {
      // انتظار قصير للتأكد من انتهاء التحميل
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`تم حذف الملف: ${filePath}`);
        }
      }, 60000); // 60 ثانية (دقيقة واحدة)
    } catch (error) {
      console.error('خطأ في حذف الملف:', error);
    }
  }

  // تنظيف الملفات القديمة (يتم استدعاؤها دورياً)
  async cleanupOldFiles(): Promise<void> {
    try {
      const tempDir = path.join(process.cwd(), 'temp-downloads');
      if (!fs.existsSync(tempDir)) return;

      const files = fs.readdirSync(tempDir);
      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // ساعة واحدة

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`تم حذف ملف قديم: ${file}`);
        }
      }
    } catch (error) {
      console.error('خطأ في تنظيف الملفات القديمة:', error);
    }
  }

  // تحويل الصور إلى base64 لضمان ظهورها في PDF
  private async convertImageToBase64(imageUrl: string): Promise<string | null> {
    try {
      if (!imageUrl) return null;

      // إذا كانت الصورة محلية
      if (imageUrl.startsWith('/') || imageUrl.startsWith('./') || imageUrl.startsWith('uploads/')) {
        // تجربة مسارات مختلفة للصور المحلية
        const possiblePaths = [
          path.join(process.cwd(), 'uploads', imageUrl.replace(/^\/+/, '')),
          path.join(process.cwd(), imageUrl.replace(/^\/+/, '')),
          path.join(process.cwd(), '..', 'uploads', imageUrl.replace(/^\/+/, '')),
        ];

        for (const localPath of possiblePaths) {
          if (fs.existsSync(localPath)) {
            console.log(`تم العثور على الصورة في: ${localPath}`);
            const imageBuffer = fs.readFileSync(localPath);
            const mimeType = this.getMimeType(localPath);
            return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
          }
        }
        
        console.warn(`لم يتم العثور على الصورة المحلية: ${imageUrl}`);
        console.warn(`المسارات المجربة:`, possiblePaths);
      }

      // إذا كانت الصورة خارجية
      if (imageUrl.startsWith('http')) {
        return new Promise((resolve) => {
          const client = imageUrl.startsWith('https') ? https : http;
          
          client.get(imageUrl, (response) => {
            if (response.statusCode !== 200) {
              console.warn(`فشل تحميل الصورة: ${imageUrl} - Status: ${response.statusCode}`);
              resolve(null);
              return;
            }

            const chunks: Buffer[] = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
              try {
                const buffer = Buffer.concat(chunks);
                const mimeType = response.headers['content-type'] || 'image/jpeg';
                const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
                resolve(base64);
              } catch (error) {
                console.error(`خطأ في تحويل الصورة: ${imageUrl}`, error);
                resolve(null);
              }
            });
          }).on('error', (error) => {
            console.error(`خطأ في تحميل الصورة: ${imageUrl}`, error);
            resolve(null);
          }).setTimeout(10000, () => {
            console.warn(`انتهت مهلة تحميل الصورة: ${imageUrl}`);
            resolve(null);
          });
        });
      }

      return null;
    } catch (error) {
      console.error(`خطأ في معالجة الصورة: ${imageUrl}`, error);
      return null;
    }
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };
    return mimeTypes[ext] || 'image/jpeg';
  }
}
