import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UnifiedWhatsAppService } from './unified-whatsapp.service';
import { MessageTemplatesService } from './templates.service';

export interface WhatsAppCampaign {
  id: string;
  name: string;
  description?: string;
  templateId?: string;
  message: string;
  delayBetweenMessages: number;
  targetType: string;
  targetProgramId?: number;
  targetTraineeIds?: any;
  status: string;
  totalTargets: number;
  sentCount: number;
  failedCount: number;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  traineeId: number;
  status: string;
  phoneNumber: string;
  message: string;
  scheduledAt?: Date;
  sentAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  retryCount: number;
}

export interface CreateCampaignDto {
  name: string;
  description?: string;
  templateId?: string;
  message: string;
  delayBetweenMessages?: number;
  targetType: 'all' | 'program' | 'custom';
  targetProgramId?: number;
  targetTraineeIds?: number[];
  scheduledAt?: Date;
}

export interface UpdateCampaignDto {
  name?: string;
  description?: string;
  message?: string;
  delayBetweenMessages?: number;
  scheduledAt?: Date;
}

@Injectable()
export class WhatsAppCampaignsService {
  private readonly logger = new Logger(WhatsAppCampaignsService.name);
  private activeCampaigns = new Map<string, NodeJS.Timeout>();

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private whatsappService: UnifiedWhatsAppService,
    private templatesService: MessageTemplatesService,
  ) {}

  /**
   * إنشاء حملة جديدة
   */
  async createCampaign(dto: CreateCampaignDto, userId: string): Promise<WhatsAppCampaign> {
    try {
      // التحقق من صحة البيانات
      if (dto.targetType === 'program' && !dto.targetProgramId) {
        throw new BadRequestException('يجب تحديد البرنامج عند اختيار استهداف برنامج محدد');
      }

      if (dto.targetType === 'custom' && (!dto.targetTraineeIds || dto.targetTraineeIds.length === 0)) {
        throw new BadRequestException('يجب تحديد المتدربين عند اختيار الاستهداف المخصص');
      }

      // الحصول على المتدربين المستهدفين
      const targetTrainees = await this.getTargetTrainees(dto.targetType, dto.targetProgramId, dto.targetTraineeIds);
      
      if (targetTrainees.length === 0) {
        throw new BadRequestException('لا يوجد متدربين مؤهلين للاستهداف');
      }

      // حساب المدة المتوقعة
      const estimatedDuration = targetTrainees.length * (dto.delayBetweenMessages || 5);

      // إنشاء الحملة
      const campaign = await this.prisma.whatsAppCampaign.create({
        data: {
          name: dto.name,
          description: dto.description,
          templateId: dto.templateId,
          message: dto.message,
          delayBetweenMessages: dto.delayBetweenMessages || 5,
          targetType: dto.targetType,
          targetProgramId: dto.targetProgramId,
          targetTraineeIds: dto.targetTraineeIds,
          totalTargets: targetTrainees.length,
          estimatedDuration,
          scheduledAt: dto.scheduledAt,
          createdBy: userId,
        }
      });

      // إنشاء سجلات المستلمين
      await this.createCampaignRecipients(campaign.id, targetTrainees, dto.message);

      // تسجيل في سجل التدقيق
      await this.auditService.log({
        action: 'CREATE',
        entity: 'WhatsAppCampaign',
        entityId: campaign.id,
        userId,
        details: {
          campaignName: campaign.name,
          targetType: campaign.targetType,
          totalTargets: campaign.totalTargets
        }
      });

      this.logger.log(`Campaign created: ${campaign.name} with ${targetTrainees.length} targets by user ${userId}`);
      return campaign;

    } catch (error) {
      this.logger.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * الحصول على جميع الحملات
   */
  async getAllCampaigns(userId?: string): Promise<WhatsAppCampaign[]> {
    try {
      const campaigns = await this.prisma.whatsAppCampaign.findMany({
        where: userId ? { createdBy: userId } : {},
        include: {
          template: true,
          _count: {
            select: {
              campaignRecipients: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return campaigns;
    } catch (error) {
      this.logger.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  /**
   * الحصول على حملة بالمعرف
   */
  async getCampaignById(id: string): Promise<WhatsAppCampaign> {
    try {
      const campaign = await this.prisma.whatsAppCampaign.findUnique({
        where: { id },
        include: {
          template: true,
          campaignRecipients: {
            include: {
              trainee: {
                select: {
                  id: true,
                  nameAr: true,
                  phone: true,
                  program: {
                    select: {
                      nameAr: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!campaign) {
        throw new NotFoundException('الحملة غير موجودة');
      }

      return campaign;
    } catch (error) {
      this.logger.error(`Error fetching campaign ${id}:`, error);
      throw error;
    }
  }

  /**
   * تحديث حملة
   */
  async updateCampaign(id: string, dto: UpdateCampaignDto, userId: string): Promise<WhatsAppCampaign> {
    try {
      const campaign = await this.getCampaignById(id);

      // التحقق من أن الحملة لم تبدأ بعد
      if (campaign.status !== 'draft') {
        throw new BadRequestException('لا يمكن تعديل حملة تم تشغيلها');
      }

      const updatedCampaign = await this.prisma.whatsAppCampaign.update({
        where: { id },
        data: dto
      });

      // تحديث رسائل المستلمين إذا تغيرت الرسالة
      if (dto.message) {
        await this.prisma.campaignRecipient.updateMany({
          where: { campaignId: id },
          data: { message: dto.message }
        });
      }

      // تسجيل في سجل التدقيق
      await this.auditService.log({
        action: 'UPDATE',
        entity: 'WhatsAppCampaign',
        entityId: id,
        userId,
        details: {
          campaignName: updatedCampaign.name,
          changes: dto
        }
      });

      this.logger.log(`Campaign updated: ${updatedCampaign.name} by user ${userId}`);
      return updatedCampaign;

    } catch (error) {
      this.logger.error(`Error updating campaign ${id}:`, error);
      throw error;
    }
  }

  /**
   * حذف حملة
   */
  async deleteCampaign(id: string, userId: string): Promise<void> {
    try {
      const campaign = await this.getCampaignById(id);

      // إيقاف الحملة إذا كانت تعمل
      if (campaign.status === 'running') {
        await this.pauseCampaign(id, userId);
      }

      await this.prisma.whatsAppCampaign.delete({
        where: { id }
      });

      // تسجيل في سجل التدقيق
      await this.auditService.log({
        action: 'DELETE',
        entity: 'WhatsAppCampaign',
        entityId: id,
        userId,
        details: {
          campaignName: campaign.name
        }
      });

      this.logger.log(`Campaign deleted: ${campaign.name} by user ${userId}`);

    } catch (error) {
      this.logger.error(`Error deleting campaign ${id}:`, error);
      throw error;
    }
  }

  /**
   * بدء تشغيل حملة
   */
  async startCampaign(id: string, userId: string): Promise<void> {
    try {
      const campaign = await this.getCampaignById(id);

      if (campaign.status !== 'draft' && campaign.status !== 'paused') {
        throw new BadRequestException('الحملة تعمل بالفعل أو مكتملة');
      }

      // التحقق من جاهزية واتساب
      const whatsappStatus = await this.whatsappService.getStatus();
      if (!whatsappStatus.isReady || !whatsappStatus.isConnected) {
        throw new BadRequestException('واتساب غير متصل، يرجى التأكد من الاتصال أولاً');
      }

      // تحديث حالة الحملة
      await this.prisma.whatsAppCampaign.update({
        where: { id },
        data: {
          status: 'running',
          startedAt: new Date()
        }
      });

      // بدء إرسال الرسائل
      this.processCampaign(id);

      // تسجيل في سجل التدقيق
      await this.auditService.log({
        action: 'START',
        entity: 'WhatsAppCampaign',
        entityId: id,
        userId,
        details: {
          campaignName: campaign.name
        }
      });

      this.logger.log(`Campaign started: ${campaign.name} by user ${userId}`);

    } catch (error) {
      this.logger.error(`Error starting campaign ${id}:`, error);
      throw error;
    }
  }

  /**
   * إيقاف حملة مؤقتاً
   */
  async pauseCampaign(id: string, userId: string): Promise<void> {
    try {
      const campaign = await this.getCampaignById(id);

      if (campaign.status !== 'running') {
        throw new BadRequestException('الحملة غير قيد التشغيل');
      }

      // إيقاف عملية الإرسال
      const timeout = this.activeCampaigns.get(id);
      if (timeout) {
        clearTimeout(timeout);
        this.activeCampaigns.delete(id);
      }

      // تحديث حالة الحملة
      await this.prisma.whatsAppCampaign.update({
        where: { id },
        data: { status: 'paused' }
      });

      // تسجيل في سجل التدقيق
      await this.auditService.log({
        action: 'PAUSE',
        entity: 'WhatsAppCampaign',
        entityId: id,
        userId,
        details: {
          campaignName: campaign.name
        }
      });

      this.logger.log(`Campaign paused: ${campaign.name} by user ${userId}`);

    } catch (error) {
      this.logger.error(`Error pausing campaign ${id}:`, error);
      throw error;
    }
  }

  /**
   * إيقاف حملة نهائياً
   */
  async stopCampaign(id: string, userId: string): Promise<void> {
    try {
      const campaign = await this.getCampaignById(id);

      if (!['running', 'paused'].includes(campaign.status)) {
        throw new BadRequestException('لا يمكن إيقاف هذه الحملة');
      }

      // إيقاف عملية الإرسال
      const timeout = this.activeCampaigns.get(id);
      if (timeout) {
        clearTimeout(timeout);
        this.activeCampaigns.delete(id);
      }

      // تحديث حالة الحملة إلى مكتملة أو فاشلة
      const sentCount = await this.prisma.campaignRecipient.count({
        where: { campaignId: id, status: 'sent' }
      });
      const totalTargets = campaign.totalTargets;
      const finalStatus = sentCount > 0 ? 'completed' : 'failed';

      await this.prisma.whatsAppCampaign.update({
        where: { id },
        data: {
          status: finalStatus,
          completedAt: new Date()
        }
      });

      // تسجيل في سجل التدقيق
      await this.auditService.log({
        action: 'STOP_WHATSAPP_CAMPAIGN',
        entity: 'WhatsAppCampaign',
        entityId: id,
        userId,
        details: {
          campaignName: campaign.name,
          finalStatus,
          sentCount,
          totalTargets
        }
      });

      this.logger.log(`Campaign stopped: ${campaign.name} by user ${userId} - Final status: ${finalStatus}`);

    } catch (error) {
      this.logger.error(`Error stopping campaign ${id}:`, error);
      throw error;
    }
  }

  /**
   * معالجة حملة (إرسال الرسائل)
   */
  private async processCampaign(campaignId: string): Promise<void> {
    try {
      const campaign = await this.getCampaignById(campaignId);
      
      if (campaign.status !== 'running') {
        return;
      }

      // الحصول على الرسائل المعلقة
        const pendingRecipients = await this.prisma.campaignRecipient.findMany({
          where: {
            campaignId,
            status: 'pending'
          },
          include: {
            trainee: {
              include: {
                program: true
              }
            }
          },
          orderBy: { createdAt: 'asc' },
          take: 1
        });

      if (pendingRecipients.length === 0) {
        // انتهت الحملة
        await this.completeCampaign(campaignId);
        return;
      }

      const recipient = pendingRecipients[0];

      try {
        // تحديث حالة المستلم إلى "قيد الإرسال"
        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'sending',
            scheduledAt: new Date()
          }
        });

        // معالجة الرسالة مع بيانات المتدرب
        const processedMessage = this.templatesService.processTemplate(recipient.message, {
          trainee_name: recipient.trainee.nameAr,
          program_name: recipient.trainee.program?.nameAr || 'غير محدد',
          registration_number: recipient.trainee.id.toString().padStart(6, '0'),
          phone: recipient.trainee.phone,
          current_date: new Date().toLocaleDateString('ar-EG'),
          current_time: new Date().toLocaleTimeString('ar-EG')
        });

        // إرسال الرسالة
        const success = await this.whatsappService.sendMessage(
          recipient.phoneNumber,
          processedMessage,
          campaign.createdBy
        );

        if (success) {
          // تحديث حالة النجاح
          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'sent',
              sentAt: new Date()
            }
          });

          // تحديث عداد الحملة
          await this.prisma.whatsAppCampaign.update({
            where: { id: campaignId },
            data: {
              sentCount: { increment: 1 }
            }
          });

          this.logger.log(`Message sent to ${recipient.trainee.nameAr} (${recipient.phoneNumber})`);
        } else {
          throw new Error('فشل في إرسال الرسالة');
        }

      } catch (error) {
        // تحديث حالة الفشل
        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'failed',
            failedAt: new Date(),
            errorMessage: error.message,
            retryCount: { increment: 1 }
          }
        });

        // تحديث عداد الفشل
        await this.prisma.whatsAppCampaign.update({
          where: { id: campaignId },
          data: {
            failedCount: { increment: 1 }
          }
        });

        this.logger.error(`Failed to send message to ${recipient.trainee.nameAr}: ${error.message}`);
      }

      // جدولة الرسالة التالية
      const timeout = setTimeout(() => {
        this.processCampaign(campaignId);
      }, campaign.delayBetweenMessages * 1000);

      this.activeCampaigns.set(campaignId, timeout);

    } catch (error) {
      this.logger.error(`Error processing campaign ${campaignId}:`, error);
      
      // تحديث حالة الحملة إلى فاشلة
      await this.prisma.whatsAppCampaign.update({
        where: { id: campaignId },
        data: { status: 'failed' }
      });
    }
  }

  /**
   * إكمال حملة
   */
  private async completeCampaign(campaignId: string): Promise<void> {
    try {
      await this.prisma.whatsAppCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'completed',
          completedAt: new Date()
        }
      });

      // إزالة من الحملات النشطة
      this.activeCampaigns.delete(campaignId);

      this.logger.log(`Campaign completed: ${campaignId}`);

    } catch (error) {
      this.logger.error(`Error completing campaign ${campaignId}:`, error);
    }
  }

  /**
   * الحصول على المتدربين المستهدفين
   */
  private async getTargetTrainees(targetType: string, programId?: number, traineeIds?: number[]): Promise<any[]> {
    try {
      let whereClause: any = {};

      if (targetType === 'program' && programId) {
        whereClause.programId = programId;
      } else if (targetType === 'custom' && traineeIds && traineeIds.length > 0) {
        whereClause.id = { in: traineeIds };
      }

      // إضافة شرط لضمان وجود رقم هاتف صالح
      whereClause.phone = {
        not: ''
      };

      const trainees = await this.prisma.trainee.findMany({
        where: whereClause,
        include: {
          program: {
            select: {
              id: true,
              nameAr: true
            }
          }
        }
      });

      return trainees;
    } catch (error) {
      this.logger.error('Error fetching target trainees:', error);
      throw error;
    }
  }

  /**
   * إنشاء سجلات المستلمين
   */
  private async createCampaignRecipients(campaignId: string, trainees: any[], message: string): Promise<void> {
    try {
      const recipients = trainees.map(trainee => ({
        campaignId,
        traineeId: trainee.id,
        phoneNumber: trainee.phone,
        message,
        status: 'pending'
      }));

      await this.prisma.campaignRecipient.createMany({
        data: recipients
      });

      this.logger.log(`Created ${recipients.length} recipients for campaign ${campaignId}`);

    } catch (error) {
      this.logger.error(`Error creating campaign recipients:`, error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات الحملة
   */
  async getCampaignStats(id: string): Promise<{
    totalTargets: number;
    sentCount: number;
    failedCount: number;
    pendingCount: number;
    successRate: number;
    estimatedTimeRemaining: number;
  }> {
    try {
      const campaign = await this.getCampaignById(id);
      
      const [sentCount, failedCount, pendingCount] = await Promise.all([
        this.prisma.campaignRecipient.count({
          where: { campaignId: id, status: 'sent' }
        }),
        this.prisma.campaignRecipient.count({
          where: { campaignId: id, status: 'failed' }
        }),
        this.prisma.campaignRecipient.count({
          where: { campaignId: id, status: 'pending' }
        })
      ]);

      const successRate = campaign.totalTargets > 0 ? (sentCount / campaign.totalTargets) * 100 : 0;
      const estimatedTimeRemaining = pendingCount * campaign.delayBetweenMessages;

      return {
        totalTargets: campaign.totalTargets,
        sentCount,
        failedCount,
        pendingCount,
        successRate,
        estimatedTimeRemaining
      };

    } catch (error) {
      this.logger.error(`Error fetching campaign stats ${id}:`, error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات عامة للحملات
   */
  async getOverallStats(): Promise<{
    totalCampaigns: number;
    activeCampaigns: number;
    completedCampaigns: number;
    totalMessagesSent: number;
    averageSuccessRate: number;
  }> {
    try {
      const [campaigns, totalMessagesSent] = await Promise.all([
        this.prisma.whatsAppCampaign.findMany({
          select: {
            status: true,
            sentCount: true,
            totalTargets: true
          }
        }),
        this.prisma.campaignRecipient.count({
          where: { status: 'sent' }
        })
      ]);

      const totalCampaigns = campaigns.length;
      const activeCampaigns = campaigns.filter(c => c.status === 'running').length;
      const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;

      // حساب متوسط معدل النجاح
      const campaignsWithTargets = campaigns.filter(c => c.totalTargets > 0);
      const averageSuccessRate = campaignsWithTargets.length > 0 
        ? campaignsWithTargets.reduce((sum, c) => sum + (c.sentCount / c.totalTargets), 0) / campaignsWithTargets.length * 100
        : 0;

      return {
        totalCampaigns,
        activeCampaigns,
        completedCampaigns,
        totalMessagesSent,
        averageSuccessRate: Math.round(averageSuccessRate * 100) / 100
      };

    } catch (error) {
      this.logger.error('Error fetching overall stats:', error);
      throw error;
    }
  }
}
