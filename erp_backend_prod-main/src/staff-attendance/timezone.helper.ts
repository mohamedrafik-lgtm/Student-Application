/**
 * مساعد المنطقة الزمنية - يتعامل مع فوارق التوقيت بين السيرفر (فرنسا) والمستخدمين (مصر/السعودية)
 * يستخدم Intl.DateTimeFormat المدمج في Node.js بدون مكتبات خارجية
 */

export interface TzDateParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
  dayOfWeek: number; // 0=Sunday .. 6=Saturday
}

/**
 * الحصول على أجزاء التاريخ والوقت في منطقة زمنية محددة
 */
export function getDatePartsInTz(timezone: string, date = new Date()): TzDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0';

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  // Intl hour12:false may return "24" for midnight in some environments
  let hour = parseInt(get('hour'), 10);
  if (hour === 24) hour = 0;

  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour,
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
    dayOfWeek: weekdayMap[get('weekday')] ?? 0,
  };
}

/**
 * الحصول على "اليوم" (منتصف الليل) كـ UTC Date حسب المنطقة الزمنية
 * هذا هو التاريخ الذي نخزنه في حقل `date` في قاعدة البيانات
 */
export function getTodayDateUTC(timezone: string): Date {
  const p = getDatePartsInTz(timezone);
  return new Date(Date.UTC(p.year, p.month - 1, p.day));
}

/**
 * الحصول على نطاق البحث لـ "اليوم" - يغطي اليوم الكامل
 */
export function getTodayRange(timezone: string): { start: Date; end: Date } {
  const todayUTC = getTodayDateUTC(timezone);
  const tomorrowUTC = new Date(todayUTC.getTime() + 86400000);
  return { start: todayUTC, end: tomorrowUTC };
}

/**
 * التحقق هل الموظف متأخر بناءً على الوقت الحالي في المنطقة الزمنية
 */
export function isLateNow(
  workStartTime: string,
  lateThresholdMinutes: number,
  timezone: string,
): boolean {
  const p = getDatePartsInTz(timezone);
  const [startH, startM] = workStartTime.split(':').map(Number);
  const deadlineMinutes = startH * 60 + startM + lateThresholdMinutes;
  const currentMinutes = p.hour * 60 + p.minute;
  return currentMinutes > deadlineMinutes;
}

/**
 * الحصول على يوم الأسبوع الحالي باسمه الإنجليزي
 */
export function getCurrentDayName(timezone: string): string {
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const p = getDatePartsInTz(timezone);
  return dayNames[p.dayOfWeek];
}

/**
 * بناء كائن Date من وقت معين (ساعة:دقيقة) في "اليوم" حسب المنطقة الزمنية
 * يعيد الوقت كـ UTC Date (حقيقي) يمثل تلك اللحظة في المنطقة الزمنية المحددة
 */
export function buildTimeToday(timeStr: string, timezone: string): Date {
  const p = getDatePartsInTz(timezone);
  return buildDateTimeInTz(
    `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`,
    timeStr,
    timezone,
  );
}

/**
 * بناء كائن Date من تاريخ ووقت في منطقة زمنية محددة
 * مثلاً: buildDateTimeInTz('2026-03-01', '09:00', 'Africa/Cairo') → UTC Date يمثل 09:00 بتوقيت مصر
 */
export function buildDateTimeInTz(dateStr: string, timeStr: string, timezone: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  // نستخدم تاريخ مرجعي لحساب فرق المنطقة الزمنية
  // نحسب الفرق بين "الوقت الظاهر" في المنطقة الزمنية و UTC الحقيقي
  const now = new Date();
  const nowParts = getDatePartsInTz(timezone, now);
  const nowAsIfUTC = new Date(Date.UTC(
    nowParts.year, nowParts.month - 1, nowParts.day,
    nowParts.hour, nowParts.minute, nowParts.second,
  ));
  const offsetMs = nowAsIfUTC.getTime() - now.getTime();

  const [year, month, day] = dateStr.split('-').map(Number);
  const fakeUTC = new Date(Date.UTC(year, month - 1, day, h, m, 0, 0));
  return new Date(fakeUTC.getTime() - offsetMs);
}

/**
 * الحصول على بداية الشهر والنهاية
 */
export function getMonthRange(timezone: string): { start: Date; end: Date } {
  const p = getDatePartsInTz(timezone);
  const start = new Date(Date.UTC(p.year, p.month - 1, 1));
  const end = new Date(Date.UTC(p.year, p.month, 0)); // آخر يوم في الشهر
  return { start, end };
}

/**
 * التحقق من صحة اسم المنطقة الزمنية
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** المناطق الزمنية المدعومة (الأكثر استخداماً في المنطقة العربية) */
export const SUPPORTED_TIMEZONES = [
  { value: 'Africa/Cairo', label: 'مصر (القاهرة) UTC+2', offset: '+02:00' },
  { value: 'Asia/Riyadh', label: 'السعودية (الرياض) UTC+3', offset: '+03:00' },
  { value: 'Asia/Dubai', label: 'الإمارات (دبي) UTC+4', offset: '+04:00' },
  { value: 'Asia/Kuwait', label: 'الكويت UTC+3', offset: '+03:00' },
  { value: 'Asia/Bahrain', label: 'البحرين UTC+3', offset: '+03:00' },
  { value: 'Asia/Qatar', label: 'قطر UTC+3', offset: '+03:00' },
  { value: 'Asia/Muscat', label: 'عمان (مسقط) UTC+4', offset: '+04:00' },
  { value: 'Asia/Amman', label: 'الأردن (عمّان) UTC+3', offset: '+03:00' },
  { value: 'Asia/Baghdad', label: 'العراق (بغداد) UTC+3', offset: '+03:00' },
  { value: 'Africa/Tripoli', label: 'ليبيا (طرابلس) UTC+2', offset: '+02:00' },
  { value: 'Africa/Tunis', label: 'تونس UTC+1', offset: '+01:00' },
  { value: 'Africa/Casablanca', label: 'المغرب (الدار البيضاء) UTC+1', offset: '+01:00' },
  { value: 'Asia/Beirut', label: 'لبنان (بيروت) UTC+2', offset: '+02:00' },
  { value: 'Europe/Paris', label: 'فرنسا (باريس) UTC+1', offset: '+01:00' },
];
