/**
 * Converts an object with Date properties to a JSON-compatible object
 * by converting Date objects to ISO strings
 * Also handles circular references and complex objects
 */
export function toJsonValue(obj: any, depth = 0, maxDepth = 3): any {
  try {
    // تجنب الأخطاء المرتبطة بعمق كبير من الكائنات
    if (depth > maxDepth) {
      return '[Object too deep]';
    }

    // معالجة الحالات الأساسية
    if (obj === null || obj === undefined) {
      return obj;
    }

    // معالجة التواريخ: تحويلها إلى سلاسل ISO
    if (obj instanceof Date) {
      return obj.toISOString();
    }

    // معالجة المصفوفات: تطبيق التحويل على كل عنصر
    if (Array.isArray(obj)) {
      return obj.map(item => toJsonValue(item, depth + 1, maxDepth));
    }

    // معالجة كائنات السجلات (مثل Prisma Records)
    if (typeof obj === 'object') {
      // معالجة الكائنات المخصصة ذات طريقة toJSON
      if (typeof obj.toJSON === 'function') {
        return obj.toJSON();
      }

      const result: Record<string, any> = {};
      
      // معالجة خصائص الكائن
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          try {
            // تجاهل الوظائف (functions) والخصائص المعقدة جدًا
            if (typeof obj[key] === 'function') {
              continue;
            }
            
            // تطبيق التحويل بشكل متكرر على كل خاصية
            result[key] = toJsonValue(obj[key], depth + 1, maxDepth);
          } catch (err) {
            // استخدام قيمة آمنة في حالة الفشل
            result[key] = `[Error converting value: ${err.message}]`;
          }
        }
      }
      return result;
    }

    // إرجاع القيم الأساسية كما هي (أعداد، نصوص، بوليان)
    return obj;
  } catch (error) {
    // التعامل مع أي أخطاء غير متوقعة
    console.error('Error in toJsonValue:', error);
    return `[Conversion error: ${error.message}]`;
  }
} 