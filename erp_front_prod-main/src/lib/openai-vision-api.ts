/**
 * Frontend API للتواصل مع OpenRouter Vision (مع الحفاظ على اسم المسار للتوافق)
 */

import { fetchAPI } from './api';

export interface OpenAIOMRResult {
  questionNumber: number;
  selectedSymbol: string;
  confidence?: number;
}

/**
 * تحليل ورقة OMR باستخدام نموذج OpenRouter المعتمد
 */
export async function analyzeOMRWithOpenAI(
  imageBase64: string,
  numberOfQuestions: number
): Promise<OpenAIOMRResult[]> {
  try {
    console.log('🤖 إرسال للتحليل بواسطة OpenRouter...');
    
    const result = await fetchAPI('/openai-vision/analyze-omr', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64,
        numberOfQuestions
      })
    });
    
    console.log(`✅ OpenRouter: تم التعرف على ${result.length} إجابة`);
    return result || [];
    
  } catch (error: any) {
    console.error('❌ OpenRouter error:', error);
    throw error;
  }
}
