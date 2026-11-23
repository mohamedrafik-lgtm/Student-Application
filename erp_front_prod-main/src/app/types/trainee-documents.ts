export enum DocumentType {
  PERSONAL_PHOTO = 'PERSONAL_PHOTO',
  ID_CARD_FRONT = 'ID_CARD_FRONT',
  ID_CARD_BACK = 'ID_CARD_BACK',
  QUALIFICATION_FRONT = 'QUALIFICATION_FRONT',
  QUALIFICATION_BACK = 'QUALIFICATION_BACK',
  EXPERIENCE_CERT = 'EXPERIENCE_CERT',
  MINISTRY_CERT = 'MINISTRY_CERT',
  PROFESSION_CARD = 'PROFESSION_CARD',
  SKILL_CERT = 'SKILL_CERT',
}

export interface TraineeDocument {
  id: string;
  traineeId: number;
  documentType: DocumentType;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: {
    id: string;
    name: string;
  };
  notes?: string;
  isVerified: boolean;
  verifiedAt?: string;
  verifiedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentWithStatus {
  type: DocumentType;
  nameAr: string;
  required: boolean;
  document: TraineeDocument | null;
  isUploaded: boolean;
  isVerified: boolean;
}

export interface TraineeArchive {
  trainee: {
    id: number;
    nameAr: string;
  };
  documents: DocumentWithStatus[];
  stats: {
    totalRequired: number;
    totalOptional: number;
    uploadedRequired: number;
    uploadedOptional: number;
    verifiedCount: number;
    completionPercentage: number;
    isComplete: boolean;
  };
}

export interface DocumentsCompletionStats {
  overallStats: {
    totalTrainees: number;
    completeTrainees: number;
    incompleteTrainees: number;
    averageCompletion: number;
  };
  traineeStats: {
    traineeId: number;
    traineeName: string;
    programName: string;
    totalDocuments: number;
    requiredDocuments: number;
    completionPercentage: number;
    isComplete: boolean;
    verifiedDocuments: number;
  }[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateTraineeDocumentDto {
  documentType: DocumentType;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  notes?: string;
}

export interface UpdateTraineeDocumentDto {
  notes?: string;
  isVerified?: boolean;
}
