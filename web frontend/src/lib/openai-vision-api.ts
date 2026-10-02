/**
 * Frontend API للتواصل مع Mistral AI Vision
 */

import { fetchAPI } from './api';

export interface OpenAIOMRResult {
  questionNumber: number;
  selectedSymbol: string;
  confidence: number;
}

/**
 * تحليل ورقة OMR باستخدام Mistral AI Vision
 */
export async function analyzeOMRWithOpenAI(
  imageBase64: string,
  numberOfQuestions: number
): Promise<OpenAIOMRResult[]> {
  try {
    console.log('🤖 إرسال للتحليل بواسطة Mistral AI Vision...');
    
    const result = await fetchAPI('/openai-vision/analyze-omr', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64,
        numberOfQuestions
      })
    });
    
    console.log(`✅ Mistral AI Vision: تم التعرف على ${result.length} إجابة`);
    return result || [];
    
  } catch (error: any) {
    console.error('❌ Mistral AI Vision error:', error);
    throw error;
  }
}