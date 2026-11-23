import { fetchAPI } from '@/lib/api';
import { 
  TraineeArchive, 
  DocumentsCompletionStats, 
  CreateTraineeDocumentDto, 
  UpdateTraineeDocumentDto 
} from '@/app/types/trainee-documents';

// الحصول على جميع وثائق المتدرب
export async function getTraineeDocuments(traineeId: number): Promise<TraineeArchive> {
  return fetchAPI(`/trainees/${traineeId}/documents`);
}

// رفع وثيقة جديدة أو تحديث موجودة
export async function uploadTraineeDocument(
  traineeId: number, 
  documentData: CreateTraineeDocumentDto
) {
  return fetchAPI(`/trainees/${traineeId}/documents`, {
    method: 'POST',
    body: JSON.stringify(documentData),
  });
}

// تحديث حالة التحقق من الوثيقة
export async function updateDocumentVerification(
  documentId: string, 
  updateData: UpdateTraineeDocumentDto
) {
  return fetchAPI(`/trainees/documents/${documentId}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  });
}

// حذف وثيقة
export async function deleteTraineeDocument(documentId: string) {
  return fetchAPI(`/trainees/documents/${documentId}`, {
    method: 'DELETE',
  });
}

// الحصول على إحصائيات إكمال الوثائق لجميع المتدربين
export async function getDocumentsCompletionStats(filters?: {
  programId?: number;
  completionStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<DocumentsCompletionStats> {
  let endpoint = '/trainees/documents/completion-stats';
  
  if (filters) {
    const params = new URLSearchParams();
    
    if (filters.programId) {
      params.append('programId', filters.programId.toString());
    }
    
    if (filters.completionStatus) {
      params.append('completionStatus', filters.completionStatus);
    }
    
    if (filters.dateFrom) {
      params.append('dateFrom', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      params.append('dateTo', filters.dateTo);
    }

    if (filters.search) {
      params.append('search', filters.search);
    }

    if (filters.page) {
      params.append('page', filters.page.toString());
    }

    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }
    
    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }
  }
  
  return fetchAPI(endpoint);
}

// الحصول على تقرير مفصل عن وثائق المتدربين
export async function getDetailedDocumentsReport(filters?: {
  programId?: number;
  completionStatus?: string;
  search?: string;
  limit?: number;
}) {
  let endpoint = '/trainees/documents/detailed-report';
  
  if (filters) {
    const params = new URLSearchParams();
    
    if (filters.programId) {
      params.append('programId', filters.programId.toString());
    }
    
    if (filters.completionStatus) {
      params.append('completionStatus', filters.completionStatus);
    }

    if (filters.search) {
      params.append('search', filters.search);
    }

    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }
    
    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }
  }
  
  return fetchAPI(endpoint);
}
