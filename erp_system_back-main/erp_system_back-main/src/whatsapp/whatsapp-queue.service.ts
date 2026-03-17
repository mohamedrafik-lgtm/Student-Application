import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisLocalService } from '../redis/redis-local.service';
import { UnifiedWhatsAppService } from './unified-whatsapp.service';
import Redis from 'ioredis';

export interface WhatsAppMessageJob {
  id: string;
  type: 'message' | 'document' | 'payment-confirmation' | 'smart-payment-confirmation';
  phoneNumber: string;
  message?: string;
  documentPath?: string;
  fileName?: string;
  caption?: string;
  paymentId?: number;
  userId?: string;
  amount?: number;
  smartPaymentResult?: any; // للدفع الذكي
  retryCount?: number;
  maxRetries?: number;
  createdAt: number;
  priority: number;
}

@Injectable()
export class WhatsAppQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppQueueService.name);
  private redisClient: Redis | null = null;
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private redisLocalService: RedisLocalService,
    private whatsappService: UnifiedWhatsAppService,
  ) {}

  /**
   * التحقق من توفر Redis
   */
  async isRedisAvailable(): Promise<boolean> {
    return this.redisLocalService.isRedisAvailable();
  }

  async onModuleInit() {
    try {
      // انتظار Redis ليصبح جاهز
      await new Promise(resolve => setTimeout(resolve, 3000));

      if (this.redisLocalService.isRedisAvailable()) {
        this.redisClient = this.redisLocalService.createClient();
        if (this.redisClient) {
          this.logger.log('✅ WhatsApp Queue connected to Redis');
          this.startProcessing();
        }
      } else {
        this.logger.warn('⚠️ Redis not available, Queue will not work');
      }
    } catch (error) {
      this.logger.error('❌ Failed to initialize WhatsApp Queue:', error);
    }
  }

  async onModuleDestroy() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  private startProcessing() {
    // معالجة المهام كل 5 ثوان
    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processJobs();
      }
    }, 5000);
  }

  /**
   * إضافة رسالة نصية إلى Queue
   */
  async addMessageToQueue(phoneNumber: string, message: string, userId?: string, priority: number = 0): Promise<void> {
    if (!this.redisClient) {
      this.logger.warn('Redis not available, cannot add message to queue');
      return;
    }

    try {
      const job: WhatsAppMessageJob = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'message',
        phoneNumber,
        message,
        userId,
        retryCount: 0,
        createdAt: Date.now(),
        priority
      };

      await this.redisClient.lpush('whatsapp:queue', JSON.stringify(job));
      this.logger.log(`[Queue] Message added to queue for ${phoneNumber}`);
    } catch (error) {
      this.logger.error(`[Queue] Failed to add message to queue:`, error);
    }
  }

  /**
   * إضافة وثيقة إلى Queue
   */
  async addDocumentToQueue(
    phoneNumber: string,
    documentPath: string,
    fileName: string,
    caption?: string,
    userId?: string,
    priority: number = 0
  ): Promise<void> {
    if (!this.redisClient) {
      this.logger.warn('Redis not available, cannot add document to queue');
      return;
    }

    try {
      const job: WhatsAppMessageJob = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'document',
        phoneNumber,
        documentPath,
        fileName,
        caption,
        userId,
        retryCount: 0,
        createdAt: Date.now(),
        priority
      };

      await this.redisClient.lpush('whatsapp:queue', JSON.stringify(job));
      this.logger.log(`[Queue] Document added to queue for ${phoneNumber}: ${fileName}`);
    } catch (error) {
      this.logger.error(`[Queue] Failed to add document to queue:`, error);
    }
  }

  /**
   * إضافة تأكيد دفع إلى Queue
   */
  async addPaymentConfirmationToQueue(
    paymentId: number,
    userId?: string,
    amount?: number,
    priority: number = 1
  ): Promise<void> {
    if (!this.redisClient) {
      this.logger.warn('Redis not available, cannot add payment confirmation to queue');
      return;
    }

    try {
      const job: WhatsAppMessageJob = {
        id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'payment-confirmation',
        paymentId,
        userId,
        amount,
        phoneNumber: '', // سيتم جلبه من قاعدة البيانات
        retryCount: 0,
        createdAt: Date.now(),
        priority
      };

      // المدفوعات لها أولوية عالية
      if (priority >= 1) {
        await this.redisClient.rpush('whatsapp:priority', JSON.stringify(job));
      } else {
        await this.redisClient.lpush('whatsapp:queue', JSON.stringify(job));
      }

      this.logger.log(`[Queue] Payment confirmation added to queue for payment ${paymentId}`);
    } catch (error) {
      this.logger.error(`[Queue] Failed to add payment confirmation to queue:`, error);
    }
  }

  /**
   * معالجة المهام من Queue
   */
  private async processJobs(): Promise<void> {
    if (!this.redisClient || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // معالجة المهام عالية الأولوية أولاً
      let jobData = await this.redisClient.rpop('whatsapp:priority');

      // إذا لم توجد مهام عالية الأولوية، معالجة المهام العادية
      if (!jobData) {
        jobData = await this.redisClient.rpop('whatsapp:queue');
      }

      if (jobData) {
        const job: WhatsAppMessageJob = JSON.parse(jobData);
        await this.processJob(job);
      }
    } catch (error) {
      this.logger.error('[Queue] Error processing jobs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * معالج مهمة واحدة
   */
  private async processJob(job: WhatsAppMessageJob): Promise<void> {
    try {
      this.logger.log(`[Queue] Processing ${job.type} job ${job.id} (attempt ${job.retryCount + 1})`);

      // التحقق من جاهزية الواتساب
      const isReady = await this.whatsappService.isClientReallyReady();
      if (!isReady) {
        throw new Error('WhatsApp client not ready');
      }

      let success = false;

      switch (job.type) {
        case 'message':
          success = await this.whatsappService.sendMessage(job.phoneNumber, job.message!, job.userId);
          break;

        case 'document':
          success = await this.whatsappService.sendDocument(job.phoneNumber, job.documentPath!, job.fileName!, job.caption, job.userId);
          break;

        case 'payment-confirmation':
          success = await this.whatsappService.sendPaymentConfirmation(job.paymentId!, job.userId, job.amount);
          break;

        case 'smart-payment-confirmation':
          success = await this.whatsappService.sendSmartPaymentConfirmation(job.paymentId!, job.userId, job.amount, job.smartPaymentResult);
          break;
      }

      if (success) {
        this.logger.log(`[Queue] ✅ ${job.type} job ${job.id} completed successfully`);
        // إضافة إلى قائمة المكتملة
        await this.redisClient?.lpush('whatsapp:completed', JSON.stringify({
          ...job,
          completedAt: Date.now()
        }));
        // الاحتفاظ بآخر 100 مهمة مكتملة فقط
        await this.redisClient?.ltrim('whatsapp:completed', 0, 99);
      } else {
        throw new Error(`Failed to process ${job.type} job`);
      }

    } catch (error) {
      this.logger.error(`[Queue] ❌ Failed to process job ${job.id}:`, error);

      // إعادة المحاولة إذا لم تتجاوز الحد الأقصى
      if (job.retryCount < 3) {
        job.retryCount++;
        // إعادة إضافة المهمة للـ queue مع تأخير
        setTimeout(async () => {
          if (job.priority >= 1) {
            await this.redisClient?.lpush('whatsapp:priority', JSON.stringify(job));
          } else {
            await this.redisClient?.lpush('whatsapp:queue', JSON.stringify(job));
          }
        }, 5000 * job.retryCount); // تأخير متزايد
      } else {
        // إضافة إلى قائمة الفاشلة
        await this.redisClient?.lpush('whatsapp:failed', JSON.stringify({
          ...job,
          failedAt: Date.now(),
          error: error.message
        }));
        // الاحتفاظ بآخر 50 مهمة فاشلة فقط
        await this.redisClient?.ltrim('whatsapp:failed', 0, 49);
      }
    }
  }

  /**
   * الحصول على إحصائيات Queue
   */
  async getQueueStats() {
    if (!this.redisClient) {
      return {
        available: false,
        message: 'Redis not available'
      };
    }

    try {
      const waiting = await this.redisClient.llen('whatsapp:queue');
      const priority = await this.redisClient.llen('whatsapp:priority');
      const completed = await this.redisClient.llen('whatsapp:completed');
      const failed = await this.redisClient.llen('whatsapp:failed');

      return {
        available: true,
        waiting: waiting,
        priority: priority,
        completed: completed,
        failed: failed,
        total: waiting + priority + completed + failed,
        processing: this.isProcessing
      };
    } catch (error) {
      this.logger.error('[Queue] Failed to get queue stats:', error);
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * تنظيف Queue من المهام القديمة
   */
  async cleanQueue(): Promise<void> {
    if (!this.redisClient) {
      this.logger.warn('Redis not available, cannot clean queue');
      return;
    }

    try {
      // تنظيف المهام المكتملة القديمة (أكثر من 24 ساعة)
      const completedJobs = await this.redisClient.lrange('whatsapp:completed', 0, -1);
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);

      for (const jobData of completedJobs) {
        try {
          const job = JSON.parse(jobData);
          if (job.completedAt && job.completedAt < oneDayAgo) {
            await this.redisClient.lrem('whatsapp:completed', 1, jobData);
          }
        } catch (parseError) {
          // إزالة المهام التي لا يمكن تحليلها
          await this.redisClient.lrem('whatsapp:completed', 1, jobData);
        }
      }

      // تنظيف المهام الفاشلة القديمة (أكثر من 7 أيام)
      const failedJobs = await this.redisClient.lrange('whatsapp:failed', 0, -1);
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

      for (const jobData of failedJobs) {
        try {
          const job = JSON.parse(jobData);
          if (job.failedAt && job.failedAt < oneWeekAgo) {
            await this.redisClient.lrem('whatsapp:failed', 1, jobData);
          }
        } catch (parseError) {
          // إزالة المهام التي لا يمكن تحليلها
          await this.redisClient.lrem('whatsapp:failed', 1, jobData);
        }
      }

      this.logger.log('[Queue] Queue cleaned successfully');
    } catch (error) {
      this.logger.error('[Queue] Failed to clean queue:', error);
    }
  }

  /**
   * إضافة تأكيد دفع ذكي شامل إلى Queue
   */
  async addSmartPaymentConfirmationToQueue(paymentId: number, userId?: string, totalAmount?: number, smartPaymentResult?: any, priority: number = 1): Promise<void> {
    const job: WhatsAppMessageJob = {
      id: `smart_payment_${paymentId}_${Date.now()}`,
      type: 'smart-payment-confirmation',
      paymentId,
      userId,
      amount: totalAmount,
      smartPaymentResult,
      priority,
      createdAt: Date.now(),
      retryCount: 0,
      phoneNumber: '', // سيتم الحصول عليه من بيانات المتدرب
      maxRetries: 3
    };

    if (!this.redisClient) {
      this.logger.warn('Redis not available, cannot add smart payment confirmation to queue');
      return;
    }

    try {
      if (job.priority > 1) {
        await this.redisClient.lpush('whatsapp:priority', JSON.stringify(job));
      } else {
        await this.redisClient.lpush('whatsapp:queue', JSON.stringify(job));
      }
      this.logger.log(`[Queue] Smart payment confirmation added to queue for payment ${paymentId}`);
    } catch (error) {
      this.logger.error(`[Queue] Failed to add smart payment confirmation to queue:`, error);
      throw error;
    }
  }

}
