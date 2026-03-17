export enum ReminderDeliveryStatus {
  PENDING = 'PENDING',       // في الانتظار
  SCHEDULED = 'SCHEDULED',   // مجدول للإرسال
  SENDING = 'SENDING',       // قيد الإرسال حالياً
  SENT = 'SENT',             // تم الإرسال بنجاح
  FAILED = 'FAILED',         // فشل الإرسال
  SKIPPED = 'SKIPPED',       // تم التخطي (المتدرب دفع)
}