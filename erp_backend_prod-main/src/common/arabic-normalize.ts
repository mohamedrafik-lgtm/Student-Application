// تطبيع النص العربي للبحث (مشترك backend)
export function normalizeArabic(text: string | null | undefined): string {
  if (!text) return '';
  let s = String(text);
  s = s.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
  s = s.replace(/[أإآٱ]/g, 'ا');
  s = s.replace(/ؤ/g, 'ء');
  s = s.replace(/ئ/g, 'ء');
  s = s.replace(/ة/g, 'ه');
  s = s.replace(/ى/g, 'ي');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.toLowerCase();
  return s;
}

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
