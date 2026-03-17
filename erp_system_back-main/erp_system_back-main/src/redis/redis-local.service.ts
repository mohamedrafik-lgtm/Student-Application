import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisLocalService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisLocalService.name);
  private redisClient: Redis | null = null;
  private redisUrl: string | null = null;

  async onModuleInit() {
    try {
      // التحقق من وجود Redis URL خارجي أولاً
      if (process.env.REDIS_URL) {
        this.logger.log('🔗 Using external Redis from REDIS_URL');
        this.redisUrl = process.env.REDIS_URL;
        return;
      }

      // التحقق من إعدادات Redis محلية
      if (process.env.REDIS_HOST && process.env.REDIS_HOST !== 'localhost') {
        this.logger.log('🔗 Using external Redis from REDIS_HOST');
        this.redisUrl = `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`;
        return;
      }

      // محاولة الاتصال بـ Redis محلي موجود
      try {
        const testClient = new Redis({
          host: 'localhost',
          port: 6379,
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
          lazyConnect: true,
          retryStrategy: () => null, // لا تعيد المحاولة تلقائياً
        });

        // إزالة معالجات الأخطاء الافتراضية
        testClient.on('error', (err) => {
          // تجاهل الأخطاء
        });

        await testClient.ping();
        await testClient.quit();
        
        this.logger.log('✅ Found existing local Redis server at localhost:6379');
        this.redisUrl = 'redis://localhost:6379';
        return;
      } catch (error) {
        this.logger.log('🔍 No existing Redis found locally');
        this.logger.warn('⚠️ Redis not available - Queue functionality will be disabled');
        // لا تفعل شيئاً، النظام سيعمل بدون Redis
      }

    } catch (error) {
      this.logger.error('❌ Failed to initialize Redis:', error);
      // لا نرمي خطأ لأن التطبيق يجب أن يعمل بدون Redis
    }
  }


  async onModuleDestroy() {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
        this.redisClient = null;
        this.logger.log('🔌 Redis client disconnected');
      }

    } catch (error) {
      this.logger.error('❌ Error stopping Redis:', error);
    }
  }

  getRedisUrl(): string | null {
    return this.redisUrl;
  }

  isRedisAvailable(): boolean {
    return !!this.redisUrl;
  }

  async getRedisInfo(): Promise<any> {
    if (!this.redisUrl) {
      return { available: false, message: 'Redis not available' };
    }

    try {
      const client = new Redis(this.redisUrl);
      const info = await client.info();
      await client.quit();
      
      return {
        available: true,
        url: this.redisUrl,
        embedded: false,
        info: info.split('\n').slice(0, 10).join('\n') // أول 10 أسطر من المعلومات
      };
    } catch (error) {
      return {
        available: false,
        url: this.redisUrl,
        error: error.message
      };
    }
  }

  /**
   * إنشاء Redis client جديد
   */
  createClient(): Redis | null {
    if (!this.redisUrl) {
      return null;
    }

    const client = new Redis(this.redisUrl, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true,
      retryStrategy: () => null, // لا تعيد المحاولة تلقائياً
    });

    // إضافة معالج أخطاء لمنع الأخطاء غير المعالجة
    client.on('error', (err) => {
      this.logger.warn(`Redis client error: ${err.message}`);
    });

    return client;
  }

  /**
   * اختبار الاتصال
   */
  async testConnection(): Promise<boolean> {
    if (!this.redisUrl) {
      return false;
    }

    try {
      const client = this.createClient();
      if (!client) return false;
      
      await client.ping();
      await client.quit();
      return true;
    } catch (error) {
      this.logger.error('Redis connection test failed:', error);
      return false;
    }
  }
}
