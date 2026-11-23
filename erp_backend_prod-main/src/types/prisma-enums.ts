// Temporary enums file to handle missing Prisma client exports
// This file should be removed after properly running `npx prisma generate`
// 
// NOTE: We're using 'as any' type assertions in various places to bypass type checking
// because our temporary enum values need to match Prisma's enums exactly.
// Once we can properly regenerate the Prisma client, these type assertions can be removed.

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  MARKETER = 'MARKETER'
}

export enum EnrollmentType {
  REGULAR = 'REGULAR',
  DISTANCE = 'DISTANCE',
  BOTH = 'BOTH'
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED'
}

export enum ProgramType {
  SUMMER = 'SUMMER',
  WINTER = 'WINTER',
  ANNUAL = 'ANNUAL'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

export enum Religion {
  ISLAM = 'ISLAM',
  CHRISTIANITY = 'CHRISTIANITY',
  JUDAISM = 'JUDAISM'
}

export enum EducationType {
  PREPARATORY = 'PREPARATORY',
  INDUSTRIAL_SECONDARY = 'INDUSTRIAL_SECONDARY',
  COMMERCIAL_SECONDARY = 'COMMERCIAL_SECONDARY',
  AGRICULTURAL_SECONDARY = 'AGRICULTURAL_SECONDARY',
  AZHAR_SECONDARY = 'AZHAR_SECONDARY',
  GENERAL_SECONDARY = 'GENERAL_SECONDARY',
  UNIVERSITY = 'UNIVERSITY',
  INDUSTRIAL_APPRENTICESHIP = 'INDUSTRIAL_APPRENTICESHIP'
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE'
}

export enum TraineeStatus {
  NEW = 'NEW',
  CURRENT = 'CURRENT',
  GRADUATE = 'GRADUATE',
  WITHDRAWN = 'WITHDRAWN'
}

export enum Semester {
  FIRST = 'FIRST',
  SECOND = 'SECOND'
}

export enum Year {
  FIRST = 'FIRST',
  SECOND = 'SECOND',
  THIRD = 'THIRD',
  FOURTH = 'FOURTH'
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE'
}

export enum QuestionSkill {
  RECALL = 'RECALL',
  COMPREHENSION = 'COMPREHENSION',
  DEDUCTION = 'DEDUCTION'
}

export enum QuestionDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  VERY_HARD = 'VERY_HARD'
}

export enum SessionType {
  THEORY = 'THEORY',
  PRACTICAL = 'PRACTICAL'
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED'
}

export enum LectureType {
  VIDEO = 'VIDEO',
  PDF = 'PDF',
  BOTH = 'BOTH'
}

// Mock Prisma namespace for missing types
export namespace Prisma {
  export type JsonValue = any;
  export type AuditLogWhereUniqueInput = any;
  export type AuditLogWhereInput = any;
  export type AuditLogOrderByWithRelationInput = any;
  export type SystemSettingsUpdateInput = any;
} 