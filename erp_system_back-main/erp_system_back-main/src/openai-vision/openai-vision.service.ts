import { Injectable, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DeveloperSettingsService } from '../developer-settings/developer-settings.service';

/**
 * خدمة Google Gemini Vision
 * للتعرف الذكي على أوراق الإجابة OMR
 * باستخدام نموذج gemini-3-flash-preview
 */

export interface OMRAnalysisResult {
  questionNumber: number;
  selectedSymbol: string;
  confidence: number;
  reasoning?: string;
}

@Injectable()
export class OpenAIVisionService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(private developerSettingsService: DeveloperSettingsService) {
    // لا نستدعي initializeClient هنا لأن constructor لا يمكن أن يكون async
  }

  private async initializeClient() {
    try {
      // جلب GEMINI_API_KEY من قاعدة البيانات بدلاً من .env
      let apiKey: string | undefined;
      
      try {
        apiKey = await this.developerSettingsService.getGeminiApiKey();
        console.log('✓ تم جلب GEMINI_API_KEY من قاعدة البيانات');
      } catch (error) {
        console.warn('⚠️ فشل جلب GEMINI_API_KEY من قاعدة البيانات، محاولة .env...');
        apiKey = process.env.GEMINI_API_KEY;
      }
      
      if (!apiKey) {
        console.warn('⚠️ GEMINI_API_KEY غير موجود في قاعدة البيانات ولا في .env');
        this.isInitialized = false;
        return;
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

      this.isInitialized = true;
      console.log('✓ Google Gemini Vision initialized successfully with gemini-3-flash-preview');
    } catch (error) {
      console.error('❌ Failed to initialize Google Gemini:', error);
      this.isInitialized = false;
    }
  }

  /**
   * التأكد من تهيئة Mistral قبل الاستخدام
   */
  private async ensureInitialized() {
    if (this.isInitialized) {
      return; // مهيأ بالفعل
    }

    // إذا كان هناك تهيئة جارية، انتظرها
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    // بدء تهيئة جديدة
    this.initializationPromise = this.initializeClient();
    await this.initializationPromise;
    this.initializationPromise = null;

    if (!this.isInitialized) {
      throw new BadRequestException('خدمات Vision AI غير متاحة. يرجى تكوين GEMINI_API_KEY في إعدادات المطورين');
    }
  }

  /**
   * تحليل ورقة OMR باستخدام GPT Vision
   */
  async analyzeOMRSheet(
    imageBase64: string,
    numberOfQuestions: number
  ): Promise<OMRAnalysisResult[]> {
    
    // التأكد من التهيئة قبل الاستخدام
    await this.ensureInitialized();

    try {
      console.log(`🤖 بدء تحليل ${numberOfQuestions} سؤال باستخدام Google Gemini...`);
      console.log(`📸 حجم الصورة: ${imageBase64.substring(0, 50)}...`);

      // ═══════════════════════════════════════════════════════════════
      // استخدام Google Gemini Vision - نموذج gemini-3-flash-preview
      // ═══════════════════════════════════════════════════════════════
      console.log('📝 Gemini Vision - استخراج الإجابات...');
      
      // إزالة data URL prefix إذا كان موجوداً
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      
      const prompt = this.buildGeminiOMRPrompt(numberOfQuestions);
      
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg'
          }
        }
      ]);
      
      const response = await result.response;
      const geminiText = response.text();
      console.log('📄 Gemini استخرج:', geminiText.length, 'حرف');
      console.log('📄 نص Gemini:\n', geminiText);
      
      // تحليل JSON من Gemini
      const results = this.parseGeminiJSONResponse(geminiText, numberOfQuestions);
      
      console.log(`✅ Google Gemini: تم التعرف على ${results.length}/${numberOfQuestions} إجابة`);

      return results;

    } catch (error: any) {
      console.error('❌ Google Gemini error:', error);
      throw new BadRequestException(
        'فشل في تحليل الصورة بواسطة Google Gemini: ' + (error.message || 'خطأ غير معروف')
      );
    }
  }

  /**
   * تحليل JSON response من Google Gemini
   */
  private parseGeminiJSONResponse(geminiText: string, numberOfQuestions: number): OMRAnalysisResult[] {
    try {
      console.log('🔍 بدء تحليل JSON من Gemini...');
      
      // استخراج JSON من النص (قد يكون محاط بـ ```json و ```)
      let jsonText = geminiText.trim();
      
      // إزالة markdown code blocks
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '').trim();
      }
      
      // تحليل JSON
      const parsed = JSON.parse(jsonText);
      const answersObj = parsed.answers || {};
      
      console.log('📊 Gemini JSON:', JSON.stringify(answersObj, null, 2));
      
      // تحويل إلى OMRAnalysisResult[]
      const results: OMRAnalysisResult[] = [];
      
      for (let i = 1; i <= numberOfQuestions; i++) {
        const answer = answersObj[i.toString()];
        
        // فقط الإجابات غير null
        if (answer && answer !== null && typeof answer === 'string') {
          results.push({
            questionNumber: i,
            selectedSymbol: answer.toUpperCase().trim(),
            confidence: 0.95
          });
          console.log(`  ✅ السؤال ${i}: ${answer}`);
        }
      }
      
      console.log(`📈 تم استخراج ${results.length}/${numberOfQuestions} إجابة من Gemini`);
      
      return results.sort((a, b) => a.questionNumber - b.questionNumber);
      
    } catch (error) {
      console.error('❌ خطأ في تحليل JSON من Gemini:', error);
      console.error('النص الأصلي:', geminiText);
      return [];
    }
  }

  /**
   * بناء Prompt محسّن لـ Google Gemini
   */
  private buildGeminiOMRPrompt(numberOfQuestions: number): string {
    return `# محلل ورقة إجابة OMR

## وصف الورقة:
- ورقة إجابة اختيار من متعدد عربية
- الاتجاه: من اليمين إلى اليسار
- عدد الأسئلة: ${numberOfQuestions} سؤال

## هيكل الورقة:
- كل صف يحتوي على 3 أسئلة
- ترتيب الأسئلة في الصف: السؤال الأول على اليمين، الثاني في الوسط، الثالث على اليسار
- كل سؤال له: مربع رقم + 4 دوائر (A, B, C, D) أو 2 دوائر (T, F)
- الحروف داخل الدوائر إنجليزية

## كيفية تحديد الإجابة:
1. الدائرة المظللة (الإجابة المختارة):
   - لونها أسود أو رمادي غامق جداً
   - الحرف بداخلها قد يكون مغطى بالتظليل
   - تبدو مختلفة بشكل واضح عن باقي الدوائر

2. الدائرة الفارغة (غير مختارة):
   - لونها أبيض أو فاتح
   - الحرف بداخلها واضح ومقروء
   - لها إطار فقط بدون تعبئة

## ⚠️ تعليمات مهمة جداً:
- إذا كانت كل الدوائر فاتحة (لا يوجد تظليل) → ضع null
- إذا كان هناك أكثر من دائرة مظللة → ضع null
- إذا كان التظليل خفيف أو غير واضح → ضع null
- لا تخمن أبداً - فقط أبلغ عن الإجابات الواضحة 100%
- الأسئلة غير المجاب عليها يجب أن تكون null

## صيغة الإخراج (JSON فقط):
{
  "answers": {
    "1": "A",
    "2": null,
    "3": "C",
    ...
    "${numberOfQuestions}": null
  }
}

## ملاحظات:
- أعد كل الأسئلة من 1 إلى ${numberOfQuestions}
- الحروف المقبولة: A, B, C, D, T, F (حروف كبيرة)
- null = لا يوجد إجابة واضحة

حلل الصورة الآن.`;
  }

  /**
   * تحليل استجابة Gemini واستخراج النتائج
   */
  private parseOMRResponse(content: string, numberOfQuestions: number): OMRAnalysisResult[] {
    try {
      console.log('📥 معالجة استجابة Google Gemini...');
      
      let parsed: any;
      
      try {
        parsed = JSON.parse(content);
        console.log('✓ تحليل JSON نجح');
      } catch (e) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          console.warn('❌ لم يتم العثور على JSON');
          return [];
        }
      }

      // عرض النتيجة الكاملة في Console
      console.log('\n' + '='.repeat(60));
      console.log('📊 النتيجة الكاملة من Google Gemini:');
      console.log('='.repeat(60));
      console.log(JSON.stringify(parsed, null, 2));
      console.log('='.repeat(60) + '\n');
      
      const answersObj = parsed.answers || {};
      const results: OMRAnalysisResult[] = [];
      
      // تحويل من Object إلى Array
      for (let i = 1; i <= numberOfQuestions; i++) {
        const answer = answersObj[i.toString()];
        if (answer && answer !== null) {
          results.push({
            questionNumber: i,
            selectedSymbol: answer.toUpperCase().trim(),
            confidence: 0.95
          });
        }
      }

      console.log(`✅ تم استخراج ${results.length}/${numberOfQuestions} إجابة`);
      
      return results;

    } catch (error) {
      console.error('❌ خطأ في تحليل الاستجابة:', error);
      return [];
    }
  }

  /**
   * التحقق من حالة الخدمة
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * محادثة مع Vision AI
   */
  async chatWithVisionAI(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<string> {
    
    if (!this.isInitialized) {
      throw new BadRequestException('Google Gemini Vision غير مهيأ. تحقق من GEMINI_API_KEY في .env');
    }

    try {
      console.log(`💬 بدء محادثة مع Google Gemini...`);

      // بناء تعليمات النظام
      const systemPrompt = `أنت Vision AI، مساعد ذكي متخصص لمراجع التدريب في نظام إدارة التدريب.

معلومات هامة عنك:
- اسمك: Vision AI
- تم تطويرك بواسطة: شركة كوديكس (Codex)
- دورك: مساعدة مراجع التدريب في جميع استفساراتهم المتعلقة بالتدريب والاختبارات والمتدربين

قواعد صارمة يجب اتباعها:
1. لا تذكر أي معلومات عن النموذج التقني الذي تعمل به (مثل GPT أو OpenAI)
2. لا تنشئ صوراً أو ملفات (PDF, Excel, Word, إلخ)
3. إذا طُلب منك إنشاء صور أو ملفات، أخبر المستخدم أنك متخصص في المحادثة والاستشارات فقط
4. ركز على تقديم المساعدة في مجال التدريب والتعليم
5. كن محترفاً، ودوداً، ومفيداً في جميع إجاباتك
6. استخدم اللغة العربية الفصحى مع لمسة من البساطة
7. إذا لم تكن متأكداً من إجابة، اعترف بذلك بصراحة

مجالات تخصصك:
- إدارة الاختبارات والتقييمات
- متابعة أداء المتدربين
- نصائح حول التدريب الفعال
- حل المشكلات الإدارية في التدريب
- الإجابة على الاستفسارات العامة

تذكر دائماً:
- أنت Vision AI من شركة كوديكس
- أنت هنا لمساعدة مراجع التدريب
- كن موجزاً وواضحاً في إجاباتك
- لا تذكر تفاصيل تقنية عن كيفية عملك`;

      // بناء الرسائل
      const messages: any[] = [
        { role: 'system', content: systemPrompt }
      ];

      // إضافة سجل المحادثة السابق (آخر 10 رسائل فقط)
      const recentHistory = conversationHistory.slice(-10);
      messages.push(...recentHistory);

      // إضافة الرسالة الحالية
      messages.push({ role: 'user', content: message });

      // إرسال الطلب باستخدام Gemini
      const chat = this.model.startChat({
        history: messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      const reply = response.text() || 'عذراً، لم أتمكن من معالجة طلبك. حاول مرة أخرى.';

      console.log(`✅ Google Gemini: تم إنشاء رد بطول ${reply.length} حرف`);

      return reply;

    } catch (error: any) {
      console.error('❌ Google Gemini Chat error:', error);
      throw new BadRequestException(
        'فشل في معالجة المحادثة: ' + (error.message || 'خطأ غير معروف')
      );
    }
  }

  /**
   * استخراج أسئلة من نص (نموذج منفصل - لا يؤثر على التصحيح أو المحادثة)
   */
  async extractQuestionsFromText(
    textContent: string,
    questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'BOTH'
  ): Promise<any[]> {
    
    if (!this.isInitialized) {
      throw new BadRequestException('Google Gemini غير مهيأ. تحقق من GEMINI_API_KEY في .env');
    }

    try {
      console.log(`📄 بدء استخراج أسئلة من النص... نوع: ${questionType}`);
      console.log(`📊 طول النص: ${textContent.length} حرف`);

      // Prompt متخصص لاستخراج الأسئلة (نموذج منفصل تماماً)
      const systemPrompt = `أنت خبير متخصص في استخراج وتحليل الأسئلة التعليمية من النصوص.

مهمتك: استخراج أسئلة منظمة ومنسقة من النص التعليمي المقدم.

نوع الأسئلة المطلوب:
${questionType === 'MULTIPLE_CHOICE' ? '- اختيار من متعدد فقط (4 خيارات)' :
  questionType === 'TRUE_FALSE' ? '- صح/خطأ فقط (خياران: صح، خطأ)' :
  '- جميع الأنواع (اختيار من متعدد + صح/خطأ)'}

قواعد صارمة:
1. استخرج فقط الأسئلة الموجودة فعلاً في النص
2. كل سؤال يجب أن يكون واضحاً ومفهوماً
3. اختيار من متعدد: 4 خيارات بالضبط
4. صح/خطأ: خياران فقط (صح، خطأ)
5. حدد الإجابة الصحيحة لكل سؤال
6. لا تخترع أسئلة غير موجودة

تنسيق JSON المطلوب فقط:
{
  "questions": [
    {
      "text": "نص السؤال كما هو في المستند",
      "type": "MULTIPLE_CHOICE" أو "TRUE_FALSE",
      "options": [
        { "text": "نص الخيار", "isCorrect": true },
        { "text": "نص الخيار", "isCorrect": false }
      ]
    }
  ]
}

مهم جداً:
- إجابة صحيحة واحدة فقط لكل سؤال
- استخرج الأسئلة الواضحة والمفيدة فقط
- إذا لم تجد أسئلة، أرجع array فارغ`;

      // استخدام Gemini لاستخراج الأسئلة
      const prompt = `${systemPrompt}\n\nالنص التعليمي:\n\n${textContent}\n\nاستخرج جميع الأسئلة بتنسيق JSON المطلوب.`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      
      console.log('📝 طول استجابة Google Gemini:', content.length, 'حرف');

      const parsed = JSON.parse(content);
      const questions = parsed.questions || [];

      console.log(`✅ تم استخراج ${questions.length} سؤال من النص`);

      return questions;

    } catch (error: any) {
      console.error('❌ خطأ في استخراج الأسئلة:', error);
      throw new BadRequestException(
        'فشل في استخراج الأسئلة: ' + (error.message || 'خطأ غير معروف')
      );
    }
  }

  /**
   * استخراج الرقم القومي من صورة OMR
   */
  async extractNationalIdFromImage(imageBase64: string): Promise<string | null> {
    await this.ensureInitialized();

    try {
      console.log('🔍 بدء استخراج الرقم القومي من الصورة...');
      
      // إزالة data URL prefix
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      
      const prompt = `أنت محلل ذكي لأوراق الإجابة OMR.

مهمتك: استخراج الرقم القومي (National ID) من صورة ورقة الإجابة.

الرقم القومي عادة:
- 14 رقم
- موجود في أعلى أو أسفل الورقة
- قد يكون مكتوباً بخط اليد أو مطبوعاً
- قد يكون بجانب عبارة "الرقم القومي" أو "National ID"

إذا وجدت الرقم القومي، أرجعه فقط كـ JSON:
{
  "nationalId": "12345678901234"
}

إذا لم تجد الرقم القومي، أرجع:
{
  "nationalId": null
}

مهم: أرجع JSON فقط، بدون أي نص إضافي.`;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg'
          }
        }
      ]);

      const response = await result.response;
      let responseText = response.text().trim();
      
      // إزالة markdown code blocks
      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
      } else if (responseText.startsWith('```')) {
        responseText = responseText.replace(/```\n?/g, '').trim();
      }

      const parsed = JSON.parse(responseText);
      const nationalId = parsed.nationalId;

      if (nationalId) {
        console.log(`✅ تم استخراج الرقم القومي: ${nationalId}`);
      } else {
        console.log('⚠️ لم يتم العثور على رقم قومي في الصورة');
      }

      return nationalId;

    } catch (error: any) {
      console.error('❌ خطأ في استخراج الرقم القومي:', error);
      return null;
    }
  }

  /**
   * تحليل ورقة OMR كامل: استخراج الرقم القومي والإجابات في طلب واحد
   */
  async analyzeOMRWithNationalId(
    imageBase64: string,
    numberOfQuestions: number
  ): Promise<{ nationalId: string | null; answers: OMRAnalysisResult[] }> {
    await this.ensureInitialized();

    try {
      console.log(`🎯 بدء التحليل الكامل: استخراج الرقم القومي + ${numberOfQuestions} سؤال...`);
      
      // إزالة data URL prefix
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      
      const prompt = `أنت محلل ذكي متقدم لأوراق الإجابة OMR.

# مهمتك المزدوجة:
1. استخراج الرقم القومي من الورقة
2. تحليل الإجابات المظللة

## جزء 1: الرقم القومي
- 14 رقم عادة
- موجود في أعلى أو أسفل الورقة
- قد يكون مكتوباً بخط اليد أو مطبوعاً

## جزء 2: تحليل OMR
- ورقة إجابة اختيار من متعدد عربية
- عدد الأسئلة: ${numberOfQuestions}
- كل سؤال له دوائر (A, B, C, D) أو (T, F)
- ابحث عن الدوائر المظللة بالأسود/الرمادي الغامق

## ⚠️ قواعد مهمة:
- إذا لم تجد إجابة واضحة → ضع null
- إذا كان هناك أكثر من دائرة مظللة → ضع null
- لا تخمن أبداً

## صيغة الإخراج (JSON فقط):
{
  "nationalId": "12345678901234" أو null,
  "answers": {
    "1": "A",
    "2": null,
    "3": "C",
    ...
    "${numberOfQuestions}": "B"
  }
}

مهم: أرجع JSON فقط، بدون markdown blocks أو نص إضافي.`;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg'
          }
        }
      ]);

      const response = await result.response;
      let responseText = response.text().trim();
      
      console.log('📄 Gemini استخرج:', responseText.length, 'حرف');
      
      // إزالة markdown code blocks
      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
      } else if (responseText.startsWith('```')) {
        responseText = responseText.replace(/```\n?/g, '').trim();
      }

      const parsed = JSON.parse(responseText);
      const nationalId = parsed.nationalId;
      const answersObj = parsed.answers || {};

      console.log('📊 النتائج:');
      console.log(`  - الرقم القومي: ${nationalId || 'غير موجود'}`);
      console.log(`  - الإجابات: ${Object.keys(answersObj).length} سؤال`);

      // تحويل الإجابات إلى OMRAnalysisResult[]
      const answers: OMRAnalysisResult[] = [];
      for (let i = 1; i <= numberOfQuestions; i++) {
        const answer = answersObj[i.toString()];
        if (answer && answer !== null && typeof answer === 'string') {
          answers.push({
            questionNumber: i,
            selectedSymbol: answer.toUpperCase().trim(),
            confidence: 0.95
          });
        }
      }

      console.log(`✅ تم التعرف على ${answers.length}/${numberOfQuestions} إجابة`);

      return {
        nationalId: nationalId || null,
        answers: answers.sort((a, b) => a.questionNumber - b.questionNumber)
      };

    } catch (error: any) {
      console.error('❌ خطأ في التحليل الكامل:', error);
      throw new BadRequestException(
        'فشل في تحليل الصورة: ' + (error.message || 'خطأ غير معروف')
      );
    }
  }
}