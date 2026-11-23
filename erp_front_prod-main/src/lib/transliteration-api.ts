import { fetchAPI } from './api';

/**
 * Arabic name transliteration utility using the selected OpenRouter model.
 */

export interface TransliterationResponse {
  text: string;
  success: boolean;
  error?: string;
}

/**
 * Transliterate an Arabic name to English using the selected OpenRouter model
 * @param arabicText - The Arabic text to transliterate
 * @returns Promise with transliterated text
 */
export async function transliterateArabicToEnglish(
  arabicText: string
): Promise<TransliterationResponse> {
  if (!arabicText || !arabicText.trim()) {
    return {
      text: '',
      success: false,
      error: 'No text provided'
    };
  }

  try {
    const response = await fetchAPI('/trainees/transliterate-name', {
      method: 'POST',
      body: JSON.stringify({ nameAr: arabicText }),
    });

    return {
      text: response.text || '',
      success: Boolean(response.text),
    };
  } catch (error) {
    console.error('Transliteration error:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Debounce function to limit API calls
 */
export function debounce<F extends (...args: string[]) => void | Promise<void>>(
  func: F,
  wait: number
): (...args: Parameters<F>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<F>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
