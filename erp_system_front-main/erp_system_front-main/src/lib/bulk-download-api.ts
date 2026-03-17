import { getAuthToken } from './api';

interface BulkDownloadRequest {
  traineeIds?: number[]; // معرفات متدربين محددين
  programId?: number; // أو برنامج تدريبي كامل
  downloadAll?: boolean; // أو كل الكارنيهات
}

interface BulkDownloadResponse {
  success: boolean;
  totalCards: number;
  fileName: string;
  blob: Blob;
}

class BulkDownloadAPI {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  async downloadBulkIdCards(request: BulkDownloadRequest): Promise<BulkDownloadResponse> {
    try {
      console.log('طلب تحميل جماعي:', request);

      const token = getAuthToken();
      if (!token) {
        throw new Error('لم يتم العثور على توكن المصادقة');
      }

      const response = await fetch(`${this.baseUrl}/id-cards/bulk-download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        let errorMessage = 'حدث خطأ أثناء تحميل الكارنيهات';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `خطأ HTTP: ${response.status} - ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      // الحصول على معلومات إضافية من headers
      console.log('Response headers:', response.headers);
      
      // طباعة جميع headers للتشخيص
      for (let [key, value] of response.headers.entries()) {
        console.log(`Header: ${key} = ${value}`);
      }
      
      const totalCardsHeader = response.headers.get('X-Total-Cards');
      console.log('X-Total-Cards header:', totalCardsHeader);
      
      let totalCards = parseInt(totalCardsHeader || '0');
      console.log('Total cards parsed:', totalCards);
      
      // إذا كان العدد 0، جرب استخراجه من اسم الملف
      if (totalCards === 0) {
        const contentDisposition = response.headers.get('Content-Disposition') || '';
        const fileNameMatch = contentDisposition.match(/كارنيهات-المتدربين-(\d+)-/);
        if (fileNameMatch) {
          totalCards = parseInt(fileNameMatch[1]);
          console.log('استخراج العدد من اسم الملف:', totalCards);
        }
      }
      
      const contentDisposition = response.headers.get('Content-Disposition') || '';
      const fileName = this.extractFileName(contentDisposition) || 'كارنيهات-المتدربين.pdf';

      // تحويل الاستجابة إلى blob
      const blob = await response.blob();

      console.log(`تم تحميل ${totalCards} كارنيه في ملف: ${fileName}`);

      return {
        success: true,
        totalCards,
        fileName,
        blob,
      };

    } catch (error: any) {
      console.error('خطأ في تحميل الكارنيهات:', error);
      throw new Error(error.message || 'حدث خطأ غير متوقع أثناء تحميل الكارنيهات');
    }
  }

  // تحميل كارنيهات متدربين محددين
  async downloadSelectedTrainees(traineeIds: number[]): Promise<BulkDownloadResponse> {
    if (!traineeIds || traineeIds.length === 0) {
      throw new Error('يجب تحديد المتدربين للتحميل');
    }

    return this.downloadBulkIdCards({ traineeIds });
  }

  // تحميل كارنيهات برنامج تدريبي
  async downloadProgramIdCards(programId: number): Promise<BulkDownloadResponse> {
    if (!programId) {
      throw new Error('يجب تحديد البرنامج التدريبي');
    }

    return this.downloadBulkIdCards({ programId });
  }

  // تحميل جميع الكارنيهات
  async downloadAllIdCards(): Promise<BulkDownloadResponse> {
    return this.downloadBulkIdCards({ downloadAll: true });
  }

  // تحميل الملف للمستخدم
  downloadFile(blob: Blob, fileName: string): void {
    try {
      // إنشاء URL للملف
      const url = window.URL.createObjectURL(blob);
      
      // إنشاء رابط تحميل
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      // إضافة الرابط للصفحة وتشغيله
      document.body.appendChild(link);
      link.click();
      
      // تنظيف الموارد
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`تم تحميل الملف: ${fileName}`);
    } catch (error) {
      console.error('خطأ في تحميل الملف:', error);
      throw new Error('فشل في تحميل الملف');
    }
  }

  private extractFileName(contentDisposition: string): string | null {
    if (!contentDisposition) return null;

    // البحث عن filename* (UTF-8 encoded)
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''(.+)/);
    if (utf8Match) {
      try {
        return decodeURIComponent(utf8Match[1]);
      } catch {
        // في حالة فشل فك التشفير
      }
    }

    // البحث عن filename العادي
    const normalMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    if (normalMatch) {
      return normalMatch[1];
    }

    return null;
  }
}

export const bulkDownloadAPI = new BulkDownloadAPI();
