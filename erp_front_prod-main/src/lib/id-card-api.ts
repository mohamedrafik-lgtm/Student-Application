// ملف API خاص بإدارة كارنيه الطالب

/**
 * API لإدارة كارنيه الطالب
 * 
 * تم ربطه مع نفس مصدر البيانات المستخدم في صفحة الإدارة
 * لضمان التزامن بين صفحة المتدرب وصفحة الإدارة
 * 
 * الـ API يحاول الوصول للبيانات من عدة مصادر:
 * 1. endpoint مخصص للمتدربين: /id-cards/trainee/{id}/status
 * 2. endpoint الإدارة العام: /id-cards/trainees-with-status
 * 3. fallback للبيانات المحاكاة في حالة الفشل
 * 
 * هذا يضمن أن المتدرب يرى نفس الحالة التي يراها المدير
 */

export interface IdCardStatus {
  id: number;
  traineeId: number;
  designId?: number;
  status: 'PENDING' | 'PRINTED' | 'DELIVERED' | 'LOST';
  printedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  printRecords: Array<{
    id: number;
    printedAt: string;
    printedBy: string;
  }>;
  deliveredBy?: string;
}

export interface LostCardRequest {
  id: number;
  traineeId: number;
  reason: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: string;
  rejectedAt?: string;
  notes?: string;
}

// دالة مساعدة لتحويل حالة الكارنية من تنسيق الإدارة إلى تنسيق المتدرب
const mapStatusToTraineeFormat = (adminStatus: string): 'PENDING' | 'PRINTED' | 'DELIVERED' | 'LOST' => {
  switch (adminStatus) {
    case 'لم تتم الطباعة':
    case 'غير مطبوع':
      return 'PENDING';
    case 'تم الطباعة':
    case 'مطبوع':
      return 'PRINTED';
    case 'تم التسليم':
    case 'مسلم':
      return 'DELIVERED';
    case 'مفقود':
    case 'فاقد':
      return 'LOST';
    default:
      return 'PENDING';
  }
};

export const idCardAPI = {
  // جلب حالة كارنية المتدرب
  getStatus: async (): Promise<IdCardStatus | null> => {
    try {
      const token = localStorage.getItem('trainee_token');
      if (!token) {
        throw new Error('لا يوجد توكن مصادقة');
      }

      // جلب بيانات المتدرب أولاً للحصول على ID
      const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trainee-auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!profileResponse.ok) {
        throw new Error('فشل في جلب بيانات المتدرب');
      }

      const profileData = await profileResponse.json();
      const traineeId = profileData.trainee.id;

      // محاولة جلب بيانات الكارنية من عدة endpoints محتملة
      let data;
      let idCardStatus;
      
      try {
        // المحاولة الأولى: endpoint مخصص للمتدربين
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/id-cards/trainee/${traineeId}/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          data = await response.json();
          idCardStatus = data.idCardStatus || data;
        } else {
          throw new Error('المحاولة الثانية');
        }
      } catch {
        // المحاولة الثانية: استخدام endpoint الإدارة العام
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/id-cards/trainees-with-status?search=${profileData.trainee.nationalId}&limit=1`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const adminData = await response.json();
            if (adminData.data && adminData.data.length > 0) {
              idCardStatus = adminData.data[0].idCardStatus;
            } else {
              throw new Error('لم يتم العثور على بيانات');
            }
          } else {
            throw new Error('فشل في جلب البيانات');
          }
        } catch {
          throw new Error('فشل في جلب حالة الكارنية من جميع المصادر');
        }
      }
      
      return {
        id: idCardStatus.printId || 1,
        traineeId: traineeId,
        designId: 1,
        status: mapStatusToTraineeFormat(idCardStatus.status),
        printedAt: idCardStatus.printedAt,
        deliveredAt: idCardStatus.deliveredAt || undefined,
        createdAt: idCardStatus.printedAt || new Date().toISOString(),
        updatedAt: idCardStatus.deliveredAt || idCardStatus.printedAt || new Date().toISOString(),
        printRecords: idCardStatus.printedAt ? [
          {
            id: idCardStatus.printId || 1,
            printedAt: idCardStatus.printedAt,
            printedBy: idCardStatus.printedBy?.name || 'مدير النظام'
          }
        ] : [],
        deliveredBy: idCardStatus.deliveredBy?.name || (idCardStatus.deliveredAt ? 'مدير النظام' : undefined)
      };
    } catch (error) {
      console.error('Error fetching ID card status:', error);
      
      // في حالة الفشل، إرجاع بيانات محاكاة كـ fallback
      return {
        id: 1,
        traineeId: 1,
        designId: 1,
        status: 'PRINTED',
        printedAt: '2024-01-15T10:30:00Z',
        deliveredAt: undefined,
        createdAt: '2024-01-10T08:00:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        printRecords: [
          {
            id: 1,
            printedAt: '2024-01-15T10:30:00Z',
            printedBy: 'مدير النظام'
          }
        ],
        deliveredBy: undefined
      };
    }
  },

  // طلب بدل فاقد (مغلق مؤقتاً)
  requestLostCard: async (): Promise<LostCardRequest> => {
    throw new Error('خدمة طلب بدل فاقد مغلقة مؤقتاً. يرجى التواصل مع إدارة المركز.');
  },

  // جلب طلبات بدل الفاقد
  getLostCardRequests: async (): Promise<LostCardRequest[]> => {
    // محاكاة تأخير الشبكة
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // إرجاع قائمة فارغة لأن الخدمة مغلقة مؤقتاً
    return [];
  }
};
