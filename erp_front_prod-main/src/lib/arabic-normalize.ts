// تطبيع النص العربي للبحث المرن
// - إزالة التشكيل (الحركات)
// - توحيد أشكال الألف/الهمزة
// - توحيد التاء المربوطة/المفتوحة والياء
// - إزالة التطويل (ـ)
// - trim + collapse whitespace
// - lower-case للأحرف اللاتينية

export function normalizeArabic(text: string | null | undefined): string {
  if (!text) return '';
  let s = String(text);

  // إزالة التشكيل (harakat) + tatweel
  s = s.replace(/[\u064B-\u065F\u0670\u0640]/g, '');

  // توحيد أشكال الألف/الهمزة
  s = s.replace(/[أإآٱ]/g, 'ا');

  // توحيد همزة واو/ياء
  s = s.replace(/ؤ/g, 'ء');
  s = s.replace(/ئ/g, 'ء');

  // توحيد التاء المربوطة
  s = s.replace(/ة/g, 'ه');

  // توحيد الألف المقصورة
  s = s.replace(/ى/g, 'ي');

  // collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();

  // lower-case for latin
  s = s.toLowerCase();

  return s;
}

// مسافة Levenshtein (لـ fuzzy matching)
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

// fuzzy score 0..1 (1 = exact)
export function fuzzyScore(query: string, target: string): number {
  const q = normalizeArabic(query);
  const t = normalizeArabic(target);
  if (!q || !t) return 0;
  if (t.includes(q)) return 1; // substring match
  const dist = levenshtein(q, t);
  const maxLen = Math.max(q.length, t.length);
  return maxLen > 0 ? 1 - dist / maxLen : 0;
}