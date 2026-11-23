import { fetchTraineeAPI } from '@/lib/trainee-api';
import { API_BASE_URL } from '@/lib/api';
import type {
  TraineeNotification,
  NotificationStorageState,
  AppealData,
  RequestData,
  ComplaintData,
  ReleasedGradeData,
  PaymentOverdueData,
  PaymentRecordData,
  GeneralRequestData,
} from '@/types/trainee-notifications';

// ─── مفاتيح التخزين المحلي ───
const STORAGE_KEY = 'trainee_notifications_state';
const NOTIFICATIONS_KEY = 'trainee_notifications';

// ─── إدارة التخزين المحلي ───

export function getStorageState(): NotificationStorageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    lastKnownIds: {
      appeals: [],
      requests: [],
      generalRequests: [],
      complaints: [],
      releasedGrades: [],
    },
    readNotificationIds: [],
    lastFetchTime: '',
    fingerprints: {},
  };
}

export function saveStorageState(state: NotificationStorageState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function getSavedNotifications(): TraineeNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveNotifications(notifications: TraineeNotification[]): void {
  try {
    // الاحتفاظ بآخر 50 إشعار فقط لتوفير المساحة
    const trimmed = notifications.slice(0, 50);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(trimmed));
  } catch {}
}

// ─── fingerprint: لتوليد بصمة فريدة لكل عنصر بحالته ───
function fingerprint(type: string, id: number | string, status: string): string {
  return `${type}_${id}_${status}`;
}

// ─── جلب البيانات من الـ APIs الموجودة ───

async function fetchAppeals(): Promise<AppealData[]> {
  try {
    const data = await fetchTraineeAPI('grade-appeals/my-appeals');
    return data.appeals || data || [];
  } catch {
    return [];
  }
}

async function fetchDeferralRequests(): Promise<RequestData[]> {
  try {
    const data = await fetchTraineeAPI('deferral-requests/my-requests');
    return data.requests || data || [];
  } catch {
    return [];
  }
}

async function fetchGeneralRequests(): Promise<GeneralRequestData[]> {
  try {
    const data = await fetchTraineeAPI('trainee-requests/my-requests');
    return data.requests || data || [];
  } catch {
    return [];
  }
}

async function fetchComplaints(): Promise<ComplaintData[]> {
  try {
    const data = await fetchTraineeAPI('complaints/my-complaints');
    return data.complaints || data || [];
  } catch {
    return [];
  }
}

async function fetchReleasedGrades(traineeId: string): Promise<ReleasedGradeData[]> {
  try {
    const token = localStorage.getItem('trainee_token');
    if (!token || !traineeId) return [];
    const res = await fetch(
      `${API_BASE_URL}/trainee-grades/${traineeId}/released`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.classrooms || data || [];
  } catch {
    return [];
  }
}

async function fetchPaymentOverdue(): Promise<PaymentOverdueData[]> {
  try {
    const token = localStorage.getItem('trainee_token');
    if (!token) return [];
    const res = await fetch(
      `${API_BASE_URL}/trainee-platform/overdue-summary`,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.overduePayments || data.upcomingPayments || [];
  } catch {
    return [];
  }
}

async function fetchPaymentRecords(): Promise<PaymentRecordData[]> {
  try {
    const data = await fetchTraineeAPI('trainee-auth/profile');
    const payments = data?.trainee?.traineePayments || [];
    return payments.map((p: any) => ({
      id: p.id,
      feeName: p.fee?.name || 'رسوم',
      amount: p.amount,
      paidAmount: p.paidAmount,
      status: p.status,
      paidAt: p.updatedAt || p.createdAt,
    }));
  } catch {
    return [];
  }
}

// ─── منطق مقارنة الحالات وتوليد الإشعارات ───

function appealStatusLabel(status: string): string {
  switch (status) {
    case 'ACCEPTED': return 'تم قبول';
    case 'REJECTED': return 'تم رفض';
    default: return 'قيد المراجعة';
  }
}

function requestStatusLabel(status: string): string {
  switch (status) {
    case 'APPROVED': return 'تم قبول';
    case 'REJECTED': return 'تم رفض';
    default: return 'قيد المراجعة';
  }
}

function requestTypeLabel(type: string): string {
  switch (type) {
    case 'EXAM_POSTPONE': return 'تأجيل اختبار';
    case 'SICK_LEAVE': return 'إجازة مرضية';
    case 'ENROLLMENT_PROOF': return 'إثبات قيد';
    case 'CERTIFICATE': return 'إفادة';
    default: return 'طلب';
  }
}

function complaintStatusLabel(status: string): string {
  switch (status) {
    case 'IN_PROGRESS': return 'جاري المعالجة';
    case 'RESOLVED': return 'تم الحل';
    case 'CLOSED': return 'مغلقة';
    default: return 'قيد المراجعة';
  }
}

/**
 * الدالة الرئيسية: تجلب البيانات وتقارنها بالحالة المحفوظة لتوليد إشعارات جديدة
 * تعمل بأقل ضغط ممكن على الخادم
 */
export async function fetchAndDiffNotifications(
  traineeId: string
): Promise<{ notifications: TraineeNotification[]; hasNew: boolean }> {
  const state = getStorageState();
  const existingNotifications = getSavedNotifications();
  const readIds = new Set(state.readNotificationIds);
  const oldFingerprints = state.fingerprints;
  const newFingerprints: Record<string, string> = {};
  const newNotifications: TraineeNotification[] = [];
  const now = new Date().toISOString();

  // ── 1. جلب كل البيانات بالتوازي (طلب واحد لكل endpoint) ──
  const [appeals, deferrals, generalRequests, complaints, releasedGrades, overduePayments, paymentRecords] = await Promise.allSettled([
    fetchAppeals(),
    fetchDeferralRequests(),
    fetchGeneralRequests(),
    fetchComplaints(),
    fetchReleasedGrades(traineeId),
    fetchPaymentOverdue(),
    fetchPaymentRecords(),
  ]);

  // ── 2. معالجة التظلمات ──
  const appealsData = appeals.status === 'fulfilled' ? appeals.value : [];
  for (const appeal of appealsData) {
    const fp = fingerprint('appeal', appeal.id, appeal.status);
    newFingerprints[fp] = fp;

    // فقط إذا الحالة ليست PENDING وتغيرت عن آخر مرة
    if (appeal.status !== 'PENDING' && !oldFingerprints[fp]) {
      const id = `appeal_${appeal.id}_${appeal.status}`;
      const isAccepted = appeal.status === 'ACCEPTED';
      newNotifications.push({
        id,
        type: 'appeal_response',
        title: `${appealStatusLabel(appeal.status)} تظلمك`,
        message: `${appealStatusLabel(appeal.status)} تظلمك${appeal.subject?.nameAr ? ` في مادة ${appeal.subject.nameAr}` : ''}`,
        priority: 'high',
        isRead: readIds.has(id),
        createdAt: appeal.updatedAt || appeal.createdAt || now,
        link: '/trainee-dashboard/appeals',
        metadata: { appealId: appeal.id, status: appeal.status, isAccepted },
      });
    }
  }

  // ── 3. معالجة طلبات التأجيل ──
  const deferralsData = deferrals.status === 'fulfilled' ? deferrals.value : [];
  for (const req of deferralsData) {
    const fp = fingerprint('deferral', req.id, req.status);
    newFingerprints[fp] = fp;

    if (req.status !== 'PENDING' && !oldFingerprints[fp]) {
      const id = `request_${req.id}_${req.status}`;
      newNotifications.push({
        id,
        type: 'request_response',
        title: `${requestStatusLabel(req.status)} طلبك`,
        message: `${requestStatusLabel(req.status)} طلب التأجيل الخاص بك${req.adminResponse ? ` - ${req.adminResponse}` : ''}`,
        priority: 'high',
        isRead: readIds.has(id),
        createdAt: req.updatedAt || req.createdAt || now,
        link: '/trainee-dashboard/requests',
        metadata: { requestId: req.id, status: req.status },
      });
    }
  }

  // ── 4. معالجة الطلبات العامة (تأجيل اختبار، إجازة مرضية، إثبات قيد، إفادة) ──
  const generalRequestsData = generalRequests.status === 'fulfilled' ? generalRequests.value : [];
  for (const req of generalRequestsData) {
    const fp = fingerprint('general_request', req.id, req.status);
    newFingerprints[fp] = fp;

    if (req.status !== 'PENDING' && !oldFingerprints[fp]) {
      const id = `general_request_${req.id}_${req.status}`;
      const typeLabel = requestTypeLabel(req.type);
      newNotifications.push({
        id,
        type: 'request_response',
        title: `${requestStatusLabel(req.status)} طلبك`,
        message: `${requestStatusLabel(req.status)} طلب ${typeLabel} الخاص بك${req.adminResponse ? ` - ${req.adminResponse}` : ''}`,
        priority: 'high',
        isRead: readIds.has(id),
        createdAt: req.updatedAt || req.createdAt || now,
        link: '/trainee-dashboard/requests',
        metadata: { requestId: req.id, status: req.status, requestType: req.type },
      });
    }
  }

  // ── 5. معالجة الشكاوي ──
  const complaintsData = complaints.status === 'fulfilled' ? complaints.value : [];
  for (const complaint of complaintsData) {
    const fp = fingerprint('complaint', complaint.id, complaint.status);
    newFingerprints[fp] = fp;

    if (complaint.status !== 'PENDING' && !oldFingerprints[fp]) {
      const id = `complaint_${complaint.id}_${complaint.status}`;
      newNotifications.push({
        id,
        type: 'complaint_response',
        title: `تحديث على ${complaint.type === 'complaint' ? 'شكواك' : 'اقتراحك'}`,
        message: `${complaintStatusLabel(complaint.status)} ${complaint.subject || (complaint.type === 'complaint' ? 'الشكوى' : 'الاقتراح')}`,
        priority: 'medium',
        isRead: readIds.has(id),
        createdAt: complaint.updatedAt || complaint.createdAt || now,
        link: '/trainee-dashboard/complaints',
        metadata: { complaintId: complaint.id, status: complaint.status },
      });
    }
  }

  // ── 6. معالجة النتائج المعلنة ──
  const gradesData = releasedGrades.status === 'fulfilled' ? releasedGrades.value : [];
  for (const grade of gradesData) {
    const fp = fingerprint('grade', grade.classroomId, 'released');
    newFingerprints[fp] = fp;

    if (!oldFingerprints[fp]) {
      const id = `grade_${grade.classroomId}_released`;
      newNotifications.push({
        id,
        type: 'grades_released',
        title: '🎉 تم إعلان النتائج',
        message: `تم إعلان نتائج ${grade.classroomName || 'الفصل الدراسي'}`,
        priority: 'high',
        isRead: readIds.has(id),
        createdAt: grade.releasedAt || now,
        link: '/trainee-dashboard/released-grades',
        metadata: { classroomId: grade.classroomId, isLocked: grade.isLocked },
      });
    }
  }

  // ── 7. معالجة المدفوعات المتأخرة/القريبة ──
  const paymentsData = overduePayments.status === 'fulfilled' ? overduePayments.value : [];
  for (const payment of paymentsData) {
    const isOverdue = payment.daysRemaining <= 0;
    const urgencyKey = isOverdue ? 'overdue' : (payment.daysRemaining <= 3 ? 'urgent' : 'upcoming');
    const fp = fingerprint('payment', payment.id, urgencyKey);
    newFingerprints[fp] = fp;

    if (!oldFingerprints[fp]) {
      const id = `payment_${payment.id}_${urgencyKey}`;
      newNotifications.push({
        id,
        type: isOverdue ? 'payment_overdue' : 'payment_upcoming',
        title: isOverdue ? '⚠️ تأخر في السداد' : '💰 تذكير بموعد السداد',
        message: isOverdue
          ? `تجاوزت موعد سداد "${payment.name}" بمبلغ ${payment.remainingAmount} جنيه`
          : `موعد سداد "${payment.name}" بعد ${payment.daysRemaining} يوم`,
        priority: isOverdue ? 'high' : 'medium',
        isRead: readIds.has(id),
        createdAt: now,
        link: '/trainee-dashboard/payments',
        metadata: { paymentId: payment.id, amount: payment.remainingAmount, daysRemaining: payment.daysRemaining },
      });
    }
  }

  // ── 8. معالجة المدفوعات المسددة (PAID أو PARTIALLY_PAID) ──
  const paymentRecordsData = paymentRecords.status === 'fulfilled' ? paymentRecords.value : [];
  for (const record of paymentRecordsData) {
    if (record.status === 'PAID' || record.status === 'PARTIALLY_PAID') {
      const fp = fingerprint('payment_made', record.id, record.status);
      newFingerprints[fp] = fp;

      if (!oldFingerprints[fp]) {
        const id = `payment_made_${record.id}_${record.status}`;
        const isFullyPaid = record.status === 'PAID';
        newNotifications.push({
          id,
          type: 'payment_made',
          title: isFullyPaid ? '✅ تم سداد الرسوم بالكامل' : '💳 تم سداد جزء من الرسوم',
          message: isFullyPaid
            ? `تم سداد "${record.feeName}" بالكامل بمبلغ ${record.paidAmount} جنيه`
            : `تم سداد ${record.paidAmount} جنيه من "${record.feeName}" (المتبقي: ${record.amount - record.paidAmount} جنيه)`,
          priority: 'medium',
          isRead: readIds.has(id),
          createdAt: record.paidAt || now,
          link: '/trainee-dashboard/payments',
          metadata: { paymentId: record.id, feeName: record.feeName, paidAmount: record.paidAmount, total: record.amount, status: record.status },
        });
      }
    }
  }

  // ── 9. دمج الإشعارات الجديدة مع القديمة ──
  // - أضف الجديدة في الأعلى
  // - حافظ على القديمة التي لا تزال صالحة
  const newIds = new Set(newNotifications.map(n => n.id));
  const mergedNotifications = [
    ...newNotifications,
    ...existingNotifications.filter(n => !newIds.has(n.id)),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50); // حد أقصى 50 إشعار

  // ── 10. تحديث الحالة المحفوظة ──
  const updatedState: NotificationStorageState = {
    lastKnownIds: {
      appeals: appealsData.map(a => `${a.id}`),
      requests: deferralsData.map(r => `${r.id}`),
      generalRequests: generalRequestsData.map(r => `${r.id}`),
      complaints: complaintsData.map(c => `${c.id}`),
      releasedGrades: gradesData.map(g => `${g.classroomId}`),
    },
    readNotificationIds: state.readNotificationIds,
    lastFetchTime: now,
    fingerprints: newFingerprints,
  };

  saveStorageState(updatedState);
  saveNotifications(mergedNotifications);

  return {
    notifications: mergedNotifications,
    hasNew: newNotifications.length > 0,
  };
}

// ─── تحديث حالة القراءة ───

export function markNotificationAsRead(notificationId: string): void {
  const state = getStorageState();
  if (!state.readNotificationIds.includes(notificationId)) {
    state.readNotificationIds.push(notificationId);
    // تنظيف: الاحتفاظ بآخر 200 معرف مقروء
    if (state.readNotificationIds.length > 200) {
      state.readNotificationIds = state.readNotificationIds.slice(-200);
    }
    saveStorageState(state);
  }

  // تحديث الإشعار في القائمة المحفوظة
  const notifications = getSavedNotifications();
  const idx = notifications.findIndex(n => n.id === notificationId);
  if (idx !== -1) {
    notifications[idx].isRead = true;
    saveNotifications(notifications);
  }
}

export function markAllNotificationsAsRead(): void {
  const notifications = getSavedNotifications();
  const state = getStorageState();

  const allIds = notifications.map(n => n.id);
  state.readNotificationIds = [...new Set([...state.readNotificationIds, ...allIds])].slice(-200);
  saveStorageState(state);

  const updated = notifications.map(n => ({ ...n, isRead: true }));
  saveNotifications(updated);
}

export function getUnreadCount(): number {
  const notifications = getSavedNotifications();
  return notifications.filter(n => !n.isRead).length;
}

export function clearAllNotifications(): void {
  saveNotifications([]);
  const state = getStorageState();
  state.readNotificationIds = [];
  saveStorageState(state);
}
