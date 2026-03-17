export interface TraineeReleasedGradesDto {
  canView: boolean;
  reason?: string;
  classrooms: ClassroomGradesDto[];
}

export interface ClassroomGradesDto {
  classroom: {
    id: number;
    name: string;
    classNumber: number;
    startDate: string | null;
    endDate: string | null;
  };
  releaseInfo: {
    releasedAt: string;
    requirePayment: boolean;
    linkedFeeType: string | null;
    notes: string | null;
  };
  contents: ContentGradeDto[];
  totalStats: {
    maxTotal: number;
    earnedTotal: number;
    percentage: number;
  };
}

export interface ContentGradeDto {
  content: {
    id: number;
    name: string;
    code: string;
  };
  grade: {
    yearWorkMarks: number;
    practicalMarks: number;
    writtenMarks: number;
    attendanceMarks: number;
    quizzesMarks: number;
    finalExamMarks: number;
    total: number;
  };
  maxMarks: {
    yearWorkMarks: number;
    practicalMarks: number;
    writtenMarks: number;
    attendanceMarks: number;
    quizzesMarks: number;
    finalExamMarks: number;
    total: number;
  };
}
