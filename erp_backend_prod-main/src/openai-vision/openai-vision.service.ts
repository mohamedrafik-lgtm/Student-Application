import { Injectable, BadRequestException } from '@nestjs/common';
import { DeveloperSettingsService } from '../developer-settings/developer-settings.service';

/**
 * خدمة Vision AI؛ جميع مهام الذكاء الاصطناعي تمر عبر نموذج OpenRouter المعتمد.
 */

export interface OMRAnalysisResult {
  questionNumber: number;
  selectedSymbol: string;
  confidence?: number;
  reasoning?: string;
}

@Injectable()
export class OpenAIVisionService {
  constructor(private developerSettingsService: DeveloperSettingsService) {}

  private toImageDataUrl(imageBase64: string): string {
    if (typeof imageBase64 !== 'string' || imageBase64.length < 100 || imageBase64.length > 20_000_000) {
      throw new BadRequestException('حجم الصورة أو بياناتها غير صالحة');
    }
    if (imageBase64.startsWith('data:')) {
      if (!/^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(imageBase64)) {
        throw new BadRequestException('يجب إرسال صورة بصيغة JPEG أو PNG أو WebP');
      }
      return imageBase64;
    }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
      throw new BadRequestException('ترميز الصورة غير صالح');
    }
    return `data:image/jpeg;base64,${imageBase64}`;
  }

  private validateQuestionCount(numberOfQuestions: number) {
    if (!Number.isInteger(numberOfQuestions) || numberOfQuestions < 1 || numberOfQuestions > 50) {
      throw new BadRequestException('عدد الأسئلة يجب أن يكون من 1 إلى 50');
    }
  }

  private normalizeDigits(value: string): string {
    return value.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  }

  private extractJSON(text: string): any {
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    return JSON.parse(match?.[0] || cleaned);
  }

  private async askOpenRouterAboutImage(prompt: string, imageBase64: string, maxTokens = 4000) {
    return this.developerSettingsService.getOpenRouterCompletion([{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: this.toImageDataUrl(imageBase64) } },
      ],
    }], maxTokens);
  }

  /**
   * تحليل ورقة OMR باستخدام نموذج OpenRouter المعتمد
   */
  async analyzeOMRSheet(
    imageBase64: string,
    numberOfQuestions: number
  ): Promise<OMRAnalysisResult[]> {
    try {
      this.validateQuestionCount(numberOfQuestions);
      console.log(`🤖 بدء تحليل ${numberOfQuestions} سؤال باستخدام OpenRouter...`);
      const modelText = await this.askOpenRouterAboutImage(this.buildOMRPrompt(numberOfQuestions), imageBase64);
      const results = this.parseOMRJSONResponse(modelText, numberOfQuestions);
      console.log(`✅ OpenRouter: تم التعرف على ${results.length}/${numberOfQuestions} إجابة`);
      return results;

    } catch (error: any) {
      console.error('❌ OpenRouter OMR error:', error);
      throw new BadRequestException(
        'فشل في تحليل الصورة بواسطة OpenRouter: ' + (error.message || 'خطأ غير معروف')
      );
    }
  }

  /**
   * تحليل JSON response من OpenRouter
   */
  private parseOMRJSONResponse(responseText: string, numberOfQuestions: number): OMRAnalysisResult[] {
    const parsed = this.extractJSON(responseText);
    const answersObj = parsed.answers || {};
    const results: OMRAnalysisResult[] = [];
    for (let i = 1; i <= numberOfQuestions; i++) {
      const answer = answersObj[String(i)];
      if (typeof answer === 'string' && answer.trim()) {
        results.push({ questionNumber: i, selectedSymbol: answer.toUpperCase().trim() });
      }
    }
    return results;
  }

  /**
   * بناء Prompt مخصص لقراءة أوراق OMR
   */
  private buildOMRPrompt(numberOfQuestions: number): string {
    const answerTemplate = Array.from({ length: numberOfQuestions }, (_, index) =>
      `    "${index + 1}": null`,
    ).join(',\n');
    return `# محلل ورقة إجابة OMR

## وصف الورقة:
- ورقة إجابة عربية على صفحة A4 طولية، واتجاه القراءة موحد من اليمين إلى اليسار.
- بيانات الاختبار والمتدرب في أعلى الصفحة، ومنطقة الإجابات أسفلها.
- عدد الأسئلة المطلوب قراءتها: ${numberOfQuestions} سؤال.

## هيكل الورقة:
- كل صف يحتوي على ثلاثة مربعات أسئلة متساوية؛ اقرأها من اليمين إلى اليسار: الأول يميناً، ثم الأوسط، ثم الأيسر. انتقل بعد ذلك إلى الصف التالي.
- يبدأ ترقيم الأسئلة من أعلى اليمين ويتتابع حتى أسفل الصفحة.
- كل مربع يحتوي رقم السؤال ودوائر الإجابة.
- الاختيار من متعدد: اقرأ الحروف المطبوعة داخل الدوائر من اليمين إلى اليسار؛ قد تتراوح من A إلى F بحسب عدد الخيارات.
- الصح والخطأ: دائرتان بالترتيب من اليمين إلى اليسار T ثم F. إذا كان في السؤال دائرتان A وB فهما اختياران عاديان وليستا T وF.
- الحروف مطبوعة داخل الدوائر؛ طابق الدائرة المظللة مع الحرف المكتوب بداخلها، ولا تستنتج الإجابة من موضع ثابت في الصفحة.

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
${answerTemplate}
  }
}

## ملاحظات:
- أعد كل الأسئلة من 1 إلى ${numberOfQuestions}
- الحروف المقبولة: A, B, C, D, E, F, T (حروف كبيرة)؛ استخدم الحروف الظاهرة فقط في السؤال.
- null = لا يوجد إجابة واضحة
- تجاهل كود الورقة ورمز QR وعلامات ضبط الطباعة؛ ليست إجابات ولا أرقام أسئلة.

حلل الصورة الآن.`;
  }

  /**
   * محادثة مع Vision AI
   */
  async chatWithVisionAI(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<string> {
    try {
      console.log('💬 بدء محادثة Vision AI عبر OpenRouter...');
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

      const messages: any[] = [
        { role: 'system', content: systemPrompt }
      ];

      const recentHistory = conversationHistory
        .filter((item) => ['user', 'assistant'].includes(item.role))
        .slice(-10)
        .map((item) => ({
          role: item.role === 'assistant' ? 'assistant' : 'user',
          content: item.content,
        }));
      messages.push(...recentHistory);
      messages.push({ role: 'user', content: message });

      const reply = await this.developerSettingsService.getOpenRouterCompletion(messages);
      console.log(`✅ OpenRouter: تم إنشاء رد بطول ${reply.length} حرف`);
      return reply;

    } catch (error: any) {
      console.error('❌ OpenRouter Chat error:', error);
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
    try {
      console.log(`📄 بدء استخراج أسئلة من النص... نوع: ${questionType}`);
      console.log(`📊 طول النص: ${textContent.length} حرف`);

      // Prompt متخصص لاستخراج الأسئلة
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

      const prompt = `${systemPrompt}\n\nالنص التعليمي:\n\n${textContent}\n\nاستخرج جميع الأسئلة بتنسيق JSON المطلوب.`;
      const content = await this.developerSettingsService.getOpenRouterCompletion([
        { role: 'user', content: prompt },
      ], 6000);
      console.log('📝 طول استجابة OpenRouter:', content.length, 'حرف');

      const parsed = this.extractJSON(content);
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
    try {
      console.log('🔍 بدء استخراج الرقم القومي من الصورة...');

      const prompt = `أنت محلل ذكي لأوراق الإجابة OMR العربية المصممة باتجاه موحد من اليمين إلى اليسار.

مهمتك: قراءة الحقل المسمى "الرقم القومي" من شريط بيانات المتدرب أعلى الورقة. يوجد بجواره حقل منفصل اسمه "رقم الملف"؛ لا تخلط بينهما ولا تستخرج رقم الملف على أنه رقم قومي.

الرقم القومي عادة:
- 14 رقم
- مطبوع بجانب عبارة "الرقم القومي"
- قد يكون مكتوباً بخط اليد أو مطبوعاً
- قد تستخدم الأرقام العربية أو الإنجليزية

إذا وجدت الرقم القومي، أرجعه فقط كـ JSON:
{
  "nationalId": "12345678901234"
}

إذا لم تجد الرقم القومي، أرجع:
{
  "nationalId": null
}

مهم: أرجع JSON فقط، بدون أي نص إضافي.`;

      const responseText = await this.askOpenRouterAboutImage(prompt, imageBase64, 500);
      const parsed = this.extractJSON(responseText);
      const nationalId = parsed.nationalId;

      if (nationalId) {
        console.log('✅ تم استخراج الرقم القومي');
      } else {
        console.log('⚠️ لم يتم العثور على رقم قومي في الصورة');
      }

      return typeof nationalId === 'string' ? this.normalizeDigits(nationalId).replace(/\D/g, '').slice(0, 14) || null : null;

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
  ): Promise<{ nationalId: string | null; traineeId: number | null; answers: OMRAnalysisResult[] }> {
    try {
      this.validateQuestionCount(numberOfQuestions);
      console.log(`🎯 بدء التحليل الكامل: استخراج الرقم القومي + ${numberOfQuestions} سؤال...`);
      const prompt = `حلل ورقة الإجابة OMR المرفقة وفق تصميمها الفعلي.
${this.buildOMRPrompt(numberOfQuestions)}

اقرأ بيانات الهوية المطبوعة في شريط بيانات المتدرب أعلى الورقة:
- "رقم الملف" هو رقم داخلي قصير للمتدرب، وأعده كعدد صحيح في traineeId.
- "الرقم القومي" هو رقم مستقل من 14 رقماً، وأعده كسلسلة في nationalId.
- لا تخلط بين الرقمين ولا تستنتج أحدهما من الآخر. إذا تعذرت قراءة أي حقل فأعد null لذلك الحقل فقط.
- لا تستخدم الأرقام الموجودة في كود الورقة أو رمز QR بدلاً من رقم الملف أو الرقم القومي.

أعد JSON فقط بالصيغة {"traineeId":1234,"nationalId":"12345678901234","answers":{...}}.`;
      const responseText = await this.askOpenRouterAboutImage(prompt, imageBase64, Math.max(2000, numberOfQuestions * 45));
      console.log('📄 OpenRouter استخرج:', responseText.length, 'حرف');
      const parsed = this.extractJSON(responseText);
      const nationalId = parsed.nationalId;
      const normalizedNationalId = nationalId == null
        ? null
        : this.normalizeDigits(String(nationalId)).replace(/\D/g, '').slice(0, 14) || null;
      const rawTraineeId = parsed.traineeId ?? parsed.fileNumber;
      const traineeIdValue = typeof rawTraineeId === 'string'
        ? Number(this.normalizeDigits(rawTraineeId).replace(/\D/g, ''))
        : Number(rawTraineeId);
      const traineeId = Number.isSafeInteger(traineeIdValue) && traineeIdValue > 0 ? traineeIdValue : null;
      const answersObj = parsed.answers || {};

      console.log('📊 النتائج:');
      console.log(`  - الرقم القومي: ${nationalId ? 'موجود' : 'غير موجود'}`);
      console.log(`  - رقم الملف: ${traineeId ?? 'غير موجود'}`);
      console.log(`  - الإجابات: ${Object.keys(answersObj).length} سؤال`);

      // تحويل الإجابات إلى OMRAnalysisResult[]
      const answers: OMRAnalysisResult[] = [];
      for (let i = 1; i <= numberOfQuestions; i++) {
        const answer = answersObj[i.toString()];
        if (typeof answer === 'string' && answer.trim()) {
          answers.push({
            questionNumber: i,
            selectedSymbol: answer.toUpperCase().trim(),
          });
        }
      }

      console.log(`✅ تم التعرف على ${answers.length}/${numberOfQuestions} إجابة`);

      return {
        nationalId: normalizedNationalId,
        traineeId,
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
