import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { UnifiedWhatsAppService } from './unified-whatsapp.service';

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
  smartPaymentResult?: any;
  retryCount?: number;
  maxRetries?: number;
  createdAt: number;
  priority: number;
}

type CompletedJob = WhatsAppMessageJob & { completedAt: number };
type FailedJob = WhatsAppMessageJob & { failedAt: number; error: string };

@Injectable()
export class WhatsAppQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppQueueService.name);
  private readonly waitingJobs: WhatsAppMessageJob[] = [];
  private readonly completedJobs: CompletedJob[] = [];
  private readonly failedJobs: FailedJob[] = [];
  private readonly retryTimers = new Set<NodeJS.Timeout>();
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private stopped = false;

  constructor(private readonly whatsappService: UnifiedWhatsAppService) {}

  onModuleInit() {
    this.stopped = false;
    this.startProcessing();
    this.logger.log('WhatsApp in-memory queue started (Redis is not used)');
  }

  onModuleDestroy() {
    this.stopped = true;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    for (const timer of this.retryTimers) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();

    if (this.waitingJobs.length > 0) {
      this.logger.warn(`${this.waitingJobs.length} WhatsApp jobs were still waiting during shutdown`);
    }
  }

  isAvailable(): boolean {
    return !this.stopped;
  }

  private startProcessing() {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(() => {
      void this.processJobs();
    }, 1000);

    void this.processJobs();
  }

  private enqueue(job: WhatsAppMessageJob) {
    if (this.stopped) {
      this.logger.warn(`Ignoring WhatsApp job ${job.id}; queue is stopping`);
      return;
    }

    this.waitingJobs.push(job);
    void this.processJobs();
  }

  async addMessageToQueue(
    phoneNumber: string,
    message: string,
    userId?: string,
    priority = 0,
  ): Promise<void> {
    this.enqueue({
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      type: 'message',
      phoneNumber,
      message,
      userId,
      retryCount: 0,
      maxRetries: 10,
      createdAt: Date.now(),
      priority,
    });
  }

  async addDocumentToQueue(
    phoneNumber: string,
    documentPath: string,
    fileName: string,
    caption?: string,
    userId?: string,
    priority = 0,
  ): Promise<void> {
    this.enqueue({
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      type: 'document',
      phoneNumber,
      documentPath,
      fileName,
      caption,
      userId,
      retryCount: 0,
      maxRetries: 10,
      createdAt: Date.now(),
      priority,
    });
  }

  async addPaymentConfirmationToQueue(
    paymentId: number,
    userId?: string,
    amount?: number,
    priority = 1,
  ): Promise<void> {
    this.enqueue({
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      type: 'payment-confirmation',
      paymentId,
      userId,
      amount,
      phoneNumber: '',
      retryCount: 0,
      maxRetries: 10,
      createdAt: Date.now(),
      priority,
    });
  }

  async addSmartPaymentConfirmationToQueue(
    paymentId: number,
    userId?: string,
    totalAmount?: number,
    smartPaymentResult?: any,
    priority = 1,
  ): Promise<void> {
    this.enqueue({
      id: `smart_payment_${paymentId}_${Date.now()}`,
      type: 'smart-payment-confirmation',
      paymentId,
      userId,
      amount: totalAmount,
      smartPaymentResult,
      priority,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 10,
      phoneNumber: '',
    });
  }

  private getNextJobIndex(): number {
    if (this.waitingJobs.length === 0) {
      return -1;
    }

    let bestIndex = 0;
    for (let index = 1; index < this.waitingJobs.length; index += 1) {
      const candidate = this.waitingJobs[index];
      const best = this.waitingJobs[bestIndex];

      if (
        candidate.priority > best.priority ||
        (candidate.priority === best.priority && candidate.createdAt < best.createdAt)
      ) {
        bestIndex = index;
      }
    }

    return bestIndex;
  }

  private async processJobs(): Promise<void> {
    if (this.stopped || this.isProcessing) {
      return;
    }

    const jobIndex = this.getNextJobIndex();
    if (jobIndex < 0) {
      return;
    }

    this.isProcessing = true;
    const [job] = this.waitingJobs.splice(jobIndex, 1);

    try {
      await this.processJob(job);
    } finally {
      this.isProcessing = false;

      if (!this.stopped && this.waitingJobs.length > 0) {
        setImmediate(() => void this.processJobs());
      }
    }
  }

  private async processJob(job: WhatsAppMessageJob): Promise<void> {
    try {
      this.logger.log(`Processing ${job.type} job ${job.id} (attempt ${(job.retryCount ?? 0) + 1})`);

      if (!await this.whatsappService.isClientReallyReady()) {
        throw new Error('WhatsApp client not ready');
      }

      let success = false;
      switch (job.type) {
        case 'message':
          success = await this.whatsappService.sendMessage(job.phoneNumber, job.message!, job.userId);
          break;
        case 'document':
          success = await this.whatsappService.sendDocument(
            job.phoneNumber,
            job.documentPath!,
            job.fileName!,
            job.caption,
            job.userId,
          );
          break;
        case 'payment-confirmation':
          success = await this.whatsappService.sendPaymentConfirmation(job.paymentId!, job.userId, job.amount);
          break;
        case 'smart-payment-confirmation':
          success = await this.whatsappService.sendSmartPaymentConfirmation(
            job.paymentId!,
            job.userId,
            job.amount,
            job.smartPaymentResult,
          );
          break;
      }

      if (!success) {
        throw new Error(`Failed to process ${job.type} job`);
      }

      this.completedJobs.unshift({ ...job, completedAt: Date.now() });
      this.completedJobs.splice(100);
      this.logger.log(`WhatsApp job ${job.id} completed successfully`);
    } catch (error) {
      const retryCount = (job.retryCount ?? 0) + 1;
      const maxRetries = job.maxRetries ?? 10;

      this.logger.error(`Failed to process WhatsApp job ${job.id}: ${error.message}`);

      if (!this.stopped && retryCount <= maxRetries) {
        job.retryCount = retryCount;
        const delay = Math.min(30_000, 1_000 * 2 ** Math.min(retryCount - 1, 5));
        const timer = setTimeout(() => {
          this.retryTimers.delete(timer);
          this.enqueue(job);
        }, delay);
        this.retryTimers.add(timer);
        this.logger.warn(`Retrying WhatsApp job ${job.id} in ${delay}ms`);
        return;
      }

      this.failedJobs.unshift({
        ...job,
        failedAt: Date.now(),
        error: error?.message || String(error),
      });
      this.failedJobs.splice(50);
    }
  }

  async getQueueStats() {
    return {
      available: this.isAvailable(),
      storage: 'memory',
      waiting: this.waitingJobs.length,
      priority: this.waitingJobs.filter((job) => job.priority >= 1).length,
      completed: this.completedJobs.length,
      failed: this.failedJobs.length,
      total: this.waitingJobs.length + this.completedJobs.length + this.failedJobs.length,
      processing: this.isProcessing,
    };
  }

  async cleanQueue(): Promise<void> {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    for (let index = this.completedJobs.length - 1; index >= 0; index -= 1) {
      if (this.completedJobs[index].completedAt < oneDayAgo) {
        this.completedJobs.splice(index, 1);
      }
    }

    for (let index = this.failedJobs.length - 1; index >= 0; index -= 1) {
      if (this.failedJobs[index].failedAt < oneWeekAgo) {
        this.failedJobs.splice(index, 1);
      }
    }

    this.logger.log('In-memory WhatsApp queue cleaned successfully');
  }
}
