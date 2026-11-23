import { Injectable, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { createReadStream } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class PdfQuestionsService {
  private openai: OpenAI;
  private isInitialized = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        console.warn('⚠️ OPENAI_API_KEY not found');
        this.isInitialized = false;
        return;
      }

      this.openai = new OpenAI({ apiKey });
      this.isInitialized = true;
      console.log('✓ PDF Questions Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      this.isInitialized = false;
    }
  }

  async extractQuestionsFromPDF(
    pdfBase64: string,
    questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'BOTH'
  ): Promise<any[]> {
    
    if (!this.isInitialized) {
      throw new BadRequestException('Service غير مهيأ');
    }

    const tempFilePath = join(process.cwd(), `temp-${Date.now()}.pdf`);

    try {
      console.log(`📄 استخراج أسئلة... نوع: ${questionType}`);

      // حفظ PDF مؤقتاً
      const pdfBuffer = Buffer.from(pdfBase64.split(',')[1] || pdfBase64, 'base64');
      await writeFile(tempFilePath, pdfBuffer);
      console.log(`✅ PDF saved: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

      const systemPrompt = `أنت خبير في استخراج وتحليل الأسئلة التعليمية من المستندات.

مهمتك الأساسية:
1. اقرأ PDF المرفق بعناية كاملة
2. ابحث عن جميع الأسئلة الموجودة
3. استخرج ${questionType === 'MULTIPLE_CHOICE' ? 'أسئلة الاختيار من متعدد فقط' : questionType === 'TRUE_FALSE' ? 'أسئلة صح/خطأ فقط' : 'جميع أنواع الأسئلة'}

قواعد الاستخراج:
- ابحث في كل صفحة من PDF
- استخرج السؤال كما هو بالضبط
- استخرج جميع الخيارات
- حدد الإجابة الصحيحة (المشار إليها أو المعلّمة)
- اختيار من متعدد: يجب أن يكون 4 خيارات
- صح/خطأ: يجب أن يكون خياران فقط (صح، خطأ)

تنسيق الإخراج - JSON فقط بدون أي نص إضافي:
{
  "questions": [
    {
      "text": "نص السؤال الكامل",
      "type": "MULTIPLE_CHOICE",
      "options": [
        {"text": "الخيار الأول", "isCorrect": true},
        {"text": "الخيار الثاني", "isCorrect": false},
        {"text": "الخيار الثالث", "isCorrect": false},
        {"text": "الخيار الرابع", "isCorrect": false}
      ]
    }
  ]
}

ملاحظات مهمة:
- إذا وجدت أسئلة، ضعها في array
- إذا لم تجد أسئلة، أرجع {"questions": []}
- لا تكتب نصوص توضيحية - فقط JSON`;

      // رفع
      const file = await this.openai.files.create({
        file: createReadStream(tempFilePath),
        purpose: 'assistants'
      });

      // Assistant
      const assistant = await this.openai.beta.assistants.create({
        model: "gpt-4o",
        tools: [{ type: "file_search" }],
        instructions: systemPrompt
      });

      // Thread
      const thread = await this.openai.beta.threads.create({
        messages: [{
          role: "user",
          content: `اقرأ ملف PDF المرفق بالكامل واستخرج جميع الأسئلة التعليمية الموجودة فيه.

ابحث بعناية في كل صفحة وكل سطر.
استخرج ${questionType === 'MULTIPLE_CHOICE' ? 'أسئلة الاختيار من متعدد' : questionType === 'TRUE_FALSE' ? 'أسئلة صح/خطأ' : 'جميع الأسئلة'} فقط.

أرجع JSON بالتنسيق المطلوب بالضبط - بدون أي نص إضافي أو تعليقات.`,
          attachments: [{ file_id: file.id, tools: [{ type: "file_search" }] }]
        }]
      });

      // Run (بدون response_format لأن Assistant API لا يدعمه في Runs)
      const run = await this.openai.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: assistant.id
      });

      let questions: any[] = [];

      if (run.status === 'completed') {
        const messages = await this.openai.beta.threads.messages.list(thread.id);
        const firstContent = messages.data[0].content[0];
        
        if (firstContent.type === 'text') {
          const text = firstContent.text.value;
          console.log(`📝 AI response (أول 300 حرف): ${text.substring(0, 300)}`);
          
          // محاولة استخراج JSON من النص
          try {
            // محاولة 1: JSON مباشر
            const parsed = JSON.parse(text);
            questions = parsed.questions || [];
          } catch {
            // محاولة 2: JSON داخل markdown
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                             text.match(/```\s*([\s\S]*?)\s*```/) ||
                             text.match(/\{[\s\S]*"questions"[\s\S]*\}/);
            
            if (jsonMatch) {
              const jsonText = jsonMatch[1] || jsonMatch[0];
              const parsed = JSON.parse(jsonText);
              questions = parsed.questions || [];
            } else {
              console.warn('⚠️ لم يتم العثور على JSON في الاستجابة');
              questions = [];
            }
          }
        }
      }

      // تنظيف
      await this.openai.files.delete(file.id);
      await this.openai.beta.assistants.delete(assistant.id);
      await unlink(tempFilePath);

      console.log(`✅ استخرج ${questions.length} سؤال`);
      return questions;

    } catch (error: any) {
      console.error('❌ خطأ:', error);
      try { await unlink(tempFilePath); } catch {}
      throw new BadRequestException('فشل: ' + (error.message || 'خطأ'));
    }
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }
}