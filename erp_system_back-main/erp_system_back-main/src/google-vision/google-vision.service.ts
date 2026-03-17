import { Injectable, BadRequestException } from '@nestjs/common';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as path from 'path';

/**
 * خدمة Google Cloud Vision API
 * للتعرف على الرموز المكتوبة في أوراق الإجابة (OCR)
 * 
 * الطالب يكتب: ص، خ، 1، 2، 3، 4
 * النظام يقرأها تلقائياً باستخدام OCR
 */

export interface DetectedAnswer {
  questionNumber: number;
  symbol: string;
  confidence: number;
  position: { x: number; y: number };
}

@Injectable()
export class GoogleVisionService {
  private client: ImageAnnotatorClient;
  private isInitialized = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      const keyFilePath = process.env.GOOGLE_CLOUD_KEY_FILE;
      
      if (keyFilePath) {
        this.client = new ImageAnnotatorClient({
          keyFilename: path.resolve(keyFilePath),
        });
        this.isInitialized = true;
        console.log('✓ Google Cloud Vision initialized with key file:', keyFilePath);
      } else {
        // محاولة استخدام Application Default Credentials
        this.client = new ImageAnnotatorClient();
        this.isInitialized = true;
        console.log('✓ Google Cloud Vision initialized with default credentials');
      }
    } catch (error) {
      console.error('⚠️ Failed to initialize Google Cloud Vision:', error);
      console.log('سيعمل النظام بدون Google Cloud Vision (تصحيح يدوي فقط)');
      this.isInitialized = false;
    }
  }

  /**
   * تحليل ورقة إجابة والتعرف على الرموز المكتوبة
   */
  async analyzeAnswerSheet(
    imageBase64: string,
    numberOfQuestions: number,
    questionData: Array<{ questionNumber: number; options: any[] }>
  ): Promise<DetectedAnswer[]> {
    
    if (!this.isInitialized) {
      throw new BadRequestException('Google Cloud Vision غير مهيأ. راجع ملف التهيئة.');
    }

    try {
      console.log(`🔍 بدء تحليل ${numberOfQuestions} سؤال...`);
      
      // إزالة البادئة data:image/...
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      
      // 1. التعرف على جميع النصوص في الصورة
      const [result] = await this.client.textDetection({
        image: {
          content: base64Data,
        },
      });

      const detections = result.textAnnotations || [];
      console.log(`📝 تم العثور على ${detections.length} نص`);

      if (detections.length === 0) {
        throw new BadRequestException('لم يتم العثور على أي نص في الصورة');
      }

      // 2. استخراج الإجابات المكتوبة
      const answers = this.extractAnswersFromOCR(detections, numberOfQuestions, questionData);

      console.log(`✅ تم التعرف على ${answers.length}/${numberOfQuestions} إجابة`);

      return answers;

    } catch (error: any) {
      console.error('❌ Google Vision error:', error);
      throw new BadRequestException(
        'فشل في تحليل الصورة: ' + (error.message || 'خطأ غير معروف')
      );
    }
  }

  /**
   * استخراج الإجابات من نتائج OCR
   */
  private extractAnswersFromOCR(
    detections: any[],
    numberOfQuestions: number,
    questionData: Array<{ questionNumber: number; options: any[] }>
  ): DetectedAnswer[] {
    const answers: DetectedAnswer[] = [];

    // تخطي أول detection (يحتوي على كل النص مجمعاً)
    const textBlocks = detections.slice(1);

    // البحث عن الرموز: ص، خ، 1، 2، 3، 4
    const validSymbols = ['ص', 'خ', '1', '2', '3', '4'];
    
    // تنظيم النصوص حسب الموقع العمودي (Y)
    const sortedByY = textBlocks
      .filter(detection => {
        const text = detection.description?.trim() || '';
        return validSymbols.includes(text);
      })
      .sort((a, b) => {
        const aY = a.boundingPoly?.vertices?.[0]?.y || 0;
        const bY = b.boundingPoly?.vertices?.[0]?.y || 0;
        return aY - bY;
      });

    console.log(`🔍 رموز صالحة مكتشفة: ${sortedByY.length}`);

    // ربط كل رمز بسؤال
    sortedByY.slice(0, numberOfQuestions).forEach((detection, index) => {
      const symbol = detection.description?.trim() || '';
      const confidence = detection.confidence || 0.9;
      
      const vertices = detection.boundingPoly?.vertices || [];
      const position = {
        x: vertices[0]?.x || 0,
        y: vertices[0]?.y || 0
      };

      console.log(`سؤال ${index + 1}: "${symbol}" (ثقة: ${(confidence * 100).toFixed(0)}%)`);

      answers.push({
        questionNumber: index + 1,
        symbol,
        confidence,
        position
      });
    });

    return answers;
  }

  /**
   * التعرف على جميع النصوص (للتشخيص)
   */
  async detectAllText(imageBase64: string): Promise<string[]> {
    if (!this.isInitialized) {
      throw new BadRequestException('Google Cloud Vision غير مهيأ');
    }

    try {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      
      const [result] = await this.client.textDetection({
        image: {
          content: base64Data,
        },
      });

      const texts = result.textAnnotations || [];
      return texts.map(text => text.description || '');

    } catch (error: any) {
      console.error('Text detection error:', error);
      throw new BadRequestException('فشل في التعرف على النص');
    }
  }

  /**
   * التحقق من حالة الخدمة
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }
}