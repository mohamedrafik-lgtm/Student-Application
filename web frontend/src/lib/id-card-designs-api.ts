import { fetchAPI } from './api';
import { IdCardDesign, IdCardElement } from '@/types/id-card-design';

export interface CreateIdCardDesignData {
  name: string;
  description?: string;
  isDefault?: boolean;
  width: number;
  height: number;
  backgroundImage?: string;
  backgroundColor?: string;
  elements: IdCardElement[];
  version?: string;
  tags?: string[];
}

export interface UpdateIdCardDesignData extends Partial<CreateIdCardDesignData> {
  isActive?: boolean;
}

class IdCardDesignsAPI {
  private baseUrl = '/id-card-designs';

  // إنشاء تصميم جديد
  async create(data: CreateIdCardDesignData): Promise<IdCardDesign> {
    const response = await fetchAPI(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.design;
  }

  // الحصول على جميع التصاميم
  async getAll(includeInactive = false): Promise<IdCardDesign[]> {
    const params = new URLSearchParams();
    if (includeInactive) {
      params.append('includeInactive', 'true');
    }
    
    const response = await fetchAPI(`${this.baseUrl}?${params.toString()}`);
    return response.designs;
  }

  // الحصول على التصميم الافتراضي
  async getDefault(): Promise<IdCardDesign> {
    const response = await fetchAPI(`${this.baseUrl}/default`);
    return response.design;
  }

  // الحصول على تصميم محدد
  async getById(id: string): Promise<IdCardDesign> {
    const response = await fetchAPI(`${this.baseUrl}/${id}`);
    return response.design;
  }

  // تحديث تصميم
  async update(id: string, data: UpdateIdCardDesignData): Promise<IdCardDesign> {
    const response = await fetchAPI(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.design;
  }

  // حذف تصميم
  async delete(id: string): Promise<void> {
    await fetchAPI(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
  }

  // تعيين تصميم كافتراضي
  async setAsDefault(id: string): Promise<IdCardDesign> {
    const response = await fetchAPI(`${this.baseUrl}/${id}/set-default`, {
      method: 'PATCH',
    });
    return response.design;
  }

  // نسخ تصميم
  async duplicate(id: string, name?: string): Promise<IdCardDesign> {
    const response = await fetchAPI(`${this.baseUrl}/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return response.design;
  }

  // حفظ عناصر التصميم فقط (تحديث سريع)
  async saveElements(id: string, elements: IdCardElement[]): Promise<IdCardDesign> {
    const response = await fetchAPI(`${this.baseUrl}/${id}/elements`, {
      method: 'PATCH',
      body: JSON.stringify({ elements }),
    });
    return response.design;
  }

  // تحديث خصائص عنصر واحد
  async updateElement(
    designId: string, 
    elementId: string, 
    updates: Partial<IdCardElement>
  ): Promise<IdCardDesign> {
    const design = await this.getById(designId);
    const updatedElements = design.designData.elements.map(element =>
      element.id === elementId ? { ...element, ...updates } : element
    );
    
    return this.saveElements(designId, updatedElements);
  }

  // إضافة عنصر جديد
  async addElement(designId: string, element: IdCardElement): Promise<IdCardDesign> {
    const design = await this.getById(designId);
    const updatedElements = [...design.designData.elements, element];
    
    return this.saveElements(designId, updatedElements);
  }

  // حذف عنصر
  async removeElement(designId: string, elementId: string): Promise<IdCardDesign> {
    const design = await this.getById(designId);
    const updatedElements = design.designData.elements.filter(
      element => element.id !== elementId
    );
    
    return this.saveElements(designId, updatedElements);
  }

  // تغيير ترتيب العناصر (z-index)
  async reorderElements(designId: string, elementIds: string[]): Promise<IdCardDesign> {
    const design = await this.getById(designId);
    const elementsMap = new Map(
      design.designData.elements.map(el => [el.id, el])
    );
    
    const reorderedElements = elementIds.map((id, index) => ({
      ...elementsMap.get(id)!,
      zIndex: index + 1,
    }));
    
    return this.saveElements(designId, reorderedElements);
  }

  // تصدير التصميم كملف JSON
  async exportDesign(id: string): Promise<Blob> {
    const { API_BASE_URL, getAuthToken } = await import('./api');
    
    console.log('بدء تصدير التصميم:', id);
    
    const token = getAuthToken();
    if (!token) {
      throw new Error('يرجى تسجيل الدخول أولاً');
    }

    try {
      const url = `${API_BASE_URL}${this.baseUrl}/${id}/export`;
      console.log('طلب GET إلى:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      console.log('استجابة الخادم:', response.status, response.statusText);
      console.log('Headers الاستجابة:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = 'فشل في تصدير التصميم';
        try {
          const errorData = await response.json();
          console.log('بيانات الخطأ:', errorData);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // إذا فشل في قراءة JSON، استخدم الرسالة الافتراضية
          console.log('فشل في قراءة JSON للخطأ:', e);
          errorMessage = `خطأ HTTP: ${response.status} - ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      console.log('نجح الطلب، تحويل إلى blob...');
      return response.blob();
    } catch (error: any) {
      console.error('خطأ في تصدير التصميم:', error);
      throw new Error(error.message || 'حدث خطأ غير متوقع أثناء تصدير التصميم');
    }
  }

  // استيراد التصميم من ملف JSON
  async importDesign(file: File): Promise<IdCardDesign> {
    const { API_BASE_URL, getAuthToken } = await import('./api');
    
    const token = getAuthToken();
    if (!token) {
      throw new Error('يرجى تسجيل الدخول أولاً');
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}${this.baseUrl}/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        let errorMessage = 'فشل في استيراد التصميم';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `خطأ HTTP: ${response.status} - ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      return result.design;
    } catch (error: any) {
      console.error('خطأ في استيراد التصميم:', error);
      throw new Error(error.message || 'حدث خطأ غير متوقع أثناء استيراد التصميم');
    }
  }

  // إلغاء تفعيل التصميم (حذف مؤقت)
  async deactivate(id: string): Promise<IdCardDesign> {
    const response = await fetchAPI(`${this.baseUrl}/${id}/deactivate`, {
      method: 'PATCH',
    });
    return response.design;
  }

  // الحصول على التصميم المناسب لمتدرب (حسب برنامجه)
  async getDesignForTrainee(traineeId: number): Promise<IdCardDesign> {
    const response = await fetchAPI(`${this.baseUrl}/for-trainee/${traineeId}`);
    return response.design;
  }

  // الحصول على التصميم الافتراضي لبرنامج
  async getProgramDefaultDesign(programId: number): Promise<IdCardDesign | null> {
    try {
      const response = await fetchAPI(`${this.baseUrl}/program/${programId}/default`);
      return response.design;
    } catch (error) {
      // إذا لم يوجد تصميم للبرنامج، إرجاع null
      return null;
    }
  }

  // تحديث التصاميم القديمة لتكون متاحة لكل البرامج
  async migrateLegacyDesigns(): Promise<number> {
    const response = await fetchAPI(`${this.baseUrl}/migrate-legacy`, {
      method: 'POST',
    });
    return response.updatedCount;
  }
}

export const idCardDesignsAPI = new IdCardDesignsAPI();
