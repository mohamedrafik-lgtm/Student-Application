export interface TrainingProgram {
  id: number;
  nameAr: string;
  nameEn: string;
  price: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrainingProgramDTO {
  nameAr: string;
  nameEn: string;
  price: number;
  description?: string;
} 