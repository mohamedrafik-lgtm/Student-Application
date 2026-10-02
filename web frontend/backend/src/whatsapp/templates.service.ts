import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  description?: string;
  category: string;
  variables?: any;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTemplateDto {
  name: string;
  content: string;
  description?: string;
  category?: string;
  variables?: any;
}

export interface UpdateTemplateDto {
  name?: string;
  content?: string;
  description?: string;
  category?: string;
  variables?: any;
  isActive?: boolean;
}

@Injectable()
export class MessageTemplatesService {
  private readonly logger = new Logger(MessageTemplatesService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * إنشاء قالب رسالة جديد
   */
  async createTemplate(dto: CreateTemplateDto, userId: string): Promise<MessageTemplate> {
    try {
      // التحقق من عدم تكرار الاسم
      const existingTemplate = await this.prisma.messageTemplate.findFirst({
        where: { 
          name: dto.name,
          isActive: true 
        }
      });

      if (existingTemplate) {
        throw new BadRequestException('يوجد قالب بنفس الاسم مسبقاً');
      }

      // استخراج المتغيرات من المحتوى
      const variables = this.extractVariables(dto.content);

      const template = await this.prisma.messageTemplate.create({
        data: {
          name: dto.name,
          content: dto.content,
          description: dto.description,
          category: dto.category || 'general',
          variables: variables,
          createdBy: userId,
        }
      });

      // تسجيل في سجل التدقيق
      await this.auditService.log({
        action: 'CREATE',
        entity: 'MessageTemplate',
        entityId: template.id,
        userId,
        details: {
          templateName: template.name,
          category: template.category
        }
      });

      this.logger.log(`Template created: ${template.name} by user ${userId}`);
      return template;

    } catch (error) {
      this.logger.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * الحصول على جميع القوالب
   */
  async getAllTemplates(activeOnly: boolean = false): Promise<MessageTemplate[]> {
    try {
      const templates = await this.prisma.messageTemplate.findMany({
        where: activeOnly ? { isActive: true } : {},
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      });

      return templates;
    } catch (error) {
      this.logger.error('Error fetching templates:', error);
      throw error;
    }
  }

  /**
   * الحصول على قالب بالمعرف
   */
  async getTemplateById(id: string): Promise<MessageTemplate> {
    try {
      const template = await this.prisma.messageTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        throw new NotFoundException('القالب غير موجود');
      }

      return template;
    } catch (error) {
      this.logger.error(`Error fetching template ${id}:`, error);
      throw error;
    }
  }

  /**
   * الحصول على القوالب حسب الفئة
   */
  async getTemplatesByCategory(category: string): Promise<MessageTemplate[]> {
    try {
      const templates = await this.prisma.messageTemplate.findMany({
        where: { 
          category,
          isActive: true 
        },
        orderBy: { name: 'asc' }
      });

      return templates;
    } catch (error) {
      this.logger.error(`Error fetching templates for category ${category}:`, error);
      throw error;
    }
  }

  /**
   * تحديث قالب
   */
  async updateTemplate(id: string, dto: UpdateTemplateDto, userId: string): Promise<MessageTemplate> {
    try {
      // التحقق من وجود القالب
      const existingTemplate = await this.getTemplateById(id);

      // التحقق من عدم تكرار الاسم (إذا تم تغييره)
      if (dto.name && dto.name !== existingTemplate.name) {
        const duplicateTemplate = await this.prisma.messageTemplate.findFirst({
          where: { 
            name: dto.name,
            isActive: true,
            id: { not: id }
          }
        });

        if (duplicateTemplate) {
          throw new BadRequestException('يوجد قالب بنفس الاسم مسبقاً');
        }
      }

      // استخراج المتغيرات إذا تم تحديث المحتوى
      const variables = dto.content ? this.extractVariables(dto.content) : existingTemplate.variables;

      const updatedTemplate = await this.prisma.messageTemplate.update({
        where: { id },
        data: {
          ...dto,
          variables: variables,
        }
      });

      // تسجيل في سجل التدقيق
      await this.auditService.log({
        action: 'UPDATE',
        entity: 'MessageTemplate',
        entityId: id,
        userId,
        details: {
          templateName: updatedTemplate.name,
          changes: dto
        }
      });

      this.logger.log(`Template updated: ${updatedTemplate.name} by user ${userId}`);
      return updatedTemplate;

    } catch (error) {
      this.logger.error(`Error updating template ${id}:`, error);
      throw error;
    }
  }

  /**
   * حذف قالب (حذف ناعم)
   */
  async deleteTemplate(id: string, userId: string): Promise<void> {
    try {
      const template = await this.getTemplateById(id);

      // التحقق من عدم استخدام القالب في حملات نشطة
      const activeCampaigns = await this.prisma.whatsAppCampaign.count({
        where: {
          templateId: id,
          status: {
            in: ['draft', 'running', 'paused']
          }
        }
      });

      if (activeCampaigns > 0) {
        throw new BadRequestException('لا يمكن حذف القالب لأنه مستخدم في حملات نشطة');
      }

      await this.prisma.messageTemplate.update({
        where: { id },
        data: { isActive: false }
      });

      // تسجيل في سجل التدقيق
      await this.auditService.log({
        action: 'DELETE',
        entity: 'MessageTemplate',
        entityId: id,
        userId,
        details: {
          templateName: template.name
        }
      });

      this.logger.log(`Template deleted: ${template.name} by user ${userId}`);

    } catch (error) {
      this.logger.error(`Error deleting template ${id}:`, error);
      throw error;
    }
  }

  /**
   * معاينة قالب مع بيانات تجريبية
   */
  async previewTemplate(id: string, sampleData?: any): Promise<{ content: string; variables: string[] }> {
    try {
      const template = await this.getTemplateById(id);
      
      // بيانات تجريبية افتراضية
      const defaultSampleData = {
        trainee_name: 'أحمد محمد علي',
        program_name: 'مساعد خدمات صحية',
        center_name: 'مركز طيبة للتدريب المهني',
        registration_number: '000123',
        phone: '01012345678',
        current_date: new Date().toLocaleDateString('ar-EG'),
        current_time: new Date().toLocaleTimeString('ar-EG')
      };

      const data = { ...defaultSampleData, ...sampleData };
      const processedContent = this.processTemplate(template.content, data);
      const variables = this.extractVariables(template.content);

      return {
        content: processedContent,
        variables
      };

    } catch (error) {
      this.logger.error(`Error previewing template ${id}:`, error);
      throw error;
    }
  }

  /**
   * معالجة قالب مع بيانات فعلية
   */
  processTemplate(content: string, data: any): string {
    let processedContent = content;

    // استبدال المتغيرات بالقيم
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedContent = processedContent.replace(regex, data[key] || '');
    });

    return processedContent;
  }

  /**
   * استخراج المتغيرات من المحتوى
   */
  private extractVariables(content: string): string[] {
    const matches = content.match(/{{([^}]+)}}/g);
    if (!matches) return [];

    return matches
      .map(match => match.replace(/[{}]/g, '').trim())
      .filter((value, index, self) => self.indexOf(value) === index); // إزالة المكررات
  }

  /**
   * الحصول على القوالب المُجمعة حسب الفئة
   */
  async getTemplatesGroupedByCategory(): Promise<{ [category: string]: MessageTemplate[] }> {
    try {
      const templates = await this.getAllTemplates(true);
      
      const grouped = templates.reduce((acc, template) => {
        if (!acc[template.category]) {
          acc[template.category] = [];
        }
        acc[template.category].push(template);
        return acc;
      }, {} as { [category: string]: MessageTemplate[] });

      return grouped;
    } catch (error) {
      this.logger.error('Error grouping templates by category:', error);
      throw error;
    }
  }

  /**
   * نسخ قالب موجود
   */
  async duplicateTemplate(id: string, newName: string, userId: string): Promise<MessageTemplate> {
    try {
      const originalTemplate = await this.getTemplateById(id);
      
      const duplicatedTemplate = await this.createTemplate({
        name: newName,
        content: originalTemplate.content,
        description: `نسخة من: ${originalTemplate.description || originalTemplate.name}`,
        category: originalTemplate.category,
        variables: originalTemplate.variables
      }, userId);

      this.logger.log(`Template duplicated: ${originalTemplate.name} -> ${newName} by user ${userId}`);
      return duplicatedTemplate;

    } catch (error) {
      this.logger.error(`Error duplicating template ${id}:`, error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات القوالب
   */
  async getTemplatesStats(): Promise<{
    total: number;
    active: number;
    byCategory: { [category: string]: number };
    recentlyUsed: MessageTemplate[];
  }> {
    try {
      const [total, active, allTemplates, recentCampaigns] = await Promise.all([
        this.prisma.messageTemplate.count(),
        this.prisma.messageTemplate.count({ where: { isActive: true } }),
        this.prisma.messageTemplate.findMany({ where: { isActive: true } }),
        this.prisma.whatsAppCampaign.findMany({
          where: { templateId: { not: null } },
          include: { template: true },
          orderBy: { createdAt: 'desc' },
          take: 5
        })
      ]);

      // تجميع حسب الفئة
      const byCategory = allTemplates.reduce((acc, template) => {
        acc[template.category] = (acc[template.category] || 0) + 1;
        return acc;
      }, {} as { [category: string]: number });

      // القوالب المستخدمة مؤخراً
      const recentlyUsed = recentCampaigns
        .filter(campaign => campaign.template)
        .map(campaign => campaign.template!)
        .filter((template, index, self) => 
          self.findIndex(t => t.id === template.id) === index
        );

      return {
        total,
        active,
        byCategory,
        recentlyUsed
      };

    } catch (error) {
      this.logger.error('Error fetching templates stats:', error);
      throw error;
    }
  }
}
