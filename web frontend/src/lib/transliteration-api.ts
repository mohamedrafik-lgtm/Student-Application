/**
 * Arabic to English transliteration utility using QCRI API
 * API: https://transliterate.qcri.org/ar2en/
 */

export interface TransliterationResponse {
  text: string;
  success: boolean;
  error?: string;
}

/**
 * Transliterate Arabic text to English using QCRI API
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
    // Use our API route to avoid CORS issues
    const response = await fetch('/api/transliterate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: arabicText }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      text: data.text || '',
      success: data.success || false,
      error: data.error
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