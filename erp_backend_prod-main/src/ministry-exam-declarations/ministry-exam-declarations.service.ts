import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitBranchDeclarationDto } from './dto/submit-branch-declaration.dto';
import { SubmitOnlineDeclarationDto } from './dto/submit-online-declaration.dto';
import {
  MinistryExamDeclarationReviewStatus,
  ReviewMinistryExamDeclarationDto,
} from './dto/review-ministry-exam-declaration.dto';
import { ConfirmBranchDeliveryDto } from './dto/confirm-branch-delivery.dto';
import {
  AdminDeliverMinistryExamDeclarationDto,
  MinistryDeclarationAdminDeliveryMode,
} from './dto/admin-deliver-ministry-exam-declaration.dto';
import { CreateMinistryExamFeeSettingDto } from './dto/create-ministry-exam-fee-setting.dto';
import { UpdateMinistryExamFeeSettingDto } from './dto/update-ministry-exam-fee-setting.dto';

@Injectable()
export class MinistryExamDeclarationsService {
  constructor(
    private prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // Runtime Prisma client contains this delegate, but local TS may lag when schema/client are out of sync.
  private get declarationsRepo(): any {
    return (this.prisma as any).ministryExamDeclaration;
  }

  // Runtime Prisma client contains this delegate, but local TS may lag when schema/client are out of sync.
  private get feeSettingsRepo(): any {
    return (
      (this.prisma as any).ministryExamFeeSetting ||
      (this.prisma as any).ministryExamFeeSettings
    );
  }

  private formatDateLabel(dateValue?: Date | string | null): string {
    if (!dateValue) {
      return '';
    }

    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return date.toLocaleDateString('ar-EG');
  }

  private normalizeDeadlineInput(input: string): Date {
    const trimmed = String(input || '').trim();
    if (!trimmed) {
      throw new BadRequestException('تاريخ الموعد النهائي غير صالح');
    }

    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]);
      const day = Number(dateOnlyMatch[3]);
      return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('تاريخ الموعد النهائي غير صالح');
    }

    return parsed;
  }

  private ensureProgramAccess(programId: number, allowedProgramIds?: number[]) {
    if (
      allowedProgramIds?.length &&
      !allowedProgramIds.includes(programId)
    ) {
      throw new ForbiddenException('لا تملك صلاحية الوصول لهذا البرنامج');
    }
  }

  private async validateFeeForProgram(programId: number, feeId: number) {
    const fee = await this.prisma.traineeFee.findUnique({
      where: { id: feeId },
      select: {
        id: true,
        name: true,
        amount: true,
        programId: true,
      },
    });

    if (!fee) {
      throw new NotFoundException('الرسم المالي غير موجود');
    }

    if (fee.programId !== programId) {
      throw new BadRequestException('الرسم المحدد لا ينتمي إلى البرنامج المختار');
    }

    return fee;
  }

  private async calculateFeePaymentProgress(
    traineeId: number,
    feeId: number,
    fallbackRequiredAmount: number,
  ) {
    const payments = await this.prisma.traineePayment.findMany({
      where: {
        traineeId,
        feeId,
        status: { not: 'CANCELLED' },
      },
      select: {
        amount: true,
        paidAmount: true,
        status: true,
      },
    });

    const totalDueFromRecords = payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );

    const totalPaidFromRecords = payments.reduce((sum, payment) => {
      const paidValue =
        payment.status === 'PAID'
          ? Number(payment.amount || 0)
          : Number(payment.paidAmount || 0);
      return sum + Math.max(0, paidValue);
    }, 0);

    const requiredAmount = Math.max(
      Number(fallbackRequiredAmount || 0),
      totalDueFromRecords,
    );

    const isFullyPaid =
      requiredAmount > 0
        ? totalPaidFromRecords >= requiredAmount - 0.01
        : true;

    return {
      requiredAmount,
      paidAmount: totalPaidFromRecords,
      isFullyPaid,
    };
  }

  private async buildSubmissionPolicyForTrainee(traineeId: number) {
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: {
        id: true,
        programId: true,
        program: {
          select: {
            id: true,
            nameAr: true,
          },
        },
      },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    const feeSetting = await this.feeSettingsRepo.findUnique({
      where: { programId: trainee.programId },
      include: {
        fee: {
          select: {
            id: true,
            name: true,
            amount: true,
            programId: true,
          },
        },
      },
    });

    if (!feeSetting || feeSetting.isActive === false) {
      return {
        programId: trainee.programId,
        programName: trainee.program?.nameAr || 'غير محدد',
        isConfigured: false,
        isRequestsOpen: false,
        submissionDeadline: null,
        isDeadlinePassed: false,
        fee: null,
        payment: {
          requiredAmount: 0,
          paidAmount: 0,
          isFullyPaid: false,
        },
        isBlocked: true,
        blockReasonCode: 'NOT_OPEN',
        blockReason:
          'استقبال طلبات إقرار اختبار وزارة العمل لم يتم فتحه لبرنامجك حتى الآن.',
      };
    }

    const paymentProgress = await this.calculateFeePaymentProgress(
      traineeId,
      feeSetting.feeId,
      Number(feeSetting.fee?.amount || 0),
    );

    const deadline = feeSetting.submissionDeadline
      ? new Date(feeSetting.submissionDeadline)
      : null;

    const isDeadlinePassed = deadline ? new Date() > deadline : false;
    const isRequestsOpen = feeSetting.isRequestsOpen === true;
    const isBlockedByDeadline = isDeadlinePassed && !paymentProgress.isFullyPaid;

    let blockReasonCode: 'NOT_OPEN' | 'DEADLINE_UNPAID' | null = null;
    let blockReason: string | null = null;

    if (!isRequestsOpen) {
      blockReasonCode = 'NOT_OPEN';
      blockReason =
        'استقبال طلبات إقرار اختبار وزارة العمل لم يتم فتحه لبرنامجك حتى الآن.';
    } else if (isBlockedByDeadline) {
      blockReasonCode = 'DEADLINE_UNPAID';
      blockReason = `انتهى موعد تقديم إقرار اختبار وزارة العمل بتاريخ ${this.formatDateLabel(
        deadline,
      )} ولم يتم سداد الرسم المطلوب بالكامل.`;
    }

    return {
      programId: trainee.programId,
      programName: trainee.program?.nameAr || 'غير محدد',
      isConfigured: true,
      settingId: feeSetting.id,
      isRequestsOpen,
      submissionDeadline: deadline,
      isDeadlinePassed,
      fee: {
        id: feeSetting.fee.id,
        name: feeSetting.fee.name,
        amount: Number(feeSetting.fee.amount || 0),
      },
      payment: paymentProgress,
      isBlocked: !!blockReasonCode,
      blockReasonCode,
      blockReason,
    };
  }

  private async ensureSubmissionAllowed(traineeId: number) {
    const policy = await this.buildSubmissionPolicyForTrainee(traineeId);

    if (policy.isBlocked) {
      throw new BadRequestException(
        policy.blockReason ||
          'لا يمكن متابعة طلب إقرار اختبار وزارة العمل في الوقت الحالي.',
      );
    }

    return policy;
  }

  private getPublicLinkSecret(): string {
    return (
      this.configService.get<string>('MINISTRY_DECLARATION_PUBLIC_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'ministry-exam-declaration-public-secret'
    );
  }

  private signPublicPayload(encodedPayload: string): string {
    return createHmac('sha256', this.getPublicLinkSecret())
      .update(encodedPayload)
      .digest('base64url');
  }

  private buildPublicTokenForTrainee(traineeId: number): string {
    const encodedPayload = Buffer.from(String(traineeId), 'utf8').toString('base64url');
    const signature = this.signPublicPayload(encodedPayload);
    return `${encodedPayload}.${signature}`;
  }

  private extractTraineeIdFromPublicToken(token: string): number {
    const [encodedPayload, signature] = token.split('.');

    if (!encodedPayload || !signature) {
      throw new BadRequestException('الرابط غير صالح');
    }

    const expectedSignature = this.signPublicPayload(encodedPayload);
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new BadRequestException('الرابط غير صالح');
    }

    const traineeId = Number(Buffer.from(encodedPayload, 'base64url').toString('utf8'));

    if (!Number.isInteger(traineeId) || traineeId <= 0) {
      throw new BadRequestException('الرابط غير صالح');
    }

    return traineeId;
  }

  async getMyPublicPrintLink(traineeId: number) {
    await this.ensureSubmissionAllowed(traineeId);

    const token = this.buildPublicTokenForTrainee(traineeId);
    const path = `/print/ministry-exam-declaration/${encodeURIComponent(token)}`;
    const frontendBase = (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/$/, '');

    return {
      token,
      path,
      url: `${frontendBase}${path}`,
    };
  }

  async getPublicDeclarationByToken(token: string) {
    const traineeId = this.extractTraineeIdFromPublicToken(token);

    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: {
        id: true,
        nameAr: true,
        nationalId: true,
        phone: true,
        photoUrl: true,
        createdAt: true,
        program: {
          select: {
            nameAr: true,
          },
        },
      },
    });

    const declaration = await this.declarationsRepo.findUnique({
      where: { traineeId },
      select: {
        id: true,
        status: true,
        submissionMethod: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    if (!trainee) {
      throw new NotFoundException('الرابط غير صالح أو المتدرب غير موجود');
    }

    const submissionPolicy = await this.buildSubmissionPolicyForTrainee(traineeId);
    if (submissionPolicy.isBlocked) {
      throw new BadRequestException(
        submissionPolicy.blockReason ||
          'لا يمكن طباعة إقرار اختبار وزارة العمل في الوقت الحالي.',
      );
    }

    return {
      trainee,
      declaration,
      submissionPolicy,
      generatedAt: new Date(),
    };
  }

  async getAdminPublicPrintLinkForTrainee(traineeId: number) {
    return this.getMyPublicPrintLink(traineeId);
  }

  async getMySubmissionPolicy(traineeId: number) {
    return this.buildSubmissionPolicyForTrainee(traineeId);
  }

  async findFeeSettings(filters?: {
    programId?: number;
    allowedProgramIds?: number[];
  }) {
    const parsedProgramId = Number(filters?.programId);
    const hasProgramId = Number.isInteger(parsedProgramId) && parsedProgramId > 0;
    const allowedProgramIds = filters?.allowedProgramIds?.length
      ? filters.allowedProgramIds
      : undefined;

    let programIdsFilter: number[] | undefined;
    if (hasProgramId && allowedProgramIds) {
      programIdsFilter = allowedProgramIds.includes(parsedProgramId)
        ? [parsedProgramId]
        : [];
    } else if (hasProgramId) {
      programIdsFilter = [parsedProgramId];
    } else if (allowedProgramIds) {
      programIdsFilter = allowedProgramIds;
    }

    const where: any = {};
    if (programIdsFilter) {
      where.programId = { in: programIdsFilter };
    }

    const settings = await this.feeSettingsRepo.findMany({
      where,
      include: {
        program: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        },
        fee: {
          select: {
            id: true,
            name: true,
            amount: true,
            type: true,
            programId: true,
          },
        },
      },
      orderBy: [{ isRequestsOpen: 'desc' }, { updatedAt: 'desc' }],
    });

    return settings.map((item: any) => ({
      ...item,
      isDeadlinePassed: item.submissionDeadline
        ? new Date() > new Date(item.submissionDeadline)
        : false,
    }));
  }

  async createFeeSetting(
    dto: CreateMinistryExamFeeSettingDto,
    userId: string,
    allowedProgramIds?: number[],
  ) {
    this.ensureProgramAccess(dto.programId, allowedProgramIds);

    const program = await this.prisma.trainingProgram.findUnique({
      where: { id: dto.programId },
      select: { id: true },
    });

    if (!program) {
      throw new NotFoundException('البرنامج التدريبي غير موجود');
    }

    await this.validateFeeForProgram(dto.programId, dto.feeId);

    const existing = await this.feeSettingsRepo.findUnique({
      where: { programId: dto.programId },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        'يوجد إعداد مسبق لرسوم اختبار وزارة العمل لهذا البرنامج',
      );
    }

    const created = await this.feeSettingsRepo.create({
      data: {
        programId: dto.programId,
        feeId: dto.feeId,
        submissionDeadline: this.normalizeDeadlineInput(dto.submissionDeadline),
        isRequestsOpen: dto.isRequestsOpen === true,
        isActive: dto.isActive !== false,
        notes: dto.notes || null,
        createdBy: userId,
      },
      include: {
        program: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        },
        fee: {
          select: {
            id: true,
            name: true,
            amount: true,
            type: true,
            programId: true,
          },
        },
      },
    });

    return {
      ...created,
      isDeadlinePassed: new Date() > new Date(created.submissionDeadline),
    };
  }

  async updateFeeSetting(
    id: string,
    dto: UpdateMinistryExamFeeSettingDto,
    allowedProgramIds?: number[],
  ) {
    const existing = await this.feeSettingsRepo.findUnique({
      where: { id },
      select: {
        id: true,
        programId: true,
        feeId: true,
        submissionDeadline: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('إعداد رسوم اختبار وزارة العمل غير موجود');
    }

    this.ensureProgramAccess(existing.programId, allowedProgramIds);

    const targetProgramId = dto.programId ?? existing.programId;
    const targetFeeId = dto.feeId ?? existing.feeId;

    this.ensureProgramAccess(targetProgramId, allowedProgramIds);

    const program = await this.prisma.trainingProgram.findUnique({
      where: { id: targetProgramId },
      select: { id: true },
    });

    if (!program) {
      throw new NotFoundException('البرنامج التدريبي غير موجود');
    }

    await this.validateFeeForProgram(targetProgramId, targetFeeId);

    if (dto.programId && dto.programId !== existing.programId) {
      const conflict = await this.feeSettingsRepo.findUnique({
        where: { programId: dto.programId },
        select: { id: true },
      });

      if (conflict && conflict.id !== id) {
        throw new BadRequestException(
          'يوجد إعداد مسبق لرسوم اختبار وزارة العمل لهذا البرنامج',
        );
      }
    }

    const updated = await this.feeSettingsRepo.update({
      where: { id },
      data: {
        programId: targetProgramId,
        feeId: targetFeeId,
        submissionDeadline:
          dto.submissionDeadline !== undefined
            ? this.normalizeDeadlineInput(dto.submissionDeadline)
            : undefined,
        isRequestsOpen:
          dto.isRequestsOpen !== undefined ? dto.isRequestsOpen : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
        notes: dto.notes !== undefined ? dto.notes || null : undefined,
      },
      include: {
        program: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        },
        fee: {
          select: {
            id: true,
            name: true,
            amount: true,
            type: true,
            programId: true,
          },
        },
      },
    });

    return {
      ...updated,
      isDeadlinePassed: new Date() > new Date(updated.submissionDeadline),
    };
  }

  async deleteFeeSetting(id: string, allowedProgramIds?: number[]) {
    const existing = await this.feeSettingsRepo.findUnique({
      where: { id },
      select: {
        id: true,
        programId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('إعداد رسوم اختبار وزارة العمل غير موجود');
    }

    this.ensureProgramAccess(existing.programId, allowedProgramIds);

    await this.feeSettingsRepo.delete({
      where: { id },
    });

    return {
      message: 'تم حذف إعداد رسوم اختبار وزارة العمل بنجاح',
    };
  }

  private mapReviewDeliveryStatus(declaration: any): string {
    if (!declaration) {
      return 'NOT_DELIVERED';
    }

    if (declaration.submissionMethod === 'BRANCH') {
      return 'APPROVED_BRANCH';
    }

    if (declaration.status === 'NEEDS_RESUBMISSION') {
      return 'REJECTED';
    }

    if (declaration.status === 'PENDING_REVIEW') {
      return 'PENDING_REVIEW';
    }

    if (declaration.status === 'APPROVED') {
      return 'APPROVED_PLATFORM';
    }

    return 'DELIVERED';
  }

  private async getReviewRowsBase(filters?: {
    search?: string;
    allowedProgramIds?: number[];
    programId?: number;
  }) {
    const traineeWhere: any = {};

    if (filters?.search?.trim()) {
      const search = filters.search.trim();
      traineeWhere.OR = [
        { nameAr: { contains: search } },
        { nationalId: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const parsedProgramId = Number(filters?.programId);
    const hasProgramId = Number.isInteger(parsedProgramId) && parsedProgramId > 0;
    const allowedProgramIds = filters?.allowedProgramIds?.length
      ? filters.allowedProgramIds
      : undefined;

    let programIdsFilter: number[] | undefined;
    if (hasProgramId && allowedProgramIds) {
      programIdsFilter = allowedProgramIds.includes(parsedProgramId)
        ? [parsedProgramId]
        : [];
    } else if (hasProgramId) {
      programIdsFilter = [parsedProgramId];
    } else if (allowedProgramIds) {
      programIdsFilter = allowedProgramIds;
    }

    if (programIdsFilter) {
      traineeWhere.programId = { in: programIdsFilter };
    }

    const trainees = await this.prisma.trainee.findMany({
      where: traineeWhere,
      select: {
        id: true,
        nameAr: true,
        nationalId: true,
        phone: true,
        photoUrl: true,
        program: {
          select: {
            nameAr: true,
          },
        },
      },
      orderBy: [{ nameAr: 'asc' }],
    });

    const traineeIds = trainees.map((t) => t.id);

    const declarations = traineeIds.length
      ? await this.declarationsRepo.findMany({
          where: {
            traineeId: { in: traineeIds },
          },
          select: {
            id: true,
            traineeId: true,
            submissionMethod: true,
            status: true,
            declarationFileUrl: true,
            declarationFileName: true,
            declarationFileMimeType: true,
            rejectionReason: true,
            reviewedAt: true,
            branchReceivedAt: true,
            updatedAt: true,
            createdAt: true,
            reviewer: {
              select: {
                id: true,
                name: true,
              },
            },
            branchReceiver: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : [];

    const declarationByTraineeId = new Map<number, any>(
      declarations.map((declaration: any) => [declaration.traineeId, declaration]),
    );

    return trainees.map((trainee: any) => {
      const declaration = declarationByTraineeId.get(trainee.id) || null;
      const deliveryStatus = this.mapReviewDeliveryStatus(declaration);

      return {
        trainee,
        declaration,
        deliveryStatus,
        isDelivered: !!declaration,
      };
    });
  }

  async findReviewTrainees(filters?: {
    search?: string;
    deliveryStatus?: string;
    submissionMethod?: string;
    programId?: number;
    page?: number;
    limit?: number;
    allowedProgramIds?: number[];
  }) {
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 20;

    const reviewRows = await this.getReviewRowsBase({
      search: filters?.search,
      allowedProgramIds: filters?.allowedProgramIds,
      programId: Number(filters?.programId),
    });

    let filteredRows = reviewRows;

    if (filters?.submissionMethod && filters.submissionMethod !== 'ALL') {
      if (filters.submissionMethod === 'NONE') {
        filteredRows = filteredRows.filter((row: any) => !row.declaration);
      } else {
        filteredRows = filteredRows.filter(
          (row: any) => row.declaration?.submissionMethod === filters.submissionMethod,
        );
      }
    }

    if (filters?.deliveryStatus && filters.deliveryStatus !== 'ALL') {
      filteredRows = filteredRows.filter(
        (row: any) => row.deliveryStatus === filters.deliveryStatus,
      );
    }

    const total = filteredRows.length;
    const start = (page - 1) * limit;
    const data = filteredRows.slice(start, start + limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getReviewStats(filters?: {
    search?: string;
    programId?: number;
    allowedProgramIds?: number[];
  }) {
    const reviewRows = await this.getReviewRowsBase({
      search: filters?.search,
      allowedProgramIds: filters?.allowedProgramIds,
      programId: Number(filters?.programId),
    });

    const totalTrainees = reviewRows.length;
    const delivered = reviewRows.filter((row: any) => row.isDelivered).length;
    const notDelivered = reviewRows.filter((row: any) => !row.isDelivered).length;
    const pendingReview = reviewRows.filter((row: any) => row.deliveryStatus === 'PENDING_REVIEW').length;
    const rejected = reviewRows.filter((row: any) => row.deliveryStatus === 'REJECTED').length;
    const approvedFromPlatform = reviewRows.filter((row: any) => row.deliveryStatus === 'APPROVED_PLATFORM').length;
    const approvedFromBranch = reviewRows.filter((row: any) => row.deliveryStatus === 'APPROVED_BRANCH').length;
    const submittedOnline = reviewRows.filter((row: any) => row.declaration?.submissionMethod === 'ONLINE').length;
    const submittedBranch = reviewRows.filter((row: any) => row.declaration?.submissionMethod === 'BRANCH').length;

    return {
      totalTrainees,
      delivered,
      notDelivered,
      pendingReview,
      rejected,
      approvedFromPlatform,
      approvedFromBranch,
      approvedTotal: approvedFromPlatform + approvedFromBranch,
      submittedOnline,
      submittedBranch,
    };
  }

  private buildAlreadyHandledMessage(declaration: any): string {
    const methodLabel =
      declaration?.status === 'BRANCH_DELIVERED'
        ? 'من خلال الفرع'
        : 'أونلاين';

    const handledByName =
      declaration?.status === 'BRANCH_DELIVERED'
        ? declaration?.branchReceiver?.name || declaration?.reviewer?.name
        : declaration?.reviewer?.name || declaration?.branchReceiver?.name;

    return handledByName
      ? `تم استلام الإقرار مسبقاً (${methodLabel}) بواسطة ${handledByName}`
      : `تم استلام الإقرار مسبقاً (${methodLabel})`;
  }

  async getAdminDeliveryStatusForTrainee(traineeId: number) {
    await this.ensureTraineeExists(traineeId);

    const declaration = await this.declarationsRepo.findUnique({
      where: { traineeId },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
        branchReceiver: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const submissionPolicy = await this.buildSubmissionPolicyForTrainee(traineeId);

    if (!declaration) {
      return {
        canDeliver: !submissionPolicy.isBlocked,
        message: submissionPolicy.blockReason,
        blockedByPolicy: submissionPolicy.isBlocked,
        submissionPolicy,
      };
    }

    if (declaration.status === 'APPROVED' || declaration.status === 'BRANCH_DELIVERED') {
      return {
        canDeliver: false,
        message: this.buildAlreadyHandledMessage(declaration),
        status: declaration.status,
        submissionMethod: declaration.submissionMethod,
        blockedByPolicy: submissionPolicy.isBlocked,
        submissionPolicy,
      };
    }

    if (submissionPolicy.isBlocked) {
      return {
        canDeliver: false,
        message: submissionPolicy.blockReason,
        status: declaration.status,
        submissionMethod: declaration.submissionMethod,
        blockedByPolicy: true,
        submissionPolicy,
      };
    }

    return {
      canDeliver: true,
      status: declaration.status,
      submissionMethod: declaration.submissionMethod,
      blockedByPolicy: false,
      submissionPolicy,
    };
  }

  async adminDeliverDeclaration(
    traineeId: number,
    dto: AdminDeliverMinistryExamDeclarationDto,
    userId: string,
  ) {
    await this.ensureTraineeExists(traineeId);
    await this.ensureSubmissionAllowed(traineeId);

    const existing = await this.declarationsRepo.findUnique({
      where: { traineeId },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
        branchReceiver: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (existing?.status === 'APPROVED' || existing?.status === 'BRANCH_DELIVERED') {
      throw new BadRequestException(this.buildAlreadyHandledMessage(existing));
    }

    const now = new Date();

    if (dto.deliveryMode === MinistryDeclarationAdminDeliveryMode.DIGITAL_COPY) {
      throw new BadRequestException('الحالة الأونلاين متاحة فقط عند رفع المتدرب للملف من المنصة');
    }

    if (!dto.declarationFileUrl) {
      throw new BadRequestException('رفع صورة واضحة للإقرار إلزامي عند التسليم من الإدارة');
    }

    const fileNameForValidation = dto.declarationFileName || dto.declarationFileUrl;
    if (!this.isAllowedScannedImageFile(fileNameForValidation, dto.declarationFileMimeType)) {
      throw new BadRequestException('نوع الملف غير مدعوم. يُسمح برفع صور واضحة فقط (JPG/PNG/WEBP/BMP/HEIC).');
    }

    // PAPER_ONLY: يعتبر موافق عليه تلقائياً بطريقة الفرع.
    const paperData = {
      submissionMethod: 'BRANCH' as const,
      status: 'BRANCH_DELIVERED' as const,
      declarationFileUrl: dto.declarationFileUrl || null,
      declarationFileCloudinaryId: dto.declarationFileCloudinaryId || null,
      declarationFileName: dto.declarationFileName || null,
      declarationFileMimeType: dto.declarationFileMimeType || null,
      submissionNotes: dto.submissionNotes || null,
      reviewedBy: userId,
      reviewedAt: now,
      rejectionReason: null,
      branchReceivedBy: userId,
      branchReceivedAt: now,
      branchDeliveryNotes: dto.submissionNotes || null,
    };

    return existing
      ? this.declarationsRepo.update({
          where: { id: existing.id },
          data: paperData,
          include: {
            reviewer: { select: { id: true, name: true } },
            branchReceiver: { select: { id: true, name: true } },
          },
        })
      : this.declarationsRepo.create({
          data: {
            traineeId,
            submissionCount: 1,
            ...paperData,
          },
          include: {
            reviewer: { select: { id: true, name: true } },
            branchReceiver: { select: { id: true, name: true } },
          },
        });
  }

  private async ensureTraineeExists(traineeId: number) {
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: { id: true },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }
  }

  private isAllowedOnlineFile(fileName?: string, fileMimeType?: string) {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (fileMimeType && (fileMimeType.startsWith('image/') || allowedMimeTypes.includes(fileMimeType))) {
      return true;
    }

    if (!fileName) {
      return false;
    }

    return /\.(jpg|jpeg|png|gif|webp|bmp|svg|pdf|doc|docx)$/i.test(fileName);
  }

  private isAllowedScannedImageFile(fileName?: string, fileMimeType?: string) {
    const allowedImageMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/bmp',
      'image/heic',
      'image/heif',
    ];

    if (fileMimeType && allowedImageMimeTypes.includes(fileMimeType.toLowerCase())) {
      return true;
    }

    if (!fileName) {
      return false;
    }

    return /\.(jpg|jpeg|png|webp|bmp|heic|heif)$/i.test(fileName);
  }

  async getMyDeclaration(traineeId: number) {
    const submissionPolicy = await this.buildSubmissionPolicyForTrainee(traineeId);

    const declaration = await this.declarationsRepo.findUnique({
      where: { traineeId },
      select: {
        id: true,
        submissionMethod: true,
        status: true,
        declarationFileUrl: true,
        declarationFileName: true,
        declarationFileMimeType: true,
        submissionNotes: true,
        rejectionReason: true,
        submissionCount: true,
        reviewedAt: true,
        branchReceivedAt: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    if (!declaration) {
      return null;
    }

    const isFinalStatus =
      declaration.status === 'APPROVED' || declaration.status === 'BRANCH_DELIVERED';
    const isPendingOnlineReview = declaration.status === 'PENDING_REVIEW';

    return {
      ...declaration,
      isLockedForTrainee: isFinalStatus,
      canSubmitOnline:
        !submissionPolicy.isBlocked && !isFinalStatus && !isPendingOnlineReview,
      canSubmitBranch:
        !submissionPolicy.isBlocked &&
        !isFinalStatus &&
        declaration.status !== 'PENDING_BRANCH_DELIVERY',
      finalizationMessage: isFinalStatus
        ? 'تم اعتماد/استلام الإقرار مسبقاً ولا يمكن التعديل عليه.'
        : submissionPolicy.blockReason,
      submissionPolicy,
    };
  }

  async submitBranchDeclaration(traineeId: number, dto: SubmitBranchDeclarationDto) {
    await this.ensureTraineeExists(traineeId);
    await this.ensureSubmissionAllowed(traineeId);

    const existing = await this.declarationsRepo.findUnique({
      where: { traineeId },
    });

    if (existing?.status === 'APPROVED' || existing?.status === 'BRANCH_DELIVERED') {
      throw new BadRequestException('تم اعتماد/استلام الإقرار مسبقاً ولا يمكن التعديل عليه.');
    }

    if (existing?.status === 'PENDING_REVIEW') {
      throw new BadRequestException('لا يمكن رفع الإقرار مرة أخرى طالما أن الطلب الحالي قيد المراجعة ولم يتم رفضه بعد.');
    }

    const data = {
      submissionMethod: 'BRANCH' as const,
      status: 'PENDING_BRANCH_DELIVERY' as const,
      submissionNotes: dto.submissionNotes,
      declarationFileUrl: null,
      declarationFileCloudinaryId: null,
      declarationFileName: null,
      declarationFileMimeType: null,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      branchReceivedBy: null,
      branchReceivedAt: null,
      branchDeliveryNotes: null,
    };

    const saved = existing
      ? await this.declarationsRepo.update({
          where: { id: existing.id },
          data,
          select: {
            id: true,
            submissionMethod: true,
            status: true,
            declarationFileUrl: true,
            declarationFileName: true,
            declarationFileMimeType: true,
            submissionNotes: true,
            rejectionReason: true,
            submissionCount: true,
            reviewedAt: true,
            branchReceivedAt: true,
            updatedAt: true,
            createdAt: true,
          },
        })
      : await this.declarationsRepo.create({
          data: {
            traineeId,
            submissionCount: 1,
            ...data,
          },
          select: {
            id: true,
            submissionMethod: true,
            status: true,
            declarationFileUrl: true,
            declarationFileName: true,
            declarationFileMimeType: true,
            submissionNotes: true,
            rejectionReason: true,
            submissionCount: true,
            reviewedAt: true,
            branchReceivedAt: true,
            updatedAt: true,
            createdAt: true,
          },
        });

    return saved;
  }

  async submitOnlineDeclaration(traineeId: number, dto: SubmitOnlineDeclarationDto) {
    await this.ensureTraineeExists(traineeId);
    await this.ensureSubmissionAllowed(traineeId);

    const fileNameForValidation = dto.declarationFileName || dto.declarationFileUrl;
    if (!this.isAllowedOnlineFile(fileNameForValidation, dto.declarationFileMimeType)) {
      throw new BadRequestException('نوع الملف غير مدعوم. الأنواع المسموحة: الصور + PDF + Word');
    }

    const existing = await this.declarationsRepo.findUnique({
      where: { traineeId },
    });

    if (existing?.status === 'APPROVED' || existing?.status === 'BRANCH_DELIVERED') {
      throw new BadRequestException('تم اعتماد/استلام الإقرار مسبقاً ولا يمكن التعديل عليه.');
    }

    if (existing?.status === 'PENDING_REVIEW') {
      throw new BadRequestException('لا يمكن رفع الإقرار مرة أخرى طالما أن الطلب الحالي قيد المراجعة ولم يتم رفضه بعد.');
    }

    const data = {
      submissionMethod: 'ONLINE' as const,
      status: 'PENDING_REVIEW' as const,
      declarationFileUrl: dto.declarationFileUrl,
      declarationFileCloudinaryId: dto.declarationFileCloudinaryId || null,
      declarationFileName: dto.declarationFileName || null,
      declarationFileMimeType: dto.declarationFileMimeType || null,
      submissionNotes: dto.submissionNotes,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      branchReceivedBy: null,
      branchReceivedAt: null,
      branchDeliveryNotes: null,
    };

    const saved = existing
      ? await this.declarationsRepo.update({
          where: { id: existing.id },
          data: {
            ...data,
            submissionCount: (existing.submissionCount || 0) + 1,
          },
          select: {
            id: true,
            submissionMethod: true,
            status: true,
            declarationFileUrl: true,
            declarationFileName: true,
            declarationFileMimeType: true,
            submissionNotes: true,
            rejectionReason: true,
            submissionCount: true,
            reviewedAt: true,
            branchReceivedAt: true,
            updatedAt: true,
            createdAt: true,
          },
        })
      : await this.declarationsRepo.create({
          data: {
            traineeId,
            submissionCount: 1,
            ...data,
          },
          select: {
            id: true,
            submissionMethod: true,
            status: true,
            declarationFileUrl: true,
            declarationFileName: true,
            declarationFileMimeType: true,
            submissionNotes: true,
            rejectionReason: true,
            submissionCount: true,
            reviewedAt: true,
            branchReceivedAt: true,
            updatedAt: true,
            createdAt: true,
          },
        });

    return saved;
  }

  async findAll(filters?: {
    status?: string;
    submissionMethod?: string;
    programId?: number;
    search?: string;
    page?: number;
    limit?: number;
    allowedProgramIds?: number[];
  }) {
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.submissionMethod) {
      where.submissionMethod = filters.submissionMethod;
    }

    const traineeConditions: any[] = [];

    if (filters?.search) {
      traineeConditions.push({
        OR: [
          { nameAr: { contains: filters.search } },
          { nationalId: { contains: filters.search } },
          { phone: { contains: filters.search } },
        ],
      });
    }

    if (filters?.allowedProgramIds) {
      traineeConditions.push({
        programId: { in: filters.allowedProgramIds },
      });
    }

    const parsedProgramId = Number(filters?.programId);
    if (Number.isInteger(parsedProgramId) && parsedProgramId > 0) {
      traineeConditions.push({
        programId: parsedProgramId,
      });
    }

    if (traineeConditions.length === 1) {
      where.trainee = traineeConditions[0];
    } else if (traineeConditions.length > 1) {
      where.trainee = { AND: traineeConditions };
    }

    const [items, total] = await Promise.all([
      this.declarationsRepo.findMany({
        where,
        skip,
        take: limit,
        include: {
          trainee: {
            select: {
              id: true,
              nameAr: true,
              nationalId: true,
              phone: true,
              photoUrl: true,
              program: {
                select: {
                  nameAr: true,
                },
              },
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
            },
          },
          branchReceiver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.declarationsRepo.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats(allowedProgramIds?: number[], programId?: number) {
    const parsedProgramId = Number(programId);
    const hasProgramId = Number.isInteger(parsedProgramId) && parsedProgramId > 0;

    let programIdsFilter: number[] | undefined;
    if (hasProgramId && allowedProgramIds?.length) {
      programIdsFilter = allowedProgramIds.includes(parsedProgramId)
        ? [parsedProgramId]
        : [];
    } else if (hasProgramId) {
      programIdsFilter = [parsedProgramId];
    } else if (allowedProgramIds?.length) {
      programIdsFilter = allowedProgramIds;
    }

    const baseWhere = programIdsFilter
      ? { trainee: { programId: { in: programIdsFilter } } }
      : {};

    const [
      total,
      pendingReview,
      needsResubmission,
      approved,
      pendingBranchDelivery,
      branchDelivered,
      online,
      branch,
    ] = await Promise.all([
      this.declarationsRepo.count({ where: baseWhere }),
      this.declarationsRepo.count({ where: { ...baseWhere, status: 'PENDING_REVIEW' } }),
      this.declarationsRepo.count({ where: { ...baseWhere, status: 'NEEDS_RESUBMISSION' } }),
      this.declarationsRepo.count({ where: { ...baseWhere, status: 'APPROVED' } }),
      this.declarationsRepo.count({ where: { ...baseWhere, status: 'PENDING_BRANCH_DELIVERY' } }),
      this.declarationsRepo.count({ where: { ...baseWhere, status: 'BRANCH_DELIVERED' } }),
      this.declarationsRepo.count({ where: { ...baseWhere, submissionMethod: 'ONLINE' } }),
      this.declarationsRepo.count({ where: { ...baseWhere, submissionMethod: 'BRANCH' } }),
    ]);

    return {
      total,
      pendingReview,
      needsResubmission,
      approved,
      pendingBranchDelivery,
      branchDelivered,
      online,
      branch,
    };
  }

  async findOne(id: string) {
    const item = await this.declarationsRepo.findUnique({
      where: { id },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
            phone: true,
            photoUrl: true,
            program: {
              select: {
                nameAr: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
        branchReceiver: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('الإقرار غير موجود');
    }

    return item;
  }

  async reviewOnlineDeclaration(
    id: string,
    dto: ReviewMinistryExamDeclarationDto,
    userId: string,
  ) {
    const item = await this.findOne(id);

    if (item.submissionMethod !== 'ONLINE') {
      throw new BadRequestException('هذا الإقرار ليس من نوع التسليم الأونلاين');
    }

    if (item.status === 'APPROVED' || item.status === 'BRANCH_DELIVERED') {
      throw new BadRequestException('تم اعتماد الإقرار مسبقاً');
    }

    if (
      dto.status === MinistryExamDeclarationReviewStatus.NEEDS_RESUBMISSION &&
      !dto.rejectionReason?.trim()
    ) {
      throw new BadRequestException('يجب إدخال سبب طلب إعادة الرفع');
    }

    return this.declarationsRepo.update({
      where: { id },
      data: {
        status: dto.status,
        rejectionReason:
          dto.status === MinistryExamDeclarationReviewStatus.NEEDS_RESUBMISSION
            ? dto.rejectionReason
            : null,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
        branchReceiver: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async confirmBranchDelivery(
    id: string,
    dto: ConfirmBranchDeliveryDto,
    userId: string,
  ) {
    const item = await this.findOne(id);

    if (item.submissionMethod !== 'BRANCH') {
      throw new BadRequestException('هذا الإقرار ليس من نوع التسليم من الفرع');
    }

    if (item.status !== 'PENDING_BRANCH_DELIVERY') {
      const handledByName = item.branchReceiver?.name || item.reviewer?.name;
      throw new BadRequestException(
        handledByName
          ? `تم استلام الإقرار مسبقاً بواسطة ${handledByName}`
          : 'تم استلام الإقرار مسبقاً',
      );
    }

    const saveScannedCopy = dto.saveScannedCopy === true;

    if (saveScannedCopy) {
      if (!dto.declarationFileUrl) {
        throw new BadRequestException('يرجى رفع الصورة الضوئية للإقرار أو اختيار عدم الحفظ');
      }

      const fileNameForValidation = dto.declarationFileName || dto.declarationFileUrl;
      if (!this.isAllowedOnlineFile(fileNameForValidation, dto.declarationFileMimeType)) {
        throw new BadRequestException('نوع الملف غير مدعوم. الأنواع المسموحة: الصور + PDF + Word');
      }
    }

    return this.declarationsRepo.update({
      where: { id },
      data: {
        status: 'BRANCH_DELIVERED',
        branchReceivedBy: userId,
        branchReceivedAt: new Date(),
        branchDeliveryNotes: dto.branchDeliveryNotes,
        declarationFileUrl: saveScannedCopy ? dto.declarationFileUrl : null,
        declarationFileCloudinaryId: saveScannedCopy
          ? dto.declarationFileCloudinaryId || null
          : null,
        declarationFileName: saveScannedCopy ? dto.declarationFileName || null : null,
        declarationFileMimeType: saveScannedCopy
          ? dto.declarationFileMimeType || null
          : null,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
        branchReceiver: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}
