/**
 * Frontend API للتواصل مع Google Cloud Vision
 */

import { fetchAPI } from './api';

export interface GoogleVisionResult {
  questionNumber: number;
  selectedAnswer: number;
  symbol: string;
  confidence: number;
}

/**
 * تحليل ورقة OMR باستخدام Google Cloud Vision
 */
export async function analyzeOMRWithGoogle(
  imageBase64: string,
  numberOfQuestions: number,
  questionData: Array<{ questionNumber: number; options: any[] }>
): Promise<GoogleVisionResult[]> {
  try {
    console.log('🌐 إرسال للتحليل بواسطة Google Cloud Vision...');
    
    const result = await fetchAPI('/google-vision/analyze-omr', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64,
        numberOfQuestions,
        questionData
      })
    });
    
    console.log('✅ Google Cloud Vision: نجح التحليل');
    return result || [];
    
  } catch (error: any) {
    console.error('❌ Google Cloud Vision error:', error);
    throw error;
  }
}

/**
 * التحقق من توفر Google Cloud Vision
 */
export async function checkGoogleVisionAvailability(): Promise<boolean> {
  try {
    const result = await fetchAPI('/google-vision/status');
    return result?.available || false;
  } catch (error) {
    return false;
  }
}