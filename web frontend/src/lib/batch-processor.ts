/**
 * 🔄 Batch Processor Utility
 * 
 * معالجة البيانات على دفعات لمنع Memory/CPU Spikes
 * 
 * مثال الاستخدام:
 * ```typescript
 * const results = await processBatches(
 *   items,
 *   async (item) => fetchAPI(`/api/${item.id}`),
 *   5 // معالجة 5 عناصر في المرة
 * );
 * ```
 */

/**
 * معالجة مصفوفة من العناصر على دفعات
 * 
 * @template T - نوع العنصر المُدخل
 * @template R - نوع النتيجة المُخرجة
 * @param items - المصفوفة المراد معالجتها
 * @param processor - دالة async لمعالجة كل عنصر
 * @param batchSize - عدد العناصر في كل دفعة (افتراضي: 5)
 * @returns Promise بمصفوفة النتائج بنفس ترتيب المُدخلات
 */
export async function processBatches<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 5
): Promise<R[]> {
  // التحقق من المدخلات
  if (!items || items.length === 0) {
    return [];
  }

  if (batchSize <= 0) {
    throw new Error('Batch size must be greater than 0');
  }

  const results: R[] = [];
  const totalBatches = Math.ceil(items.length / batchSize);
  
  console.log(`🔄 Batch Processing: ${items.length} items in ${totalBatches} batches (${batchSize} per batch)`);

  // معالجة كل دفعة
  for (let i = 0; i < items.length; i += batchSize) {
    const batchNumber = Math.floor(i / batchSize) + 1;
    const batch = items.slice(i, i + batchSize);
    
    console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);
    
    try {
      // معالجة جميع عناصر الدفعة بشكل متوازي
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      );
      
      results.push(...batchResults);
      console.log(`✅ Batch ${batchNumber} completed (${results.length}/${items.length} total)`);
      
    } catch (error) {
      console.error(`❌ Error in batch ${batchNumber}:`, error);
      throw error;
    }
  }

  console.log(`✅ All batches completed: ${results.length} results`);
  return results;
}

/**
 * معالجة مصفوفة على دفعات مع معالجة الأخطاء الفردية
 * 
 * هذه النسخة لا تتوقف عند فشل أحد العناصر - تستمر في المعالجة
 * 
 * @template T - نوع العنصر المُدخل
 * @template R - نوع النتيجة المُخرجة
 * @param items - المصفوفة المراد معالجتها
 * @param processor - دالة async لمعالجة كل عنصر
 * @param fallbackValue - القيمة الافتراضية عند فشل معالجة عنصر
 * @param batchSize - عدد العناصر في كل دفعة (افتراضي: 5)
 * @returns Promise بمصفوفة النتائج (fallbackValue للعناصر الفاشلة)
 */
export async function processBatchesWithFallback<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  fallbackValue: R,
  batchSize: number = 5
): Promise<R[]> {
  if (!items || items.length === 0) {
    return [];
  }

  if (batchSize <= 0) {
    throw new Error('Batch size must be greater than 0');
  }

  const results: R[] = [];
  const totalBatches = Math.ceil(items.length / batchSize);
  
  console.log(`🔄 Batch Processing (with fallback): ${items.length} items in ${totalBatches} batches`);

  for (let i = 0; i < items.length; i += batchSize) {
    const batchNumber = Math.floor(i / batchSize) + 1;
    const batch = items.slice(i, i + batchSize);
    
    console.log(`📦 Processing batch ${batchNumber}/${totalBatches}`);
    
    // معالجة كل عنصر مع try-catch فردي
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          return await processor(item);
        } catch (error) {
          console.error(`❌ Error processing item:`, error);
          return fallbackValue;
        }
      })
    );
    
    results.push(...batchResults);
    console.log(`✅ Batch ${batchNumber} completed`);
  }

  console.log(`✅ All batches completed: ${results.length} results`);
  return results;
}

/**
 * معالجة مصفوفة على دفعات مع تأخير بين الدفعات
 * 
 * مفيد عندما تريد تقليل الضغط على الخادم أكثر
 * 
 * @template T - نوع العنصر المُدخل
 * @template R - نوع النتيجة المُخرجة
 * @param items - المصفوفة المراد معالجتها
 * @param processor - دالة async لمعالجة كل عنصر
 * @param batchSize - عدد العناصر في كل دفعة
 * @param delayMs - التأخير بالميلي ثانية بين الدفعات
 * @returns Promise بمصفوفة النتائج
 */
export async function processBatchesWithDelay<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 5,
  delayMs: number = 100
): Promise<R[]> {
  if (!items || items.length === 0) {
    return [];
  }

  const results: R[] = [];
  const totalBatches = Math.ceil(items.length / batchSize);
  
  console.log(`🔄 Batch Processing (with ${delayMs}ms delay): ${items.length} items`);

  for (let i = 0; i < items.length; i += batchSize) {
    const batchNumber = Math.floor(i / batchSize) + 1;
    const batch = items.slice(i, i + batchSize);
    
    console.log(`📦 Processing batch ${batchNumber}/${totalBatches}`);
    
    const batchResults = await Promise.all(
      batch.map(item => processor(item))
    );
    
    results.push(...batchResults);
    
    // تأخير بين الدفعات (إلا آخر دفعة)
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.log(`✅ All batches completed`);
  return results;
}

/**
 * معالجة مصفوفة على دفعات مع progress callback
 * 
 * مفيد لعرض شريط تقدم أو نسبة الإكمال
 * 
 * @template T - نوع العنصر المُدخل
 * @template R - نوع النتيجة المُخرجة
 * @param items - المصفوفة المراد معالجتها
 * @param processor - دالة async لمعالجة كل عنصر
 * @param onProgress - callback يُنادى بعد كل دفعة (processed, total)
 * @param batchSize - عدد العناصر في كل دفعة
 * @returns Promise بمصفوفة النتائج
 */
export async function processBatchesWithProgress<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  onProgress: (processed: number, total: number) => void,
  batchSize: number = 5
): Promise<R[]> {
  if (!items || items.length === 0) {
    return [];
  }

  const results: R[] = [];
  const total = items.length;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(item => processor(item))
    );
    
    results.push(...batchResults);
    
    // تحديث التقدم
    onProgress(results.length, total);
  }

  return results;
}
