import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisLocalService } from '../redis/redis-local.service';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

export interface UserPresence {
  userId: string;
  name: string;
  email: string;
  photoUrl: string | null;
  accountType: string;
  currentPage: string;
  lastSeen: number;
}

const PRESENCE_TTL = 60; // seconds - user considered offline after 60s of no heartbeat
const PRESENCE_PREFIX = 'online:user:';
const DB_UPDATE_INTERVAL = 60000; // Persist lastSeenAt to DB every 60 seconds

@Injectable()
export class OnlineTrackingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OnlineTrackingService.name);
  private redisClient: Redis | null = null;
  private useRedis = false;

  // Fallback in-memory store when Redis is not available
  private memoryStore = new Map<string, UserPresence>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  // Track last DB write per user to debounce
  private lastDbUpdate = new Map<string, number>();
  private dbUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private pendingDbUpdates = new Map<string, { page: string; timestamp: number }>();

  constructor(
    private readonly redisLocalService: RedisLocalService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Try to get a Redis client
    this.redisClient = this.redisLocalService.createClient();
    if (this.redisClient) {
      try {
        await this.redisClient.ping();
        this.useRedis = true;
        this.logger.log('✅ Online tracking using Redis');
      } catch {
        this.redisClient = null;
        this.useRedis = false;
        this.logger.warn('⚠️ Redis not reachable, using in-memory tracking');
      }
    } else {
      this.logger.warn('⚠️ Redis not available, using in-memory tracking');
    }

    // Start cleanup interval for in-memory fallback
    if (!this.useRedis) {
      this.cleanupInterval = setInterval(() => this.cleanupExpired(), 15000);
    }

    // Start DB persist interval
    this.dbUpdateInterval = setInterval(() => this.flushDbUpdates(), DB_UPDATE_INTERVAL);
  }

  async onModuleDestroy() {
    // Flush pending DB updates before shutdown
    await this.flushDbUpdates();

    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.dbUpdateInterval) {
      clearInterval(this.dbUpdateInterval);
      this.dbUpdateInterval = null;
    }
  }

  /**
   * Record a heartbeat for a user
   */
  async heartbeat(user: { userId: string; name: string; email: string; photoUrl?: string; accountType: string }, page: string): Promise<void> {
    const presence: UserPresence = {
      userId: user.userId,
      name: user.name,
      email: user.email,
      photoUrl: user.photoUrl || null,
      accountType: user.accountType,
      currentPage: page,
      lastSeen: Date.now(),
    };

    if (this.useRedis && this.redisClient) {
      try {
        const key = `${PRESENCE_PREFIX}${user.userId}`;
        await this.redisClient.setex(key, PRESENCE_TTL, JSON.stringify(presence));
      } catch (error) {
        this.logger.error('Redis heartbeat failed, falling back to memory', error);
        this.memoryStore.set(user.userId, presence);
      }
    } else {
      this.memoryStore.set(user.userId, presence);
    }

    // Queue DB update for lastSeenAt (debounced)
    this.pendingDbUpdates.set(user.userId, { page, timestamp: Date.now() });
  }

  /**
   * Get all currently online users
   */
  async getOnlineUsers(): Promise<UserPresence[]> {
    if (this.useRedis && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(`${PRESENCE_PREFIX}*`);
        if (keys.length === 0) return [];

        const pipeline = this.redisClient.pipeline();
        for (const key of keys) {
          pipeline.get(key);
        }
        const results = await pipeline.exec();
        if (!results) return [];

        const users: UserPresence[] = [];
        for (const [err, val] of results) {
          if (!err && val) {
            try {
              users.push(JSON.parse(val as string));
            } catch {
              // skip invalid entries
            }
          }
        }

        return users.sort((a, b) => b.lastSeen - a.lastSeen);
      } catch (error) {
        this.logger.error('Redis getOnlineUsers failed, falling back to memory', error);
        return this.getFromMemory();
      }
    }

    return this.getFromMemory();
  }

  /**
   * Remove a user's presence (on logout)
   */
  async removeUser(userId: string): Promise<void> {
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.del(`${PRESENCE_PREFIX}${userId}`);
      } catch {
        this.memoryStore.delete(userId);
      }
    } else {
      this.memoryStore.delete(userId);
    }
  }

  private getFromMemory(): UserPresence[] {
    const now = Date.now();
    const users: UserPresence[] = [];
    for (const [, presence] of this.memoryStore) {
      if (now - presence.lastSeen < PRESENCE_TTL * 1000) {
        users.push(presence);
      }
    }
    return users.sort((a, b) => b.lastSeen - a.lastSeen);
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, presence] of this.memoryStore) {
      if (now - presence.lastSeen >= PRESENCE_TTL * 1000) {
        this.memoryStore.delete(key);
      }
    }
  }

  /**
   * Flush pending lastSeenAt updates to the database
   */
  private async flushDbUpdates(): Promise<void> {
    if (this.pendingDbUpdates.size === 0) return;

    const updates = new Map(this.pendingDbUpdates);
    this.pendingDbUpdates.clear();

    for (const [userId, { page, timestamp }] of updates) {
      try {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            lastSeenAt: new Date(timestamp),
            lastSeenPage: page,
          },
        });
      } catch (error) {
        this.logger.error(`Failed to update lastSeenAt for user ${userId}`, error);
      }
    }
  }

  /**
   * Get all admin users with their online status and last seen info
   */
  async getAllUsersWithPresence(): Promise<any[]> {
    const onlineUsers = await this.getOnlineUsers();
    const onlineMap = new Map(onlineUsers.map(u => [u.userId, u]));

    const allUsers = await this.prisma.user.findMany({
      where: {
        isArchived: false,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        accountType: true,
        lastSeenAt: true,
        lastSeenPage: true,
        lastLoginAt: true,
      },
      orderBy: { lastSeenAt: 'desc' },
    });

    return allUsers.map(user => {
      const online = onlineMap.get(user.id);
      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        photoUrl: user.photoUrl,
        accountType: user.accountType,
        isOnline: !!online,
        currentPage: online?.currentPage || user.lastSeenPage || null,
        lastSeen: online?.lastSeen || (user.lastSeenAt ? user.lastSeenAt.getTime() : null),
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.getTime() : null,
      };
    });
  }
}
