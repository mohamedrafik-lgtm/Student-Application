import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeveloperSettingDto, UpdateDeveloperSettingDto } from './dto/developer-settings.dto';
import * as crypto from 'crypto';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_VALIDATED_MODELS_KEY = 'OPENROUTER_VALIDATED_MODELS';
const FREE_AGENT_HARNESS_ONLY_MODELS = new Set([
  'thinkingmachines/inkling-small:free',
  'thinkingmachines/inkling:free',
]);
const OMR_TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAa4AAAD6AQMAAADDUzGMAAAABlBMVEUAAAD///+l2Z/dAAAACXBIWXMAAAsTAAALEwEAmpwYAAABJklEQVR42u2bsW7bMBCGaThoOhRRx0zh0BdI0MWDAXVK+hgBMnRNX8BSECD2EFSPkFdRYaBeCvgVlGrIKsGLAhhiaevu5FgiQTKpAzSSF8XRB5Pi3X8/zxYTLseSddiLYQmzPrjEYnvMk1hkP8aZxLg9li5Z6dtjucQCe+yxw948dl/ksZhF02zUEyWLh8OeERZeJqE/HrPkiM1LFg4+mGHsOAn59Q07P+itsJNbM+zo+Dzi1++GF7+CuRzsYh6ZYKVfYaNPFZYJQ+zjl5Bf7UmsJ7HwmJtiX0M/JGzomWLvJ8FkDwcpxkaY8E/e//AnpyO4JenMDDuSGJ+cDi9u1lhuiIXfDyM+OWPJAYt9eUvM5ibi/DCKbs+uZJSssIHZnezS9HUxrFsZneAFPR3m4dV4kmAlYybYYo6lE7GBBiv3EcOQQlwMddi37blFdphngy3723ObB06Y0S0p8u1BxiYL8Jgrl7v/tjLAd8JKN2zphhVuWOKG/fEbMWkSXPUtSRgsSAjSUTJI3IJxNRYzON1P4OP5NXz8yFNj0q1XV/twdzP5Wh9T+VJhJYMxFUFZjelenq5PxvJUhS0Zq+5Jjmoww39yUSixArEUJSuCyJOXLHVYD7EZYhyxQIVlcgcDY1uRlbivRysZukqNyREuBOTGerTLjTxp5JsjttrMBTClHKZUTbLYqEZq7E7+c43Jvx7Wl1ZvdpgtZrcAu40Su1Cuq6JV4mz0GCBNF5imcxxbS5o2sTwDrzvLRiAKvUKJ1RJ0eQASlAxAgti9ur6R4H3+DYI3OwbBG0zVGMlrP4RheyDv2dBTY1Zi3mJnqHSEVDqCzjz9H+apdMMy7mZnPCcsjXaJ1XsEK/NUY3b5Ru/8LLbNE+urzROv92Hb5gn0ts08kXuV/PipeUqglrSZpwIjTApv+tQ8ydas0jxllKVYMcg8hYC1mSeKkgLKWl0DJKasAYTlAoZCFYeB4LZVnJg2sgKGQvWNMF19c8RSATOg2s2gmGhr90PlDTacAmJap9BhL7UAu40Su1AWwilx6hqMYyPzRNmtNU8BT5+ap1oUdOaJe+On5qmWIJ158rxt80SCZ2eeWGeeOvP0GubJsRfk5rnSnXouagtbdp64U77VzTgyT6gF2s6T1zBPKFi6zhM5vNo8gapqO0+EkXnKcP+n6zzRApB5ShDTdZ7ShnlKcJOq20BTKlPFiXFLrNuuU1uT6hthRs0BR4xqdwhdArPGBzkFwozaLB32Uguw2yixC+WmeTJKnKZ5ouw26zyheapFwajzROaJJMio80TmiQTPrvNE8tp1njrz9Dzszg1zc0GlG7bcKVZwJ/OUu5mnXNN5IvPEGtmdajpPaJ5i1t/GplzZeSLzFLLeNhbvKztPZJ7wC4Y2rNl5IvPUglFwNTfQVAPwO5c2rLldp4rDUHBbsGZzgOpbGyaehzUbH1S7GWMWnSd0Ch1mhzkuwG6jxDKUhVviqDtPZJ7a0lQ4icKGebKRoM2fPFkIXn1Yyes/ME9GvqT7QV2Hddibx3zh8hCD4yMTrg9oOD4O4vjwiege43lN7C/gXrvOoc84pwAAAABJRU5ErkJggg==';

@Injectable()
export class DeveloperSettingsService {
  private readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
  private readonly ENCRYPTION_IV_LENGTH = 16;

  constructor(private prisma: PrismaService) {}

  /**
   * تشفير القيمة
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ENCRYPTION_IV_LENGTH);
    const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * فك تشفير القيمة
   */
  private decrypt(text: string): string {
    try {
      const parts = text.split(':');
      const iv = Buffer.from(parts.shift()!, 'hex');
      const encryptedText = parts.join(':');
      const key = crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('خطأ في فك التشفير:', error);
      return text; // إرجاع النص الأصلي إذا فشل فك التشفير
    }
  }

  /**
   * إنشاء إعداد جديد
   */
  async create(createDto: CreateDeveloperSettingDto, userEmail: string) {
    if (['OPENROUTER_MODEL', OPENROUTER_VALIDATED_MODELS_KEY].includes(createDto.key)) {
      throw new BadRequestException('اعتمد النموذج من شاشة اختبار OpenRouter حتى يتم فحصه أولاً');
    }
    // التحقق من عدم وجود المفتاح مسبقاً
    const existing = await this.prisma.developerSettings.findUnique({
      where: { key: createDto.key },
    });

    if (existing) {
      throw new ConflictException(`الإعداد بالمفتاح "${createDto.key}" موجود مسبقاً`);
    }

    // تشفير القيمة إذا لزم الأمر
    const value = createDto.isEncrypted !== false 
      ? this.encrypt(createDto.value)
      : createDto.value;

    return this.prisma.developerSettings.create({
      data: {
        key: createDto.key,
        value,
        description: createDto.description,
        category: createDto.category || 'general',
        isEncrypted: createDto.isEncrypted !== false,
        isActive: createDto.isActive !== false,
        updatedBy: userEmail,
      },
    });
  }

  /**
   * جلب جميع الإعدادات (بدون القيم المشفرة)
   */
  async findAll(includeValues = false) {
    const settings = await this.prisma.developerSettings.findMany({
      orderBy: { category: 'asc' },
    });

    if (!includeValues) {
      // إخفاء القيم المشفرة
      return settings.map(setting => ({
        ...setting,
        value: setting.isEncrypted ? '***encrypted***' : setting.value,
      }));
    }

    // فك تشفير القيم
    return settings.map(setting => ({
      ...setting,
      value: setting.isEncrypted ? this.decrypt(setting.value) : setting.value,
    }));
  }

  /**
   * جلب إعداد محدد
   */
  async findOne(id: string, decrypted = true) {
    const setting = await this.prisma.developerSettings.findUnique({
      where: { id },
    });

    if (!setting) {
      throw new NotFoundException('الإعداد غير موجود');
    }

    if (decrypted && setting.isEncrypted) {
      return {
        ...setting,
        value: this.decrypt(setting.value),
      };
    }

    return setting;
  }

  /**
   * جلب إعداد بالمفتاح
   */
  async findByKey(key: string): Promise<string | null> {
    const setting = await this.prisma.developerSettings.findUnique({
      where: { key, isActive: true },
    });

    if (!setting) {
      return null;
    }

    return setting.isEncrypted ? this.decrypt(setting.value) : setting.value;
  }

  /**
   * تحديث إعداد
   */
  async update(id: string, updateDto: UpdateDeveloperSettingDto, userEmail: string) {
    const setting = await this.findOne(id, false);
    if (['OPENROUTER_MODEL', OPENROUTER_VALIDATED_MODELS_KEY].includes(setting.key)) {
      throw new BadRequestException('اعتمد النموذج من شاشة اختبار OpenRouter حتى يتم فحصه أولاً');
    }

    const data: any = {
      updatedBy: userEmail,
    };

    if (updateDto.value !== undefined) {
      // تشفير القيمة الجديدة إذا لزم الأمر
      const shouldEncrypt = updateDto.isEncrypted !== undefined 
        ? updateDto.isEncrypted 
        : setting.isEncrypted;
      
      data.value = shouldEncrypt ? this.encrypt(updateDto.value) : updateDto.value;
    }

    if (updateDto.description !== undefined) {
      data.description = updateDto.description;
    }

    if (updateDto.category !== undefined) {
      data.category = updateDto.category;
    }

    if (updateDto.isEncrypted !== undefined) {
      data.isEncrypted = updateDto.isEncrypted;
    }

    if (updateDto.isActive !== undefined) {
      data.isActive = updateDto.isActive;
    }

    return this.prisma.developerSettings.update({
      where: { id },
      data,
    });
  }

  /**
   * حذف إعداد
   */
  async remove(id: string) {
    await this.findOne(id, false);
    return this.prisma.developerSettings.delete({
      where: { id },
    });
  }

  private async getOpenRouterApiKey(): Promise<string | null> {
    return (await this.findByKey('OPENROUTER_API_KEY')) || process.env.OPENROUTER_API_KEY || null;
  }

  async getOpenRouterConfig() {
    const [apiKey, model, apiKeySetting] = await Promise.all([
      this.getOpenRouterApiKey(),
      this.findByKey('OPENROUTER_MODEL'),
      this.prisma.developerSettings.findUnique({ where: { key: 'OPENROUTER_API_KEY' }, select: { id: true } }),
    ]);
    return { hasApiKey: Boolean(apiKey), model: model || null, apiKeySettingId: apiKeySetting?.id || null };
  }

  async getFreeVisionModels() {
    let response: Response;
    try {
      response = await fetch(`${OPENROUTER_API_URL}/models?input_modalities=text%2Cimage`);
    } catch {
      throw new NotFoundException('تعذر الاتصال بقائمة نماذج OpenRouter');
    }

    if (!response.ok) {
      throw new NotFoundException(`تعذر جلب النماذج من OpenRouter (${response.status})`);
    }

    const payload = await response.json() as { data?: any[] };
    const models = (payload.data || []).filter((model) => {
      const inputModalities = model.architecture?.input_modalities || [];
      const pricing = model.pricing || {};
      const hasTextAndImage = inputModalities.includes('text') && inputModalities.includes('image');
      const zeroPriced = ['prompt', 'completion', 'image'].every((field) =>
        pricing[field] !== undefined && Number(pricing[field]) === 0,
      );
      const id = String(model.id);
      const description = String(model.description || '');
      const freeEndpointRequiresHarness =
        FREE_AGENT_HARNESS_ONLY_MODELS.has(id) ||
        /only available for use with agentic harnesses/i.test(description);
      return hasTextAndImage && (id.endsWith(':free') || zeroPriced) && !freeEndpointRequiresHarness;
    });

    return models.map((model) => ({
      id: model.id,
      name: model.name,
      description: model.description || '',
      contextLength: model.context_length || null,
      inputModalities: model.architecture?.input_modalities || [],
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getValidatedOpenRouterModels() {
    const [availableModels, stored] = await Promise.all([
      this.getFreeVisionModels(),
      this.findByKey(OPENROUTER_VALIDATED_MODELS_KEY),
    ]);
    let validatedIds: string[] = [];
    try {
      validatedIds = stored ? JSON.parse(stored) : [];
    } catch {
      validatedIds = [];
    }
    return availableModels.filter((model) => validatedIds.includes(model.id));
  }

  private async rememberValidatedModel(modelId: string) {
    const stored = await this.findByKey(OPENROUTER_VALIDATED_MODELS_KEY);
    let validatedIds: string[] = [];
    try {
      validatedIds = stored ? JSON.parse(stored) : [];
    } catch {
      validatedIds = [];
    }
    if (!validatedIds.includes(modelId)) validatedIds.push(modelId);

    const existing = await this.prisma.developerSettings.findUnique({ where: { key: OPENROUTER_VALIDATED_MODELS_KEY } });
    const data = {
      value: JSON.stringify(validatedIds),
      description: 'معرّفات نماذج OpenRouter التي اجتازت اختبار OMR',
      category: 'ai',
      isEncrypted: false,
      isActive: true,
    };
    if (existing) {
      await this.prisma.developerSettings.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.developerSettings.create({ data: { key: OPENROUTER_VALIDATED_MODELS_KEY, ...data } });
    }
  }

  private async requestOpenRouterCompletion(model: string, messages: any[], maxTokens = 1500) {
    const apiKey = await this.getOpenRouterApiKey();
    if (!apiKey) {
      throw new NotFoundException('أدخل واحفظ مفتاح OpenRouter أولاً');
    }

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'Tiba Training Management System',
    };
    const request = (tokens: number, disableReasoning: boolean) => fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: tokens,
        // On retries, explicitly reserve the output budget for the answer rather than hidden reasoning.
        ...(disableReasoning || model.startsWith('nvidia/nemotron-3.5-super-vl')
          ? { reasoning: { effort: 'none' } }
          : {}),
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const readContent = (value: any) => {
      const content = value?.choices?.[0]?.message?.content;
      if (typeof content === 'string') return content.trim();
      if (Array.isArray(content)) return content.map((part) => part.text || '').join('').trim();
      return '';
    };
    const readPayload = async (response: Response) => response.json().catch(() => ({})) as Promise<any>;
    const throwProviderError = (response: Response, payload: any): never => {
      const errorCode = payload.error?.code;
      const providerName = payload.error?.metadata?.provider_name;
      const message = payload.error?.message || `OpenRouter request failed (${response.status})`;
      console.error('OpenRouter completion failed:', { status: response.status, errorCode, providerName, message });
      const details = [providerName && `المزود: ${providerName}`, errorCode && `رمز الخطأ: ${errorCode}`]
        .filter(Boolean)
        .join('، ');
      throw new BadRequestException(details ? `${message} (${details})` : message);
    };

    let response = await request(maxTokens, false);
    let payload = await readPayload(response);
    if (!response.ok) throwProviderError(response, payload);

    let content = readContent(payload);
    const firstChoice = payload.choices?.[0];
    const firstMessage = firstChoice?.message;
    if (content) return content;

    // Some vision/reasoning models spend the entire completion budget on internal reasoning.
    // Retry once with reasoning disabled and enough room for the structured answer.
    if (firstMessage?.reasoning || firstChoice?.finish_reason === 'length') {
      const retryTokens = Math.min(Math.max(maxTokens * 2, 4096), 8192);
      response = await request(retryTokens, true);
      payload = await readPayload(response);
      if (!response.ok) {
        const errorText = String(payload.error?.message || '');
        if (/unsupported.*(reasoning|parameter)|(reasoning|parameter).*unsupported/i.test(errorText)) {
          response = await request(retryTokens, false);
          payload = await readPayload(response);
        }
      }
      if (!response.ok) throwProviderError(response, payload);
      content = readContent(payload);
      if (content) return content;

      const retryFinishReason = payload.choices?.[0]?.finish_reason;
      throw new BadRequestException(
        `لم يُكمل النموذج إجابة نصية بعد إعادة المحاولة${retryFinishReason ? ` (finish_reason: ${retryFinishReason})` : ''}. قلّل عدد الأسئلة في الصفحة أو اختر نموذجاً اجتاز اختبار تصحيح OMR.`,
      );
    }

    const finishReason = firstChoice?.finish_reason;
    throw new BadRequestException(`أعاد OpenRouter رسالة بلا محتوى نصي${finishReason ? ` (finish_reason: ${finishReason})` : ''}`);
  }

  async testOpenRouterModel(modelId: string) {
    if (!modelId?.trim()) throw new NotFoundException('حدد نموذجاً للاختبار');
    const expected = ['A', 'C', 'B', 'D'];
    if (FREE_AGENT_HARNESS_ONLY_MODELS.has(modelId)) {
      return {
        valid: false,
        modelId,
        expected,
        actual: null,
        message: 'هذا النموذج المجاني يعمل داخل بيئات الوكلاء فقط، ولا يقبل طلبات API المباشرة لتصحيح OMR.',
      };
    }
    const models = await this.getFreeVisionModels();
    const model = models.find((candidate) => candidate.id === modelId);
    if (!model) {
      throw new NotFoundException('النموذج غير متاح مجاناً أو لا يدعم إدخال الصور والنص');
    }

    const prompt = `هذا اختبار صلاحية نموذج لرؤية وتصحيح أوراق OMR. اقرأ ورقة الاختبار المرفقة، ثم أعد JSON فقط بالصيغة {"answers":{"1":"A","2":"C","3":"B","4":"D"}}. اقرأ الخيار المظلل بالأسود في كل صف، ولا تعتمد على ترتيب الحروف المتوقع. الإجابات الصحيحة في الصورة من السؤال 1 إلى 4 هي A ثم C ثم B ثم D. لا تضف شرحاً أو markdown.`;
    let responseText: string;
    try {
      responseText = await this.requestOpenRouterCompletion(modelId, [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${OMR_TEST_IMAGE_BASE64}` } },
        ],
      }]);
    } catch (error: any) {
      const detail = String(error?.message || 'تعذر الاتصال بمزود النموذج');
      if (/only available on agentic harnesses|only available for use with agentic harnesses/i.test(detail)) {
        return {
          valid: false,
          modelId,
          expected,
          actual: null,
          message: 'هذا النموذج المجاني يعمل داخل بيئات الوكلاء فقط، ولا يقبل طلبات API المباشرة لتصحيح OMR.',
        };
      }
      const providerUnavailable = /provider returned error|provider.*unavailable|upstream|rate.?limit/i.test(detail);
      return {
        valid: false,
        modelId,
        expected,
        actual: null,
        message: providerUnavailable
          ? `تعذر إكمال الاختبار بسبب مزود النموذج${detail.includes('المزود:') ? ` — ${detail}` : ''}. أعد المحاولة لاحقاً أو اختبر نموذجاً آخر.`
          : `تعذر اختبار النموذج: ${detail}`,
      };
    }

    let parsed: any;
    try {
      const json = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const match = json.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match?.[0] || json);
    } catch {
      return { valid: false, modelId, expected, actual: null, message: 'استجابة النموذج لم تكن JSON قابلاً للقراءة' };
    }

    const answers = parsed.answers || parsed;
    const actual = expected.map((_, index) => String(answers[String(index + 1)] || '').toUpperCase());
    const valid = expected.every((answer, index) => actual[index] === answer);
    if (valid) await this.rememberValidatedModel(modelId);
    return {
      valid,
      modelId,
      expected,
      actual,
      message: valid
        ? 'نجح النموذج في قراءة إجابات ورقة OMR التجريبية بدقة'
        : 'لم يقرأ النموذج إجابات ورقة OMR التجريبية بشكل صحيح، لذلك لم يتم تفعيله',
    };
  }

  async selectOpenRouterModel(modelId: string, userEmail: string) {
    const validation = await this.testOpenRouterModel(modelId);
    if (!validation.valid) {
      throw new ConflictException(validation.message);
    }

    const existing = await this.prisma.developerSettings.findUnique({ where: { key: 'OPENROUTER_MODEL' } });
    if (existing) {
      await this.prisma.developerSettings.update({
        where: { id: existing.id },
        data: { value: modelId, isEncrypted: false, isActive: true, updatedBy: userEmail },
      });
    } else {
      await this.prisma.developerSettings.create({
        data: {
          key: 'OPENROUTER_MODEL',
          value: modelId,
          description: 'نموذج OpenRouter للشات وتصحيح الاختبارات بعد اجتياز اختبار OMR',
          category: 'ai',
          isEncrypted: false,
          isActive: true,
          updatedBy: userEmail,
        },
      });
    }

    return { model: modelId, validation };
  }

  async getOpenRouterCompletion(messages: any[], maxTokens = 1500) {
    const model = await this.findByKey('OPENROUTER_MODEL');
    if (!model) throw new NotFoundException('اختر نموذج OpenRouter واجتز اختبار تصحيح OMR أولاً');
    return this.requestOpenRouterCompletion(model, messages, maxTokens);
  }
}
